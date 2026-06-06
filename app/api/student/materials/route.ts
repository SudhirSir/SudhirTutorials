export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = (session.user as any).id;

    // Get courses the student is enrolled in through batches
    const studentWithBatches = await withDbRetry(() => prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentBatches: {
          select: { courseId: true }
        }
      }
    }));

    if (!studentWithBatches) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const courseIds = studentWithBatches.studentBatches.map((b: any) => b.courseId);

    // Fetch materials for those courses
    const materials = await withDbRetry(() => prisma.material.findMany({
      where: {
        courseId: { in: courseIds }
      },
      include: {
        course: { select: { name: true } },
        teacher: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }));

    return NextResponse.json({ materials });
  } catch (error) {
    console.error('Error fetching student materials:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}
