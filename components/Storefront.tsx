"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function Storefront() {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [purchasedItemIds, setPurchasedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load Razorpay Script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

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

    try {
      // 1. Create order
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Failed to initiate checkout.');
        return;
      }

      // 2. Open Razorpay Window
      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'Sudhir Tutorials',
        description: `Purchase: ${item.title}`,
        order_id: data.order.id,
        handler: async function (response: any) {
          // 3. Verify Payment
          try {
            const verifyRes = await fetch('/api/store/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                purchaseId: data.purchaseId
              })
            });

            if (verifyRes.ok) {
              alert('Payment Successful! You can access this in your Student Dashboard.');
              // Optionally redirect to student dashboard
              window.location.href = '/dashboard/student';
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (e) {
            console.error(e);
            alert('Payment verification error.');
          }
        },
        prefill: {
          name: session.user?.name || '',
          email: session.user?.email || '',
        },
        theme: {
          color: '#3b82f6' // var(--secondary)
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error(response.error);
        alert(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      alert('Checkout process failed. Please try again later.');
    }
  };

  if (loading) return null; // Or a skeleton loader

  return (
    <section id="storefront" className="storefront-section" style={{ padding: '6rem 6%', position: 'relative', zIndex: 2, background: 'var(--background)' }}>
      <div className="section-header" style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2 className="section-title" style={{ fontSize: '2.6rem', fontWeight: 900, marginBottom: '1rem' }}>Notes/Test Series</h2>
        <p className="section-subtitle" style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', marginBottom: '1.5rem' }}>
          Access our expertly crafted Test Series and Notes. Prepare thoroughly for your board exams and competitive tests.
        </p>
        {/* No global login/register buttons in header - options appear only upon clicking Buy Now */}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {items.length === 0 ? (
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
                    <button onClick={() => window.location.href = `/dashboard/student?tab=store`} className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800 }}>
                      View Tests
                    </button>
                  ) : item.type === 'NOTES' && item.fileUrl ? (
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800, textDecoration: 'none' }}>
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
    </section>
  );
}
