"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Math/science formulas for the floating background animation
const floatingFormulas = [
  "F = ma", "∇ × B = μ₀J", "pv = nRT", "sin²θ + cos²θ = 1",
  "∫ x dx = x²/2 + C", "H₂ + O₂ → H₂O", "λ = h/p", "V = IR", "i² = -1",
  "F = G(m₁m₂)/r²", "pH = -log[H⁺]"
];

export default function CareersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to dashboard if already logged in (optional, but let's keep it accessible even if logged in, just like homepage)
  
  // Application Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("Mathematics Teacher");
  const [experience, setExperience] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successAppNumber, setSuccessAppNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessAppNumber(null);

    // Validate
    if (!name.trim() || !email.trim() || !phone.trim() || !position || !experience.trim()) {
      setErrorMessage("Please fill out all mandatory fields.");
      setSubmitting(false);
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setErrorMessage("Phone number must be exactly 10 digits.");
      setSubmitting(false);
      return;
    }
    if (name.length > 150 || !/^[a-zA-Z\s]+$/.test(name)) {
      setErrorMessage("Name must contain only alphabets and spaces, and be at most 150 characters.");
      setSubmitting(false);
      return;
    }
    if (!resumeFile) {
      setErrorMessage("Please attach your resume file (PDF or DOCX).");
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('position', position);
      formData.append('experience', experience);
      formData.append('coverLetter', coverLetter);
      formData.append('file', resumeFile);

      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessAppNumber(data.appNumber);
        // Reset fields
        setName("");
        setEmail("");
        setPhone("");
        setPosition("Mathematics Teacher");
        setExperience("");
        setCoverLetter("");
        setResumeFile(null);
      } else {
        setErrorMessage(data.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Network error. Could not connect to system.");
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
        <Link href="/" className="navbar-logo" style={{ textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Sudhir Tutorials Logo" className="logo-img" width={36} height={36} style={{ width: '36px', height: '36px', objectFit: 'contain' }} priority />
          <span className="logo-text">
            <span className="text-red">SUDHIR</span> <span className="text-blue">TUTORIALS</span>
          </span>
        </Link>
        <nav className="navbar-links">
          <Link href="/#programs" className="nav-link">Flagship Programs</Link>
          <Link href="/admissions" className="nav-link">Admissions</Link>
          <Link href="/#about" className="nav-link">Why Us</Link>
          <Link href="/careers" className="nav-link active" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Careers</Link>
          <Link href="/login" className="login-portal-btn">
            Portal Login <span className="arrow">→</span>
          </Link>
        </nav>
      </header>

      {/* Content Section */}
      <section style={{ padding: '6.5rem 6% 4rem 6%', zIndex: 10, position: 'relative', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {/* Header Title */}
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <h1 className="hero-title" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.2rem)', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Work with <span className="text-gradient">Sudhir Tutorials</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6', margin: 0 }}>
            Join a premier academic ecosystem. We are always looking for passionate educators, developers, and administrators who want to make a real difference in education.
          </p>
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

          {/* Left Column: Pedagogy, Perks & Openings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Culture & Pedagogy Card */}
            <div style={{ background: 'var(--card-bg-alt)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                Our Pedagogy & Culture
              </h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.7', margin: 0 }}>
                At Sudhir Tutorials, work culture is built strictly on academic freedom, structured practice, and collaborative teacher training. We believe in providing premium resources so you can focus on what matters most: mentoring minds and driving excellence.
              </p>
            </div>

            {/* Perks Card */}
            <div style={{ background: 'var(--card-bg-alt)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                Perks & Benefits
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', color: 'var(--text)' }}>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span><strong>Competitive Compensation:</strong> Performance-driven yearly increments and bonuses.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span><strong>Health & Wellness:</strong> Comprehensive coverage for you and your family.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span><strong>Professional Growth:</strong> Access to structured pedagogy training and digital materials.</span>
                </li>
                <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span><strong>LMS & Tech Support:</strong> Smart AI integration tools and custom dashboards.</span>
                </li>
              </ul>
            </div>

            {/* Openings Card */}
            <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed var(--primary)', borderRadius: '20px', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                Current Openings
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem', color: 'var(--text)' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                  Mathematics Educator (Class 11, 12, Droppers)
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                  Physics Educator (JEE/NEET Level)
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                  Chemistry & Biology Faculty (Foundation Courses)
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                  Academic Counselors & Operations Leads
                </li>
              </ul>
            </div>

          </div>

          {/* Right Column: Application Form */}
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
                  Thank you for applying to Sudhir Tutorials. Your profile details have been registered successfully.
                </p>
                <div style={{
                  background: 'rgba(56, 189, 248, 0.06)',
                  border: '1px dashed var(--secondary)',
                  padding: '1.25rem 2rem',
                  borderRadius: '16px',
                  display: 'inline-block',
                  marginBottom: '1.5rem'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: '4px' }}>Application Ref Number</span>
                  <strong style={{ fontSize: '1.8rem', color: 'var(--secondary)', letterSpacing: '1px' }}>{successAppNumber}</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Our recruitment team will review your CV and credentials and get back to you shortly if there's a fit.
                </p>
                <button 
                  onClick={() => setSuccessAppNumber(null)}
                  className="btn-primary"
                  style={{ marginTop: '2rem', border: 'none', width: '100%', padding: '0.85rem' }}
                >
                  Apply for Another Position
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
                  Apply For a Position
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.75rem', lineHeight: '1.4' }}>
                  Please fill out the form below and upload your resume. Fields marked with * are mandatory.
                </p>

                {errorMessage && (
                  <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Full Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Amit Sharma"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="form-grid-2col">
                    <style>{`
                      @media (max-width: 480px) {
                        .form-grid-2col {
                          grid-template-columns: 1fr !important;
                          gap: 1.25rem !important;
                        }
                      }
                    `}</style>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Email *</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="e.g. amit@mail.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      />
                    </div>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Phone *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="10-digit number"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.25rem' }} className="form-grid-2col">
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Position *</label>
                      <select 
                        required 
                        value={position}
                        onChange={e => setPosition(e.target.value)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      >
                        <option value="Mathematics Teacher">Maths Teacher</option>
                        <option value="Physics Teacher">Physics Teacher</option>
                        <option value="Chemistry Teacher">Chemistry Teacher</option>
                        <option value="Biology Teacher">Biology Teacher</option>
                        <option value="Academic Counselor">Academic Counselor</option>
                        <option value="LMS Administrator">LMS Administrator</option>
                        <option value="Other">Other Position</option>
                      </select>
                    </div>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Experience *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. 3 Years"
                        value={experience}
                        onChange={e => setExperience(e.target.value)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Upload Resume (PDF/DOCX) *</label>
                    <input 
                      type="file" 
                      required 
                      accept=".pdf,.docx,.doc"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setResumeFile(e.target.files[0]);
                        }
                      }}
                      style={{ padding: '0.5rem', borderRadius: '10px', border: '1px dashed var(--border)', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }}
                    />
                  </div>

                  <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Cover Letter / Notes</label>
                    <textarea 
                      rows={3} 
                      placeholder="Tell us briefly about yourself..."
                      value={coverLetter}
                      onChange={e => setCoverLetter(e.target.value)}
                      style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', resize: 'vertical' }}
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ border: 'none', padding: '0.85rem', fontWeight: 800, marginTop: '0.5rem', width: '100%', borderRadius: '12px' }}
                    disabled={submitting}
                  >
                    {submitting ? "Uploading & Applying..." : "Apply Now"}
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
