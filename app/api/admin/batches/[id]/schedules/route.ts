export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { dayOfWeek, startTime, endTime, room } = await req.json();
    const { id } = await params;
    const batchId = id;

    const schedule = await prisma.schedule.create({
      data: {
        batchId,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        room
      }
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    await prisma.schedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
