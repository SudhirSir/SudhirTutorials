"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Storefront } from '@/components/Storefront';
import { StudentPurchases } from '@/components/StudentPurchases';
import { ProfileEditor } from '@/components/ProfileEditor';
import { StudentTakeTest } from '@/components/StudentTakeTest';
import { LiveClock } from '@/components/LiveClock';

function StoreDashboardContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState('store');

  // Whitelist of valid storefront dashboard tabs
  const validTabs = ['store', 'purchases', 'profile', 'take-test'];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/store-login');
      return;
    }

    if (session?.user && !(session.user as any).isStoreUser) {
      // If a standard institutional student somehow ends up here, send them to their student dashboard
      router.push('/dashboard/student');
      return;
    }

    const tab = searchParams.get('tab');
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    } else {
      // Default storefront tab is notes and tests store
      setActiveTab('store');
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'store');
      router.replace(pathname + '?' + params.toString());
    }
  }, [searchParams, session, status, router, pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    // Preserving searchParams other than tab for taking tests, unless switching tabs away from take-test
    if (tab !== 'take-test') {
      params.delete('testId');
      params.delete('attemptId');
    }
    router.push(pathname + '?' + params.toString());
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(16, 185, 129, 0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const username = session?.user?.name || (session?.user as any)?.username || 'STS Customer';
  const stsId = (session?.user as any)?.username || '';

  return (
    <div className="store-dashboard-root animate-fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)', color: 'var(--text)', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .store-dashboard-root {
          --primary: hsl(217, 80%, 45%) !important;
          --primary-hover: hsl(217, 80%, 35%) !important;
          --accent: hsl(217, 70%, 55%) !important;
        }
        [data-theme="dark"] .store-dashboard-root {
          --primary: hsl(217, 91%, 60%) !important;
          --primary-hover: hsl(217, 91%, 50%) !important;
          --accent: hsl(217, 80%, 70%) !important;
        }
        .store-topbar {
          background: rgba(20, 20, 25, 0.4);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          padding: 1rem 6%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .store-tab-bar {
          display: flex;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid var(--border);
          padding: 0.5rem 6%;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .store-tab-bar::-webkit-scrollbar {
          display: none;
        }
        .store-tab-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.3s ease;
        }
        .store-tab-btn.active {
          background: rgba(37, 99, 235, 0.1);
          color: var(--primary);
        }
        [data-theme="dark"] .store-tab-btn.active {
          background: rgba(59, 130, 246, 0.15);
          color: hsl(217, 91%, 65%);
        }
        .store-content-area {
          flex: 1;
          padding: 2.5rem 6%;
        }
        @media (max-width: 768px) {
          .store-topbar {
            padding: 1rem 1.5rem;
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          .store-tab-bar {
            padding: 0.5rem 1.25rem;
          }
          .store-content-area {
            padding: 1.5rem 1.25rem;
          }
          .topbar-right-controls {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        }
      `}</style>

      {/* Top Navbar */}
      <header className="store-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="SUDHIR TUTORIALS Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px' }} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>SUDHIR TUTORIALS</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>ST STORE PORTAL</span>
          </div>
        </div>

        <div className="topbar-right-controls" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{username}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{stsId}</span>
          </div>
          <button 
            onClick={async () => {
              sessionStorage.removeItem('tabSessionActive');
              await signOut({ redirect: false });
              window.location.href = '/store-login';
            }}
            style={{ 
              padding: '0.5rem 1.25rem', 
              borderRadius: '10px', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              background: 'rgba(239, 68, 68, 0.05)', 
              color: '#ef4444', 
              fontWeight: 700, 
              fontSize: '0.85rem', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tabs Menu */}
      <nav className="store-tab-bar">
        <button 
          onClick={() => handleTabChange('store')}
          className={`store-tab-btn ${activeTab === 'store' ? 'active' : ''}`}
        >
          🛍️ Notes & Tests Store
        </button>
        <button 
          onClick={() => handleTabChange('purchases')}
          className={`store-tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
        >
          📝 Purchased Tests/Notes
        </button>
        <button 
          onClick={() => handleTabChange('profile')}
          className={`store-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
        >
          👤 My Profile
        </button>
      </nav>

      {/* Body Content Area */}
      <main className="store-content-area">
        {activeTab === 'store' && (
          <div className="fade-in">
            <Storefront />
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="fade-in">
            <StudentPurchases />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="fade-in">
            <ProfileEditor role="STUDENT" />
          </div>
        )}

        {activeTab === 'take-test' && (
          <div className="fade-in">
            <StudentTakeTest />
          </div>
        )}
      </main>
    </div>
  );
}

export default function StoreDashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(16, 185, 129, 0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <StoreDashboardContent />
    </Suspense>
  );
}
