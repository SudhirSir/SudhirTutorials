export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const material = await withDbRetry(() => prisma.material.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        type: true,
        url: true,
        courseId: true,
      }
    }));

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const userRole = session.user.role;
    if (userRole === 'STUDENT' && material.courseId) {
      const studentWithBatches = await withDbRetry(() => prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          studentBatches: {
            where: { courseId: material.courseId },
            select: { id: true }
          }
        }
      }));
      if (!studentWithBatches || !studentWithBatches.studentBatches || studentWithBatches.studentBatches.length === 0) {
        return NextResponse.json({ error: 'Access denied: You are not enrolled in this course.' }, { status: 403 });
      }
    } else if (userRole !== 'STUDENT' && userRole !== 'TEACHER' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: material.id,
      title: material.title,
      type: material.type,
      url: material.url
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching material content:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
