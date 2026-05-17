"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          name: data.name || '',
          email: data.profile?.email || '',
          phone: data.profile?.phone || '',
          address: data.profile?.address || '',
          dob: data.profile?.dob || '',
          photoUrl: data.profile?.photoUrl || '',
          subject: data.profile?.subject || '',
          qualification: data.profile?.qualification || '',
          experience: data.profile?.experience || '',
          fatherName: data.profile?.fatherName || '',
          parentContact: data.profile?.parentContact || '',
          school: data.profile?.school || '',
          className: data.profile?.className || '',
        });
      }
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setForm((f: any) => ({ ...f, photoUrl: compressed }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.85rem 1rem', borderRadius: '12px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '0.4rem', display: 'block'
  };

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      <div className="spinner" style={{ margin: '0 auto 1rem' }} />
      Loading profile...
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', alignItems: 'start' }}>

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
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>@{profile.username}</div>
          <div style={{ marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', background: 'rgba(99,102,241,0.15)', color: 'var(--primary)' }}>
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
            onClick={() => setChangingPassword(v => !v)}
            style={{ marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            🔑 Change Password
          </button>
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
              <button type="submit" disabled={pwSaving} style={{ padding: '0.85rem', borderRadius: '12px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: pwSaving ? 0.7 : 1 }}>
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
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Update your personal information and profile photo</p>
        </div>

        {msg && (
          <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: msg.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${msg.type === 'success' ? '#10b981' : '#ef4444'}` }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          {/* Common Fields */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required />
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
            <input style={inputStyle} value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Residential Address</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} />
          </div>

          {/* Photo URL field */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Profile Photo URL (or use camera icon above to upload)</label>
            <input type="text" style={inputStyle} value={form.photoUrl && !form.photoUrl.startsWith('data:') ? form.photoUrl : ''} onChange={e => setForm((f: any) => ({ ...f, photoUrl: e.target.value }))} placeholder="https://example.com/photo.jpg" />
          </div>

          {/* Student-specific */}
          {role === 'STUDENT' && (
            <>
              <div>
                <label style={labelStyle}>Father's Name</label>
                <input style={inputStyle} value={form.fatherName} onChange={e => setForm((f: any) => ({ ...f, fatherName: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Parent Contact</label>
                <input style={inputStyle} value={form.parentContact} onChange={e => setForm((f: any) => ({ ...f, parentContact: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>School / Institution</label>
                <input style={inputStyle} value={form.school} onChange={e => setForm((f: any) => ({ ...f, school: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Class / Grade</label>
                <input style={inputStyle} value={form.className} onChange={e => setForm((f: any) => ({ ...f, className: e.target.value }))} />
              </div>
            </>
          )}

          {/* Teacher-specific */}
          {role === 'TEACHER' && (
            <>
              <div>
                <label style={labelStyle}>Subject Expertise</label>
                <input style={inputStyle} value={form.subject} onChange={e => setForm((f: any) => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Qualification</label>
                <input style={inputStyle} value={form.qualification} onChange={e => setForm((f: any) => ({ ...f, qualification: e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Teaching Experience</label>
                <input style={inputStyle} value={form.experience} onChange={e => setForm((f: any) => ({ ...f, experience: e.target.value }))} />
              </div>
            </>
          )}

          <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
            <button type="submit" disabled={saving} style={{ width: '100%', padding: '1rem', borderRadius: '14px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 20px -5px rgba(99,102,241,0.5)' }}>
              {saving ? 'Saving Changes...' : '💾 Save My Profile'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
