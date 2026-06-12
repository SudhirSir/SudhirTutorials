import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    // const session = await getServerSession(authOptions) as any;
    // if (!session || !session.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    let rawGeminiKey = process.env.GEMINI_API_KEY || '';
    let rawOpenAIKey = process.env.OPENAI_API_KEY || '';

    const geminiKeyPresent = !!rawGeminiKey;
    const openaiKeyPresent = !!rawOpenAIKey;

    // Mask keys
    const maskKey = (key: string) => {
      if (!key) return 'NOT_SET';
      if (key.length <= 8) return `SET (length ${key.length})`;
      return `${key.slice(0, 4)}...${key.slice(-4)} (length ${key.length})`;
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

    return NextResponse.json({
      environment: {
        gemini: {
          present: geminiKeyPresent,
          rawMasked: maskKey(rawGeminiKey),
          sanitizedMasked: maskKey(sanitizedGeminiKey),
          hadQuotes: geminiCleanedQuotes
        },
        openai: {
          present: openaiKeyPresent,
          rawMasked: maskKey(rawOpenAIKey),
          sanitizedMasked: maskKey(sanitizedOpenAIKey),
          hadQuotes: openaiCleanedQuotes
        }
      },
      diagnostics: {
        gemini: geminiDiagnostic,
        openai: openaiDiagnostic
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
