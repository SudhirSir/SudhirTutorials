export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { appCache } from '@/lib/cache';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const cacheKey = `admin:store:${type || 'all'}`;

    const items = await appCache.getOrSet(cacheKey, () =>
      withDbRetry(() => prisma.storeItem.findMany({
        where: type ? { type } : {},
        include: {
          onlineTests: {
            include: {
              _count: { select: { questions: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })),
      60
    );

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch store items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, type, price, className, board, description, fileUrl, isPublished, totalTests } = body;

    if (!title || !type || typeof price !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const item = await withDbRetry(() => prisma.storeItem.create({
      data: {
        title,
        type,
        price,
        className,
        board,
        description,
        fileUrl,
        isPublished: !!isPublished
      }
    }));

    // If it's a test series, create empty OnlineTest records for it
    if (type === 'TEST_SERIES') {
      const { durationMinutes, totalMarks } = body;
      const testCount = parseInt(totalTests || '1', 10);
      
      const testsToCreate = Array.from({ length: testCount }).map((_, i) => ({
        title: testCount > 1 ? `${title} - Test ${i + 1}` : `${title} - Test`,
        storeItemId: item.id,
        durationMinutes: parseInt(durationMinutes || '60', 10),
        totalMarks: parseFloat(totalMarks || '100')
      }));

      await withDbRetry(() => prisma.onlineTest.createMany({
        data: testsToCreate
      }));
    }

    appCache.invalidate('store:');
    appCache.invalidate('admin:store');

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create store item' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });

    const body = await req.json();
    const { title, price, className, board, description, fileUrl, isPublished, type } = body;

    const item = await withDbRetry(() => prisma.storeItem.update({
      where: { id },
      data: {
        title, price, className, board, description, fileUrl, isPublished
      }
    }));

    if (type === 'TEST_SERIES') {
      const { durationMinutes, totalMarks } = body;
      const testRecord = await withDbRetry(() => prisma.onlineTest.findFirst({ where: { storeItemId: id } }));
      if (testRecord) {
        await withDbRetry(() => prisma.onlineTest.update({
          where: { id: testRecord.id },
          data: {
            durationMinutes: parseInt(durationMinutes || '60', 10),
            totalMarks: parseFloat(totalMarks || '100')
          }
        }));
      }
    }

    appCache.invalidate('store:');
    appCache.invalidate('admin:store');

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update store item' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });

    await withDbRetry(() => prisma.storeItem.delete({
      where: { id }
    }));

    appCache.invalidate('store:');
    appCache.invalidate('admin:store');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete store item' }, { status: 500 });
  }
}
