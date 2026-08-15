export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const courseIds = userWithBatches.studentBatches.map((b: any) => b.courseId);

    if (courseIds.length === 0) {
      return NextResponse.json({ tests: [] });
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
        date: 'asc'
      }
    }));

    const joinDate = userWithBatches.createdAt ? new Date(userWithBatches.createdAt) : null;
    const joinDateStart = joinDate ? new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate()).getTime() : 0;

    const sanitizedTests = tests
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

    return NextResponse.json({ tests: sanitizedTests });
  } catch (error) {
    console.error('Error fetching student tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}
