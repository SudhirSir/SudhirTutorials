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
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});

  // References for strict anti-cheat
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
          setQuestions(data.questions);
          // For now, we assume test data comes with questions or we fetch it from another endpoint.
          // Since our endpoint returns only questions, we should fetch test details or just pass duration from previous page.
          // Since we need duration here securely, let's fetch it if possible. But for simplicity, we'll default to 60 or fetch from purchase.
          
          // Let's fetch purchases to find the test details
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

  const submitTest = async (autoSubmitted = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    let calculatedScore = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctOption) {
        calculatedScore += q.marks;
      }
    });

    setScore(calculatedScore);

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

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Test Environment...</div>;
  if (!testData) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Unauthorized or Test Not Found. Please purchase the test series first.</div>;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '1rem', zIndex: 50 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{testData.title}</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Do not switch tabs or exit fullscreen.</p>
        </div>
        <div style={{ background: timeLeft !== null && timeLeft < 300 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', color: timeLeft !== null && timeLeft < 300 ? '#ef4444' : 'var(--primary)', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace' }}>
          ⏳ {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
        </div>
      </header>

      {submitted ? (
        <div className="glass-card" style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Test Submitted!</h2>
            <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '2rem' }}>
              {score} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ {testData.totalMarks}</span>
            </div>
            <button onClick={() => router.push('/dashboard/student')} className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', marginBottom: '3rem' }}>
              Return to Dashboard
            </button>
          </div>

          <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Review Incorrect Answers</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {questions.filter(q => answers[q.id] !== q.correctOption).map((q, i) => {
              const optionsArr = JSON.parse(q.options);
              const studentAns = answers[q.id];
              const isUnanswered = studentAns === undefined;
              return (
                <div key={q.id} style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                  <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1rem' }}>{q.questionText}</p>
                  
                  <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ color: '#ef4444', fontWeight: 600 }}>
                      ❌ Your Answer: {isUnanswered ? 'Not Attempted' : optionsArr[studentAns]}
                    </div>
                    <div style={{ color: '#10b981', fontWeight: 600 }}>
                      ✅ Correct Answer: {optionsArr[q.correctOption]}
                    </div>
                  </div>

                  {q.explanation ? (
                    <div style={{ background: 'var(--input-bg)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--secondary)', marginBottom: '1rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--secondary)' }}>Explanation:</strong>
                      <span style={{ color: 'var(--text-muted)' }}>{q.explanation}</span>
                    </div>
                  ) : null}

                  {aiExplanations[q.id] ? (
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🤖</span>
                        <strong style={{ color: '#3b82f6' }}>ST Guru ji Explanation:</strong>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: marked(aiExplanations[q.id]) }} />
                    </div>
                  ) : (
                    <button 
                      onClick={() => getAiExplanation(q, studentAns)} 
                      disabled={loadingAi[q.id]}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', 
                        border: '1px dashed rgba(59, 130, 246, 0.4)', padding: '0.75rem 1rem', 
                        borderRadius: '8px', cursor: loadingAi[q.id] ? 'not-allowed' : 'pointer',
                        fontWeight: 600, transition: 'all 0.2s', width: 'fit-content'
                      }}
                    >
                      {loadingAi[q.id] ? '🤖 Analyzing question...' : '🤖 Ask ST Guru ji why this is wrong'}
                    </button>
                  )}
                </div>
              );
            })}
            
            {questions.filter(q => answers[q.id] !== q.correctOption).length === 0 && (
              <div style={{ textAlign: 'center', color: '#10b981', padding: '2rem', fontWeight: 600 }}>
                Perfect Score! You got everything right! 🎉
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {questions.map((q, i) => (
            <div key={q.id} className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Question {i + 1}</h3>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>{q.marks} Marks</span>
              </div>
              <p style={{ fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>{q.questionText}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {JSON.parse(q.options).map((opt: string, optIdx: number) => (
                  <label key={optIdx} style={{ 
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                    borderRadius: '12px', border: answers[q.id] === optIdx ? '2px solid var(--primary)' : '1px solid var(--border)', 
                    background: answers[q.id] === optIdx ? 'rgba(59,130,246,0.1)' : 'var(--input-bg)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    <input 
                      type="radio" 
                      name={`question-${q.id}`} 
                      checked={answers[q.id] === optIdx}
                      onChange={() => handleAnswerChange(q.id, optIdx)}
                      style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '1.05rem' }}>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button onClick={() => submitTest(false)} className="btn-primary" style={{ padding: '1.5rem', fontSize: '1.2rem', marginTop: '2rem' }}>
            Submit Test
          </button>
        </div>
      )}
    </div>
  );
}
