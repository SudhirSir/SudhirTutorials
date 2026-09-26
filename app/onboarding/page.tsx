"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { safeSessionStorage } from "@/lib/safeStorage";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const allowed = safeSessionStorage.getItem("onboarding_allowed");
      if (!allowed) {
        signOut({ redirect: false }).then(() => {
          window.location.href = "/login";
        });
      } else {
        safeSessionStorage.removeItem("onboarding_allowed");
      }
    }
  }, []);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [email, setEmail] = useState((session?.user as any)?.email || "");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState(""); // Only for students
  const [parentContact, setParentContact] = useState(""); // Only for students
  const [className, setClassName] = useState("");
  const [board, setBoard] = useState("");
  const [school, setSchool] = useState("");
  const [address, setAddress] = useState("");

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
        body: JSON.stringify({ email, type: "ACCOUNT_VERIFICATION" })
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
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();
    const cleanPhone = phone.trim();
    const cleanParentName = parentName.trim();
    const cleanParentContact = parentContact.trim();
    const cleanClassName = className.trim();
    const cleanBoard = board.trim();
    const cleanSchool = school.trim();
    const cleanAddress = address.trim();
    const cleanEmail = email.trim();

    if (cleanPassword) {
      if (cleanPassword !== cleanConfirmPassword) {
        return setError("Passwords do not match");
      }
      if (cleanPassword.length < 8) {
        return setError("Password must be at least 8 characters long.");
      }
      if (!/[a-z]/.test(cleanPassword)) {
        return setError("Password must contain at least one lowercase letter.");
      }
      if (!/[A-Z]/.test(cleanPassword)) {
        return setError("Password must contain at least one uppercase letter.");
      }
      if (!/[0-9]/.test(cleanPassword)) {
        return setError("Password must contain at least one numeric digit.");
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(cleanPassword)) {
        return setError("Password must contain at least one special symbol (e.g. @, #, $, etc.).");
      }
    }
    if ((session?.user as any)?.mustChangePassword && !cleanPassword) {
      return setError("Please set a new password");
    }
    if (role === 'STUDENT') {
      if (!cleanParentName) {
        return setError("Parent/Guardian name is required.");
      }
      if (cleanParentName.length > 150) {
        return setError("Parent/Guardian name must be at most 150 characters.");
      }
      if (!/^[a-zA-Z\s]+$/.test(cleanParentName)) {
        return setError("Parent/Guardian name must contain only alphabets and spaces.");
      }
      if (cleanParentContact && !/^\d{10}$/.test(cleanParentContact)) {
        return setError("Parent contact number must be exactly 10 digits.");
      }
    }
    if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
      return setError("Phone number must be exactly 10 digits.");
    }
    if (!(session?.user as any)?.email) {
      if (!otpSent) {
        return setError("Please verify your email address by sending and entering the OTP first.");
      }
      if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
        return setError("Verification OTP must be exactly 6 digits");
      }
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          password: cleanPassword, 
          email: cleanEmail, 
          phone: cleanPhone, 
          parentName: cleanParentName, 
          parentContact: cleanParentContact || cleanPhone, 
          className: cleanClassName,
          board: cleanBoard,
          school: cleanSchool,
          address: cleanAddress,
          otp 
        })
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'var(--background)', padding: '2rem 1rem' }}>
      <div className="bg-glow"></div>
      
      <div className="glass-card onboarding-card" style={{ width: '100%', maxWidth: '600px', padding: '3rem', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <img src="/logo.png" alt="Sudhir Tutorials Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.85rem', fontWeight: 900, lineHeight: '1', letterSpacing: '0.5px' }}>
              <span style={{ color: '#ef4444' }}>SUDHIR</span> <span style={{ color: '#2563eb' }}>TUTORIALS</span>
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.35rem', fontWeight: 800 }}>Complete Your Profile</h2>
          <p style={{ color: 'var(--text-muted)' }}>Welcome! Please set your password and fill in your details for verification.</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {(session.user as any)?.mustChangePassword && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 800 }}>1. Set New Password</h3>
              
              <div className="input-group">
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="Enter new strong password"
                    style={{ width: '100%', paddingRight: '2.75rem', borderRadius: '10px', padding: '0.75rem 2.75rem 0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} 
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
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="Re-enter new password"
                    style={{ width: '100%', paddingRight: '2.75rem', borderRadius: '10px', padding: '0.75rem 2.75rem 0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!(session.user as any)?.isProfileVerified && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 800 }}>2. Profile & Contact Information</h3>
              
              <div className="onboarding-form-row" style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>Phone Number</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="10-digit mobile number"
                    value={phone} 
                    maxLength={10} 
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} 
                    style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} 
                  />
                </div>
              </div>
              
              {role === 'STUDENT' && (
                <>
                  <div className="onboarding-form-row" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>Parent/Guardian Name *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Father or Mother Name"
                        value={parentName} 
                        maxLength={150} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                            setParentName(val);
                          }
                        }} 
                        style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} 
                      />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>Parent Contact Number</label>
                      <input 
                        type="text" 
                        placeholder="10-digit phone number"
                        value={parentContact} 
                        maxLength={10} 
                        onChange={e => setParentContact(e.target.value.replace(/\D/g, ''))} 
                        style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} 
                      />
                    </div>
                  </div>

                  <div className="onboarding-form-row" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>Class / Grade</label>
                      <select 
                        value={className} 
                        onChange={e => setClassName(e.target.value)}
                        style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      >
                        <option value="">Select Class</option>
                        <option value="Class 6">Class 6</option>
                        <option value="Class 7">Class 7</option>
                        <option value="Class 8">Class 8</option>
                        <option value="Class 9">Class 9</option>
                        <option value="Class 10">Class 10</option>
                        <option value="Class 11">Class 11</option>
                        <option value="Class 12">Class 12</option>
                        <option value="NEET / JEE Target">NEET / JEE Target</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>Education Board</label>
                      <select 
                        value={board} 
                        onChange={e => setBoard(e.target.value)}
                        style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      >
                        <option value="">Select Board</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="UP Board">UP Board</option>
                        <option value="Bihar Board">Bihar Board</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="onboarding-form-row" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>School Name</label>
                      <input 
                        type="text" 
                        placeholder="Current school name"
                        value={school} 
                        onChange={e => setSchool(e.target.value)} 
                        style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} 
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="onboarding-form-row" style={{ marginTop: '1rem' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>Address</label>
                  <textarea 
                    placeholder="Full residential address"
                    value={address} 
                    rows={2}
                    onChange={e => setAddress(e.target.value)} 
                    style={{ width: '100%', borderRadius: '10px', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', resize: 'vertical' }} 
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 800 }}>3. Email Verification</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Verify your email address to secure your account.</p>
            
            <div className="input-group" style={{ marginBottom: otpSent ? '1rem' : 0 }}>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>Email Address</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="email" 
                  required 
                  placeholder="e.g. email@example.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  disabled={otpSent || !!(session.user as any)?.email}
                  style={{ flex: 1, minWidth: 0, padding: '0.85rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                {(!(session.user as any)?.email && !otpSent) ? (
                  <button 
                    type="button" 
                    onClick={sendOtp} 
                    disabled={sendingOtp || !email}
                    style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {sendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                ) : (!(session.user as any)?.email && otpSent) ? (
                  <button 
                    type="button" 
                    onClick={() => { setOtpSent(false); setOtp(''); setMockOtpMessage(''); }} 
                    style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    Change
                  </button>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>✅ Verified by Google</span>
                )}
              </div>
            </div>

            {(!(session.user as any)?.email && otpSent) && (
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label style={{ marginTop: '0.5rem', display: 'block', fontWeight: 600, fontSize: '0.85rem' }}>6-Digit Verification OTP</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  placeholder="e.g. 123456" 
                  required 
                  value={otp} 
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} 
                  style={{ letterSpacing: '0.5rem', fontSize: '1.2rem', textAlign: 'center', width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
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
            {loading ? "Saving & Submitting Details..." : "Save Profile & Request Verification"}
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
            gap: 1rem;
          }
          h2 {
            font-size: 1.6rem !important;
          }
        }
      `}</style>
    </div>
  );
}
