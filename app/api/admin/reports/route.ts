export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [courseStats, payments, attendanceCounts, testResults] = await Promise.all([
      // 1. Enrollment by Course
      withDbRetry(() => prisma.course.findMany({
        select: {
          name: true,
          batches: {
            select: {
              _count: { select: { students: true } }
            }
          }
        }
      })),
      // 2. Revenue Trends (last 6 months)
      withDbRetry(() => prisma.payment.findMany({
        where: {
          status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
          createdAt: { gte: sixMonthsAgo }
        },
        select: {
          amount: true,
          createdAt: true
        }
      })),
      // 3. Attendance Overview (Global %)
      withDbRetry(async () => {
        const results = await prisma.$queryRaw<any[]>`
          SELECT 
            COUNT(*)::int as "total",
            COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::int as "present"
          FROM "Attendance"
        `;
        return results[0] || { total: 0, present: 0 };
      }),
      // 4. Real-Time Published Test Results
      withDbRetry(() => prisma.testResult.findMany({
        where: { test: { isPublished: true } },
        select: {
          marks: true,
          totalMarks: true,
          studentId: true,
          test: {
            select: {
              subject: true,
              totalMarks: true
            }
          }
        }
      }))
    ]);

    const totalAttendance = attendanceCounts.total || 0;
    const presentCount = attendanceCounts.present || 0;

    const enrollmentData = courseStats.map((c: any) => ({
      name: c.name,
      students: c.batches.reduce((sum: number, b: any) => sum + b._count.students, 0)
    }));

    // Group Revenue by Month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueTrend: Record<string, number> = {};
    
    payments.forEach((p: any) => {
      const m = months[new Date(p.createdAt).getMonth()];
      revenueTrend[m] = (revenueTrend[m] || 0) + p.amount;
    });

    const formattedRevenue = Object.entries(revenueTrend).map(([name, amount]) => ({ name, amount }));
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    // Real-Time Subject Performance Matrix
    const subjectMap = new Map<string, { totalMarks: number, totalMax: number, count: number }>();
    testResults.forEach((tr: any) => {
      const subj = tr.test?.subject || 'General';
      const maxMarks = tr.totalMarks || tr.test?.totalMarks || 100;
      const current = subjectMap.get(subj) || { totalMarks: 0, totalMax: 0, count: 0 };
      subjectMap.set(subj, {
        totalMarks: current.totalMarks + tr.marks,
        totalMax: current.totalMax + maxMarks,
        count: current.count + 1
      });
    });

    const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, data]) => {
      const avgScore = data.totalMax > 0 ? Math.round((data.totalMarks / data.totalMax) * 100) : 0;
      const tag = avgScore >= 85 ? '🌟 Outstanding' : avgScore >= 75 ? '⚡ Strong' : avgScore >= 60 ? '🎯 Good' : '🎯 Focus Needed';
      const color = avgScore >= 85 ? '#8b5cf6' : avgScore >= 75 ? '#10b981' : avgScore >= 60 ? '#3b82f6' : '#ef4444';
      return { subject, avgScore, tag, color };
    }).sort((a, b) => b.avgScore - a.avgScore);

    // Score Distribution Percentiles (Real-Time DB Aggregated)
    const studentScoreMap = new Map<string, { total: number, max: number }>();
    testResults.forEach((tr: any) => {
      const maxMarks = tr.totalMarks || tr.test?.totalMarks || 100;
      const current = studentScoreMap.get(tr.studentId) || { total: 0, max: 0 };
      studentScoreMap.set(tr.studentId, {
        total: current.total + tr.marks,
        max: current.max + maxMarks
      });
    });

    let topAchieversCount = 0;
    let satisfactoryCount = 0;
    let supportNeededCount = 0;
    const totalEvaluatedStudents = studentScoreMap.size;

    studentScoreMap.forEach((data) => {
      const pct = data.max > 0 ? (data.total / data.max) * 100 : 0;
      if (pct >= 90) topAchieversCount++;
      else if (pct >= 75) satisfactoryCount++;
      else supportNeededCount++;
    });

    const topAchieversPct = totalEvaluatedStudents > 0 ? Math.round((topAchieversCount / totalEvaluatedStudents) * 100) : 0;
    const satisfactoryPct = totalEvaluatedStudents > 0 ? Math.round((satisfactoryCount / totalEvaluatedStudents) * 100) : 0;
    const supportNeededPct = totalEvaluatedStudents > 0 ? Math.round((supportNeededCount / totalEvaluatedStudents) * 100) : 0;

    // Overall Real-Time Average Test Score
    let overallObtained = 0;
    let overallMax = 0;
    testResults.forEach((tr: any) => {
      overallObtained += tr.marks;
      overallMax += tr.totalMarks || tr.test?.totalMarks || 100;
    });

    const overallAvgScore = overallMax > 0 ? (overallObtained / overallMax) * 100 : 0;
    const submissionPromptness = testResults.length > 0 ? 100 : 0;

    return NextResponse.json({
      enrollmentData,
      revenueTrend: formattedRevenue,
      attendanceRate,
      subjectPerformance,
      scoreDistribution: {
        topAchieversPct,
        satisfactoryPct,
        supportNeededPct,
        totalEvaluatedStudents
      },
      overallAvgScore,
      submissionPromptness
    });
  } catch (error) {
    console.error('Error generating analytics report:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
