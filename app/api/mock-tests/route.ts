export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const createMockTestSchema = z.object({
  title: z.string().min(1),
  className: z.string().min(1),
  board: z.string().min(1),
  subject: z.string().min(1),
  chapterName: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.union([z.number(), z.string()]).transform(v => parseInt(String(v), 10) || 15),
  totalMarks: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v)) || 10),
  passingMarks: z.union([z.number(), z.string()]).optional().transform(v => v ? parseFloat(String(v)) : 4),
  allowedAttempts: z.union([z.number(), z.string()]).optional().transform(v => v ? parseInt(String(v), 10) : 3),
  isPublished: z.boolean().optional().default(true),
});

const updateMockTestSchema = createMockTestSchema.partial().extend({
  id: z.string().min(1),
});

// GET: Fetch Chapter Mock Tests
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const className = searchParams.get('className');
    const board = searchParams.get('board');
    const subject = searchParams.get('subject');
    const chapterName = searchParams.get('chapterName');
    const isPublished = searchParams.get('isPublished');

    const role = session.user.role;
    const userId = session.user.id;

    // Students auto-filter by their registered profile board & class
    let studentBoard: string | null = null;
    let studentClass: string | null = null;

    const where: any = {};

    if (role === 'STUDENT') {
      where.isPublished = true;
      const profile = await withDbRetry(() => prisma.studentProfile.findUnique({
        where: { userId }
      }));
      if (profile) {
        if (profile.board) studentBoard = profile.board;
        if (profile.className) studentClass = profile.className;
      }
    } else if (isPublished !== null && isPublished !== undefined && isPublished !== '') {
      where.isPublished = isPublished === 'true';
    }

    if (className && className !== 'ALL') {
      where.className = className;
    } else if (role === 'STUDENT' && studentClass) {
      where.className = studentClass;
    }

    if (board && board !== 'ALL') {
      where.board = board;
    } else if (role === 'STUDENT' && studentBoard) {
      where.board = { in: [studentBoard, 'All Boards', 'ALL'] };
    }

    if (subject && subject !== 'ALL') where.subject = subject;
    if (chapterName && chapterName !== 'ALL') where.chapterName = { contains: chapterName, mode: 'insensitive' };

    const mockTests = await withDbRetry(() => prisma.chapterMockTest.findMany({
      where,
      include: {
        _count: {
          select: {
            questions: true,
            submissions: true,
          }
        },
        createdBy: {
          select: { name: true, role: true }
        },
        submissions: role === 'STUDENT' ? {
          where: { studentId: userId },
          orderBy: { createdAt: 'desc' },
        } : false
      },
      orderBy: { createdAt: 'desc' }
    }));

    return NextResponse.json({ mockTests, success: true });
  } catch (error) {
    console.error('Error fetching chapter mock tests:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter mock tests' }, { status: 500 });
  }
}

// POST: Create Chapter Mock Test (Teacher / Admin)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createMockTestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input data', details: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;

    const mockTest = await withDbRetry(() => prisma.chapterMockTest.create({
      data: {
        title: data.title,
        className: data.className,
        board: data.board,
        subject: data.subject,
        chapterName: data.chapterName,
        description: data.description,
        durationMinutes: data.durationMinutes,
        totalMarks: data.totalMarks,
        passingMarks: data.passingMarks,
        allowedAttempts: data.allowedAttempts || 3,
        isPublished: data.isPublished,
        createdById: session.user.id
      }
    }));

    // Auto notification to matching class & board students if published
    if (data.isPublished) {
      try {
        const targetStudents = await withDbRetry(() => prisma.user.findMany({
          where: {
            role: 'STUDENT',
            isActive: true,
            studentProfile: {
              className: data.className
            }
          },
          select: { id: true }
        }));

        if (targetStudents.length > 0) {
          const notifMsg = `New Chapter Mock Test "${data.title}" is available for ${data.subject} (${data.chapterName})! Board: ${data.board}. Test your preparation now!`;
          await withDbRetry(() => prisma.notification.createMany({
            data: targetStudents.map(s => ({
              userId: s.id,
              senderId: session.user.id,
              title: `🎯 New Mock Test: ${data.chapterName}`,
              message: notifMsg,
              type: 'ALERT'
            }))
          }));
        }
      } catch (notifErr) {
        console.error('Failed to notify students:', notifErr);
      }
    }

    return NextResponse.json({ mockTest, success: true });
  } catch (error) {
    console.error('Error creating chapter mock test:', error);
    return NextResponse.json({ error: 'Failed to create chapter mock test' }, { status: 500 });
  }
}

// PUT: Update Chapter Mock Test (Teacher / Admin)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateMockTestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input data', details: validation.error.format() }, { status: 400 });
    }

    const { id, ...updateData } = validation.data;

    const mockTest = await withDbRetry(() => prisma.chapterMockTest.update({
      where: { id },
      data: updateData
    }));

    return NextResponse.json({ mockTest, success: true });
  } catch (error) {
    console.error('Error updating chapter mock test:', error);
    return NextResponse.json({ error: 'Failed to update chapter mock test' }, { status: 500 });
  }
}

// DELETE: Delete Chapter Mock Test (Teacher / Admin)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Mock test ID is required' }, { status: 400 });

    await withDbRetry(() => prisma.chapterMockTest.delete({
      where: { id }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter mock test:', error);
    return NextResponse.json({ error: 'Failed to delete chapter mock test' }, { status: 500 });
  }
}
