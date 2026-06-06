import { prisma, withDbRetry } from './prisma';

export async function logActivity(userId: string, action: string, details?: string) {
  try {
    await withDbRetry(() => prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
      },
    }));
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
