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

      const userClass = student.studentProfile?.className ||
                        student.studentProfile?.grade ||
                        (student.studentBatches[0]?.className);

      const matchedCourseIds = new Set<string>();

      if (userClass) {
        const cls = userClass.toLowerCase();
        const allCourses = await withDbRetry(() => prisma.course.findMany({
          select: { id: true, name: true }
        }));

        allCourses.forEach(c => {
          const cName = c.name.toLowerCase();
          if ((/12|xii/i.test(cls)) && (/12|xii/i.test(cName))) matchedCourseIds.add(c.id);
          else if ((/11|xi/i.test(cls)) && (/11|xi/i.test(cName))) matchedCourseIds.add(c.id);
          else if ((/10|x\b/i.test(cls)) && (/10|\bx\b/i.test(cName))) matchedCourseIds.add(c.id);
          else if ((/9|ix/i.test(cls)) && (/9|ix/i.test(cName))) matchedCourseIds.add(c.id);
          else if ((/8|viii/i.test(cls)) && (/8|viii/i.test(cName))) matchedCourseIds.add(c.id);
          else if ((/7|vii/i.test(cls)) && (/7|vii/i.test(cName))) matchedCourseIds.add(c.id);
          else if ((/6|vi/i.test(cls)) && (/6|vi/i.test(cName))) matchedCourseIds.add(c.id);
        });

        // Also add courseId from batches whose className matches the user's class
        student.studentBatches.forEach((b: any) => {
          if (b.courseId) {
            const bc = (b.className || '').toLowerCase();
            const isMatch = !bc ||
              (/10|x\b/i.test(cls) && /10|x\b/i.test(bc)) ||
              (/12|xii/i.test(cls) && /12|xii/i.test(bc)) ||
              (/9|ix/i.test(cls) && /9|ix/i.test(bc)) ||
              (/8|viii/i.test(cls) && /8|viii/i.test(bc));
            if (isMatch) {
              matchedCourseIds.add(b.courseId);
            }
          }
        });
      } else {
        // Fallback to all enrolled batches if no class registered
        student.studentBatches.forEach((b: any) => {
          if (b.courseId) matchedCourseIds.add(b.courseId);
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
