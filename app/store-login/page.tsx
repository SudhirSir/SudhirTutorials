"use client";

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';

export default function StoreLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Mode: sign-in vs registration
  const [isRegistering, setIsRegistering] = useState(false);

  // Sign In State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Registration State
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
      router.push('/dashboard/store');
    }
  }, [status, session, router]);

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
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Connecting to ST Store...</p>
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
    setLoading(true);
    setError("");

    if (!username || !password) {
      setError("Please enter both email/username and password.");
      setLoading(false);
      return;
    }

    try {
      sessionStorage.setItem('tabSessionActive', 'true');
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
        role: "student", // Store users have STUDENT role in DB
        isApp: Capacitor.isNativePlatform().toString()
      });

      if (res?.error) {
        if (res.error === "USER_NOT_FOUND") {
          setError("Account not found. Please register to purchase.");
        } else if (res.error === "INVALID_PASSWORD") {
          setError("Invalid password. Please try again.");
        } else if (res.error === "ROLE_MISMATCH") {
          setError("This account is not registered as a storefront student.");
        } else {
          setError("Failed to sign in. Please check your credentials.");
        }
        sessionStorage.removeItem('tabSessionActive');
        setLoading(false);
      } else {
        sessionStorage.setItem('onboarding_allowed', 'true');
        router.push('/dashboard/store');
      }
    } catch (err) {
      sessionStorage.removeItem('tabSessionActive');
      setError("An unexpected network error occurred.");
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, type: 'EMAIL_VERIFICATION' })
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Failed to send verification OTP.");
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
    setRegError("");
    setRegLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, phone: regPhone, password: regPassword, otp: regOtp })
      });
      const data = await res.json();

      if (!res.ok) {
        setRegError(data.error || "Registration failed.");
        setRegLoading(false);
      } else {
        sessionStorage.setItem('tabSessionActive', 'true');
        const loginRes = await signIn("credentials", {
          redirect: false,
          username: regEmail,
          password: regPassword,
          role: "student",
          isApp: Capacitor.isNativePlatform().toString()
        });

        if (loginRes?.error) {
          setRegError("Account created, but automatic sign in failed. Please sign in manually.");
          setRegLoading(false);
        } else {
          sessionStorage.setItem('onboarding_allowed', 'true');
          router.push('/dashboard/store');
        }
      }
    } catch (err) {
      setRegError("Network error. Please try again.");
      setRegLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--background)', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Form Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2.5rem', position: 'relative', justifyContent: 'center', maxWidth: '550px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '2.5rem' }}>
          <Link href="/" style={{ fontSize: '1.6rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--text)' }}>
            <img src="/logo.png" alt="SUDHIR TUTORIALS Logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '8px' }} />
            <span><span style={{ color: 'var(--primary)' }}>ST STORE</span> <span style={{ color: 'var(--secondary)' }}>PORTAL</span></span>
          </Link>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: 800, color: 'var(--text)' }}>
              {isRegistering ? 'Create Account' : 'ST Store Sign In'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
              {isRegistering ? 'Sign up to purchase tests and download notes.' : 'Log in to view purchased test series and notes.'}
            </p>
          </div>

          {!isRegistering && error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ {error}
            </div>
          )}

          {isRegistering && regError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠️ {regError}
            </div>
          )}

          {!isRegistering ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email / Username</label>
                <input 
                  type="text" 
                  placeholder="name@example.com or STS00101" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem' }} 
                />
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <Link 
                    href="/forgot-password" 
                    style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '1.1rem', 
                  background: 'var(--primary)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  fontSize: '1.05rem', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  opacity: loading ? 0.7 : 1, 
                  marginTop: '0.75rem',
                  boxShadow: '0 4px 15px rgba(37,99,235,0.3)'
                }}
              >
                {loading ? "Signing In..." : "Sign In to Store"}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleRegister : handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {!otpSent ? (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Full Name</label>
                    <input 
                      type="text" 
                      placeholder="Your Name" 
                      value={regName} 
                      onChange={(e) => setRegName(e.target.value)} 
                      required 
                      style={{ width: '100%', padding: '0.9rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem' }} 
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email Address</label>
                    <input 
                      type="email" 
                      placeholder="email@example.com" 
                      value={regEmail} 
                      onChange={(e) => setRegEmail(e.target.value)} 
                      required 
                      style={{ width: '100%', padding: '0.9rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Phone Number (Optional)</label>
                    <input 
                      type="tel" 
                      placeholder="10 digit number" 
                      value={regPhone} 
                      onChange={(e) => setRegPhone(e.target.value)} 
                      style={{ width: '100%', padding: '0.9rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={regPassword} 
                      onChange={(e) => setRegPassword(e.target.value)} 
                      required 
                      style={{ width: '100%', padding: '0.9rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem' }} 
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={regLoading} 
                    style={{ width: '100%', padding: '1.1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.05rem', cursor: regLoading ? 'not-allowed' : 'pointer', opacity: regLoading ? 0.7 : 1, marginTop: '0.75rem' }}
                  >
                    {regLoading ? "Sending OTP..." : "Request Email OTP"}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', border: '1px solid rgba(16,185,129,0.15)', textAlign: 'center' }}>
                    A 6-digit OTP code has been sent to <strong>{regEmail}</strong>.
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Verification Code</label>
                    <input 
                      type="text" 
                      placeholder="123456" 
                      value={regOtp} 
                      onChange={(e) => setRegOtp(e.target.value)} 
                      required 
                      style={{ width: '100%', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1.25rem', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }} 
                      maxLength={6} 
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={regLoading} 
                    style={{ width: '100%', padding: '1.1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.05rem', cursor: regLoading ? 'not-allowed' : 'pointer', opacity: regLoading ? 0.7 : 1, marginTop: '0.75rem' }}
                  >
                    {regLoading ? "Verifying..." : "Verify & Complete Signup"}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setOtpSent(false)} 
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', alignSelf: 'center', marginTop: '0.5rem' }}
                  >
                    Edit Email Address
                  </button>
                </>
              )}
            </form>
          )}

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            {!isRegistering ? (
              <>
                New user?{' '}
                <button onClick={() => { setIsRegistering(true); setRegError(""); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  Create Account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => { setIsRegistering(false); setRegError(""); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          © 2026 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>SUDHIR TUTORIALS</span>
        </div>
      </div>
    </div>
  );
}
