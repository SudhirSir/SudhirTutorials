import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const setting = await withDbRetry(() =>
      prisma.systemSetting.findUnique({
        where: { key: 'minAppVersion' },
      })
    );
    return NextResponse.json({ minAppVersion: setting?.value || '1.0.0' });
  } catch (error) {
    console.error('Error fetching app version setting:', error);
    return NextResponse.json({ minAppVersion: '1.0.0' });
  }
}
