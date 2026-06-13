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
    let rawOpenAIKey = process.env.OPENAI_API_KEY || '';
    let rawDatabaseUrl = process.env.DATABASE_URL || '';
    let rawDirectUrl = process.env.DIRECT_URL || '';

    const geminiKeyPresent = !!rawGeminiKey;
    const openaiKeyPresent = !!rawOpenAIKey;
    const dbUrlPresent = !!rawDatabaseUrl;
    const directUrlPresent = !!rawDirectUrl;

    // Mask strings
    const maskString = (str: string) => {
      if (!str) return 'NOT_SET';
      if (str.length <= 10) return `SET (length ${str.length})`;
      return `${str.slice(0, 5)}...${str.slice(-5)} (length ${str.length})`;
    };

    const sanitizedGeminiKey = rawGeminiKey.trim().replace(/^["']|["']$/g, '');
    const sanitizedOpenAIKey = rawOpenAIKey.trim().replace(/^["']|["']$/g, '');

    const geminiCleanedQuotes = rawGeminiKey !== sanitizedGeminiKey;
    const openaiCleanedQuotes = rawOpenAIKey !== sanitizedOpenAIKey;

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

    let openaiDiagnostic = {};
    if (sanitizedOpenAIKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sanitizedOpenAIKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: "Hello" }]
          })
        });
        const status = response.status;
        const text = await response.text();
        openaiDiagnostic = {
          status,
          success: response.ok,
          response: text.length > 500 ? text.slice(0, 500) + '...' : text
        };
      } catch (err: any) {
        openaiDiagnostic = { error: err.message || String(err) };
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
        openai: {
          present: openaiKeyPresent,
          masked: maskString(rawOpenAIKey),
          hadQuotes: openaiCleanedQuotes
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
        openai: openaiDiagnostic,
        database: dbDiagnostic
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
