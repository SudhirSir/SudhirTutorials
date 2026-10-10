export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';
import { isInputAnswerCorrect } from '@/lib/answerEvaluator';

const submitSchema = z.object({
  mockTestId: z.string().min(1),
  answers: z.record(z.string(), z.union([z.number(), z.string()])), // questionId -> optionIndex OR input text string
  timeTaken: z.number().min(0), // seconds
  autoSubmitted: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized. Only students can submit mock tests.' }, { status: 401 });
    }

    const body = await req.json();
    const validation = submitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid submission payload', details: validation.error.format() }, { status: 400 });
    }

    const { mockTestId, answers, timeTaken, autoSubmitted } = validation.data;
    const studentId = session.user.id;

    // Fetch mock test with questions
    const mockTest = await withDbRetry(() => prisma.chapterMockTest.findUnique({
      where: { id: mockTestId },
      include: {
        questions: true
      }
    }));

    if (!mockTest) {
      return NextResponse.json({ error: 'Mock test not found' }, { status: 404 });
    }

    // Auto-calculate score
    let score = 0;
    let totalMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    const detailedResults = mockTest.questions.map(q => {
      totalMarks += q.marks;
      const studentSelected = answers[q.id];
      const opts = JSON.parse(q.options || '[]');
      const isInputType = Array.isArray(opts) && opts[0] === 'INPUT_ANSWER';

      let isUnattempted = false;
      let isCorrect = false;

      if (isInputType) {
        isUnattempted = studentSelected === undefined || studentSelected === null || String(studentSelected).trim() === '';
        isCorrect = !isUnattempted && isInputAnswerCorrect(studentSelected, opts[1]);
      } else {
        isUnattempted = studentSelected === undefined || studentSelected === null;
        isCorrect = !isUnattempted && studentSelected === q.correctOption;
      }

      if (isUnattempted) {
        unattemptedCount++;
      } else if (isCorrect) {
        correctCount++;
        score += q.marks;
      } else {
        incorrectCount++;
      }

      return {
        questionId: q.id,
        questionText: q.questionText,
        options: opts,
        correctOption: q.correctOption,
        studentSelected,
        isCorrect,
        isUnattempted,
        marks: q.marks,
        explanation: q.explanation,
        boardTag: q.boardTag
      };
    });

    // Save or update submission
    const submission = await withDbRetry(() => prisma.chapterMockSubmission.create({
      data: {
        mockTestId,
        studentId,
        score,
        totalMarks: mockTest.totalMarks > 0 ? mockTest.totalMarks : totalMarks,
        timeTaken,
        autoSubmitted,
        answers: JSON.stringify(answers)
      }
    }));

    const accuracy = mockTest.questions.length > 0
      ? Math.round((correctCount / mockTest.questions.length) * 100)
      : 0;

    return NextResponse.json({
      submission,
      reportCard: {
        score,
        totalMarks: mockTest.totalMarks > 0 ? mockTest.totalMarks : totalMarks,
        passingMarks: mockTest.passingMarks || 4,
        isPassed: score >= (mockTest.passingMarks || 4),
        accuracy,
        correctCount,
        incorrectCount,
        unattemptedCount,
        totalQuestions: mockTest.questions.length,
        timeTaken,
        autoSubmitted,
        detailedResults
      },
      success: true
    });
  } catch (error) {
    console.error('Error submitting chapter mock test:', error);
    return NextResponse.json({ error: 'Failed to submit chapter mock test' }, { status: 500 });
  }
}
