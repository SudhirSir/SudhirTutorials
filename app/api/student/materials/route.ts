export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = (session.user as any).id;

    // Get courses the student is enrolled in through batches
    const studentWithBatches = await withDbRetry(() => prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentBatches: {
          select: { courseId: true }
        }
      }
    }));

    if (!studentWithBatches) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const courseIds = studentWithBatches.studentBatches.map((b: any) => b.courseId).filter(Boolean);

    let materials: any[] = [];
    if (courseIds.length > 0) {
      materials = await withDbRetry(() => prisma.$queryRaw`
        SELECT 
          m.id,
          m.title,
          m.type,
          CASE 
            WHEN m.url LIKE 'data:%' THEN '/api/materials/' || m.id
            ELSE m.url
          END as url,
          (m.url LIKE 'data:%') as "hasAttachment",
          m."courseId",
          m."teacherId",
          m."createdAt",
          m."isAssignment",
          m.deadline,
          CASE WHEN c.id IS NOT NULL THEN json_build_object('name', c.name) ELSE NULL END as course,
          CASE WHEN u.id IS NOT NULL THEN json_build_object('name', u.name) ELSE NULL END as teacher
        FROM "Material" m
        LEFT JOIN "Course" c ON m."courseId" = c.id
        LEFT JOIN "User" u ON m."teacherId" = u.id
        WHERE m."courseId" = ANY(${courseIds})
        ORDER BY m."createdAt" DESC
      `);
    }

    return NextResponse.json({ materials }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    console.error('Error fetching student materials:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}
