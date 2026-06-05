"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

// Math/science formulas for the floating background animation
const floatingFormulas = [
  "E = mc²", "F = ma", "∇ × B = μ₀J", "pv = nRT", "sin²θ + cos²θ = 1",
  "∫ x dx = x²/2 + C", "H₂ + O₂ → H₂O", "λ = h/p", "V = IR", "i² = -1",
  "F = G(m₁m₂)/r²", "pH = -log[H⁺]"
];

export default function Home() {
  const [selectedClass, setSelectedClass] = useState<'foundation' | 'jee' | 'neet' | 'droppers'>('jee');
  const [scholarship, setScholarship] = useState<number>(0);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [doubtText, setDoubtText] = useState<string>("");
  const [doubtResponse, setDoubtResponse] = useState<string>("");
  const [typingDoubt, setTypingDoubt] = useState<boolean>(false);

  // Fee rates mapping
  const feeRates = {
    foundation: { base: 4500, name: "Class 8-10 Foundation" },
    jee: { base: 7500, name: "11th / 12th JEE Main & Advanced" },
    neet: { base: 7500, name: "11th / 12th NEET (Medical)" },
    droppers: { base: 8500, name: "JEE/NEET Droppers Batch" }
  };

  const calculatedBase = feeRates[selectedClass].base;
  const calculatedDiscount = Math.round(calculatedBase * (scholarship / 100));
  const calculatedNet = calculatedBase - calculatedDiscount;

  // Mini-Quiz Question
  const quizQuestion = {
    q: "A car accelerates from rest at a constant rate of 3 m/s² for 4 seconds. What is its final velocity?",
    options: [
      { id: "A", text: "7 m/s", correct: false },
      { id: "B", text: "12 m/s", correct: true },
      { id: "C", text: "24 m/s", correct: false },
      { id: "D", text: "1.5 m/s", correct: false }
    ],
    explanation: "Using the first equation of motion: v = u + at. Since the car starts from rest, u = 0. Therefore, v = 0 + (3 m/s² * 4 s) = 12 m/s."
  };

  const handleSubmitQuiz = (optId: string) => {
    setQuizAnswer(optId);
    setQuizSubmitted(true);
  };

  const resetQuiz = () => {
    setQuizAnswer(null);
    setQuizSubmitted(false);
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

      {/* Fixed Top-Right Viewport Theme Toggle (Most Right Side) */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '2.5rem', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      {/* Sticky Premium Navbar */}
      <header className="navbar-container">
        <div className="navbar-logo">
          <img src="/logo.png" alt="Sudhir Tutorials Logo" className="logo-img" />
          <span className="logo-text">
            <span className="text-red">SUDHIR</span> <span className="text-light">TUTORIALS</span>
          </span>
        </div>
        <nav className="navbar-links">
          <Link href="#programs" className="nav-link">Flagship Programs</Link>
          <Link href="#about" className="nav-link">Why Us</Link>
          <Link href="#calculator" className="nav-link">Fee Calculator</Link>
          <Link href="/login" className="login-portal-btn">
            🎓 Portal Login <span className="arrow">→</span>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="admission-pill animate-float">
            <span className="pill-emoji">🎒</span> Admissions Active for Academic Year 2026-27
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
            <Link href="#programs" className="btn-secondary-hero">Explore Courses</Link>
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

      {/* Interactive Micro-Quiz & Fee Calculator Grid */}
      <section id="calculator" className="interactive-arena-section">
        <div className="section-header">
          <h2 className="section-title">Interactive Learning Arena</h2>
          <p className="section-subtitle">Test your knowledge with our physics quiz, or estimate your monthly fee structures instantly.</p>
        </div>

        <div className="arena-grid">
          {/* Item 1: Interactive Fee Calculator */}
          <div className="glass-card arena-card">
            <div className="card-header-icon">
              <span className="icon">💳</span>
              <h3>Tuition Fee Estimator</h3>
            </div>
            <p className="card-desc">Select your course and scholarship tier to preview monthly payment rates.</p>
            
            <div className="input-group">
              <label className="input-label">Select Target Program</label>
              <div className="selector-grid">
                {(Object.keys(feeRates) as Array<keyof typeof feeRates>).map(key => (
                  <button 
                    key={key} 
                    onClick={() => setSelectedClass(key)}
                    className={`selector-btn ${selectedClass === key ? 'active' : ''}`}
                  >
                    {feeRates[key].name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label className="input-label">Admission Test Scholarship</label>
                <span className="scholarship-badge">{scholarship}% Scholarship</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="90" 
                step="10" 
                value={scholarship} 
                onChange={e => setScholarship(parseInt(e.target.value))}
                className="slider-input"
              />
              <div className="slider-ticks">
                <span>0%</span>
                <span>30%</span>
                <span>60%</span>
                <span>90%</span>
              </div>
            </div>

            <div className="fee-output-box">
              <div className="fee-row">
                <span>Base Monthly Fee:</span>
                <span>₹{calculatedBase}</span>
              </div>
              <div className="fee-row discount">
                <span>Scholarship Concession:</span>
                <span>-₹{calculatedDiscount}</span>
              </div>
              <hr className="fee-divider" />
              <div className="fee-row total">
                <span>Estimated Net Fee:</span>
                <span className="fee-net-price">₹{calculatedNet} <span className="month-span">/month</span></span>
              </div>
            </div>
          </div>

          {/* Item 2: Physics Practice Quiz */}
          <div className="glass-card arena-card">
            <div className="card-header-icon">
              <span className="icon">📝</span>
              <h3>Daily Physics Challenge</h3>
            </div>
            <p className="card-desc">Try out a quick kinematics question. Real students receive automated grading and analysis.</p>

            <div className="quiz-question-box">
              <p className="quiz-question-text">{quizQuestion.q}</p>
              
              <div className="quiz-options-list">
                {quizQuestion.options.map(opt => {
                  let btnBg = 'var(--card-bg-alt)';
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
                    btnBg = 'rgba(99, 102, 241, 0.15)';
                    btnBorder = 'var(--primary)';
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
                  onClick={() => quizAnswer && handleSubmitQuiz(quizAnswer)}
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
                  <button onClick={resetQuiz} className="btn-secondary" style={{ width: '100%', marginTop: '1rem', padding: '0.6rem' }}>Try Another Quiz</button>
                </div>
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
            { title: 'Pre-Foundation Academy', subtitle: 'Class 8, 9 & 10', desc: 'Pre-enrollment program constructing analytical frameworks for NTSE, Olympiads, and future competitive courses.', color: '#f59e0b' }
          ].map((prog, i) => (
            <div key={i} className="glass-card program-card">
              <div className="card-top-accent" style={{ backgroundColor: prog.color }}></div>
              <h3 className="program-title">{prog.title}</h3>
              <div className="program-subtitle" style={{ color: prog.color }}>{prog.subtitle}</div>
              <p className="program-desc">{prog.desc}</p>
              <ul className="program-bullets">
                <li><span className="bullet-check">✓</span> 500+ Hours Smart Lectures</li>
                <li><span className="bullet-check">✓</span> Weekly Mock Papers & Ranks</li>
                <li><span className="bullet-check">✓</span> Specialized Offline Doubt Counters</li>
              </ul>
              <Link href="/login" className="program-btn">Register / Enroll Now</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Why Us / Features Section */}
      <section id="about" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Why Choose Sudhir Tutorials?</h2>
          <p className="section-subtitle">Connecting traditional tutoring rigor with modern digital capabilities.</p>
        </div>

        <div className="features-layout">
          <div className="features-left">
            {[
              { title: 'LMS Academic Dashboard', desc: 'Students can watch recorded lecture files, log attendance metrics, and access offline study documents directly from their dashboards.', icon: '💻' },
              { title: 'Transparent Financial Ledgers', desc: 'Integrated fee collections, detailed bank-style ledgers, and automated digital receipts showing verified administrator attributions.', icon: '💳' },
              { title: 'Doubt Resolution Desks', desc: 'Weekly interactive sessions combined with our AI companion to ensure no question is left unanswered.', icon: '🎓' }
            ].map((feat, i) => (
              <div key={i} className="feature-row">
                <div className="feature-icon">{feat.icon}</div>
                <div>
                  <h3 className="feature-row-title">{feat.title}</h3>
                  <p className="feature-row-desc">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="features-right">
            <div className="image-card">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop" 
                alt="Students studying collaboratively" 
                className="features-img"
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
              <img src="/logo.png" alt="Sudhir Tutorials Logo" className="footer-logo-img" />
              <span>SUDHIR TUTORIALS</span>
            </div>
            <p className="footer-desc">Constructing foundational excellence and securing top-tier competitive results for over a decade.</p>
            <div className="social-links">
              <a href="https://instagram.com/Sudhir_tutorials" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://facebook.com/Sudhir_tutorials" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="https://youtube.com/@Sudhir_tutorials" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
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
        .text-light {
          color: var(--text-heading);
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
        .hero-content {
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
          grid-template-columns: 1fr 1fr;
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
          background: var(--secondary);
          color: #fff;
          border-color: var(--secondary);
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

        @media (max-width: 1024px) {
          .hero-section {
            flex-direction: column;
            text-align: center;
            gap: 3rem;
            padding-top: 4rem;
          }
          .hero-content {
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
            grid-template-columns: 1fr;
            gap: 3rem;
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
      `}</style>
    </main>
  );
}
