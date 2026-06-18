"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Math/science formulas for the floating background animation
const floatingFormulas = [
  "E = mc²", "F = ma", "∇ × B = μ₀J", "pv = nRT", "sin²θ + cos²θ = 1",
  "∫ x dx = x²/2 + C", "H₂ + O₂ → H₂O", "λ = h/p", "V = IR", "i² = -1",
  "F = G(m₁m₂)/r²", "pH = -log[H⁺]"
];

export default function AdmissionsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Admission Form States
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [className, setClassName] = useState("");
  const [board, setBoard] = useState("");
  const [program, setProgram] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [successAppNumber, setSuccessAppNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessAppNumber(null);

    // Validate
    if (!name.trim() || !fatherName.trim() || !phone.trim() || !address.trim() || !className || !board || !program || !dob) {
      setErrorMessage("Please fill out all required fields.");
      setSubmitting(false);
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setErrorMessage("Phone number must be exactly 10 digits.");
      setSubmitting(false);
      return;
    }
    if (name.length < 2 || name.length > 150 || !/^[a-zA-Z\s]+$/.test(name)) {
      setErrorMessage("Student name must contain only alphabets and spaces, and be between 2 and 150 characters.");
      setSubmitting(false);
      return;
    }
    if (fatherName.length < 2 || fatherName.length > 150 || !/^[a-zA-Z\s]+$/.test(fatherName)) {
      setErrorMessage("Father's name must contain only alphabets and spaces, and be between 2 and 150 characters.");
      setSubmitting(false);
      return;
    }
    if (address.length < 5 || address.length > 150) {
      setErrorMessage("Address must be between 5 and 150 characters.");
      setSubmitting(false);
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admissions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          fatherName: fatherName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          dob,
          className,
          board,
          program,
          address: address.trim(),
          message: message.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessAppNumber(data.appNumber);
        // Reset fields
        setName("");
        setFatherName("");
        setPhone("");
        setEmail("");
        setDob("");
        setClassName("");
        setBoard("");
        setProgram("");
        setAddress("");
        setMessage("");
      } else {
        setErrorMessage(data.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Network error. Could not connect to the system.");
    } finally {
      setSubmitting(false);
    }
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

      {/* Sticky Premium Navbar */}
      <header className="navbar-container">
        <div className="navbar-logo">
          <Image src="/logo.png" alt="Sudhir Tutorials Logo" className="logo-img" width={36} height={36} style={{ width: '36px', height: '36px', objectFit: 'contain' }} priority />
          <span className="logo-text">
            <span className="text-red">SUDHIR</span> <span className="text-blue">TUTORIALS</span>
          </span>
        </div>
        <nav className="navbar-links">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/#programs" className="nav-link">Flagship Programs</Link>
          <Link href="/admissions" className="nav-link active" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Admissions</Link>
          <Link href="/#about" className="nav-link">Why Us</Link>
          <Link href="/careers" className="nav-link">Careers</Link>
          <Link href="/login" className="login-portal-btn">
            Portal Login <span className="arrow">→</span>
          </Link>
        </nav>
      </header>

      {/* Content Section */}
      <section style={{ padding: '6.5rem 6% 4rem 6%', zIndex: 10, position: 'relative', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {/* Header Title */}
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <h1 className="hero-title" style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Academic <span className="text-gradient">Admissions</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
            Begin your journey towards academic excellence with Ludhiana's premier coaching institute. Submit your inquiry below, and our team will get in touch with you shortly.
          </p>
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: 'var(--card-bg-alt)',
            border: '1px solid var(--border)',
            borderRadius: '999px',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'var(--text-heading)'
          }}>
            Admissions Active for Academic Year 2026-27
          </div>
        </div>

        {/* Dynamic Split Layout */}
        <div className="careers-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '3.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <style>{`
            @media (max-width: 900px) {
              .careers-content-grid {
                grid-template-columns: 1fr !important;
                gap: 2.5rem !important;
              }
            }
          `}</style>

          {/* Left Column: Guidelines, Process, Tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Tagline Card */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(56, 189, 248, 0.05) 100%)', 
              border: '1.5px solid var(--border)', 
              borderRadius: '24px', 
              padding: '2.5rem 2rem', 
              boxShadow: 'var(--shadow-md)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '10px', left: '15px', fontSize: '4rem', opacity: 0.08, fontFamily: 'serif', pointerEvents: 'none' }}>“</div>
              <p style={{ 
                fontSize: '1.6rem', 
                fontWeight: 900, 
                color: 'var(--text-heading)', 
                lineHeight: '1.4', 
                margin: '0 0 0.5rem 0',
                fontStyle: 'italic',
                fontFamily: 'var(--font-heading)'
              }}>
                “Sahab Hum Jabardasti nhi, Zabardast padhate hai”
              </p>
              <div style={{ width: '40px', height: '3px', background: 'var(--primary)', margin: '1rem auto' }}></div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>
                Our Core Philosophy
              </p>
            </div>

            {/* Admission Process Card */}
            <div style={{ background: 'var(--card-bg-alt)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                Admission Journey
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    color: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.85rem', 
                    fontWeight: 800,
                    flexShrink: 0
                  }}>1</div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text)' }}>Inquiry Submission</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Fill out the online application inquiry form on this page with student credentials.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: 'rgba(56, 189, 248, 0.1)', 
                    color: 'var(--secondary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.85rem', 
                    fontWeight: 800,
                    flexShrink: 0
                  }}>2</div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text)' }}>Counseling Call</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Our academic coordinators will contact you to discuss goals, batch timings, and fee structures.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    color: '#10b981', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.85rem', 
                    fontWeight: 800,
                    flexShrink: 0
                  }}>3</div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text)' }}>Scholarship / Diagnostic Test</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Students take a small aptitude test to evaluate fundamentals and receive fee concessions.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: 'rgba(139, 92, 246, 0.1)', 
                    color: '#8b5cf6', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.85rem', 
                    fontWeight: 800,
                    flexShrink: 0
                  }}>4</div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text)' }}>Batch Allocation & Enrollment</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Complete document verification, select suitable timings, and join the offline batch lectures.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Our Classes Card */}
            <div style={{ background: 'var(--card-bg-alt)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Academic Highlights
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', color: 'var(--text)' }}>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span><strong>Small Batch Size:</strong> Individualized attention to resolve student doubts immediately.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span><strong>Rigorous DPPs:</strong> Daily Practice Problems and comprehensive chapter-wise sheets.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span><strong>Digital LMS Platform:</strong> Instant portal access for attendance, marks history, and online lecture notes.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Right Column: Admission Inquiry Form */}
          <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '24px', border: '1px solid var(--border)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', alignSelf: 'start', boxShadow: 'var(--shadow-lg)' }}>
            
            {successAppNumber ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '2px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981'
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--secondary)' }}>Application Submitted!</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '2rem', fontSize: '0.95rem' }}>
                  Thank you for submitting your admission inquiry. We have successfully registered your interest.
                </p>
                <div style={{
                  background: 'rgba(56, 189, 248, 0.06)',
                  border: '1px dashed var(--secondary)',
                  padding: '1.25rem 2rem',
                  borderRadius: '16px',
                  display: 'inline-block',
                  marginBottom: '1.5rem'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: '4px' }}>Application Number</span>
                  <strong style={{ fontSize: '1.8rem', color: 'var(--secondary)', letterSpacing: '1px' }}>{successAppNumber}</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Please save this number for further reference. Our administration office will call you within 24-48 working hours.
                </p>
                <button 
                  onClick={() => setSuccessAppNumber(null)}
                  className="btn-primary"
                  style={{ marginTop: '2rem', border: 'none', width: '100%', padding: '0.85rem', borderRadius: '12px' }}
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
                  Admission Inquiry Form
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.75rem', lineHeight: '1.4' }}>
                  Provide precise information below. Fields marked with * are required.
                </p>

                {errorMessage && (
                  <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Student Name & Father's Name */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid-2col">
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Student Name *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={150}
                        placeholder="e.g. Amit Sharma"
                        value={name}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                            setName(val);
                          }
                        }}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      />
                    </div>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Father's Name *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength={150}
                        placeholder="e.g. Rajesh Sharma"
                        value={fatherName}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                            setFatherName(val);
                          }
                        }}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Phone & Email */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid-2col">
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Contact Phone *</label>
                      <input 
                        type="tel" 
                        required 
                        maxLength={10}
                        placeholder="10-digit number"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      />
                    </div>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Email Address (Optional)</label>
                      <input 
                        type="email" 
                        placeholder="e.g. amit@mail.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* DOB & Target Class */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid-2col">
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Date of Birth *</label>
                      <input 
                        type="date" 
                        required 
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      />
                    </div>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Target Class *</label>
                      <select 
                        required 
                        value={className}
                        onChange={e => setClassName(e.target.value)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      >
                        <option value="">Select Class</option>
                        {Array.from({ length: 7 }, (_, i) => `Class ${i + 6}`).map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                        <option value="Droppers Batch">Droppers Batch</option>
                      </select>
                    </div>
                  </div>

                  {/* Board & Academic Program */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid-2col">
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Board *</label>
                      <select 
                        required 
                        value={board}
                        onChange={e => setBoard(e.target.value)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
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
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Academic Program *</label>
                      <select 
                        required 
                        value={program}
                        onChange={e => setProgram(e.target.value)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      >
                        <option value="">Select Program</option>
                        <option value="JEE">JEE (Main & Advanced)</option>
                        <option value="NEET">NEET (Medical)</option>
                        <option value="Foundation">Pre-Foundation Academy</option>
                        <option value="Boards">Boards Masterclass</option>
                      </select>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Address *</label>
                    <textarea 
                      required 
                      rows={2} 
                      maxLength={150}
                      placeholder="Full residential address (max 150 characters)"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', resize: 'vertical' }}
                    ></textarea>
                  </div>

                  {/* Message / Query */}
                  <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Message or Query</label>
                    <textarea 
                      rows={2} 
                      placeholder="Any questions or remarks? (Optional)"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', resize: 'vertical' }}
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ border: 'none', padding: '0.85rem', fontWeight: 800, marginTop: '0.5rem', width: '100%', borderRadius: '12px' }}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting Inquiry..." : "Submit Admission Inquiry"}
                  </button>
                </form>
              </div>
            )}

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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l16 16M4 20L20 4"/><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L2.25 2.25h6.934l4.265 5.636L18.244 2.25zM17.0 20.75h1.833L7.083 4.132H5.117L17.0 20.75z"/></svg>
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
              <li><Link href="/careers" className="footer-link">Careers</Link></li>
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
    </main>
  );
}
