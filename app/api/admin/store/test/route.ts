export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get('testId');
    
    if (!testId) {
      return NextResponse.json({ error: 'Missing testId' }, { status: 400 });
    }

    const questions = await withDbRetry(() => prisma.onlineTestQuestion.findMany({
      where: { onlineTestId: testId },
      orderBy: { id: 'asc' }
    }));

    return NextResponse.json({ questions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch test questions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { onlineTestId, questionText, options, correctOption, marks, explanation } = body;

    if (!onlineTestId || !questionText || !options || correctOption === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const question = await withDbRetry(() => prisma.onlineTestQuestion.create({
      data: {
        onlineTestId,
        questionText,
        options: JSON.stringify(options),
        correctOption: parseInt(correctOption, 10),
        marks: parseFloat(marks || '1'),
        explanation: explanation || null
      }
    }));

    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to add question' }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: 'Missing question ID' }, { status: 400 });

    await withDbRetry(() => prisma.onlineTestQuestion.delete({
      where: { id }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
