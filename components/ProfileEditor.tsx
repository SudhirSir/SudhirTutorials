"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ThemeToggle } from './ThemeToggle';
import { BugReportModal } from './BugReportModal';


interface ProfileEditorProps {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

// Canvas compressor — resizes to 400x400, 70% JPEG quality (~30KB output)
function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileEditor({ role }: ProfileEditorProps) {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);



  const [error, setError] = useState<string | null>(null);

  // Bug Report State
  const [showBugReportModal, setShowBugReportModal] = useState(false);

  // Email Verification State
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [otpSentForEmail, setOtpSentForEmail] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerificationError, setEmailVerificationError] = useState('');
  const [mockOtpMsg, setMockOtpMsg] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/user/profile?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        const profileDob = data.profile?.dob;
        const formattedDob = profileDob ? (profileDob.includes('T') ? profileDob.split('T')[0] : profileDob) : '';
        setForm({
          name: data.name || '',
          email: data.profile?.email || '',
          phone: data.profile?.phone || '',
          address: data.profile?.address || '',
          dob: formattedDob,
          photoUrl: data.photoUrl || data.profile?.photoUrl || '',
          subject: data.profile?.subject || '',
          qualification: data.profile?.qualification || '',
          experience: data.profile?.experience || '',
          fatherName: data.profile?.fatherName || '',
          parentContact: data.profile?.parentContact || '',
          school: data.profile?.school || '',
          className: data.profile?.className || '',
          gender: data.profile?.gender || '',
          religion: data.profile?.religion || '',
        });
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Server responded with status ${res.status}`);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to connect to the server.');
    }
  };

  const sendEmailVerificationOtp = async () => {
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
      alert("Please enter a valid email address first.");
      return;
    }
    setSendingEmailOtp(true);
    setMockOtpMsg("");
    setEmailVerificationError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, type: "EMAIL_VERIFICATION" })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSentForEmail(true);
        if (data.isMock && data.mockOtp) {
          setMockOtpMsg(`Code: ${data.mockOtp} (shown for testing)`);
        }
      } else {
        alert(data.error || "Failed to send OTP code.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to send verification code due to network issues.");
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      setEmailVerificationError("OTP code must be 6 digits.");
      return;
    }
    setEmailVerificationError("");
    try {
      const res = await fetch("/api/user/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: emailOtp })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSentForEmail(false);
        setEmailOtp('');
        alert("✅ Email verified and updated successfully!");
        fetchProfile();
      } else {
        setEmailVerificationError(data.error || "Verification failed.");
      }
    } catch (err) {
      console.error(err);
      setEmailVerificationError("Verification failed due to network issues.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (form.name && (form.name.length > 150 || !/^[a-zA-Z\s]+$/.test(form.name))) {
        setMsg({ type: 'error', text: 'Name must contain only alphabets and spaces, and be at most 150 characters.' });
        setSaving(false);
        return;
      }
      if (form.fatherName && (form.fatherName.length > 150 || !/^[a-zA-Z\s]+$/.test(form.fatherName))) {
        setMsg({ type: 'error', text: "Father's name must contain only alphabets and spaces, and be at most 150 characters." });
        setSaving(false);
        return;
      }
      if (form.address && form.address.length > 150) {
        setMsg({ type: 'error', text: 'Address must be at most 150 characters.' });
        setSaving(false);
        return;
      }
      if (form.phone && form.phone.length !== 10) {
        setMsg({ type: 'error', text: 'Phone number must be exactly 10 digits.' });
        setSaving(false);
        return;
      }
      if (form.parentContact && form.parentContact.length !== 10) {
        setMsg({ type: 'error', text: 'Parent contact must be exactly 10 digits.' });
        setSaving(false);
        return;
      }
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setMsg({ type: 'success', text: '✅ Profile updated successfully!' });
        fetchProfile();
      } else {
        const d = await res.json();
        setMsg({ type: 'error', text: d.error || 'Failed to save.' });
      }
    } catch { setMsg({ type: 'error', text: 'Network error.' }); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return setPwMsg({ type: 'error', text: 'New passwords do not match.' });

    // Password complexity check
    const newPw = pwForm.newPassword;
    if (newPw.length < 8) {
      return setPwMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
    }
    if (!/[a-z]/.test(newPw)) {
      return setPwMsg({ type: 'error', text: 'Password must contain at least one lowercase letter.' });
    }
    if (!/[A-Z]/.test(newPw)) {
      return setPwMsg({ type: 'error', text: 'Password must contain at least one uppercase letter.' });
    }
    if (!/[0-9]/.test(newPw)) {
      return setPwMsg({ type: 'error', text: 'Password must contain at least one numeric digit.' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPw)) {
      return setPwMsg({ type: 'error', text: 'Password must contain at least one special symbol (e.g. @, #, $, etc.).' });
    }

    setPwSaving(true); setPwMsg(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PASSWORD', ...pwForm })
      });
      const d = await res.json();
      if (res.ok) {
        setPwMsg({ type: 'success', text: 'Password changed successfully!' });
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setChangingPassword(false);
      } else {
        setPwMsg({ type: 'error', text: d.error || 'Failed to change password.' });
      }
    } catch { setPwMsg({ type: 'error', text: 'Network error.' }); }
    finally { setPwSaving(false); }
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Image size exceeds the 3 MB limit.');
      e.target.value = '';
      return;
    }

    const compressed = await compressImage(file);
    setForm((f: any) => ({ ...f, photoUrl: compressed }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.85rem 1rem', borderRadius: '12px',
    background: 'var(--input-bg)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '0.4rem', display: 'block'
  };

  if (error) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: '#ef4444' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--text)' }}>Failed to load profile</div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>{error}</p>
      <button 
        onClick={fetchProfile}
        style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }}
      >
        🔄 Retry Loading Profile
      </button>
    </div>
  );

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 1rem' }} />
      Loading profile...
    </div>
  );

  return (
    <div className="profile-grid-container">

      {/* LEFT: Avatar Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          {/* Profile Photo */}
          <div style={{ position: 'relative', width: '130px', margin: '0 auto 1.5rem', cursor: 'pointer' }}>
            <div style={{ width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--primary)', background: 'rgba(255,255,255,0.05)' }}>
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                  {(form.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Camera overlay */}
            <label htmlFor="photo-upload" style={{
              position: 'absolute', bottom: '4px', right: '4px',
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'var(--primary)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--background)',
              fontSize: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
            }}>
              📷
            </label>
            <input id="photo-upload" type="file" accept="image/*" onChange={handleFileUpload}
              style={{ display: 'none' }} />
          </div>

          <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{profile.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{profile.username}</div>
          <div style={{ marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: 'var(--primary)' }}>
              {role}
            </span>
          </div>
          {profile?.isProfileVerified && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Verified Account
            </div>
          )}

          {/* Quick password change button */}
          <button
            onClick={() => setChangingPassword(v => !v)}
            style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Change Password
          </button>

          {/* Display Theme & Support */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.85rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>App Display Theme</span>
              <ThemeToggle />
            </div>
            
            {role !== 'ADMIN' && (
              <button
                type="button"
                onClick={() => setShowBugReportModal(true)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(239,68,68,0.04)', border: '1px dashed var(--primary)', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                Report a Bug / Suggestion
              </button>
            )}
          </div>
        </div>

        {/* Password Change Panel */}
        {changingPassword && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Change Password</h4>
            {pwMsg && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', background: pwMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: pwMsg.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${pwMsg.type === 'success' ? '#10b981' : '#ef4444'}` }}>
                {pwMsg.text}
              </div>
            )}
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input type="password" required style={inputStyle} value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>New Password</label>
                <input type="password" required minLength={6} style={inputStyle} value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input type="password" required style={inputStyle} value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              </div>
              <button type="submit" disabled={pwSaving} style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: pwSaving ? 0.7 : 1 }}>
                {pwSaving ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* RIGHT: Edit Form */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Edit My Profile</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Update your personal information</p>
        </div>

        {msg && (
          <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: msg.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${msg.type === 'success' ? '#10b981' : '#ef4444'}` }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave} className="form-grid">

          {/* Common Fields */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={form.name} maxLength={150} onChange={e => {
              const val = e.target.value;
              if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                setForm((f: any) => ({ ...f, name: val }));
              }
            }} required disabled={role !== 'ADMIN'} title={role !== 'ADMIN' ? "Only Admin can edit Full Name" : ""} />
          </div>
          <div>
            <label style={labelStyle}>Date of Birth</label>
            <input type="date" style={inputStyle} value={form.dob} onChange={e => setForm((f: any) => ({ ...f, dob: e.target.value }))} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Email Address</label>
              {profile?.profile?.emailVerified && form.email === (profile?.profile?.email || '') ? (
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>✓ Verified</span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>⚠ Unverified</span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="email" 
                style={{ ...inputStyle, flex: 1 }} 
                value={form.email} 
                onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} 
              />
              {!(profile?.profile?.emailVerified && form.email === (profile?.profile?.email || '')) && form.email && (
                <button
                  type="button"
                  onClick={sendEmailVerificationOtp}
                  disabled={sendingEmailOtp}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    background: 'var(--primary)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {sendingEmailOtp ? 'Sending...' : 'Verify'}
                </button>
              )}
            </div>
            
            {otpSentForEmail && (
              <div style={{ marginTop: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border)', padding: '1rem', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Enter the 6-digit OTP code sent to <strong>{form.email}</strong>:
                </p>
                {mockOtpMsg && (
                  <div style={{ color: '#10b981', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                    {mockOtpMsg}
                  </div>
                )}
                {emailVerificationError && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    {emailVerificationError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter OTP"
                    value={emailOtp}
                    onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    style={{ ...inputStyle, width: '120px', padding: '0.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={verifyEmailOtp}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '12px',
                      background: '#10b981',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpSentForEmail(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input style={inputStyle} value={form.phone} maxLength={10} onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              setForm((f: any) => ({ ...f, phone: val }));
            }} />
          </div>
          <div className="grid-span-2">
            <label style={labelStyle}>Residential Address</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.address} maxLength={150} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} />
          </div>

          {/* Student-specific */}
          {role === 'STUDENT' && (
            <>
              <div>
                <label style={labelStyle}>Father's Name</label>
                <input style={inputStyle} value={form.fatherName} maxLength={150} onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                    setForm((f: any) => ({ ...f, fatherName: val }));
                  }
                }} />
              </div>
              <div>
                <label style={labelStyle}>Parent Contact</label>
                <input style={inputStyle} value={form.parentContact} maxLength={10} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setForm((f: any) => ({ ...f, parentContact: val }));
                }} />
              </div>
              <div>
                <label style={labelStyle}>School / Institution</label>
                <input style={inputStyle} value={form.school} onChange={e => setForm((f: any) => ({ ...f, school: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Class / Grade</label>
                <input style={inputStyle} value={form.className} onChange={e => setForm((f: any) => ({ ...f, className: e.target.value }))} disabled title="Only Admin can edit Class / Grade" />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select style={inputStyle} value={form.gender} onChange={e => setForm((f: any) => ({ ...f, gender: e.target.value }))}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Religion</label>
                <input style={inputStyle} value={form.religion} onChange={e => setForm((f: any) => ({ ...f, religion: e.target.value }))} placeholder="e.g. Hinduism, Islam, Christianity, etc." />
              </div>
            </>
          )}

          {/* Teacher-specific */}
          {role === 'TEACHER' && (
            <>
              <div>
                <label style={labelStyle}>Subject Expertise</label>
                <input style={inputStyle} value={form.subject} onChange={e => setForm((f: any) => ({ ...f, subject: e.target.value }))} disabled title="Only Admin can edit Subject Expertise" />
              </div>
              <div>
                <label style={labelStyle}>Qualification</label>
                <input style={inputStyle} value={form.qualification} onChange={e => setForm((f: any) => ({ ...f, qualification: e.target.value }))} />
              </div>
              <div className="grid-span-2">
                <label style={labelStyle}>Teaching Experience</label>
                <input style={inputStyle} value={form.experience} onChange={e => setForm((f: any) => ({ ...f, experience: e.target.value }))} />
              </div>
            </>
          )}

          {/* Administrative Information Section (Read-Only) */}
          {role === 'STUDENT' && (
            <div className="grid-span-2" style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.5px' }}>
                🏫 Administrative Details (Read-Only)
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Roll Number</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{profile.profile?.rollNumber || 'Not Assigned'}</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Registration Number</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{profile.profile?.registrationNo || 'Not Assigned'}</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Aadhaar Number</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{profile.profile?.aadhaarNumber || 'Not Provided'}</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Academic Grade</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{profile.profile?.grade || 'Not Assigned'}</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Academic Batch</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{profile.profile?.batch || 'Not Assigned'}</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Attendance Rate</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: profile.profile?.attendancePercent >= 75 ? '#10b981' : '#f59e0b' }}>
                    {profile.profile?.attendancePercent !== null && profile.profile?.attendancePercent !== undefined
                      ? `${profile.profile.attendancePercent.toFixed(1)}%`
                      : 'No Records'}
                  </div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Academic Performance</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                    {profile.profile?.marksObtained !== null && profile.profile?.marksTotal
                      ? `${profile.profile.marksObtained} / ${profile.profile.marksTotal} (${((profile.profile.marksObtained / profile.profile.marksTotal) * 100).toFixed(1)}%)`
                      : 'No Test Results'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {role === 'TEACHER' && (
            <div className="grid-span-2" style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.5px' }}>
                💼 Employment & Financial Details (Read-Only)
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Assigned Monthly Salary</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                    {profile.profile?.salary !== null && profile.profile?.salary !== undefined
                      ? `₹${profile.profile.salary.toLocaleString('en-IN')}`
                      : '₹0'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid-span-2" style={{ marginTop: '1.5rem' }}>
            <button type="submit" disabled={saving} style={{ width: '100%', padding: '0.75rem 1.5rem', borderRadius: '14px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 20px -5px rgba(239,68,68,0.5)' }}>
              {saving ? 'Saving Changes...' : '💾 Save My Profile'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .profile-grid-container {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
          align-items: start;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }
        .grid-span-2 {
          grid-column: span 2;
        }
        .spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .profile-grid-container {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .form-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .grid-span-2 {
            grid-column: span 1;
          }
        }
      `}</style>
      <BugReportModal isOpen={showBugReportModal} onClose={() => setShowBugReportModal(false)} />
    </div>
  );
}
