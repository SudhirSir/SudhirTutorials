import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !['STUDENT', 'TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, language } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text content is required for speech synthesis' }, { status: 400 });
    }

    // Convert academic markdown/code into natural spoken script for TTS
    const cleanSpeechText = prepareTextForSpeech(text, language);

    let elevenLabsApiKey = process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.trim().replace(/^["']|["']$/g, '') : undefined;
    let elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID ? process.env.ELEVENLABS_VOICE_ID.trim().replace(/^["']|["']$/g, '') : undefined;
    let openAiApiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim().replace(/^["']|["']$/g, '') : undefined;

    // 1. Attempt ElevenLabs Voice Synthesis (Custom Voice Model for Sudhir Sir)
    if (elevenLabsApiKey && elevenLabsVoiceId) {
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey
          },
          body: JSON.stringify({
            text: cleanSpeechText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        });

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'no-cache'
            }
          });
        } else {
          console.error("ElevenLabs TTS error:", await response.text());
        }
      } catch (e) {
        console.error("ElevenLabs TTS fetch error:", e);
      }
    }

    // 2. Attempt OpenAI Audio TTS Fallback
    if (openAiApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: cleanSpeechText,
            voice: 'onyx', // Male authoritative & warm teacher tone
            speed: 1.0
          })
        });

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'no-cache'
            }
          });
        } else {
          console.error("OpenAI Audio TTS error:", await response.text());
        }
      } catch (e) {
        console.error("OpenAI Audio TTS fetch error:", e);
      }
    }

    // 3. Universal Audio Stream Fallback (Guarantees audio/mpeg response for all Mobile Apps, WebViews, Android & iOS)
    const freeAudioBuffer = await generateFreeTtsAudioStream(cleanSpeechText, language);
    if (freeAudioBuffer && freeAudioBuffer.length > 0) {
      return new Response(new Uint8Array(freeAudioBuffer), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // 4. Client Web Speech Fallback as absolute last resort
    return NextResponse.json({
      success: true,
      fallback: true,
      cleanText: cleanSpeechText
    });
  } catch (error: any) {
    console.error("Guruji TTS route error:", error);
    return NextResponse.json({ error: "Failed to generate voice audio: " + error.message }, { status: 500 });
  }
}

async function generateFreeTtsAudioStream(text: string, language?: string): Promise<Buffer | null> {
  try {
    const normLang = (language || 'HINGLISH').toUpperCase();
    let tl = 'hi';
    if (normLang === 'ENGLISH') tl = 'en';
    else if (normLang === 'PUNJABI') tl = 'pa';

    // Split text into ~160 character chunks
    const chunks: string[] = [];
    let current = '';
    const sentences = text.split(/(?<=[.?!,;।\n])\s+/);

    for (const sentence of sentences) {
      if ((current + ' ' + sentence).length > 160) {
        if (current.trim()) chunks.push(current.trim());
        current = sentence;
      } else {
        current += (current ? ' ' : '') + sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    if (chunks.length === 0) return null;

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks.slice(0, 10)) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${tl}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        audioBuffers.push(Buffer.from(ab));
      }
    }

    if (audioBuffers.length > 0) {
      return Buffer.concat(audioBuffers);
    }
  } catch (err) {
    console.error("Free TTS stream generation error:", err);
  }
  return null;
}

function prepareTextForSpeech(markdown: string, language?: string): string {
  if (!markdown) return '';

  let spoken = markdown;
  const isEnglish = (language || '').toUpperCase() === 'ENGLISH';

  // Remove SVG diagrams completely from spoken audio
  spoken = spoken.replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // Remove code blocks
  spoken = spoken.replace(/```[\s\S]*?```/g, '');

  // Convert math superscripts and subscripts to natural spoken words
  spoken = spoken
    .replace(/²/g, ' squared ')
    .replace(/³/g, ' cubed ')
    .replace(/ⁿ/g, ' to the power n ')
    .replace(/⁺/g, ' positive ')
    .replace(/⁻/g, ' minus ')
    .replace(/°/g, ' degree ')
    .replace(/Δ/g, ' Delta ')
    .replace(/√\((.*?)\)/g, ' square root of $1 ')
    .replace(/√([a-zA-Z0-9]+)/g, ' square root of $1 ')
    .replace(/±/g, ' plus or minus ')
    .replace(/×/g, ' multiplied by ')
    .replace(/÷/g, ' divided by ')
    .replace(/=/g, isEnglish ? ' equals ' : ' barabar ')
    .replace(/≠/g, ' is not equal to ')
    .replace(/≈/g, ' is approximately equal to ');

  // Remove markdown headers, bold, italics, bullets, links, emojis
  spoken = spoken
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}/g, '')
    .replace(/_{1,3}/g, '')
    .replace(/`{1,3}/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  // Apply Hinglish to Devanagari phonetic mapping ONLY for Hindi/Hinglish
  if (!isEnglish) {
    spoken = phoneticHinglishToHindi(spoken);
  }

  // Normalize excessive spacing and line breaks
  spoken = spoken.replace(/\s+/g, ' ').trim();

  // Limit speech duration length for smooth playback performance
  if (spoken.length > 1500) {
    spoken = spoken.substring(0, 1500) + (isEnglish ? "... Please read the remaining details in written solution." : "... Iske aage ka detail aap written solution mein padh sakte hain.");
  }

  return spoken;
}

function phoneticHinglishToHindi(text: string): string {
  if (!text) return '';
  let clean = text;

  const map: [RegExp, string][] = [
    [/\blambai\b|\blambaii\b/gi, "लंबाई"],
    [/\bchaudai\b|\bchoudai\b/gi, "चौड़ाई"],
    [/\bunchai\b|\bunchaee\b/gi, "ऊंचाई"],
    [/\bkshetrafal\b|\bareya\b/gi, "क्षेत्रफल"],
    [/\bsamajh\b/gi, "समझ"],
    [/\bsamajhte\b/gi, "समझते"],
    [/\bsamajhao\b/gi, "समझाओ"],
    [/\bsawal\b|\bsawalos\b/gi, "सवाल"],
    [/\bsamikaran\b/gi, "समीकरण"],
    [/\bgati\b/gi, "गति"],
    [/\bbal\b/gi, "बल"],
    [/\bdravyamān\b|\bdravyaman\b/gi, "द्रव्यमान"],
    [/\btvaran\b/gi, "त्वरण"],
    [/\baasan\b/gi, "आसान"],
    [/\bsuno\b/gi, "सुनो"],
    [/\bbeta\b/gi, "बेटा"],
    [/\bpehle\b/gi, "पहले"],
    [/\bphir\b/gi, "फिर"],
    [/\bkaro\b/gi, "करो"],
    [/\bkaran\b/gi, "कारण"],
    [/\bdhyan\b/gi, "ध्यान"],
    [/\bprakash\b/gi, "प्रकाश"],
    [/\bnikalna\b|\bnikalo\b/gi, "निकालो"],
    [/\bbarabar\b/gi, "बराबर"],
    [/\bparinam\b/gi, "परिणाम"],
    [/\bsootrad\b|\bsootra\b|\bsutra\b/gi, "सूत्र"],
    [/\bgyat\b/gi, "ज्ञात"],
    [/\bkaise\b/gi, "कैसे"],
    [/\bhoga\b/gi, "होगा"],
    [/\bhogi\b/gi, "होगी"],
    [/\bhain\b/gi, "हैं"],
    [/\bhai\b/gi, "है"]
  ];

  for (const [regex, val] of map) {
    clean = clean.replace(regex, val);
  }

  return clean;
}
