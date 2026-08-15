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
  totalMarks: z.union([z.number(), z.string()]).optional(),
  date: z.string().min(1),
  time: z.string().optional(),
  syllabus: z.string().optional()
});

const testEditSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  subject: z.string().optional(),
  courseId: z.string().optional(),
  totalMarks: z.union([z.number(), z.string()]).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  syllabus: z.string().optional(),
  isPublished: z.boolean().optional()
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

    const { title, subject, courseId, totalMarks, date, time, syllabus } = validation.data;

    const test = await withDbRetry(() => prisma.test.create({
      data: {
        title,
        subject,
        courseId,
        totalMarks: totalMarks ? parseFloat(String(totalMarks)) : 100,
        date: new Date(date),
        time,
        syllabus
      }
    }));

    // Notify enrolled students about the newly created/assigned test
    try {
      let targetStudents: { id: string }[] = [];
      if (courseId) {
        targetStudents = await withDbRetry(() => prisma.user.findMany({
          where: {
            role: 'STUDENT',
            isActive: true,
            studentBatches: { some: { courseId: courseId } }
          },
          select: { id: true }
        }));
      }
      
      if (targetStudents.length === 0) {
        targetStudents = await withDbRetry(() => prisma.user.findMany({
          where: { role: 'STUDENT', isActive: true },
          select: { id: true }
        }));
      }

      if (targetStudents.length > 0) {
        const formattedDate = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const notifMsg = `A new test "${title}" (${subject}) is scheduled for ${formattedDate} at ${time}. Syllabus: ${syllabus || 'As discussed in class'}. Please prepare accordingly!`;
        
        await withDbRetry(() => prisma.notification.createMany({
          data: targetStudents.map(s => ({
            userId: s.id,
            senderId: session.user.id,
            title: `📝 New Test/Exam Scheduled: ${title}`,
            message: notifMsg,
            type: 'TEST'
          }))
        }));
      }
    } catch (notifErr) {
      console.error("Failed to auto-notify students of new test:", notifErr);
    }

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

// PUT Edit Test (For Teachers & Admins)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = testEditSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data', details: validation.error.format() }, { status: 400 });
    }

    const { id, title, subject, courseId, totalMarks, date, time, syllabus, isPublished } = validation.data;
    const isAdmin = session.user.role === 'ADMIN';

    // Fetch existing test to check publication status
    const existingTest = await withDbRetry(() => prisma.test.findUnique({
      where: { id }
    }));

    if (!existingTest) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // If test is published and user is not admin, reject editing
    if (existingTest.isPublished && !isAdmin) {
      return NextResponse.json({ error: 'Published tests can only be modified by admins' }, { status: 403 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (subject !== undefined) updateData.subject = subject;
    if (courseId !== undefined) updateData.courseId = courseId;
    if (totalMarks !== undefined) updateData.totalMarks = parseFloat(String(totalMarks));
    if (date !== undefined) updateData.date = new Date(date);
    if (time !== undefined) updateData.time = time;
    if (syllabus !== undefined) updateData.syllabus = syllabus;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const test = await withDbRetry(() => prisma.test.update({
      where: { id },
      data: updateData
    }));

    return NextResponse.json({ test, success: true });
  } catch (error) {
    console.error('Error updating test:', error);
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 });
  }
}

