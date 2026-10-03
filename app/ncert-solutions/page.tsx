"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NCERT_DATA, NcertChapter, NcertExercise, NcertQuestion } from '@/lib/ncertData';

export default function NcertSolutionsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string>("class-9");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("maths");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("ch-1");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("ex-1-1");
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Copy & Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Audio state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingQuestionId, setSpeakingQuestionId] = useState<string | null>(null);

  // Mobile navigation tab view
  const [activeMobileView, setActiveMobileView] = useState<'chapters' | 'questions'>('questions');

  // Hydration & KaTeX loading state check
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [katexReady, setKatexReady] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    let interval: any = null;
    const checkKatex = () => {
      if (typeof window !== 'undefined' && (window as any).katex) {
        setKatexReady(true);
        if (interval) clearInterval(interval);
      }
    };
    checkKatex();
    interval = setInterval(checkKatex, 250);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const activeClass = useMemo(() => {
    return NCERT_DATA.find(c => c.id === selectedClassId) || null;
  }, [selectedClassId]);

  const ALL_CLASSES = useMemo(() => [
    { id: "class-6", label: "Class 6th", isJunior: true },
    { id: "class-7", label: "Class 7th", isJunior: true },
    { id: "class-8", label: "Class 8th", isJunior: true },
    { id: "class-9", label: "Class 9th", isJunior: true },
    { id: "class-10", label: "Class 10th", isJunior: true },
    { id: "class-11", label: "Class 11th", isJunior: false },
    { id: "class-12", label: "Class 12th", isJunior: false }
  ], []);

  const currentClassObj = useMemo(() => {
    return ALL_CLASSES.find(c => c.id === selectedClassId) || null;
  }, [ALL_CLASSES, selectedClassId]);

  const selectedClassLabel = currentClassObj ? currentClassObj.label : 'Class';

  const availableSubjects = useMemo(() => {
    if (!currentClassObj) return [];
    if (currentClassObj.isJunior) {
      return [
        { id: 'maths', name: '📐 Mathematics (गणित)', hasData: ['class-6', 'class-7', 'class-8', 'class-9', 'class-10'].includes(selectedClassId) },
        { id: 'science', name: '🔬 Science (विज्ञान)', hasData: false }
      ];
    } else {
      return [
        { id: 'maths', name: '📐 Mathematics (गणित)', hasData: ['class-11', 'class-12'].includes(selectedClassId) },
        { id: 'physics', name: '⚛️ Physics (भौतिक)', hasData: false },
        { id: 'chemistry', name: '🧪 Chemistry (रसायन)', hasData: false },
        { id: 'biology', name: '🧬 Biology (जीव)', hasData: false }
      ];
    }
  }, [currentClassObj, selectedClassId]);

  const activeSubject = useMemo(() => {
    if (!activeClass) return null;
    return activeClass.subjects.find(s => s.id === selectedSubjectId) || activeClass.subjects[0] || null;
  }, [activeClass, selectedSubjectId]);

  const hasSolutionsAvailable = useMemo(() => {
    return !!(activeSubject && activeSubject.chapters && activeSubject.chapters.length > 0);
  }, [activeSubject]);

  const activeChapter = useMemo(() => {
    if (!hasSolutionsAvailable || !activeSubject) return null;
    return activeSubject.chapters.find(ch => ch.id === selectedChapterId) || activeSubject.chapters[0] || null;
  }, [hasSolutionsAvailable, activeSubject, selectedChapterId]);

  const activeExercise = useMemo(() => {
    if (!activeChapter) return null;
    return activeChapter.exercises.find(ex => ex.id === selectedExerciseId) || activeChapter.exercises[0] || null;
  }, [activeChapter, selectedExerciseId]);

  // Auto-sync active chapter and exercise when class or subject changes
  useEffect(() => {
    if (activeSubject && activeSubject.chapters.length > 0) {
      const chapterExists = activeSubject.chapters.some(ch => ch.id === selectedChapterId);
      if (!chapterExists) {
        const firstChapter = activeSubject.chapters[0];
        setSelectedChapterId(firstChapter.id);
        if (firstChapter.exercises.length > 0) {
          setSelectedExerciseId(firstChapter.exercises[0].id);
        }
      }
    }
  }, [selectedClassId, selectedSubjectId, activeSubject, selectedChapterId]);

  // When chapter changes, auto-select first exercise
  useEffect(() => {
    if (activeChapter && activeChapter.exercises.length > 0) {
      const exists = activeChapter.exercises.some(ex => ex.id === selectedExerciseId);
      if (!exists) {
        setSelectedExerciseId(activeChapter.exercises[0].id);
      }
    }
  }, [selectedChapterId, activeChapter, selectedExerciseId]);

  // Render KaTeX inline LaTeX formula strings with robust regex & fallback parser
  const formatLatexText = (text: string) => {
    if (!text) return '';
    try {
      const katex = isMounted && katexReady && typeof window !== 'undefined' ? (window as any).katex : null;

      const parseFallbackMath = (str: string) => {
        return str
          .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;padding:0 3px;line-height:1.1"><span style="border-bottom:1.5px solid currentColor;padding-bottom:1px;font-weight:700">$1</span><span style="font-weight:700">$2</span></span>')
          .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
          .replace(/\\neq\s*0/g, '≠ 0')
          .replace(/\\neq/g, '≠')
          .replace(/\\implies/g, '⇒')
          .replace(/\\times/g, '×')
          .replace(/\\div/g, '÷')
          .replace(/\\pm/g, '±')
          .replace(/\\pi/g, 'π')
          .replace(/\\Delta/g, 'Δ')
          .replace(/\\angle/g, '∠')
          .replace(/\\\^\circ/g, '°')
          .replace(/\^2/g, '²')
          .replace(/\^3/g, '³')
          .replace(/\\text\{([^}]+)\}/g, '$1');
      };

      // Match \x5C\(...\x5C\), \x5C[...\x5C], $$...$$ delimiters
      const mathRegex = /(?:\x5C\(|\x5C\[|\$\$)([\s\S]*?)(?:\x5C\)|\x5C\]|\$\$)/g;

      let hasMatches = false;
      const result = text.replace(mathRegex, (_, formula) => {
        hasMatches = true;
        const cleanFormula = formula.trim();
        if (katex) {
          try {
            return katex.renderToString(cleanFormula, { displayMode: false, throwOnError: false });
          } catch (e) {
            return parseFallbackMath(cleanFormula);
          }
        }
        return parseFallbackMath(cleanFormula);
      });

      if (!hasMatches) {
        if (text.includes('\\frac') || text.includes('\\neq') || text.includes('\\sqrt') || text.includes('\\implies')) {
          if (katex) {
            try {
              return katex.renderToString(text, { displayMode: false, throwOnError: false });
            } catch (e) {
              return parseFallbackMath(text);
            }
          }
          return parseFallbackMath(text);
        }
        return text;
      }

      return result;
    } catch (e) {
      return text;
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCopySolution = (q: NcertQuestion) => {
    const textToCopy = `NCERT Solution - ${activeChapter?.title || ''} (${activeExercise?.exerciseNumber})\n${q.questionNumber}: ${q.questionText}\n\nFinal Answer:\n${q.finalAnswer}\n\nSolved by SUDHIR TUTORIALS (https://sudhirtutorials.me/ncert-solutions)`;
    navigator.clipboard.writeText(textToCopy);
    showToast("📋 Solution copied to clipboard!");
  };

  const handleShareQuestion = (q: NcertQuestion) => {
    const shareUrl = `${window.location.origin}/ncert-solutions?chapter=${selectedChapterId}&exercise=${selectedExerciseId}&q=${q.id}`;
    navigator.clipboard.writeText(shareUrl);
    showToast("🔗 Question link copied!");
  };

  const handleSpeech = (q: NcertQuestion) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast("Audio synthesis is not supported on this browser.");
      return;
    }

    if (isSpeaking && speakingQuestionId === q.id) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingQuestionId(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    // Clean text for speech
    const cleanQuestion = q.questionText.replace(/\\\(/g, '').replace(/\\\)/g, '').replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 divided by $2');
    const cleanAnswer = q.finalAnswer.replace(/\\\(/g, '').replace(/\\\)/g, '').replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 divided by $2');
    
    const speechText = `Here is the solution for ${q.questionNumber}. Question: ${cleanQuestion}. Final Answer: ${cleanAnswer}`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingQuestionId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingQuestionId(null);
    };

    setIsSpeaking(true);
    setSpeakingQuestionId(q.id);
    window.speechSynthesis.speak(utterance);
  };

  // Filtered questions search
  const filteredQuestions = useMemo(() => {
    if (!activeExercise) return [];
    if (!searchQuery.trim()) return activeExercise.questions;

    const query = searchQuery.toLowerCase();
    return activeExercise.questions.filter(q => 
      q.questionNumber.toLowerCase().includes(query) ||
      q.questionText.toLowerCase().includes(query) ||
      q.finalAnswer.toLowerCase().includes(query) ||
      (q.keyConcept && q.keyConcept.toLowerCase().includes(query))
    );
  }, [activeExercise, searchQuery]);

  return (
    <div className="ncert-root" style={{ minHeight: '100vh', backgroundColor: 'var(--background)', color: 'var(--text)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: '50px',
          fontWeight: 700,
          fontSize: '0.9rem',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Floating Theme Toggle */}
      <div style={{ position: 'fixed', bottom: '4.125rem', right: '1.125rem', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      {/* Header Navigation Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderBottom: '1px solid var(--border)',
        padding: '0.85rem 1.5rem'
      }}>
        <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Image src="/logo.png" alt="Sudhir Tutorials Logo" width={32} height={32} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              <span style={{ fontSize: '1.15rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                <span style={{ color: '#ef4444' }}>SUDHIR</span> <span style={{ color: '#2563eb' }}>TUTORIALS</span>
              </span>
            </Link>

            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.25rem 0.75rem', borderRadius: '50px' }}>
              <span style={{ fontSize: '0.85rem' }}>📚</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ef4444', letterSpacing: '0.5px' }}>NCERT SOLUTIONS</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#ffffff',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: 0.95
            }}>
              🏠 Back to Home
            </Link>

            <Link href="/login" style={{
              padding: '0.45rem 1.1rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.82rem',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}>
              Login Portal ➔
            </Link>
          </div>

        </div>
      </header>

      {/* Main Hero Header Banner */}
      <section style={{
        background: 'radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.15) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 80%)',
        padding: '3rem 1.5rem 2rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.35rem 0.9rem', borderRadius: '50px', marginBottom: '1rem' }}>
            <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.78rem' }}>✨ 100% FREE STEP-BY-STEP EXPLANATIONS</span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 900, margin: '0 0 1.25rem 0', lineHeight: 1.2 }}>
            New NCERT Solutions for <span style={{ background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Class 6th to 12th</span>
          </h1>

          {/* Quick Search Bar */}
          <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
            <span style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', opacity: 0.6 }}>🔍</span>
            <input 
              type="text"
              placeholder="Search any chapter, formula, or question (e.g. rational numbers, Q1, Ex 1.1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.95rem 1.2rem 0.95rem 3.2rem',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                fontSize: '0.92rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            )}
          </div>

        </div>
      </section>

      {/* Class & Subject Selector Tabs Bar */}
      <section style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Step 1: Select Class */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, background: '#ef4444', color: '#ffffff', padding: '2px 8px', borderRadius: '50px', letterSpacing: '0.5px' }}>
                STEP 1
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Choose Your Class:
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflowX: 'auto', paddingBottom: '4px' }}>
              {ALL_CLASSES.map((cls) => {
                const isSelected = cls.id === selectedClassId;
                const isAvailable = ['class-6', 'class-7', 'class-8', 'class-9', 'class-10', 'class-11', 'class-12'].includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSelectedSubjectId('maths');
                      const clsData = NCERT_DATA.find(c => c.id === cls.id);
                      if (clsData && clsData.subjects.length > 0 && clsData.subjects[0].chapters.length > 0) {
                        const firstCh = clsData.subjects[0].chapters[0];
                        setSelectedChapterId(firstCh.id);
                        if (firstCh.exercises.length > 0) {
                          setSelectedExerciseId(firstCh.exercises[0].id);
                        }
                      }
                      if (!isAvailable) {
                        showToast(`NCERT Solutions for ${cls.label} are Coming Soon!`);
                      }
                    }}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '12px',
                      border: isSelected ? '1px solid #ef4444' : '1px solid var(--border)',
                      background: isSelected ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#ffffff' : 'var(--text)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 4px 15px rgba(239, 68, 68, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {cls.label} {!isAvailable && <span style={{ fontSize: '0.68rem', opacity: 0.8, background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '4px' }}>Coming Soon</span>} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Subject Selector - Appears ONLY AFTER Class is Selected */}
          {selectedClassId ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, background: '#2563eb', color: '#ffffff', padding: '2px 8px', borderRadius: '50px', letterSpacing: '0.5px' }}>
                  STEP 2
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Select Subject for {selectedClassLabel}:
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflowX: 'auto', paddingBottom: '4px' }}>
                {availableSubjects.map((sub) => {
                  const isSubSelected = selectedSubjectId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setSelectedSubjectId(sub.id);
                        if (!sub.hasData) {
                          showToast(`${sub.name} solutions for ${selectedClassLabel} are Coming Soon!`);
                        }
                      }}
                      style={{
                        padding: '0.5rem 1.15rem',
                        borderRadius: '10px',
                        border: isSubSelected ? '1px solid #2563eb' : '1px solid var(--border)',
                        background: isSubSelected ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                        color: isSubSelected ? '#3b82f6' : 'var(--text)',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {sub.name} {!sub.hasData && <span style={{ fontSize: '0.7rem', opacity: 0.75, marginLeft: '4px' }}>(Coming Soon)</span>} {isSubSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px dashed var(--border)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              👆 Please select a Class above to reveal available subject options.
            </div>
          )}

        </div>
      </section>

      {/* Main Content Layout: Sidebar Chapter List + Solution Viewer OR Coming Soon Banner */}
      <main style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '2rem' }}>
        
        {!hasSolutionsAvailable ? (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            margin: '1rem 0'
          }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem'
            }}>
              🚀
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              padding: '4px 14px',
              borderRadius: '50px',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              ✨ SOLUTIONS COMING SOON
            </div>

            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 900, margin: 0, color: 'var(--text)' }}>
              NCERT Solutions for <span style={{ color: '#ef4444' }}>{selectedClassLabel}</span> Are Coming Soon!
            </h2>

            <p style={{ maxWidth: '700px', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              Our expert faculty at <strong>Sudhir Tutorials</strong> is currently preparing complete chapter-wise exercises, step-by-step solutions, key formulas, and SVG geometry diagrams for {selectedClassLabel}. We update solutions daily!
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.75rem' }}>
              <button
                onClick={() => {
                  setSelectedClassId('class-8');
                  setSelectedSubjectId('maths');
                  setSelectedChapterId('ch-8-1');
                  setSelectedExerciseId('ex-8-1-1');
                }}
                style={{
                  padding: '0.75rem 1.6rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}
              >
                📐 Explore Class 8th Maths Solutions →
              </button>

              <button
                onClick={() => {
                  setSelectedClassId('class-9');
                  setSelectedSubjectId('maths');
                  setSelectedChapterId('ch-1');
                  setSelectedExerciseId('ex-1-1');
                }}
                style={{
                  padding: '0.75rem 1.6rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                }}
              >
                📐 Explore Class 9th Maths Solutions →
              </button>

              <button
                onClick={() => {
                  setSelectedClassId('class-10');
                  setSelectedSubjectId('maths');
                  setSelectedChapterId('ch-10-1');
                  setSelectedExerciseId('ex-10-1-1');
                }}
                style={{
                  padding: '0.75rem 1.6rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
                }}
              >
                📐 Explore Class 10th Maths Solutions →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2.5rem' }} className="ncert-layout-grid">
            
            {/* Mobile View Toggle Buttons */}
            <div style={{ gridColumn: '1 / -1', display: 'none' }} className="mobile-ncert-tabs">
              <div style={{ display: 'flex', background: 'var(--card-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <button 
                  onClick={() => setActiveMobileView('chapters')} 
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: activeMobileView === 'chapters' ? 'var(--primary)' : 'transparent', color: activeMobileView === 'chapters' ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  📖 Select Chapter ({activeSubject ? activeSubject.chapters.length : 0})
                </button>
                <button 
                  onClick={() => setActiveMobileView('questions')} 
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: activeMobileView === 'questions' ? 'var(--primary)' : 'transparent', color: activeMobileView === 'questions' ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  📝 View Solutions
                </button>
              </div>
            </div>

        {/* Sidebar: Chapter Accordion & Exercise Selectors */}
        <aside style={{ display: activeMobileView === 'chapters' ? 'flex' : undefined }} className="ncert-sidebar">
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'sticky',
            top: '5rem',
            maxHeight: 'calc(100vh - 6rem)',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                📖 CBSE {selectedClassLabel} Chapters
              </h3>
              <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 800, padding: '2px 8px', borderRadius: '50px' }}>
                {activeSubject?.chapters.length || 0} Chapters
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {activeSubject?.chapters.map((ch) => {
                const isSelected = ch.id === selectedChapterId;

                return (
                  <div key={ch.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      onClick={() => {
                        setSelectedChapterId(ch.id);
                        setActiveMobileView('questions');
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '12px',
                        border: isSelected ? `1px solid ${ch.color}` : '1px solid transparent',
                        background: isSelected ? `${ch.color}15` : 'rgba(255,255,255,0.02)',
                        color: isSelected ? ch.color : 'var(--text)',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                        <span style={{ fontSize: '1.1rem' }}>{ch.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            Ch {ch.chapterNumber}: {ch.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {ch.titleHindi}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', opacity: 0.8, background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '6px' }}>
                        {ch.exercises.length} Ex
                      </span>
                    </button>

                    {/* Sub-exercise links if selected */}
                    {isSelected && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '2.4rem', marginTop: '2px' }}>
                        {ch.exercises.map(ex => (
                          <button
                            key={ex.id}
                            onClick={() => {
                              setSelectedExerciseId(ex.id);
                              setActiveMobileView('questions');
                            }}
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              border: ex.id === selectedExerciseId ? `1px solid ${ch.color}` : '1px solid var(--border)',
                              background: ex.id === selectedExerciseId ? ch.color : 'transparent',
                              color: ex.id === selectedExerciseId ? '#ffffff' : 'var(--text-muted)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {ex.exerciseNumber.replace('Exercise ', 'Ex ')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </aside>

        {/* Main Section: Selected Chapter Details, Exercises Tabs & Solutions */}
        <section style={{ display: activeMobileView === 'questions' ? 'flex' : undefined, flexDirection: 'column', gap: '1.5rem' }} className="ncert-main-content">
          
          {/* Chapter Banner Info Card */}
          {activeChapter && (
            <div style={{
              background: 'var(--card-bg)',
              border: `1px solid ${activeChapter.color}44`,
              borderRadius: '24px',
              padding: '1.75rem',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <div style={{ position: 'absolute', right: '-1rem', top: '-1rem', fontSize: '6rem', opacity: 0.08, pointerEvents: 'none' }}>
                {activeChapter.icon}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: activeChapter.color, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Chapter {activeChapter.chapterNumber} • NCERT CBSE {selectedClassLabel}
                </span>
              </div>

              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '0 0 0.35rem 0', color: 'var(--text)' }}>
                {activeChapter.title} ({activeChapter.titleHindi})
              </h2>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
                {activeChapter.description}
              </p>

            </div>
          )}

          {/* Exercise Heading & Summary */}
          {activeExercise && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  {activeExercise.exerciseNumber}: {activeExercise.title || activeChapter?.title || ''}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Step-by-step verified solutions by expert Sudhir Tutorials faculty.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🖨️ Print / Save Worksheet
              </button>
            </div>
          )}

          {/* Question Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((q) => (
                <div 
                  key={q.id} 
                  id={q.id}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Question Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '8px'
                      }}>
                        {q.questionNumber}
                      </span>
                      {q.difficulty && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '50px',
                          background: q.difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.1)' : q.difficulty === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: q.difficulty === 'Easy' ? '#10b981' : q.difficulty === 'Medium' ? '#f59e0b' : '#ef4444',
                          border: `1px solid ${q.difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.3)' : q.difficulty === 'Medium' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                          {q.difficulty}
                        </span>
                      )}
                    </div>

                    {/* Quick Action Tools */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleSpeech(q)}
                        title="Listen to Explanation in Sudhir Sir Voice"
                        style={{
                          background: isSpeaking && speakingQuestionId === q.id ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.4rem 0.75rem',
                          color: isSpeaking && speakingQuestionId === q.id ? '#ef4444' : 'var(--text)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {isSpeaking && speakingQuestionId === q.id ? '🔊 Speaking...' : '🔊 Listen'}
                      </button>

                      <button 
                        onClick={() => handleCopySolution(q)}
                        title="Copy Solution"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.4rem 0.75rem',
                          color: 'var(--text)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        📋 Copy
                      </button>

                      <button 
                        onClick={() => handleShareQuestion(q)}
                        title="Share Question Link"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.4rem 0.75rem',
                          color: 'var(--text)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🔗 Share
                      </button>
                    </div>
                  </div>

                  {/* Question Statement */}
                  <div>
                    <h4 suppressHydrationWarning style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: formatLatexText(q.questionText) }} />
                  </div>

                  {/* Key Concept Callout Box */}
                  {q.keyConcept && (
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      borderLeft: '4px solid #3b82f6',
                      borderRadius: '12px',
                      padding: '0.85rem 1.1rem',
                      fontSize: '0.88rem',
                      color: 'var(--text)',
                      lineHeight: 1.5
                    }}>
                      <div style={{ fontWeight: 800, color: '#3b82f6', marginBottom: '4px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        💡 Key Concept / Formula:
                      </div>
                      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: formatLatexText(q.keyConcept) }} />
                    </div>
                  )}

                  {/* Geometric Figure / Diagram (SVG) */}
                  {q.diagramSvg && (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📐 Geometry Figure / Figure Diagram:
                      </div>
                      <div 
                        suppressHydrationWarning
                        dangerouslySetInnerHTML={{ __html: q.diagramSvg }} 
                        style={{ width: '100%', maxWidth: '520px', display: 'flex', justifyContent: 'center' }} 
                      />
                    </div>
                  )}

                  {/* Step-by-Step Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Step-by-Step Explanation:
                    </div>

                    {q.steps.map((step) => (
                      <div key={step.stepNumber} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border)',
                        borderRadius: '14px',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {step.stepNumber}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text)' }}>
                            {step.title}
                          </span>
                        </div>

                        <div 
                          suppressHydrationWarning
                          style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 500, lineHeight: 1.6, paddingLeft: '2rem', whiteSpace: 'pre-wrap' }}
                          dangerouslySetInnerHTML={{ __html: formatLatexText(step.content) }}
                        />

                        {step.formula && (
                          <div suppressHydrationWarning style={{
                            marginLeft: '2rem',
                            marginTop: '0.25rem',
                            padding: '0.6rem 0.9rem',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontFamily: 'monospace',
                            fontSize: '0.88rem',
                            color: '#10b981'
                          }} dangerouslySetInnerHTML={{ __html: formatLatexText(step.formula) }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Highlighted Final Answer Box */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '16px',
                    padding: '1rem 1.25rem',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      ✅ Final Answer:
                    </div>
                    <div 
                      suppressHydrationWarning
                      style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{ __html: formatLatexText(q.finalAnswer) }}
                    />
                  </div>

                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>No matching questions found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  Try adjusting your search term or select another exercise from the menu above.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    )}

  </main>

      {/* Responsive CSS Overrides for Mobile */}
      <style jsx global>{`
        @media (max-width: 900px) {
          .ncert-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .mobile-ncert-tabs {
            display: block !important;
          }
          .ncert-sidebar {
            display: ${activeMobileView === 'chapters' ? 'flex' : 'none'} !important;
          }
          .ncert-main-content {
            display: ${activeMobileView === 'questions' ? 'flex' : 'none'} !important;
          }
        }
      `}</style>
    </div>
  );
}
