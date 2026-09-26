import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getTunedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // If pgbouncer=true, ensure connection_limit is set appropriately (max 5 for PgBouncer pooler)
  if (url.includes('pgbouncer=true')) {
    if (url.includes('connection_limit=')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}connection_limit=5&pool_timeout=15`;
  }
  let tunedUrl = url.replace(/connection_limit=\d+/, 'connection_limit=5');
  if (!tunedUrl.includes('connection_limit=')) {
    const separator = tunedUrl.includes('?') ? '&' : '?';
    tunedUrl = `${tunedUrl}${separator}connection_limit=5`;
  }
  if (!tunedUrl.includes('pool_timeout=')) {
    tunedUrl = `${tunedUrl}&pool_timeout=15`;
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

// Add non-blocking middleware for automatic background push notifications & events
prisma.$use(async (params, next) => {
  const result = await next(params);
  
  // Offload all side-effects out of the synchronous query resolution path via setImmediate
  setImmediate(() => {
    try {
      if (params.model === 'Notification') {
        if (params.action === 'create') {
          const data = params.args?.data;
          if (data && data.userId && data.title && data.message) {
            import('./push').then(({ sendPushNotification }) => {
              sendPushNotification(data.userId, data.title, data.message).catch(() => {});
            });
            import('./events').then(({ messageEmitter }) => {
              messageEmitter.emit('notification', {
                userId: data.userId,
                notification: result
              });
            }).catch(() => {});
          }
        } else if (params.action === 'createMany') {
          const dataArray = params.args?.data;
          if (Array.isArray(dataArray)) {
            import('./push').then(({ sendPushNotification }) => {
              dataArray.forEach(d => {
                if (d && d.userId && d.title && d.message) {
                  sendPushNotification(d.userId, d.title, d.message).catch(() => {});
                }
              });
            });
            import('./events').then(({ messageEmitter }) => {
              dataArray.forEach(d => {
                if (d && d.userId) {
                  messageEmitter.emit('notification', {
                    userId: d.userId,
                    refresh: true
                  });
                }
              });
            }).catch(() => {});
          }
        }
      } else if (params.model === 'Message' && params.action === 'create') {
        const data = params.args?.data;
        if (data && data.senderId && data.receiverId && data.content) {
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
              sendPushNotification(data.receiverId, `💬 New message from ${senderName}`, displayBody).catch(() => {});
            });
          }).catch(() => {});
        }
      }
    } catch (e) {
      // Ignore background side-effect errors so primary API response is never delayed
    }
  });

  return result;
});

/**
 * Executes a Prisma query or operation with automatic retries for transient
 * database connection failures, cold starts, or pool exhaustion.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 150,
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

      if (attempt >= retries || !isConnectionError) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, currentDelay));
      if (exponential) {
        currentDelay *= 1.5;
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
