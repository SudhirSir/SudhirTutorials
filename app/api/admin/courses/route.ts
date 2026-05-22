import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const courses = await withDbRetry(() => prisma.course.findMany({
      include: {
        _count: {
          select: { batches: true },
        },
      },
    }));
    return NextResponse.json({ courses });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Course name is required' }, { status: 400 });
    }

    const course = await withDbRetry(() => prisma.course.create({
      data: { name, description },
    }));

    return NextResponse.json({ success: true, course });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, description } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }
    const course = await withDbRetry(() => prisma.course.update({
      where: { id },
      data: { name, description },
    }));
    return NextResponse.json({ success: true, course });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // 1. Get batch IDs
    const batches = await withDbRetry(() => prisma.batch.findMany({
      where: { courseId: id },
      select: { id: true }
    }));
    const batchIds = batches.map(b => b.id);

    // 2. Get test IDs
    const tests = await withDbRetry(() => prisma.test.findMany({
      where: { courseId: id },
      select: { id: true }
    }));
    const testIds = tests.map(t => t.id);

    // 3. Delete attendance records for these batches
    if (batchIds.length > 0) {
      await withDbRetry(() => prisma.attendance.deleteMany({
        where: { batchId: { in: batchIds } }
      }));
      // 4. Delete schedules for these batches
      await withDbRetry(() => prisma.schedule.deleteMany({
        where: { batchId: { in: batchIds } }
      }));
    }

    // 5. Delete test results for these tests
    if (testIds.length > 0) {
      await withDbRetry(() => prisma.testResult.deleteMany({
        where: { testId: { in: testIds } }
      }));
    }

    // 6. Delete tests
    await withDbRetry(() => prisma.test.deleteMany({
      where: { courseId: id }
    }));

    // 7. Delete materials
    await withDbRetry(() => prisma.material.deleteMany({
      where: { courseId: id }
    }));

    // 8. Delete batches
    await withDbRetry(() => prisma.batch.deleteMany({
      where: { courseId: id }
    }));

    // 9. Delete course
    await withDbRetry(() => prisma.course.delete({
      where: { id }
    }));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete course:", error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
