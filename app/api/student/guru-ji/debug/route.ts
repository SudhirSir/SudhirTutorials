import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawGeminiKey = process.env.GEMINI_API_KEY || '';
    let rawGroqKey = process.env.GROQ_API_KEY || '';
    let rawDatabaseUrl = process.env.DATABASE_URL || '';
    let rawDirectUrl = process.env.DIRECT_URL || '';

    const geminiKeyPresent = !!rawGeminiKey;
    const groqKeyPresent = !!rawGroqKey;
    const dbUrlPresent = !!rawDatabaseUrl;
    const directUrlPresent = !!rawDirectUrl;

    // Mask strings
    const maskString = (str: string) => {
      if (!str) return 'NOT_SET';
      if (str.length <= 10) return `SET (length ${str.length})`;
      return `${str.slice(0, 5)}...${str.slice(-5)} (length ${str.length})`;
    };

    const sanitizedGeminiKey = rawGeminiKey.trim().replace(/^["']|["']$/g, '');
    const sanitizedGroqKey = rawGroqKey.trim().replace(/^["']|["']$/g, '');

    const geminiCleanedQuotes = rawGeminiKey !== sanitizedGeminiKey;
    const groqCleanedQuotes = rawGroqKey !== sanitizedGroqKey;

    let geminiDiagnostic = {};
    if (sanitizedGeminiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${sanitizedGeminiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: "Hello, reply with only 'OK'" }]
              }
            ]
          })
        });
        const status = response.status;
        const text = await response.text();
        geminiDiagnostic = {
          status,
          success: response.ok,
          response: text.length > 500 ? text.slice(0, 500) + '...' : text
        };
      } catch (err: any) {
        geminiDiagnostic = { error: err.message || String(err) };
      }
    }

    let groqDiagnostic = {};
    if (sanitizedGroqKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sanitizedGroqKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: "Hello" }]
          })
        });
        const status = response.status;
        const text = await response.text();
        groqDiagnostic = {
          status,
          success: response.ok,
          response: text.length > 500 ? text.slice(0, 500) + '...' : text
        };
      } catch (err: any) {
        groqDiagnostic = { error: err.message || String(err) };
      }
    }

    let dbDiagnostic = {};
    try {
      // Run a simple count query to verify Prisma client initialization and connection
      const userCount = await prisma.user.count();
      dbDiagnostic = {
        success: true,
        userCount
      };
    } catch (err: any) {
      dbDiagnostic = {
        success: false,
        name: err.name || 'Error',
        message: err.message || String(err),
        code: err.code || null,
        stack: err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : null
      };
    }

    return NextResponse.json({
      environment: {
        gemini: {
          present: geminiKeyPresent,
          masked: maskString(rawGeminiKey),
          hadQuotes: geminiCleanedQuotes
        },
        groq: {
          present: groqKeyPresent,
          masked: maskString(rawGroqKey),
          hadQuotes: groqCleanedQuotes
        },
        database: {
          urlPresent: dbUrlPresent,
          urlMasked: maskString(rawDatabaseUrl),
          directPresent: directUrlPresent,
          directMasked: maskString(rawDirectUrl)
        }
      },
      diagnostics: {
        gemini: geminiDiagnostic,
        groq: groqDiagnostic,
        database: dbDiagnostic
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
