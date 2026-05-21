import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const profile = await prisma.studentProfile.findUnique({
      where: { userId }
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const validation = profileSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

    const { userId, ...data } = validation.data;

    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });

    // SYNC: If batch name is provided, ensure user is enrolled in that batch
    if (data.batch) {
      const targetBatch = await prisma.batch.findFirst({
        where: { name: data.batch }
      });
      if (targetBatch) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            studentBatches: {
              connect: { id: targetBatch.id }
            }
          }
        });
      }
    }
    // Notify the student of successful profile update by administration
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: '📝 Profile Updated',
          message: 'Your student profile details have been updated by the administration.',
          type: 'SYSTEM',
          isRead: false
        }
      });
    } catch (err) {
      console.error('Failed to notify student of profile update:', err);
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
