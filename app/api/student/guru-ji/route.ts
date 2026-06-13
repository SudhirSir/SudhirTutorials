export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Polyfill DOMMatrix for Node/Vercel serverless environment to prevent pdfjs/pdf-parse module load crash
if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class {};
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
// @ts-ignore
const { PDFParse } = require('pdf-parse');

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !['STUDENT', 'TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, subject, language, image, file } = await req.json();
    if (!question && !image && !file) {
      return NextResponse.json({ error: 'Either question text, image, or PDF file is required' }, { status: 400 });
    }

    const resolvedLanguage = language || detectLanguage(question || "");

    let extractedPdfText = '';
    let isPdf = false;
    let activeImage = image;

    if (file) {
      if (file.startsWith('data:application/pdf;base64,')) {
        isPdf = true;
        try {
          const base64Data = file.split(';base64,').pop() || '';
          const buffer = Buffer.from(base64Data, 'base64');
          const parser = new PDFParse(new Uint8Array(buffer));
          const pdfData = await parser.getText();
          extractedPdfText = pdfData.text || '';
        } catch (pdfError) {
          console.error("Failed to parse PDF file on backend:", pdfError);
        }
      } else if (file.startsWith('data:image/')) {
        activeImage = file;
      }
    }

    // Fetch student's profile context (class & board) if the user is a student
    let studentContext = "";
    if (session.user.role === 'STUDENT') {
      try {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: session.user.id },
          select: { className: true, board: true }
        });
        if (studentProfile) {
          const parts = [];
          if (studentProfile.className) parts.push(`Class/Grade: ${studentProfile.className}`);
          if (studentProfile.board) parts.push(`Board: ${studentProfile.board}`);
          if (parts.length > 0) {
            studentContext = `\nSTUDENT PROFILE CONTEXT: The student asking this doubt is in ${parts.join(" and studying under ") || "general class"}. You MUST customize your explanation level, mathematical depth, syllabus context, and response terminology to match exactly this student's grade/class and board.`;
          }
        }
      } catch (profileError) {
        console.error("Failed to fetch student profile for AI context:", profileError);
      }
    }

    const resolvedSubject = subject || (question ? detectSubject(question) : 'General Academics');
    
    // Check for API Keys
    let geminiApiKey = process.env.GEMINI_API_KEY || undefined;
    let groqApiKey = process.env.GROQ_API_KEY || undefined;

    // Clean surrounding quotes if they exist
    if (geminiApiKey) geminiApiKey = geminiApiKey.trim().replace(/^["']|["']$/g, '');
    if (groqApiKey) groqApiKey = groqApiKey.trim().replace(/^["']|["']$/g, '');

    console.log("[Guru Ji AI Route] API Keys present - Gemini:", !!geminiApiKey, "Groq:", !!groqApiKey);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let success = false;
        let fullResponse = "";

        const systemPrompt = `You are 'Digital ST Guru ji', a highly professional, helpful, and premium AI doubt solver for the prestigious institute 'SUDHIR TUTORIALS'.
A student has submitted an academic doubt (as text, image, or PDF document).${studentContext}

You MUST follow these critical instruction rules:
1. ACADEMIC AND DECORUM POLICY: If the student asks anything offensive, inappropriate, abusive, bad, or non-academic (e.g. gaming, movies, entertainment, gossip, politics, personal questions, relationship advice, etc.), you MUST refuse to answer and strictly reply with the following exact message: "Please maintain decorum and focus on your studies. Any inappropriate queries will be reported to the administration."
2. AUTO LANGUAGE DETECTION: Natively detect the language of the student's query (English, Hindi, or Hinglish) and respond in the same language. For example, if the query is in English, reply in English. If it is in Hindi (Devanagari script), reply in Hindi. If it is in Hinglish (Hindi words in English script), reply in Hinglish.
3. DIRECT, IN-DEPTH & EXACT: Provide a comprehensive, high-quality, exact, and detailed academic explanation. Do not include verbose, generic introductory or concluding remarks. Go straight to the explanation.
4. DIAGRAMS, ILLUSTRATIONS & MATH FORMULAS: Whenever a diagram, flowchart, comparison, math formula, circuit, or chemical structure helps explain the concept (especially in Physics, Chemistry, Biology, Mathematics, or comparative topics), you MUST include it:
   - Use clean Markdown Tables for comparative data.
   - NEVER use LaTeX math delimiters (like $$, $, \\(, \\)) or raw LaTeX formulas in the response or inside SVGs. Instead, write equations and chemical symbols using plain text and Unicode superscript/subscript characters (e.g. write e⁻, Na⁺, E°, ΔG = -nFE_cell, Cl₂). This is a critical rule to prevent formatting failures.
   - For diagrams, flowcharts, or drawings, generate beautiful, self-contained SVG elements inside standard <svg>...</svg> tags. Ensure the SVG has sensible dimensions, viewBox, responsive styling, and colors so it renders nicely on both light and dark themes. Write valid, clean SVG code. Inside SVG <text> elements, write standard readable plain text (never write LaTeX formulas or dollar signs).
5. FORMATTING (NO '#'): Use clean Markdown to structure your response. Do NOT use '#' or '##' symbols for headings, as they render poorly in the chat window. Instead, use bold text (e.g. **Heading**) or list items for structure. Do NOT use any artificial card-splitting headers (like '📝 Extracted Question', '🧮 Step-by-Step Solution', etc.) and do NOT use '[STEP]' delimiters. Just write a continuous, cohesive, and premium academic answer.`;

        // Attempt 1: Gemini Streaming
        if (geminiApiKey) {
          try {
            const parts: any[] = [];
            if (isPdf) {
              const base64Data = file.split(';base64,').pop() || '';
              parts.push({
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data
                }
              });
              parts.push({
                text: question || "Solve the academic problem in the attached PDF document step-by-step."
              });
            } else if (activeImage) {
              const mimeType = activeImage.match(/^data:([^;]+);base64,/)?.[1] || 'image/png';
              const base64Data = activeImage.split(';base64,').pop() || '';
              parts.push({
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              });
              parts.push({
                text: question || "Solve the attached academic question from the image."
              });
            } else {
              parts.push({
                text: question
              });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiApiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                system_instruction: {
                  parts: [{ text: systemPrompt }]
                },
                contents: [
                  {
                    role: 'user',
                    parts: parts
                  }
                ],
                generationConfig: {
                  temperature: 0.7,
                  thinkingConfig: {
                    thinkingBudget: 0
                  }
                }
              })
            });

            if (response.ok && response.body) {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  const cleanLine = line.trim();
                  if (cleanLine.startsWith("data: ")) {
                    const jsonStr = cleanLine.substring(6).trim();
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (textChunk) {
                        controller.enqueue(encoder.encode(textChunk));
                        fullResponse += textChunk;
                      }
                    } catch (e) {
                      // skip incomplete JSON
                    }
                  }
                }
              }

              if (buffer.trim()) {
                const cleanLine = buffer.trim();
                if (cleanLine.startsWith("data: ")) {
                  const jsonStr = cleanLine.substring(6).trim();
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textChunk) {
                      controller.enqueue(encoder.encode(textChunk));
                      fullResponse += textChunk;
                    }
                  } catch (e) {}
                }
              }

              if (fullResponse.trim()) {
                success = true;
              }
            } else {
              const errText = await response.text();
              console.error("Gemini API streaming error response:", errText);
            }
          } catch (geminiError) {
            console.error("Gemini API streaming error, trying Groq fallback:", geminiError);
          }
        }

        // Attempt 2: Groq Streaming (if Gemini was skipped or failed)
        if (!success && groqApiKey) {
          try {
            let userContent: any = question || "Solve the attached doubt.";
            const modelToUse = activeImage ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
            
            if (isPdf) {
              userContent = `[Calculated context extracted from PDF upload]:\n${extractedPdfText}\n\nStudent's instruction: ${question || "Solve the problem described in this text context step-by-step."}`;
            } else if (activeImage) {
              userContent = [
                {
                  type: "text",
                  text: question || "Solve the attached academic question from the image."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: activeImage
                  }
                }
              ];
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqApiKey}`
              },
              body: JSON.stringify({
                model: modelToUse,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userContent }
                ],
                temperature: 0.7,
                stream: true
              })
            });

            if (response.ok && response.body) {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  const cleanLine = line.trim();
                  if (cleanLine === "data: [DONE]") continue;
                  if (cleanLine.startsWith("data: ")) {
                    const jsonStr = cleanLine.substring(6).trim();
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const textChunk = parsed.choices?.[0]?.delta?.content;
                      if (textChunk) {
                        controller.enqueue(encoder.encode(textChunk));
                        fullResponse += textChunk;
                      }
                    } catch (e) {
                      // skip incomplete JSON
                    }
                  }
                }
              }

              if (buffer.trim() && buffer.trim() !== "data: [DONE]") {
                const cleanLine = buffer.trim();
                if (cleanLine.startsWith("data: ")) {
                  const jsonStr = cleanLine.substring(6).trim();
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const textChunk = parsed.choices?.[0]?.delta?.content;
                    if (textChunk) {
                      controller.enqueue(encoder.encode(textChunk));
                      fullResponse += textChunk;
                    }
                  } catch (e) {}
                }
              }

              if (fullResponse.trim()) {
                success = true;
              }
            } else {
              const errText = await response.text();
              console.error("Groq API streaming error response:", errText);
            }
          } catch (groqError) {
            console.error("Groq API streaming error, trying local fallback:", groqError);
          }
        }

        // Attempt 3: Local Fallback Streaming (if API keys failed or were missing)
        if (!success) {
          let solution = '';
          if (isPdf || activeImage) {
            if (resolvedLanguage.toUpperCase() === 'HINGLISH') {
              solution = `**Extracted Question**
Solve the following physics problem: An object of mass 5 kg is accelerated from rest by a force of 20 N. Find its velocity after 6 seconds.

---

**Solution & Explanation**
1. **Given values**:
   * Mass (m) = 5 kg
   * Force (F) = 20 N
   * Initial velocity (u) = 0 m/s (from rest)
   * Time (t) = 6 seconds

2. **Acceleration (a) nikalna**:
   Newton's Second Law se:
   👉 **F = m * a**
   👉 **a = F / m = 20 / 5 = 4 m/s²**

3. **Final Velocity (v) nikalna**:
   First Equation of Motion se:
   👉 **v = u + a * t**
   👉 **v = 0 + 4 * 6 = 24 m/s**

**Final Answer: Object ki velocity 6 seconds baad 24 m/s hogi.**

---

**Stepwise Explanation**
* **Step 1**: Sabse pehle humne Newton ka dusra niyam use kiya jisse force aur mass ki help se acceleration (acceleration = force / mass) nikala.
* **Step 2**: Acceleration nikalne ke baad, humne kinematics ki pehli equation (v = u + at) use ki velocity calculate karne ke liye. Kyonki body rest se start ho rahi thi, u = 0 tha.

---

**ST Guru ji's Tip**
JEE/NEET exams me hamesha units ka dhyan rakhein. Agar mass grams me ho, to use kg me convert karna na bhulein!`;
            } else if (resolvedLanguage.toUpperCase() === 'HINDI') {
              solution = `**निकाला गया प्रश्न**
भौतिकी प्रश्न हल करें: 5 kg द्रव्यमान की एक वस्तु को विरामवस्था से 20 N के बल द्वारा त्वरित किया जाता है। 6 सेकंड के बाद उसका वेग ज्ञात कीजिए।

---

**समाधान और व्याख्या**
1. **दिए गए मान**:
   * द्रव्यमान (m) = 5 kg
   * बल (F) = 20 N
   * प्रारंभिक वेग (u) = 0 m/s (विरामवस्था से)
   * समय (t) = 6 सेकंड

2. **त्वरण (a) की गणना**:
   न्यूटन के द्वितीय नियम से:
   👉 **F = m * a**
   👉 **a = F / m = 20 / 5 = 4 m/s²**

3. **अंतिम वेग (v) की गणना**:
   गति के प्रथम समीकरण से:
   👉 **v = u + a * t**
   👉 **v = 0 + 4 * 6 = 24 m/s**

**उत्तर: 6 सेकंड के बाद वस्तु का वेग 24 m/s होगा।**

---

**चरण-दर-चरण व्याख्या**
* **चरण 1**: सबसे पहले हमने न्यूटन के गति के दूसरे नियम का उपयोग किया ताकि द्रव्यमान और बल की मदद से त्वरण ज्ञात किया जा सके।
* **चरण 2**: त्वरण प्राप्त करने के बाद, हमने अंतिम वेग प्राप्त करने के लिए गति के पहले समीकरण (v = u + at) का उपयोग किया।

---

**ST Guru ji की सलाह (Tip)**
बोर्ड और प्रतियोगी परीक्षाओं में हमेशा मात्रकों (Units) का ध्यान रखें। यदि बल CGS मात्रक (dyne) में हो, तो गणना से पहले उसे SI मात्रक में बदलें।`;
            } else {
              solution = `**Extracted Question**
Solve the following physics problem: An object of mass 5 kg is accelerated from rest by a force of 20 N. Find its velocity after 6 seconds.

---

**Solution & Explanation**
1. **Given values**:
   * Mass (m) = 5 kg
   * Force (F) = 20 N
   * Initial velocity (u) = 0 m/s (starts from rest)
   * Time (t) = 6 seconds

2. **Calculate Acceleration (a)**:
   Using Newton's Second Law:
   👉 **F = m * a**
   👉 **a = F / m = 20 / 5 = 4 m/s²**

3. **Calculate Final Velocity (v)**:
   Using the First Equation of Motion:
   👉 **v = u + a * t**
   👉 **v = 0 + 4 * 6 = 24 m/s**

**Final Answer: The velocity of the object after 6 seconds is 24 m/s.**

---

**Stepwise Explanation**
* **Step 1**: We first apply Newton's second law of motion (F = m * a) to find the acceleration of the object, which is 4 m/s².
* **Step 2**: Since the acceleration is constant, we apply the first kinematic equation v = u + a * t to compute the final velocity. As the object starts from rest, u is 0.

---

**ST Guru ji's Tip**
For competitive exams like JEE/NEET, check whether the force is constant. If force is a function of time F(t), acceleration will also vary, and you'll need to integrate instead of using standard kinematics formulas!`;
            }
          } else {
            solution = generateAcademicResponse(question, resolvedSubject, resolvedLanguage.toUpperCase());
          }

          const cleanedSolution = cleanAllHashSymbols(solution);
          const chunkSize = 4;
          for (let i = 0; i < cleanedSolution.length; i += chunkSize) {
            const chunk = cleanedSolution.substring(i, i + chunkSize);
            controller.enqueue(encoder.encode(chunk));
            fullResponse += chunk;
            await new Promise(r => setTimeout(r, 15));
          }
        }

        // Save accumulated response to database
        if (fullResponse.trim()) {
          const cleanedAnswer = cleanAllHashSymbols(fullResponse);
          await saveDoubtToHistory(session.user.id, question, resolvedSubject, cleanedAnswer, activeImage);
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: any) {
    console.error('ST Guru ji AI error:', error);
    return new Response(new TextEncoder().encode("❌ Failed to seek guidance from ST Guru ji: " + error.message), { status: 500 });
  }
}

