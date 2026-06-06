export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const attendanceSchema = z.object({
  batchId: z.string().min(1),
  date: z.string().optional(), // Default to today if not provided
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE'])
  }))
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const dateStr = searchParams.get('date'); // e.g. "2026-05-15"

    if (!batchId) return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });

    // RBAC: Ensure teacher is assigned to this batch
    if (session.user.role === 'TEACHER') {
      const batch = await withDbRetry(() => prisma.batch.findFirst({
        where: { id: batchId, teachers: { some: { id: session.user.id } } }
      }));
      if (!batch) {
        return NextResponse.json({ error: 'Access Denied: You are not assigned to this batch' }, { status: 403 });
      }
    }

    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);

    const attendance = await withDbRetry(() => prisma.attendance.findMany({
      where: {
        batchId,
        date: {
          gte: date,
          lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    }));

    return NextResponse.json({ attendance });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = attendanceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data', details: validation.error.format() }, { status: 400 });
    }

    const { batchId, date: dateStr, records } = validation.data;

    // RBAC: Ensure teacher is assigned to this batch
    if (session.user.role === 'TEACHER') {
      const batch = await withDbRetry(() => prisma.batch.findFirst({
        where: { id: batchId, teachers: { some: { id: session.user.id } } }
      }));
      if (!batch) {
        return NextResponse.json({ error: 'Access Denied: You are not assigned to this batch' }, { status: 403 });
      }
    }

    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);

    // Use a transaction to upsert all records
    const operations = records.map(record => 
      prisma.attendance.upsert({
        where: {
          batchId_studentId_date: {
            batchId,
            studentId: record.studentId,
            date
          }
        },
        update: { status: record.status },
        create: {
          batchId,
          studentId: record.studentId,
          date,
          status: record.status
        }
      })
    );

    await withDbRetry(() => prisma.$transaction(operations));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving attendance:', error);
    return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 });
  }
}
