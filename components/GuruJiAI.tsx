"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

function TypewriterText({ text, speed = 8, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let active = true;
    const tokens = text.split(/(<[^>]*>)/g).filter(Boolean);
    let currentText = '';
    let tokenIndex = 0;
    let charIndex = 0;
    let timeoutId: any;

    const type = () => {
      if (!active) return;
      if (tokenIndex >= tokens.length) {
        if (onComplete) onComplete();
        return;
      }

      const activeToken = tokens[tokenIndex];
      if (activeToken.startsWith('<') && activeToken.endsWith('>')) {
        currentText += activeToken;
        setDisplayedText(currentText);
        tokenIndex++;
        charIndex = 0;
        type();
      } else {
        if (charIndex < activeToken.length) {
          currentText += activeToken[charIndex];
          setDisplayedText(currentText);
          charIndex++;
          timeoutId = setTimeout(type, speed);
        } else {
          tokenIndex++;
          charIndex = 0;
          type();
        }
      }
    };

    type();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [text, speed]);

  return <span dangerouslySetInnerHTML={{ __html: displayedText }} />;
}

interface GuruJiAIProps {
  userName?: string;
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export function GuruJiAI({ userName, role = 'STUDENT' }: GuruJiAIProps) {
  const { data: session } = useSession();
  const displayName = userName || session?.user?.name || (role === 'TEACHER' ? 'Teacher' : role === 'ADMIN' ? 'Admin' : 'Student');

  // Digital Guru Ji AI states
  const [guruQuestion, setGuruQuestion] = useState('');
  const [guruSubject, setGuruSubject] = useState('Mathematics');
  const [guruLanguage, setGuruLanguage] = useState<'HINGLISH' | 'HINDI' | 'ENGLISH' | 'PUNJABI'>('HINGLISH');
  const [guruHistory, setGuruHistory] = useState<Array<{ role: 'user' | 'guru', content: string, subject?: string, file?: string, fileName?: string, image?: string, revealedSteps?: number, isNew?: boolean }>>([]);
  const [guruFile, setGuruFile] = useState<string | null>(null);
  const [guruFileName, setGuruFileName] = useState<string>('');
  const [dbHistoryList, setDbHistoryList] = useState<any[]>([]);
  const [showGuruHistoryPanel, setShowGuruHistoryPanel] = useState(false);
  const [guruLoading, setGuruLoading] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<any | null>(null);
  const [audioChunks, setAudioChunks] = useState<any[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Voice Synthesis & Audio Explanation states
  const [guruMode, setGuruMode] = useState<'CHAT' | 'VOICE'>('VOICE');
  const [showGuruMenu, setShowGuruMenu] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [playingAudioIndex, setPlayingAudioIndex] = useState<number | null>(null);
  const [audioLoadingIndex, setAudioLoadingIndex] = useState<number | null>(null);
  const [activeSpeakingText, setActiveSpeakingText] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<any>(null);

  // Persist active ST Guru Ji chat so tab switching never clears history
  useEffect(() => {
    try {
      const saved = localStorage.getItem('st_guruji_active_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGuruHistory(parsed);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (guruHistory.length > 0) {
      try {
        localStorage.setItem('st_guruji_active_history', JSON.stringify(guruHistory.slice(-40)));
      } catch (e) {}
    }
  }, [guruHistory]);

  const clearActiveGuruChat = () => {
    stopAudio();
    setGuruHistory([]);
    try {
      localStorage.removeItem('st_guruji_active_history');
    } catch (e) {}
  };

  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingAudioIndex(null);
    setAudioLoadingIndex(null);
    setActiveSpeakingText(null);
  };

  const playVoiceExplanation = async (index: number, text: string) => {
    if (!text || !text.trim()) return;

    if (playingAudioIndex === index) {
      stopAudio();
      return;
    }

    stopAudio();
    setAudioLoadingIndex(index);

    try {
      const res = await fetch('/api/student/guru-ji/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: guruLanguage })
      });

      if (res.ok) {
        const contentType = res.headers.get('Content-Type') || '';
        if (contentType.includes('audio/mpeg')) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.playbackRate = audioSpeed;
          currentAudioRef.current = audio;

          audio.onplay = () => {
            setAudioLoadingIndex(null);
            setPlayingAudioIndex(index);
          };
          audio.onended = () => {
            setPlayingAudioIndex(null);
            currentAudioRef.current = null;
          };
          audio.onerror = () => {
            fallbackWebSpeech(index, text);
          };
          await audio.play();
          return;
        } else {
          const data = await res.json();
          fallbackWebSpeech(index, data.cleanText || text);
          return;
        }
      } else {
        fallbackWebSpeech(index, text);
      }
    } catch (e) {
      console.error("TTS fetch error, using Web Speech fallback:", e);
      fallbackWebSpeech(index, text);
    }
  };

  const getBestVoiceForLanguage = (targetLang: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    let voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      window.speechSynthesis.getVoices();
      voices = window.speechSynthesis.getVoices();
    }
    if (!voices || voices.length === 0) return null;

