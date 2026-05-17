import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// A lightweight user directory accessible by ANY authenticated role for messaging
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    const users = await prisma.user.findMany({
      where: {
        id: { not: session.user.id }, // exclude self
        role: { in: ['STUDENT', 'TEACHER', 'ADMIN'] },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { username: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        studentProfile: { select: { photoUrl: true } },
        teacherProfile: { select: { photoUrl: true } }
      },
      orderBy: { name: 'asc' },
      take: 30,
    });

    const mappedUsers = users.map((u: any) => {
      const photo = u.role === 'STUDENT' ? u.studentProfile?.photoUrl : u.teacherProfile?.photoUrl;
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        photoUrl: photo || null
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch directory' }, { status: 500 });
  }
}
