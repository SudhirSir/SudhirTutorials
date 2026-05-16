import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q');

  try {
    let users;
    if (search) {
      users = await prisma.user.findMany({
        where: {
          role: { in: ['STUDENT', 'TEACHER', 'ADMIN'] },
          OR: [
            { name: { contains: search } }, // Case insensitive in sqlite is limited, but prisma handles it or we can just lowercase
            { username: { contains: search } }
          ]
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true
        }
      });
    } else {
      users = await prisma.user.findMany({
        where: { role: { in: ['STUDENT', 'TEACHER', 'ADMIN'] } },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true
        },
        take: 20,
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}
