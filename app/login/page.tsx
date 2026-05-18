"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/ThemeToggle";

type Role = "student" | "teacher" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Role>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = (session.user as any).role || "STUDENT";
      router.push(`/dashboard/${role.toLowerCase()}`);
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        color: 'var(--text)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(16, 185, 129, 0.1)',
          borderTop: '3px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>जय सियाराम 🙏 Connecting...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password.");
      setLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password
      });

      if (res?.error) {
        setError("Invalid ID or Password.");
        setLoading(false);
      } else {
        router.push(`/dashboard/${activeTab}`);
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  const tabs = [
    { id: "student", label: "Student", icon: "🎓", color: "var(--primary)" },
    { id: "teacher", label: "Teacher", icon: "👨‍🏫", color: "#10b981" },
    { id: "admin", label: "Admin", icon: "🎛️", color: "#ef4444" },
  ];

  const activeColor = tabs.find(t => t.id === activeTab)?.color || "var(--primary)";

  return (
    <div className="login-container-parent" style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--background)' }}>
      {/* Fixed Top-Right Viewport Theme Toggle (Most Right Side) */}
      <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      {/* Left Form Section */}
      <div className="login-form-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '3rem', position: 'relative' }}>

        <div style={{ marginBottom: '3rem' }}>
          <Link href="/" className="logo" style={{ fontSize: '1.25rem', display: 'inline-block' }}>
            <span style={{ color: 'var(--primary)' }}>SUDHIR</span> TUTORIALS
          </Link>
        </div>

        <div style={{ maxWidth: '420px', width: '100%', margin: '0' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 className="login-title-h1" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>Welcome Back</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Enter your credentials to access your account.</p>
          </div>

          {/* Role Selection */}
          <div className="login-tabs-header" style={{ display: 'flex', background: 'var(--card-bg-alt)', padding: '0.4rem', borderRadius: '16px', marginBottom: '2.5rem', border: '1px solid var(--border)' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as Role); setError(""); setUsername(""); setPassword(""); }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: 'none',
                  background: activeTab === tab.id ? tab.color : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === tab.id ? `0 4px 15px -3px ${tab.color}66` : 'none'
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>Username / ID</label>
              <input
                type="text"
                placeholder={activeTab === 'teacher' ? 'e.g. FAC12345' : activeTab === 'student' ? 'e.g. STU12345' : 'Admin Username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1rem',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.currentTarget.style.borderColor = activeColor}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Password</label>
                <Link 
                  href="/forgot-password"
                  style={{ fontSize: '0.85rem', color: activeColor, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
                >
                  Forgot Password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '1rem 3.5rem 1rem 1.25rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = activeColor}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1.25rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.815 7.815 3 3m-3-3-3.671-3.671m0 0a3 3 0 0 1-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="checkbox" id="remember" style={{ width: '18px', height: '18px', accentColor: activeColor, cursor: 'pointer' }} />
              <label htmlFor="remember" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Remember me for 30 days</label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '1.2rem', 
                background: activeColor,
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1.1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: `0 4px 20px -5px ${activeColor}80`,
                marginTop: '1rem',
                transition: 'transform 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {loading ? "Authenticating..." : `Sign In as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            </button>
          </form>

          {activeTab !== 'admin' && (
             <p style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                First time login? Please use the default credentials provided by the institute administration.
             </p>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '3rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          © 2026 Sudhir Tutorials
        </div>
      </div>

      {/* Right Image Section */}
      <div style={{ flex: 1.2, position: 'relative', display: 'none' }} className="hide-on-mobile">
        {/* Fixed Background Image and Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'url(https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop) center/cover', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'var(--login-overlay)', zIndex: 1 }}></div>
        
        {/* Scrollable Content Wrapper */}
        <div className="right-panel-scroll" style={{ position: 'absolute', inset: 0, zIndex: 2, overflowY: 'auto', padding: '3rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '650px', margin: '0 auto' }}>
            
            {/* News & Updates Section */}
            <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                 <span style={{ fontSize: '1.3rem' }}>📢</span>
                 <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, letterSpacing: '1px', color: 'var(--text)' }}>INSTITUTE NEWS</h3>
               </div>
               
               <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#fff', border: '1px solid var(--glass-border)', height: '620px', display: 'flex', justifyContent: 'center' }}>
                  <iframe 
                    src="https://www.instagram.com/p/DYSZKfBKZkv/embed" 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="auto" 
                    style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
                  ></iframe>
               </div>
               <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center', fontWeight: 500 }}>
                 Stay updated with our latest achievements and announcements.
               </p>
            </div>

            {/* Smaller, Elegant Shilpy Quote Card */}
            <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow)' }}>
               <div style={{ color: activeColor, fontSize: '1.5rem', marginBottom: '0.25rem', lineHeight: 1 }}>❝</div>
               <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '1rem', fontWeight: 500 }}>
                 "Sudhir Tutorials didn't just teach me formulas; they built my conceptual foundation. The dedicated faculty and competitive environment were the true catalysts for my AIR 14 rank."
               </p>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                 <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: activeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '1rem' }}>S</div>
                 <div>
                   <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>Shilpy</div>
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>PSEB AIR 14</div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
      
      <style jsx>{`
        @media (min-width: 900px) {
          .hide-on-mobile {
            display: block !important;
          }
        }
        .right-panel-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .right-panel-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .right-panel-scroll::-webkit-scrollbar-thumb {
          background: rgba(150, 150, 150, 0.3);
          border-radius: 10px;
        }
        .right-panel-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(150, 150, 150, 0.5);
        }
      `}</style>
    </div>
  );
}
