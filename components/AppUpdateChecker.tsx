"use client";

import { useEffect, useState } from 'react';

function isVersionOlder(current: string, required: string): boolean {
  const cParts = current.split('.').map(val => parseInt(val, 10) || 0);
  const rParts = required.split('.').map(val => parseInt(val, 10) || 0);
  for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (c < r) return true;
    if (c > r) return false;
  }
  return false;
}

export function AppUpdateChecker() {
  const [showPopup, setShowPopup] = useState(false);
  const [requiredVersion, setRequiredVersion] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const performVersionCheck = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) {
          return;
        }

        const { App } = await import('@capacitor/app');
        
        // 1. Fetch minimum version from API
        const res = await fetch('/api/app-version');
        if (!res.ok) return;
        const data = await res.json();
        const minVersion = data.minAppVersion || '1.0.0';

        // 2. Fetch local native version info
        const info = await App.getInfo();
        const localVersion = info.version || '1.0.0';

        setRequiredVersion(minVersion);
        setCurrentVersion(localVersion);

        // Check if this version has been dismissed already on this device
        const dismissed = localStorage.getItem('dismissedAppVersion');
        if (dismissed === minVersion) {
          return;
        }

        // 3. Compare versions
        if (isVersionOlder(localVersion, minVersion)) {
          setShowPopup(true);
        }
      } catch (err) {
        console.error('Failed to perform native app version check:', err);
      }
    };

    // Delay check slightly to let splash screen transition finish
    const timer = setTimeout(() => {
      performVersionCheck();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleUpdateNow = () => {
    window.open('https://drive.google.com/drive/folders/1q1hIGvl-ilAepbElMnR3y96IRqnh32Gw?usp=sharing', '_blank');
  };

  const handleUpdateLater = () => {
    if (requiredVersion) {
      localStorage.setItem('dismissedAppVersion', requiredVersion);
    }
    setIsDismissed(true);
  };

  if (!showPopup || isDismissed) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 10, 12, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1.5rem',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}} />

      <div style={{
        background: 'rgba(20, 20, 25, 0.95)',
        border: '1.5px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '24px',
        padding: '2rem 1.5rem',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '1.5rem',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Glow animated cloud update icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 70%)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)'
        }}>
          📲
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: 900,
            margin: 0,
            color: '#ffffff',
            letterSpacing: '-0.5px'
          }}>
            App Update Available!
          </h2>
          <p style={{
            fontSize: '0.85rem',
            color: '#a1a1aa',
            margin: 0,
            lineHeight: '1.5'
          }}>
            A new version of Sudhir Tutorials is required to ensure stability, safety, and access to all latest features.
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
          fontSize: '0.75rem',
          color: '#e4e4e7',
          fontWeight: 600
        }}>
          <div>Installed: <span style={{ color: '#ef4444' }}>v{currentVersion}</span></div>
          <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div>Required: <span style={{ color: '#10b981' }}>v{requiredVersion}</span></div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: '0.75rem'
        }}>
          <button
            onClick={handleUpdateNow}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
              transition: 'transform 0.2s',
              outline: 'none'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            🚀 Update Now
          </button>
          
          <button
            onClick={handleUpdateLater}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'transparent',
              color: '#d4d4d8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              outline: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Update Later
          </button>
          
          <div style={{
            fontSize: '0.72rem',
            color: '#fbbf24',
            marginTop: '0.5rem',
            lineHeight: '1.4',
            textAlign: 'center',
            background: 'rgba(251, 191, 36, 0.05)',
            border: '1px dashed rgba(251, 191, 36, 0.2)',
            borderRadius: '12px',
            padding: '0.75rem 0.65rem'
          }}>
            ⚠️ <strong>Already updated?</strong> If the app still asks for an update after installing the new APK, please <strong>uninstall the old app first</strong>, then install the new one. (Android blocks signature updates on top of old builds).
          </div>
        </div>
      </div>
    </div>
  );
}
