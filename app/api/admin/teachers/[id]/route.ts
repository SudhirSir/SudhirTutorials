export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

// GET /api/admin/teachers/[id] — Fetch full teacher profile
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await withDbRetry(() => prisma.user.findFirst({
      where: {
        OR: [
          { username: id },
          { id: id },
        ],
        role: 'TEACHER',
      },
      include: {
        teacherProfile: true,
        teacherBatches: {
          select: { name: true, id: true }
        }
      },
    }));

    if (!user) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json({ teacher: user });
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/admin/teachers/[id] — Update teacher profile
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      name,
      subject,
      email,
      phone,
      address,
      dob,
      photoUrl,
      qualification,
      experience,
      salary,
      batch,
      createdAt
    } = body;

    const user = await withDbRetry(() => prisma.user.findFirst({
      where: {
        OR: [{ username: id }, { id }],
        role: 'TEACHER',
      },
    }));

    if (!user) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    if (name !== undefined || createdAt !== undefined) {
      await withDbRetry(() => prisma.user.update({
        where: { id: user.id },
        data: { 
          ...(name !== undefined && { name }),
          ...(createdAt && { createdAt: new Date(createdAt) }),
        },
      }));
    }

    if (batch !== undefined) {
      // Clear previous batches
      await withDbRetry(() => prisma.user.update({
        where: { id: user.id },
        data: { teacherBatches: { set: [] } }
      }));
      
      if (batch) {
        const matchedBatch = await withDbRetry(() => prisma.batch.findFirst({
          where: { OR: [{ name: batch }, { id: batch }] }
        }));
        if (matchedBatch) {
          await withDbRetry(() => prisma.user.update({
            where: { id: user.id },
            data: { teacherBatches: { connect: { id: matchedBatch.id } } }
          }));
        }
      }
    }

    const profile = await withDbRetry(() => prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {
        ...(subject !== undefined && { subject }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(dob !== undefined && { dob }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(qualification !== undefined && { qualification }),
        ...(experience !== undefined && { experience }),
        ...(salary !== undefined && { salary: parseFloat(String(salary)) }),
      },
      create: {
        userId: user.id,
        subject: subject || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        dob: dob || null,
        photoUrl: photoUrl || null,
        qualification: qualification || null,
        experience: experience || null,
        salary: salary ? parseFloat(String(salary)) : 0,
      },
    }));

    // Notify the teacher of successful profile update by administration
    try {
      await withDbRetry(() => prisma.notification.create({
        data: {
          userId: user.id,
          title: '📝 Profile Updated',
          message: 'Your teacher profile details have been updated by the administration.',
          type: 'SYSTEM',
          isRead: false
        }
      }));
    } catch (err) {
      console.error('Failed to send notification to teacher on update:', err);
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error updating teacher profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/teachers/[id] — Delete teacher account
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await withDbRetry(() => prisma.user.findFirst({
      where: {
        OR: [{ username: id }, { id }],
        role: 'TEACHER',
      },
    }));

    if (!user) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    await withDbRetry(() => prisma.user.delete({
      where: { id: user.id },
    }));

    return NextResponse.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
