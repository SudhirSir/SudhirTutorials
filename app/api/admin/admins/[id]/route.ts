export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

// GET /api/admin/admins/[id] — Fetch admin by username or id
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
        role: 'ADMIN',
      },
      include: {
        teacherProfile: true,
      }
    }));

    if (!user) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({ admin: user });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/admin/admins/[id] — Update admin details
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, address, dob, photoUrl, createdAt, gender, religion } = body;

    // Validate inputs
    if (name !== undefined) {
      if (name.length > 150 || !/^[a-zA-Z\s]+$/.test(name)) {
        return NextResponse.json({ error: 'Name must contain only alphabets and spaces, and be at most 150 characters long.' }, { status: 400 });
      }
    }
    if (address !== undefined) {
      if (address && address.length > 150) {
        return NextResponse.json({ error: 'Address must be at most 150 characters long.' }, { status: 400 });
      }
    }
    if (phone !== undefined && phone !== null && phone !== '') {
      if (!/^\d{10}$/.test(phone)) {
        return NextResponse.json({ error: 'Phone number must be exactly 10 digits.' }, { status: 400 });
      }
    }

    const user = await withDbRetry(() => prisma.user.findFirst({
      where: {
        OR: [{ username: id }, { id }],
        role: 'ADMIN',
      },
    }));

    if (!user) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (name !== undefined || photoUrl !== undefined || createdAt !== undefined) {
      await withDbRetry(() => prisma.user.update({
        where: { id: user.id },
        data: {
          ...(name !== undefined && { name }),
          ...(createdAt && { createdAt: new Date(createdAt) }),
          ...(photoUrl !== undefined && { photoUrl }),
        },
      }));
    }

    const profile = await withDbRetry(() => prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(dob !== undefined && { dob }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(gender !== undefined && { gender }),
        ...(religion !== undefined && { religion }),
      },
      create: {
        userId: user.id,
        email: email || null,
        phone: phone || null,
        address: address || null,
        dob: dob || null,
        photoUrl: photoUrl || null,
        gender: gender || null,
        religion: religion || null,
      },
    }));

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/admins/[id] — Delete admin account
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
        role: 'ADMIN',
      },
    }));

    if (!user) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (user.username === 'sudhir') {
      return NextResponse.json({ error: 'Cannot delete the primary admin account (sudhir)' }, { status: 400 });
    }

    await withDbRetry(() => prisma.user.delete({
      where: { id: user.id },
    }));

    return NextResponse.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting admin:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
