import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Eager warm-up: pre-connect the Prisma connection pool on module load
// so the first real API request does not incur cold-start latency.
prisma.$connect().catch(() => {
  // Silently swallow – server may not be running yet at build time
});

/**
 * Executes a Prisma query or operation with automatic retries for transient
 * database connection failures or pool exhaustion.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 350
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      console.warn(`[PRISMA DB RETRY] Attempt ${attempt}/${retries} failed. Retrying in ${delayMs}ms. Error:`, error.message || error);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

