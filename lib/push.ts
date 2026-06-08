import { prisma } from './prisma';
import crypto from 'crypto';

interface ServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function getServiceAccount(): ServiceAccount | null {
  const envData = process.env.FCM_SERVICE_ACCOUNT;
  if (!envData) {
    return null;
  }
  try {
    return JSON.parse(envData) as ServiceAccount;
  } catch (err) {
    console.error("Failed to parse FCM_SERVICE_ACCOUNT JSON:", err);
    return null;
  }
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64UrlEncode = (obj: any) => {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${headerEncoded}.${payloadEncoded}`);
  
  // Format private key correctly in case newlines were stripped or escaped
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const signatureEncoded = sign.sign(privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const assertion = `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to get OAuth token: ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000
  };

  return data.access_token;
}

export async function sendPushNotification(userId: string, title: string, body: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true }
    });

    if (!user || !user.pushToken) {
      console.log(`No push token registered for user: ${userId}`);
      return;
    }

    const serviceAccount = getServiceAccount();
    if (!serviceAccount) {
      console.warn("FCM_SERVICE_ACCOUNT is not defined in environment variables. Cannot send push notification.");
      return;
    }

    const accessToken = await getAccessToken(serviceAccount);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        message: {
          token: user.pushToken,
          notification: {
            title: title,
            body: body
          },
          android: {
            priority: 'HIGH',
            notification: {
              sound: 'default',
              channel_id: 'default'
            }
          }
        }
      })
    });

    const result = await response.ok ? await response.json() : await response.text();
    console.log(`Push notification sent to user ${userId} via FCM HTTP v1:`, result);
  } catch (error) {
    console.error(`Error sending push notification to user ${userId} via FCM HTTP v1:`, error);
  }
}

export async function sendPushNotificationToMultiple(userIds: string[], title: string, body: string) {
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    console.warn("FCM_SERVICE_ACCOUNT is not defined in environment variables. Cannot send bulk push notifications.");
    return;
  }

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, pushToken: { not: null } },
      select: { id: true, pushToken: true }
    });

    const tokens = users.map(u => u.pushToken).filter(Boolean) as string[];
    if (tokens.length === 0) return;

    const accessToken = await getAccessToken(serviceAccount);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    await Promise.all(tokens.map(async (token) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            message: {
              token: token,
              notification: {
                title: title,
                body: body
              },
              android: {
                priority: 'HIGH',
                notification: {
                  sound: 'default',
                  channel_id: 'default'
                }
              }
            }
          })
        });
        const result = response.ok ? await response.json() : await response.text();
        console.log(`Bulk push notification sent to token via FCM HTTP v1:`, result);
      } catch (err) {
        console.error("Error sending token push via FCM HTTP v1:", err);
      }
    }));
  } catch (error) {
    console.error("Error sending bulk push notifications via FCM HTTP v1:", error);
  }
}
