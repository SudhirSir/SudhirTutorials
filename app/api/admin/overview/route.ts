export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { calculateLateFine } from '@/lib/feeUtils';
import { getLateFineSettings } from '@/lib/feeSettings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const statsResult = await withDbRetry(async () => {
      const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
      const totalTeachers = await prisma.user.count({ where: { role: 'TEACHER' } });
      const totalBatches = await prisma.batch.count();
      const totalCourses = await prisma.course.count();
      
      const paymentsThisMonth = await prisma.payment.aggregate({
        _sum: { paidAmount: true },
        where: {
          status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
          paidAt: { gte: startOfMonth }
        }
      });
      const revenueThisMonth = paymentsThisMonth._sum.paidAmount || 0;

      const pendingPaymentsList = await prisma.payment.findMany({
        where: { status: 'PENDING' }
      });
      const { perDayFine, flatFineAfter10Days } = await getLateFineSettings();
      const pendingDues = pendingPaymentsList.reduce((sum, p) => {
        const fine = calculateLateFine(p.dueDate, p.status, perDayFine, flatFineAfter10Days);
        return sum + Math.max(0, p.amount + fine - (p.discount || 0) + (p.previousBalance || 0) - (p.paidAmount || 0));
      }, 0);

      const classGroups = await prisma.studentProfile.groupBy({
        by: ['className'],
        _count: { userId: true },
        where: { className: { not: null } }
      });
      const classStats = classGroups.map(g => ({
        className: g.className || 'Unknown',
        count: g._count.userId || 0
      }));

      return {
        totalStudents,
        totalTeachers,
        totalBatches,
        totalCourses,
        revenueThisMonth,
        pendingDues,
        classStats
      };
    });

    const totalStudents = statsResult?.totalStudents || 0;
    const totalTeachers = statsResult?.totalTeachers || 0;
    const totalBatches = statsResult?.totalBatches || 0;
    const totalCourses = statsResult?.totalCourses || 0;
    const revenueThisMonth = statsResult?.revenueThisMonth || 0;
    const pendingDues = statsResult?.pendingDues || 0;
    const classStats = statsResult?.classStats || [];

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
