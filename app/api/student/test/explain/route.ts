export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI key not configured' }, { status: 500 });
    }

    const { questionText, options, studentAnswer, correctAnswer } = await req.json();

    if (!questionText || !options || correctAnswer === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are ST Guru Ji, a helpful AI tutor for Sudhir Tutorials. 
A student got a multiple choice question wrong.

Question: ${questionText}
Options: ${JSON.stringify(options)}
Student's Answer: ${studentAnswer || 'Not Attempted'}
Correct Answer: ${correctAnswer}

Please explain briefly and clearly why the correct answer is right and why the student's answer is incorrect. Keep it encouraging and easy to understand.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ explanation: responseText });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
  }
}