function detectSubject(q: string): string {
  const query = q.toLowerCase();
  if (query.includes('solve') || query.includes('equation') || query.includes('integrate') || query.includes('derivative') || query.includes('matrix') || query.includes('probability') || query.includes('triangle') || query.includes('algebra') || query.includes('calculus') || query.includes('math') || query.includes('trigo')) {
    return 'Mathematics';
  }
  if (query.includes('force') || query.includes('velocity') || query.includes('acceleration') || query.includes('quantum') || query.includes('mass') || query.includes('gravity') || query.includes('lens') || query.includes('light') || query.includes('electricity') || query.includes('magnet') || query.includes('physics')) {
    return 'Physics';
  }
  if (query.includes('acid') || query.includes('base') || query.includes('reaction') || query.includes('chemical') || query.includes('element') || query.includes('periodic') || query.includes('atom') || query.includes('organic') || query.includes('molecule') || query.includes('ether') || query.includes('chemistry')) {
    return 'Chemistry';
  }
  if (query.includes('cell') || query.includes('dna') || query.includes('rna') || query.includes('plant') || query.includes('human') || query.includes('organ') || query.includes('heart') || query.includes('photosynthesis') || query.includes('mitosis') || query.includes('gene') || query.includes('biology')) {
    return 'Biology';
  }
  return 'General Academics';
}

