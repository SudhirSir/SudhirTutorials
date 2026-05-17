"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/ThemeToggle";

const icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  finances: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  courses: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  materials: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  tests: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="12" y2="18" />
      <line x1="15" y1="12" x2="15" y2="12" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = pathname.includes("admin") ? "Admin" : pathname.includes("teacher") ? "Teacher" : "Student";
  const isVerified = (session?.user as any)?.isProfileVerified;

  return (
    <div className="dashboard-container">
      {/* Fixed Top-Right Viewport Theme Toggle (Most Right Side) */}
      <div style={{ position: 'fixed', top: '1.5rem', right: '2.5rem', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      <aside className="sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <Link href="/" className="logo-small" style={{ margin: 0 }}>SUDHIR <span style={{ color: 'var(--primary)' }}>TUTORIALS</span></Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className={`role-badge-modern ${role.toLowerCase()}`}>{role} Portal</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session?.user?.name || 'User'}
                </span>
                {isVerified && <span title="Verified Profile" style={{ color: '#3b82f6', fontSize: '0.9rem' }}>🔵</span>}
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-group">
              <div className="nav-label">Main Menu</div>
              <Link href={`/dashboard/${role.toLowerCase()}?tab=${role === 'Admin' ? 'overview' : role === 'Teacher' ? 'classes' : 'dashboard'}`} className="nav-link-modern">
                <span className="icon">{icons.home}</span>
                Dashboard Home
              </Link>
            </div>

            {role === "Admin" && (
              <div className="nav-group">
                <div className="nav-label">Management</div>
                <Link href="/dashboard/admin?tab=users" className="nav-link-modern">
                  <span className="icon">{icons.users}</span>
                  Manage Users
                </Link>
                <Link href="/dashboard/admin?tab=finances" className="nav-link-modern">
                  <span className="icon">{icons.finances}</span>
                  Fee Ledger
                </Link>
                <Link href="/dashboard/admin?tab=courses" className="nav-link-modern">
                  <span className="icon">{icons.courses}</span>
                  Courses & Batches
                </Link>
              </div>
            )}

            {role === "Teacher" && (
              <div className="nav-group">
                <div className="nav-label">Teaching</div>
                <Link href="/dashboard/teacher?tab=classes" className="nav-link-modern">
                  <span className="icon">{icons.home}</span>
                  My Classes
                </Link>
                <Link href="/dashboard/teacher?tab=materials" className="nav-link-modern">
                  <span className="icon">{icons.materials}</span>
                  Materials
                </Link>
                <Link href="/dashboard/teacher?tab=students" className="nav-link-modern">
                  <span className="icon">{icons.users}</span>
                  My Students
                </Link>
              </div>
            )}

            {role === "Student" && (
              <div className="nav-group">
                <div className="nav-label">Learning</div>
                <Link href="/dashboard/student?tab=materials" className="nav-link-modern">
                  <span className="icon">{icons.materials}</span>
                  Study Materials
                </Link>
                <Link href="/dashboard/student?tab=fees" className="nav-link-modern">
                  <span className="icon">{icons.finances}</span>
                  Pay Fees
                </Link>
                <Link href="/dashboard/student?tab=tests" className="nav-link-modern">
                  <span className="icon">{icons.tests}</span>
                  Tests
                </Link>
              </div>
            )}

            <div className="nav-group">
              <div className="nav-label">Support</div>
              <Link href="/dashboard/settings" className="nav-link-modern">
                <span className="icon">{icons.settings}</span>
                Profile Settings
              </Link>
            </div>
          </nav>

          <div className="sidebar-footer">
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-logout-modern">
              <span className="icon">{icons.logout}</span>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        {children}
      </main>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          min-height: 100vh;
          background: var(--background);
        }

        .sidebar {
          width: 300px;
          padding: 1.25rem;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .sidebar-inner {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          height: 100%;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 2.5rem 1.75rem;
        }

        .logo-small {
          font-weight: 900;
          font-size: 1.4rem;
          color: var(--text-heading);
          display: block;
          margin-bottom: 0.75rem;
          letter-spacing: -0.03em;
        }

        .role-badge-modern {
          display: inline-flex;
          align-items: center;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 0.35rem 0.85rem;
          border-radius: 10px;
        }

        .role-badge-modern.admin { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .role-badge-modern.teacher { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
        .role-badge-modern.student { background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.2); }

        .sidebar-nav {
          flex: 1;
          padding: 0 1rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          overflow-y: auto;
        }

        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .nav-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-left: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .nav-link-modern {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          border-radius: 14px;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link-modern .icon {
          color: var(--text-muted);
          transition: transform 0.2s;
        }

        .nav-link-modern:hover {
          color: var(--text);
          background: var(--card-bg-alt);
          transform: translateX(4px);
        }

        .nav-link-modern:hover .icon {
          color: var(--primary);
          transform: scale(1.1);
        }

        .sidebar-footer {
          padding: 1.5rem;
        }

        .btn-logout-modern {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 16px;
          background: rgba(239, 68, 68, 0.08);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.1);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-logout-modern:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          transform: translateY(-2px);
        }

        .dashboard-main {
          flex: 1;
          padding: 3rem 4rem;
          background: var(--background);
          overflow-y: auto;
          position: relative;
        }

        /* Scrollbar styling */
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}
