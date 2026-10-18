export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { appCache } from '@/lib/cache';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = id;
    if (!userId) return new NextResponse(null, { status: 400 });

    const cached = await appCache.getOrSet(`user-avatar:${userId}`, async () => {
      const user = await withDbRetry(() => prisma.user.findUnique({
        where: { id: userId },
        select: { photoUrl: true }
      }));
      return user?.photoUrl || null;
    }, 3600);

    if (!cached) {
      return new NextResponse(null, { status: 404 });
    }

    if (cached.startsWith('data:')) {
      const parts = cached.split(',');
      const mime = parts[0]?.split(';')?.[0]?.replace('data:', '') || 'image/jpeg';
      const buffer = Buffer.from(parts[1] || '', 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        }
      });
    }

    if (cached.startsWith('http://') || cached.startsWith('https://')) {
      return NextResponse.redirect(cached);
    }

    if (cached.startsWith('/')) {
      return NextResponse.redirect(new URL(cached, req.url));
    }

    return new NextResponse(null, { status: 404 });
  } catch (e) {
    return new NextResponse(null, { status: 500 });
  }
}
