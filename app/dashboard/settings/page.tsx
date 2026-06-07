"use client";

import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BugReportModal } from '@/components/BugReportModal';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);



  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/user/settings');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return alert("Passwords don't match");
    
    setIsChangingPass(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PASSWORD', currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert(data.error || 'Failed to update password');
      }
    } catch (e) { alert('Error updating password'); }
    finally { setIsChangingPass(false); }
  };



  if (isLoading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Profile Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage your account security and personal information.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Account Info Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
             <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: 'white' }}>
                {user?.name?.charAt(0) || user?.username?.charAt(0)}
             </div>
             <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{user?.name}</h2>
                <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0' }}>{user?.username}</p>
                <span className="role-badge" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>{user?.role}</span>
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Created</span>
                <span style={{ fontWeight: 600 }}>{(() => {
                  const d = new Date(user?.createdAt);
                  if (isNaN(d.getTime())) return '';
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  return `${day}/${month}/${year}`;
                })()}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Verification Status</span>
                <span style={{ fontWeight: 600, color: user?.isProfileVerified ? '#10b981' : '#f59e0b' }}>
                  {user?.isProfileVerified ? '✓ Verified' : '⚠ Pending'}
                </span>
             </div>
          </div>
        </div>

        {/* Update Password Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Change Password</h3>
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
             <div className="input-group">
                <label>Current Password</label>
                <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
             </div>
             <div className="input-group">
                <label>New Password</label>
                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
             </div>
             <div className="input-group">
                <label>Confirm New Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
             </div>
             <button type="submit" className="btn-primary" disabled={isChangingPass}>
                {isChangingPass ? 'Updating...' : 'Update Password'}
             </button>
          </form>
        </div>

        {/* Preferences & Support Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Preferences & Support</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>🌓 App Display Theme</span>
              <ThemeToggle />
            </div>
            
            <button
              type="button"
              onClick={() => setShowBugReportModal(true)}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(239,68,68,0.04)',
                border: '1px dashed var(--primary)',
                color: 'var(--primary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.04)'}
            >
              🐞 Report a Bug / Suggestion
            </button>
          </div>
        </div>

      </div>

      <BugReportModal isOpen={showBugReportModal} onClose={() => setShowBugReportModal(false)} />

      <style jsx>{`
        .loading-container {
          display: flex;
          height: 60vh;
          align-items: center;
          justify-content: center;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255,255,255,0.1);
          border-top: 5px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .role-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
