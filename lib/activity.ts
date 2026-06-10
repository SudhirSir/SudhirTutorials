import { prisma, withDbRetry } from './prisma';

export async function logActivity(userId: string, action: string, details?: string) {
  // Simple console log to avoid database write attempts and retry delays since the ActivityLog table was removed
  console.log(`[ACTIVITY LOG] User: ${userId} | Action: ${action} | Details: ${details || 'None'}`);
}
