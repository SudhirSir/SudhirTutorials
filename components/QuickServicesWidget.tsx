"use client";

import { useState, useEffect } from 'react';
import { safeLocalStorage } from '@/lib/safeStorage';

interface ServiceOption {
  id: string;
  label: string;
  icon: string;
  tab: string;
  subTab?: string;
}

const SERVICE_OPTIONS: Record<string, ServiceOption[]> = {
  ADMIN: [
    { id: 'overview', label: 'Dashboard Home', icon: '🏡', tab: 'overview' },
    { id: 'chats', label: 'My Chats', icon: '💬', tab: 'messages' },
    { id: 'users', label: 'User Directory', icon: '👥', tab: 'users' },
    { id: 'salary', label: 'Salary Panel', icon: '💼', tab: 'salary' },
    { id: 'settings', label: 'System Settings', icon: '⚙️', tab: 'settings' },
    { id: 'guru-ai', label: 'ST Guru ji (AI)', icon: '🤖', tab: 'guru-ai' },
    { id: 'notifications', label: 'Notice Board', icon: '📢', tab: 'notifications' },
    { id: 'profile', label: 'My Profile', icon: '👤', tab: 'profile' },
    // Finances submenus
    { id: 'finance_ledger', label: 'Fee Ledger & Collections', icon: '💰', tab: 'finances', subTab: 'LEDGER' },
    { id: 'finance_assign', label: 'Assign Fee / Charge', icon: '✍️', tab: 'finances', subTab: 'ASSIGN' },
    { id: 'finance_expenses', label: 'Expense Tracker', icon: '📊', tab: 'finances', subTab: 'EXPENSES' },
    { id: 'finance_statement', label: 'Monthly Statement', icon: '📅', tab: 'finances', subTab: 'STATEMENT' },
    { id: 'finance_billing_engine', label: 'Billing Engine', icon: '⚙️', tab: 'finances', subTab: 'BILLING_ENGINE' },
    // Academics submenus
    { id: 'academic_courses', label: 'Courses & Batches', icon: '📚', tab: 'academics', subTab: 'courses' },
    { id: 'academic_attendance', label: 'Attendance Logs', icon: '📅', tab: 'academics', subTab: 'attendance' },
    { id: 'academic_materials', label: 'Study Materials', icon: '📄', tab: 'academics', subTab: 'materials' },
    { id: 'academic_tests', label: 'Tests & Exams', icon: '📝', tab: 'academics', subTab: 'tests' },
    { id: 'academic_analytics', label: 'Performance Analytics', icon: '📈', tab: 'academics', subTab: 'analytics' },
    { id: 'academic_lectures', label: 'Lectures / Classes', icon: '🎥', tab: 'academics', subTab: 'lectures' },
    { id: 'academic_admissions', label: 'Admissions Inquiries', icon: '📋', tab: 'academics', subTab: 'admissions' },
    // Approvals submenus
    { id: 'verifications_approvals', label: 'Approvals & Queries', icon: '✅', tab: 'verifications', subTab: 'approvals' },
    { id: 'verifications_admissions', label: 'Admissions Inquiries', icon: '📋', tab: 'verifications', subTab: 'admissions' }
  ],
  TEACHER: [
    { id: 'chats', label: 'My Chats', icon: '💬', tab: 'messages' },
    { id: 'classes', label: 'My Classes', icon: '🏫', tab: 'classes' },
    { id: 'materials', label: 'Study Materials', icon: '📄', tab: 'materials' },
    { id: 'students', label: 'Student Directory', icon: '👥', tab: 'students' },
    { id: 'attendance', label: 'Record Attendance', icon: '✏️', tab: 'attendance' },
    { id: 'tests', label: 'Tests & Marks', icon: '📝', tab: 'tests' },
    { id: 'salary', label: 'Salary Details', icon: '💼', tab: 'salary' },
    { id: 'guru-ai', label: 'ST Guru ji', icon: '🤖', tab: 'guru-ai' },
    { id: 'profile', label: 'My Profile', icon: '👤', tab: 'profile' },
    { id: 'notifications', label: 'Notice Board', icon: '📢', tab: 'notifications' }
  ],
  STUDENT: [
    { id: 'chats', label: 'My Chats', icon: '💬', tab: 'messages' },
    { id: 'dashboard', label: 'Dashboard Home', icon: '🏡', tab: 'dashboard' },
    { id: 'attendance', label: 'My Attendance', icon: '📅', tab: 'attendance' },
    { id: 'materials', label: 'Study Materials', icon: '📄', tab: 'materials' },
    { id: 'fees', label: 'Pay / View Fees', icon: '💰', tab: 'fees' },
    { id: 'lectures', label: 'Lectures / Classes', icon: '🎥', tab: 'lectures' },
    { id: 'tests', label: 'Tests & Marks', icon: '📝', tab: 'tests' },
    { id: 'guru-ji', label: 'ST Guru ji (AI)', icon: '🤖', tab: 'guru-ji' },
    { id: 'notifications', label: 'Notice Board', icon: '📢', tab: 'notifications' },
    { id: 'profile', label: 'My Profile', icon: '👤', tab: 'profile' }
  ]
};

const DEFAULT_SELECTIONS: Record<string, string[]> = {
  ADMIN: ['chats', 'finance_ledger', 'academic_courses'],
  TEACHER: ['chats', 'classes', 'materials'],
  STUDENT: ['chats', 'fees', 'materials']
};

interface QuickServicesWidgetProps {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  setActiveTab: (tab: string, subTab?: string) => void;
}

export function QuickServicesWidget({ role, setActiveTab }: QuickServicesWidgetProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = safeLocalStorage.getItem(`quick_services_${role.toLowerCase()}`);
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
    safeLocalStorage.setItem(`quick_services_${role.toLowerCase()}`, JSON.stringify(updated));
  };

  const activeServices = options.filter(opt => selectedIds.includes(opt.id));

  return (
    <div className="glass-card animate-scale-up" style={{ padding: '0.85rem 1.25rem', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800, color: 'var(--text)' }}>
            ⚡ Quick Services
          </h3>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            padding: '4px 10px',
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
                  <span style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
          {activeServices.map(service => (
            <div
              key={service.id}
              onClick={() => setActiveTab(service.tab, service.subTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 0.65rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                border: '1px solid var(--border)',
                flexShrink: 0
              }}>
                {service.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <span style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {service.label}
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
