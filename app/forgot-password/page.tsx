"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }
    if (newPassword.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }
    if (!/[a-z]/.test(newPassword)) {
      return setError("Password must contain at least one lowercase letter.");
    }
    if (!/[A-Z]/.test(newPassword)) {
      return setError("Password must contain at least one uppercase letter.");
    }
    if (!/[0-9]/.test(newPassword)) {
      return setError("Password must contain at least one numeric digit.");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)) {
      return setError("Password must contain at least one special symbol (e.g. @, #, $, etc.).");
    }
    if (recoveryPin.length !== 6) {
      return setError("Recovery PIN must be 6 digits");
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, recoveryPin, newPassword })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Reset failed. Please check your credentials.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '2rem' }}>
      <div className="bg-glow"></div>
      
      <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '3rem', position: 'relative', zIndex: 10 }}>
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
           <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: 800 }}>Account Recovery</h1>
           <p style={{ color: 'var(--text-muted)' }}>Enter your Secret PIN to regain access to your account.</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }} className="animate-fade-in">
             <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✅</div>
             <h2 style={{ marginBottom: '1rem' }}>Password Reset!</h2>
             <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your password has been updated successfully. Redirecting you to login...</p>
             <Link href="/login" className="btn-primary" style={{ textDecoration: 'none' }}>Go to Login Now</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="input-group">
              <label>Username / ID</label>
              <input type="text" required placeholder="e.g. STU12345" value={username} onChange={e => setUsername(e.target.value)} />
            </div>

            <div className="input-group">
              <label>6-Digit Secret Recovery PIN</label>
              <input 
                type="text" 
                maxLength={6} 
                required 
                placeholder="XXXXXX" 
                value={recoveryPin} 
                onChange={e => setRecoveryPin(e.target.value.replace(/\D/g, ''))} 
                style={{ letterSpacing: '0.5rem', fontSize: '1.2rem', textAlign: 'center' }}
              />
            </div>

            <div style={{ height: '1px', background: 'var(--border)', margin: '1rem 0' }}></div>

            <div className="input-group">
              <label>New Password</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>

            <div className="input-group">
              <label>Confirm New Password</label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>

            <button type="submit" disabled={loading} style={{ 
              width: '100%', padding: '1.2rem', background: 'var(--primary)', color: '#fff', 
              border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem', 
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 20px -5px rgba(99, 102, 241, 0.5)', marginTop: '1rem'
            }}>
              {loading ? "Verifying PIN..." : "Reset Password & Login"}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
               <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>Wait, I remembered it! **Back to Login**</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
