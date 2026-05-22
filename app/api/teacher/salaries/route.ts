import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const salaries = await prisma.salaryRecord.findMany({
      where: { teacherId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ salaries });
  } catch (error) {
    console.error('Error fetching teacher salaries:', error);
    return NextResponse.json({ error: 'Failed to fetch salaries' }, { status: 500 });
  }
}
