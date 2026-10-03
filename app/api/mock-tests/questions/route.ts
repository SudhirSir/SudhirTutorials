export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const questionSchema = z.object({
  mockTestId: z.string().min(1),
  questionText: z.string().min(1),
  options: z.array(z.string()).min(2), // array of strings
  correctOption: z.number().int().min(0),
  marks: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v)) || 1),
  explanation: z.string().optional(),
  boardTag: z.string().optional(),
});

const bulkQuestionsSchema = z.object({
  mockTestId: z.string().min(1),
  questions: z.array(z.object({
    questionText: z.string().min(1),
    options: z.array(z.string()).min(2),
    correctOption: z.number().int().min(0),
    marks: z.union([z.number(), z.string()]).optional().transform(v => parseFloat(String(v || 1)) || 1),
    explanation: z.string().optional(),
    boardTag: z.string().optional(),
  }))
});

// GET: Fetch questions for a mock test
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mockTestId = searchParams.get('mockTestId');

    if (!mockTestId) {
      return NextResponse.json({ error: 'mockTestId is required' }, { status: 400 });
    }

    const mockTest = await withDbRetry(() => prisma.chapterMockTest.findUnique({
      where: { id: mockTestId },
      include: {
        questions: {
          orderBy: { id: 'asc' }
        }
      }
    }));

    if (!mockTest) {
      return NextResponse.json({ error: 'Mock test not found' }, { status: 404 });
    }

    return NextResponse.json({ mockTest, questions: mockTest.questions, success: true });
  } catch (error) {
    console.error('Error fetching mock questions:', error);
    return NextResponse.json({ error: 'Failed to fetch mock questions' }, { status: 500 });
  }
}

// POST: Add Question(s) to a mock test (Teacher / Admin)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Check if bulk insert
    if (body.questions && Array.isArray(body.questions)) {
      const validation = bulkQuestionsSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ error: 'Invalid bulk question data', details: validation.error.format() }, { status: 400 });
      }

      const { mockTestId, questions } = validation.data;

      const createdQuestions = await withDbRetry(() => prisma.chapterMockQuestion.createMany({
        data: questions.map(q => ({
          mockTestId,
          questionText: q.questionText,
          options: JSON.stringify(q.options),
          correctOption: q.correctOption,
          marks: q.marks,
          explanation: q.explanation || '',
          boardTag: q.boardTag || ''
        }))
      }));

      // Recalculate total marks for the test
      const allQs = await withDbRetry(() => prisma.chapterMockQuestion.findMany({
        where: { mockTestId }
      }));
      const totalMarksSum = allQs.reduce((acc, q) => acc + q.marks, 0);
      await withDbRetry(() => prisma.chapterMockTest.update({
        where: { id: mockTestId },
        data: { totalMarks: totalMarksSum }
      }));

      return NextResponse.json({ createdCount: createdQuestions.count, success: true });
    }

    // Single question insert
    const validation = questionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid question data', details: validation.error.format() }, { status: 400 });
    }

    const qData = validation.data;

    const question = await withDbRetry(() => prisma.chapterMockQuestion.create({
      data: {
        mockTestId: qData.mockTestId,
        questionText: qData.questionText,
        options: JSON.stringify(qData.options),
        correctOption: qData.correctOption,
        marks: qData.marks,
        explanation: qData.explanation,
        boardTag: qData.boardTag
      }
    }));

    // Recalculate total marks for test
    const allQs = await withDbRetry(() => prisma.chapterMockQuestion.findMany({
      where: { mockTestId: qData.mockTestId }
    }));
    const totalMarksSum = allQs.reduce((acc, q) => acc + q.marks, 0);
    await withDbRetry(() => prisma.chapterMockTest.update({
      where: { id: qData.mockTestId },
      data: { totalMarks: totalMarksSum }
    }));

    return NextResponse.json({ question, success: true });
  } catch (error) {
    console.error('Error adding mock question:', error);
    return NextResponse.json({ error: 'Failed to add mock question' }, { status: 500 });
  }
}

// PUT: Edit a question (Teacher / Admin)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, questionText, options, correctOption, marks, explanation, boardTag } = body;

    if (!id) return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });

    const updateData: any = {};
    if (questionText !== undefined) updateData.questionText = questionText;
    if (options !== undefined) updateData.options = JSON.stringify(options);
    if (correctOption !== undefined) updateData.correctOption = parseInt(correctOption, 10);
    if (marks !== undefined) updateData.marks = parseFloat(marks);
    if (explanation !== undefined) updateData.explanation = explanation;
    if (boardTag !== undefined) updateData.boardTag = boardTag;

    const question = await withDbRetry(() => prisma.chapterMockQuestion.update({
      where: { id },
      data: updateData
    }));

    // Recalculate total marks
    const allQs = await withDbRetry(() => prisma.chapterMockQuestion.findMany({
      where: { mockTestId: question.mockTestId }
    }));
    const totalMarksSum = allQs.reduce((acc, q) => acc + q.marks, 0);
    await withDbRetry(() => prisma.chapterMockTest.update({
      where: { id: question.mockTestId },
      data: { totalMarks: totalMarksSum }
    }));

    return NextResponse.json({ question, success: true });
  } catch (error) {
    console.error('Error updating mock question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

// DELETE: Delete a question (Teacher / Admin)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });

    const deletedQuestion = await withDbRetry(() => prisma.chapterMockQuestion.delete({
      where: { id }
    }));

    // Recalculate total marks
    const allQs = await withDbRetry(() => prisma.chapterMockQuestion.findMany({
      where: { mockTestId: deletedQuestion.mockTestId }
    }));
    const totalMarksSum = allQs.reduce((acc, q) => acc + q.marks, 0);
    await withDbRetry(() => prisma.chapterMockTest.update({
      where: { id: deletedQuestion.mockTestId },
      data: { totalMarks: totalMarksSum }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting mock question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
