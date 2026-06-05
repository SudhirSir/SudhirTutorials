"use client";

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  name: string;
  isVerified?: boolean;
  photoUrl?: string;
}

export function Sidebar({ activeTab, setActiveTab, role, name, isVerified, photoUrl }: SidebarProps) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      (window as any).isLoggingOut = true;
      sessionStorage.setItem('isLoggingOut', 'true');
      
      // Clear sessionStorage (tabSessionActive, etc.)
      sessionStorage.clear();
      
      // Keep theme but clear custom localStorage user-related keys
      const theme = localStorage.getItem('theme');
      localStorage.clear();
      if (theme) {
        localStorage.setItem('theme', theme);
      }
    }
    await signOut({ callbackUrl: '/login' });
  };

  const fetchBadgeCounts = async () => {
    try {
      const res = await fetch('/api/user/badges');
      if (res.ok) {
        const data = await res.json();
        setUnreadMessages(data.unreadMessages || 0);
        setUnreadNotifications(data.unreadNotifications || 0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  const adminLinks = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'courses', label: 'Batches & Fees' },
    { id: 'finances', label: 'Revenue' },
    { id: 'directory', label: 'Directory' },
    { id: 'salary', label: 'Staff Salary Management' },
    { id: 'messages', label: 'Messages' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'settings', label: 'System Settings' },
  ];

  const teacherLinks = [
    { id: 'classes', label: 'My Batches' },
    { id: 'materials', label: 'Materials' },
    { id: 'students', label: 'Student Roster' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'salary', label: 'Salary Records' },
    { id: 'messages', label: 'Messages' },
    { id: 'notifications', label: 'Notifications' },
  ];

  const studentLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'materials', label: 'Study Material' },
    { id: 'tests', label: 'My Tests' },
    { id: 'fees', label: 'Pay/View fees' },
    { id: 'messages', label: 'Messages' },
    { id: 'notifications', label: 'Notifications' },
  ];

  const links = role === 'ADMIN' ? adminLinks : role === 'TEACHER' ? teacherLinks : studentLinks;

  return (
    <div className="sidebar-glass" style={{
      width: '280px',
      height: 'calc(100vh - 2rem)',
      margin: '1rem',
      borderRadius: '24px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(16px)',
      border: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1.5rem',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow)'
    }}>
      {/* Brand */}
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <img src="/logo.png" alt="Institute Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '16px', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '1px' }}><span style={{ color: 'var(--primary)' }}>SUDHIR</span> <span style={{ color: 'var(--secondary)' }}>TUTORIALS</span></h2>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '2px' }}>{role} PORTAL</p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {links.map(link => {
          let badgeCount = 0;
          if (link.id === 'messages') badgeCount = unreadMessages;
          if (link.id === 'notifications') badgeCount = unreadNotifications;

          return (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === link.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeTab === link.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {activeTab === link.id && (
                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '4px', background: 'var(--primary)', borderRadius: '0 4px 4px 0' }} />
              )}
              {link.label}
              {badgeCount > 0 && (
                <span style={{
                  position: 'absolute',
                  right: '1.25rem',
                  background: link.id === 'messages' ? 'var(--primary)' : '#ef4444',
                  color: '#fff',
                  borderRadius: '50px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  boxShadow: link.id === 'messages' 
                    ? '0 0 10px rgba(99, 102, 241, 0.4)' 
                    : '0 0 10px rgba(239, 68, 68, 0.4)'
                }}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: 'var(--card-bg-alt)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 800,
              border: '2px solid var(--primary)',
              color: 'var(--text)',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                name.charAt(0)
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text)' }}>
                {name}
                {isVerified && <span title="Verified Profile" style={{ color: '#3b82f6', fontSize: '0.8rem' }}>(Verified)</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: isVerified ? 'var(--secondary)' : 'var(--text-muted)' }}>
                {isVerified ? 'Verified Account' : 'Online'}
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
        
        <button 
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '14px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            background: 'rgba(239, 68, 68, 0.05)',
            color: '#ef4444',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}
        >
          Logout
        </button>
      </div>

      <style jsx>{`
        button:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          transform: translateX(5px);
        }
      `}</style>
    </div>
  );
}
