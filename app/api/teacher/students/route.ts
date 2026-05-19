import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const q = searchParams.get('q');
    const batchName = searchParams.get('batch');

    // Base filter: Role is Student
    const where: any = {
      role: 'STUDENT',
    };

    if (batchId) {
      where.studentBatches = {
        some: { id: batchId }
      };
    } else if (batchName) {
      where.studentBatches = {
        some: { name: { contains: batchName, mode: 'insensitive' } }
      };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } }
      ];
    }

    // If no search filter is applied, default to only showing students in the teacher's own batches
    if (!q && !batchName && !batchId) {
      if (session.user.role === 'TEACHER') {
        where.studentBatches = {
          some: { teachers: { some: { id: session.user.id } } }
        };
      }
    }

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        studentProfile: true,
        studentBatches: {
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
