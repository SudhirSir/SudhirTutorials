"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { marked } from 'marked';

export default function OnlineTestArena() {
  const params = useParams();
  const testId = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const [testData, setTestData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [unattemptedCount, setUnattemptedCount] = useState(0);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});

  const submittedRef = useRef(false);

  useEffect(() => {
    // Basic anti-cheat: disable right click
    const handleContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // Anti-cheat: Auto-submit on tab switch
    const handleVisibilityChange = () => {
      if (document.hidden && !submittedRef.current && testData) {
        alert("Anti-Cheat Warning: Tab switched! The test is automatically submitted.");
        submitTest(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [testData]);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await fetch(`/api/admin/store/test?testId=${testId}`);
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions || []);
          
          // Fetch purchases to find the test details
          const purRes = await fetch('/api/student/purchases');
          if (purRes.ok) {
            const purData = await purRes.json();
            const purchase = purData.purchases.find((p: any) => p.item.onlineTests.some((t: any) => t.id === testId));
            if (purchase) {
              const test = purchase.item.onlineTests.find((t: any) => t.id === testId);
              setTestData(test);
              setTimeLeft(test.durationMinutes * 60);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchTest();
  }, [testId]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;

    if (timeLeft <= 0) {
      alert("Time is up! Submitting automatically.");
      submitTest(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev! - 1);
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

  const submitTest = async (autoSubmitted = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    let calculatedScore = 0;
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    questions.forEach(q => {
      const studentAns = answers[q.id];
      if (studentAns === undefined) {
        unattempted++;
      } else if (studentAns === q.correctOption) {
        correct++;
        calculatedScore += q.marks;
      } else {
        incorrect++;
      }
    });

    setScore(calculatedScore);
    setCorrectCount(correct);
    setIncorrectCount(incorrect);
    setUnattemptedCount(unattempted);

    const timeTaken = testData ? (testData.durationMinutes * 60) - (timeLeft || 0) : 0;

    try {
      await fetch('/api/student/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlineTestId: testId,
          score: calculatedScore,
          timeTaken,
          autoSubmitted
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getAiExplanation = async (q: any, studentAns: number | undefined) => {
    setLoadingAi(prev => ({ ...prev, [q.id]: true }));
    try {
      const res = await fetch('/api/student/test/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: q.questionText,
          options: JSON.parse(q.options),
          studentAnswer: studentAns !== undefined ? JSON.parse(q.options)[studentAns] : 'Not Attempted',
          correctAnswer: JSON.parse(q.options)[q.correctOption]
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

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>🌀 Loading premium test environment...</div>;
  if (!testData) return <div style={{ padding: '4rem', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>⚠️ Unauthorized or Test Not Found. Please buy the test series first.</div>;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[activeQuestionIdx];
  const attemptedCount = Object.keys(answers).length;

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .test-grid-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 1024px) {
          .test-grid-layout {
            grid-template-columns: 1fr;
          }
        }
        .option-card-interactive {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--card-bg-alt);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .option-card-interactive:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
          background: rgba(59, 130, 246, 0.05);
          box-shadow: 0 8px 15px rgba(59, 130, 246, 0.1);
        }
        .option-card-interactive.selected {
          border-color: var(--primary);
          background: rgba(59, 130, 246, 0.12);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
        }
        .status-dot-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .status-dot-btn.active {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
      `}} />

      {/* Header Panel */}
      <header className="glass-card" style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '0.75rem', zIndex: 100, border: '1px solid var(--border)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>Sudhir Tutorials Online Testing Desk</span>
          <h1 style={{ fontSize: '1.4rem', margin: '0.2rem 0 0 0', fontWeight: 900 }}>{testData.title}</h1>
        </div>
        <div style={{ 
          background: timeLeft !== null && timeLeft < 180 ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.08)', 
          color: timeLeft !== null && timeLeft < 180 ? '#ef4444' : 'var(--primary)', 
          padding: '0.6rem 1.5rem', borderRadius: '12px', fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace',
          border: `1.5px solid ${timeLeft !== null && timeLeft < 180 ? '#ef4444' : 'var(--primary)'}`,
          boxShadow: `0 4px 15px ${timeLeft !== null && timeLeft < 180 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.1)'}`
        }}>
          ⏱️ {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
        </div>
      </header>

      {submitted ? (
        /* Evaluation & Result Showcase Screen */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto', width: '100%', paddingBottom: '4rem' }}>
          
          <div className="glass-card animate-scale-up" style={{ padding: '3rem 2rem', textAlign: 'center', border: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ fontSize: '4.5rem', animation: 'bounce 1s infinite' }}>🏆</div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0 }}>Auto-Evaluation Complete</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: 0, fontSize: '0.95rem' }}>
              Your test has been checked and graded instantly. Below is your detailed analytical report card.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary)' }}>
                  {score} <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>/ {testData.totalMarks}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginTop: '0.5rem', letterSpacing: '0.5px' }}>Total Marks Scored</div>
              </div>

              <div style={{ height: '50px', width: '1px', background: 'var(--border)', display: 'none' }} className="separator-desktop" />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>{correctCount}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Correct</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ef4444' }}>{incorrectCount}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Wrong</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#6b7280' }}>{unattemptedCount}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Skipped</div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => router.push('/dashboard/student?tab=purchases')} 
              className="btn-primary" 
              style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', fontWeight: 800, borderRadius: '14px', marginTop: '1.5rem' }}
            >
              ← Back to Purchases
            </button>
          </div>

          {/* Test Questions Review Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Detailed Question Analysis</h3>
            
            {questions.map((q, idx) => {
              const optionsArr = JSON.parse(q.options);
              const studentAns = answers[q.id];
              const isCorrect = studentAns === q.correctOption;
              const isUnanswered = studentAns === undefined;

              return (
                <div 
                  key={q.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '2rem 1.75rem', 
                    border: `1.5px solid ${isUnanswered ? 'var(--border)' : isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    background: isUnanswered ? 'var(--card-bg)' : isCorrect ? 'rgba(16,185,129,0.02)' : 'rgba(239,68,68,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)' }}>QUESTION {idx + 1}</span>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                      background: isUnanswered ? 'rgba(255,255,255,0.05)' : isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: isUnanswered ? 'var(--text-muted)' : isCorrect ? '#10b981' : '#ef4444'
                    }}>
                      {isUnanswered ? 'Skipped' : isCorrect ? `Correct (+${q.marks})` : 'Incorrect (0)'}
                    </span>
                  </div>

                  <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0.5rem 0 1rem 0', lineHeight: 1.6 }}>{q.questionText}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {optionsArr.map((opt: string, optIdx: number) => {
                      let optionStyle: any = {
                        padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.95rem', border: '1px solid var(--border)'
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
                          {opt}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div style={{ background: 'var(--card-bg-alt)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)', marginTop: '0.5rem' }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Textbook Explanation:</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{q.explanation}</span>
                    </div>
                  )}

                  {aiExplanations[q.id] ? (
                    <div className="animate-fade-in" style={{ background: 'rgba(59, 130, 246, 0.04)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🤖</span>
                        <strong style={{ color: '#3b82f6', fontSize: '0.85rem', textTransform: 'uppercase' }}>ST Guru ji Answer Analysis:</strong>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: marked(aiExplanations[q.id]) }} />
                    </div>
                  ) : (
                    <button 
                      onClick={() => getAiExplanation(q, studentAns)} 
                      disabled={loadingAi[q.id]}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', 
                        border: '1px dashed rgba(59, 130, 246, 0.4)', padding: '0.6rem 1.25rem', 
                        borderRadius: '10px', cursor: loadingAi[q.id] ? 'not-allowed' : 'pointer',
                        fontWeight: 700, transition: 'all 0.2s', width: 'fit-content', fontSize: '0.85rem', marginTop: '0.5rem'
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
              <div className="glass-card" style={{ padding: '2rem 2.5rem', minHeight: '400px', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
                
                {/* Active Question Info Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>Question {activeQuestionIdx + 1} of {questions.length}</span>
                    {flagged[currentQuestion.id] && (
                      <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>🚩 FLAGGED</span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                    {currentQuestion.marks} Marks
                  </span>
                </div>

                {/* Question Text */}
                <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: '1rem 0 2rem 0', lineHeight: 1.6 }}>
                  {currentQuestion.questionText}
                </p>

                {/* Option Selections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  {JSON.parse(currentQuestion.options).map((opt: string, optIdx: number) => {
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
                          style={{ width: '1.15rem', height: '1.15rem', accentColor: 'var(--primary)', margin: 0 }}
                        />
                        <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                          <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem', fontWeight: 800 }}>{String.fromCharCode(65 + optIdx)}.</span>
                          {opt}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Question Bottom Action Controller */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      disabled={activeQuestionIdx === 0}
                      onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                      className="btn-secondary"
                      style={{ padding: '0.7rem 1.25rem', borderRadius: '10px', cursor: activeQuestionIdx === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => toggleFlag(currentQuestion.id)}
                      className="btn-secondary"
                      style={{ 
                        padding: '0.7rem 1.25rem', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        background: flagged[currentQuestion.id] ? 'rgba(245,158,11,0.1)' : 'transparent',
                        borderColor: flagged[currentQuestion.id] ? '#f59e0b' : 'var(--border)',
                        color: flagged[currentQuestion.id] ? '#f59e0b' : 'var(--text)'
                      }}
                    >
                      {flagged[currentQuestion.id] ? '🏳️ Unflag' : '🚩 Flag for Review'}
                    </button>
                  </div>

                  {activeQuestionIdx < questions.length - 1 ? (
                    <button
                      onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                      className="btn-primary"
                      style={{ padding: '0.7rem 1.5rem', borderRadius: '10px' }}
                    >
                      Save & Next →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to finish and submit the test?")) {
                          submitTest(false);
                        }
                      }}
                      className="btn-primary"
                      style={{ padding: '0.7rem 2rem', borderRadius: '10px', background: '#10b981' }}
                    >
                      Submit Test ✓
                    </button>
                  )}
                </div>

              </div>
            ) : (
              <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No questions exist inside this online test.
              </div>
            )}
          </div>

          {/* Right Column: Status Grid Navigator */}
          <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Test Progress Navigator</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '2rem' }}>
              {questions.map((q, idx) => {
                const isAttempted = answers[q.id] !== undefined;
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Questions:</span>
                <strong style={{ fontSize: '0.9rem' }}>{questions.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Answered:</span>
                </div>
                <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>{attemptedCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Flagged:</span>
                </div>
                <strong style={{ color: '#f59e0b', fontSize: '0.9rem' }}>{Object.values(flagged).filter(Boolean).length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--border)', borderRadius: '50%' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Not Answered:</span>
                </div>
                <strong style={{ fontSize: '0.9rem' }}>{questions.length - attemptedCount}</strong>
              </div>
            </div>

            {/* Quick Submit Block */}
            <button
              onClick={() => {
                if (confirm("Are you sure you want to finish and submit the test?")) {
                  submitTest(false);
                }
              }}
              className="btn-primary"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, marginTop: '2rem', border: 'none', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
            >
              Finish & Submit Test
            </button>

          </div>

        </div>
      )}
    </div>
  );
}
