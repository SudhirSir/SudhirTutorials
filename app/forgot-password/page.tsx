"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [emailMasked, setEmailMasked] = useState("");

  const sendOtp = async () => {
    if (!username.trim()) {
      return setError("Please enter your Username / ID first.");
    }
    setError("");
    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, type: "PASSWORD_RESET" })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        const email = data.email || "";
        const parts = email.split("@");
        if (parts.length === 2) {
          const namePart = parts[0];
          const domainPart = parts[1];
          const maskedName = namePart.length > 2 
            ? namePart[0] + "*".repeat(namePart.length - 2) + namePart[namePart.length - 1] 
            : namePart[0] + "*";
          setEmailMasked(`${maskedName}@${domainPart}`);
        } else {
          setEmailMasked(email);
        }
      } else {
        setError(data.error || "Failed to send OTP code.");
      }
    } catch (err) {
      setError("Failed to send OTP code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }
    if (newPassword.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }
    if (!/[a-z]/.test(newPassword)) {
      return setError("Password must contain at least one lowercase letter.");
    }
    if (!/[A-Z]/.test(newPassword)) {
      return setError("Password must contain at least one uppercase letter.");
    }
    if (!/[0-9]/.test(newPassword)) {
      return setError("Password must contain at least one numeric digit.");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)) {
      return setError("Password must contain at least one special symbol (e.g. @, #, $, etc.).");
    }
    if (!otpSent) {
      return setError("Please request and enter verification code first.");
    }
    if (otp.length !== 6) {
      return setError("Verification OTP code must be 6 digits");
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, otp, newPassword })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Reset failed. Please check your inputs.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recovery-page-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative' }}>
      
      {/* Top Brand Logo Header */}
      <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
          <img src="/logo.png" alt="Sudhir Tutorials Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', flexShrink: 0 }} />
          <span className="logo-text" style={{ whiteSpace: 'nowrap', fontSize: '1.85rem', fontWeight: 900, lineHeight: '1', letterSpacing: '0.5px' }}>
            <span style={{ color: '#ef4444' }}>SUDHIR</span> <span className="brand-tutorials-dynamic">TUTORIALS</span>
          </span>
        </Link>
      </div>

      {/* Account Recovery Card */}
      <div className="recovery-card-floating" style={{ maxWidth: '440px', width: '100%', borderRadius: '20px', padding: '1.6rem 1.8rem', position: 'relative', zIndex: 10 }}>
        <header style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
           <h1 className="recovery-title" style={{ fontSize: '1.7rem', marginBottom: '0.35rem', fontWeight: 800 }}>Account Recovery</h1>
           <p className="recovery-subtitle" style={{ fontSize: '0.88rem', margin: 0 }}>Verify your registered email to regain access to your account.</p>
        </header>

        {error && (
          <div className="animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem 0.9rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }} className="animate-fade-in">
             <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
             <h2 className="recovery-title" style={{ marginBottom: '0.5rem', fontSize: '1.4rem' }}>Password Reset!</h2>
             <p className="recovery-subtitle" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Your password has been updated successfully. Redirecting you to login...</p>
             <Link href="/login" style={{ textDecoration: 'none', background: '#ef4444', color: '#fff', padding: '0.65rem 1.4rem', borderRadius: '9px', fontWeight: 700, fontSize: '0.9rem', display: 'inline-block' }}>Go to Login Now</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            <div>
              <label className="recovery-label" style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.82rem' }}>Username / ID</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  required 
                  className="recovery-input"
                  placeholder="e.g. STU12345" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  disabled={otpSent}
                  style={{ flex: 1, minWidth: 0, padding: '0.65rem 0.85rem', borderRadius: '9px', fontSize: '0.88rem' }}
                />
                {!otpSent ? (
                  <button 
                    type="button" 
                    onClick={sendOtp} 
                    disabled={sendingOtp || !username}
                    style={{ padding: '0.65rem 1.1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {sendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => { setOtpSent(false); setOtp(''); }} 
                    style={{ padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.15)', color: 'inherit', border: '1px solid currentColor', borderRadius: '9px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            {otpSent && (
              <>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.82rem', color: '#10b981' }}>
                  📨 Verification code sent to: <strong>{emailMasked}</strong>
                </div>

                <div>
                  <label className="recovery-label" style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.82rem' }}>6-Digit Verification Code</label>
                  <input 
                    type="text" 
                    maxLength={6} 
                    required 
                    className="recovery-input"
                    placeholder="XXXXXX" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} 
                    style={{ letterSpacing: '0.4rem', fontSize: '1.1rem', textAlign: 'center', width: '100%', padding: '0.65rem', borderRadius: '9px', fontWeight: 'bold' }}
                  />
                </div>

                <div>
                  <label className="recovery-label" style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.82rem' }}>New Password</label>
                  <input type="password" required className="recovery-input" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '9px', fontSize: '0.88rem' }} />
                </div>

                <div>
                  <label className="recovery-label" style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.82rem' }}>Confirm New Password</label>
                  <input type="password" required className="recovery-input" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '9px', fontSize: '0.88rem' }} />
                </div>

                <button type="submit" disabled={loading} style={{ 
                  width: '100%', padding: '0.75rem', background: '#2563eb', color: '#fff', 
                  border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '0.92rem', 
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 15px -3px rgba(37, 99, 235, 0.4)', marginTop: '0.5rem'
                }}>
                  {loading ? "Resetting Password..." : "Reset Password & Login"}
                </button>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
               <Link href="/login" style={{ fontSize: '0.84rem', textDecoration: 'none' }} className="recovery-link">
                 Wait, I remembered it! <span style={{ fontWeight: 700, textDecoration: 'underline' }}>Back to Login</span>
               </Link>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .brand-tutorials-dynamic {
          color: #2563eb !important;
        }

        /* DARK THEME RULES (Black Mode) */
        :root[data-theme="dark"] .recovery-page-root {
          background-color: #0b1329 !important;
        }
        :root[data-theme="dark"] .brand-tutorials-dynamic {
          color: #2563eb !important;
        }
        :root[data-theme="dark"] .recovery-card-floating {
          background: linear-gradient(145deg, #1e293b 0%, #0f1729 100%) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45) !important;
        }
        :root[data-theme="dark"] .recovery-title { color: #ffffff !important; }
        :root[data-theme="dark"] .recovery-subtitle,
        :root[data-theme="dark"] .recovery-label { color: #cbd5e1 !important; }
        :root[data-theme="dark"] .recovery-link { color: #94a3b8 !important; }
        :root[data-theme="dark"] .recovery-input {
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          color: #ffffff !important;
        }

        /* LIGHT THEME RULES (White Mode) */
        :root[data-theme="light"] .recovery-page-root,
        :root:not([data-theme="dark"]) .recovery-page-root {
          background-color: #f8fafc !important;
        }
        :root[data-theme="light"] .recovery-card-floating,
        :root:not([data-theme="dark"]) .recovery-card-floating {
          background: #ffffff !important;
          color: #000000 !important;
          border: 1.5px solid #000000 !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08) !important;
        }
        :root[data-theme="light"] .recovery-title,
        :root[data-theme="light"] .recovery-label,
        :root:not([data-theme="dark"]) .recovery-title,
        :root:not([data-theme="dark"]) .recovery-label {
          color: #000000 !important;
        }
        :root[data-theme="light"] .recovery-subtitle,
        :root[data-theme="light"] .recovery-link,
        :root:not([data-theme="dark"]) .recovery-subtitle,
        :root:not([data-theme="dark"]) .recovery-link {
          color: #334155 !important;
        }
        :root[data-theme="light"] .recovery-input,
        :root:not([data-theme="dark"]) .recovery-input {
          background: #ffffff !important;
          border: 1.5px solid #000000 !important;
          color: #000000 !important;
        }
      `}</style>
    </div>
  );
}
