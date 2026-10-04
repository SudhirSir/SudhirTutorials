export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

function parseMcqsLocally(text: string, board?: string): any[] {
  if (!text || !text.trim()) return [];
  const mcqs: any[] = [];
  const questionBlocks = text.split(/(?=(?:Q(?:ues(?:tion)?)?\s*[\.\:\#]?\s*\d+[\.\:\)]|\b\d{1,3}[\.\)]\s+))/gi);

  for (const block of questionBlocks) {
    if (!block.trim()) continue;

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const questionText = lines[0].replace(/^(?:Q(?:ues(?:tion)?)?\s*[\.\:\#]?\s*\d+[\.\:\)]|\b\d{1,3}[\.\)]\s*)/i, '').trim();
    let optA = '', optB = '', optC = '', optD = '';
    let correctOption = 0;
    let explanation = '';

    const optAMatch = block.match(/(?:^[ \t]*(?:[\(\[]?A[\)\]\.]|\bA[\:\.\)])\s*)([^\n\r]+)/im);
    const optBMatch = block.match(/(?:^[ \t]*(?:[\(\[]?B[\)\]\.]|\bB[\:\.\)])\s*)([^\n\r]+)/im);
    const optCMatch = block.match(/(?:^[ \t]*(?:[\(\[]?C[\)\]\.]|\bC[\:\.\)])\s*)([^\n\r]+)/im);
    const optDMatch = block.match(/(?:^[ \t]*(?:[\(\[]?D[\)\]\.]|\bD[\:\.\)])\s*)([^\n\r]+)/im);

    if (optAMatch) optA = optAMatch[1].replace(/(?:Ans|Answer|Option).*$/i, '').trim();
    if (optBMatch) optB = optBMatch[1].replace(/(?:Ans|Answer|Option).*$/i, '').trim();
    if (optCMatch) optC = optCMatch[1].replace(/(?:Ans|Answer|Option).*$/i, '').trim();
    if (optDMatch) optD = optDMatch[1].replace(/(?:Ans|Answer|Option).*$/i, '').trim();

    const ansMatch = block.match(/(?:Ans(?:wer)?|Correct\s*Option?)\s*[\:\=]?\s*[\(\[]?([A-D1-4])[\)\]]?/i);
    if (ansMatch) {
      const val = ansMatch[1].toUpperCase();
      if (val === 'A' || val === '1') correctOption = 0;
      else if (val === 'B' || val === '2') correctOption = 1;
      else if (val === 'C' || val === '3') correctOption = 2;
      else if (val === 'D' || val === '4') correctOption = 3;
    }

    const expMatch = block.match(/(?:Expl(?:anation)?|Solution|Reason)\s*[\:\=]\s*([^\n\r]+)/i);
    if (expMatch) explanation = expMatch[1].trim();

    if (questionText && (optA || optB)) {
      mcqs.push({
        questionText,
        optA: optA || 'Option A',
        optB: optB || 'Option B',
        optC: optC || 'Option C',
        optD: optD || 'Option D',
        correctOption,
        explanation,
        boardTag: `${board || 'Board'} Pattern`
      });
    }
  }

  return mcqs;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !['TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const { text, fileBase64, mimeType, subject, board } = await req.json();

    if (!text?.trim() && !fileBase64) {
      return NextResponse.json({ error: 'Please attach a document/image or paste question text.' }, { status: 400 });
    }

    let geminiApiKey = process.env.GEMINI_API_KEY || undefined;
    let groqApiKey = process.env.GROQ_API_KEY || undefined;

    if (geminiApiKey) geminiApiKey = geminiApiKey.trim().replace(/^["']|["']$/g, '');
    if (groqApiKey) groqApiKey = groqApiKey.trim().replace(/^["']|["']$/g, '');

    const systemPrompt = `You are an expert educational AI assistant for 'Sudhir Tutorials'.
Your task is to parse the provided text or document and extract ALL questions present in the text/document, whether they are Multiple Choice Questions (MCQs) or Input-Based / Numerical / Direct Answer questions.

Subject Context: ${subject || 'General'}
Target Board: ${board || 'Board Pattern'}

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects with the following schema:
[
  {
    "questionType": "MCQ",
    "questionText": "What is the SI unit of force?",
    "optA": "Joule",
    "optB": "Newton",
    "optC": "Watt",
    "optD": "Pascal",
    "correctOption": 1,
    "explanation": "Newton is the SI unit of force.",
    "boardTag": "Suggested board pattern tag"
  },
  {
    "questionType": "INPUT",
    "questionText": "Find the value of x if 2x + 5 = 15.",
    "inputAnswer": "5",
    "explanation": "2x = 10 implies x = 5.",
    "boardTag": "Suggested board pattern tag"
  }
]

CRITICAL EXTRACTION RULES:
1. For MCQ questions, set questionType to "MCQ", provide optA, optB, optC, optD, and set correctOption as an integer (0 for A, 1 for B, 2 for C, 3 for D).
2. For Input/Numerical/Short Answer questions without options, set questionType to "INPUT" and provide the expected answer in inputAnswer.
3. CRITICAL: You MUST process the ENTIRE document/text from start to finish and extract EVERY SINGLE QUESTION (Q1, Q2, Q3, Q4, Q5... all questions). DO NOT stop after extracting only 1 question!
4. MATHEMATICS, SCIENCE & LATEX SUPPORT:
   - For all mathematical equations, formulas, fractions, powers, roots, variables, and scientific expressions, ALWAYS use clean LaTeX notation wrapped in \\( ... \\) delimiters.
   - Examples: \\(x^2 + 5x + 6 = 0\\), \\(\\frac{a}{b}\\), \\(\\sqrt{x}\\), \\(\\sin\\theta\\), \\(\\pi r^2\\), \\(3^{2x-1}\\), \\(\\pm 5\\), \\(\\text{H}_2\\text{O}\\).
   - Format math in questionText, optA, optB, optC, optD, inputAnswer, and explanation using LaTeX \\( ... \\) so equations render properly.
5. Output ONLY raw JSON array. Do not include markdown code block ticks or introduction text.`;

    let rawOutput = '';

    // Attempt Gemini API models if key available
    if (geminiApiKey) {
      const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro'
      ];

      for (const modelName of modelsToTry) {
        try {
          const parts: any[] = [];

          if (fileBase64) {
            const cleanBase64 = fileBase64.replace(/^data:.*?;base64,/, '');
            parts.push({
              inline_data: {
                mime_type: mimeType || 'application/pdf',
                data: cleanBase64
              }
            });
          }

          let userText = systemPrompt;
          if (text?.trim()) {
            userText += `\n\nContent to parse:\n${text.trim()}`;
          }
          parts.push({ text: userText });

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText && candidateText.trim().length > 0) {
              rawOutput = candidateText.trim();
              break; // Success!
            }
          } else {
            console.warn(`[MCQ Extractor] Gemini model ${modelName} returned status ${response.status}`);
          }
        } catch (mErr) {
          console.warn(`[MCQ Extractor] Error trying ${modelName}:`, mErr);
        }
      }
    }

    // Fallback to Groq API if Gemini failed and Groq API key is present (text-only)
    if (!rawOutput && groqApiKey && text?.trim()) {
      const groqModelsToTry = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
      for (const groqModel of groqModelsToTry) {
        try {
          const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
          const groqRes = await fetch(groqUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text.trim() }
              ],
              temperature: 0.1
            })
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            const content = groqData.choices?.[0]?.message?.content || '';
            if (content.trim()) {
              rawOutput = content.trim();
              break;
            }
          } else {
            console.warn(`[MCQ Extractor] Groq model ${groqModel} status ${groqRes.status}`);
          }
        } catch (gErr) {
          console.warn(`[MCQ Extractor] Groq fallback failed for ${groqModel}:`, gErr);
        }
      }
    }

    // Fallback to local regex parsing if AI provider calls yielded no rawOutput but text was provided
    if (!rawOutput && text?.trim()) {
      const localQuestions = parseMcqsLocally(text, board);
      if (localQuestions.length > 0) {
        return NextResponse.json({ questions: localQuestions, success: true, method: 'local_parser' });
      }
    }

    if (!rawOutput) {
      return NextResponse.json({ error: 'Failed to extract MCQs from AI provider. Please verify your document/text or API key settings.' }, { status: 502 });
    }

    // Isolate JSON array or object with robust multi-object extraction
    let questionsArr: any[] = [];
    try {
      const cleanedText = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();

      // 1. Try direct JSON parse
      try {
        const parsed = JSON.parse(cleanedText);
        if (Array.isArray(parsed)) {
          questionsArr = parsed;
        } else if (parsed && typeof parsed === 'object') {
          questionsArr = parsed.questions || parsed.mcqs || parsed.data || [parsed];
        }
      } catch (e1) {
        // 2. Extract JSON array using regex [ ... ]
        const arrayMatch = cleanedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          try {
            questionsArr = JSON.parse(arrayMatch[0]);
          } catch (e2) {
            // Continuation below
          }
        }

        // 3. Fallback: match individual JSON objects { ... } across entire text
        if (!questionsArr.length) {
          const objectMatches = cleanedText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || cleanedText.match(/\{[\s\S]*?\}/g);
          if (objectMatches) {
            for (const objStr of objectMatches) {
              try {
                const parsedObj = JSON.parse(objStr);
                if (parsedObj && typeof parsedObj === 'object') {
                  if (parsedObj.questionText || parsedObj.question || parsedObj.optA || parsedObj.optionA) {
                    questionsArr.push(parsedObj);
                  } else if (Array.isArray(parsedObj.questions)) {
                    questionsArr.push(...parsedObj.questions);
                  }
                }
              } catch (eObj) {
                // Ignore invalid snippet
              }
            }
          }
        }
      }
    } catch (parseErr) {
      console.error("[MCQ Extractor] Could not parse AI response as JSON:", parseErr, "Raw output:", rawOutput);
    }

    if (!Array.isArray(questionsArr) || questionsArr.length === 0) {
      // Final attempt: fallback to local parser if text was provided
      if (text?.trim()) {
        const localQuestions = parseMcqsLocally(text, board);
        if (localQuestions.length > 0) {
          return NextResponse.json({ questions: localQuestions, success: true, method: 'local_parser_fallback' });
        }
      }
      return NextResponse.json({ error: 'No questions found in the provided content. Please ensure the document or text contains questions.' }, { status: 400 });
    }

    // Sanitize and normalize extracted questions (MCQ + INPUT mixed)
    const sanitizedQuestions = questionsArr.map((q: any) => {
      const isInput = q.questionType === 'INPUT' || (!q.optA && !q.optB && (q.inputAnswer || q.answer));
      return {
        questionType: isInput ? 'INPUT' : 'MCQ',
        questionText: String(q.questionText || q.question || q.title || '').trim(),
        optA: String(q.optA || q.optionA || (q.options && q.options[0]) || '').trim(),
        optB: String(q.optB || q.optionB || (q.options && q.options[1]) || '').trim(),
        optC: String(q.optC || q.optionC || (q.options && q.options[2]) || '').trim(),
        optD: String(q.optD || q.optionD || (q.options && q.options[3]) || '').trim(),
        correctOption: typeof q.correctOption === 'number' 
          ? Math.max(0, Math.min(3, q.correctOption))
          : (typeof q.answer === 'string' && /b/i.test(q.answer) ? 1 : typeof q.answer === 'string' && /c/i.test(q.answer) ? 2 : typeof q.answer === 'string' && /d/i.test(q.answer) ? 3 : 0),
        inputAnswer: String(q.inputAnswer || q.answer || '').trim(),
        explanation: String(q.explanation || q.solution || '').trim(),
        boardTag: String(q.boardTag || `${board || 'CBSE'} Pattern`).trim()
      };
    }).filter(q => q.questionText && (q.questionType === 'INPUT' ? q.inputAnswer : (q.optA || q.optB)));

    if (sanitizedQuestions.length === 0) {
      return NextResponse.json({ error: 'Could not extract valid questions from content. Please format or paste clear question text.' }, { status: 400 });
    }

    return NextResponse.json({ questions: sanitizedQuestions, success: true });
  } catch (error: any) {
    console.error('Error in MCQ Extraction API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error while extracting MCQs.' }, { status: 500 });
  }
}
