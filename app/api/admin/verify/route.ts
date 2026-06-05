export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingUsers = await prisma.user.findMany({
      where: {
        onboardingCompleted: true,
        isProfileVerified: false
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        studentProfile: true,
        teacherProfile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ users: pendingUsers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch pending users' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isProfileVerified: true },
      select: { name: true, role: true }
    });

    await logActivity(
      session.user.id,
      'VERIFY_USER',
      `Verified ${updatedUser.role} profile for ${updatedUser.name} (ID: ${userId})`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
  }
}
