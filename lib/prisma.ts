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
