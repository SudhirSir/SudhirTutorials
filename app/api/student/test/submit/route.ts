export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { onlineTestId, answers, score, timeTaken, autoSubmitted } = body;

    if (!onlineTestId || timeTaken === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Server-side verification of answers against database to prevent tampering
    const questions = await withDbRetry(() => prisma.onlineTestQuestion.findMany({
      where: { onlineTestId }
    }));

    let verifiedScore = 0;
    if (answers && typeof answers === 'object') {
      questions.forEach(q => {
        const studentAns = answers[q.id];
        if (studentAns !== undefined && studentAns === q.correctOption) {
          verifiedScore += q.marks;
        }
      });
    } else if (typeof score === 'number') {
      const maxPossibleMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      verifiedScore = Math.min(Math.max(0, score), maxPossibleMarks);
    }

    const submission = await withDbRetry(() => prisma.onlineTestSubmission.upsert({
      where: {
        onlineTestId_studentId: {
          onlineTestId,
          studentId: session.user.id
        }
      },
      update: {
        score: verifiedScore,
        timeTaken,
        autoSubmitted: !!autoSubmitted
      },
      create: {
        onlineTestId,
        studentId: session.user.id,
        score: verifiedScore,
        timeTaken,
        autoSubmitted: !!autoSubmitted
      }
    }));

    const detailedResults = questions.map(q => {
      const studentAns = answers && typeof answers === 'object' ? answers[q.id] : undefined;
      const isCorrect = studentAns !== undefined && studentAns === q.correctOption;
      return {
        id: q.id,
        onlineTestId: q.onlineTestId,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        marks: q.marks,
        explanation: q.explanation,
        studentAns,
        isCorrect
      };
    });

    return NextResponse.json({ 
      success: true, 
      submission, 
      score: verifiedScore, 
      detailedResults 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit test' }, { status: 500 });
  }
}
