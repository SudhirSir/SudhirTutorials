export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { appCache } from '@/lib/cache';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = `tests:student:${session.user.id}`;
    const sanitizedTests = await appCache.getOrSet(cacheKey, async () => {
      // Get student profile and batch details
      const userWithBatches = await withDbRetry(() => prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          studentBatches: {
            select: { courseId: true, className: true }
          },
          studentProfile: {
            select: { className: true, grade: true }
          }
        }
      }));

      if (!userWithBatches) {
        return [];
      }

      const userClass = userWithBatches.studentProfile?.className ||
                        userWithBatches.studentProfile?.grade ||
                        (userWithBatches.studentBatches[0]?.className);

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
        userWithBatches.studentBatches.forEach((b: any) => {
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
        userWithBatches.studentBatches.forEach((b: any) => {
          if (b.courseId) matchedCourseIds.add(b.courseId);
        });
      }

      const courseIds = Array.from(matchedCourseIds);

      if (courseIds.length === 0) {
        return [];
      }

      const tests = await withDbRetry(() => prisma.test.findMany({
        where: {
          courseId: { in: courseIds }
        },
        include: {
          course: { select: { name: true } },
          results: {
            where: { studentId: session.user.id },
            select: {
              id: true,
              marks: true,
              totalMarks: true,
              remarks: true,
              testId: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      }));

      const joinDate = userWithBatches.createdAt ? new Date(userWithBatches.createdAt) : null;
      const joinDateStart = joinDate ? new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate()).getTime() : 0;

      return tests
        .filter(test => {
          if (!joinDateStart || !test.date) return true;
          return new Date(test.date).getTime() >= joinDateStart;
        })
        .map(test => {
          if (!test.isPublished) {
            return {
              ...test,
              results: []
            };
          }
          return test;
        });
    }, 20);

    return NextResponse.json({ tests: sanitizedTests || [] });
  } catch (error) {
    console.error('Error fetching student tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}
