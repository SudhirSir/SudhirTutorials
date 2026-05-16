import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all courses the student is enrolled in via their batches
    const userWithBatches = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        studentBatches: {
          select: { courseId: true }
        }
      }
    });

    if (!userWithBatches) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const courseIds = userWithBatches.studentBatches.map(b => b.courseId);

    if (courseIds.length === 0) {
      return NextResponse.json({ tests: [] });
    }

    const tests = await prisma.test.findMany({
      where: {
        courseId: { in: courseIds }
      },
      include: {
        course: { select: { name: true } }
      },
      orderBy: {
        date: 'asc'
      }
    });

    return NextResponse.json({ tests });
  } catch (error) {
    console.error('Error fetching student tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}
