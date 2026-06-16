"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState(""); // Only for students
  const [parentContact, setParentContact] = useState(""); // Only for students
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [mockOtpMessage, setMockOtpMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const role = (session?.user as any)?.role;

  const sendOtp = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return setError("Please enter a valid email address first.");
    }
    setError("");
    setSendingOtp(true);
    setMockOtpMessage("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
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
    if (password) {
      if (password !== confirmPassword) {
        return setError("Passwords do not match");
      }
      if (password.length < 8) {
        return setError("Password must be at least 8 characters long.");
      }
      if (!/[a-z]/.test(password)) {
        return setError("Password must contain at least one lowercase letter.");
      }
      if (!/[A-Z]/.test(password)) {
        return setError("Password must contain at least one uppercase letter.");
      }
      if (!/[0-9]/.test(password)) {
        return setError("Password must contain at least one numeric digit.");
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
        return setError("Password must contain at least one special symbol (e.g. @, #, $, etc.).");
      }
    }
    if ((session?.user as any)?.mustChangePassword && !password) {
      return setError("Please set a new password");
    }
    if (role === 'STUDENT') {
      if (!parentName.trim()) {
        return setError("Parent/Guardian name is required.");
      }
      if (parentName.length > 150) {
        return setError("Parent/Guardian name must be at most 150 characters.");
      }
      if (!/^[a-zA-Z\s]+$/.test(parentName)) {
        return setError("Parent/Guardian name must contain only alphabets and spaces.");
      }
    }
    if (phone && !/^\d{10}$/.test(phone.trim())) {
      return setError("Phone number must be exactly 10 digits.");
    }
    if (!otpSent) {
      return setError("Please verify your email address by sending and entering the OTP first.");
    }
    if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
      return setError("Verification OTP must be exactly 6 digits");
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, email, phone, parentName, parentContact, otp })
      });

      if (res.ok) {
        // Update session via NextAuth
        await update({ onboardingCompleted: true, isProfileVerified: false, mustChangePassword: false });
        router.push("/waiting-verification");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update profile");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--background)' }}><div className="spinner"></div></div>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'var(--background)' }}>
      <div className="bg-glow"></div>
      
      <div className="glass-card onboarding-card" style={{ width: '100%', maxWidth: '550px', padding: '3rem', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800 }}>Complete Your Profile</h2>
          <p style={{ color: 'var(--text-muted)' }}>Welcome! Please update your default password and complete your profile before proceeding to the dashboard.</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {(session.user as any)?.mustChangePassword && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff' }}>1. Set New Password</h3>
              <div className="input-group">
                <label>New Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Confirm Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
          )}

          {!(session.user as any)?.isProfileVerified && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff' }}>2. Contact Information</h3>
              <div className="onboarding-form-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Phone Number</label>
                  <input type="text" required value={phone} maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} style={{ width: '100%' }} />
                </div>
              </div>
              
              {role === 'STUDENT' && (
                <div className="onboarding-form-row" style={{ marginTop: '1.25rem' }}>
                  <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Parent/Guardian Name</label>
                    <input type="text" required value={parentName} maxLength={150} onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                        setParentName(val);
                      }
                    }} style={{ width: '100%' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#fff' }}>3. Email Verification</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Verify your email address to secure your account.</p>
            
            <div className="input-group" style={{ marginBottom: otpSent ? '1rem' : 0 }}>
              <label>Email Address</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="email" 
                  required 
                  placeholder="e.g. email@example.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  disabled={otpSent}
                  style={{ flex: 1, minWidth: 0, padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                {!otpSent ? (
                  <button 
                    type="button" 
                    onClick={sendOtp} 
                    disabled={sendingOtp || !email}
                    style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {sendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => { setOtpSent(false); setOtp(''); setMockOtpMessage(''); }} 
                    style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            {otpSent && (
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ marginTop: '0.5rem' }}>6-Digit Verification OTP</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  placeholder="e.g. 123456" 
                  required 
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
            )}
          </div>

          <button type="submit" disabled={loading} style={{ 
            width: '100%', padding: '1.2rem', background: 'var(--primary)', color: '#fff', 
            border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', 
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            boxShadow: '0 4px 20px -5px rgba(99, 102, 241, 0.5)', marginTop: '0.5rem'
          }}>
            {loading ? "Saving & Verifying..." : "Save & Continue to Dashboard"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .spinner { width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .onboarding-form-row {
          display: flex;
          gap: 1rem;
        }

        @media (max-width: 600px) {
          .onboarding-card {
            padding: 1.75rem 1.25rem !important;
            margin: 1rem !important;
            border-radius: 18px !important;
          }
          .onboarding-form-row {
            flex-direction: column;
            gap: 1.25rem;
          }
          h2 {
            font-size: 1.6rem !important;
          }
        }
      `}</style>
    </div>
  );
}
