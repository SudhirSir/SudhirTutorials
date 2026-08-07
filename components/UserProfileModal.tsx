"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  onStartChat?: (user: { id: string; name: string; username: string; role: string; photoUrl: string | null }) => void;
}

export function UserProfileModal({ userId, onClose, onStartChat }: UserProfileModalProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  if (!mounted || typeof window === 'undefined') return null;

  if (loading) {
    return createPortal(
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            <Spinner size="lg" />
            <p className="input-label" style={{ marginTop: '1rem' }}>Loading profile...</p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (error || !profileData) {
    return createPortal(
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Error</h3>
            <button onClick={onClose} className="modal-close-btn">×</button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center' }}>
            <p className="input-error-msg">{error || 'Profile could not be loaded'}</p>
          </div>
          <div className="modal-footer">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const { name, username, role, isProfileVerified, photoUrl, createdAt, profile } = profileData;
  const joinDate = createdAt ? new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  const badgeVariant = role === 'ADMIN' ? 'danger' : role === 'TEACHER' ? 'success' : 'info';

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '440px', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">User Profile</h3>
          <button onClick={onClose} className="modal-close-btn" title="Close Profile">×</button>
        </div>

        <div className="modal-body">
          {/* Avatar Area */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: '3px solid var(--primary)', margin: '0 auto 1rem', overflow: 'hidden', background: 'var(--surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--text-heading)' }}>
              {photoUrl ? (
                <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {name || 'Unnamed User'}
              {isProfileVerified && (
                <span title="Verified Member" style={{ fontSize: '0.9rem', color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </span>
              )}
            </h3>
            <p className="input-label" style={{ marginTop: 4 }}>{username}</p>
            
            <div style={{ marginTop: '0.5rem' }}>
              <Badge variant={badgeVariant}>{role}</Badge>
            </div>
          </div>

          {/* Details Section */}
          <div className="card-ui" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <span className="input-label" style={{ fontSize: '0.75rem' }}>Joined Since</span>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{joinDate}</div>
            </div>

            {/* Student Specific Details */}
            {role === 'STUDENT' && profile && (
              <>
                {profile.className && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Class / Grade</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.className}</div>
                  </div>
                )}
                {profile.batch && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Batch Assigned</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.batch}</div>
                  </div>
                )}
                {profile.rollNumber && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Roll Number</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.rollNumber}</div>
                  </div>
                )}
                {profile.school && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>School / Institution</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.school}</div>
                  </div>
                )}
                {profile.fatherName && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Father's Name</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.fatherName}</div>
                  </div>
                )}
                {profile.gender && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Gender</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.gender}</div>
                  </div>
                )}
              </>
            )}

            {/* Teacher Specific Details */}
            {role === 'TEACHER' && profile && (
              <>
                {profile.subject && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Expertise / Subject</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.subject}</div>
                  </div>
                )}
                {profile.qualification && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Qualification</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.qualification}</div>
                  </div>
                )}
                {profile.experience && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Experience</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.experience}</div>
                  </div>
                )}
              </>
            )}

            {/* Contact Details */}
            {(profile?.email || profile?.phone) && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {profile.email && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Email Address</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>{profile.email}</div>
                  </div>
                )}
                {profile.phone && (
                  <div>
                    <span className="input-label" style={{ fontSize: '0.75rem' }}>Phone Number</span>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile.phone}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {onStartChat && (
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  onStartChat({ id: userId, name, username, role, photoUrl });
                  onClose();
                }}
              >
                💬 Send Direct Message
              </Button>
            )}
            
            <Button variant="outline" fullWidth onClick={onClose}>
              Close Profile
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
