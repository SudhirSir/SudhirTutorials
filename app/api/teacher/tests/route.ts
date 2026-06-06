export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const testSchema = z.object({
  title: z.string().min(1),
  subject: z.string().optional(),
  courseId: z.string().min(1),
  date: z.string().min(1),
  time: z.string().optional(),
  syllabus: z.string().optional()
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    let tests;
    if (isAdmin) {
      tests = await withDbRetry(() => prisma.test.findMany({
        include: {
          course: { select: { name: true } },
          results: true
        },
        orderBy: { date: 'desc' }
      }));
    } else {
      const teacherId = session.user.id;
      const teacher = await withDbRetry(() => prisma.user.findUnique({
        where: { id: teacherId },
        include: {
          teacherBatches: {
            select: { courseId: true }
          }
        }
      }));

      if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

      const courseIds = teacher.teacherBatches.map((b: any) => b.courseId);

      tests = await withDbRetry(() => prisma.test.findMany({
        where: {
          courseId: { in: courseIds }
        },
        include: {
          course: { select: { name: true } },
          results: true
        },
        orderBy: { date: 'desc' }
      }));
    }

    return NextResponse.json({ tests });
  } catch (error) {
    console.error('Error fetching tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = testSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data', details: validation.error.format() }, { status: 400 });
    }

    const { title, subject, courseId, date, time, syllabus } = validation.data;

    const test = await withDbRetry(() => prisma.test.create({
      data: {
        title,
        subject,
        courseId,
        date: new Date(date),
        time,
        syllabus
      }
    }));

    return NextResponse.json({ test, success: true });
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
  }
}

// DELETE Test (For Teachers & Admins)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });

    // First delete associated test results
    await withDbRetry(() => prisma.testResult.deleteMany({
      where: { testId: id }
    }));

    await withDbRetry(() => prisma.test.delete({
      where: { id }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR DELETING TEST:", error);
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 });
  }
}
