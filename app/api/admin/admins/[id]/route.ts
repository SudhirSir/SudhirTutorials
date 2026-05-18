export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/admins/[id] — Fetch admin by username or id
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: id },
          { id: id },
        ],
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      }
    });

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
    const { id } = await params;
    const body = await req.json();
    const { name } = body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: id }, { id }],
        role: 'ADMIN',
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (name !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/admins/[id] — Delete admin account
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: id }, { id }],
        role: 'ADMIN',
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Protect the last admin or the main 'sudhir' admin from deletion if wanted, 
    // but standard cascading delete is fine. Let's make sure we don't delete 'sudhir' 
    // to prevent accidental lockout of the primary admin.
    if (user.username === 'sudhir') {
      return NextResponse.json({ error: 'Cannot delete the primary admin account (sudhir)' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting admin:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