    const normalizedLang = (targetLang || 'HINGLISH').toUpperCase();

    if (normalizedLang === 'ENGLISH') {
      let v = voices.find(voice => voice.lang && (voice.lang.includes('en-IN') || voice.lang.includes('en_IN')) && (
        voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('prabhat') || voice.name.toLowerCase().includes('ravi')
      ));
      if (!v) v = voices.find(voice => voice.lang && (voice.lang.includes('en-IN') || voice.lang.includes('en_IN')));
      if (!v) v = voices.find(voice => voice.lang && voice.lang.startsWith('en') && (
        voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('david') || voice.name.toLowerCase().includes('google')
      ));
      if (!v) v = voices.find(voice => voice.lang && voice.lang.startsWith('en'));
      return v || voices[0] || null;
    }

    if (normalizedLang === 'PUNJABI') {
      let v = voices.find(voice => voice.lang && (voice.lang.includes('pa-IN') || voice.lang.includes('pa_IN') || voice.lang.includes('pa-PK') || voice.name.toLowerCase().includes('punjabi')));
      if (!v) v = voices.find(voice => voice.lang && (voice.lang.includes('hi-IN') || voice.lang.includes('hi_IN')));
      return v || voices[0] || null;
    }

    // HINDI or HINGLISH:
    let v = voices.find(voice => voice.lang && (voice.lang.includes('hi-IN') || voice.lang.includes('hi_IN') || voice.lang.startsWith('hi')) && (
      voice.name.toLowerCase().includes('male') || 
      voice.name.toLowerCase().includes('hemant') || 
      voice.name.toLowerCase().includes('ravi') || 
      voice.name.toLowerCase().includes('madhav')
    ));

    if (!v) v = voices.find(voice => voice.lang && (voice.lang.includes('hi-IN') || voice.lang.includes('hi_IN') || voice.lang.startsWith('hi')));
    if (!v) v = voices.find(voice => voice.lang && (voice.lang.includes('en-IN') || voice.lang.includes('en_IN') || voice.name.toLowerCase().includes('india')));

