"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function Storefront() {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [purchasedItemIds, setPurchasedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulated Razorpay secure gateway state
  const [activePaymentItem, setActivePaymentItem] = useState<any>(null);
  const [paymentTxId, setPaymentTxId] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    // Fetch items
    const fetchItems = async () => {
      try {
        const res = await fetch('/api/store');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items);
          if (data.purchasedItemIds) {
            setPurchasedItemIds(data.purchasedItemIds);
          }
        }
      } catch (e) {
        console.error('Failed to fetch store items:', e);
      }
      setLoading(false);
    };

    fetchItems();
  }, []);

  const handleBuy = async (item: any) => {
    if (!session) {
      window.location.href = '/login?register=true';
      return;
    }
    setActivePaymentItem(item);
    setPaymentTxId('');
    setPaymentSuccess(false);
    setIsPaying(false);
  };

  const handleSimulatedPaymentSubmit = async () => {
    if (!activePaymentItem || !paymentTxId.trim()) return;
    setIsPaying(true);
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: activePaymentItem.id,
          transactionId: paymentTxId.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPaymentSuccess(true);
        // Add to purchased list immediately in local state
        setPurchasedItemIds(prev => [...prev, activePaymentItem.id]);
      } else {
        alert(data.error || 'Payment failed. Please check the transaction ID and try again.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error during payment verification.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <section id="storefront" className="storefront-section" style={{ padding: '6rem 6%', position: 'relative', zIndex: 2, background: 'var(--background)' }}>
      <div className="section-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2 className="section-title" style={{ fontSize: '2.6rem', fontWeight: 900, marginBottom: '1rem' }}>Notes/Test Series</h2>
        <p className="section-subtitle" style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', marginBottom: '1.5rem' }}>
          Access our expertly crafted Test Series and Notes. Prepare thoroughly for your board exams and competitive tests.
        </p>
        {!session && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Already registered or want to check your purchases?</span>
            <button 
              onClick={() => window.location.href = '/login?register=true'}
              className="btn-primary" 
              style={{
                padding: '0.6rem 1.75rem',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239,68,68,0.2)'
              }}
            >
              🔑 Login / Sign In to ST Store
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div>Loading storefront items...</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', borderRadius: '24px', border: '1px dashed var(--glass-border)', color: 'var(--text-muted)' }}>
            <h3>No Premium Materials Available Yet</h3>
            <p>Admin is currently preparing high-quality Notes and Test Series. Check back soon!</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="glass-card store-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem' }}>{item.type === 'NOTES' ? '📄' : '📝'}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{item.title}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.className} • {item.board}</div>
                </div>
              </div>
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', flex: 1 }}>
                {item.description || 'Premium material by Sudhir Tutorials.'}
              </p>
              
              {item.type === 'TEST_SERIES' && item.onlineTests && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                  <div>📚 {item.onlineTests.length} Tests Included</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>₹{item.price}</div>
                {purchasedItemIds.includes(item.id) ? (
                  item.type === 'TEST_SERIES' ? (
                    <button onClick={() => window.location.href = `/dashboard/student?tab=purchases`} className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800 }}>
                      View Tests
                    </button>
                  ) : item.type === 'NOTES' && item.fileUrl ? (
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', textAlign: 'center' }}>
                      Download Notes
                    </a>
                  ) : (
                    <button disabled className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800, opacity: 0.5 }}>
                      Purchased
                    </button>
                  )
                ) : (
                  <button onClick={() => handleBuy(item)} className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800 }}>
                    Buy Now
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 💳 SIMULATED RAZORPAY GATEWAY OVERLAY FOR STORE ITEMS */}
      {activePaymentItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="animate-scale-up" style={{ 
            width: '680px', maxWidth: '100%', 
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 'auto'
          }}>
            {/* Header: Razorpay Secured */}
            <div style={{ 
              background: 'var(--card-bg-alt)', padding: '1.25rem 2rem', 
              borderBottom: '1px solid var(--border)',
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
              
              {/* Left Side Panel: Merchant and Amount */}
              <div style={{ 
                background: 'var(--card-bg-alt)', padding: '2rem 1.5rem',
                borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Coaching Institute</div>
                  <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <span style={{ color: '#ef4444', fontWeight: 800 }}>SUDHIR</span> <span style={{ color: '#2563eb', fontWeight: 800 }}>TUTORIALS</span>
                  </h3>

                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Store Purchase</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 750, marginTop: '0.5rem' }}>
                      {activePaymentItem.title}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Price</span>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text)' }}>₹{activePaymentItem.price}</span>
                </div>
              </div>

              {/* Right Side Panel: Razorpay Direct Payment Gateway */}
              <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>Official Razorpay Gateway</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Please click the button below to complete your payment of <strong style={{ color: 'var(--text)' }}>₹{activePaymentItem.price}</strong> securely via Razorpay's official portal.
                  </p>

                  <a 
                    href="https://razorpay.me/@sudhiir" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.75rem',
                      background: '#3b82f6',
                      color: '#fff',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      marginTop: '1.5rem',
                      boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                      transition: 'transform 0.2s',
                      textAlign: 'center'
                    }}
                  >
                    💳 Pay via Razorpay Direct
                  </a>

                  <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Enter UPI / Payment Transaction ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. TXN9876543210"
                      value={paymentTxId} 
                      onChange={e => setPaymentTxId(e.target.value)} 
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: '0.9rem',
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paste the transaction reference ID from your banking app.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button 
                    onClick={() => {
                      setActivePaymentItem(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSimulatedPaymentSubmit}
                    disabled={!paymentTxId.trim() || isPaying}
                    style={{
                      flex: 2,
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#10b981',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: paymentTxId.trim() ? 'pointer' : 'not-allowed',
                      opacity: paymentTxId.trim() ? 1 : 0.5,
                      boxShadow: paymentTxId.trim() ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
                    }}
                  >
                    {isPaying ? 'Processing...' : 'Complete Payment'}
                  </button>
                </div>
              </div>

            </div>

            {/* Simulated Payment Success State */}
            {paymentSuccess && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', zIndex: 10 }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Payment Received Successfully!</h3>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', margin: '0 0 2rem 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Your Transaction ID <strong style={{ color: 'var(--text)' }}>{paymentTxId}</strong> has been saved. Your test series access and notes download are now activated.
                </p>
                <button 
                  onClick={() => {
                    setActivePaymentItem(null);
                    setPaymentSuccess(false);
                    // Redirect or switch view
                    window.location.href = '/dashboard/student?tab=purchases';
                  }}
                  style={{
                    padding: '0.75rem 2rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                  }}
                >
                  Go to My Purchases
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </section>
  );
}
