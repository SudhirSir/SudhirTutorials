"use client";

import { useState } from 'react';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [reportTitle, setReportTitle] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [reportScreenshot, setReportScreenshot] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setReportSuccess(false);
    setReportTitle('');
    setReportMessage('');
    setReportEmail('');
    setReportScreenshot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reportTitle,
          message: reportMessage,
          email: reportEmail,
          screenshot: reportScreenshot,
          isBugReport: true
        })
      });
      if (res.ok) {
        setReportSuccess(true);
      } else {
        alert("Failed to submit report. Please try again later.");
      }
    } catch (err) {
      alert("Failed to submit report. Try again later.");
    }
    setReportLoading(false);
  };

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal animate-scale-up" onClick={e => e.stopPropagation()}>
        <button onClick={handleClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 800 }}>Report a Bug / Suggestion</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Found an issue or have an idea to improve the platform? Let our admins know!</p>
        
        {reportSuccess ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '12px', color: '#10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1.5px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
            <h3 style={{ margin: 0, fontWeight: 700 }}>Thank you!</h3>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Your report has been sent directly to the administrative team.</p>
            <button onClick={handleClose} className="btn-primary" style={{ marginTop: '1.5rem', width: '100%', background: '#10b981' }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label className="input-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Subject / Title</label>
              <input 
                type="text" 
                required 
                value={reportTitle} 
                onChange={e => setReportTitle(e.target.value)} 
                placeholder="e.g. Broken link on homepage" 
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label className="input-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Your Email (Optional)</label>
              <input 
                type="email" 
                value={reportEmail} 
                onChange={e => setReportEmail(e.target.value)} 
                placeholder="e.g. yourname@gmail.com" 
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label className="input-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Attach Screenshot (Optional)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      alert("Image size exceeds 2 MB.");
                      e.target.value = '';
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new window.Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const MAX_WIDTH = 800;
                        let width = img.width;
                        let height = img.height;
                        if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                        }
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
                        setReportScreenshot(compressedDataUrl);
                      };
                      img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                  }
                }} 
                style={{ width: '100%', fontSize: '0.8rem', color: 'var(--text-muted)' }} 
              />
              {reportScreenshot && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img src={reportScreenshot} alt="Preview" style={{ width: '50px', height: 'auto', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ Attached</span>
                  <button type="button" onClick={() => setReportScreenshot(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>Remove</button>
                </div>
              )}
            </div>
            <div>
              <label className="input-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Description</label>
              <textarea 
                required 
                value={reportMessage} 
                onChange={e => setReportMessage(e.target.value)} 
                placeholder="Describe the bug in detail..." 
                rows={4} 
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  resize: 'none'
                }}
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={reportLoading} 
              className="btn-primary" 
              style={{ 
                marginTop: '0.5rem', 
                padding: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: reportLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {reportLoading ? 'Sending...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>

      <style jsx>{`
        .report-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .report-modal {
          width: 100%;
          max-width: 450px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          position: relative;
          color: var(--text);
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
