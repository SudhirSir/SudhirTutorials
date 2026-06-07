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

  const [changingPin, setChangingPin] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPassword: '', newPin: '' });
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pinSaving, setPinSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Bug Report State
  const [showBugReportModal, setShowBugReportModal] = useState(false);

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
        setPwMsg({ type: 'success', text: '✅ Password changed successfully!' });
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setChangingPassword(false);
      } else {
        setPwMsg({ type: 'error', text: d.error || 'Failed to change password.' });
      }
    } catch { setPwMsg({ type: 'error', text: 'Network error.' }); }
    finally { setPwSaving(false); }
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin.length !== 6 || isNaN(Number(pinForm.newPin)))
      return setPinMsg({ type: 'error', text: 'PIN must be exactly 6 digits.' });
    setPinSaving(true); setPinMsg(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECOVERY_PIN', ...pinForm })
      });
      const d = await res.json();
      if (res.ok) {
        setPinMsg({ type: 'success', text: '✅ Secret PIN updated successfully!' });
        setPinForm({ currentPassword: '', newPin: '' });
      } else {
        setPinMsg({ type: 'error', text: d.error || 'Failed to update PIN.' });
      }
    } catch { setPinMsg({ type: 'error', text: 'Network error.' }); }
    finally { setPinSaving(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('⚠️ Image size exceeds the 3 MB limit.');
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
          {profile.isProfileVerified && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
              🔵 Verified Account
            </div>
          )}

          {/* Quick password change button */}
          <button
            onClick={() => { setChangingPassword(v => !v); setChangingPin(false); }}
            style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            🔑 Change Password
          </button>

          {/* Quick Secret PIN change button */}
          <button
            onClick={() => { setChangingPin(v => !v); setChangingPassword(false); }}
            style={{ marginTop: '0.75rem', width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', color: '#f59e0b', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            🛡️ Reset Secret PIN
          </button>

          {/* Display Theme & Support */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.85rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>🌓 App Display Theme</span>
              <ThemeToggle />
            </div>
            
            {role !== 'ADMIN' && (
              <button
                type="button"
                onClick={() => setShowBugReportModal(true)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(239,68,68,0.04)', border: '1px dashed var(--primary)', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                🐞 Report a Bug / Suggestion
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

        {/* PIN Change Panel */}
        {changingPin && (
          <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#f59e0b' }}>Reset Secret Recovery PIN</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Your 6-digit Secret PIN is used to recover your account if you forget your password.
            </p>
            {pinMsg && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', background: pinMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: pinMsg.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${pinMsg.type === 'success' ? '#10b981' : '#ef4444'}` }}>
                {pinMsg.text}
              </div>
            )}
            <form onSubmit={handlePinChange} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" required style={inputStyle} value={pinForm.currentPassword} onChange={e => setPinForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Enter login password" />
              </div>
              <div>
                <label style={labelStyle}>New 6-Digit PIN</label>
                <input type="password" required maxLength={6} minLength={6} style={inputStyle} value={pinForm.newPin} onChange={e => {
                  const val = e.target.value.replace(/\D/g, ''); // only digits
                  setPinForm(f => ({ ...f, newPin: val }));
                }} placeholder="e.g. 123456" />
              </div>
              <button type="submit" disabled={pinSaving} style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', background: '#f59e0b', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: pinSaving ? 0.7 : 1 }}>
                {pinSaving ? 'Saving...' : 'Set Secret PIN'}
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
            <label style={labelStyle}>Email Address</label>
            <input type="email" style={inputStyle} value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
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
