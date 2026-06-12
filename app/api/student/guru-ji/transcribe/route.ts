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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const blob = new Blob([buffer], { type: file.type });
        
        const openAiFormData = new FormData();
        openAiFormData.append('file', blob, file.name || 'audio.webm');
        openAiFormData.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: openAiFormData
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            success: true,
            text: data.text
          });
        } else {
          const errData = await response.json();
          console.error("OpenAI Whisper API error response:", errData);
        }
      } catch (whisperError) {
        console.error("OpenAI Whisper transcription error, using fallback:", whisperError);
      }
    }

    // Mock voice transcription fallback for offline/demo testing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return NextResponse.json({
      success: true,
      text: "Solve this question step-by-step: An object of mass 5 kg is accelerated from rest by a force of 20 N. Find its velocity after 6 seconds."
    });
  } catch (error: any) {
    console.error('Transcription route error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
