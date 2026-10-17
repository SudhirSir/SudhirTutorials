export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const purchases = await withDbRetry(() => prisma.storePurchase.findMany({
      where: {
        studentId: session.user.id,
        status: { in: ['SUCCESS', 'PENDING'] }
      },
      include: {
        item: {
          include: {
            onlineTests: {
              include: {
                submissions: {
                  where: { studentId: session.user.id }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }));

    // Find all mock test submissions for this student
    const mockTestIds = purchases
      .filter((p: any) => p.item?.type === 'MOCK_TEST' || p.itemId.startsWith('mocktest-'))
      .map((p: any) => p.itemId.replace(/^mocktest-/, ''));

    const mockSubmissionsMap: Record<string, any> = {};
    if (mockTestIds.length > 0) {
      const mockSubs = await withDbRetry(() => prisma.chapterMockSubmission.findMany({
        where: {
          studentId: session.user.id,
          mockTestId: { in: mockTestIds }
        },
        orderBy: { score: 'desc' }
      }));
      mockSubs.forEach((sub: any) => {
        if (!mockSubmissionsMap[sub.mockTestId]) {
          mockSubmissionsMap[sub.mockTestId] = sub;
        }
      });
    }

    const enhancedPurchases = purchases.map((p: any) => {
      const rawMockId = p.itemId.replace(/^mocktest-/, '');
      const bestMockSubmission = mockSubmissionsMap[rawMockId] || null;
      return {
        ...p,
        bestMockSubmission
      };
    });

    return NextResponse.json({ purchases: enhancedPurchases });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}
