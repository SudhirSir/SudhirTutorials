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
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questionText, options, studentAnswer, correctAnswer, boardTag } = await req.json();

    if (!questionText || !options || correctAnswer === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        explanation: `The correct option is: **${correctAnswer}**. Make sure to review the core textbook concept and practice similar board-level questions.`
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are ST Guru Ji, the expert tutor for Sudhir Tutorials.
A student took a Chapter-wise Board Mock Test and requested an explanation for this question.

${boardTag ? `Board Pattern Tag: ${boardTag}` : ''}
Question: ${questionText}
Options: ${Array.isArray(options) ? options.map((opt, i) => `${String.fromCharCode(65+i)}. ${opt}`).join(', ') : JSON.stringify(options)}
Student Selected Answer: ${studentAnswer !== undefined ? studentAnswer : 'Not Attempted'}
Correct Answer: ${correctAnswer}

Please explain step-by-step in clear, encouraging Hinglish/English:
1. Why the correct option is right (with formula/concept if applicable).
2. Common trap or mistake to avoid in Board Exams.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ explanation: responseText, success: true });
  } catch (error) {
    console.error('AI Explanation Error:', error);
    return NextResponse.json({
      explanation: 'ST Guru ji says: Review the textbook formula and steps for this chapter question!'
    });
  }
}
