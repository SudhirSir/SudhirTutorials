"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function StudentPurchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await fetch('/api/student/purchases');
        if (res.ok) {
          const data = await res.json();
          setPurchases(data.purchases);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchPurchases();
  }, []);

  if (loading) return <div>Loading your purchases...</div>;

  if (purchases.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>No Purchases Yet</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Browse our premium Test Series and Notes from the homepage storefront.</p>
        <button className="btn-primary" onClick={() => router.push('/#store')}>Browse Store</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {purchases.map(purchase => {
        const item = purchase.item;
        return (
          <div key={purchase.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem' }}>{item.type === 'NOTES' ? '📄' : '📝'}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{item.title}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Purchased on: {new Date(purchase.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
              {item.description}
            </p>

            <div style={{ marginTop: 'auto' }}>
              {item.type === 'NOTES' ? (
                <a 
                  href={item.fileUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-primary" 
                  style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '0.75rem', borderRadius: '12px' }}
                >
                  Download Notes
                </a>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {item.onlineTests?.map((test: any, idx: number) => (
                    <div key={test.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                        {test.title}
                      </div>
                      
                      {test.submissions?.[0] && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Best Score:</span>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>
                            {test.submissions[0].score} / {test.totalMarks}
                          </span>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => router.push(`/dashboard/student/test/${test.id}`)}
                        className="btn-secondary" 
                        style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--secondary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        {test.submissions?.[0] ? 'Retake Test' : 'Take Test'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
