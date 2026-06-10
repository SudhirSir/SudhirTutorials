export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const statsResult = await withDbRetry(async () => {
      const results = await prisma.$queryRaw<any[]>`
        SELECT 
          (SELECT COUNT(*)::int FROM "User" WHERE role = 'STUDENT') as "totalStudents",
          (SELECT COUNT(*)::int FROM "User" WHERE role = 'TEACHER') as "totalTeachers",
          (SELECT COUNT(*)::int FROM "Batch") as "totalBatches",
          (SELECT COUNT(*)::int FROM "Course") as "totalCourses",
          (SELECT COALESCE(SUM("paidAmount"), 0)::float FROM "Payment" WHERE status IN ('PAID', 'VERIFIED', 'PAID_ONLINE') AND "paidAt" >= ${startOfMonth}) as "revenueThisMonth",
          (SELECT COALESCE(SUM("amount"), 0)::float FROM "Payment" WHERE status = 'PENDING') as "pendingDues",
          (SELECT COALESCE(json_agg(t), '[]'::json) FROM (
             SELECT "className", COUNT("userId")::int as "count"
             FROM "StudentProfile"
             WHERE "className" IS NOT NULL
             GROUP BY "className"
           ) t) as "classStats"
      `;
      return results[0];
    });

    const totalStudents = statsResult?.totalStudents || 0;
    const totalTeachers = statsResult?.totalTeachers || 0;
    const totalBatches = statsResult?.totalBatches || 0;
    const totalCourses = statsResult?.totalCourses || 0;
    const revenueThisMonth = statsResult?.revenueThisMonth || 0;
    const pendingDues = statsResult?.pendingDues || 0;
    const classStatsRaw = statsResult?.classStats || [];

    const classStats = classStatsRaw.map((g: any) => ({
      className: g.className || 'Unknown',
      count: g.count || 0,
    }));

    const activityLogs: any[] = [];

    const response = NextResponse.json({
      totalStudents,
      totalTeachers,
      totalBatches,
      totalCourses,
      classStats,
      revenueThisMonth,
      pendingDues,
      activityLogs
    });

    // Prevent caching to guarantee real-time data delivery
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch overview data' }, { status: 500 });
  }
}
