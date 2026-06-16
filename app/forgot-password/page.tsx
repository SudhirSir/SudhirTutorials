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
  const [mockOtpMessage, setMockOtpMessage] = useState("");
  const [emailMasked, setEmailMasked] = useState("");

  const sendOtp = async () => {
    if (!username.trim()) {
      return setError("Please enter your Username / ID first.");
    }
    setError("");
    setSendingOtp(true);
    setMockOtpMessage("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
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

        if (data.isMock && data.mockOtp) {
          setMockOtpMessage(`Code: ${data.mockOtp} (shown for testing)`);
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '2rem' }}>
      <div className="bg-glow"></div>
      
      <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '3rem', position: 'relative', zIndex: 10 }}>
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
           <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: 800 }}>Account Recovery</h1>
           <p style={{ color: 'var(--text-muted)' }}>Verify your registered email to regain access to your account.</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }} className="animate-fade-in">
             <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✅</div>
             <h2 style={{ marginBottom: '1rem' }}>Password Reset!</h2>
             <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your password has been updated successfully. Redirecting you to login...</p>
             <Link href="/login" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Login Now</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="input-group">
              <label>Username / ID</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. STU12345" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  disabled={otpSent}
                  style={{ flex: 1, minWidth: 0 }}
                />
                {!otpSent ? (
                  <button 
                    type="button" 
                    onClick={sendOtp} 
                    disabled={sendingOtp || !username}
                    style={{ padding: '0.85rem 1.25rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {sendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => { setOtpSent(false); setOtp(''); setMockOtpMessage(''); }} 
                    style={{ padding: '0.85rem 1.25rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            {otpSent && (
              <>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  📨 Verification code sent to: <strong style={{ color: 'var(--text)' }}>{emailMasked}</strong>
                </div>

                <div className="input-group">
                  <label>Verification OTP Code</label>
                  <input 
                    type="text" 
                    maxLength={6} 
                    required 
                    placeholder="XXXXXX" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} 
                    style={{ letterSpacing: '0.5rem', fontSize: '1.2rem', textAlign: 'center', width: '100%' }}
                  />
                  {mockOtpMessage && (
                    <div style={{ marginTop: '0.5rem', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                      💡 Local testing: {mockOtpMessage}
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', background: 'var(--border)', margin: '1rem 0' }}></div>

                <div className="input-group">
                  <label>New Password</label>
                  <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>

                <div className="input-group">
                  <label>Confirm New Password</label>
                  <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>

                <button type="submit" disabled={loading} style={{ 
                  width: '100%', padding: '1.2rem', background: 'var(--primary)', color: '#fff', 
                  border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', 
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 20px -5px rgba(99, 102, 241, 0.5)', marginTop: '1rem'
                }}>
                  {loading ? "Resetting Password..." : "Reset Password & Login"}
                </button>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
               <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>Wait, I remembered it! **Back to Login**</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
