export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q');
  const role = searchParams.get('role');

  const selectFields = {
    id: true,
    username: true,
    name: true,
    role: true,
    createdAt: true,
    studentProfile: true,
    teacherProfile: true,
  };

  try {
    const where: any = {};
    if (role) {
      if (role === 'TEACHER_OR_ADMIN') {
        where.role = { in: ['TEACHER', 'ADMIN'] };
      } else {
        where.role = role;
      }
    } else {
      where.role = { in: ['STUDENT', 'TEACHER', 'ADMIN'] };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: selectFields,
      orderBy: { name: 'asc' },
      ...(search || role ? {} : { take: 100 })
    });

    const mappedUsers = users.map((u: any) => {
      const photo = u.role === 'STUDENT' ? u.studentProfile?.photoUrl : u.teacherProfile?.photoUrl;
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        photoUrl: photo || null,
        studentProfile: u.studentProfile,
        teacherProfile: u.teacherProfile
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
