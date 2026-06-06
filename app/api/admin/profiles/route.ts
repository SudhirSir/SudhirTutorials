export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const profileSchema = z.object({
  userId: z.string(),
  fatherName: z.string().optional(),
  className: z.string().optional(),
  batch: z.string().optional(),
  school: z.string().optional(),
  address: z.string().optional(),
  baseFee: z.number().optional(),
  phone: z.string().optional(),
  dob: z.string().optional(),
  aadhaarNumber: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const profile = await withDbRetry(() => prisma.studentProfile.findUnique({
      where: { userId }
    }));

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = profileSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

    const { userId, ...data } = validation.data;

    const profile = await withDbRetry(() => prisma.studentProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    }));

    // SYNC: If batch name is provided, ensure user is enrolled in that batch
    if (data.batch) {
      const targetBatch = await withDbRetry(() => prisma.batch.findFirst({
        where: { name: data.batch }
      }));
      if (targetBatch) {
        await withDbRetry(() => prisma.user.update({
          where: { id: userId },
          data: {
            studentBatches: {
              connect: { id: targetBatch.id }
            }
          }
        }));
      }
    }
    // Notify the student of successful profile update by administration
    try {
      await withDbRetry(() => prisma.notification.create({
        data: {
          userId,
          title: '📝 Profile Updated',
          message: 'Your student profile details have been updated by the administration.',
          type: 'SYSTEM',
          isRead: false
        }
      }));
    } catch (err) {
      console.error('Failed to notify student of profile update:', err);
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
