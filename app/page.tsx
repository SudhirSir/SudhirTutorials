import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <main className="landing-page" style={{ overflowX: 'hidden' }}>
      <div className="bg-glow"></div>
      
      {/* Navbar */}
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="logo" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
          <span style={{ color: 'var(--primary)' }}>SUDHIR</span> TUTORIALS
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="#programs" style={{ color: 'var(--text-muted)', fontWeight: 500, transition: 'color 0.2s' }}>Programs</Link>
          <Link href="#about" style={{ color: 'var(--text-muted)', fontWeight: 500, transition: 'color 0.2s' }}>About Us</Link>
          <Link href="/login" className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>Login Portal</Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', padding: '0 6%', position: 'relative' }}>
        <div className="hero-content animate-fade-in" style={{ flex: 1, maxWidth: '650px', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1.2rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '99px', marginBottom: '2rem', fontSize: '0.85rem', fontWeight: 600, color: '#818cf8', boxShadow: '0 0 20px rgba(99,102,241,0.2)' }}>
            <span style={{ fontSize: '1.2rem' }}>🎓</span> Admissions Open for 2026-27 Batch
          </div>
          <h1 style={{ fontSize: '4.5rem', lineHeight: 1.1, marginBottom: '1.5rem', fontWeight: 800 }}>
            Master Your Core.<br/>
            <span className="text-gradient">Ace Every Exam.</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: '90%', lineHeight: 1.6 }}>
            India's most trusted coaching institute for JEE, NEET, and Foundation courses. Experience a blended learning ecosystem designed for top-tier results.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/login" className="btn-primary" style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem', borderRadius: '12px' }}>Student Login</Link>
            <Link href="#programs" className="btn-secondary" style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem', borderRadius: '12px' }}>Explore Courses</Link>
          </div>
        </div>
        
        {/* Floating Hero Visuals */}
        <div className="hero-visual animate-fade-in delay-200" style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <div className="bg-glow accent" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '500px', filter: 'blur(80px)' }}></div>
          
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', height: '400px' }}>
            <div className="glass-card" style={{ position: 'absolute', top: 0, right: 0, width: '280px', padding: '1.5rem', transform: 'perspective(1000px) rotateY(-15deg)', zIndex: 2 }}>
               <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>JEE Mains 2025 Results</h4>
               <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34d399' }}>142</div>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Students Scored<br/>Above 99%ile</div>
               </div>
            </div>

            <div className="glass-card" style={{ position: 'absolute', bottom: 0, left: 0, width: '300px', padding: '1.5rem', transform: 'perspective(1000px) rotateY(15deg) translateY(-20px)', zIndex: 3, borderTop: '4px solid var(--primary)' }}>
               <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>Interactive Learning</h4>
               <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                 <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                   <span>Physics Doubt Class</span> <span style={{ color: '#60a5fa' }}>Live Now</span>
                 </div>
                 <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                   <span>Mock Test 04</span> <span style={{ color: '#10b981' }}>Completed</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '4rem 6%', background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }}>
          {[ 
            { label: 'Selections in JEE/NEET', value: '15,000+' },
            { label: 'Experienced Faculty', value: '120+' },
            { label: 'Average Score Boost', value: '+35%' },
            { label: 'Premium Study Materials', value: '2,500+' }
          ].map((stat, i) => (
            <div key={i} className="glass-card" style={{ padding: '2rem', background: 'transparent', border: 'none', boxShadow: 'none' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #fff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stat.value}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" style={{ padding: '8rem 6%' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 }}>Our Flagship Programs</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>Tailored curriculum designed by industry experts to help you achieve your dream rank.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          {[
            { title: 'JEE Main & Advanced', subtitle: 'Class 11, 12 & Droppers', desc: 'Rigorous training program focusing on core concepts, advanced problem-solving, and time management.', color: '#3b82f6' },
            { title: 'NEET (UG)', subtitle: 'Class 11, 12 & Droppers', desc: 'Comprehensive biology focus paired with intensive physics and chemistry modules for medical aspirants.', color: '#10b981' },
            { title: 'Foundation Courses', subtitle: 'Class 8, 9 & 10', desc: 'Early start program to build a strong analytical foundation for competitive exams like NTSE and Olympiads.', color: '#8b5cf6' }
          ].map((prog, i) => (
            <div key={i} className="glass-card" style={{ padding: '3rem 2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: prog.color }}></div>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{prog.title}</h3>
              <div style={{ color: prog.color, fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{prog.subtitle}</div>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>{prog.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><span style={{ color: prog.color }}>✓</span> 400+ Hrs Live Classes</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><span style={{ color: prog.color }}>✓</span> Weekly Mock Tests</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}><span style={{ color: prog.color }}>✓</span> 1-on-1 Doubt Solving</li>
              </ul>
              <button className="btn-secondary" style={{ width: '100%', padding: '1rem', borderColor: 'var(--border)' }}>View Details</button>
            </div>
          ))}
        </div>
      </section>

      {/* Features Showcase */}
      <section id="about" style={{ padding: '6rem 6%', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '3rem', marginBottom: '1.5rem', fontWeight: 800 }}>Why Sudhir Tutorials?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {[
                { title: 'Integrated LMS Dashboard', desc: 'Track attendance, access premium video lectures, and download PDF notes from your personalized student portal.', icon: '💻' },
                { title: 'Smart Financial Management', desc: 'Secure online fee payments, automated digital receipts, and real-time ledger updates so parents stay informed.', icon: '💳' },
                { title: 'Performance Analytics', desc: 'AI-driven insights into test scores to identify weak chapters and suggest targeted practice material.', icon: '📊' }
              ].map((feat, i) => (
                <div key={i} style={{ display: 'flex', gap: '1.5rem' }}>
                  <div style={{ fontSize: '2rem', background: 'rgba(255,255,255,0.05)', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', flexShrink: 0 }}>{feat.icon}</div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{feat.title}</h3>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0.5rem', background: 'var(--surface-light)', borderRadius: '24px' }}>
             <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" alt="Students studying" style={{ width: '100%', height: 'auto', borderRadius: '20px', objectFit: 'cover' }} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--background)', padding: '4rem 6% 2rem 6%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <div className="logo" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>SUDHIR TUTORIALS</div>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '300px' }}>Empowering students with knowledge, guidance, and the digital tools needed to conquer their academic goals.</p>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Programs</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)' }}>
              <li>JEE Mains & Adv</li>
              <li>NEET (UG)</li>
              <li>Foundation (Class 8-10)</li>
              <li>Crash Courses</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Quick Links</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)' }}>
              <li>Student Login</li>
              <li>Teacher Portal</li>
              <li>Admissions 2026</li>
              <li>Contact Us</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Contact</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)' }}>
              <li>📍 123 Education Hub, New Delhi</li>
              <li>📞 +91 98765 43210</li>
              <li>✉️ info@sudhirtutorials.com</li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          © 2026 Sudhir Tutorials Coaching Institute. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
