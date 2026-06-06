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


