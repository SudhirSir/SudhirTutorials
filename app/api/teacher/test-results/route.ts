export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const resultsSchema = z.object({
  testId: z.string().min(1),
  results: z.array(z.object({
    studentId: z.string().min(1),
    marks: z.number().min(0),
    totalMarks: z.number().min(1),
    remarks: z.string().optional()
  }))
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = resultsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data', details: validation.error.format() }, { status: 400 });
    }

    const { testId, results } = validation.data;

    const operations = results.map(r => 
      prisma.testResult.upsert({
        where: {
          testId_studentId: {
            testId,
            studentId: r.studentId
          }
        },
        update: {
          marks: r.marks,
          totalMarks: r.totalMarks,
          remarks: r.remarks
        },
        create: {
          testId,
          studentId: r.studentId,
          marks: r.marks,
          totalMarks: r.totalMarks,
          remarks: r.remarks
        }
      })
    );

    await withDbRetry(() => prisma.$transaction(operations));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving test results:', error);
    return NextResponse.json({ error: 'Failed to save test results' }, { status: 500 });
  }
}