    return v || voices[0] || null;
  };

  const adaptGrammarForVoiceGender = (text: string, voice: SpeechSynthesisVoice | null) => {
    if (!text || !voice) return text;

    const isFemaleVoice = voice.name.toLowerCase().includes('female') ||
                          voice.name.toLowerCase().includes('swara') ||
                          voice.name.toLowerCase().includes('kalpana') ||
                          voice.name.toLowerCase().includes('zira') ||
                          voice.name.toLowerCase().includes('heera') ||
                          voice.name.toLowerCase().includes('veena') ||
                          voice.name.toLowerCase().includes('siri') ||
                          voice.name.toLowerCase().includes('samantha') ||
                          voice.name.toLowerCase().includes('victoria');

    if (isFemaleVoice) {
      return text
        .replace(/\bsamjhata\b/gi, 'samjhati')
        .replace(/\bbolta\b/gi, 'bolti')
        .replace(/\bbatata\b/gi, 'batati')
        .replace(/\bkarta\b/gi, 'karti')
        .replace(/\bsakta\b/gi, 'sakti')
        .replace(/\braha\b/gi, 'rahi')
        .replace(/\bgyata\b/gi, 'gyati')
        .replace(/\bsamjhayega\b/gi, 'samjhayegi')
        .replace(/\bkarunga\b/gi, 'karungi')
        .replace(/\bकरता\b/g, 'करती')
        .replace(/\bसकता\b/g, 'सकती')
        .replace(/\bबताता\b/g, 'बताती')
        .replace(/\bसमझता\b/g, 'समझती')
        .replace(/\bरहा\b/g, 'रही');
    }

    return text;
  };

  const phoneticHinglishToHindi = (text: string) => {
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
  };

  const speakSentenceRealtime = (sentenceText: string, messageIndex: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const currentLang = (guruLanguage || 'HINGLISH').toUpperCase();
    const isEnglish = currentLang === 'ENGLISH';

    let cleanText = sentenceText
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_#`]/g, '')
      .replace(/²/g, ' squared ')
      .replace(/³/g, ' cubed ')
      .replace(/\+/g, ' plus ')
      .replace(/=/g, isEnglish ? ' equals ' : ' barabar ')
      .trim();

    const highlightText = cleanText;
    const selectedVoice = getBestVoiceForLanguage(currentLang);

    if (currentLang === 'HINDI' || currentLang === 'HINGLISH') {
      cleanText = adaptGrammarForVoiceGender(cleanText, selectedVoice);
      cleanText = phoneticHinglishToHindi(cleanText);
    } else if (currentLang === 'PUNJABI') {
      cleanText = adaptGrammarForVoiceGender(cleanText, selectedVoice);
    }

    if (!cleanText || cleanText.length < 2) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = audioSpeed * 1.02;

    const isFemaleVoice = selectedVoice && (
      selectedVoice.name.toLowerCase().includes('female') ||
      selectedVoice.name.toLowerCase().includes('swara') ||
      selectedVoice.name.toLowerCase().includes('kalpana') ||
      selectedVoice.name.toLowerCase().includes('zira') ||
      selectedVoice.name.toLowerCase().includes('heera') ||
      selectedVoice.name.toLowerCase().includes('veena')
    );
    utterance.pitch = isFemaleVoice ? 1.05 : 0.95;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      if (selectedVoice.lang) utterance.lang = selectedVoice.lang;
    } else {
      if (currentLang === 'ENGLISH') utterance.lang = 'en-IN';
      else if (currentLang === 'PUNJABI') utterance.lang = 'pa-IN';
      else utterance.lang = 'hi-IN';
    }

    utterance.onstart = () => {
      setAudioLoadingIndex(null);
      setPlayingAudioIndex(messageIndex);
      setActiveSpeakingText(highlightText);
    };
    utterance.onend = () => {
      if (!window.speechSynthesis.pending && !window.speechSynthesis.speaking) {
        setPlayingAudioIndex(null);
        setActiveSpeakingText(null);
      }
    };
    utterance.onerror = () => {
      if (!window.speechSynthesis.pending && !window.speechSynthesis.speaking) {
        setPlayingAudioIndex(null);
        setActiveSpeakingText(null);
      }
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const fallbackWebSpeech = (index: number, textToSpeak: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setAudioLoadingIndex(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      speakSentenceRealtime(textToSpeak, index);
    } catch (e) {
      console.warn("Speech synthesis fallback failed silently:", e);
      setAudioLoadingIndex(null);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const handleGuruFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      return;
    }

    setGuruFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setGuruFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: any[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please check permission settings.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_query.webm');
      
      const res = await fetch('/api/student/guru-ji/transcribe', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGuruQuestion(data.text);
      } else {
        alert("Transcription failed. Please try again or type your doubt.");
      }
    } catch (err) {
      console.error("Transcription query error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const renderSimpleLines = (text: string, baseKey: any, animate: boolean = false, messageIndex: number = 0) => {
    return text.split('\n').map((line, idx) => {
      let lineText = line.trim();
      if (!lineText) return <div key={`${baseKey}_${idx}`} style={{ height: '0.3rem' }} />;
      
      const cleanPlainLine = lineText
        .replace(/<[^>]*>/g, '')
        .replace(/[*_#`]/g, '')
        .trim();

      const isSpeakingThisLine = activeSpeakingText && playingAudioIndex === messageIndex && cleanPlainLine.length > 3 && (
        activeSpeakingText.toLowerCase().includes(cleanPlainLine.toLowerCase().substring(0, 12)) ||
        cleanPlainLine.toLowerCase().includes(activeSpeakingText.toLowerCase().substring(0, 12))
      );

      // Markdown Images: ![alt](url)
      lineText = lineText.replace(/!\[(.*?)\]\((.*?)\)/gi, '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px; margin: 0.5rem 0; display:block; box-shadow:var(--shadow-sm);" />');
      // Markdown Links: [label](url)
      lineText = lineText.replace(/\[(.*?)\]\((.*?)\)/gi, '<a href="$2" target="_blank" rel="noreferrer" style="color:var(--primary);text-decoration:underline;font-weight:600;">$1</a>');
      // Bold formatting
      lineText = lineText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code formatting
      lineText = lineText.replace(/`(.*?)`/g, '<code style="background:var(--surface-light);padding:2px 6px;border-radius:4px;font-family:monospace;color:var(--primary);font-weight:600;">$1</code>');

      const activeStyle = isSpeakingThisLine ? {
        background: 'rgba(245, 158, 11, 0.15)',
        borderLeft: '4px solid #f59e0b',
        padding: '0.35rem 0.65rem',
        borderRadius: '8px',
        margin: '0.3rem 0',
        boxShadow: '0 0 10px rgba(245, 158, 11, 0.25)',
        transition: 'all 0.25s ease-in-out'
      } : {};

      // Strip out markdown headings and format as bold header divs
      if (lineText.startsWith('#')) {
        const cleanHeading = lineText.replace(/^#+\s*/, '');
        const finalHeading = cleanHeading.replace(/#(?![0-9a-fA-F]{3}\b|[0-9a-fA-F]{6}\b)/g, '');
        return (
          <div key={`${baseKey}_${idx}`} style={{ fontWeight: 800, fontSize: '1.02rem', color: '#f59e0b', margin: '0.6rem 0 0.3rem 0', ...activeStyle }}>
            {isSpeakingThisLine && (
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                👉 🔊 [Explaining this part...]
              </span>
            )}
            {animate ? <TypewriterText text={finalHeading} /> : <span dangerouslySetInnerHTML={{ __html: finalHeading }} />}
          </div>
        );
      }

      // Clean other isolated hash symbols
      lineText = lineText.replace(/#(?![0-9a-fA-F]{3}\b|[0-9a-fA-F]{6}\b)/g, '');

      if (lineText.startsWith('👉 ')) {
        return (
          <div key={`${baseKey}_${idx}`} style={{ background: isSpeakingThisLine ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.06)', padding: '0.4rem 0.6rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b', margin: '0.35rem 0', fontWeight: 700, color: 'var(--text)', fontSize: 'inherit', ...activeStyle }}>
            {isSpeakingThisLine && (
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                👉 🔊 [Explaining this part...]
              </span>
            )}
            {animate ? <TypewriterText text={lineText.slice(2)} /> : <span dangerouslySetInnerHTML={{ __html: lineText.slice(2) }} />}
          </div>
        );
      }
      if (lineText.startsWith('* ') || lineText.startsWith('- ')) {
        return (
          <li key={`${baseKey}_${idx}`} style={{ marginLeft: '0.75rem', marginBottom: '0.2rem', listStyleType: 'square', color: 'var(--text)', fontSize: 'inherit', ...activeStyle }}>
            {isSpeakingThisLine && (
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                👉 🔊 [Explaining this part...]
              </span>
            )}
            {animate ? <TypewriterText text={lineText.slice(2)} /> : <span dangerouslySetInnerHTML={{ __html: lineText.slice(2) }} />}
          </li>
        );
      }
      if (lineText.startsWith('---')) {
        return <hr key={`${baseKey}_${idx}`} style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '0.5rem 0' }} />;
      }
      return (
        <p key={`${baseKey}_${idx}`} style={{ margin: '0.2rem 0', color: 'var(--text)', lineHeight: 1.45, fontSize: 'inherit', ...activeStyle }}>
          {isSpeakingThisLine && (
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
              👉 🔊 [Explaining this part...]
            </span>
          )}
          {animate ? <TypewriterText text={lineText} /> : <span dangerouslySetInnerHTML={{ __html: lineText }} />}
        </p>
      );
    });
  };

  const formatGuruResponse = (content: string, revealedSteps: number = 1, messageIndex: number = 0, isNew: boolean = false) => {
    if (!content) return null;

    // Clean up any markdown code block wrappers around SVG (e.g. ```xml <svg>...</svg> ```)
    let sanitizedContent = content.replace(/```(?:xml|html|svg)?\s*(<svg[\s\S]*?<\/svg>)\s*```/gi, '$1');

    // Split content into blocks of SVG and normal text
    const parts = sanitizedContent.split(/(<svg[\s\S]*?<\/svg>)/gi);

    return (
      <div style={{
        borderRadius: '16px',
        padding: '0.75rem 1rem',
        border: '1px solid var(--border)',
        background: 'var(--surface-light)',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        maxWidth: '100%'
      }} className="guru-response-card animate-fade-in">
        {parts.map((part, idx) => {
          const trimmed = part.trim();
          const isSvg = trimmed.toLowerCase().startsWith('<svg') && trimmed.toLowerCase().endsWith('</svg>');
          if (isSvg) {
            let svgMarkup = trimmed;
            if (!svgMarkup.includes('width="100%"')) {
              svgMarkup = svgMarkup.replace(/<svg\s+/i, '<svg width="100%" height="auto" ');
            }
            return (
              <div 
                key={idx} 
                className="guru-svg-container"
                style={{ 
                  margin: '0.85rem 0', 
                  background: '#0f172a', 
                  padding: '1rem', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }} 
                dangerouslySetInnerHTML={{ __html: svgMarkup }} 
              />
            );
          }
          return (
            <div key={idx} className="guru-card-text" style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>
              {renderSimpleLines(part, idx, isNew, messageIndex)}
            </div>
          );
        })}
      </div>
    );
  };

  const askGuruJi = async (customQuery?: string | any) => {
    const q = (typeof customQuery === 'string' && customQuery.trim()) ? customQuery : guruQuestion;
    if (!q.trim() && !guruFile) return;
    const subj = guruSubject;
    const fl = guruFile;
    const fn = guruFileName;
    if (!customQuery) {
      setGuruQuestion('');
      setGuruFile(null);
      setGuruFileName('');
    }
    
    // Add user message to history
    const newHistoryItem = { role: 'user' as const, content: q, subject: subj, file: fl || undefined, fileName: fn || undefined };
    const currentHistorySnap = [...guruHistory, newHistoryItem];
    setGuruHistory(currentHistorySnap);
    setGuruLoading(true);

    try {
      const res = await fetch('/api/student/guru-ji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          subject: subj,
          language: guruLanguage,
          file: fl,
          history: currentHistorySnap.slice(-6)
        })
      });

      if (!res.ok) {
        setGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Sorry dear child, I encountered a connection issue. Please try seeking my guidance again.', revealedSteps: 1, isNew: true }]);
        setGuruLoading(false);
        return;
      }

      setGuruLoading(false);
      setGuruHistory(prev => [...prev, { role: 'guru', content: '', revealedSteps: 1, isNew: false }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let sentenceBuffer = "";

      if (reader) {
        if (guruMode === 'VOICE' && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          sentenceBuffer += chunk;

          // Real-time voice speech queue sentence-by-sentence
          if (guruMode === 'VOICE') {
            const parts = sentenceBuffer.split(/([।!?\n]|\.(?=\s|[A-Z]|$))/);
            while (parts.length > 2) {
              const fullSentence = parts.shift()! + parts.shift()!;
              sentenceBuffer = parts.join('');
              speakSentenceRealtime(fullSentence, currentHistorySnap.length);
            }
          }

          setGuruHistory(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: accumulatedText
              };
            }
            return updated;
          });

          // Scroll chat feed
          const feed = document.getElementById('guru-chat-feed');
          if (feed) feed.scrollTop = feed.scrollHeight;
        }

        // Speak remaining sentence buffer at end of stream
        if (guruMode === 'VOICE' && sentenceBuffer.trim()) {
          speakSentenceRealtime(sentenceBuffer.trim(), currentHistorySnap.length);
        }
      }
    } catch (e) {
      setGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Network connection error occurred. Make sure you are connected to the Internet.', revealedSteps: 1, isNew: true }]);
      setGuruLoading(false);
    }
  };

  const fetchGuruHistory = async () => {
    try {
      const res = await fetch('/api/student/guru-ji/history');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.doubts) {
          setDbHistoryList(data.doubts);
        }
      }
    } catch (e) {
      console.error('Failed to fetch guru-ji history:', e);
    }
  };

  return (
    <div 
      className="animate-scale-up guru-ji-card-container" 
      style={{ 
        padding: '0', 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 90px)', 
        minHeight: '450px', 
        background: 'var(--glass-bg)', 
        border: '1px solid var(--glass-border)', 
        borderRadius: '24px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow)',
        marginBottom: '0.25rem', 
        overflow: 'hidden' 
      }}
    >
      {/* ST Guru ji Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0.65rem 1.25rem', background: 'var(--surface-light)' }}>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div style={{ 
            width: '42px', height: '42px', borderRadius: '14px', 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.45), inset 0 1px 1px rgba(255,255,255,0.4)', 
            border: '1px solid rgba(255,255,255,0.25)',
            position: 'relative', flexShrink: 0
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              fontSize: '0.7rem'
            }}>✨</span>
          </div>
          <div>
            <h2 style={{ fontSize: '1.02rem', fontWeight: 900, margin: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.4px', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
                ST Guru ji
              </span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.66rem', margin: '2px 0 0 0', fontWeight: 600 }}>Sudhir Sir's AI Master</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Stop Audio Button */}
          {(playingAudioIndex !== null || activeSpeakingText || (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking)) && (
            <button
              onClick={stopAudio}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                padding: '0.4rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: 'pulse 1.5s infinite'
              }}
              title="Stop ST Guru ji Speech Playback"
            >
              <span style={{ fontSize: '0.9rem' }}>⏹️</span> Stop Audio
            </button>
          )}

          {/* Three-Dots Menu Button Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowGuruMenu(prev => !prev)}
              style={{ 
                background: showGuruMenu ? 'var(--border)' : 'rgba(255, 255, 255, 0.08)', 
                border: '1px solid var(--border)', 
                color: showGuruMenu ? '#f59e0b' : 'var(--text)', 
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out',
                boxShadow: showGuruMenu ? '0 0 10px rgba(245, 158, 11, 0.3)' : 'none'
              }}
              title="Guru ji Options & Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {showGuruMenu && (
              <div 
                style={{
                  position: 'absolute',
                  top: '125%',
                  right: 0,
                  zIndex: 100,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '18px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
                  padding: '0.5rem',
                  minWidth: '220px',
                  backdropFilter: 'blur(16px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  animation: 'fadeInScale 0.15s ease-out'
                }}
              >
                {/* Mode Selection */}
                <div style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚡ Interaction Mode
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '0 0.2rem 0.2rem 0.2rem' }}>
                  <button
                    onClick={() => {
                      stopAudio();
                      setGuruMode('CHAT');
                    }}
                    style={{
                      padding: '0.45rem 0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: guruMode === 'CHAT' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'var(--surface-light)',
                      color: guruMode === 'CHAT' ? '#fff' : 'var(--text)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    💬 Chat Mode
                  </button>
                  <button
                    onClick={() => setGuruMode('VOICE')}
                    style={{
                      padding: '0.45rem 0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: guruMode === 'VOICE' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--surface-light)',
                      color: guruMode === 'VOICE' ? '#fff' : 'var(--text)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: guruMode === 'VOICE' ? '0 2px 6px rgba(245, 158, 11, 0.3)' : 'none'
                    }}
                  >
                    🎙️ Voice Mode
                  </button>
                </div>

                <div style={{ height: '1px', background: 'var(--border)', margin: '0.2rem 0' }} />

                {/* Language Selection */}
                <div style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🌐 Explanation Language
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '0 0.2rem 0.2rem 0.2rem' }}>
                  {[
                    { id: 'HINGLISH', label: '🗣️ Hinglish' },
                    { id: 'HINDI', label: '🇮🇳 Hindi' },
                    { id: 'ENGLISH', label: '🇬🇧 English' },
                    { id: 'PUNJABI', label: '🌾 Punjabi' }
                  ].map((langItem) => (
                    <button
                      key={langItem.id}
                      onClick={() => setGuruLanguage(langItem.id as any)}
                      style={{
                        padding: '0.35rem 0.4rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: guruLanguage === langItem.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--surface-light)',
                        color: guruLanguage === langItem.id ? '#fff' : 'var(--text)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {langItem.label}
                    </button>
                  ))}
                </div>

                <div style={{ height: '1px', background: 'var(--border)', margin: '0.2rem 0' }} />

                {/* Voice Speed */}
                <div style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                  ⚡ Voice Speed ({audioSpeed === 1.0 ? '1x' : audioSpeed === 0.5 ? '0.5x' : `${audioSpeed}x`})
                </div>
                <div style={{ display: 'flex', gap: '3px', padding: '0 0.2rem 0.2rem 0.2rem' }}>
                  {[0.5, 1.0, 1.5, 2.0, 3.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setAudioSpeed(spd)}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: audioSpeed === spd ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--surface-light)',
                        color: audioSpeed === spd ? '#fff' : 'var(--text)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {spd === 1.0 ? '1x' : spd === 0.5 ? '0.5x' : `${spd}x`}
                    </button>
                  ))}
                </div>

                <div style={{ height: '1px', background: 'var(--border)', margin: '0.2rem 0' }} />

                {/* Actions */}
                <button 
                  onClick={() => {
                    setShowGuruMenu(false);
                    fetchGuruHistory();
                    setShowGuruHistoryPanel(prev => !prev);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.55rem 0.7rem',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#f59e0b',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>📜</span>
                  <span>Doubt History</span>
                </button>

                <button 
                  onClick={() => {
                    setShowGuruMenu(false);
                    clearActiveGuruChat();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    width: '100%',
                    padding: '0.55rem 0.7rem',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>🧹</span>
                  <span>Clear Current Chat</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(245,158,11,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
        .chat-bubble {
          border-radius: 16px;
          padding: 0.6rem 0.85rem;
          max-width: 85%;
          line-height: 1.45;
          font-size: 0.88rem;
          word-break: break-word;
          overflow-wrap: break-word;
          box-sizing: border-box;
        }
        .chat-bubble pre {
          background: var(--surface-light);
          padding: 0.75rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 0.5rem 0;
          border: 1px solid var(--border);
          font-size: 0.82rem;
          max-width: 100%;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .chat-bubble code {
          font-family: monospace;
          background: var(--surface-light);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--primary);
          font-weight: 600;
          word-break: break-word;
        }
        .guru-card-text {
          font-size: 0.88rem;
          line-height: 1.45;
          color: var(--text);
          word-break: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        .guru-card-text p, .guru-card-text li, .guru-card-text div {
          word-break: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        .guru-card-text table {
          display: block;
          width: 100%;
          overflow-x: auto;
          max-width: 100%;
          border-collapse: collapse;
          margin: 0.5rem 0;
        }
        .guru-card-text th, .guru-card-text td {
          padding: 6px 12px;
          border: 1px solid var(--border);
        }
        .attachment-btn {
          transition: all 0.2s ease;
        }
        .attachment-btn:hover {
          transform: scale(1.08);
          background: var(--border) !important;
        }
        .attachment-btn:hover svg {
          stroke: #f59e0b !important;
        }
        .guru-history-sidebar {
          width: 280px;
          border-left: 1px solid var(--border);
          background: var(--surface-light);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .chat-bubble {
            max-width: 95% !important;
            padding: 0.45rem 0.65rem !important;
            font-size: 0.82rem !important;
            line-height: 1.4 !important;
          }
          #guru-chat-feed {
            padding: 0.5rem !important;
            gap: 0.5rem !important;
          }
          .guru-response-card {
            padding: 0.35rem 0.55rem !important;
            border-radius: 10px !important;
          }
          .guru-response-card h4 {
            font-size: 0.8rem !important;
            margin-bottom: 0.15rem !important;
          }
          .guru-card-text {
            font-size: 0.82rem !important;
            line-height: 1.4 !important;
          }
          .guru-input-bar {
            padding: 0.5rem 0.5rem !important;
          }
          .guru-input-container {
            gap: 0.35rem !important;
            padding: 0.25rem 0.35rem 0.25rem 0.6rem !important;
          }
          .guru-input-field {
            font-size: 0.82rem !important;
          }
          .guru-btn-circle {
            width: 28px !important;
            height: 28px !important;
            margin-right: 2px !important;
          }
          .guru-send-btn {
            width: 30px !important;
            height: 30px !important;
          }
          .guru-history-sidebar {
            position: absolute !important;
            right: 0;
            top: 48px;
            bottom: 0;
            z-index: 10;
            width: 80% !important;
            border-left: 1px solid var(--border);
            box-shadow: var(--shadow-xl);
          }
        }
      `}</style>

      {/* Horizontal Layout for Feed & History Sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', flexDirection: 'row' }}>
        
        {/* Left Panel: Chat Feed & Input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Message Feed */}
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }} id="guru-chat-feed">
            {guruHistory.length === 0 ? (
              <div style={{ margin: 'auto', maxWidth: '480px', width: '100%', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)', marginBottom: '1rem', animation: 'pulse 2.5s infinite' }}>
                  <span style={{ fontSize: '1.85rem' }}>🤖</span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.4rem 0' }}>
                  Namaste {displayName}! Main hoon Digital ST Guru ji 🙏
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  Sudhir Sir's AI Master for instant doubt resolution. Ask your question in text, record your voice, or upload a photo/PDF document below!
                </p>
              </div>
            ) : (
              guruHistory.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                  {msg.role !== 'user' && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.8rem' }}>🤖</span>
                    </div>
                  )}
                  <div 
                    className={msg.role === 'user' ? 'chat-bubble' : ''}
                    style={msg.role === 'user' ? { 
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))', 
                      border: 'none',
                      color: '#fff',
                      borderTopLeftRadius: '16px',
                      borderTopRightRadius: '4px',
                      boxShadow: 'var(--shadow-sm)',
                      borderRadius: '16px',
                      padding: '0.6rem 0.85rem',
                      maxWidth: '80%',
                      lineHeight: '1.45',
                      fontSize: '0.88rem'
                    } : {
                      background: 'none',
                      border: 'none',
                      color: 'var(--text)',
                      boxShadow: 'none',
                      padding: '0',
                      maxWidth: '90%',
                      width: '100%',
                      fontSize: '0.88rem'
                    }}
                  >
                    <div>
                      {msg.role === 'guru' ? (
                        <>
                          {formatGuruResponse(msg.content, msg.revealedSteps || 1, i, msg.isNew)}
                          {msg.content && (
                            <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {/* Voice Player & Action Controls */}
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', background: 'var(--surface-light)', padding: '0.4rem 0.75rem', borderRadius: '12px', border: '1px solid var(--border)', width: 'fit-content' }}>
                                <button
                                  onClick={() => playVoiceExplanation(i, msg.content)}
                                  disabled={audioLoadingIndex === i}
                                  style={{
                                    background: playingAudioIndex === i ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {audioLoadingIndex === i ? (
                                    <>⏳ Generating Voice...</>
                                  ) : playingAudioIndex === i ? (
                                    <>⏸️ Pause Voice</>
                                  ) : (
                                    <>🔊 Listen in Sudhir Sir's Voice</>
                                  )}
                                </button>

                                {/* Copy Response Text Button */}
                                <button
                                  onClick={() => {
                                    const cleanText = msg.content.replace(/<[^>]*>/g, '').replace(/[*_#`]/g, '');
                                    navigator.clipboard.writeText(cleanText);
                                    setCopiedIndex(i);
                                    setTimeout(() => setCopiedIndex(null), 2000);
                                  }}
                                  style={{
                                    background: 'var(--bg)',
                                    border: '1px solid var(--border)',
                                    color: copiedIndex === i ? '#10b981' : 'var(--text-muted)',
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {copiedIndex === i ? '✔ Copied!' : '📋 Copy'}
                                </button>

                                {playingAudioIndex === i && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ display: 'inline-block', width: '3px', height: '12px', background: '#f59e0b', animation: 'pulse 0.8s infinite' }}></span>
                                      <span style={{ display: 'inline-block', width: '3px', height: '16px', background: '#f59e0b', animation: 'pulse 0.6s infinite 0.2s' }}></span>
                                      <span style={{ display: 'inline-block', width: '3px', height: '10px', background: '#f59e0b', animation: 'pulse 0.7s infinite 0.4s' }}></span>
                                    </span>
                                    <select
                                      value={audioSpeed}
                                      onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                                      style={{
                                        background: 'var(--bg)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text)',
                                        fontSize: '0.72rem',
                                        borderRadius: '6px',
                                        padding: '2px 4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value={0.5}>0.5x</option>
                                      <option value={1.0}>1x</option>
                                      <option value={1.5}>1.5x</option>
                                      <option value={2.0}>2x</option>
                                      <option value={3.0}>3x</option>
                                    </select>
                                    <button
                                      onClick={stopAudio}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                      }}
                                    >
                                      Stop
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          {msg.image && (
                            <img 
                              src={msg.image} 
                              alt="Uploaded Doubt" 
                              style={{ 
                                maxWidth: '100%', 
                                maxHeight: '200px', 
                                borderRadius: '12px', 
                                marginBottom: '0.5rem', 
                                display: 'block',
                                border: '1px solid rgba(255,255,255,0.2)' 
                              }} 
                            />
                          )}
                          {msg.file && (
                            msg.file.startsWith('data:application/pdf') ? (
                              <div style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', 
                                padding: '0.65rem 0.85rem', borderRadius: '12px', marginBottom: '0.5rem',
                                color: '#fff', fontSize: '0.85rem', fontWeight: 600
                              }}>
                                <span style={{ fontSize: '1.25rem' }}>📄</span>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                  {msg.fileName || 'Document.pdf'}
                                </span>
                              </div>
                            ) : (
                              <img 
                                src={msg.file} 
                                alt="Uploaded Doubt" 
                                style={{ 
                                  maxWidth: '100%', 
                                  maxHeight: '200px', 
                                  borderRadius: '12px', 
                                  marginBottom: '0.5rem', 
                                  display: 'block',
                                  border: '1px solid rgba(255,255,255,0.2)' 
                                }} 
                              />
                            )
                          )}
                          <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--secondary), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                      {displayName.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {guruLoading && (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.8rem' }}>🤖</span>
                </div>
                <div className="chat-bubble" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid #f3f3f3', borderTop: '2px solid #f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="guru-input-bar" style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
            <div style={{ width: '100%', margin: '0' }}>
              {guruFile && (
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem', marginLeft: '0.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  {guruFile.startsWith('data:application/pdf') ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 2rem 0.75rem 1rem', borderRadius: '12px', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                      <span style={{ fontSize: '1.25rem' }}>📄</span>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                        {guruFileName || 'Document.pdf'}
                      </span>
                    </div>
                  ) : (
                    <img src={guruFile} alt="Doubt Preview" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                  )}
                  <button 
                    onClick={() => {
                      setGuruFile(null);
                      setGuruFileName('');
                    }}
                    style={{ 
                      position: 'absolute', top: '4px', right: '4px', 
                      background: 'rgba(239, 68, 68, 0.85)', color: '#fff', 
                      border: 'none', width: '20px', height: '20px', borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', zIndex: 10
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="guru-input-container" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '28px', padding: '0.65rem 0.8rem 0.65rem 1.1rem' }}>
                {/* Attachment Picker */}
                <label 
                  className="attachment-btn guru-btn-circle"
                  style={{ 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    width: '36px', height: '36px', borderRadius: '50%', 
                    background: 'var(--surface-light)', border: '1px solid var(--border)', 
                    transition: 'all 0.2s', marginRight: '4px'
                  }}
                  title="Upload Doubt Image or PDF"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    onChange={handleGuruFileChange} 
                    style={{ display: 'none' }} 
                  />
                </label>

                {/* Voice Record Button */}
                <button 
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={guruLoading || isTranscribing}
                  className="attachment-btn guru-btn-circle"
                  style={{ 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    width: '36px', height: '36px', borderRadius: '50%', 
                    background: isRecording ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-light)', 
                    border: isRecording ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)', 
                    transition: 'all 0.2s', marginRight: '4px',
                    color: isRecording ? '#ef4444' : 'var(--text-muted)',
                    animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                  }}
                  title={isRecording ? "Stop Recording" : "Voice Doubt Query"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                </button>

                <input 
                  type="text"
                  className="guru-input-field"
                  placeholder={isTranscribing ? "🎙️ Transcribing voice doubt..." : isRecording ? "🎙️ Recording... speak your doubt clearly, click Mic to stop" : "Ask ST Guru ji a question, upload a PDF/Photo..."}
                  value={guruQuestion}
                  onChange={(e) => setGuruQuestion(e.target.value)}
                  disabled={isTranscribing || isRecording}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !guruLoading && (guruQuestion.trim() || guruFile)) {
                      askGuruJi();
                    }
                  }}
                  style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', color: isRecording ? '#ef4444' : 'var(--text)', fontSize: '0.96rem', padding: '0.55rem 0', fontStyle: isRecording || isTranscribing ? 'italic' : 'normal' }}
                />
                
                <button 
                  onClick={() => askGuruJi()}
                  className="guru-send-btn"
                  disabled={guruLoading || (!guruQuestion.trim() && !guruFile) || isRecording || isTranscribing}
                  style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    background: (guruQuestion.trim() || guruFile) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--border)', 
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    cursor: (guruLoading || (!guruQuestion.trim() && !guruFile) || isRecording || isTranscribing) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: (guruQuestion.trim() || guruFile) ? '0 2px 8px rgba(245,158,11,0.3)' : 'none'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History Sidebar Panel */}
        {showGuruHistoryPanel && (
          <div className="guru-history-sidebar">
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)' }}>Doubt History</h4>
              <button 
                onClick={() => setShowGuruHistoryPanel(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dbHistoryList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 0' }}>
                  No saved doubts found.
                </div>
              ) : (
                dbHistoryList.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      setGuruHistory([{ role: 'user', content: item.question, subject: item.subject }, { role: 'guru', content: item.answer }]);
                      setShowGuruHistoryPanel(false);
                    }}
                    style={{ 
                      padding: '0.65rem 0.85rem', borderRadius: '12px', 
                      background: 'var(--card-bg)', border: '1px solid var(--border)', 
                      cursor: 'pointer', transition: 'all 0.15s ease' 
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f59e0b'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, marginBottom: '2px' }}>
                      {item.subject || 'Academic Doubt'}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {item.question}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
