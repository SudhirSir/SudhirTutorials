export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { appCache } from '@/lib/cache';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = `tests:student:${session.user.id}`;
    const sanitizedTests = await appCache.getOrSet(cacheKey, async () => {
      // Get all courses the student is enrolled in via their batches
      const userWithBatches = await withDbRetry(() => prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          studentBatches: {
            select: { courseId: true }
          }
        }
      }));

      if (!userWithBatches) {
        return [];
      }

      const courseIds = userWithBatches.studentBatches.map((b: any) => b.courseId);

      if (courseIds.length === 0) {
        return [];
      }

      const tests = await withDbRetry(() => prisma.test.findMany({
        where: {
          courseId: { in: courseIds }
        },
        include: {
          course: { select: { name: true } },
          results: {
            where: { studentId: session.user.id },
            select: {
              id: true,
              marks: true,
              totalMarks: true,
              remarks: true,
              testId: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      }));

      const joinDate = userWithBatches.createdAt ? new Date(userWithBatches.createdAt) : null;
      const joinDateStart = joinDate ? new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate()).getTime() : 0;

      return tests
        .filter(test => {
          if (!joinDateStart || !test.date) return true;
          return new Date(test.date).getTime() >= joinDateStart;
        })
        .map(test => {
          if (!test.isPublished) {
            return {
              ...test,
              results: []
            };
          }
          return test;
        });
    }, 20);

    return NextResponse.json({ tests: sanitizedTests || [] });
  } catch (error) {
    console.error('Error fetching student tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}
