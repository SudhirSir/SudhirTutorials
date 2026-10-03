export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mockTestId = searchParams.get('mockTestId');
    const studentIdParam = searchParams.get('studentId');

    const role = session.user.role;
    const userId = session.user.id;

    const where: any = {};
    if (mockTestId) where.mockTestId = mockTestId;

    if (role === 'STUDENT') {
      where.studentId = userId;
    } else if (studentIdParam) {
      where.studentId = studentIdParam;
    }

    const submissions = await withDbRetry(() => prisma.chapterMockSubmission.findMany({
      where,
      include: {
        mockTest: {
          select: {
            title: true,
            className: true,
            board: true,
            subject: true,
            chapterName: true,
            totalMarks: true,
            passingMarks: true,
            durationMinutes: true,
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            username: true,
            photoUrl: true,
            studentProfile: {
              select: {
                rollNumber: true,
                className: true,
                board: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }));

    return NextResponse.json({ submissions, success: true });
  } catch (error) {
    console.error('Error fetching mock test results:', error);
    return NextResponse.json({ error: 'Failed to fetch mock test results' }, { status: 500 });
  }
}
