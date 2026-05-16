"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';

export default function StudentDashboard() {
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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1|2|3>(1);
  const [upiId, setUpiId] = useState('');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

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
    setSelectedFee(fee);
    setCheckoutStep(1);
    setUpiId('');
    setIsCheckoutOpen(true);
  };

  const initiatePayment = () => {
    if (checkoutStep === 1) {
      setCheckoutStep(2);
    } else if (checkoutStep === 2) {
      if (!upiId) return alert('Please enter your UPI ID');
      setCheckoutStep(3);
      setTimeout(() => {
        processPayment();
      }, 2500); // simulate 2.5s network delay for money transfer
    }
  };

  const processPayment = async () => {
    if (!selectedFee) return;
    try {
      const res = await fetch('/api/student/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId: selectedFee.id })
      });
      if (res.ok) {
        setIsCheckoutOpen(false);
        fetchFees();
        fetchDashboard();
        viewReceipt(selectedFee.id);
      } else {
        alert('Payment failed');
        setIsCheckoutOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error processing payment');
      setIsCheckoutOpen(false);
    }
  };

  const viewReceipt = async (feeId: string) => {
    try {
      const res = await fetch(`/api/student/fees/receipt/${feeId}`);
      if (res.ok) {
        const data = await res.json();
        setReceiptData(data.fee);
        setIsReceiptOpen(true);
      }
    } catch (e) { console.error(e); }
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
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
        {['dashboard', 'materials', 'tests', 'fees', 'messages'].map(tab => (
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className={`glass-card ${dashboard?.feeHighlight?.isOverdue ? 'overdue-pulse' : ''}`} style={{ padding: '2rem', background: dashboard?.feeHighlight?.isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))', border: dashboard?.feeHighlight?.isOverdue ? '1px solid rgba(239, 68, 68, 0.5)' : undefined }}>
                 <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: dashboard?.feeHighlight?.isOverdue ? '#f87171' : '#fff' }}>Fee Status</h3>
                 
                 {dashboard?.feeHighlight ? (
                   <>
                     <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: dashboard.feeHighlight.isOverdue ? '#f87171' : '#fff' }}>
                       ₹{dashboard.feeHighlight.amount.toFixed(0)}
                     </div>
                     <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                       {dashboard.feeHighlight.status === 'PENDING' ? `Due by ${new Date(dashboard.feeHighlight.dueDate).toLocaleDateString()}` : `Status: ${dashboard.feeHighlight.status}`}
                     </p>
                     <button className="btn-secondary" style={{ width: '100%', fontSize: '0.9rem' }} onClick={() => setActiveTab('fees')}>Pay Online</button>
                   </>
                 ) : (
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending fees. You are all caught up!</p>
                 )}
              </div>

              <div className="glass-card" style={{ padding: '2rem', background: 'rgba(16, 185, 129, 0.05)' }}>
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Overall Attendance</h3>
                 <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981' }}>94%</div>
                 <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
                    <div style={{ width: '94%', height: '100%', background: '#10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}></div>
                 </div>
              </div>
            </div>
          </div>
        </>
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
                              {(fee.status === 'PAID_ONLINE' || fee.status === 'VERIFIED' || fee.status === 'PAID') && (
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Upcoming Tests</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {tests.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No tests are scheduled for your courses at the moment.</p>
            ) : (
              tests.map(test => {
                const testDate = new Date(test.date);
                const isUpcoming = testDate > new Date();
                
                return (
                  <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: `1px solid ${isUpcoming ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '12px', background: isUpcoming ? 'rgba(79, 70, 229, 0.05)' : 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{test.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Course: <strong>{test.course?.name}</strong></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: isUpcoming ? '#fff' : 'var(--text-muted)' }}>
                        {testDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {testDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {isCheckoutOpen && selectedFee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ padding: '2rem', width: '420px', maxWidth: '95%', background: '#fff', color: '#000' }}>
            
            {checkoutStep === 1 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#000' }}>Confirm Payment</h3>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" style={{ height: '24px' }} />
                </div>
                <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>Payment for <strong>{selectedFee.title} ({selectedFee.billingMonth})</strong></p>
                <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#374151' }}>
                    <span>Base Amount</span>
                    <span>₹{selectedFee.amount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: selectedFee.lateFine > 0 ? '#ef4444' : '#374151' }}>
                    <span>Late Fine</span>
                    <span>₹{selectedFee.lateFine}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px dashed #9ca3af', margin: '0.5rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', color: '#111827' }}>
                    <span>Total Payable</span>
                    <span>₹{selectedFee.totalAmount}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-secondary" style={{ flex: 1, borderColor: '#d1d5db', color: '#374151', background: '#fff' }} onClick={() => setIsCheckoutOpen(false)}>Cancel</button>
                  <button className="btn-primary" style={{ flex: 2, background: '#10b981', boxShadow: 'none' }} onClick={initiatePayment}>Proceed to Pay</button>
                </div>
              </>
            )}

            {checkoutStep === 2 && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem 0', color: '#000' }}>Scan QR or Enter UPI</h3>
                  <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>Paying <strong>₹{selectedFee.totalAmount}</strong> to Sudhir Tutorials</p>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '10px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px' }}>
                     {/* Fake QR code using a generic placeholder */}
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=sudhirtutorials@okicici&pn=Sudhir%20Tutorials&am=${selectedFee.totalAmount}`} alt="QR Code" style={{ width: '150px', height: '150px' }} />
                  </div>
                </div>

                <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>OR</div>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ color: '#374151' }}>Enter your UPI ID</label>
                  <input type="text" placeholder="e.g. 9876543210@ybl" value={upiId} onChange={e => setUpiId(e.target.value)} style={{ background: '#f9fafb', color: '#000', border: '1px solid #d1d5db' }} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-secondary" style={{ flex: 1, borderColor: '#d1d5db', color: '#374151', background: '#fff' }} onClick={() => setCheckoutStep(1)}>Back</button>
                  <button className="btn-primary" style={{ flex: 2, background: '#10b981', boxShadow: 'none' }} onClick={initiatePayment}>Verify & Pay</button>
                </div>
              </>
            )}

            {checkoutStep === 3 && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
                <h3 style={{ fontSize: '1.3rem', color: '#000' }}>Processing Payment...</h3>
                <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>Please do not close this window or press back.</p>
                <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '1rem' }}>Waiting for confirmation from your bank...</p>
              </div>
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
                  <div style={{ fontWeight: 600 }}>{receiptData.paidAt ? new Date(receiptData.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>
                  <span>Late Fee Applied</span>
                  <span>₹0.00</span>
                </div>
                <div style={{ height: '1px', background: '#e5e7eb', margin: '1rem 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.4rem', color: '#111' }}>
                  <span>Grand Total</span>
                  <span>₹{receiptData.amount.toFixed(2)}</span>
                </div>
              </div>

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
    </div>
  );
}