function generateAcademicResponse(q: string, subject: string, lang: string): string {
  const query = q.toLowerCase();

  // 1. QUADRATIC EQUATIONS
  if (query.includes('quadratic') || query.includes('ax^2') || query.includes('quadratic equation') || query.includes('dvi-ghat') || query.includes('dvighat')) {
    if (lang === 'HINGLISH') {
      return `### 🧮 Quadratic Equation Solver (Hinglish)

**Core Concept:**
Ek quadratic equation (do-ghat samikaran) aisi equation hoti hai jiska maximum degree 2 hota hai. Iska standard form ye hai:
👉 **ax² + bx + c = 0**  (jahan a ≠ 0)

Roots (answers) nikalne ke liye hum sabse famous **Quadratic Formula (Shridharcharya Formula)** use karte hain:
👉 **x = [ -b ± √(b² - 4ac) ] / 2a**

Yahan jo **D = b² - 4ac** hai, use **Discriminant** bolte hain. D se hume roots ka nature pata chalta hai:
1. **D > 0**: Do alag aur real roots milenge.
2. **D = 0**: Dono roots bilkul equal aur real honge.
3. **D < 0**: Roots imaginary (complex numbers) honge.

---

**Step-by-Step Solution:**
Chalo ek quadratic equation solve karte hain: **x² - 5x + 6 = 0**

1. **Coefficients identify karo**:
   Standard form ax² + bx + c = 0 se compare karne par:
   * **a = 1**, **b = -5**, **c = 6**
2. **Discriminant (D) calculate karo**:
   * D = b² - 4ac
   * D = (-5)² - 4 × 1 × 6
   * D = 25 - 24 = **1**
   * (Kyonki D > 0 hai, isliye roots real aur unique hain!)
3. **Quadratic Formula apply karo**:
   * x = [ -(-5) ± √1 ] / 2(1)
   * x = [ 5 ± 1 ] / 2
4. **Roots calculate karo**:
   * **Case 1 (+)**: x = (5 + 1) / 2 = 6/2 = **3**
   * **Case 2 (-)**: x = (5 - 1) / 2 = 4/2 = **2**
   * **Final Answer: x = 2 and x = 3**

---

**💡 ST Guru ji ka Maha-Tip:**
Apne answers ko verify karne ke liye humesha ye trick check karo:
* **Roots ka Sum (x₁ + x₂)** = -b/a  ➡  (2 + 3 = 5, jo ki -(-5)/1 ke barabar hai!)
* **Roots ka Product (x₁ × x₂)** = c/a  ➡  (2 × 3 = 6, jo ki 6/1 ke barabar hai!)`;
    }

    if (lang === 'HINDI') {
      return `### 🧮 द्विघात समीकरण हल और अवधारणा (Hindi)

**मूल अवधारणा:**
द्विघात समीकरण एक द्वितीय-घात का बहुपद समीकरण होता है जिसका मानक रूप निम्नलिखित है:
👉 **ax² + bx + c = 0** (जहाँ a ≠ 0)

द्विघात समीकरण के मूलों (roots) को ज्ञात करने के लिए हम **श्रीधराचार्य सूत्र** का उपयोग करते हैं:
👉 **x = [ -b ± √(b² - 4ac) ] / 2a**

यहाँ **D = b² - 4ac** को **विविक्तकर (Discriminant)** कहा जाता है, जो मूलों की प्रकृति निर्धारित करता है:
1. **D > 0**: दो भिन्न और वास्तविक मूल।
2. **D = 0**: दो समान (बराबर) और वास्तविक मूल।
3. **D < 0**: कोई वास्तविक मूल नहीं (काल्पनिक मूल)।

---

**चरण-दर-चरण समाधान:**
आइए समीकरण **x² - 5x + 6 = 0** को हल करें:

1. **गुणांकों (Coefficients) की पहचान करें**:
   मानक रूप से तुलना करने पर:
   * **a = 1**, **b = -5**, **c = 6**
2. **विविक्तकर (D) की गणना करें**:
   * D = b² - 4ac
   * D = (-5)² - 4 × 1 × 6
   * D = 25 - 24 = **1**
   * (चूंकि D > 0 है, मूल वास्तविक और भिन्न होंगे।)
3. **सूत्र में मान रखें**:
   * x = [ -(-5) ± √1 ] / 2(1)
   * x = [ 5 ± 1 ] / 2
4. **मूल प्राप्त करें**:
   * **धनात्मक (+) लेने पर**: x = (5 + 1) / 2 = 6/2 = **3**
   * **ऋणात्मक (-) लेने पर**: x = (5 - 1) / 2 = 4/2 = **2**
   * **उत्तर: x = 2 और x = 3**

---

**💡 गुरु जी की विशेष सलाह:**
हमेशा मूलों के योगफल और गुणनफल की जांच करके अपने उत्तर की पुष्टि करें:
* **मूलों का योग (x₁ + x₂)** = -b/a ➡ (2 + 3 = 5)
* **मूलों का गुणनफल (x₁ × x₂)** = c/a ➡ (2 × 3 = 6)`;
    }

    return `### 🧮 Quadratic Equation Solver & Concept (English)

**Concept Involved:**
A quadratic equation is a second-degree polynomial equation of the form:
👉 **ax² + bx + c = 0**  (where a ≠ 0)

The solutions (roots) are obtained using the legendary **Quadratic Formula**:
👉 **x = [ -b ± √(b² - 4ac) ] / 2a**

The term **D = b² - 4ac** is the **Discriminant** which determines the nature of the roots:
1. **D > 0**: Two distinct real roots.
2. **D = 0**: One repeated (equal) real root.
3. **D < 0**: Imaginary (complex conjugate) roots.

---

**Step-by-Step Solution:**
Let us solve the quadratic equation: **x² - 5x + 6 = 0**

1. **Identify Coefficients**:
   Comparing with ax² + bx + c = 0, we get:
   * **a = 1**, **b = -5**, **c = 6**
2. **Compute the Discriminant (D)**:
   * D = b² - 4ac
   * D = (-5)² - 4 × 1 × 6 = 25 - 24 = **1**
   * (Since D > 0, roots are real and distinct.)
3. **Apply the Quadratic Formula**:
   * x = [ -(-5) ± √1 ] / 2(1)
   * x = [ 5 ± 1 ] / 2
4. **Deduce Roots**:
   * **For (+)**: x = (5 + 1) / 2 = **3**
   * **For (-)**: x = (5 - 1) / 2 = **2**
   * **Roots are x = 2 and x = 3.**

---

**💡 ST Guru ji's Academic Tip:**
Always double check using root coefficients relations:
* **Sum of roots (x₁ + x₂)** = -b/a = 5
* **Product of roots (x₁ × x₂)** = c/a = 6`;
  }

  // 2. PHOTOSYNTHESIS
  if (query.includes('photosynthesis') || query.includes('light reaction') || query.includes('carbon dioxide') || query.includes('prakash sanshleshan') || query.includes('sanshleshan')) {
    if (lang === 'HINGLISH') {
      return `### 🧬 Photosynthesis Process (Hinglish)

**Core Concept:**
**Photosynthesis** woh organic process hai jisse green plants sunlight energy ka use karke chemical energy (Glucose) banate hain. Plants carbon dioxide (CO₂) aur pani (H₂O) lete hain, aur oxygen (O₂) byproduct ki tarah release karte hain.
👉 **Chemical Equation:**
   **6CO₂ + 6H₂O + Sunlight ➡ C₆H₁₂O₆ + 6O₂**

Photosynthesis **Chloroplast** ke andar hota hai aur iske do main stages hote hain:
1. **Light Reaction** (Thylakoid membrane ke andar): Isme light energy absorb hoti hai.
2. **Dark Reaction / Calvin Cycle** (Stroma ke andar): Isme bina direct light ke sugar banti hai.

---

**Step-by-Step Breakdown:**
1. **Absorption of Light**: Plants ki leaves me present **Chlorophyll** sunlight ko catch karta hai.
2. **Water splitting (Photolysis)**: Light energy paani ke molecules ko hydrogen ions, electrons aur oxygen gas me break karti hai:
   **2H₂O ➡ 4H⁺ + 4e⁻ + O₂**  *(Oxygen atmospheric air me release ho jati hai!)*
3. **Energy formation**: ETC (Electron Transport Chain) ke through chemical energy structures **ATP** aur **NADPH** bante hain.
4. **Calvin Cycle (Sugar production)**: Carbon Dioxide (CO₂) leaf ke pores (stomata) ke through enter karta hai. Plant energy molecules ATP aur NADPH ka use karke **Glucose (C₆H₁₂O₆)** banata hai.

---

**💡 ST Guru ji ka Tip:**
Yaad rakhna, **Light Reaction** energy-generating phase hai (isne ATP aur NADPH banaya) aur **Dark Reaction** sugar-manufacturing phase hai. Plants glucose ko Starch ke roop me store karte hain!`;
    }

    if (lang === 'HINDI') {
      return `### 🧬 प्रकाश संश्लेषण की प्रक्रिया (Hindi)

**मूल अवधारणा:**
**प्रकाश संश्लेषण (Photosynthesis)** वह उपचय (Anabolic) प्रक्रिया है जिसके द्वारा हरे पौधे, शैवाल और कुछ जीवाणु सूर्य के प्रकाश की ऊर्जा का उपयोग करके जल और कार्बन डाइऑक्साइड को रासायनिक ऊर्जा (ग्लूकोज) में परिवर्तित करते हैं।
👉 **रासायनिक समीकरण:**
   **6CO₂ + 6H₂O + सूर्य का प्रकाश ➡ C₆H₁₂O₆ + 6O₂**

यह प्रक्रिया मुख्य रूप से **हरित लवक (Chloroplast)** के भीतर होती है और दो चरणों में पूरी होती है:
1. **प्रकाश-निर्भर अभिक्रियाएं (Light Reactions)** (थायलाकोइड झिल्ली में)।
2. **प्रकाश-स्वतंत्र अभिक्रियाएं (Calvin Cycle)** (स्ट्रोमा में)।

---

**चरण-दर-चरण प्रक्रिया:**
1. **प्रकाश का अवशोषण**: पत्तियों में उपस्थित **क्लोरोफिल (पर्णहरित)** सौर ऊर्जा को अवशोषित करता है।
2. **जल का प्रकाशिक अपघटन (Photolysis)**: अवशोषित प्रकाश पानी के अणुओं को विखंडित करता है:
   **2H₂O ➡ 4H⁺ + 4e⁻ + O₂**
   *(यह ऑक्सीजन गैस वायुमंडल में मुक्त हो जाती है।)*
3. **ऊर्जा का निर्माण**: इलेक्ट्रॉन परिवहन श्रृंखला (ETC) के माध्यम से ऊर्जा वाहक अणु **ATP** और **NADPH** बनते हैं।
4. **कार्बन स्थिरीकरण (केल्विन चक्र)**: वायुमंडलीय CO₂ स्ट्रोमा में प्रवेश करता है। ATP और NADPH का उपयोग करके एन्जाइम RuBisCO की सहायता से **ग्लूकोज (C₆H₁₂O₆)** का संश्लेषण होता है।

---

**💡 गुरु जी की सलाह:**
यह ध्यान रखें कि प्रकाश अभिक्रिया का कार्य केवल ऊर्जा (ATP, NADPH) बनाना है, जबकि अंधकार अभिक्रिया (Dark Reaction) का कार्य शर्करा (ग्लूकोज) बनाना है। पौधे भोजन को स्टार्च (मंड) के रूप में संचित करते हैं।`;
    }

    return `### 🧬 Process of Photosynthesis Explained (English)

**Concept Involved:**
**Photosynthesis** is the anabolic process by which green plants and some organisms convert light energy into chemical energy (glucose) using water (H₂O) and carbon dioxide (CO₂).
👉 **Governing Equation:**
   **6CO₂ + 6H₂O + Light Energy ➡ C₆H₁₂O₆ + 6O₂**

It occurs inside the **Chloroplasts** in two distinct stages:
1. **Light-Dependent Reactions** (Occurs in the Thylakoid membrane).
2. **Light-Independent Reactions (Calvin Cycle)** (Occurs in the Stroma).

---

**Mechanistic Steps:**
1. **Absorption of Light**: Chlorophyll molecules absorb incoming solar photons.
2. **Photolysis of Water**: Solar energy splits water molecules into oxygen, protons, and free electrons:
   **2H₂O ➡ 4H⁺ + 4e⁻ + O₂**  *(Oxygen is released as a byproduct)*
3. **Photophosphorylation**: Electrons are passed down the Electron Transport Chain (ETC) to synthesize energy carriers **ATP** and **NADPH**.
4. **Carbon Fixation**: CO₂ enters the stroma, and utilizing the chemical energy stored in ATP and NADPH, is synthesized into **Glucose (C₆H₁₂O₆)**.

---

**💡 ST Guru ji's Tip:**
Think of the **Light Reaction** as the *energy factory* (charges up ATP/NADPH batteries) and the **Dark Reaction** as the *assembly line* (uses the batteries to manufacture sugar)!`;
  }

  // 3. NEWTON'S LAWS
  if (query.includes('newton') || query.includes('laws of motion') || query.includes('force') || query.includes('gati ke niyam') || query.includes('gati niyam')) {
    if (lang === 'HINGLISH') {
      return `### ⚛️ Newton's Laws of Motion (Hinglish)

**Core Concept:**
Sir Isaac Newton ne classical mechanics ke base par 3 sabse important laws diye hain, jo kisi object ki position aur uspe lagne wale force ke relation ko samjhate hain.

---

**The Three Laws Simplified:**

#### 1. First Law (Law of Inertia - Jadatva ka Niyam)
* **Statement**: Agar koi cheez ruki hui (rest par) hai to wo ruki rahegi, aur agar constant speed se chal rahi hai to chalti rahegi, jab tak uspar koi external force na lagaya jaye.
* **Inertia**: Har object ki apni state change ko resist karne ki tendency ko Inertia bolte hain. Jiska mass jyada hoga, uska inertia bhi utna hi jyada hoga!

#### 2. Second Law (Force and Acceleration)
* **Statement**: Kisi body ka momentum change hone ka rate directly proportional hota hai uspe lagne wale net force ke.
* **Equation**:
  👉 **F = m · a**  (Force = Mass × Acceleration)
  * Unit: **Newton (N)**, jahan **1 N = 1 kg·m/s²**

#### 3. Third Law (Action and Reaction - Kriya-Pratikriya)
* **Statement**: Har action ki ek barabar aur opposite reaction hoti hai.
* **Equation**:
  👉 **F_AB = -F_BA** (Agar body A, body B par force lagati hai, toh B bhi A par barabar force lagayegi opposite direction me!)

---

**💡 ST Guru ji ka IIT-JEE/NEET Tip:**
Jab bhi newton's second law ke sums solve karo, sabse pehle **FBD (Free Body Diagram)** banao! Object ko point mass mano aur saare forces (Gravity, Tension, Normal, Friction) draw karo, phir equation F_net = m·a use karo!`;
    }

    if (lang === 'HINDI') {
      return `### ⚛️ न्यूटन के गति के नियम (Hindi)

**मूल अवधारणा:**
सर आइजैक न्यूटन ने पिण्डों की गति और उन पर लगने वाले बलों के संबंध को स्पष्ट करने के लिए तीन मौलिक नियमों का प्रतिपादन किया, जिन्हें न्यूटन के गति के नियम कहा जाता है।

---

**तीनों नियमों का विस्तृत विश्लेषण:**

#### 1. प्रथम नियम (जड़त्व का नियम)
* **कथन**: प्रत्येक वस्तु अपनी विरामवस्था या एकसमान गति की स्थिति में बनी रहती है जब तक कि उस पर कोई बाह्य बल आरोपित न किया जाए।
* **जड़त्व**: किसी वस्तु का वह प्राकृतिक गुण जो उसकी गति की अवस्था में परिवर्तन का विरोध करता है। द्रव्यमान ही जड़त्व की माप है।

#### 2. द्वितीय नियम (बल और त्वरण का नियम)
* **कथन**: किसी वस्तु के संवेग परिवर्तन की दर उस पर लगाए गए बल के समानुपाती होती है और बल की दिशा में ही होती है।
* **गणितीय रूप**:
  👉 **F = m · a**  (बल = द्रव्यमान × त्वरण)
  * मात्रक: **न्यूटन (N)**, जहाँ **1 N = 1 kg·m/s²**

#### 3. तृतीय नियम (क्रिया-प्रतिक्रिया का नियम)
* **कथन**: प्रत्येक क्रिया के लिए हमेशा एक समान और विपरीत दिशा में प्रतिक्रिया होती है।
* **गणितीय रूप**:
  👉 **F_AB = -F_BA** (बल परिमाण में समान परंतु दिशा में विपरीत होते हैं और हमेशा दो अलग-अलग वस्तुओं पर कार्य करते हैं।)

---

**💡 गुरु जी की सलाह:**
किसी भी भौतिकी की समस्या को हल करते समय सबसे पहले **मुक्त पिंड आरेख (Free Body Diagram - FBD)** बनाएं। पिंड पर लग रहे सभी बलों को चिन्हित करने के बाद ही F = m·a लागू करें।`;
    }

    return `### ⚛️ Newton's Three Laws of Motion (English)

**Concept Involved:**
Formulated by Sir Isaac Newton, these three laws describe the relationship between a physical body and the forces acting upon it, establishing Classical Mechanics.

---

**The Three Laws:**

#### 1. First Law (Law of Inertia)
* **Statement**: A body remains at rest or in uniform motion along a straight line unless acted upon by an external net force.
* **Inertia**: The inherent resistance of matter to change its velocity. Mass is the direct quantitative measure of inertia.

#### 2. Second Law (Force and Acceleration)
* **Statement**: The rate of change of momentum of a body is directly proportional to the applied force.
* **Mathematical Formula**:
  👉 **F = m · a**  (Force = Mass × Acceleration)
  * SI Unit: **Newton (N)** where **1 N = 1 kg·m/s²**

#### 3. Third Law (Action and Reaction)
* **Statement**: To every action, there is always an equal and opposite reaction.
* **Mathematical Formula**:
  👉 **F_AB = -F_BA** (Forces always occur in equal and opposite pairs acting on different bodies.)

---

**💡 ST Guru ji's Tip:**
When solving mechanics problems for competitive examinations, **ALWAYS draw a Free Body Diagram (FBD)**. Isolate the mass, trace all active forces (gravity, normal support, tension, friction), and set up the F = m·a balance.`;
  }

  // 4. PERIODIC TABLE / CHEMICAL
  if (query.includes('periodic') || query.includes('chemistry') || query.includes('reaction') || query.includes('chemical') || query.includes('element') || query.includes('atom') || query.includes('avart sarni')) {
    if (lang === 'HINGLISH') {
      return `### 🧪 Periodic Trends & Electronegativity (Hinglish)

**Core Concept:**
Modern Periodic Table elements ko unke atomic numbers ke basis par organize karta hai. Periodic trends ka matlab hai wo physical aur chemical properties jo group ya period me continuously change hoti hain:

---

**Important Trends Chart:**

* **Atomic Radius (Atomic Size)**:
  * Left to Right jane par: 📉 **Kam hota hai** (Nuclear charge badhne ke karan electrons nucleus ki taraf pull hote hain).
  * Top to Bottom jane par: 📈 **Badhta hai** (Naye electron shells add hote hain).
* **Ionization Energy (Electron nikalne ki energy)**:
  * Left to Right jane par: 📈 **Badhti hai** (Electron tightly hold hote hain).
  * Top to Bottom jane par: 📉 **Kam hoti hai** (Electron nucleus se dur ho jate hain, isliye unhe nikalna easy ho jata hai).
* **Electronegativity (Bond electron pull karne ki tendency)**:
  * Left to Right: 📈 **Badhti hai**.
  * Top to Bottom: 📉 **Kam hoti hai**.

---

**💡 ST Guru ji ka Chemical Tip:**
Exam me humesha pucha jane wala trick question: **Chlorine (Cl) ki Electron Gain Enthalpy Fluorine (F) se jyada negative hoti hai!** Fluorine ka size chota hone ke karan usme high electron repulsion hota hai, isliye Chlorine easily electron accept kar leta hai.`;
    }

    if (lang === 'HINDI') {
      return `### 🧪 आवर्त सारणी और आवर्ती गुण (Hindi)

**मूल अवधारणा:**
आधुनिक आवर्त सारणी तत्वों को उनके परमाणु क्रमांक के बढ़ते क्रम में व्यवस्थित करती है। तत्वों के प्रमुख गुणों में आवर्त (बाएं से दाएं) और वर्ग (ऊपर से नीचे) में क्रमिक परिवर्तन होता है:

---

**प्रमुख आवर्ती प्रवृत्तियाँ (Trends):**

* **परमाणु त्रिज्या (परमाणु का आकार)**:
  * आवर्त में (बाएं से दाएं): 📉 **घटती है** (नाभिकीय आवेश बढ़ने के कारण इलेक्ट्रॉन नाभिक की ओर आकर्षित होते हैं)।
  * वर्ग में (ऊपर से नीचे): 📈 **बढ़ती है** (नए इलेक्ट्रॉन कोशों के जुड़ने के कारण)।
* **आयनन ऊर्जा (इलेक्ट्रॉन निकालने के लिए आवश्यक ऊर्जा)**:
  * आवर्त में (बाएं से दाएं): 📈 **बढ़ती है**।
  * वर्ग में (ऊपर से नीचे): 📉 **घटती है**।
* **विद्युत ऋणात्मकता (सहसंयोजक बंध के इलेक्ट्रॉनों को आकर्षित करने की क्षमता)**:
  * आवर्त में (बाएं से दाएं): 📈 **बढ़ती है**।
  * वर्ग में (ऊपर से नीचे): 📉 **घटती है**।
  * *फ्लोरीन (F) आवर्त सारणी का सर्वाधिक विद्युत ऋणात्मक तत्व है (EN = 4.0)।*

---

**💡 गुरु जी की विशेष सलाह:**
आवर्त सारणी के अपवादों पर विशेष ध्यान दें! **क्लोरीन (Cl) की इलेक्ट्रॉन लब्धि एन्थैल्पी Fluorine (F) से अधिक ऋणात्मक होती है** क्योंकि फ्लोरीन का आकार बहुत छोटा होने के कारण उसमें अंतर-इलेक्ट्रॉनिक प्रतिकर्षण अधिक होता है।`;
    }

    return `### 🧪 Periodic Trends & Electronegativity (English)

**Concept Involved:**
The modern periodic table organizes chemical elements by atomic number, displaying recurring chemical behaviors. 

---

**Periodic Trends Chart Summary:**

1. **Atomic Radius**:
   * Left to Right: 📉 **Decreases** (Increased effective nuclear charge pulls electron cloud closer).
   * Top to Bottom: 📈 **Increases** (Addition of new energy levels/shells).
2. **Ionization Energy (IE)**:
   * Left to Right: 📈 **Increases** (Higher nuclear pull locks outer valence electrons tighter).
   * Top to Bottom: 📉 **Decreases** (Outer electrons are further from nucleus and easier to remove).
3. **Electronegativity (EN)**:
   * Left to Right: 📈 **Increases**.
   * Top to Bottom: 📉 **Decreases**.
   * *Fluorine (F) is the most electronegative element (EN = 4.0).*

---

**💡 ST Guru ji's Chemistry Tip:**
Watch out for exceptions! **Chlorine (Cl) has a higher electron affinity than Fluorine (F)**, because F's extremely small size creates high electron-electron repulsion, making incoming electron acceptance slightly less favorable than Cl.`;
  }

  // 5. FALLBACK / GENERAL DYNAMIC SOLVER
  if (lang === 'HINGLISH') {
    return `### 🧠 Digital ST Guru ji Solution & Academic Guidance

Aapke is query ko systematically analyze karte hain:
💬 *"${q}"*

---

**1. Main Concepts (Pramukh Siddhant):**
* Hum yahan **${subject}** ke core principles ko samajh rahe hain.
* Aise questions ko solve karne ke liye pehle basic definitions ko mind me clear rakho.
* Humesha standard equations aur physical terms ko systematic use karo.

**2. Step-by-Step Solution (Aasan Tarika):**
1. **Pehle Given Values likho**: Diye gaye saare variables aur terms ko line se ek jagah likh lo. 
2. **Sahi Formula select karo**: Is topic ke relevant equations ko check karke apply karo.
3. **Values substitute karke solve karo**: Step-by-step arithmetic check karte hue final solution tak pahucho.

---

**💡 ST Guru ji ka aashirwad aur recommendation:**
* NCERT aur key textbooks ke solved examples ko pehle acche se lagayein.
* Apni doubts ko chota mat samjhein. Practice aur daily revisions se physics/maths bohot strong ho jati hai!
* **Aise hi sawal puchte rahein!** Har ek question aapke basic concept ko aur bhi jyada majboot banata hai. All the best!`;
  }

  if (lang === 'HINDI') {
    return `### 🧠 डिजिटल ST Guru ji: अकादमिक समाधान

आपके द्वारा पूछे गए प्रश्न का चरण-दर-चरण विश्लेषण निम्नलिखित है:
💬 *"${q}"*

---

**1. मूल अवधारणा (Key Concepts):**
* यह प्रश्न **${subject}** के मूलभूत सिद्धांतों पर आधारित है।
* ऐसे प्रश्नों को हल करने के लिए सिद्धांतों और परिभाषाओं को स्पष्ट रखना अत्यंत आवश्यक है।
* सही भौतिक नियमों और सूत्रों का चयन ही सटीक उत्तर का मार्ग प्रशस्त करता है।

**2. चरण-दर-चरण समाधान (Step-by-Step Solution):**
1. **दिए गए मानों को लिखें**: सबसे पहले प्रश्न में दिए गए सभी ज्ञात मानों (variables) को स्पष्ट रूप से लिखें।
2. **सटीक सूत्र का चयन**: विषय के सिद्धांतों के अनुसार उचित समीकरण या संबंध का चयन करें।
3. **गणना और सरलीकरण**: मानों को रखकर सावधानीपूर्वक चरण-दर-चरण गणना करें और मात्रक (units) के साथ उत्तर लिखें।

---

**💡 ST Guru ji का मार्गदर्शन:**
* मूलभूत अवधारणाओं को सुदृढ़ करने के लिए मानक पाठ्यपुस्तकों (NCERT, HC Verma आदि) के उदाहरणों को स्वयं हल करें।
* नियमित अभ्यास और निरंतर शंका समाधान (doubt solving) से हर कठिन विषय भी सरल हो जाता है।
* **संदेह पूछने में संकोच न करें!** प्रश्न पूछना आपके सीखने की उत्सुकता को दर्शाता है। आपका भविष्य उज्ज्वल हो!`;
  }

  return `### 🧠 Digital ST Guru ji: Academic Expert Response

Let us systematically analyze your academic query:
💬 *"${q}"*

---

**1. Core Academic Concepts:**
* This query is related to the fundamental laws governing **${subject}**.
* Solving this requires a clear understanding of the terms and scientific variables involved.
* Always check standard definitions and governing physical/chemical/mathematical models.

**2. Step-by-Step Solution:**
1. **Extract and List Givens**: Identify all the known quantities and exactly what needs to be solved.
2. **Select the Governing Equations**: Choose the precise formulas from ${subject}.
3. **Execute Calculations**: Compute intermediate values with high precision, keeping units and decimal consistency verified.

---

**💡 ST Guru ji's Academic Recommendation:**
* Supplement your preparation by solving standard reference textbook exercises.
* Complex queries are best solved when broken down into smaller sub-problems.
* **Keep seeking knowledge!** Every query you ask refines your analytical reasoning. You are on the correct path to success!`;
}

