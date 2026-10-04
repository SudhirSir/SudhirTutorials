"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { marked } from 'marked';
import { renderLatex } from '@/lib/katex';

export default function ChapterMockTestArena() {
  const params = useParams();
  const mockTestId = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const [testData, setTestData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [reportCard, setReportCard] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [warningCount, setWarningCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: string;
    badge?: string;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: '',
    title: '',
    message: ''
  });

  const submittedRef = useRef(false);
  const warningCountRef = useRef(0);

  const requestFullscreenMode = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen request failed:", e);
    }
  };

  const triggerSecurityWarning = useCallback((reason: string) => {
    if (submittedRef.current) return;
    warningCountRef.current += 1;
    const count = warningCountRef.current;
    setWarningCount(count);

    if (count >= 5) {
      submitTest(true);
      setModalConfig({
        isOpen: true,
        type: 'AUTO_SUBMIT_SECURITY',
        badge: 'SECURITY VIOLATION',
        title: 'Test Auto-Submitted!',
        message: `Anti-Cheat Violation: You received 5 warnings (${reason})! Your mock test has been submitted automatically.`,
        confirmLabel: 'View Evaluation Report',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
    } else {
      setModalConfig({
        isOpen: true,
        type: 'WARNING_SECURITY',
        badge: `WARNING ${count} / 5`,
        title: `Security Warning (${count}/5)`,
        message: `${reason} is strictly prohibited during the test! After 5 total warnings, your test will be auto-submitted.`,
        confirmLabel: 'Re-enter Fullscreen & Resume',
        onConfirm: () => {
          requestFullscreenMode();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
    }
  }, []);

  const submitTest = async (autoSubmitted = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    // Exit fullscreen cleanly when test finishes
    if (document.fullscreenElement) {
      try {
        document.exitFullscreen().catch(() => {});
      } catch (e) {}
    }

    const duration = testData?.durationMinutes ? testData.durationMinutes * 60 : 900;
    const timeTaken = duration - (timeLeft || 0);

    try {
      const res = await fetch('/api/mock-tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockTestId,
          answers,
          timeTaken,
          autoSubmitted
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReportCard(data.reportCard);
      }
    } catch (e) {
      console.error("Failed to submit test:", e);
    }
  };

  useEffect(() => {
    // Enable mobile native PrivacyScreen if running inside Capacitor
    if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.PrivacyScreen) {
      try {
        (window as any).Capacitor.Plugins.PrivacyScreen.enable();
      } catch (e) {}
    }

    // Auto-enter Fullscreen when starting test
    requestFullscreenMode();

    // Fullscreen Change Monitor
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && !submittedRef.current && testData) {
        triggerSecurityWarning('Exiting Fullscreen Mode');
      }
    };

    // Anti-cheat & Anti-Screenshot protections
    const handleContextMenu = (e: Event) => e.preventDefault();
    const handleCopy = (e: Event) => e.preventDefault();
    const handleCut = (e: Event) => e.preventDefault();
    const handlePaste = (e: Event) => e.preventDefault();
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Block screenshot keys & inspect shortcuts
      if (
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && (key === 's' || key === '4' || key === '3')) ||
        (e.ctrlKey && ['c', 'v', 'x', 'a', 'u', 'p'].includes(key)) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 's'].includes(key)) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey)) {
          triggerSecurityWarning('Attempting Screenshot / Print Screen');
        } else if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key))) {
          triggerSecurityWarning('Attempting Developer Tools / Inspect');
        }
      }
    };

    // Visibility change / tab switch monitor
    const handleVisibilityChange = () => {
      if (document.hidden && !submittedRef.current && testData) {
        triggerSecurityWarning('Switching Tabs / Minimizing Window');
      }
    };

    // Window blur (losing focus)
    const handleWindowBlur = () => {
      if (!submittedRef.current && testData) {
        triggerSecurityWarning('Switching Window Focus');
      }
    };

    // Capacitor Native Mobile Back-Button Handler
    const handleBackButton = (e: Event) => {
      if (!submittedRef.current) {
        e.preventDefault();
        setModalConfig({
          isOpen: true,
          type: 'CONFIRM_EXIT',
          badge: 'EXIT TEST',
          title: 'Exit Mock Test?',
          message: 'Are you sure you want to exit the test? Your current progress will be submitted.',
          confirmLabel: 'Submit & Exit',
          cancelLabel: 'Stay on Test',
          onConfirm: () => {
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            submitTest(false);
            router.push('/dashboard/student?tab=mock-tests');
          },
          onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('backbuttonpress', handleBackButton);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('backbuttonpress', handleBackButton);
    };
  }, [testData, router, triggerSecurityWarning]);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const res = await fetch(`/api/mock-tests/questions?mockTestId=${mockTestId}`);
        if (res.ok) {
          const data = await res.json();
          setTestData(data.mockTest);
          setQuestions(data.questions || []);
          setTimeLeft((data.mockTest?.durationMinutes || 15) * 60);
        }
      } catch (e) {
        console.error("Failed to fetch mock test data:", e);
      }
      setLoading(false);
    };
    fetchTestData();
  }, [mockTestId]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;

    if (timeLeft <= 0) {
      submitTest(false);
      setModalConfig({
        isOpen: true,
        type: 'TIME_UP',
        badge: 'TIME EXPIRED',
        title: "Time is Up!",
        message: 'Your allocated time has ended. Your mock test is automatically submitted now.',
        confirmLabel: 'View Result',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const handleAnswerChange = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const toggleFlag = (questionId: string) => {
    if (submitted) return;
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const getAiExplanation = async (q: any, studentAns: any) => {
    setLoadingAi(prev => ({ ...prev, [q.id]: true }));
    try {
      const opts = JSON.parse(q.options || "[]");
      const isInputType = Array.isArray(opts) && opts[0] === "INPUT_ANSWER";
      const studentVal = isInputType ? (studentAns || "Not Attempted") : (studentAns !== undefined ? opts[studentAns] : 'Not Attempted');
      const correctVal = isInputType ? opts[1] : opts[q.correctOption];

      const res = await fetch('/api/mock-tests/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: q.questionText,
          options: isInputType ? [opts[1]] : opts,
          studentAnswer: studentVal,
          correctAnswer: correctVal,
          boardTag: q.boardTag
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiExplanations(prev => ({ ...prev, [q.id]: data.explanation }));
      } else {
        setAiExplanations(prev => ({ ...prev, [q.id]: 'Failed to generate explanation. Please try again.' }));
      }
    } catch (e) {
      console.error(e);
      setAiExplanations(prev => ({ ...prev, [q.id]: 'Error connecting to AI server.' }));
    }
    setLoadingAi(prev => ({ ...prev, [q.id]: false }));
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>🌀 Loading Chapter Mock Test environment...</div>;
  if (!testData) return <div style={{ padding: '4rem', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>⚠️ Chapter Mock Test Not Found.</div>;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[activeQuestionIdx];
  const attemptedCount = Object.keys(answers).length;

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', userSelect: 'none', WebkitUserSelect: 'none' }}>
      
      {/* Anti-Print & Screenshot Blocking CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            display: none !important;
            visibility: hidden !important;
          }
        }
        .test-grid-layout {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 1.25rem;
        }
        @media (max-width: 1024px) {
          .test-grid-layout {
            grid-template-columns: 1fr;
          }
        }
        .option-card-interactive {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--card-bg-alt);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
        }
        .option-card-interactive:hover {
          transform: translateY(-1px);
          border-color: var(--primary);
          background: rgba(59, 130, 246, 0.05);
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.08);
        }
        .option-card-interactive.selected {
          border-color: var(--primary);
          background: rgba(59, 130, 246, 0.12);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
        }
        .status-dot-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .status-dot-btn.active {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
        @media (max-width: 640px) {
          .test-arena-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.75rem !important;
            padding: 1rem 1.25rem !important;
          }
          .option-card-interactive {
            padding: 1rem !important;
          }
        }
      `}} />

      {/* Fullscreen Alert Banner if not in fullscreen */}
      {!submitted && !isFullscreen && (
        <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#ef4444", padding: "0.6rem 1rem", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, fontSize: "0.88rem" }}>
          <span>⚠️ Test mode requires FULL SCREEN. Please click to restore full screen immediately!</span>
          <button
            onClick={requestFullscreenMode}
            style={{ background: "#ef4444", color: "#fff", border: "none", padding: "0.35rem 0.85rem", borderRadius: "8px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}
          >
            🖥️ Enter Full Screen
          </button>
        </div>
      )}

      {/* Header Panel */}
      <header className="glass-card test-arena-header" style={{ padding: '0.6rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '0.5rem', zIndex: 100, border: '1px solid var(--border)', borderRadius: '12px' }}>
        <div>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px' }}>
            CLASS {testData.className} • {testData.board} BOARD {testData.title ? `• ${testData.title}` : ''}
          </span>
          <h1 style={{ fontSize: '1.05rem', margin: '0.1rem 0 0 0', fontWeight: 800, color: 'var(--text-heading)' }}>
            {testData.chapterName}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {warningCount > 0 && (
            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.25rem 0.65rem', borderRadius: '8px' }}>
              ⚠️ Security Warnings: {warningCount}/5
            </span>
          )}

          <div style={{ 
            background: timeLeft !== null && timeLeft < 180 ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.08)', 
            color: timeLeft !== null && timeLeft < 180 ? '#ef4444' : 'var(--primary)', 
            padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.95rem', fontWeight: 800, fontFamily: 'monospace',
            border: `1px solid ${timeLeft !== null && timeLeft < 180 ? '#ef4444' : 'var(--primary)'}`,
            boxShadow: `0 2px 8px ${timeLeft !== null && timeLeft < 180 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.1)'}`
          }}>
            ⏱️ {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>
      </header>

      {submitted ? (
        /* Evaluation & Result Showcase Screen */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '700px', margin: '0 auto', width: '100%', paddingBottom: '3rem' }}>
          
          <div className="glass-card animate-scale-up" style={{ padding: '1.5rem 1.25rem', textAlign: 'center', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2.5rem', animation: 'bounce 1s infinite' }}>🏆</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Chapter Mock Test Result</h2>
            
            {reportCard && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: reportCard.isPassed ? '#22c55e' : 'var(--primary)' }}>
                    {reportCard.score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {reportCard.totalMarks}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginTop: '0.25rem', letterSpacing: '0.5px' }}>
                    {reportCard.isPassed ? '🎉 PASSED' : '🎯 MARKS SCORED'}
                  </div>
                </div>

                <div style={{ height: '35px', width: '1px', background: 'var(--border)' }} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>{reportCard.correctCount}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Correct</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ef4444' }}>{reportCard.incorrectCount}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Wrong</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#6b7280' }}>{reportCard.unattemptedCount}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Skipped</div>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={() => router.push('/dashboard/student?tab=mock-tests')} 
              className="btn-primary" 
              style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem', fontWeight: 800, borderRadius: '10px', marginTop: '0.75rem' }}
            >
              ← Back to Mock Tests
            </button>
          </div>

          {/* Test Questions Review Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              Detailed Question Analysis
            </h3>
            
            {questions.map((q, idx) => {
              const optionsArr = JSON.parse(q.options || '[]');
              const isInputType = Array.isArray(optionsArr) && optionsArr[0] === 'INPUT_ANSWER';
              const studentAns = answers[q.id];

              let isCorrect = false;
              let isUnanswered = studentAns === undefined || String(studentAns).trim() === '';

              if (isInputType) {
                const targetVal = String(optionsArr[1] || '').trim().toLowerCase();
                const studentVal = String(studentAns || '').trim().toLowerCase();
                isCorrect = !isUnanswered && targetVal === studentVal;
              } else {
                isCorrect = studentAns === q.correctOption;
              }

              return (
                <div 
                  key={q.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '1.5rem 1.25rem', 
                    border: `1.5px solid ${isUnanswered ? 'var(--border)' : isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    background: isUnanswered ? 'var(--card-bg)' : isCorrect ? 'rgba(16,185,129,0.02)' : 'rgba(239,68,68,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)' }}>QUESTION {idx + 1}</span>
                      {q.boardTag && (
                        <span style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                          🎓 {q.boardTag}
                        </span>
                      )}
                    </div>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                      background: isUnanswered ? 'rgba(255,255,255,0.05)' : isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: isUnanswered ? 'var(--text-muted)' : isCorrect ? '#10b981' : '#ef4444'
                    }}>
                      {isUnanswered ? 'Skipped' : isCorrect ? `Correct (+${q.marks})` : 'Incorrect (0)'}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0.25rem 0', lineHeight: 1.5, color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: renderLatex(q.questionText) }} />

                  {isInputType ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--card-bg-alt)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                        ✏️ Your Submitted Answer: <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontWeight: 900 }}>"{studentAns || 'Not Attempted'}"</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                        ✓ Expected Target Answer: <span style={{ fontWeight: 900 }} dangerouslySetInnerHTML={{ __html: renderLatex(optionsArr[1] || '') }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {optionsArr.map((opt: string, optIdx: number) => {
                        let optionStyle: any = {
                          padding: '0.65rem 0.85rem', borderRadius: '10px', fontSize: '0.9rem', border: '1px solid var(--border)', background: 'var(--card-bg-alt)'
                        };
                        if (optIdx === q.correctOption) {
                          optionStyle.background = 'rgba(16,185,129,0.1)';
                          optionStyle.borderColor = '#10b981';
                          optionStyle.color = '#10b981';
                          optionStyle.fontWeight = 700;
                        } else if (optIdx === studentAns) {
                          optionStyle.background = 'rgba(239,68,68,0.1)';
                          optionStyle.borderColor = '#ef4444';
                          optionStyle.color = '#ef4444';
                        }

                        return (
                          <div key={optIdx} style={optionStyle}>
                            <span style={{ marginRight: '0.5rem', fontWeight: 800 }}>{String.fromCharCode(65 + optIdx)}.</span>
                            <span dangerouslySetInnerHTML={{ __html: renderLatex(opt) }} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && (
                    <div style={{ background: 'var(--card-bg-alt)', padding: '0.85rem', borderRadius: '10px', borderLeft: '4px solid var(--primary)', marginTop: '0.35rem' }}>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Textbook Solution:</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }} dangerouslySetInnerHTML={{ __html: renderLatex(q.explanation) }} />
                    </div>
                  )}

                  {aiExplanations[q.id] ? (
                    <div className="animate-fade-in" style={{ background: 'rgba(59, 130, 246, 0.04)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #3b82f6', marginTop: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>🤖</span>
                        <strong style={{ color: '#3b82f6', fontSize: '0.82rem', textTransform: 'uppercase' }}>ST Guru ji Board Tutor Reasoning:</strong>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: marked(aiExplanations[q.id]) }} />
                    </div>
                  ) : (
                    <button 
                      onClick={() => getAiExplanation(q, studentAns)} 
                      disabled={loadingAi[q.id]}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', 
                        border: '1px dashed rgba(59, 130, 246, 0.4)', padding: '0.5rem 1rem', 
                        borderRadius: '8px', cursor: loadingAi[q.id] ? 'not-allowed' : 'pointer',
                        fontWeight: 700, transition: 'all 0.2s', width: 'fit-content', fontSize: '0.82rem', marginTop: '0.35rem'
                      }}
                    >
                      {loadingAi[q.id] ? '🤖 Analyzing query with AI...' : '🤖 Ask ST Guru ji for detailed reasoning'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Take Test Active Interface */
        <div className="test-grid-layout">
          
          {/* Left Column: Active Question Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {currentQuestion ? (
              <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
                
                {/* Active Question Info Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900 }}>Question {activeQuestionIdx + 1} of {questions.length}</span>
                    {flagged[currentQuestion.id] && (
                      <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>🚩 FLAGGED</span>
                    )}
                    {currentQuestion.boardTag && (
                      <span style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>
                        🎓 {currentQuestion.boardTag}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    {currentQuestion.marks} Marks
                  </span>
                </div>

                {/* Question Text */}
                <div style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0.25rem 0 1.25rem 0', lineHeight: 1.5, color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: renderLatex(currentQuestion.questionText) }} />

                {/* Option Selections / Input Field */}
                {(() => {
                  const opts = JSON.parse(currentQuestion.options || '[]');
                  const isInputType = Array.isArray(opts) && opts[0] === 'INPUT_ANSWER';

                  if (isInputType) {
                    return (
                      <div style={{ margin: '1rem 0' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>
                          ✏️ Enter Your Direct Answer / Value:
                        </label>
                        <input
                          type="text"
                          placeholder="Type your answer here (e.g., 9.8 or 25)..."
                          value={answers[currentQuestion.id] !== undefined ? String(answers[currentQuestion.id]) : ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            border: '2px solid var(--primary)',
                            background: 'var(--card-bg-alt)',
                            color: 'var(--text)',
                            fontSize: '1rem',
                            fontWeight: 700
                          }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                      {opts.map((opt: string, optIdx: number) => {
                        const isSelected = answers[currentQuestion.id] === optIdx;
                        return (
                          <label 
                            key={optIdx} 
                            className={`option-card-interactive ${isSelected ? 'selected' : ''}`}
                          >
                            <input 
                              type="radio" 
                              name={`question-${currentQuestion.id}`} 
                              checked={isSelected}
                              onChange={() => handleAnswerChange(currentQuestion.id, optIdx)}
                              style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary)', margin: 0 }}
                            />
                            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                              <span style={{ color: 'var(--text-muted)', marginRight: '0.4rem', fontWeight: 800 }}>{String.fromCharCode(65 + optIdx)}.</span>
                              <span dangerouslySetInnerHTML={{ __html: renderLatex(opt) }} />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Question Bottom Action Controller */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      disabled={activeQuestionIdx === 0}
                      onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                      className="btn-secondary"
                      style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', cursor: activeQuestionIdx === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => toggleFlag(currentQuestion.id)}
                      className="btn-secondary"
                      style={{ 
                        padding: '0.5rem 1rem', 
                        borderRadius: '8px', 
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        background: flagged[currentQuestion.id] ? 'rgba(245,158,11,0.1)' : 'transparent',
                        borderColor: flagged[currentQuestion.id] ? '#f59e0b' : 'var(--border)',
                        color: flagged[currentQuestion.id] ? '#f59e0b' : 'var(--text)'
                      }}
                    >
                      {flagged[currentQuestion.id] ? '🏳️ Unflag' : '🚩 Flag for Review'}
                    </button>
                  </div>

                  <button
                    disabled={activeQuestionIdx === questions.length - 1}
                    onClick={() => {
                      if (activeQuestionIdx < questions.length - 1) {
                        setActiveQuestionIdx(prev => prev + 1);
                      }
                    }}
                    className="btn-primary"
                    style={{ 
                      padding: '0.5rem 1.25rem', 
                      borderRadius: '8px', 
                      fontSize: '0.85rem',
                      opacity: activeQuestionIdx === questions.length - 1 ? 0.5 : 1,
                      cursor: activeQuestionIdx === questions.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Save & Next →
                  </button>
                </div>

              </div>
            ) : (
              <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No questions exist inside this chapter mock test.
              </div>
            )}
          </div>

          {/* Right Column: Status Grid Navigator */}
          <div className="glass-card" style={{ padding: '1.15rem', border: '1px solid var(--border)', height: 'fit-content' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.75rem 0' }}>Progress Navigator</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginBottom: '1.25rem' }}>
              {questions.map((q, idx) => {
                const isAttempted = answers[q.id] !== undefined && String(answers[q.id]).trim() !== '';
                const isFlagged = flagged[q.id];
                const isActive = idx === activeQuestionIdx;
                
                let btnBg = 'var(--card-bg-alt)';
                let textColor = 'var(--text-muted)';
                let border = '1px solid var(--border)';
                
                if (isFlagged) {
                  btnBg = '#f59e0b';
                  textColor = '#fff';
                  border = 'none';
                } else if (isAttempted) {
                  btnBg = '#10b981';
                  textColor = '#fff';
                  border = 'none';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIdx(idx)}
                    className={`status-dot-btn ${isActive ? 'active' : ''}`}
                    style={{ background: btnBg, color: textColor, border }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Progress Summary Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Questions:</span>
                <strong style={{ fontSize: '0.85rem' }}>{questions.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '7px', height: '7px', background: '#10b981', borderRadius: '50%' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Answered:</span>
                </div>
                <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>{attemptedCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '7px', height: '7px', background: '#f59e0b', borderRadius: '50%' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Flagged:</span>
                </div>
                <strong style={{ color: '#f59e0b', fontSize: '0.85rem' }}>{Object.values(flagged).filter(Boolean).length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '7px', height: '7px', background: 'var(--border)', borderRadius: '50%' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Not Answered:</span>
                </div>
                <strong style={{ fontSize: '0.85rem' }}>{questions.length - attemptedCount}</strong>
              </div>
            </div>

            {/* Quick Submit Block */}
            <button
              onClick={() => {
                setModalConfig({
                  isOpen: true,
                  type: 'CONFIRM_SUBMIT',
                  badge: 'FINAL SUBMISSION',
                  title: 'Submit Mock Test?',
                  message: `Are you sure you want to finish and submit your mock test? Total answered: ${attemptedCount} of ${questions.length} questions.`,
                  confirmLabel: 'Yes, Submit Test',
                  cancelLabel: 'Cancel',
                  onConfirm: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    submitTest(false);
                  },
                  onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
                });
              }}
              className="btn-primary"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, marginTop: '1.25rem', border: 'none', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}
            >
              Finish & Submit Test
            </button>

          </div>

        </div>
      )}

      {/* Custom Security & Alert Modal */}
      {modalConfig.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-card animate-scale-up" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '1.75rem',
            borderRadius: '20px',
            border: modalConfig.type.includes('SECURITY') || modalConfig.type === 'TIME_UP' ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1.5px solid var(--border)',
            background: 'var(--card-bg)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1.25rem'
          }}>
            {/* Top Icon Badge */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: modalConfig.type.includes('SECURITY') || modalConfig.type === 'TIME_UP' 
                ? 'rgba(239, 68, 68, 0.12)' 
                : 'rgba(59, 130, 246, 0.12)',
              border: modalConfig.type.includes('SECURITY') || modalConfig.type === 'TIME_UP'
                ? '1px solid rgba(239, 68, 68, 0.3)'
                : '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem'
            }}>
              {modalConfig.type.includes('SECURITY') ? '⚠️' : modalConfig.type === 'TIME_UP' ? '⌛' : '🎯'}
            </div>

            <div>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 800, 
                letterSpacing: '0.05em', 
                textTransform: 'uppercase',
                color: modalConfig.type.includes('SECURITY') || modalConfig.type === 'TIME_UP' ? '#ef4444' : 'var(--primary)',
                background: modalConfig.type.includes('SECURITY') || modalConfig.type === 'TIME_UP' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-block',
                marginBottom: '0.5rem'
              }}>
                {modalConfig.badge || 'ALERT'}
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0.2rem 0 0 0', color: 'var(--text-heading)' }}>
                {modalConfig.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.6rem 0 0 0', lineHeight: 1.5 }}>
                {modalConfig.message}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              {modalConfig.onCancel && (
                <button
                  onClick={modalConfig.onCancel}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {modalConfig.cancelLabel || 'Cancel'}
                </button>
              )}
              <button
                onClick={modalConfig.onConfirm}
                className="btn-primary"
                style={{ 
                  flex: 1, 
                  padding: '0.65rem', 
                  borderRadius: '10px', 
                  fontSize: '0.85rem', 
                  fontWeight: 800,
                  background: modalConfig.type.includes('SECURITY') || modalConfig.type === 'TIME_UP' ? '#ef4444' : '#10b981',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                {modalConfig.confirmLabel || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
