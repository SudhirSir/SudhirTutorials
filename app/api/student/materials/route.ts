export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { appCache } from '@/lib/cache';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = (session.user as any).id;

    const cacheKey = `materials:student:${studentId}`;
    const materials = await appCache.getOrSet(cacheKey, async () => {
      // Get student profile and batch details
      const student = await withDbRetry(() => prisma.user.findUnique({
        where: { id: studentId },
        include: {
          studentBatches: {
            select: { courseId: true, className: true }
          },
          studentProfile: {
            select: { className: true, grade: true }
          }
        }
      }));

      if (!student) return [];

      const matchedCourseIds = new Set<string>(
        student.studentBatches.map((b: any) => b.courseId).filter(Boolean)
      );

      const userClass = student.studentProfile?.className ||
                        student.studentProfile?.grade ||
                        (student.studentBatches[0]?.className);

      if (userClass) {
        const cls = userClass.toLowerCase();
        const allCourses = await withDbRetry(() => prisma.course.findMany({
          select: { id: true, name: true }
        }));

        allCourses.forEach(c => {
          const cName = c.name.toLowerCase();
          if ((/12/i.test(cls) || /xii/i.test(cls)) && (cName.includes('12') || cName.includes('xii'))) matchedCourseIds.add(c.id);
          else if ((/11/i.test(cls) || /xi/i.test(cls)) && (cName.includes('11') || cName.includes('xi'))) matchedCourseIds.add(c.id);
          else if ((/10/i.test(cls) || /x\b/i.test(cls)) && (cName.includes('10') || cName.includes(' x'))) matchedCourseIds.add(c.id);
          else if ((/9/i.test(cls) || /ix/i.test(cls)) && (cName.includes('9') || cName.includes('ix'))) matchedCourseIds.add(c.id);
          else if ((/8/i.test(cls) || /viii/i.test(cls)) && (cName.includes('8') || cName.includes('viii'))) matchedCourseIds.add(c.id);
          else if ((/7/i.test(cls) || /vii/i.test(cls)) && (cName.includes('7') || cName.includes('vii'))) matchedCourseIds.add(c.id);
          else if ((/6/i.test(cls) || /vi/i.test(cls)) && (cName.includes('6') || cName.includes('vi'))) matchedCourseIds.add(c.id);
        });
      }

      const courseIds = Array.from(matchedCourseIds);
      if (courseIds.length === 0) return [];

      return withDbRetry(() => prisma.$queryRaw`
        SELECT 
          m.id,
          m.title,
          m.type,
          CASE 
            WHEN LEFT(m.url, 5) = 'data:' THEN '/api/materials/' || m.id
            ELSE m.url
          END as url,
          (LEFT(m.url, 5) = 'data:') as "hasAttachment",
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
    }, 30);

    return NextResponse.json({ materials: materials || [] }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (error) {
    console.error('Error fetching student materials:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}
