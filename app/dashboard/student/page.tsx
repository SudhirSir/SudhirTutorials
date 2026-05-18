"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProfileEditor } from '@/components/ProfileEditor';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';

function StudentDashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  
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

  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [razorpayFee, setRazorpayFee] = useState<any>(null);
  const [isRazorpayPaying, setIsRazorpayPaying] = useState(false);
  const [razorpaySuccess, setRazorpaySuccess] = useState(false);
  const [razorpayMethod, setRazorpayMethod] = useState('UPI');
  const [razorpayUpiApp, setRazorpayUpiApp] = useState('GPay');
  const [razorpayTxId, setRazorpayTxId] = useState('');

  useEffect(() => {
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
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', overflowX: 'auto' }}>
        {['dashboard', 'attendance', 'materials', 'tests', 'fees', 'messages', 'notifications', 'profile'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
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
            {tab}
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
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem' }}>
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
                          👨‍🏫 Assigned Instructors
                        </div>
                        {b.teachers && b.teachers.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {b.teachers.map((t: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.85rem' }}>
                                  {t.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.name}</div>
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
                       {(dashboard as any).feeHighlight.status === 'PENDING' ? `Due by ${new Date((dashboard as any).feeHighlight.dueDate).toLocaleDateString()}` : `Status: ${(dashboard as any).feeHighlight.status}`}
                     </p>
                     <button className="btn-secondary" style={{ width: '100%', fontSize: '0.9rem', background: (dashboard as any)?.feeHighlight?.isOverdue ? undefined : 'rgba(255,255,255,0.15)', color: (dashboard as any)?.feeHighlight?.isOverdue ? undefined : '#fff', border: (dashboard as any)?.feeHighlight?.isOverdue ? undefined : '1px solid rgba(255,255,255,0.2)' }} onClick={() => setActiveTab('fees')}>Pay Online</button>
                   </>
                 ) : (
                   <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>No pending fees. You are all caught up!</p>
                 )}
              </div>

              <div className="glass-card" style={{ padding: '2rem', background: 'rgba(16, 185, 129, 0.05)', cursor: 'pointer' }} onClick={() => setActiveTab('attendance')}>
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Overall Attendance</h3>
                 <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>{(dashboard as any)?.attendance?.percentage || 0}%</div>
                 <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
                    <div style={{ width: `${(dashboard as any)?.attendance?.percentage || 0}%`, height: '100%', background: '#10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}></div>
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
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{(dashboard as any)?.attendance?.percentage || 0}%</div>
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
                      <td style={{ padding: '1rem' }}>{new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>Batch assigned</td>
                      <td>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                          background: a.status === 'PRESENT' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: a.status === 'PRESENT' ? '#10b981' : '#ef4444'
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
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'var(--primary)', color: '#fff' }}>{mat.type}</span>
                      {mat.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Course: <strong>{mat.course?.name}</strong> • Uploaded by {mat.teacher?.name}
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
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Fee History & Ledger</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Late fine applies automatically on overdue payments.</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 0' }}>Title</th>
                  <th>Month</th>
                  <th>Due Date</th>
                  <th>Base Amount</th>
                  <th>Late Fine</th>
                  <th>Total Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No fee records found.</td></tr>
                ) : (
                  fees.map(fee => {
                    const isOverdue = fee.status === 'PENDING' && fee.lateFine > 0;
                    return (
                      <tr key={fee.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isOverdue ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                        <td style={{ padding: '1rem 0', fontWeight: 600 }}>{fee.title}</td>
                        <td>{fee.billingMonth}</td>
                        <td style={{ color: isOverdue ? '#f87171' : 'var(--text-muted)' }}>
                          {new Date(fee.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>₹{fee.amount.toFixed(0)}</td>
                        <td style={{ color: fee.lateFine > 0 ? '#f87171' : 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {fee.lateFine > 0 ? (
                            <div>
                               <div style={{ fontWeight: 700 }}>+₹{fee.lateFine}</div>
                               <div style={{ fontSize: '0.7rem' }}>
                                 {fee.daysLate > 10 ? `(${Math.floor((fee.daysLate-1)/30)+1} mo. x ₹100)` : `(${fee.daysLate} days x ₹10)`}
                               </div>
                            </div>
                          ) : '—'}
                        </td>
                        <td style={{ fontWeight: 'bold' }}>₹{fee.totalAmount.toFixed(0)}</td>
                        <td>
                          {fee.status === 'PENDING' ? (
                            <button onClick={() => handlePayOnline(fee)} className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600 }}>Pay Online</button>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{
                                padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                                background: fee.status === 'PAID' ? 'rgba(52,211,153,0.2)' : fee.status === 'VERIFIED' ? 'rgba(59,130,246,0.2)' : fee.status === 'PAID_ONLINE' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                                color: fee.status === 'PAID' ? '#34d399' : fee.status === 'VERIFIED' ? '#60a5fa' : fee.status === 'PAID_ONLINE' ? '#10b981' : '#f87171'
                              }}>
                                {fee.status.replace('_', ' ')}
                              </span>
                              {fee.status === 'VERIFIED' && (
                                <button onClick={() => viewReceipt(fee.id)} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Receipt</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
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
                        {testDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card receipt-print-area" style={{ 
            padding: '3rem', width: '550px', maxWidth: '90%', 
            background: '#fff', color: '#111', 
            borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* PAID Stamp Overlay */}
            {(receiptData.status === 'PAID' || receiptData.status === 'VERIFIED' || receiptData.status === 'PAID_ONLINE') && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)',
                border: '6px solid rgba(16, 185, 129, 0.2)', color: 'rgba(16, 185, 129, 0.2)',
                fontSize: '6rem', fontWeight: 900, padding: '1rem 2rem', borderRadius: '1rem',
                pointerEvents: 'none', zIndex: 0, textTransform: 'uppercase', letterSpacing: '10px'
              }}>
                PAID
              </div>
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #f3f4f6', paddingBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#000', letterSpacing: '-0.5px' }}>SUDHIR TUTORIALS</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>Official Fee Payment Receipt</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Receipt No.</label>
                  <div style={{ fontWeight: 600 }}>#{receiptData.id.slice(-8).toUpperCase()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Date Issued</label>
                  <div style={{ fontWeight: 600 }}>
                    {receiptData.paidAt 
                      ? `${new Date(receiptData.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}, ${new Date(receiptData.paidAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Student Name</label>
                  <div style={{ fontWeight: 600 }}>{receiptData.student?.name}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>ID: {receiptData.student?.username}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <label style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Billing Period</label>
                  <div style={{ fontWeight: 600 }}>{receiptData.billingMonth}</div>
                </div>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#374151' }}>
                  <span>Tuition Fees</span>
                  <span style={{ fontWeight: 600 }}>₹{receiptData.amount.toFixed(2)}</span>
                </div>
                {receiptData.lateFine > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#dc2626', fontSize: '0.95rem' }}>
                    <span>Late Fee Applied</span>
                    <span style={{ fontWeight: 600 }}>+₹{receiptData.lateFine.toFixed(2)}</span>
                  </div>
                )}
                {receiptData.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#16a34a', fontSize: '0.95rem' }}>
                    <span>Discount Applied</span>
                    <span style={{ fontWeight: 600 }}>-₹{receiptData.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ height: '1px', background: '#e5e7eb', margin: '1rem 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.4rem', color: '#111' }}>
                  <span>Grand Total</span>
                  <span>₹{(receiptData.paidAmount || (receiptData.amount + (receiptData.lateFine || 0) - (receiptData.discount || 0))).toFixed(2)}</span>
                </div>
              </div>

              {(receiptData.paymentMethod || receiptData.transactionId) && (
                <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '2rem', background: '#f3f4f6', borderRadius: '12px', padding: '1rem', textAlign: 'left' }}>
                  {receiptData.paymentMethod && <div style={{ marginBottom: '0.25rem' }}><strong>Payment Method:</strong> {receiptData.paymentMethod}</div>}
                  {receiptData.transactionId && <div><strong>Transaction ID:</strong> {receiptData.transactionId}</div>}
                </div>
              )}

              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem', marginBottom: '2.5rem', fontStyle: 'italic' }}>
                This is a computer-generated receipt and does not require a physical signature.
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }} className="no-print">
                <button className="btn-secondary" style={{ padding: '0.8rem 2rem', color: '#111', borderColor: '#e5e7eb' }} onClick={() => setIsReceiptOpen(false)}>Close</button>
                <button className="btn-primary" style={{ padding: '0.8rem 2.5rem', background: '#000', color: '#fff', border: 'none' }} onClick={() => window.print()}>
                  🖨️ Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💳 SIMULATED RAZORPAY GATEWAY OVERLAY */}
      {isRazorpayOpen && razorpayFee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="animate-scale-up" style={{ 
            width: '680px', maxWidth: '95%', 
            background: '#0b132b', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
            position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'
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
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '380px' }}>
              
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

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '1rem' }}>
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
                        width: '100%', padding: '1rem', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff',
                        fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
                        boxShadow: '0 4px 15px rgba(59,130,246,0.3)', transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      💳 Open https://razorpay.me/@sudhiir
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
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!razorpayTxId.trim()}
                    onClick={handleRazorpaySubmit}
                    className="btn-primary"
                    style={{ flex: 2, padding: '0.85rem', background: '#10b981', color: '#fff', border: 'none', opacity: razorpayTxId.trim() ? 1 : 0.5, cursor: razorpayTxId.trim() ? 'pointer' : 'not-allowed' }}
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
          body * { visibility: hidden; }
          .receipt-print-area, .receipt-print-area * { visibility: visible; }
          .receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      {activeTab === 'messages' && session?.user && (
        <ChatWindow currentUserId={(session.user as any).id} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel />
      )}

      {activeTab === 'profile' && (
        <ProfileEditor role="STUDENT" />
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