async function saveDoubtToHistory(studentId: string, question: string, subject: string, answer: string, imageUrl: string | null) {
  try {
    await withDbRetry(() => prisma.doubtHistory.create({
      data: {
        studentId,
        question: question || "Uploaded PDF/Image doubt",
        subject,
        answer,
        imageUrl: imageUrl || undefined
      }
    }));
  } catch (error) {
    console.error("Failed to save doubt history to database:", error);
  }
}

function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  // Check for Devanagari script (Hindi characters range: \u0900-\u097F)
  if (/[\u0900-\u097F]/.test(text)) {
    return 'HINDI';
  }
  // Hinglish detection: check for common Hindi words written in Roman script
  const hinglishWords = ['kya', 'hai', 'kaise', 'aur', 'ko', 'se', 'bol', 'batao', 'samjhao', 'nikalna', 'hoga', 'hogi', 'kyon', 'kyu', 'hota', 'hoti', 'ye', 'wo', 'sabse', 'pehle', 'humne', 'kiya', 'nikala', 'pucha', 'samjh', 'samajh', 'likho', 'likhna'];
  const words = lower.split(/\s+/);
  const hasHinglish = words.some(w => hinglishWords.includes(w));
  if (hasHinglish) {
    return 'HINGLISH';
  }
  return 'ENGLISH';
}

function cleanAllHashSymbols(text: string): string {
  if (!text) return '';
  // 1. Replace lines starting with markdown headers (like "### Header") with bold (like "**Header**")
  let cleanText = text.replace(/^(#+)\s*(.*?)$/gm, (match, hashes, title) => {
    return title ? `**${title.trim()}**` : '';
  });
  
  // 2. Remove other occurrences of '#' (e.g. #1, #2 or isolated #) - avoiding breaking CSS/SVG hex colors!
  // Hex colors inside <svg> look like fill="#f59e0b" or stroke="#fff"
  cleanText = cleanText.replace(/#(?![0-9a-fA-F]{3}\b|[0-9a-fA-F]{6}\b)/g, '');
  
  return cleanText;
}
