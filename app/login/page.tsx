"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Capacitor } from "@capacitor/core";
import { safeSessionStorage } from "@/lib/safeStorage";


type Role = "student" | "teacher" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Role>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration State
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const isStoreUser = (session.user as any).isStoreUser;
      if (isStoreUser) {
        router.push('/dashboard/store');
      } else {
        const role = (session.user as any).role || "STUDENT";
        router.push(`/dashboard/${role.toLowerCase()}`);
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      const isReg = params.get("register");
      
      if (err === "concurrent_login") {
        setError("You have been signed out because your account was logged in from another device/browser.");
      } else if (err === "session_expired") {
        setError("Your session has expired. Please sign in again.");
      }

      if (isReg === "true") {
        setIsRegistering(true);
        setActiveTab("student");
      }
    }
  }, []);

  if (status === "loading") {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        color: 'var(--text)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(16, 185, 129, 0.1)',
          borderTop: '3px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>जय सियाराम 🙏 Connecting...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    if (cleanUsername !== username) setUsername(cleanUsername);
    if (cleanPassword !== password) setPassword(cleanPassword);

    setLoading(true);
    setError("");

    if (!cleanUsername || !cleanPassword) {
      setError("Please enter both username and password.");
      setLoading(false);
      return;
    }

    const attemptSignIn = async () => {
      safeSessionStorage.setItem('tabSessionActive', 'true');
      return signIn("credentials", {
        redirect: false,
        username: cleanUsername,
        password: cleanPassword,
        role: activeTab,
        isApp: Capacitor.isNativePlatform().toString()
      });
    };

    const applyError = (res: any) => {
      safeSessionStorage.removeItem('tabSessionActive');
      if (res.error === "USER_NOT_FOUND") {
        setError("This ID / Username is not registered.");
      } else if (res.error === "INVALID_PASSWORD") {
        setError("Invalid password. Please try again.");
      } else if (res.error === "ROLE_MISMATCH") {
        setError(`Role mismatch: This account is not registered as a ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}.`);
      } else if (res.error === "ADMIN_NOT_TEACHER") {
        setError("This Admin account has not been assigned to any batch as a Teacher.");
      } else if (res.error === "DB_ERROR") {
        setError("Database connection problem. Please click Sign In again.");
      } else {
        setError("Invalid ID or Password.");
      }
      setLoading(false);
    };

    try {
      const res = await attemptSignIn();

      if (res?.error) {
        // On a transient DB_ERROR, silently retry once after a short pause
        if (res.error === "DB_ERROR") {
          await new Promise(resolve => setTimeout(resolve, 1500));
          try {
            const retry = await attemptSignIn();
            if (retry?.error) {
              applyError(retry);
              return;
            }
            // Retry succeeded — navigate
            router.push(`/dashboard/${activeTab}`);
            return;
          } catch {
            applyError(res);
            return;
          }
        }
        applyError(res);
      } else {
        // Navigate directly — no router.refresh() which caused a blank flash
        if (typeof window !== 'undefined') {
          safeSessionStorage.setItem('onboarding_allowed', 'true');
        }
        router.push(`/dashboard/${activeTab}`);
      }
    } catch (err) {
      safeSessionStorage.removeItem('tabSessionActive');
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = regEmail.trim();
    if (cleanEmail !== regEmail) setRegEmail(cleanEmail);

    setRegError("");
    setRegLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, type: 'EMAIL_VERIFICATION' })
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Failed to send OTP.");
      } else {
        setOtpSent(true);
        if (data.isMock) {
          console.log("MOCK OTP:", data.mockOtp);
        }
      }
    } catch (err) {
      setRegError("Network error. Please try again.");
    }
    setRegLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim();
    const cleanPhone = regPhone.trim();
    const cleanPassword = regPassword.trim();
    const cleanOtp = regOtp.trim();

    if (cleanName !== regName) setRegName(cleanName);
    if (cleanEmail !== regEmail) setRegEmail(cleanEmail);
    if (cleanPhone !== regPhone) setRegPhone(cleanPhone);
    if (cleanPassword !== regPassword) setRegPassword(cleanPassword);
    if (cleanOtp !== regOtp) setRegOtp(cleanOtp);

    setRegError("");
    setRegLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, phone: cleanPhone, password: cleanPassword, otp: cleanOtp })
      });
      const data = await res.json();

      if (!res.ok) {
        setRegError(data.error || "Failed to register.");
        setRegLoading(false);
      } else {
        // Log them in immediately
        safeSessionStorage.setItem('tabSessionActive', 'true');
        const loginRes = await signIn("credentials", {
          redirect: false,
          username: cleanEmail,
          password: cleanPassword,
          role: "student",
          isApp: Capacitor.isNativePlatform().toString()
        });

        if (loginRes?.error) {
          setRegError("Account created, but failed to log in automatically. Please go back to login.");
          setRegLoading(false);
        } else {
          safeSessionStorage.setItem('onboarding_allowed', 'true');
          router.push('/dashboard/store');
        }
      }
    } catch (err) {
      setRegError("Network error. Please try again.");
      setRegLoading(false);
    }
  };

  const tabs = [
    { id: "student", label: "Student", icon: "🎓", color: "#2563eb" },
    { id: "teacher", label: "Teacher", icon: "👨‍🏫", color: "#10b981" },
    { id: "admin", label: "Admin", icon: "🎛️", color: "#ef4444" },
  ];

  const activeColor = tabs.find(t => t.id === activeTab)?.color || "var(--primary)";

  return (
    <div className="login-root-split" style={{ minHeight: '100vh', width: '100vw', display: 'flex', overflow: 'hidden' }}>
      
      {/* LEFT SIDE: Poster Image & Testimonial Panel */}
      <div className="login-left-poster-panel" style={{ flex: '0.65', position: 'relative', minHeight: '100vh', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', borderRadius: '0 0 20px 20px', overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <img 
            src="/campus_news.png" 
            alt="Sudhir Tutorials Campus News Poster" 
            style={{ width: '100%', maxHeight: 'calc(100vh - 160px)', objectFit: 'contain', objectPosition: 'top', borderRadius: '0 0 16px 16px', display: 'block' }} 
          />
        </div>

        {/* Shilpy Ranker Message Card directly below image */}
        <div className="shilpy-ranker-card" style={{
          width: '100%',
          maxWidth: '440px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '18px',
          padding: '0.9rem 1.15rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: activeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '1rem', flexShrink: 0 }}>S</div>
            <div>
              <div className="shilpy-title" style={{ fontWeight: 800, fontSize: '0.92rem' }}>Shilpy — PSEB AIR 14 Ranker</div>
              <div className="shilpy-quote" style={{ fontSize: '0.8rem', fontWeight: 500, marginTop: '2px' }}>
                "SUDHIR TUTORIALS built my strong conceptual foundation for my top AIR rank."
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Brand Header & Floating Login Form Card */}
      <div className="login-right-form-panel" style={{ flex: '1', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '1.5rem', paddingBottom: '1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', position: 'relative', overflowY: 'auto' }}>
        
        {/* Top Brand Logo */}
        <div style={{ width: '100%', maxWidth: '430px', marginBottom: '0.65rem', display: 'flex', justifyContent: 'flex-start', paddingLeft: '1.6rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
            <img src="/logo.png" alt="Sudhir Tutorials Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }} />
            <span className="logo-text" style={{ whiteSpace: 'nowrap', fontSize: '1.75rem', fontWeight: 900, lineHeight: '1', letterSpacing: '0.5px' }}>
              <span style={{ color: '#ef4444' }}>SUDHIR</span> <span className="brand-tutorials-dynamic">TUTORIALS</span>
            </span>
          </Link>
        </div>

        {/* Floating Login Card */}
        <div className="login-card-floating" style={{
          width: '100%',
          maxWidth: '430px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '1.4rem 1.6rem'
        }}>
          
          {/* Card Title & Subtitle */}
          <div style={{ marginBottom: '0.85rem' }}>
            <h1 className="card-title-text" style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>
              {isRegistering ? 'Create Account' : 'Welcome Back!'}
            </h1>
            <p className="card-subtitle-text" style={{ fontSize: '0.86rem', margin: 0 }}>
              {isRegistering ? 'Sign up to access Notes and Test Series.' : `Login as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} to access your portal.`}
            </p>
          </div>

          {/* Role Tabs */}
          {!isRegistering && (
            <div className="login-tabs-header" style={{ display: 'flex', background: '#ffffff', padding: '0.2rem', borderRadius: '10px', marginBottom: '1rem', border: '1.5px solid #000000' }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as Role); setError(""); setUsername(""); setPassword(""); }}
                  className={`login-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.5rem',
                    border: 'none',
                    background: activeTab === tab.id ? tab.color : 'transparent',
                    color: activeTab === tab.id ? '#ffffff' : '#334155',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.25s ease',
                    boxShadow: activeTab === tab.id ? `0 3px 10px -2px ${tab.color}66` : 'none'
                  }}
                >
                  <span style={{ fontSize: '0.85rem' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {!isRegistering && error && (
            <div className="animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.65rem 0.85rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.82rem', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ⚠️ {error}
            </div>
          )}

          {isRegistering && regError && (
            <div className="animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.65rem 0.85rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.82rem', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ⚠️ {regError}
            </div>
          )}

          {!isRegistering ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="card-label-text" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.82rem' }}>Username / ID</label>
                <input
                  type="text"
                  className="card-input-field"
                  placeholder={activeTab === 'teacher' ? 'e.g. FAC12345' : activeTab === 'student' ? 'e.g. STU12345' : 'Admin Username'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '9px',
                    fontSize: '0.88rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = activeColor}
                  onBlur={e => {
                    setUsername(e.target.value.trim());
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label className="card-label-text" style={{ fontWeight: 600, fontSize: '0.82rem' }}>Password</label>
                  <Link 
                    href="/forgot-password"
                    style={{ fontSize: '0.78rem', color: activeColor, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="card-input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                      borderRadius: '9px',
                      fontSize: '0.88rem',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = activeColor}
                    onBlur={e => {
                      setPassword(e.target.value.trim());
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.815 7.815 3 3m-3-3-3.671-3.671m0 0a3 3 0 0 1-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input type="checkbox" id="remember" style={{ width: '14px', height: '14px', accentColor: activeColor, cursor: 'pointer' }} />
                <label htmlFor="remember" className="card-checkbox-label" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>Remember me for 30 days</label>
              </div>

              {/* Login Button */}
              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  padding: '0.55rem 1.25rem', 
                  background: activeColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: `0 3px 12px -2px ${activeColor}66`,
                  marginTop: '0.25rem',
                  width: 'fit-content',
                  alignSelf: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {loading ? "Logging in..." : `Login as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleRegister : handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {!otpSent ? (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Full Name</label>
                    <input type="text" placeholder="Your Name" value={regName} onChange={(e) => setRegName(e.target.value)} required style={{ width: '100%', padding: '0.85rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '0.95rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Email Address</label>
                    <input type="email" placeholder="student@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required style={{ width: '100%', padding: '0.85rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '0.95rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Phone Number (Optional)</label>
                    <input type="tel" placeholder="1234567890" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} style={{ width: '100%', padding: '0.85rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '0.95rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Create a Password</label>
                    <input type="password" placeholder="••••••••" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required style={{ width: '100%', padding: '0.85rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '0.95rem' }} />
                  </div>
                  <button type="submit" disabled={regLoading} style={{ padding: '0.8rem 1.75rem', width: 'fit-content', background: activeColor, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: regLoading ? 'not-allowed' : 'pointer', opacity: regLoading ? 0.7 : 1, marginTop: '0.5rem' }}>
                    {regLoading ? "Sending Code..." : "Send Verification Code"}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.85rem', borderRadius: '12px', marginBottom: '0.85rem', fontSize: '0.88rem', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                    Verification code sent to <strong>{regEmail}</strong>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Enter 6-digit Code</label>
                    <input type="text" placeholder="123456" value={regOtp} onChange={(e) => setRegOtp(e.target.value)} required style={{ width: '100%', padding: '0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1.1rem', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }} maxLength={6} />
                  </div>
                  <button type="submit" disabled={regLoading} style={{ padding: '0.8rem 1.75rem', width: 'fit-content', background: activeColor, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: regLoading ? 'not-allowed' : 'pointer', opacity: regLoading ? 0.7 : 1, marginTop: '0.5rem' }}>
                    {regLoading ? "Verifying..." : "Verify & Register"}
                  </button>
                  <button type="button" onClick={() => setOtpSent(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    Change email address
                  </button>
                </>
              )}
            </form>
          )}

          {isRegistering && (
            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <button onClick={() => { setIsRegistering(false); setRegError(""); }} style={{ background: 'none', border: 'none', color: activeColor, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                Login
              </button>
            </p>
          )}

          {activeTab !== 'admin' && !isRegistering && (
             <p className="card-subnote-text" style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.82rem', margin: '1.25rem 0 0 0' }}>
                First time login? Please use the default credentials provided by the institute administration.
             </p>
          )}
        </div>

        {/* Bottom Copyright */}
        <div style={{ marginTop: '1.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          © 2026 <span className="text-red">SUDHIR</span> <span className="brand-tutorials-dynamic">TUTORIALS</span>
        </div>
      </div>

      <style jsx>{`
        .brand-tutorials-dynamic {
          color: #2563eb !important;
        }

        /* DARK THEME RULES (Blue Glass Card + Dark Navy Background) */
        :root[data-theme="dark"] .login-right-form-panel {
          background-color: #0b1329 !important;
        }
        :root[data-theme="dark"] .login-root-split {
          background-color: #0f1729 !important;
        }
        :root[data-theme="dark"] .login-card-floating,
        :root[data-theme="dark"] .shilpy-ranker-card {
          background: linear-gradient(145deg, #1e293b 0%, #0f1729 100%) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.12) !important;
        }
        :root[data-theme="dark"] .card-title-text,
        :root[data-theme="dark"] .shilpy-title { color: #ffffff !important; }
        :root[data-theme="dark"] .card-subtitle-text,
        :root[data-theme="dark"] .card-label-text,
        :root[data-theme="dark"] .shilpy-quote { color: #cbd5e1 !important; }
        :root[data-theme="dark"] .card-checkbox-label,
        :root[data-theme="dark"] .card-subnote-text { color: #94a3b8 !important; }
        :root[data-theme="dark"] .card-input-field {
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          color: #ffffff !important;
        }
        :root[data-theme="dark"] .login-tabs-header {
          background: rgba(15, 23, 42, 0.65) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        /* LIGHT THEME RULES (White Background Card + Black Border) */
        :root[data-theme="light"] .login-right-form-panel,
        :root:not([data-theme="dark"]) .login-right-form-panel {
          background-color: #f8fafc !important;
        }
        :root[data-theme="light"] .login-root-split,
        :root:not([data-theme="dark"]) .login-root-split {
          background-color: #f1f5f9 !important;
        }
        :root[data-theme="light"] .login-card-floating,
        :root[data-theme="light"] .shilpy-ranker-card,
        :root:not([data-theme="dark"]) .login-card-floating,
        :root:not([data-theme="dark"]) .shilpy-ranker-card {
          background: #ffffff !important;
          color: #000000 !important;
          border: 1.5px solid #000000 !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08) !important;
        }
        :root[data-theme="light"] .card-title-text,
        :root[data-theme="light"] .card-label-text,
        :root[data-theme="light"] .shilpy-title,
        :root:not([data-theme="dark"]) .card-title-text,
        :root:not([data-theme="dark"]) .card-label-text,
        :root:not([data-theme="dark"]) .shilpy-title {
          color: #000000 !important;
        }
        :root[data-theme="light"] .card-subtitle-text,
        :root[data-theme="light"] .card-checkbox-label,
        :root[data-theme="light"] .card-subnote-text,
        :root[data-theme="light"] .shilpy-quote,
        :root:not([data-theme="dark"]) .card-subtitle-text,
        :root:not([data-theme="dark"]) .card-checkbox-label,
        :root[data-theme="dark"] .card-subnote-text,
        :root:not([data-theme="dark"]) .shilpy-quote {
          color: #334155 !important;
        }
        :root[data-theme="light"] .card-input-field,
        :root:not([data-theme="dark"]) .card-input-field {
          background: #ffffff !important;
          border: 1.5px solid #000000 !important;
          color: #000000 !important;
        }
        :root[data-theme="light"] .login-tabs-header,
        :root:not([data-theme="dark"]) .login-tabs-header {
          background: #ffffff !important;
          border: 1.5px solid #000000 !important;
        }
        @media (max-width: 900px) {
          .login-root-split {
            flex-direction: column !important;
            height: auto !important;
            min-height: 100vh !important;
            overflow-y: visible !important;
          }
          .login-left-poster-panel {
            min-height: 250px !important;
            height: 250px !important;
            padding: 0.5rem !important;
            flex: none !important;
          }
          .login-right-form-panel {
            min-height: auto !important;
            padding: 2rem 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
