"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WaitingVerificationPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

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
    await signOut({ redirect: false });
    window.location.href = '/login';
  };

  useEffect(() => {
    const checkStatus = async () => {
       if (typeof window !== "undefined" && (window as any).isLoggingOut) return;
       if (sessionStorage.getItem('isLoggingOut') === 'true') return;
       try {
         const res = await fetch('/api/auth/check-session');
         if (res.ok) {
           const data = await res.json();
           if (data.valid && data.isProfileVerified) {
             // Admin has verified them! Update local session which will trigger redirect
             await update({ isProfileVerified: true });
           }
         }
       } catch (err) {
         if (typeof window !== "undefined" && (window as any).isLoggingOut) return;
         if (sessionStorage.getItem('isLoggingOut') === 'true') return;
         console.error('Failed to poll status', err);
       }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };

    // Poll for verification status every 5 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    }, 5000);

    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [update]);

  useEffect(() => {
    if (session?.user && (session.user as any).isProfileVerified) {
       router.push(`/dashboard/${(session.user as any).role.toLowerCase()}`);
    }
  }, [session, router]);

  if (status === "loading") return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'var(--background)' }}>
      <div className="bg-glow"></div>
      
      <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '3rem', zIndex: 10, textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⏳</div>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 800 }}>Verification Pending</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Thank you for completing your profile! Your account is now being reviewed by the administration.
          </p>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>
            You will be automatically redirected once your profile is verified.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary" 
            style={{ flex: 1 }}
          >
            Check Status Now
          </button>
          <button 
            onClick={handleLogout}
            className="btn-secondary" 
            style={{ flex: 1 }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
