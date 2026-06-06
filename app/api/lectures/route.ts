export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

// Extract YouTube Video ID from any standard or live YouTube URL
function extractYoutubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// GET lectures assigned to current user's batch(es) or all lectures for teacher/admin
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const subject = searchParams.get('subject');

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    const where: any = {};

    if (role === 'STUDENT') {
      // Find batches this student belongs to
      const student = await withDbRetry(() => prisma.user.findUnique({
        where: { id: userId },
        include: { studentBatches: true }
      }));
      const batchIds = student?.studentBatches.map(b => b.id) || [];
      where.batchId = { in: batchIds };
    } else if (role === 'TEACHER') {
      // Teachers can see lectures assigned to their batches, or filter by batchId
      if (batchId) {
        where.batchId = batchId;
      } else {
        const teacher = await withDbRetry(() => prisma.user.findUnique({
          where: { id: userId },
          include: { teacherBatches: true }
        }));
        const batchIds = teacher?.teacherBatches.map(b => b.id) || [];
        where.batchId = { in: batchIds };
      }
    } else if (role === 'ADMIN') {
      // Admin sees everything unless filtered by batchId
      if (batchId) {
        where.batchId = batchId;
      }
    }

    if (subject) {
      where.subject = subject;
    }

    const lectures = await withDbRetry(() => prisma.lecture.findMany({
      where,
      include: {
        batch: {
          select: {
            name: true,
            className: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }));

    const enriched = lectures.map(lecture => {
      const videoId = extractYoutubeVideoId(lecture.youtubeUrl);
      return {
        ...lecture,
        videoId,
        thumbnailUrl: videoId 
          ? `https://img.youtube.com/vi/${videoId}/0.jpg` 
          : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'
      };
    });

    return NextResponse.json({ success: true, lectures: enriched });
  } catch (error) {
    console.error('Error fetching lectures:', error);
    return NextResponse.json({ error: 'Failed to fetch lectures' }, { status: 500 });
  }
}

// POST new lecture assignment (Teacher or Admin only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden: Teachers and Admins only' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, youtubeUrl, type, subject, batchId } = body;

    if (!title || !youtubeUrl || !type || !subject || !batchId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const lecture = await withDbRetry(() => prisma.lecture.create({
      data: {
        title,
        description,
        youtubeUrl,
        type, // LIVE or RECORDED
        subject,
        batchId,
        assignedById: (session.user as any).id
      }
    }));

    // Notify students of the batch about the new lecture
    try {
      const students = await withDbRetry(() => prisma.user.findMany({
        where: { studentBatches: { some: { id: batchId } } },
        select: { id: true }
      }));

      const emoji = type === 'LIVE' ? '🔴' : '🎥';
      const notificationTitle = type === 'LIVE' ? 'Live Lecture Scheduled!' : 'New Lecture Video Assigned';
      const notificationMsg = `${emoji} ${title} for Subject "${subject}" has been assigned. Watch now!`;

      await withDbRetry(() => prisma.notification.createMany({
        data: students.map(s => ({
          userId: s.id,
          title: notificationTitle,
          message: notificationMsg,
          type: 'ALERT',
          isRead: false
        }))
      }));
    } catch (err) {
      console.error('Failed to dispatch student notifications for lecture:', err);
    }

    return NextResponse.json({ success: true, lecture });
  } catch (error) {
    console.error('Error creating lecture:', error);
    return NextResponse.json({ error: 'Failed to create lecture' }, { status: 500 });
  }
}

// DELETE a lecture assignment
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing lecture ID' }, { status: 400 });
    }

    const lecture = await withDbRetry(() => prisma.lecture.findUnique({ where: { id } }));
    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
    }

    // Teachers can only delete their own assigned lectures, Admins can delete anything
    if (role === 'TEACHER' && lecture.assignedById !== (session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized: Can only delete your own assigned lectures' }, { status: 401 });
    }

    await withDbRetry(() => prisma.lecture.delete({ where: { id } }));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    return NextResponse.json({ error: 'Failed to delete lecture' }, { status: 500 });
  }
}
