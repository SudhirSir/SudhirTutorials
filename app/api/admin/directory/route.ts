import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q');

  const selectFields = {
    id: true,
    username: true,
    name: true,
    role: true,
    createdAt: true,
    studentProfile: { select: { baseFee: true } },
  };

  try {
    let users;
    if (search) {
      users = await prisma.user.findMany({
        where: {
          role: { in: ['STUDENT', 'TEACHER', 'ADMIN'] },
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } }
          ]
        },
        select: selectFields
      });
    } else {
      users = await prisma.user.findMany({
        where: { role: { in: ['STUDENT', 'TEACHER', 'ADMIN'] } },
        select: selectFields,
        take: 100,
        orderBy: { name: 'asc' }
      });
    }

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
