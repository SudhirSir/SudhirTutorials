import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || (session.user as any).role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacherId = (session.user as any).id;

    // Fetch batches assigned to this teacher
    const batches = await prisma.batch.findMany({
      where: { teachers: { some: { id: teacherId } } },
      include: {
        course: { select: { name: true } },
        schedules: true,
        _count: { select: { students: true } }
      }
    });

    return NextResponse.json({ batches });
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}
