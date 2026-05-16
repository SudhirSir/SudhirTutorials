"use client";

import React from 'react';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  name: string;
  isVerified?: boolean;
}

export function Sidebar({ activeTab, setActiveTab, role, name, isVerified }: SidebarProps) {
  const adminLinks = [
    { id: 'overview', label: 'Dashboard', icon: '📊' },
    { id: 'courses', label: 'Batches & Fees', icon: '🎓' },
    { id: 'finances', label: 'Revenue', icon: '💰' },
    { id: 'directory', label: 'Directory', icon: '👥' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'settings', label: 'System Settings', icon: '⚙️' },
  ];

  const teacherLinks = [
    { id: 'classes', label: 'My Batches', icon: '🏫' },
    { id: 'materials', label: 'Materials', icon: '📚' },
    { id: 'students', label: 'Student Roster', icon: '👨‍🎓' },
    { id: 'attendance', label: 'Attendance', icon: '📝' },
    { id: 'messages', label: 'Messages', icon: '💬' },
  ];

  const studentLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'materials', label: 'Study Material', icon: '📖' },
    { id: 'tests', label: 'My Tests', icon: '🧪' },
    { id: 'fees', label: 'Fee Portal', icon: '💳' },
    { id: 'messages', label: 'Messages', icon: '💬' },
  ];

  const links = role === 'ADMIN' ? adminLinks : role === 'TEACHER' ? teacherLinks : studentLinks;

  return (
    <div className="sidebar-glass" style={{
      width: '280px',
      height: 'calc(100vh - 2rem)',
      margin: '1rem',
      borderRadius: '24px',
      background: 'rgba(24, 24, 27, 0.4)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1.5rem',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Brand */}
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ 
          width: '60px', 
          height: '60px', 
          background: 'linear-gradient(135deg, var(--primary), var(--accent))', 
          borderRadius: '16px', 
          margin: '0 auto 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: '0 10px 20px -5px var(--primary)'
        }}>
          ST
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '1px' }}>SUDHIR TUTORIALS</h2>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '2px' }}>{role} PORTAL</p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {links.map(link => (
          <button
            key={link.id}
            onClick={() => setActiveTab(link.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '14px',
              border: 'none',
              background: activeTab === link.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === link.id ? 'var(--primary)' : '#d1d5db',
              fontWeight: 600,
              fontSize: '0.95rem',
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
            <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
            {link.label}
          </button>
        ))}
      </nav>

      {/* User & Logout */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px', 
            background: 'rgba(255,255,255,0.05)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 800,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {name.charAt(0)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {name}
              {isVerified && <span title="Verified Profile" style={{ color: '#3b82f6', fontSize: '0.8rem' }}>🔵</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: isVerified ? '#10b981' : 'var(--text-muted)' }}>
              {isVerified ? 'Verified Account' : 'Online'}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => signOut()}
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
          <span>🚪</span> Logout
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
