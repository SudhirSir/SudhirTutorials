import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalTeachers = await prisma.user.count({ where: { role: 'TEACHER' } });
    const totalBatches = await prisma.batch.count();
    const totalCourses = await prisma.course.count();

    const classStatsGroup = await prisma.studentProfile.groupBy({
      by: ['className'],
      _count: {
        userId: true
      },
      where: {
        className: { not: null }
      }
    });

    const classStats = classStatsGroup.map(g => ({
      className: g.className || 'Unknown',
      count: g._count.userId
    }));

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const paymentsThisMonth = await prisma.payment.aggregate({
      where: {
        status: { in: ['PAID', 'VERIFIED', 'PAID_ONLINE'] },
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      },
      _sum: { amount: true }
    });

    const pendingDues = await prisma.payment.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true }
    });

    return NextResponse.json({
      totalStudents,
      totalTeachers,
      totalBatches,
      totalCourses,
      classStats,
      revenueThisMonth: paymentsThisMonth._sum.amount || 0,
      pendingDues: pendingDues._sum.amount || 0
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch overview data' }, { status: 500 });
  }
}
