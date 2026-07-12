"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function StudentTakeTest() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPurchasedTests = async () => {
      try {
        const res = await fetch('/api/student/purchases');
        if (res.ok) {
          const data = await res.json();
          // Extract all tests from purchased test series items
          const allTests: any[] = [];
          data.purchases.forEach((purchase: any) => {
            const item = purchase.item;
            if (item.type === 'TEST_SERIES' && item.onlineTests) {
              item.onlineTests.forEach((test: any) => {
                allTests.push({
                  ...test,
                  seriesTitle: item.title,
                });
              });
            }
          });
          setTests(allTests);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchPurchasedTests();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div>Loading your purchased tests...</div>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>No Tests Available</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You haven't purchased any Test Series yet or there are no tests in your series.</p>
        <button className="btn-primary" onClick={() => router.push('/dashboard/student?tab=store')}>Go to Store</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>My Purchased Tests</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {tests.map(test => {
          const bestSubmission = test.submissions?.[0];
          return (
            <div 
              key={test.id} 
              className="glass-card" 
              style={{ 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                border: bestSubmission ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--glass-border)',
                background: bestSubmission ? 'rgba(16, 185, 129, 0.02)' : 'var(--glass-bg)',
                borderRadius: '24px',
                boxShadow: 'var(--shadow)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    {test.seriesTitle}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{test.title}</h3>
                </div>
                <div style={{ fontSize: '1.5rem' }}>📝</div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                <span style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '6px' }}>
                  ⏱ {test.durationMinutes} Mins
                </span>
                <span style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '6px' }}>
                  🎯 {test.totalMarks} Marks
                </span>
              </div>

              <div style={{ marginTop: 'auto' }}>
                {bestSubmission ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(16, 185, 129, 0.8)', fontWeight: 700 }}>COMPLETED</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>{bestSubmission.score} / {test.totalMarks} Marks</div>
                    </div>
                    <span style={{ fontSize: '1.5rem' }}>🎉</span>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(245, 158, 11, 0.8)', fontWeight: 700 }}>PENDING</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Not attempted yet</div>
                    </div>
                    <span style={{ fontSize: '1.5rem' }}>⏳</span>
                  </div>
                )}

                <button 
                  onClick={() => router.push(`/dashboard/student/test/${test.id}`)}
                  className="btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '0.8rem', 
                    borderRadius: '12px', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    background: bestSubmission ? 'rgba(255,255,255,0.08)' : 'var(--primary)',
                    color: bestSubmission ? 'var(--text)' : '#fff',
                    border: bestSubmission ? '1px solid var(--border)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {bestSubmission ? 'Retake Test' : 'Start Test Now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
