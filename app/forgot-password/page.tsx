"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '2rem' }}>
      <div className="glass-card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
        <header style={{ marginBottom: '2rem' }}>
           <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Reset Password</h1>
           <p style={{ color: 'var(--text-muted)' }}>Lost your access? Don't worry, we'll help you get back in.</p>
        </header>

        {!submitted ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="input-group" style={{ textAlign: 'left' }}>
              <label>Enter your Username / ID</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. STU12345" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: '#fff' }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '1rem' }}>Request Reset Link</button>
            <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>Back to Login</Link>
          </form>
        ) : (
          <div className="animate-fade-in">
             <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
             <h3 style={{ marginBottom: '1rem' }}>Request Received</h3>
             <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
                For security reasons, password resets are handled manually by the administration. 
                Please contact **Sudhir Tutorials Support** with your ID (**{username}**) to verify your identity.
             </p>
             <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'left' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}><strong>Email:</strong> support@sudhirtutorials.com</p>
                <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>Phone:</strong> +91 98XXX XXXXX</p>
             </div>
             <Link href="/login" className="btn-primary" style={{ display: 'block', textDecoration: 'none' }}>Return to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
