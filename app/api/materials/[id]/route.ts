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
      const student = await withDbRetry(() => prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          studentBatches: {
            where: { courseId: material.courseId },
            select: { id: true }
          },
          studentProfile: {
            select: { className: true, grade: true }
          }
        }
      }));

      const hasBatchEnrollment = Boolean(student?.studentBatches && student.studentBatches.length > 0);
      let hasClassMatch = false;

      if (!hasBatchEnrollment && student?.studentProfile) {
        const userClass = (student.studentProfile.className || student.studentProfile.grade || '').toLowerCase();
        const course = await withDbRetry(() => prisma.course.findUnique({
          where: { id: material.courseId },
          select: { name: true }
        }));
        if (course) {
          const cName = course.name.toLowerCase();
          if ((/12/i.test(userClass) || /xii/i.test(userClass)) && (cName.includes('12') || cName.includes('xii'))) hasClassMatch = true;
          else if ((/11/i.test(userClass) || /xi/i.test(userClass)) && (cName.includes('11') || cName.includes('xi'))) hasClassMatch = true;
          else if ((/10/i.test(userClass) || /x\b/i.test(userClass)) && (cName.includes('10') || cName.includes(' x'))) hasClassMatch = true;
          else if ((/9/i.test(userClass) || /ix/i.test(userClass)) && (cName.includes('9') || cName.includes('ix'))) hasClassMatch = true;
          else if ((/8/i.test(userClass) || /viii/i.test(userClass)) && (cName.includes('8') || cName.includes('viii'))) hasClassMatch = true;
          else if ((/7/i.test(userClass) || /vii/i.test(userClass)) && (cName.includes('7') || cName.includes('vii'))) hasClassMatch = true;
          else if ((/6/i.test(userClass) || /vi/i.test(userClass)) && (cName.includes('6') || cName.includes('vi'))) hasClassMatch = true;
        }
      }

      if (!hasBatchEnrollment && !hasClassMatch) {
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
