import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// NOTE: Do NOT call prisma.$connect() eagerly here.
// Prisma manages connections lazily per-query. Calling $connect() at module
// load time holds a PgBouncer session-mode slot open for the entire server
// lifetime, rapidly exhausting the pool_size limit (EMAXCONNSESSION).
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Executes a Prisma query or operation with automatic retries for transient
 * database connection failures, cold starts, or pool exhaustion.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries: number = 5,
  delayMs: number = 500,
  exponential: boolean = true
): Promise<T> {
  let attempt = 0;
  let currentDelay = delayMs;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      console.warn(
        `[PRISMA DB RETRY] Attempt ${attempt}/${retries} failed. Retrying in ${currentDelay}ms. Error:`,
        error.message || error
      );
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      if (exponential) {
        currentDelay = Math.min(currentDelay * 2, 8000); // Cap backoff at 8 seconds
      }
    }
  }
}
