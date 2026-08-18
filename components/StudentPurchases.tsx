"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '0.75rem' }}>
        <Spinner size="lg" />
        <span className="input-label">Loading your purchases...</span>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card variant="glass" style={{ padding: '3rem', textAlign: 'center', marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-heading)' }}>No Purchases Yet</h3>
        <p className="input-label" style={{ marginBottom: '1.5rem' }}>Browse our premium Test Series and Notes from the homepage storefront.</p>
        <Button variant="primary" onClick={() => router.push('/#store')}>Browse Store</Button>
      </Card>
    );
  }

  return (
    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
      {purchases.map(purchase => {
        const item = purchase.item;
        return (
          <Card key={purchase.id} variant="glass" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem' }}>{item.type === 'NOTES' ? '📄' : '📝'}</div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>{item.title}</h3>
                <div className="input-label" style={{ fontSize: '0.85rem' }}>Purchased on: {new Date(purchase.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <p className="input-label" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1, color: 'var(--text)' }}>
              {item.description}
            </p>

            <div style={{ marginTop: 'auto' }}>
              {item.type === 'NOTES' ? (
                <a 
                  href={item.fileUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-ui btn-primary btn-full"
                >
                  Download Notes
                </a>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {item.fileUrl && (
                    <a 
                      href={item.fileUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn-ui btn-primary btn-full"
                      style={{ textDecoration: 'none', textAlign: 'center', marginBottom: '0.25rem' }}
                    >
                      📄 Open / Download PDF Paper
                    </a>
                  )}
                  {item.onlineTests?.map((test: any) => (
                    <div key={test.id} className="card-ui" style={{ padding: '0.75rem', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                        {test.title}
                      </div>
                      
                      {test.submissions?.[0] && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="input-label" style={{ fontSize: '0.8rem' }}>Best Score:</span>
                          <Badge variant="success">
                            {test.submissions[0].score} / {test.totalMarks}
                          </Badge>
                        </div>
                      )}
                      
                      <Button 
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => router.push(`/dashboard/student/test/${test.id}`)}
                      >
                        {test.submissions?.[0] ? 'Retake Test' : 'Take Test'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
