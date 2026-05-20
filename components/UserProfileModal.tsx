"use client";

import { useState, useEffect } from 'react';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  onStartChat?: (user: { id: string; name: string; username: string; role: string; photoUrl: string | null }) => void;
}

export function UserProfileModal({ userId, onClose, onStartChat }: UserProfileModalProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const res = await fetch(`/api/user/profile?userId=${userId}`);
        if (!res.ok) throw new Error('Failed to fetch profile details');
        const data = await res.json();
        setProfileData(data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div style={backdropStyle} onClick={onClose}>
        <div style={modalStyle} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading profile...</p>
          </div>
          <style jsx>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div style={backdropStyle} onClick={onClose}>
        <div style={modalStyle} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={closeBtnStyle}>×</button>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>{error || 'Profile could not be loaded'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { name, username, role, isProfileVerified, photoUrl, createdAt, profile } = profileData;
  const joinDate = createdAt ? new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div className="glass-card animate-scale-up" style={modalStyle} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={closeBtnStyle} title="Close Profile">×</button>
        
        {/* Avatar Area */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid var(--primary)', margin: '0 auto 1rem', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
            {photoUrl ? (
              <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {name || 'Unnamed User'}
            {isProfileVerified && <span title="Verified Member" style={{ fontSize: '0.9rem', color: '#3b82f6' }}>🔵</span>}
          </h3>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{username}</p>
          
          <div style={{ marginTop: '0.75rem' }}>
            <span style={{ 
              fontSize: '0.7rem', 
              fontWeight: 800, 
              padding: '4px 12px', 
              borderRadius: '20px', 
              background: role === 'ADMIN' ? 'rgba(239,68,68,0.15)' : role === 'TEACHER' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
              color: role === 'ADMIN' ? '#f87171' : role === 'TEACHER' ? '#34d399' : '#818cf8',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {role}
            </span>
          </div>
        </div>

        {/* Details Section */}
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          borderRadius: '16px', 
          padding: '1.25rem', 
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          textAlign: 'left',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          <div>
            <span style={detailLabelStyle}>Joined Since</span>
            <span style={detailValueStyle}>{joinDate}</span>
          </div>

          {/* Student Specific Details */}
          {role === 'STUDENT' && profile && (
            <>
              {profile.className && (
                <div>
                  <span style={detailLabelStyle}>Class / Grade</span>
                  <span style={detailValueStyle}>{profile.className}</span>
                </div>
              )}
              {profile.batch && (
                <div>
                  <span style={detailLabelStyle}>Batch Assigned</span>
                  <span style={detailValueStyle}>{profile.batch}</span>
                </div>
              )}
              {profile.rollNumber && (
                <div>
                  <span style={detailLabelStyle}>Roll Number</span>
                  <span style={detailValueStyle}>{profile.rollNumber}</span>
                </div>
              )}
              {profile.school && (
                <div>
                  <span style={detailLabelStyle}>School / Institution</span>
                  <span style={detailValueStyle}>{profile.school}</span>
                </div>
              )}
              {profile.fatherName && (
                <div>
                  <span style={detailLabelStyle}>Father's Name</span>
                  <span style={detailValueStyle}>{profile.fatherName}</span>
                </div>
              )}
            </>
          )}

          {/* Teacher Specific Details */}
          {role === 'TEACHER' && profile && (
            <>
              {profile.subject && (
                <div>
                  <span style={detailLabelStyle}>Expertise / Subject</span>
                  <span style={detailValueStyle}>{profile.subject}</span>
                </div>
              )}
              {profile.qualification && (
                <div>
                  <span style={detailLabelStyle}>Qualification</span>
                  <span style={detailValueStyle}>{profile.qualification}</span>
                </div>
              )}
              {profile.experience && (
                <div>
                  <span style={detailLabelStyle}>Experience</span>
                  <span style={detailValueStyle}>{profile.experience}</span>
                </div>
              )}
            </>
          )}

          {/* Contact Details (If available or admin-viewable) */}
          {(profile?.email || profile?.phone) && (
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {profile.email && (
                <div>
                  <span style={detailLabelStyle}>Email Address</span>
                  <span style={{ ...detailValueStyle, wordBreak: 'break-all' }}>{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div>
                  <span style={detailLabelStyle}>Phone Number</span>
                  <span style={detailValueStyle}>{profile.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {onStartChat && (
            <button
              onClick={() => {
                onStartChat({ id: userId, name, username, role, photoUrl });
                onClose();
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                background: 'var(--primary)',
                border: 'none',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
              }}
            >
              💬 Send Direct Message
            </button>
          )}
          
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--card-bg-alt)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline styles for Modal Shell
const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  padding: '1rem',
  overflowY: 'auto'
};

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  padding: '2.25rem',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '24px',
  position: 'relative',
  boxShadow: 'var(--shadow-lg)',
  margin: 'auto'
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  background: 'rgba(239,68,68,0.1)',
  border: 'none',
  color: '#ef4444',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  fontSize: '1.1rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  transition: 'all 0.2s'
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '2px'
};

const detailValueStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--text)',
  fontWeight: 600
};
