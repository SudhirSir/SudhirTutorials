"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// Removed ScholarshipPredictor3D import

// Math/science formulas for the floating background animation
const floatingFormulas = [
  "E = mc²", "F = ma", "∇ × B = μ₀J", "pv = nRT", "sin²θ + cos²θ = 1",
  "∫ x dx = x²/2 + C", "H₂ + O₂ → H₂O", "λ = h/p", "V = IR", "i² = -1",
  "F = G(m₁m₂)/r²", "pH = -log[H⁺]"
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any).role || 'STUDENT';
      router.push(`/dashboard/${role.toLowerCase()}`);
    }
  }, [status, session, router]);

  // Target Exam state for College Matcher
  const [targetExam, setTargetExam] = useState<'JEE' | 'NEET'>('JEE');
  const [studyHours, setStudyHours] = useState<number>(6);
  const [mockScore, setMockScore] = useState<number>(75);
  const [predictorResult, setPredictorResult] = useState<{ rank: string; college: string; quote: string } | null>(null);

  // Daily Math Challenge states
  const [currentDay, setCurrentDay] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Admissions modal states
  const [showAdmissionsModal, setShowAdmissionsModal] = useState<boolean>(false);
  const [admissionsLoading, setAdmissionsLoading] = useState<boolean>(false);
  const [admissionsError, setAdmissionsError] = useState<string>("");
  const [admissionsSuccess, setAdmissionsSuccess] = useState<string | null>(null);

  // Careers modal states
  const [showCareersModal, setShowCareersModal] = useState<boolean>(false);
  const [careersName, setCareersName] = useState<string>("");
  const [careersEmail, setCareersEmail] = useState<string>("");
  const [careersPhone, setCareersPhone] = useState<string>("");
  const [careersPosition, setCareersPosition] = useState<string>("Mathematics Teacher");
  const [careersExperience, setCareersExperience] = useState<string>("");
  const [careersCoverLetter, setCareersCoverLetter] = useState<string>("");
  const [careersFile, setCareersFile] = useState<File | null>(null);
  const [careersSuccess, setCareersSuccess] = useState<string | null>(null);
  const [careersError, setCareersError] = useState<string>("");
  const [careersSubmitting, setCareersSubmitting] = useState<boolean>(false);

  // Bug Report states
  const [showReportBugModal, setShowReportBugModal] = useState<boolean>(false);
  const [reportTitle, setReportTitle] = useState<string>("");
  const [reportMessage, setReportMessage] = useState<string>("");
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);
  const [reportEmail, setReportEmail] = useState<string>("");
  const [reportScreenshot, setReportScreenshot] = useState<string | null>(null);

  // Admission form state
  const [admName, setAdmName] = useState("");
  const [admFatherName, setAdmFatherName] = useState("");
  const [admPhone, setAdmPhone] = useState("");
  const [admEmail, setAdmEmail] = useState("");
  const [admAddress, setAdmAddress] = useState("");
  const [admClass, setAdmClass] = useState("");
  const [admBoard, setAdmBoard] = useState("");
  const [admProgram, setAdmProgram] = useState("");
  const [admDob, setAdmDob] = useState("");
  const [admMessage, setAdmMessage] = useState("");

  // AI Assistant states
  const [doubtText, setDoubtText] = useState<string>("");
  const [doubtResponse, setDoubtResponse] = useState<string>("");
  const [typingDoubt, setTypingDoubt] = useState<boolean>(false);

  // Math problems rotating daily (Index 0-6 corresponding to new Date().getDay())
  const mathQuestions = [
    {
      q: "Find the limit: lim (x->0) [sin(5x) / x].",
      options: [
        { id: "A", text: "1", correct: false },
        { id: "B", text: "5", correct: true },
        { id: "C", text: "1/5", correct: false },
        { id: "D", text: "0", correct: false }
      ],
      explanation: "Using the standard limit formula: lim (u->0) [sin(u) / u] = 1. Multiply and divide by 5: lim (x->0) [5 * sin(5x) / 5x] = 5 * 1 = 5."
    },
    {
      q: "If log₂ (x - 3) = 4, what is the value of x?",
      options: [
        { id: "A", text: "19", correct: true },
        { id: "B", text: "11", correct: false },
        { id: "C", text: "7", correct: false },
        { id: "D", text: "16", correct: false }
      ],
      explanation: "Convert the logarithmic equation to exponential form: x - 3 = 2⁴. Since 2⁴ = 16, we get x - 3 = 16, which simplifies to x = 19."
    },
    {
      q: "What is the derivative of x * ln(x) with respect to x?",
      options: [
        { id: "A", text: "ln(x) + 1", correct: true },
        { id: "B", text: "ln(x)", correct: false },
        { id: "C", text: "1/x", correct: false },
        { id: "D", text: "1", correct: false }
      ],
      explanation: "Use the product rule: d/dx [f(x)g(x)] = f'(x)g(x) + f(x)g'(x). Here, d/dx [x * ln(x)] = (1)*ln(x) + x*(1/x) = ln(x) + 1."
    },
    {
      q: "Find the area bounded by the curve y = x² and the x-axis from x = 0 to x = 3.",
      options: [
        { id: "A", text: "3", correct: false },
        { id: "B", text: "9", correct: true },
        { id: "C", text: "27", correct: false },
        { id: "D", text: "6", correct: false }
      ],
      explanation: "Evaluate the definite integral of x² from 0 to 3: ∫[0 to 3] x² dx = [x³/3] evaluated from 0 to 3 = 3³/3 - 0 = 9."
    },
    {
      q: "What is the sum of the infinite geometric series: 12 + 6 + 3 + 1.5 + ... ?",
      options: [
        { id: "A", text: "18", correct: false },
        { id: "B", text: "24", correct: true },
        { id: "C", text: "16", correct: false },
        { id: "D", text: "30", correct: false }
      ],
      explanation: "Use the infinite sum formula: S = a / (1 - r), where first term a = 12, and common ratio r = 0.5. S = 12 / (1 - 0.5) = 12 / 0.5 = 24."
    },
    {
      q: "If sin(θ) + cos(θ) = √2, what is the value of sin(2θ)?",
      options: [
        { id: "A", text: "1", correct: true },
        { id: "B", text: "1/2", correct: false },
        { id: "C", text: "0", correct: false },
        { id: "D", text: "√2", correct: false }
      ],
      explanation: "Square both sides: (sin(θ) + cos(θ))² = (√2)². This gives sin²(θ) + cos²(θ) + 2sin(θ)cos(θ) = 2. Since sin²(θ) + cos²(θ) = 1, we get 1 + sin(2θ) = 2, so sin(2θ) = 1."
    },
    {
      q: "What is the value of the determinant of the matrix [[3, 5], [2, 4]]?",
      options: [
        { id: "A", text: "2", correct: true },
        { id: "B", text: "22", correct: false },
        { id: "C", text: "7", correct: false },
        { id: "D", text: "-2", correct: false }
      ],
      explanation: "The determinant of a 2x2 matrix [[a, b], [c, d]] is ad - bc. Thus, det = (3 * 4) - (5 * 2) = 12 - 10 = 2."
    }
  ];

  useEffect(() => {
    setCurrentDay(new Date().getDay());
  }, []);

  const quizQuestion = mathQuestions[currentDay];

  // College matching logic
  const calculateDreamCollege = () => {
    let rank = "";
    let college = "";
    let quote = "";

    if (targetExam === 'JEE') {
      if (studyHours >= 10 && mockScore >= 90) {
        rank = "AIR 100 - 500";
        college = "IIT Bombay / IIT Delhi (Computer Science)";
        quote = "Outstanding! You are operating at the level of top-tier IITians. Sudhir Tutorials' advanced rank files will help you cement this target!";
      } else if (studyHours >= 8 && mockScore >= 75) {
        rank = "AIR 800 - 2500";
        college = "IIT Roorkee / IIT Kharagpur (Electrical / Mechanical)";
        quote = "Excellent core strength. Directing focused mock test analysis will safely elevate you into the core IIT branches.";
      } else if (studyHours >= 6 && mockScore >= 60) {
        rank = "AIR 3000 - 8000";
        college = "NIT Trichy / DTU Delhi (Computer Science / IT)";
        quote = "Highly promising! With Sudhir Tutorials' structured practice matrices, you can easily turn this into a premium IIT selection.";
      } else {
        rank = "AIR 10000 - 25000";
        college = "Newer NITs / Top State Engineering Colleges";
        quote = "You have the talent, now let's build the discipline. Structured coaching and daily review will amplify your study hours by 3x.";
      }
    } else {
      // NEET
      if (studyHours >= 10 && mockScore >= 90) {
        rank = "AIR 50 - 300";
        college = "AIIMS New Delhi / Maulana Azad Medical College (MAMC)";
        quote = "Sensational biology speed and chemistry recall! MAMC/AIIMS is within your grasp. Maintain this peak conceptual state.";
      } else if (studyHours >= 8 && mockScore >= 75) {
        rank = "AIR 500 - 1500";
        college = "VMMC New Delhi / Lady Hardinge Medical College";
        quote = "Excellent baseline. Focus on resolving minor physics errors. Your government medical seat is well within range.";
      } else if (studyHours >= 6 && mockScore >= 60) {
        rank = "AIR 2000 - 6000";
        college = "Top State Government Medical Colleges";
        quote = "Very strong. Our intense test series will help you transition from the state-level lists into the national elite ranks.";
      } else {
        rank = "AIR 8000 - 20000";
        college = "State Colleges / Reputed Semi-Govt Universities";
        quote = "Consistency beats intensity. Leveraging our concept maps and mock test feedback will safely double your output.";
      }
    }

    setPredictorResult({ rank, college, quote });
  };

  useEffect(() => {
    calculateDreamCollege();
  }, [targetExam, studyHours, mockScore]);

  const resetQuiz = () => {
    setQuizAnswer(null);
    setQuizSubmitted(false);
  };

  // Admissions submit handler
  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdmissionsLoading(true);
    setAdmissionsError("");
    setAdmissionsSuccess(null);

    // Validate
    if (!admName.trim() || !admFatherName.trim() || !admPhone.trim() || !admAddress.trim() || !admClass || !admBoard || !admProgram || !admDob) {
      setAdmissionsError("Please fill out all required fields.");
      setAdmissionsLoading(false);
      return;
    }
    if (!/^\d{10}$/.test(admPhone.trim())) {
      setAdmissionsError("Phone number must be exactly 10 digits.");
      setAdmissionsLoading(false);
      return;
    }
    if (admName.length > 150 || !/^[a-zA-Z\s]+$/.test(admName)) {
      setAdmissionsError("Student name must contain only alphabets and spaces, and be at most 150 characters.");
      setAdmissionsLoading(false);
      return;
    }
    if (admFatherName.length > 150 || !/^[a-zA-Z\s]+$/.test(admFatherName)) {
      setAdmissionsError("Father's name must contain only alphabets and spaces, and be at most 150 characters.");
      setAdmissionsLoading(false);
      return;
    }
    if (admAddress.length > 150) {
      setAdmissionsError("Address must be at most 150 characters.");
      setAdmissionsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admissions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: admName,
          fatherName: admFatherName,
          phone: admPhone,
          email: admEmail,
          address: admAddress,
          className: admClass,
          board: admBoard,
          program: admProgram,
          dob: admDob,
          message: admMessage
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAdmissionsSuccess(data.appNumber);
        // Reset fields
        setAdmName("");
        setAdmFatherName("");
        setAdmPhone("");
        setAdmEmail("");
        setAdmAddress("");
        setAdmClass("");
        setAdmBoard("");
        setAdmProgram("");
        setAdmDob("");
        setAdmMessage("");
      } else {
        setAdmissionsError(data.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      setAdmissionsError("Network error. Could not connect to system.");
    } finally {
      setAdmissionsLoading(false);
    }
  };

  // Careers submit handler
  const handleCareersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCareersSubmitting(true);
    setCareersError("");
    setCareersSuccess(null);

    // Validate
    if (!careersName.trim() || !careersEmail.trim() || !careersPhone.trim() || !careersPosition || !careersExperience.trim()) {
      setCareersError("Please fill out all mandatory fields.");
      setCareersSubmitting(false);
      return;
    }
    if (!/^\d{10}$/.test(careersPhone.trim())) {
      setCareersError("Phone number must be exactly 10 digits.");
      setCareersSubmitting(false);
      return;
    }
    if (careersName.length > 150 || !/^[a-zA-Z\s]+$/.test(careersName)) {
      setCareersError("Name must contain only alphabets and spaces, and be at most 150 characters.");
      setCareersSubmitting(false);
      return;
    }
    if (!careersFile) {
      setCareersError("Please attach your resume file (PDF or DOCX).");
      setCareersSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', careersName);
      formData.append('email', careersEmail);
      formData.append('phone', careersPhone);
      formData.append('position', careersPosition);
      formData.append('experience', careersExperience);
      formData.append('coverLetter', careersCoverLetter);
      formData.append('file', careersFile);

      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setCareersSuccess(data.appNumber);
        // Reset fields
        setCareersName("");
        setCareersEmail("");
        setCareersPhone("");
        setCareersPosition("Mathematics Teacher");
        setCareersExperience("");
        setCareersCoverLetter("");
        setCareersFile(null);
      } else {
        setCareersError(data.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      setCareersError("Network error. Could not connect to system.");
    } finally {
      setCareersSubmitting(false);
    }
  };

  // Simulated AI Doubt Solver
  const handleSolveDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtText.trim()) return;
    setTypingDoubt(true);
    setDoubtResponse("");

    const query = doubtText.toLowerCase();
    let responseText = "That's a great question! Let's solve it. ";

    if (query.includes('newton') || query.includes('law')) {
      responseText += "Newton's Laws of Motion are foundational: \n1. First Law (Inertia): An object remains at rest or constant velocity unless acted upon by a force. \n2. Second Law: F = ma (Force equals mass times acceleration). \n3. Third Law: For every action, there is an equal and opposite reaction.";
    } else if (query.includes('photosynthesis') || query.includes('plant')) {
      responseText += "Photosynthesis is the process by which green plants manufacture food: \n6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂. It takes place in the chloroplasts using chlorophyll pigment.";
    } else if (query.includes('gravity') || query.includes('earth')) {
      responseText += "Gravity is the force of attraction between masses. Acceleration due to gravity (g) on Earth's surface is approximately 9.8 m/s². The universal law of gravitation is F = G(m₁m₂)/r².";
    } else if (query.includes('quadratic') || query.includes('formula')) {
      responseText += "The quadratic formula solves ax² + bx + c = 0. It is: x = [-b ± √(b² - 4ac)] / 2a. The term (b² - 4ac) is the discriminant, determining the nature of the roots.";
    } else {
      responseText += "Let's review the fundamental steps: Identify your given variables, choose the correct formula (e.g. kinematic equations or conservation laws), perform algebraic simplification, and verify your units. Ask your teacher in the next live lecture for an interactive walkthrough!";
    }

    let i = 0;
    const interval = setInterval(() => {
      setDoubtResponse(prev => prev + responseText.charAt(i));
      i++;
      if (i >= responseText.length) {
        clearInterval(interval);
        setTypingDoubt(false);
      }
    }, 20);
  };

  return (
    <main className="landing-page-root" style={{ overflowX: 'hidden', position: 'relative', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      
      {/* Decorative Grid and Ambient Lights */}
      <div className="grid-overlay"></div>
      <div className="glow-orb red-glow"></div>
      <div className="glow-orb blue-glow"></div>

      {/* Floating formulas background animations */}
      <div className="formula-bg">
        {floatingFormulas.map((formula, idx) => (
          <span key={idx} className={`floating-formula f-${idx}`} style={{
            left: `${(idx * 17) % 95}%`,
            top: `${(idx * 23) % 90}%`,
            animationDelay: `${idx * 1.5}s`,
            animationDuration: `${15 + (idx % 3) * 5}s`
          }}>
            {formula}
          </span>
        ))}
      </div>

      {/* Fixed Bottom-Right Viewport Theme Toggle (aligned vertically with bug button) */}
      <div style={{ position: 'fixed', bottom: '4.125rem', right: '1.125rem', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      {/* Sticky Premium Navbar */}
      <header className="navbar-container">
        <div className="navbar-logo">
          <Image src="/logo.png" alt="Sudhir Tutorials Logo" className="logo-img" width={36} height={36} style={{ width: '36px', height: '36px', objectFit: 'contain' }} priority />
          <span className="logo-text">
            <span className="text-red">SUDHIR</span> <span className="text-blue">TUTORIALS</span>
          </span>
        </div>
        <nav className="navbar-links">
          <Link href="#programs" className="nav-link">Flagship Programs</Link>
          <Link href="#about" className="nav-link">Why Us</Link>
          <span onClick={() => setShowCareersModal(true)} className="nav-link" style={{ cursor: 'pointer' }}>Careers</span>
          <span onClick={() => setShowAdmissionsModal(true)} className="nav-link" style={{ cursor: 'pointer' }}>Apply Admissions</span>
          <Link href="/login" className="login-portal-btn">
            🎓 Portal Login <span className="arrow">→</span>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="admission-pill animate-float" onClick={() => setShowAdmissionsModal(true)} style={{ cursor: 'pointer' }}>
            <span className="pill-emoji">🎒</span> Admissions Active for Academic Year 2026-27 (Apply Now)
          </div>
          <h1 className="hero-title">
            Unlock Academic Excellence.<br/>
            <span className="text-gradient">Prepare. Compete. Conquer.</span>
          </h1>
          <p className="hero-subtitle">
            Providing premium coaching and digital LMS ecosystems for JEE Main & Advanced, NEET, and Foundation courses. Real education designed by expert tutors.
          </p>
          <div className="hero-cta-buttons">
            <Link href="/login" className="btn-primary-hero">Student Login</Link>
            <button onClick={() => setShowAdmissionsModal(true)} className="btn-secondary-hero" style={{ cursor: 'pointer', border: '1.5px solid var(--border)' }}>
              📝 Admission Form
            </button>
          </div>
        </div>

        {/* Live Academic Widget (Interactive Card Carousel) */}
        <div className="hero-widget-panel">
          <div className="glass-card widget-card">
            <div className="widget-header">
              <span className="widget-badge">LIVE DEMO</span>
              <h3>Digital Guru Ji – AI Assistant</h3>
            </div>
            <p className="widget-intro">Type a question below to test our integrated AI Study Companion:</p>
            
            <form onSubmit={handleSolveDoubt} className="widget-form">
              <input 
                type="text" 
                placeholder="e.g. Explain Newton's laws or quadratic formula" 
                value={doubtText}
                onChange={e => setDoubtText(e.target.value)}
                className="widget-input"
                disabled={typingDoubt}
              />
              <button type="submit" className="widget-submit" disabled={typingDoubt}>
                {typingDoubt ? 'Solving...' : 'Ask Guru Ji'}
              </button>
            </form>

            <div className="widget-response-box">
              {doubtResponse ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--text)', margin: 0 }}>
                  {doubtResponse}
                  {typingDoubt && <span className="typing-cursor">|</span>}
                </pre>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  💡 Tip: Ask "What is Photosynthesis?" or "Newton's laws" to get instant answers.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Promotion Section */}
      <section className="mobile-app-section" id="mobile-app" style={{
        padding: '6rem 2rem',
        background: 'linear-gradient(180deg, var(--background) 0%, rgba(99, 102, 241, 0.05) 50%, var(--background) 100%)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div className="section-container" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4rem',
          alignItems: 'center'
        }}>
          <div className="mobile-app-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <span style={{
              background: 'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(37,99,235,0.15) 100%)',
              color: 'var(--primary)',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              alignSelf: 'flex-start'
            }}>
              Now on Android & iOS
            </span>
            
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              lineHeight: '1.2',
              margin: 0,
              color: 'var(--text)',
              letterSpacing: '-1px'
            }}>
              Download Our <span className="gradient-text">Mobile App</span>
            </h2>

            <p style={{
              fontSize: '1.05rem',
              lineHeight: '1.6',
              color: 'var(--text-muted)',
              margin: 0
            }}>
              Take your learning workspace wherever you go! With the official Sudhir Tutorials mobile companion, students can join live online batches, chat directly with teachers, receive instant notice board broadcasts, check schedules, and review fee ledger status on the move.
            </p>

            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '0.5rem 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {[
                '📅 Scrollable Daily/Weekly Batch Timetables',
                '💬 Safe & Secure Single-Sided Chat Deletion',
                '🔴 Live Broadcast Stream Player & Video Archive',
                '💵 Instant Online Fee Payments & PDF Receipt Downloads'
              ].map((benefit, idx) => (
                <li key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.95rem',
                  color: 'var(--text)',
                  fontWeight: 600
                }}>
                  {benefit}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '1rem' }}>
              <a 
                href="https://drive.google.com/drive/folders/1q1hIGvl-ilAepbElMnR3y96IRqnh32Gw?usp=drive_link" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  padding: '1rem 2rem',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  textDecoration: 'none',
                  boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)'
                }}
              >
                📲 Download Our Mobile App
              </a>
            </div>
          </div>

          <div className="mobile-app-image-side" style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Background glowing aura */}
            <div style={{
              position: 'absolute',
              width: '350px',
              height: '350px',
              background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(239,68,68,0.05) 50%, transparent 100%)',
              filter: 'blur(40px)',
              zIndex: 0
            }}></div>

            <div style={{
              position: 'relative',
              zIndex: 1,
              maxWidth: '100%',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              border: '1px solid var(--border)',
              transition: 'transform 0.4s ease'
            }}
            >
              <Image 
                src="/mobile_app_promo.png" 
                alt="Sudhir Sir and the Mobile App" 
                width={450} 
                height={450}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  height: 'auto',
                  objectFit: 'cover'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3D Showcase Highlights Section */}
      <section className="interactive-arena-section" style={{
        background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.02) 0%, var(--background) 100%)',
        padding: '3rem 6% 2rem 6%',
        zIndex: 2,
        position: 'relative'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2rem',
          perspective: '1000px'
        }}>
          {[
            { value: '98.4%', label: 'JEE/NEET Selection Rate', icon: '🏆', border: 'var(--primary)', shadow: 'rgba(239, 68, 68, 0.2)' },
            { value: '12 : 1', label: 'Student-Teacher Ratio', icon: '👨‍🏫', border: 'var(--secondary)', shadow: 'rgba(37, 99, 235, 0.2)' },
            { value: '24/7', label: 'AI + Offline Doubt Desk', icon: '⚡', border: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.2)' },
            { value: '10K+', label: 'Successful Alumni', icon: '🎓', border: '#10b981', shadow: 'rgba(16, 185, 129, 0.2)' }
          ].map((stat, idx) => (
            <div 
              key={idx}
              className="glass-card stat-3d-card"
              style={{
                padding: '2rem 1.5rem',
                textAlign: 'center',
                borderRadius: '20px',
                border: `1px solid ${stat.border}33`,
                background: 'var(--glass-bg)',
                transformStyle: 'preserve-3d',
                transform: 'translateZ(0)',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                cursor: 'pointer',
                ['--card-accent' as any]: stat.border,
                ['--card-shadow-color' as any]: stat.shadow
              }}
            >
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '0.5rem',
                transform: 'translateZ(30px)',
                display: 'inline-block'
              }}>{stat.icon}</div>
              <h4 style={{
                fontSize: '2.2rem',
                fontWeight: 900,
                color: 'var(--text-heading)',
                margin: '0 0 0.5rem 0',
                background: `linear-gradient(135deg, ${stat.border} 0%, var(--text-heading) 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                transform: 'translateZ(40px)'
              }}>{stat.value}</h4>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                fontWeight: 700,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transform: 'translateZ(20px)'
              }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Legacy & Achievements Grid */}
      <section id="legacy" className="interactive-arena-section">
        <div className="section-header">
          <h2 className="section-title">Our Legacy & Achievements</h2>
          <p className="section-subtitle">A decade of uncompromised excellence, shaping the minds of tomorrow's leaders, doctors, and engineers.</p>
        </div>

        <div className="arena-grid">
          {/* Item 1: Legacy Stats */}
          <div className="glass-card arena-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
              Numbers That Speak
            </h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '1.05rem', margin: 0 }}>
              At Sudhir Tutorials, our legacy isn't just measured by the years we've taught, but by the sheer volume of dreams we've realized. We consistently yield top-tier ranks in the nation's most competitive exams.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)' }}>10+</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Years of Excellence</div>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--secondary)' }}>1K+</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>IIT / Medical Selections</div>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981' }}>10,000+</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Students Mentored</div>
              </div>
            </div>
          </div>

          {/* Item 2: Daily Math Challenge */}
          <div className="glass-card arena-card">
            <div className="card-header-icon">
              <span className="icon">📐</span>
              <h3>Daily Math Challenge</h3>
            </div>
            <p className="card-desc">Practice daily rotating Mathematics questions. Students receive automated step-by-step grading logs.</p>

            <div className="quiz-question-box">
              {quizQuestion ? (
                <>
                  <p className="quiz-question-text" style={{ minHeight: '3.5rem' }}>{quizQuestion.q}</p>
                  
                  <div className="quiz-options-list">
                    {quizQuestion.options.map(opt => {
                      let btnBg = 'var(--surface)';
                      let btnBorder = 'var(--border)';
                      if (quizSubmitted) {
                        if (opt.correct) {
                          btnBg = 'rgba(16, 185, 129, 0.15)';
                          btnBorder = '#10b981';
                        } else if (quizAnswer === opt.id) {
                          btnBg = 'rgba(239, 68, 68, 0.15)';
                          btnBorder = '#ef4444';
                        }
                      } else if (quizAnswer === opt.id) {
                        btnBg = 'rgba(37, 99, 235, 0.15)';
                        btnBorder = 'var(--secondary)';
                      }

                      return (
                        <button 
                          key={opt.id}
                          onClick={() => !quizSubmitted && setQuizAnswer(opt.id)}
                          className="quiz-option-btn"
                          style={{ background: btnBg, borderColor: btnBorder }}
                          disabled={quizSubmitted}
                        >
                          <span className="opt-letter">{opt.id}.</span> {opt.text}
                        </button>
                      );
                    })}
                  </div>

                  {!quizSubmitted ? (
                    <button 
                      onClick={() => quizAnswer && setQuizSubmitted(true)}
                      className="btn-primary"
                      style={{ width: '100%', marginTop: '1rem', border: 'none' }}
                      disabled={!quizAnswer}
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <div className="quiz-explanation-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: quizQuestion.options.find(o => o.id === quizAnswer)?.correct ? '#10b981' : '#ef4444', marginBottom: '0.5rem' }}>
                        {quizQuestion.options.find(o => o.id === quizAnswer)?.correct ? "🎉 Correct Answer!" : "❌ Incorrect. Try again!"}
                      </div>
                      <p className="explanation-text">{quizQuestion.explanation}</p>
                      <button onClick={resetQuiz} className="btn-secondary" style={{ width: '100%', marginTop: '1rem', padding: '0.6rem' }}>Reset Challenge</button>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Loading today's challenge...</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Flagship Programs */}
      <section id="programs" className="programs-section">
        <div className="section-header">
          <h2 className="section-title">Our Flagship Programs</h2>
          <p className="section-subtitle">Exhaustive academic frameworks designed by top subject experts to secure elite ranks.</p>
        </div>

        <div className="programs-grid">
          {[
            { title: 'JEE Main & Advanced', subtitle: 'Class 11, 12 & Droppers', desc: 'Rigorous engineering preparation focusing on fundamental physics, organic chemistry, and advanced calculus.', color: 'var(--primary)' },
            { title: 'NEET (UG) Medical', subtitle: 'Class 11, 12 & Droppers', desc: 'Focused pre-medical training detailing human physiology, botanical systems, and organic chemistry mechanisms.', color: 'var(--secondary)' },
            { title: 'Pre-Foundation Academy', subtitle: 'Class 6 to 10', desc: 'Pre-enrollment program constructing analytical frameworks for NTSE, Olympiads, and future competitive courses.', color: '#f59e0b' }
          ].map((prog, i) => (
            <div key={i} className="glass-card program-card">
              <div className="card-top-accent" style={{ backgroundColor: prog.color }}></div>
              <h3 className="program-title">{prog.title}</h3>
              <div className="program-subtitle" style={{ color: prog.color }}>{prog.subtitle}</div>
              <p className="program-desc">{prog.desc}</p>
              <ul className="program-bullets">
                <li><span className="bullet-check" style={{ color: prog.color }}>✓</span> 500+ Hours Smart Lectures</li>
                <li><span className="bullet-check" style={{ color: prog.color }}>✓</span> Weekly Mock Papers & Ranks</li>
                <li><span className="bullet-check" style={{ color: prog.color }}>✓</span> Specialized Offline Doubt Counters</li>
              </ul>
              <button onClick={() => setShowAdmissionsModal(true)} className="program-btn" style={{ cursor: 'pointer' }}>Apply & Enroll Now</button>
            </div>
          ))}
        </div>
      </section>

      {/* Founder's Message Section */}
      <section className="features-section" style={{
        background: 'var(--surface-light)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        zIndex: 2,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="features-layout" style={{ gridTemplateColumns: '1fr 1fr', position: 'relative', zIndex: 1, alignItems: 'center' }}>
          {/* Founder Image on Left */}
          <div className="features-right" style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              maxWidth: '450px',
              width: '100%',
              padding: '1rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              boxShadow: 'var(--shadow)',
              position: 'relative'
            }}>
              <Image 
                src="/sudhirsir.jpg" 
                alt="Founder Sudhir Sir" 
                width={450}
                height={450}
                style={{
                  borderRadius: '16px',
                  display: 'block',
                  width: '100%',
                  height: 'auto'
                }}
              />
            </div>
          </div>

          {/* Founder Text on Right */}
          <div className="features-left" style={{ gap: '1.5rem' }}>
            <div className="admission-pill" style={{ margin: 0, alignSelf: 'flex-start' }}>
              🎯 Leadership Message
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, color: 'var(--text-heading)' }}>
              A Message from Our Founder
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0, fontStyle: 'italic', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>
              "At <span style={{ fontWeight: 800, color: 'var(--primary)' }}>SUDHIR</span> <span style={{ fontWeight: 800, color: 'var(--secondary)' }}>TUTORIALS</span>, we believe that education is not merely the transmission of textbook knowledge, but the ignition of a lifelong passion for critical thinking."
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
              Over the last decade, we have watched thousands of students walk through our doors, overcome their academic anxieties, and secure premium ranks in IITs, AIIMS, and state boards. Our pedagogy is built strictly on three core pillars: structured offline practice, transparent cognitive tracking, and empathetic personal mentorship. We don't just prepare you for examinations; we teach you how to think, learn, and conquer any analytical hurdle. Welcome to your bridge to academic excellence.
            </p>
            <div style={{ marginTop: '1rem' }}>
              <strong style={{ fontSize: '1.25rem', color: 'var(--text-heading)', display: 'block' }}>Sudhir Singh</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 650 }}>Founder & Maths Educator, <span style={{ color: 'var(--primary)', fontWeight: 800 }}>SUDHIR</span> <span style={{ color: 'var(--secondary)', fontWeight: 800 }}>TUTORIALS</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us / Features Section */}
      <section id="about" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Why Choose <span style={{ color: 'var(--primary)' }}>SUDHIR</span> <span style={{ color: 'var(--secondary)' }}>TUTORIALS</span>?</h2>
          <p className="section-subtitle" style={{ maxWidth: '800px' }}>
            We don't just teach subjects; we engineer learning habits. Discover how our hybrid ecosystem changes students' and parents' minds.
          </p>
        </div>

        <div className="features-layout">
          <div className="features-left">
            {[
              { 
                title: '🧠 Elite IITian & Doctor Mentorship', 
                desc: 'Learn directly from battle-tested educators who have cleared these elite exams themselves. Our faculty focuses on cognitive concept building rather than rote learning, bridging the gap between effort and high rank results.', 
                icon: '🎓' 
              },
              { 
                title: '📊 Cognitive Tracking & Transparency', 
                desc: 'Say goodbye to guesswork. Through our proprietary LMS dashboard, parents receive real-time, bank-style fee ledgers, detailed student attendance tracking, and micro-conceptual mock test performance analytics.', 
                icon: '💻' 
              },
              { 
                title: '⚡ Instant 12-Hour Doubt Counter', 
                desc: 'A student\'s doubt left unsolved is a rank compromised. We operate dedicated face-to-face offline doubt counters 12 hours a day, backed by our 24/7 AI-powered Doubt Solver for learning support at home.', 
                icon: '🔥' 
              }
            ].map((feat, i) => (
              <div key={i} className="feature-row feature-card-tilt" style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}>
                <div className="feature-icon" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)', color: 'var(--primary)' }}>{feat.icon}</div>
                <div>
                  <h3 className="feature-row-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>{feat.title}</h3>
                  <p className="feature-row-desc" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="features-right">
            <div className="image-card features-img-tilt" style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px',
              transition: 'transform 0.3s ease',
              cursor: 'pointer'
            }}>
              <Image 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop" 
                alt="Students studying collaboratively" 
                width={1200}
                height={800}
                priority
                className="features-img"
                style={{
                  borderRadius: '20px',
                  boxShadow: '0 15px 35px rgba(37, 99, 235, 0.15)',
                  border: '1px solid var(--border)'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <Image src="/logo.png" alt="Sudhir Tutorials Logo" className="footer-logo-img" width={32} height={32} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              <span><span style={{ color: 'var(--primary)', fontWeight: 900 }}>SUDHIR</span> <span style={{ color: 'var(--secondary)', fontWeight: 900 }}>TUTORIALS</span></span>
            </div>
            <p className="footer-desc">Constructing foundational excellence and securing top-tier competitive results for over a decade.</p>
            <div className="social-links">
              <a href="https://instagram.com/Sudhir_tutorials" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://facebook.com/Sudhir.Tutorials" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="https://youtube.com/@Sudhir_tutorials" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
              </a>
              <a href="https://twitter.com/sudhir_tutorial" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter / X">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l16 16M4 20L20 4"/><path d="M20 4H4l8 8-8 8h16L12 12l8-8z" style={{display:'none'}}/><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L2.25 2.25h6.934l4.265 5.636L18.244 2.25zM17.0 20.75h1.833L7.083 4.132H5.117L17.0 20.75z"/></svg>
              </a>
            </div>
          </div>

          <div className="footer-links-col">
            <h4>Academic Programs</h4>
            <ul>
              <li>JEE Main & Adv</li>
              <li>NEET (UG) Medical</li>
              <li>Pre-Foundation Academy</li>
              <li>Board Preparation Batches</li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>Institution Portal</h4>
            <ul>
              <li><Link href="/login" className="footer-link">Student Login</Link></li>
              <li><Link href="/login" className="footer-link">Teacher Panel</Link></li>
              <li><Link href="/login" className="footer-link">Admin Command Center</Link></li>
              <li><span onClick={() => setShowCareersModal(true)} className="footer-link" style={{ cursor: 'pointer' }}>Careers</span></li>
            </ul>
          </div>

          <div className="footer-links-col contact-col">
            <h4>Contact Info</h4>
            <ul>
              <li>📍 <a href="https://maps.google.com/?q=Haibowal,+Ludhiana,+Punjab" target="_blank" rel="noopener noreferrer" className="footer-link">Haibowal, Ludhiana, Punjab</a></li>
              <li>📞 <a href="tel:9914287998" className="footer-link">99142-87998</a></li>
              <li>✉️ <a href="mailto:sudhir.tutorials.ludhiana@gmail.com" className="footer-link" style={{ wordBreak: 'break-all' }}>sudhir.tutorials.ludhiana@gmail.com</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} Sudhir Tutorials Coaching Institute. All rights reserved.
        </div>
      </footer>

      {/* Admissions Inquiry Form Modal */}
      {showAdmissionsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div className="glass-card animate-scale-up" style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2.5rem',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowAdmissionsModal(false);
                setAdmissionsSuccess(null);
                setAdmissionsError("");
              }}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'var(--card-bg-alt)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              ×
            </button>

            {admissionsSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--secondary)' }}>Inquiry Submitted!</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Thank you for choosing Sudhir Tutorials. Your admission application has been registered successfully.
                </p>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px dashed var(--primary)',
                  padding: '1.25rem',
                  borderRadius: '16px',
                  display: 'inline-block',
                  marginBottom: '2rem'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Application Number</span>
                  <strong style={{ fontSize: '2rem', color: 'var(--primary)', letterSpacing: '1px' }}>{admissionsSuccess}</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Our academic counselors will contact you on your registered phone number shortly.
                </p>
                <button 
                  onClick={() => {
                    setShowAdmissionsModal(false);
                    setAdmissionsSuccess(null);
                  }}
                  className="btn-primary"
                  style={{ marginTop: '2rem', border: 'none', width: '100%' }}
                >
                  Close Window
                </button>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--primary)' }}>
                  🏫 Academic Admission Form
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                  Academic Year 2026-27 Enrollment. Please enter authentic academic and contact credentials to submit your admission inquiry.
                </p>

                {admissionsError && (
                  <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    ⚠️ {admissionsError}
                  </div>
                )}
                <form onSubmit={handleAdmissionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Grid for two columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid-2col">
                    <style>{`
                      @media (max-width: 600px) {
                        .form-grid-2col {
                          grid-template-columns: 1fr !important;
                        }
                      }
                    `}</style>
                    <div className="input-group">
                      <label className="input-label" style={{ marginBottom: '4px' }}>Student Name *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={150}
                        placeholder="e.g. Rahul Kumar" 
                        value={admName} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                            setAdmName(val);
                          }
                        }} 
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label" style={{ marginBottom: '4px' }}>Father's Name *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={150}
                        placeholder="e.g. Rajesh Kumar" 
                        value={admFatherName} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                            setAdmFatherName(val);
                          }
                        }} 
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid-2col">
                    <div className="input-group">
                      <label className="input-label" style={{ marginBottom: '4px' }}>Contact Phone *</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder="e.g. 9876543210" 
                        value={admPhone} 
                        maxLength={10}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          setAdmPhone(val);
                        }} 
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label" style={{ marginBottom: '4px' }}>Email Address (Optional)</label>
                      <input 
                        type="email" 
                        placeholder="e.g. rahul@gmail.com" 
                        value={admEmail} 
                        onChange={e => setAdmEmail(e.target.value)} 
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid-2col">
                    <div className="input-group">
                      <label className="input-label" style={{ marginBottom: '4px' }}>Date of Birth *</label>
                      <input 
                        type="date" 
                        required 
                        value={admDob} 
                        onChange={e => setAdmDob(e.target.value)} 
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label" style={{ marginBottom: '4px' }}>Target Class *</label>
                      <select 
                        required 
                        value={admClass} 
                        onChange={e => setAdmClass(e.target.value)} 
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                      >
                        <option value="">Select Class</option>
                        {Array.from({ length: 7 }, (_, i) => `Class ${i + 6}`).map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                        <option value="Droppers Batch">Droppers Batch</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid-2col">
                    <div className="input-group">
                      <label className="input-label" style={{ marginBottom: '4px' }}>Board *</label>
                      <select 
                        required 
                        value={admBoard} 
                        onChange={e => setAdmBoard(e.target.value)} 
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                      >
                        <option value="">Select Board</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="State Board">State Board</option>
                        <option value="IB">IB</option>
                        <option value="IGCSE">IGCSE</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label" style={{ marginBottom: '4px' }}>Academic Program *</label>
                      <select 
                        required 
                        value={admProgram} 
                        onChange={e => setAdmProgram(e.target.value)} 
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                      >
                        <option value="">Select Program</option>
                        <option value="JEE">JEE (Main & Advanced)</option>
                        <option value="NEET">NEET (Medical)</option>
                        <option value="Foundation">Pre-Foundation Academy</option>
                        <option value="Boards">Boards Masterclass</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label" style={{ marginBottom: '4px' }}>Address *</label>
                    <textarea 
                      required 
                      rows={2} 
                      maxLength={150}
                      value={admAddress} 
                      onChange={e => setAdmAddress(e.target.value)} 
                      style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', resize: 'vertical' }}
                      placeholder="Full residential address (max 150 characters)"
                    ></textarea>
                  </div>

                  <div className="input-group">
                    <label className="input-label" style={{ marginBottom: '4px' }}>Message or Query</label>
                    <textarea 
                      rows={2} 
                      value={admMessage} 
                      onChange={e => setAdmMessage(e.target.value)} 
                      style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', resize: 'vertical' }}
                      placeholder="Any questions or remarks? (Optional)"
                    ></textarea>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>* Your query will be answered through mail.</span>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ border: 'none', padding: '0.9rem', fontWeight: 800, marginTop: '0.5rem' }}
                    disabled={admissionsLoading}
                  >
                    {admissionsLoading ? "Submitting Inquiry..." : "🚀 Submit Admission Inquiry"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Careers Modal */}
      {showCareersModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div className="glass-card animate-scale-up" style={{
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2.5rem',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            position: 'relative',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowCareersModal(false);
                setCareersSuccess(null);
                setCareersError("");
              }}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'var(--card-bg-alt)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                zIndex: 10
              }}
            >
              ×
            </button>

            {careersSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>💼</div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--secondary)' }}>Application Submitted!</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem' }}>
                  Thank you for applying to Sudhir Tutorials. Your job application has been registered successfully.
                </p>
                <div style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px dashed var(--secondary)',
                  padding: '1.25rem',
                  borderRadius: '16px',
                  display: 'inline-block',
                  marginBottom: '2rem'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Application Ref Number</span>
                  <strong style={{ fontSize: '1.8rem', color: 'var(--secondary)', letterSpacing: '1px' }}>{careersSuccess}</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Our recruitment team will review your resume and contact you if your profile matches our requirements.
                </p>
                <button 
                  onClick={() => {
                    setShowCareersModal(false);
                    setCareersSuccess(null);
                  }}
                  className="btn-primary"
                  style={{ marginTop: '2rem', border: 'none', width: '100%' }}
                >
                  Close Window
                </button>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--primary)', letterSpacing: '-0.5px' }}>
                  Work with <span className="text-gradient">Sudhir Tutorials</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                  Join Ludhiana's premier academic coaching institute. We are always looking for passionate educators and administrators who want to make a real difference.
                </p>

                {/* Grid layout for info and form */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr', gap: '2.5rem' }} className="careers-modal-grid">
                  <style>{`
                    @media (max-width: 768px) {
                      .careers-modal-grid {
                        grid-template-columns: 1fr !important;
                        gap: 2rem !important;
                      }
                    }
                  `}</style>
                  
                  {/* Left Column: Work Culture & Perks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: 'var(--surface-light)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🧠 Our Pedagogy & Culture
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                        At Sudhir Tutorials, work culture is built strictly on academic freedom, structured practice, and collaborative teacher training. We believe in providing premium resources so you can focus on what matters most: mentoring minds.
                      </p>
                    </div>

                    <div style={{ background: 'var(--surface-light)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🎁 Perks & Benefits
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text)' }}>
                        <li>📈 <strong>Competitive Salary:</strong> Performance-based yearly increments.</li>
                        <li>🩺 <strong>Health Benefits:</strong> Comprehensive wellness coverage.</li>
                        <li>🚀 <strong>Professional Growth:</strong> Access to structured pedagogy training.</li>
                        <li>🎨 <strong>Digital Support:</strong> Custom LMS and AI assistant interfaces.</li>
                      </ul>
                    </div>

                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px dashed var(--primary)' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                        🎯 Current Openings
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                        • Mathematics Educator (IIT JEE Advanced)<br/>
                        • Physics Educator (JEE/NEET Main & Adv)<br/>
                        • Chemistry & Biology Faculty (Foundation/NEET)<br/>
                        • Academic Counselors & Operations Leads
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Application Form */}
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-heading)' }}>
                      Apply For a Position
                    </h3>

                    {careersError && (
                      <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem', fontSize: '0.8rem' }}>
                        ⚠️ {careersError}
                      </div>
                    )}

                    <form onSubmit={handleCareersSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="input-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-muted)', marginBottom: '4px' }}>Full Name *</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. Amit Sharma"
                          value={careersName}
                          onChange={e => setCareersName(e.target.value)}
                          style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                          <label style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-muted)', marginBottom: '4px' }}>Email *</label>
                          <input 
                            type="email" 
                            required 
                            placeholder="e.g. amit@mail.com"
                            value={careersEmail}
                            onChange={e => setCareersEmail(e.target.value)}
                            style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }}
                          />
                        </div>
                        <div className="input-group">
                          <label style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-muted)', marginBottom: '4px' }}>Phone *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="10-digit number"
                            value={careersPhone}
                            onChange={e => setCareersPhone(e.target.value)}
                            style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                        <div className="input-group">
                          <label style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-muted)', marginBottom: '4px' }}>Position Applied For *</label>
                          <select 
                            required 
                            value={careersPosition}
                            onChange={e => setCareersPosition(e.target.value)}
                            style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }}
                          >
                            <option value="Mathematics Teacher">Maths Teacher (JEE/NEET)</option>
                            <option value="Physics Teacher">Physics Teacher (JEE/NEET)</option>
                            <option value="Chemistry Teacher">Chemistry Teacher (JEE/NEET)</option>
                            <option value="Biology Teacher">Biology Teacher (NEET)</option>
                            <option value="Academic Counselor">Academic Counselor</option>
                            <option value="LMS Administrator">LMS Administrator</option>
                            <option value="Other">Other Position</option>
                          </select>
                        </div>
                        <div className="input-group">
                          <label style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-muted)', marginBottom: '4px' }}>Experience *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. 3 Years"
                            value={careersExperience}
                            onChange={e => setCareersExperience(e.target.value)}
                            style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }}
                          />
                        </div>
                      </div>

                      <div className="input-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-muted)', marginBottom: '4px' }}>Upload Resume (PDF/DOCX) *</label>
                        <input 
                          type="file" 
                          required 
                          accept=".pdf,.docx,.doc"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              setCareersFile(e.target.files[0]);
                            }
                          }}
                          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px dashed var(--border)', color: 'var(--text)', fontSize: '0.8rem', width: '100%' }}
                        />
                      </div>

                      <div className="input-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-muted)', marginBottom: '4px' }}>Cover Letter / Notes</label>
                        <textarea 
                          rows={2} 
                          placeholder="Tell us briefly about yourself..."
                          value={careersCoverLetter}
                          onChange={e => setCareersCoverLetter(e.target.value)}
                          style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', resize: 'vertical' }}
                        ></textarea>
                      </div>

                      <button 
                        type="submit" 
                        className="btn-primary" 
                        style={{ border: 'none', padding: '0.75rem', fontWeight: 800, marginTop: '0.25rem', width: '100%' }}
                        disabled={careersSubmitting}
                      >
                        {careersSubmitting ? "Uploading & Applying..." : "📨 Apply Now"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedded CSS styling for rich responsive aesthetics and human-coded micro-animations */}
      <style jsx global>{`
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(var(--border) 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.25;
          z-index: 1;
          pointer-events: none;
        }

        .glow-orb {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(140px);
          z-index: 0;
          opacity: 0.12;
          pointer-events: none;
        }
        .red-glow {
          top: 15%;
          left: -10%;
          background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
        }
        .blue-glow {
          bottom: 25%;
          right: -10%;
          background: radial-gradient(circle, var(--secondary) 0%, transparent 70%);
        }

        .formula-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .floating-formula {
          position: absolute;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-muted);
          opacity: 0.15;
          animation: float-around infinite ease-in-out;
        }

        @keyframes float-around {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          50% { transform: translateY(-30px) rotate(8deg) scale(1.05); }
        }

        .navbar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 6%;
          background: var(--glass-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--glass-border);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .logo-img {
          width: 36px;
          height: 36px;
          object-fit: contain;
          border-radius: 8px;
        }
        .logo-text {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          font-family: var(--font-poppins);
        }
        .text-red {
          color: var(--primary);
        }
        .text-blue {
          color: var(--secondary);
        }
        .navbar-links {
          display: flex;
          gap: 2rem;
          align-items: center;
        }
        .nav-link {
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9rem;
          transition: color 0.2s, transform 0.2s;
        }
        .nav-link:hover {
          color: var(--text-heading);
          transform: translateY(-1px);
        }
        .login-portal-btn {
          padding: 0.65rem 1.4rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
          border-radius: 30px;
          color: #fff;
          font-weight: 700;
          font-size: 0.88rem;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .login-portal-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
        }
        .login-portal-btn .arrow {
          transition: transform 0.2s;
          display: inline-block;
          margin-left: 2px;
        }
        .login-portal-btn:hover .arrow {
          transform: translateX(3px);
        }

        .hero-section {
          min-height: 85vh;
          display: flex;
          align-items: center;
          padding: 2rem 6%;
          gap: 4rem;
          position: relative;
          z-index: 2;
        }
        .hero-content { animation: slideUp3D 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; transform-origin: bottom center; 
          flex: 1.2;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .admission-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.25rem;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 99px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 2rem;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.05);
          transition: all 0.25s;
        }
        .admission-pill:hover {
          background: rgba(239, 68, 68, 0.15);
          transform: translateY(-2px);
        }
        .hero-title {
          font-size: 4rem;
          line-height: 1.15;
          margin-bottom: 1.5rem;
          font-weight: 900;
          letter-spacing: -0.03em;
        }
        .hero-subtitle {
          font-size: 1.15rem;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 2.5rem;
          max-width: 90%;
        }
        .hero-cta-buttons {
          display: flex;
          gap: 1.25rem;
          flex-wrap: wrap;
        }
        .btn-primary-hero {
          padding: 1.1rem 2.2rem;
          background: var(--primary);
          border-radius: 12px;
          color: #fff;
          font-weight: 800;
          font-size: 1.05rem;
          box-shadow: 0 5px 20px rgba(239, 68, 68, 0.35);
          transition: all 0.25s;
        }
        .btn-primary-hero:hover {
          transform: translateY(-2px);
          background: var(--primary-hover);
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.45);
        }
        .btn-secondary-hero {
          padding: 1.1rem 2.2rem;
          background: transparent;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          color: var(--text);
          font-weight: 800;
          font-size: 1.05rem;
          transition: all 0.25s;
        }
        .btn-secondary-hero:hover {
          background: var(--surface-light);
          border-color: var(--text-muted);
          transform: translateY(-2px);
        }

        .hero-widget-panel {
          flex: 0.9;
          display: flex;
          justify-content: center;
        }
        .widget-card {
          width: 100%;
          max-width: 440px;
          padding: 2rem;
          border-radius: 20px;
          border: 1px solid var(--glass-border);
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          box-shadow: var(--shadow-lg);
          transition: transform 0.3s;
        }
        .widget-header {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .widget-badge {
          align-self: flex-start;
          font-size: 0.68rem;
          font-weight: 800;
          background: var(--secondary);
          color: #fff;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.5px;
        }
        .widget-card h3 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 800;
        }
        .widget-intro {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }
        .widget-form {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .widget-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          color: var(--text);
          outline: none;
          font-size: 0.88rem;
        }
        .widget-input:focus {
          border-color: var(--secondary);
          background: var(--input-focus-bg);
        }
        .widget-submit {
          padding: 0.75rem 1.25rem;
          background: var(--secondary);
          color: #fff;
          border-radius: 10px;
          border: none;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .widget-submit:hover {
          background: var(--secondary-hover);
        }
        .widget-response-box {
          min-height: 110px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
          padding: 1rem;
          border: 1px solid var(--border);
          display: flex;
          align-items: flex-start;
        }
        .typing-cursor {
          display: inline-block;
          margin-left: 2px;
          font-weight: bold;
          color: var(--secondary);
          animation: blink 0.8s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .interactive-arena-section {
          padding: 6rem 6%;
          position: relative;
          z-index: 2;
        }
        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        .section-title {
          font-size: 2.6rem;
          font-weight: 900;
          margin-bottom: 1rem;
        }
        .section-subtitle {
          color: var(--text-muted);
          font-size: 1.1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .arena-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 2.5rem;
        }
        .arena-card {
          padding: 2.5rem;
          border-radius: 24px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(12px);
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }
        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .card-header-icon .icon {
          font-size: 2rem;
        }
        .card-header-icon h3 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 850;
        }
        .card-desc {
          font-size: 0.95rem;
          color: var(--text-muted);
          margin: 0 0 2rem 0;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .input-label {
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }
        .selector-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }
        .selector-btn {
          padding: 0.75rem 0.5rem;
          border-radius: 10px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .selector-btn.active {
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.25);
        }
        .slider-input {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 5px;
          background: var(--border);
          outline: none;
          margin: 0.75rem 0;
        }
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: transform 0.1s;
        }
        .slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .slider-ticks {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .scholarship-badge {
          background: rgba(239, 68, 68, 0.12);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 800;
        }

        .fee-output-box {
          background: rgba(0,0,0,0.15);
          border-radius: 16px;
          padding: 1.5rem;
          margin-top: 2rem;
          border: 1px solid var(--border);
        }
        .fee-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }
        .fee-row.discount {
          color: var(--primary);
          font-weight: 600;
        }
        .fee-divider {
          border: 0;
          border-top: 1px dashed var(--border);
          margin: 1rem 0;
        }
        .fee-row.total {
          align-items: center;
          margin-bottom: 0;
          color: var(--text);
          font-weight: 800;
        }
        .fee-net-price {
          font-size: 1.7rem;
          color: var(--secondary);
          font-weight: 900;
        }
        .month-span {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .quiz-question-box {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .quiz-question-text {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-heading);
          line-height: 1.5;
        }
        .quiz-options-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .quiz-option-btn {
          width: 100%;
          text-align: left;
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--card-bg-alt);
          color: var(--text);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .opt-letter {
          font-weight: 800;
          color: var(--text-muted);
        }
        .quiz-explanation-box {
          background: var(--surface-light);
          padding: 1.25rem;
          border-radius: 14px;
          border: 1px solid var(--border);
          margin-top: 0.5rem;
          animation: slide-down 0.3s ease-out;
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .explanation-text {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
        }

        .programs-section {
          padding: 6rem 6%;
          position: relative;
          z-index: 2;
        }
        .programs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }
        .program-card {
          padding: 2.5rem 2rem;
          border-radius: 20px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(12px);
          box-shadow: var(--shadow);
          position: relative;
          overflow: hidden;
          transition: transform 0.3s, border-color 0.3s;
        }
        .program-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255,255,255,0.15);
        }
        .card-top-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
        }
        .program-title {
          font-size: 1.5rem;
          font-weight: 850;
          margin-bottom: 0.5rem;
        }
        .program-subtitle {
          font-size: 0.85rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1.5rem;
        }
        .program-desc {
          font-size: 0.95rem;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 2rem;
          min-height: 70px;
        }
        .program-bullets {
          list-style: none;
          padding: 0;
          margin: 0 0 2.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .program-bullets li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .bullet-check {
          font-weight: 900;
        }
        .program-btn {
          display: block;
          text-align: center;
          width: 100%;
          padding: 1rem;
          background: var(--surface-light);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text);
          font-weight: 800;
          font-size: 0.95rem;
          transition: all 0.25s;
        }
        .program-btn:hover {
          background: var(--secondary);
          color: #fff;
          border-color: var(--secondary);
          box-shadow: 0 5px 15px rgba(59, 130, 246, 0.3);
        }

        .features-section {
          padding: 6rem 6%;
          position: relative;
          z-index: 2;
          background: linear-gradient(180deg, transparent 0%, var(--surface) 100%);
          border-top: 1px solid var(--glass-border);
          border-bottom: 1px solid var(--glass-border);
        }
        .features-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 4rem;
          align-items: center;
        }
        .features-left {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }
        .feature-row {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }
        .feature-icon {
          font-size: 1.8rem;
          width: 54px;
          height: 54px;
          background: var(--surface-light);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          flex-shrink: 0;
        }
        .feature-row-title {
          font-size: 1.2rem;
          font-weight: 800;
          margin-bottom: 0.4rem;
        }
        .feature-row-desc {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.5;
          margin: 0;
        }
        .image-card {
          padding: 0.5rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
        }
        .features-img {
          width: 100%;
          height: auto;
          border-radius: 20px;
          object-fit: cover;
          display: block;
        }

        .footer-container {
          background: var(--background);
          padding: 5rem 6% 3rem 6%;
          position: relative;
          z-index: 2;
          border-top: 1px solid var(--border);
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 4rem;
          margin-bottom: 4rem;
        }
        .footer-brand-col {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.35rem;
          font-weight: 800;
          font-family: var(--font-poppins);
          color: var(--text-heading);
        }
        .footer-logo-img {
          width: 32px;
          height: 32px;
        }
        .footer-desc {
          color: var(--text-muted);
          font-size: 0.88rem;
          line-height: 1.6;
          max-width: 320px;
          margin: 0;
        }
        .social-links {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .social-icon {
          color: var(--text-muted);
          transition: color 0.2s, transform 0.2s;
        }
        .social-icon:hover {
          color: var(--primary);
          transform: translateY(-2px);
        }
        .footer-links-col h4 {
          color: var(--text-heading);
          font-size: 1.05rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
        }
        .footer-links-col ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          color: var(--text-muted);
          font-size: 0.88rem;
        }
        .footer-link {
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: var(--text-heading);
        }
        .footer-bottom {
          border-top: 1px solid var(--border);
          padding-top: 2.5rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* 3D Animations & Tilts classes */
        /* 3D Animations & Tilts classes */
        .stat-3d-card:hover {
          transform: translateY(-8px) rotateX(8deg) rotateY(-8deg) translateZ(10px) !important;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1), 0 0 20px var(--card-shadow-color) !important;
          border-color: var(--card-accent) !important;
        }

        .features-img-tilt:hover {
          transform: perspective(1000px) rotateX(-5deg) rotateY(5deg) translateY(-5px);
          box-shadow: 0 15px 35px rgba(37, 99, 235, 0.15) !important;
        }

        .feature-card-tilt:hover {
          transform: translateY(-3px) scale(1.02);
          border-color: var(--primary) !important;
          background: rgba(239, 68, 68, 0.02) !important;
          box-shadow: 0 10px 25px rgba(239, 68, 68, 0.04) !important;
        }

        @media (max-width: 1024px) {
          .hero-section {
            flex-direction: column;
            text-align: center;
            gap: 3rem;
            padding-top: 4rem;
          }
          .hero-content { animation: slideUp3D 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; transform-origin: bottom center; 
            align-items: center;
          }
          .hero-title {
            font-size: 3.2rem;
          }
          .hero-subtitle {
            max-width: 100%;
          }
          .hero-cta-buttons {
            justify-content: center;
          }
          .arena-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .programs-grid {
            grid-template-columns: 1fr 1fr;
          }
          .features-layout {
            grid-template-columns: 1fr !important;
            gap: 3rem;
          }
          .mobile-app-section .section-container {
            grid-template-columns: 1fr !important;
            gap: 3rem !important;
            text-align: center !important;
          }
          .mobile-app-content {
            align-items: center !important;
          }
          .mobile-app-content ul {
            align-items: flex-start !important;
            margin: 0.5rem auto !important;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
          }
        }

        @media (max-width: 768px) {
          .navbar-links {
            display: none;
          }
          .hero-title {
            font-size: 2.5rem;
          }
          .programs-grid {
            grid-template-columns: 1fr;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
        }

        /* ── Report Bug Floating Button & Modal ── */
        .report-fab {
          position: fixed;
          bottom: 0.75rem;
          right: 0.75rem;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), #b91c1c);
          color: white;
          font-size: 1.15rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.35);
          z-index: 1000;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s;
          border: 2px solid var(--glass-border);
        }
        .report-fab:hover {
          transform: scale(1.1) translateY(-3px);
          box-shadow: 0 12px 28px rgba(239, 68, 68, 0.5);
        }

        .report-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .report-modal {
          width: 100%;
          max-width: 450px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          position: relative;
          color: var(--text);
        }
      `}</style>
      {/* Report Bug Floating Action Button */}
      <button 
        className="report-fab" 
        onClick={() => setShowReportBugModal(true)}
        title="Report Bug or Suggestion"
      >
        🐞
      </button>

      {/* Report Bug Modal */}
      {showReportBugModal && (
        <div className="report-modal-overlay" onClick={() => setShowReportBugModal(false)}>
          <div className="report-modal animate-scale-up" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowReportBugModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 800 }}>Report a Bug / Suggestion</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Found an issue or have an idea to improve the platform? Let our admins know!</p>
            
            {reportSuccess ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '12px', color: '#10b981' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>Thank you!</h3>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Your report has been sent directly to the administrative team.</p>
                <button onClick={() => { setShowReportBugModal(false); setReportSuccess(false); setReportTitle(''); setReportMessage(''); setReportEmail(''); setReportScreenshot(null); }} className="btn-primary" style={{ marginTop: '1.5rem', width: '100%', background: '#10b981' }}>Close</button>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setReportLoading(true);
                try {
                  await fetch('/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: reportTitle,
                      message: reportMessage,
                      email: reportEmail,
                      screenshot: reportScreenshot,
                      isBugReport: true
                    })
                  });
                  setReportSuccess(true);
                } catch(err) {
                  alert("Failed to submit report. Try again later.");
                }
                setReportLoading(false);
              }} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label className="input-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Subject / Title</label>
                  <input type="text" required value={reportTitle} onChange={e => setReportTitle(e.target.value)} className="modal-input" placeholder="e.g. Broken link on homepage" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="input-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Your Email (Optional)</label>
                  <input type="email" value={reportEmail} onChange={e => setReportEmail(e.target.value)} className="modal-input" placeholder="e.g. yourname@gmail.com" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="input-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Attach Screenshot (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert("⚠️ Image size exceeds 2 MB.");
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const img = new window.Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            const MAX_WIDTH = 800;
                            let width = img.width;
                            let height = img.height;
                            if (width > MAX_WIDTH) {
                              height *= MAX_WIDTH / width;
                              width = MAX_WIDTH;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            ctx.drawImage(img, 0, 0, width, height);
                            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
                            setReportScreenshot(compressedDataUrl);
                          };
                          img.src = event.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                    style={{ width: '100%', fontSize: '0.8rem', color: 'var(--text-muted)' }} 
                  />
                  {reportScreenshot && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={reportScreenshot} alt="Preview" style={{ width: '50px', height: 'auto', borderRadius: '4px', border: '1px solid var(--border)' }} />
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Attached</span>
                      <button type="button" onClick={() => setReportScreenshot(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>Remove</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="input-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>Description</label>
                  <textarea required value={reportMessage} onChange={e => setReportMessage(e.target.value)} className="modal-input" placeholder="Describe the bug in detail..." rows={4} style={{ width: '100%', resize: 'none' }}></textarea>
                </div>
                <button type="submit" disabled={reportLoading} className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.85rem' }}>
                  {reportLoading ? 'Sending...' : 'Submit Report 🚀'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
