import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getTunedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // Override low connection limits with tuned connection pool settings
  let tunedUrl = url.replace(/connection_limit=\d+/, 'connection_limit=15');
  if (!tunedUrl.includes('connection_limit=')) {
    const separator = tunedUrl.includes('?') ? '&' : '?';
    tunedUrl = `${tunedUrl}${separator}connection_limit=15`;
  }
  if (!tunedUrl.includes('pool_timeout=')) {
    tunedUrl = `${tunedUrl}&pool_timeout=30`;
  }
  if (!tunedUrl.includes('connect_timeout=')) {
    tunedUrl = `${tunedUrl}&connect_timeout=15`;
  }
  return tunedUrl;
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: getTunedDatabaseUrl(),
    },
  },
});

// Always store global singleton instance to prevent connection leaks across Next.js re-evaluations
globalForPrisma.prisma = prisma;

// Add middleware for automatic push notifications
prisma.$use(async (params, next) => {
  const result = await next(params);
  
  if (params.model === 'Notification') {
    if (params.action === 'create') {
      const data = params.args?.data;
      if (data && data.userId && data.title && data.message) {
        import('./push').then(({ sendPushNotification }) => {
          sendPushNotification(data.userId, data.title, data.message).catch(err => {
            console.error("Failed to send push notification via middleware:", err);
          });
        });
        // Emit real-time notification event via EventEmitter
        import('./events').then(({ messageEmitter }) => {
          messageEmitter.emit('notification', {
            userId: data.userId,
            notification: result
          });
        }).catch(err => {
          console.error("Failed to emit notification event:", err);
        });
      }
    } else if (params.action === 'createMany') {
      const dataArray = params.args?.data;
      if (Array.isArray(dataArray)) {
        import('./push').then(({ sendPushNotification }) => {
          dataArray.forEach(d => {
            if (d && d.userId && d.title && d.message) {
              sendPushNotification(d.userId, d.title, d.message).catch(err => {
                console.error("Failed to send push notification via middleware:", err);
              });
            }
          });
        });
        // Emit real-time notification events for each user in bulk insert
        import('./events').then(({ messageEmitter }) => {
          dataArray.forEach(d => {
            if (d && d.userId) {
              messageEmitter.emit('notification', {
                userId: d.userId,
                refresh: true
              });
            }
          });
        }).catch(err => {
          console.error("Failed to emit bulk notification events:", err);
        });
      }
    }
  } else if (params.model === 'Message' && params.action === 'create') {
    const data = params.args?.data;
    if (data && data.senderId && data.receiverId && data.content) {
      // Fetch sender name to display on the push notification banner
      prisma.user.findUnique({
        where: { id: data.senderId },
        select: { name: true }
      }).then(sender => {
        const senderName = sender?.name || 'User';
        let displayBody = data.content;
        if (data.content.startsWith('data:')) {
          displayBody = '📎 Media attachment';
        } else if (data.content.length > 80) {
          displayBody = data.content.substring(0, 80) + '...';
        }
        
        import('./push').then(({ sendPushNotification }) => {
          sendPushNotification(data.receiverId, `💬 New message from ${senderName}`, displayBody).catch(err => {
            console.error("Failed to send message push notification:", err);
          });
        });
      }).catch(err => {
        console.error("Failed to fetch sender for push notification:", err);
      });
    }
  }

  return result;
});

/**
 * Executes a Prisma query or operation with automatic retries for transient
 * database connection failures, cold starts, or pool exhaustion.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries: number = 5,
  delayMs: number = 250,
  exponential: boolean = true
): Promise<T> {
  let attempt = 0;
  let currentDelay = delayMs;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isConnectionError = 
        error?.code === 'P1001' || 
        error?.code === 'P1002' || 
        error?.code === 'P1017' ||
        error?.code === 'P2024' ||
        (error?.message && (
          error.message.includes("Can't reach database server") ||
          error.message.includes('connection pool') ||
          error.message.includes('EMAXCONNSESSION') ||
          error.message.includes('max clients reached') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('Connection terminated')
        ));

      if (attempt >= retries) {
        throw error;
      }

      console.warn(
        `[PRISMA DB RETRY] Transient DB error (Attempt ${attempt}/${retries}). Retrying in ${currentDelay}ms:`,
        error.message || error
      );
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      if (exponential) {
        currentDelay = Math.min(currentDelay * 1.5, 2000);
      }
    }
  }
}

/**
 * Generates the next sequential store username matching the pattern: STSxxxxx (starting from STS00101).
 */
export async function getNextStoreUsername(): Promise<string> {
  const lastUser = await prisma.user.findFirst({
    where: {
      username: {
        startsWith: 'STS',
      },
    },
    orderBy: {
      username: 'desc',
    },
  });

  if (!lastUser) {
    return 'STS00101';
  }

  // Extract the number part
  const lastNumberStr = lastUser.username.replace('STS', '');
  const lastNumber = parseInt(lastNumberStr, 10);
  
  if (isNaN(lastNumber)) {
    return 'STS00101';
  }

  const nextNumber = lastNumber + 1;
  const nextNumberStr = String(nextNumber).padStart(5, '0');
  
  return `STS${nextNumberStr}`;
}
