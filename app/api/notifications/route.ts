export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { appCache } from '@/lib/cache';
import { z } from 'zod';

// GET: Fetch current user's notifications or sent notifications
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fetchSent = searchParams.get('sent') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10', 10) || 10;

    if (fetchSent) {
      if (!['ADMIN', 'TEACHER'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const [totalCount, notifications] = await Promise.all([
        withDbRetry(() => prisma.notification.findMany({
          where: { senderId: session.user.id },
          distinct: ['title', 'message', 'createdAt'],
          select: { id: true },
        })).then(res => res.length),
        withDbRetry(() => prisma.notification.findMany({
          where: { senderId: session.user.id },
          distinct: ['title', 'message', 'createdAt'],
          include: {
            sender: {
              select: { id: true, name: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }))
      ]);

      return NextResponse.json({ notifications, totalCount });
    }

    const [totalCount, unreadCount, notifications] = await Promise.all([
      withDbRetry(() => prisma.notification.count({
        where: { userId: session.user.id }
      })),
      withDbRetry(() => prisma.notification.count({
        where: { userId: session.user.id, isRead: false }
      })),
      withDbRetry(() => prisma.notification.findMany({
        where: { userId: session.user.id },
        include: {
          sender: {
            select: { id: true, name: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }))
    ]);

    return NextResponse.json({ notifications, totalCount, unreadCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Admin/Teacher sends a notification to one or more users
const sendSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  message: z.string().min(1, "Message is required").max(1000),
  type: z.string().default('SYSTEM'),
  targetMode: z.enum(['ALL', 'ALL_STUDENTS', 'ALL_TEACHERS', 'BATCHES', 'CUSTOM']).optional(),
  targetRole: z.string().optional(),
  targetSelections: z.array(z.string()).optional(),
  targetUserId: z.string().optional(),
  targetUserIds: z.array(z.string()).optional(),
  batchIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['ADMIN', 'TEACHER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validation = sendSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { 
      title, 
      message, 
      type, 
      targetMode, 
      targetRole, 
      targetSelections, 
      targetUserId, 
      targetUserIds, 
      batchIds 
    } = validation.data;
    const targetSet = new Set<string>();

    // 1. Direct custom user selections
    if (targetUserId) {
      targetSet.add(targetUserId);
    }
    if (targetUserIds && targetUserIds.length > 0) {
      targetUserIds.forEach(id => { if (id) targetSet.add(id); });
    }

    // 2. Target Mode based handling
    if (targetMode === 'ALL_STUDENTS') {
      const students = await withDbRetry(() => prisma.user.findMany({
        where: { role: 'STUDENT', isActive: true, NOT: { isStoreUser: true } },
        select: { id: true }
      }));
      students.forEach(s => targetSet.add(s.id));
    } else if (targetMode === 'ALL_TEACHERS') {
      const teachers = await withDbRetry(() => prisma.user.findMany({
        where: { role: 'TEACHER', isActive: true },
        select: { id: true }
      }));
      teachers.forEach(t => targetSet.add(t.id));
    } else if (targetMode === 'BATCHES' || (batchIds && batchIds.length > 0)) {
      const bIds = batchIds || [];
      const batchStudents = await withDbRetry(() => prisma.user.findMany({
        where: {
          role: 'STUDENT',
          isActive: true,
          NOT: { isStoreUser: true },
          OR: [
            { studentBatches: { some: { id: { in: bIds } } } },
            { studentBatches: { some: { name: { in: bIds } } } },
            { studentProfile: { OR: [ { batch: { in: bIds } }, { className: { in: bIds } } ] } }
          ]
        },
        select: { id: true }
      }));
      batchStudents.forEach(bs => targetSet.add(bs.id));
    } else if (targetMode === 'ALL') {
      const users = await withDbRetry(() => prisma.user.findMany({
        where: { role: { in: ['STUDENT', 'TEACHER'] }, isActive: true, NOT: { isStoreUser: true } },
        select: { id: true }
      }));
      users.forEach(u => targetSet.add(u.id));
    } else if (targetSelections && targetSelections.length > 0) {
      // Backward-compatibility: targetSelections array
      if (targetSelections.includes('TEACHER')) {
        const teachers = await withDbRetry(() => prisma.user.findMany({
          where: { role: 'TEACHER', isActive: true },
          select: { id: true }
        }));
        teachers.forEach(t => targetSet.add(t.id));
      }

      if (targetSelections.includes('STUDENT')) {
        const students = await withDbRetry(() => prisma.user.findMany({
          where: { role: 'STUDENT', isActive: true, NOT: { isStoreUser: true } },
          select: { id: true }
        }));
        students.forEach(s => targetSet.add(s.id));
      }

      const specificBatchesOrClasses = targetSelections.filter(s => s !== 'TEACHER' && s !== 'STUDENT');
      if (specificBatchesOrClasses.length > 0) {
        const classStudents = await withDbRetry(() => prisma.user.findMany({
          where: {
            role: 'STUDENT',
            isActive: true,
            NOT: { isStoreUser: true },
            OR: [
              { studentBatches: { some: { id: { in: specificBatchesOrClasses } } } },
              { studentBatches: { some: { name: { in: specificBatchesOrClasses } } } },
              { studentProfile: { OR: [ { className: { in: specificBatchesOrClasses } }, { grade: { in: specificBatchesOrClasses } }, { batch: { in: specificBatchesOrClasses } } ] } }
            ]
          },
          select: { id: true }
        }));
        classStudents.forEach(cs => targetSet.add(cs.id));
      }
    } else if (targetRole && targetRole !== 'ALL') {
      const users = await withDbRetry(() => prisma.user.findMany({
        where: { role: targetRole, isActive: true },
        select: { id: true },
      }));
      users.forEach(u => targetSet.add(u.id));
    } else if (!targetUserId && (!targetUserIds || targetUserIds.length === 0)) {
      // Default fallback: broadcast to all active students and teachers
      const users = await withDbRetry(() => prisma.user.findMany({
        where: { role: { in: ['STUDENT', 'TEACHER'] }, isActive: true, NOT: { isStoreUser: true } },
        select: { id: true },
      }));
      users.forEach(u => targetSet.add(u.id));
    }

    const targetIds = Array.from(targetSet);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No recipient users found for selected audience' }, { status: 400 });
    }

    await withDbRetry(() => prisma.notification.createMany({
      data: targetIds.map(userId => ({ userId, senderId: session.user.id, title, message, type })),
    }));

    // Invalidate badges cache so targets see fresh unread counts
    appCache.invalidate('badges');

    return NextResponse.json({ success: true, sent: targetIds.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH: Mark notifications as read
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ids } = body; // array of notification IDs, or empty to mark all

    if (ids && ids.length > 0) {
      await withDbRetry(() => prisma.notification.updateMany({
        where: { id: { in: ids }, userId: session.user.id },
        data: { isRead: true },
      }));
    } else {
      await withDbRetry(() => prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      }));
    }

    // Invalidate badges for current user immediately
    appCache.invalidate(`badges:${session.user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
