"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProfileEditor } from '@/components/ProfileEditor';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';
import { StudentLedger } from '@/components/StudentLedger';
import { LecturesSection } from '@/components/LecturesSection';
import { useTheme } from '@/components/ThemeProvider';
import { UserProfileModal } from '@/components/UserProfileModal';

function StudentDashboardContent() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeProfileUserId, setActiveProfileUserId] = useState<string | null>(null);
  const [chatSelectedUserId, setChatSelectedUserId] = useState<string | null>(null);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(pathname + '?' + params.toString());
  };

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch('/api/unread-counts');
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifications(data.unreadNotifications);
        setUnreadMessages(data.unreadMessages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 6000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);
  
  const [dashboard, setDashboard] = useState<{ name: string, batches: any[], feeHighlight: any } | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);

  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [razorpayFee, setRazorpayFee] = useState<any>(null);
  const [isRazorpayPaying, setIsRazorpayPaying] = useState(false);
  const [razorpaySuccess, setRazorpaySuccess] = useState(false);
  const [razorpayMethod, setRazorpayMethod] = useState('UPI');
  const [razorpayUpiApp, setRazorpayUpiApp] = useState('GPay');
  const [razorpayTxId, setRazorpayTxId] = useState('');

  // Digital Guru Ji AI states
  const [guruQuestion, setGuruQuestion] = useState('');
  const [guruSubject, setGuruSubject] = useState('Mathematics');
  const [guruLanguage, setGuruLanguage] = useState<'ENGLISH' | 'HINDI' | 'HINGLISH'>('ENGLISH');
  const [guruHistory, setGuruHistory] = useState<Array<{ role: 'user' | 'guru', content: string, subject?: string }>>([
    { role: 'guru', content: 'Greetings, dear student! 👋 I am Digital Guru Ji, your virtual personal AI tutor. Let\'s conquer your academic doubts today! Choose a subject, select your preferred language, and ask away.' }
  ]);

  useEffect(() => {
    if (session?.user?.name) {
      setGuruHistory([
        { role: 'guru', content: `Hello, ${session.user.name}! 👋 I am Digital Guru Ji, your personal AI tutor. Let's conquer your academic doubts today! Choose a subject, select your preferred language, and ask away.` }
      ]);
    }
  }, [session?.user?.name]);

  const [guruLoading, setGuruLoading] = useState(false);

  // High performance formatting engine to render clean unicode mathematics and science equations beautifully
  const formatGuruResponse = (content: string) => {
    return content.split('\n').map((line, idx) => {
      let text = line;
      // Format bold text **something** into <strong>something</strong>
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Format italic or code `something` into styled code span
      text = text.replace(/`(.*?)`/g, '<code style="background:var(--surface-light);padding:2px 6px;border-radius:4px;font-family:monospace;color:var(--primary);font-weight:600;">$1</code>');

      if (text.startsWith('### ')) {
        return <h3 key={idx} style={{ color: '#d97706', fontSize: '1.25rem', marginTop: '1.25rem', marginBottom: '0.75rem', fontWeight: 800 }}>{text.slice(4)}</h3>;
      }
      if (text.startsWith('#### ')) {
        return <h4 key={idx} style={{ color: '#b45309', fontSize: '1.1rem', marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 700 }}>{text.slice(5)}</h4>;
      }
      if (text.startsWith('👉 ')) {
        return <div key={idx} style={{ background: 'rgba(245,158,11,0.08)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b', margin: '0.75rem 0', fontWeight: 700, color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: text.slice(2) }} />;
      }
      if (text.startsWith('* ') || text.startsWith('- ')) {
        return <li key={idx} style={{ marginLeft: '1.2rem', marginBottom: '0.35rem', listStyleType: 'square', color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: text.slice(2) }} />;
      }
      if (text.startsWith('---')) {
        return <hr key={idx} style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '1.25rem 0' }} />;
      }
      return <p key={idx} style={{ margin: '0.5rem 0', lineHeight: 1.6, color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: text }} />;
    });
  };

  const askGuruJi = async () => {
    if (!guruQuestion.trim()) return;
    const q = guruQuestion;
    const subj = guruSubject;
    setGuruQuestion('');
    
    // Add user message to history
    setGuruHistory(prev => [...prev, { role: 'user', content: q, subject: subj }]);
    setGuruLoading(true);

    try {
      const res = await fetch('/api/student/guru-ji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, subject: subj, language: guruLanguage })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGuruHistory(prev => [...prev, { role: 'guru', content: data.solution }]);
      } else {
        setGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Sorry dear child, I encountered a connection issue. Please try seeking my guidance again.' }]);
      }
    } catch (e) {
      setGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Network connection error occurred. Make sure you are connected to the Internet.' }]);
    } finally {
      setGuruLoading(false);
      // Scroll to bottom of chat feed
      setTimeout(() => {
        const feed = document.getElementById('guru-chat-feed');
        if (feed) feed.scrollTop = feed.scrollHeight;
      }, 100);
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'materials') fetchMaterials();
    if (activeTab === 'fees') fetchFees();
    if (activeTab === 'tests') fetchTests();
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/student/dashboard');
      if (res.ok) setDashboard(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/student/materials');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchFees = async () => {
    try {
      const res = await fetch('/api/student/fees');
      if (res.ok) {
        const data = await res.json();
        setFees(data.fees || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/student/tests');
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch (e) { console.error(e); }
  };

  const handlePayOnline = (fee: any) => {
    setRazorpayFee(fee);
    setIsRazorpayOpen(true);
    setRazorpaySuccess(false);
    setIsRazorpayPaying(false);
    setRazorpayTxId('');
  };

  const handleRazorpaySubmit = async () => {
    if (!razorpayFee) return;
    setIsRazorpayPaying(true);
    
    // Simulate secure network/bank connection delay for 1.8s
    await new Promise(resolve => setTimeout(resolve, 1800));

    try {
      const res = await fetch('/api/student/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeId: razorpayFee.id,
          transactionId: razorpayTxId,
          paymentMethod: 'Razorpay Direct Link'
        })
      });

      if (res.ok) {
        setRazorpaySuccess(true);
        fetchFees(); // refresh fee history
        // Wait 2.5s for success checkmark before closing modal
        setTimeout(() => {
          setIsRazorpayOpen(false);
          setRazorpayFee(null);
        }, 2500);
      } else {
        const err = await res.json();
        alert(err.error || 'Payment failed. Please try again.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to process payment.');
    } finally {
      setIsRazorpayPaying(false);
    }
  };

  const viewReceipt = async (feeId: string) => {
    try {
      const res = await fetch(`/api/student/fees/receipt/${feeId}`);
      if (res.ok) {
        const data = await res.json();
        setReceiptData(data.fee);
        setIsReceiptOpen(true);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to open receipt.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to load receipt.');
    }
  };

  const downloadReceiptPDF = async (receiptId: string) => {
    setDownloadingPDF(true);
    try {
      const loadHtml2Pdf = () => {
        return new Promise<void>((resolve, reject) => {
          if ((window as any).html2pdf) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2pdf script.'));
          document.head.appendChild(script);
        });
      };

      await loadHtml2Pdf();
      const original = document.querySelector('.receipt-print-area') as HTMLElement;
      if (!original) {
        alert('Receipt area not found!');
        return;
      }

      // Temporarily hide the no-print action buttons
      const buttons = original.querySelector('.no-print') as HTMLElement;
      if (buttons) buttons.style.display = 'none';

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Receipt_${receiptData?.receiptNo?.replace(/\//g, '_') || 'REC_' + receiptId.slice(-6).toUpperCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await (window as any).html2pdf().from(original).set(opt).save();
      
      // Restore the buttons
      if (buttons) buttons.style.display = 'flex';
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please try print option.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      <div className="bg-glow" style={{ top: '20%', left: '-10%', opacity: 0.5 }}></div>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            जय सियाराम 🙏 <span style={{ color: 'var(--primary)' }}>{dashboard?.name || 'Student'}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Here is a summary of your academic progress and dues.</p>
        </div>
        <LiveClock />
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', overflowX: 'auto' }} className="no-print">
        {['dashboard', 'attendance', 'materials', 'tests', 'fees', 'lectures', 'guru-ji', 'messages', 'notifications', 'profile'].map(tab => (
          <button 
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{ 
              padding: '0.75rem 1rem', 
              background: 'transparent', 
              border: 'none', 
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)', 
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent', 
              fontWeight: 600, 
              whiteSpace: 'nowrap',
              textTransform: 'capitalize',
              cursor: 'pointer' 
            }}
          >
            {tab === 'messages' && unreadMessages > 0 && (
              <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', marginRight: '6px', fontWeight: 800 }}>{unreadMessages}</span>
            )}
            {tab === 'notifications' && unreadNotifications > 0 && (
              <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', marginRight: '6px', fontWeight: 800 }}>{unreadNotifications}</span>
            )}
            {tab === 'dashboard' ? '📊 Dashboard' :
             tab === 'attendance' ? '✏️ My Attendance' :
             tab === 'materials' ? '📚 Study Materials' :
             tab === 'tests' ? '📝 Tests & Marks' :
             tab === 'fees' ? '🧾 Student Fee Statement' :
             tab === 'lectures' ? '📺 Live Classes' :
             tab === 'guru-ji' ? '✨ Digital Guru Ji' :
             tab === 'messages' ? '💬 Messages' :
             tab === 'notifications' ? '🔔 Notifications' :
             tab === 'profile' ? '👤 My Profile' :
             tab}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Weekly Timetable</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Live Schedule</span>
              </div>
              
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem', minWidth: '800px' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                    const daySchedules: any[] = [];
                    dashboard?.batches?.forEach(b => {
                      b.schedules?.forEach((s: any) => {
                        if (s.dayOfWeek === idx) daySchedules.push({ ...s, batchName: b.name });
                      });
                    });

                    return (
                      <div key={day} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem 0.5rem', minHeight: '120px', border: '1px solid var(--border)' }}>
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{day}</div>
                        {daySchedules.length > 0 ? (
                          daySchedules.map(ds => (
                            <div key={ds.id} style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '6px', borderRadius: '6px', marginBottom: '6px', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)' }}>
                              <div style={{ fontWeight: 800 }}>{ds.startTime}</div>
                              {ds.subject && <div style={{ fontWeight: 700, fontSize: '0.6rem', background: 'rgba(255,255,255,0.15)', padding: '2px 4px', borderRadius: '4px', margin: '2px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{ds.subject}</div>}
                              <div style={{ opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ds.batchName}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{ height: '20px' }}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            {/* My Batches & Teachers */}
            <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🎒 My Batches & Instructors
              </h3>
              {dashboard?.batches && dashboard.batches.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                  {dashboard.batches.map((b: any) => (
                    <div key={b.id} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border)', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{b.name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>Course: {b.course?.name} | Grade: {b.className || 'N/A'}</span>
                        </div>
                        {b.subjects && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {b.subjects.split(',').map((subj: string) => (
                              <span key={subj} style={{ fontSize: '0.7rem', padding: '4px 10px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', borderRadius: '100px', fontWeight: 700 }}>
                                {subj.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ height: '1px', background: 'var(--border)' }}></div>

                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Assigned Instructors
                        </div>
                        {b.teachers && b.teachers.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {b.teachers.map((t: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--secondary), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.85rem' }}>
                                  {t.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div 
                                    onClick={() => setActiveProfileUserId(t.id)} 
                                    style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline decoration-dotted' }} 
                                    className="clickable-name"
                                  >
                                    {t.name}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Instructor</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No teachers assigned yet for this batch.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                  Not enrolled in any academic batches yet. Please contact the administrator.
                </div>
              )}
            </div>
          </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className={`glass-card ${(dashboard as any)?.feeHighlight?.isOverdue ? 'overdue-pulse' : ''}`} style={{ padding: '2rem', background: (dashboard as any)?.feeHighlight?.isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'linear-gradient(135deg, var(--primary), var(--accent))', border: (dashboard as any)?.feeHighlight?.isOverdue ? '1px solid rgba(239, 68, 68, 0.5)' : undefined }}>
                 <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: (dashboard as any)?.feeHighlight?.isOverdue ? '#ef4444' : '#fff' }}>Fee Status</h3>
                 
                 {(dashboard as any)?.feeHighlight ? (
                   <>
                     <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: (dashboard as any).feeHighlight.isOverdue ? '#ef4444' : '#fff' }}>
                       ₹{(dashboard as any).feeHighlight.amount.toFixed(0)}
                     </div>
                     <p style={{ color: (dashboard as any)?.feeHighlight?.isOverdue ? 'var(--text)' : 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                       {(dashboard as any).feeHighlight.status === 'PENDING' ? `Due by ${((() => { const d = new Date((dashboard as any).feeHighlight.dueDate); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}` : `Status: ${(dashboard as any).feeHighlight.status}`}
                     </p>
                     <button className="btn-secondary" style={{ width: '100%', fontSize: '0.9rem', background: (dashboard as any)?.feeHighlight?.isOverdue ? undefined : 'rgba(255,255,255,0.15)', color: (dashboard as any)?.feeHighlight?.isOverdue ? undefined : '#fff', border: (dashboard as any)?.feeHighlight?.isOverdue ? undefined : '1px solid rgba(255,255,255,0.2)' }} onClick={() => handleTabChange('fees')}>Pay Online</button>
                   </>
                 ) : (
                   <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>No pending fees. You are all caught up!</p>
                 )}
              </div>

              <div className="glass-card" style={{ padding: '2rem', background: 'rgba(59,130,246,0.05)', cursor: 'pointer' }} onClick={() => handleTabChange('attendance')}>
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Overall Attendance</h3>
                 <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary)' }}>{(dashboard as any)?.attendance?.percentage || 0}%</div>
                 <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
                    <div style={{ width: `${(dashboard as any)?.attendance?.percentage || 0}%`, height: '100%', background: 'var(--secondary)', boxShadow: '0 0 10px rgba(59,130,246,0.4)' }}></div>
                 </div>
                 <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>{(dashboard as any)?.attendance?.present || 0} / {(dashboard as any)?.attendance?.total || 0} Days Present</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'attendance' && (
        <div className="glass-card animate-scale-up" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Attendance Record</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
             <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Attendance Rate</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{(dashboard as any)?.attendance?.percentage || 0}%</div>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Sessions</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{(dashboard as any)?.attendance?.total || 0}</div>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Days Present</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{(dashboard as any)?.attendance?.present || 0}</div>
             </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th>Batch</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard as any)?.attendance?.history?.length > 0 ? (
                  (dashboard as any).attendance.history.map((a: any) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem' }}>{((() => { const d = new Date(a.date); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}</td>
                      <td>Batch assigned</td>
                      <td>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                          background: a.status === 'PRESENT' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                          color: a.status === 'PRESENT' ? 'var(--secondary)' : '#ef4444'
                        }}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No attendance history recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Course Materials</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {materials.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No materials have been uploaded for your courses yet.</p>
            ) : (
              materials.map(mat => (
                <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontWeight: 800, 
                        color: '#fff',
                        background: mat.type === 'PDF' ? '#ef4444' : 
                                    mat.type === 'VIDEO' ? '#8b5cf6' : 
                                    mat.type === 'WORD' ? '#3b82f6' : 
                                    mat.type === 'IMAGE' ? '#10b981' : '#6366f1'
                      }}>
                        {mat.type === 'PDF' ? '📄 PDF' : 
                         mat.type === 'VIDEO' ? '🎥 VIDEO' : 
                         mat.type === 'WORD' ? '📝 WORD' : 
                         mat.type === 'IMAGE' ? '🖼️ IMAGE' : '🔗 LINK'}
                      </span>
                      {mat.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Course: <strong>{mat.course?.name}</strong> • Uploaded by <span 
                        onClick={() => setActiveProfileUserId(mat.teacher?.id)} 
                        style={{ cursor: 'pointer', textDecoration: 'underline decoration-dotted', fontWeight: 600 }}
                        className="clickable-name"
                      >
                        {mat.teacher?.name}
                      </span>
                    </div>
                  </div>
                  <a href={mat.url} target="_blank" rel="noreferrer" className="btn-secondary">Open Material →</a>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Beautiful warning banner if there are any pending invoices */}
          {fees.some(f => f.status === 'PENDING') && (
            <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(245,158,11,0.05)', border: '1px solid #f59e0b', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f59e0b' }}>⚠️ Outstanding Invoice Alert</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Please settle your pending balance online to avoid automatic late fines.</p>
              </div>
              <button onClick={() => {
                const pending = fees.find(f => f.status === 'PENDING');
                if (pending) handlePayOnline(pending);
              }} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                Pay Outstanding Now
              </button>
            </div>
          )}
          
          <StudentLedger onPayOnline={handlePayOnline} onViewReceipt={viewReceipt} />
        </div>
      )}

      {activeTab === 'lectures' && (
        <LecturesSection />
      )}

      {activeTab === 'tests' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2 style={{ fontSize: '1.5rem', margin: 0 }}>My Test Performance</h2>
             {(dashboard as any)?.testStats?.averageScore !== null && (
                <div style={{ background: 'var(--primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}>
                   Avg. Score: {(dashboard as any).testStats.averageScore}%
                </div>
             )}
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {tests.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No tests are scheduled for your courses at the moment.</p>
            ) : (
              tests.map(test => {
                const testDate = new Date(test.date);
                const isUpcoming = testDate > new Date();
                const result = (dashboard as any)?.testStats?.results?.find((r: any) => r.testId === test.id);
                
                return (
                  <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: `1px solid ${isUpcoming ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '12px', background: isUpcoming ? 'rgba(79, 70, 229, 0.05)' : 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{test.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Course: <strong>{test.course?.name}</strong></div>
                      {result && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>Score: {result.marks} / {result.totalMarks}</span>
                           <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{result.remarks}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: isUpcoming ? '#fff' : 'var(--text-muted)' }}>
                        {((() => { const d = new Date(testDate); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {testDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {isUpcoming && <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, marginTop: '4px' }}>UPCOMING</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}





      {isReceiptOpen && receiptData && (
        <div className="receipt-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card receipt-print-area" style={{ 
            width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden', 
            background: '#fff', color: '#1a1a1a', borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative', margin: 'auto'
          }}>
            {/* PAID Stamp Overlay */}
            {(receiptData.status === 'PAID' || receiptData.status === 'VERIFIED' || receiptData.status === 'PAID_ONLINE') && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)',
                border: '6px solid rgba(16, 185, 129, 0.04)', color: 'rgba(16, 185, 129, 0.04)',
                fontSize: '6rem', fontWeight: 900, padding: '1rem 2rem', borderRadius: '1rem',
                pointerEvents: 'none', zIndex: 0, textTransform: 'uppercase', letterSpacing: '10px'
              }}>
                PAID
              </div>
            )}

            <div style={{ padding: '2.5rem', border: '8px solid #f3f4f6', position: 'relative', zIndex: 2 }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#1a1a1a', fontSize: '1.5rem', margin: 0, letterSpacing: '1px', fontWeight: 800 }}>SUDHIR TUTORIALS</h1>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0' }}>Professional Coaching for Academic Excellence</p>
                <div style={{ height: '1px', background: '#e5e7eb', width: '60px', margin: '1rem auto' }}></div>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#374151' }}>Payment Receipt</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800 }}>Student Name</div>
                  <div style={{ fontWeight: 700, color: '#1a1a1a' }}>{receiptData.student?.name}</div>
                  <div style={{ color: '#6b7280' }}>ID: {receiptData.student?.username}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800 }}>Receipt #</div>
                  <div style={{ fontWeight: 700, color: '#1a1a1a' }}>{receiptData.receiptNo || `REC-${receiptData.id.slice(-6).toUpperCase()}`}</div>
                  <div style={{ color: '#6b7280' }}>
                    {receiptData.paidAt 
                      ? `${((() => { const d = new Date(receiptData.paidAt); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}, ${new Date(receiptData.paidAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                      : ((() => { const d = new Date(); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #f3f4f6', borderBottom: '2px solid #f3f4f6', padding: '1.5rem 0', marginBottom: '2rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#374151' }}>
                  <span>{receiptData.title} ({receiptData.billingMonth})</span>
                  <span style={{ fontWeight: 700, color: '#1a1a1a' }}>₹{receiptData.amount.toFixed(2)}</span>
                </div>
                {receiptData.lateFine > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#ef4444' }}>
                    <span>Late Fine</span>
                    <span style={{ fontWeight: 700 }}>+₹{receiptData.lateFine.toFixed(2)}</span>
                  </div>
                )}
                {receiptData.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#10b981' }}>
                    <span>Discount Applied</span>
                    <span style={{ fontWeight: 700 }}>-₹{receiptData.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #e5e7eb', color: '#1a1a1a' }}>
                  <span style={{ fontWeight: 800 }}>TOTAL PAID</span>
                  <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>₹{(receiptData.paidAmount || (receiptData.amount + (receiptData.lateFine || 0) - (receiptData.discount || 0))).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2rem' }}>
                <div style={{ marginBottom: '0.25rem' }}><strong>Method:</strong> {receiptData.paymentMethod || 'ONLINE'}</div>
                {receiptData.transactionId && <div><strong>TXN ID:</strong> {receiptData.transactionId}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontStyle: 'italic' }}>
                  * This is a computer-generated receipt. No signature is required.
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', letterSpacing: '0.5px' }}>SUDHIR TUTORIALS</div>
                  <div style={{ fontSize: '0.55rem', color: '#9ca3af', textTransform: 'uppercase', marginTop: '2px' }}>Online Fee Desk</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }} className="no-print">
                <button 
                  onClick={() => setIsReceiptOpen(false)}
                  style={{ 
                    flex: 1, minWidth: '80px', padding: '0.8rem 1rem', borderRadius: '12px', 
                    background: '#374151', color: '#fff', border: 'none', 
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#374151'}
                >
                  ❌ Close
                </button>
                <button 
                  onClick={() => window.print()}
                  style={{ 
                    flex: 1.5, minWidth: '120px', padding: '0.8rem 1rem', borderRadius: '12px', 
                    background: 'transparent', border: '2px solid var(--primary)', color: 'var(--primary)',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; }}
                >
                  🖨 Print
                </button>
                <button 
                  onClick={() => downloadReceiptPDF(receiptData.id)}
                  disabled={downloadingPDF}
                  style={{ 
                    flex: 2, minWidth: '150px', padding: '0.8rem 1.25rem', borderRadius: '12px', 
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', 
                    fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem',
                    boxShadow: '0 4px 15px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  {downloadingPDF ? 'Generating...' : '📥 Download PDF'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 💳 SIMULATED RAZORPAY GATEWAY OVERLAY */}
      {isRazorpayOpen && razorpayFee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="animate-scale-up" style={{ 
            width: '680px', maxWidth: '100%', 
            background: '#0b132b', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
            position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 'auto'
          }}>
            {/* Header: Razorpay Secured */}
            <div style={{ 
              background: '#0f172a', padding: '1.25rem 2rem', 
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.4rem', color: '#3b82f6', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  Razorpay <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, background: '#3b82f6', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>SECURE</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}>
                <span>🔒 PCI-DSS Compliant</span>
              </div>
            </div>

            {/* Inner Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', minHeight: '380px' }}>
              
              {/* Left Side Panel: Merchant and Amount (Locked) */}
              <div style={{ 
                background: 'rgba(255,255,255,0.02)', padding: '2rem 1.5rem',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Coaching Institute</div>
                  <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: '#fff' }}>SUDHIR TUTORIALS</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{razorpayFee.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '4px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '0.5rem' }}>
                    {razorpayFee.billingMonth}
                  </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Total Fee Amount</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                    ₹{razorpayFee.totalAmount.toFixed(0)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'block', marginTop: '4px' }}>
                    ✔ No manual entry required
                  </span>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '1.5rem' }}>
                  <div><strong>Student ID:</strong> {session?.user?.name}</div>
                  <div><strong>Email:</strong> {(session?.user as any)?.email || 'student@sudhirtutorials.com'}</div>
                </div>
              </div>

              {/* Right Side Panel: Razorpay Direct Payment Gateway */}
              <div style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Official Razorpay Gateway</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                    Please click the button below to complete your payment of <strong style={{ color: '#fff' }}>₹{razorpayFee.totalAmount.toFixed(0)}</strong> securely via Razorpay's official portal.
                  </p>
                  
                  {/* Step 1: Open Link */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Step 1: Complete Payment</span>
                    <a
                      href="https://razorpay.me/@sudhiir"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                        width: '100%', padding: '1.1rem', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #0070f3, #00df00)', color: '#fff',
                        fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                        boxShadow: '0 4px 20px rgba(0, 112, 243, 0.4)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        textAlign: 'center', letterSpacing: '0.5px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 223, 0, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 112, 243, 0.4)';
                      }}
                    >
                      🔒 Click to Pay Securely
                    </a>
                  </div>

                  {/* Step 2: Verification Details */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Step 2: Submit Verification Reference</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      After successful transfer, enter the payment transaction ID or Reference ID below:
                    </p>
                    <div className="input-group">
                      <input 
                        type="text" 
                        required
                        value={razorpayTxId} 
                        onChange={e => setRazorpayTxId(e.target.value)} 
                        placeholder="e.g. pay_N23sd9fX87 or UPI Txn Ref No" 
                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#fff', padding: '0.85rem' }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Confirm Pay Button */}
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRazorpayOpen(false);
                      setRazorpayFee(null);
                    }}
                    style={{
                      flex: 1, padding: '0.85rem', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'var(--text)', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!razorpayTxId.trim()}
                    onClick={handleRazorpaySubmit}
                    className="btn-primary"
                    style={{ flex: 2, padding: '0.85rem', background: '#10b981', color: '#fff', border: 'none', opacity: razorpayTxId.trim() ? 1 : 0.5, cursor: razorpayTxId.trim() ? 'pointer' : 'not-allowed', fontWeight: 700 }}
                  >
                    Confirm & Submit Details
                  </button>
                </div>

              </div>

            </div>

            {/* PROCESSING OVERLAY SPINNER */}
            {isRazorpayPaying && (
              <div style={{ 
                position: 'absolute', inset: 0, 
                background: 'rgba(11,19,43,0.95)', 
                display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center', 
                zIndex: 100
              }}>
                <div className="spinner" style={{ borderTopColor: '#3b82f6', width: '50px', height: '50px' }}></div>
                <h3 style={{ marginTop: '1.5rem', color: '#fff', fontSize: '1.25rem' }}>Processing Payment Securely</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Do not refresh this page or click back button...
                </p>
              </div>
            )}

            {/* SUCCESS OVERLAY */}
            {razorpaySuccess && (
              <div style={{ 
                position: 'absolute', inset: 0, 
                background: '#0b132b', 
                display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center', 
                zIndex: 100,
                textAlign: 'center', padding: '2rem'
              }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', 
                  background: 'rgba(16,185,129,0.1)', border: '3px solid #10b981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '3rem', color: '#10b981', marginBottom: '1.5rem',
                  boxShadow: '0 0 20px rgba(16,185,129,0.3)'
                }}>
                  ✔
                </div>
                <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800 }}>Payment Successful!</h2>
                <p style={{ color: '#10b981', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.5rem' }}>
                  ₹{razorpayFee.totalAmount.toFixed(0)} Paid Online via {razorpayMethod}
                </p>
                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '0.75rem 1.5rem', borderRadius: '12px',
                  marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)'
                }}>
                  <strong>Transaction ID:</strong> {razorpayTxId || 'N/A'}<br />
                  <span>The administrator has been notified to verify your ledger record.</span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <style jsx>{`
        .overdue-pulse {
          animation: pulse-red 2s infinite;
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          header, footer, nav, button, .bg-glow, .no-print {
            display: none !important;
          }
          .animate-fade-in > *:not(.receipt-modal-backdrop) {
            display: none !important;
          }
          .receipt-modal-backdrop {
            position: absolute !important;
            inset: 0 !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            z-index: 99999 !important;
            width: 100% !important;
            backdrop-filter: none !important;
          }
          .receipt-print-area {
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 1.5rem !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .receipt-print-area * {
            color: #000000 !important;
            background: transparent !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      {activeTab === 'guru-ji' && (
        <div className="glass-card animate-scale-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', minHeight: '650px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
          {/* Guru Ji Header */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)', animation: 'pulse 2s infinite' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" fill="#fff" />
                <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill="#fff" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', margin: 0 }}>Digital Guru Ji (डिजिटल गुरु जी)</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>Your 24/7 AI-powered personal tutor. Solve doubts instantly with step-by-step explanations.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem', flex: 1 }} className="guru-grid">
            <style>{`
              .guru-grid {
                display: grid;
              }
              @media (max-width: 900px) {
                .guru-grid {
                  grid-template-columns: 1fr !important;
                }
              }
              @keyframes pulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
                70% { transform: scale(1.05); box-shadow: 0 0 20px 10px rgba(245,158,11,0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0); }
              }
              .chat-bubble {
                border-radius: 16px;
                padding: 1.25rem;
                max-width: 85%;
                line-height: 1.6;
                font-size: 0.95rem;
              }
              .chat-bubble pre {
                background: var(--surface-light);
                padding: 1rem;
                border-radius: 8px;
                overflow-x: auto;
                margin: 1rem 0;
                border: 1px solid var(--border);
              }
              .chat-bubble code {
                font-family: monospace;
                background: var(--surface-light);
                padding: 2px 6px;
                border-radius: 4px;
                color: var(--primary);
                font-weight: 600;
              }
            `}</style>

            {/* Left Column: Input Form & Subject Selector & Quick Examples */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="input-group">
                <label style={{ color: '#f59e0b', fontWeight: 700 }}>Select Subject</label>
                <select 
                  value={guruSubject} 
                  onChange={(e) => setGuruSubject(e.target.value)}
                  style={{ width: '100%', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem' }}
                >
                  {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'General Academics'].map(subj => (
                    <option key={subj} value={subj} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{subj}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label style={{ color: '#f59e0b', fontWeight: 700 }}>Explanatory Language</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {(['ENGLISH', 'HINDI', 'HINGLISH'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setGuruLanguage(lang)}
                      style={{
                        flex: 1,
                        padding: '0.8rem 0.5rem',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: guruLanguage === lang ? '#f59e0b' : 'var(--border)',
                        background: guruLanguage === lang ? 'rgba(245, 158, 11, 0.15)' : 'var(--input-bg)',
                        color: guruLanguage === lang ? '#f59e0b' : 'var(--text)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                    >
                      {lang === 'HINGLISH' ? '💬 Hinglish' : lang === 'HINDI' ? '🇮🇳 Hindi' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <label style={{ color: '#f59e0b', fontWeight: 700 }}>Type your academic doubt</label>
                <textarea 
                  placeholder="Ask a question (e.g. Solve quadratic equation, Explain photosynthesis...)" 
                  value={guruQuestion}
                  onChange={(e) => setGuruQuestion(e.target.value)}
                  style={{ width: '100%', flex: 1, minHeight: '120px', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem', resize: 'none', lineHeight: 1.5 }}
                />
              </div>

              <button 
                onClick={askGuruJi}
                disabled={guruLoading || !guruQuestion.trim()}
                style={{ 
                  width: '100%', padding: '1rem', borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', 
                  fontWeight: 800, cursor: guruLoading || !guruQuestion.trim() ? 'not-allowed' : 'pointer', fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                {guruLoading ? 'Thinking...' : '✨ Ask Guru Ji'}
              </button>
            </div>

            {/* Right Column: Chat History and Explanation */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-bg-alt)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', height: '550px' }}>
              <div style={{ background: 'var(--surface-light)', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.9rem' }}>📖 STUDY DESK & GUIDANCE</span>
                <button 
                  onClick={() => setGuruHistory([{ role: 'guru', content: `Hello, ${session?.user?.name || 'student'}! 👋 I am Digital Guru Ji, your personal AI tutor. Let's conquer your academic doubts today! Choose a subject, select your preferred language, and ask away.` }])}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  🧹 Clear Board
                </button>
              </div>

              {/* Message Feed */}
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} id="guru-chat-feed">
                {guruHistory.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div 
                      className="chat-bubble"
                      style={{ 
                        background: msg.role === 'user' ? 'rgba(99, 102, 241, 0.15)' : 'var(--surface)', 
                        border: msg.role === 'user' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border)',
                        color: 'var(--text)',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {msg.subject && (
                        <span style={{ display: 'inline-block', fontSize: '0.65rem', background: '#f59e0b', color: '#1e1b16', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                          {msg.subject}
                        </span>
                      )}
                      
                      <div>
                        {msg.role === 'guru' ? (
                          formatGuruResponse(msg.content)
                        ) : (
                          <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {guruLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div className="chat-bubble" style={{ background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="spinner" style={{ width: '15px', height: '15px', border: '2px solid #f3f3f3', borderTop: '2px solid #f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Guru Ji is calculating step-by-step solution...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'messages' && session?.user && (
        <ChatWindow currentUserId={(session.user as any).id} onMessagesRead={fetchUnreadCounts} initialSelectedUserId={chatSelectedUserId} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel onUnreadChange={setUnreadNotifications} />
      )}

      {activeTab === 'profile' && (
        <ProfileEditor role="STUDENT" />
      )}

      {activeProfileUserId && (
        <UserProfileModal 
          userId={activeProfileUserId} 
          onClose={() => setActiveProfileUserId(null)} 
          onStartChat={(user) => {
            setChatSelectedUserId(user.id);
            handleTabChange('messages');
          }}
        />
      )}
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Loading Dashboard...</div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}
