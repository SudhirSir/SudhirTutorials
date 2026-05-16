import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    // Base filter: Students in teacher's batches
    const where: any = {
      role: 'STUDENT',
      studentBatches: {
        some: batchId ? { id: batchId, teachers: { some: { id: session.user.id } } } : { teachers: { some: { id: session.user.id } } }
      }
    };

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        studentProfile: true,
        studentBatches: {
          where: {
            teachers: { some: { id: session.user.id } }
          },
          select: {
            name: true,
            course: { select: { name: true } }
          }
        },
        payments: {
          where: { status: 'PENDING' },
          select: { status: true }
        }
      }
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}
