"use client";

import { useState, useEffect } from 'react';

interface ServiceOption {
  id: string;
  label: string;
  icon: string;
  tab: string;
}

const SERVICE_OPTIONS: Record<string, ServiceOption[]> = {
  ADMIN: [
    { id: 'chats', label: 'My Chats', icon: '💬', tab: 'messages' },
    { id: 'academics', label: 'Academic Services', icon: '📚', tab: 'academics' },
    { id: 'finances', label: 'Fee Ledger', icon: '💰', tab: 'finances' },
    { id: 'salary', label: 'Salary Panel', icon: '💼', tab: 'salary' },
    { id: 'users', label: 'User Directory', icon: '👥', tab: 'users' },
    { id: 'verifications', label: 'Approvals & Queries', icon: '✅', tab: 'verifications' },
    { id: 'settings', label: 'System Settings', icon: '⚙️', tab: 'settings' }
  ],
  TEACHER: [
    { id: 'chats', label: 'My Chats', icon: '💬', tab: 'messages' },
    { id: 'classes', label: 'Lectures & Classes', icon: '🏫', tab: 'classes' },
    { id: 'materials', label: 'Study Materials', icon: '📄', tab: 'materials' },
    { id: 'salary', label: 'Salary Details', icon: '💼', tab: 'salary' },
    { id: 'students', label: 'Student Directory', icon: '👥', tab: 'students' },
    { id: 'attendance', label: 'Record Attendance', icon: '✏️', tab: 'attendance' },
    { id: 'tests', label: 'Test & Marks', icon: '📝', tab: 'tests' }
  ],
  STUDENT: [
    { id: 'chats', label: 'My Chats', icon: '💬', tab: 'messages' },
    { id: 'academics', label: 'Academic Services', icon: '📚', tab: 'materials' },
    { id: 'fees', label: 'Pay / View Fees', icon: '💰', tab: 'fees' },
    { id: 'tests', label: 'Tests & Marks', icon: '📝', tab: 'tests' },
    { id: 'lectures', label: 'Lectures/Classes', icon: '🎥', tab: 'lectures' },
    { id: 'guru-ji', label: 'Digital Guru Ji', icon: '🤖', tab: 'guru-ji' },
    { id: 'attendance', label: 'My Attendance', icon: '📅', tab: 'attendance' }
  ]
};

const DEFAULT_SELECTIONS: Record<string, string[]> = {
  ADMIN: ['chats', 'academics', 'finances'],
  TEACHER: ['chats', 'classes', 'materials'],
  STUDENT: ['chats', 'academics', 'fees']
};

interface QuickServicesWidgetProps {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  setActiveTab: (tab: string) => void;
}

export function QuickServicesWidget({ role, setActiveTab }: QuickServicesWidgetProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(`quick_services_${role.toLowerCase()}`);
    if (stored) {
      try {
        setSelectedIds(JSON.parse(stored));
      } catch (e) {
        setSelectedIds(DEFAULT_SELECTIONS[role] || []);
      }
    } else {
      setSelectedIds(DEFAULT_SELECTIONS[role] || []);
    }
  }, [role]);

  if (!mounted) return null;

  const options = SERVICE_OPTIONS[role] || [];

  const handleToggle = (id: string) => {
    let updated: string[];
    if (selectedIds.includes(id)) {
      updated = selectedIds.filter(x => x !== id);
    } else {
      updated = [...selectedIds, id];
    }
    setSelectedIds(updated);
    localStorage.setItem(`quick_services_${role.toLowerCase()}`, JSON.stringify(updated));
  };

  const activeServices = options.filter(opt => selectedIds.includes(opt.id));

  return (
    <div className="glass-card animate-scale-up" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, color: 'var(--text)' }}>
            ⚡ Quick Services
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>
            Instant shortcuts to your most frequently used panels and workflows.
          </p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            padding: '5px 12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: isEditing ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: isEditing ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${isEditing ? 'var(--primary)' : 'var(--border)'}`,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          {isEditing ? '⚙️ Done' : '🛠️ Customize'}
        </button>
      </div>

      {isEditing ? (
        <div style={{ background: 'rgba(0,0,0,0.12)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 650 }}>
            Select services to pin to your quick services dock:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem' }}>
            {options.map(opt => {
              const isChecked = selectedIds.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    background: isChecked ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${isChecked ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    color: isChecked ? 'var(--text)' : 'var(--text-muted)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(opt.id)}
                    style={{
                      accentColor: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <span>{opt.icon}</span>
                  <span style={{ fontWeight: 600 }}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {activeServices.map(service => (
            <div
              key={service.id}
              onClick={() => setActiveTab(service.tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '1rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="quick-service-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.border = '1px solid var(--primary)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0.02) 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.border = '1px solid var(--border)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)';
              }}
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                border: '1px solid var(--border)'
              }}>
                {service.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>
                  {service.label}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Open tab shortcut
                </span>
              </div>
            </div>
          ))}
          {activeServices.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)' }}>
              No quick services selected. Click "Customize" to add shortcuts.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
