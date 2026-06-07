import { prisma } from './prisma';

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

    const serverKey = process.env.FCM_SERVER_KEY;
    if (!serverKey) {
      console.warn("FCM_SERVER_KEY is not defined in environment variables. Cannot send push notification.");
      return;
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`
      },
      body: JSON.stringify({
        to: user.pushToken,
        notification: {
          title: title,
          body: body,
          sound: 'default'
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
      })
    });

    const result = await response.json();
    console.log(`Push notification sent to user ${userId}:`, result);
  } catch (error) {
    console.error(`Error sending push notification to user ${userId}:`, error);
  }
}

export async function sendPushNotificationToMultiple(userIds: string[], title: string, body: string) {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.warn("FCM_SERVER_KEY is not defined in environment variables. Cannot send bulk push notifications.");
    return;
  }

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, pushToken: { not: null } },
      select: { id: true, pushToken: true }
    });

    const tokens = users.map(u => u.pushToken).filter(Boolean) as string[];
    if (tokens.length === 0) return;

    await Promise.all(tokens.map(async (token) => {
      try {
        await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${serverKey}`
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title: title,
              body: body,
              sound: 'default'
            }
          })
        });
      } catch (err) {
        console.error("Error sending token push:", err);
      }
    }));
  } catch (error) {
    console.error("Error sending bulk push notifications:", error);
  }
}
