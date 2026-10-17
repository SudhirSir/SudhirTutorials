"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

interface StudentPurchasesProps {
  onBrowseStore?: () => void;
}

export function StudentPurchases({ onBrowseStore }: StudentPurchasesProps = {}) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await fetch('/api/student/purchases');
        if (res.ok) {
          const data = await res.json();
          setPurchases(data.purchases || []);
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
        <p className="input-label" style={{ marginBottom: '1.5rem' }}>Browse our premium Test Series and Notes from the storefront.</p>
        <Button variant="primary" onClick={() => {
          if (onBrowseStore) {
            onBrowseStore();
          } else {
            router.push('?tab=store');
          }
        }}>Browse Store</Button>
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
              <div style={{ fontSize: '2rem' }}>{item.type === 'NOTES' ? '📄' : item.type === 'MOCK_TEST' ? '🎯' : '📝'}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>{item.title}</h3>
                  {purchase.status === 'PENDING' ? (
                    <Badge variant="warning">⏳ Pending Approval</Badge>
                  ) : (
                    <Badge variant="success">Access Unlocked</Badge>
                  )}
                </div>
                <div className="input-label" style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  {purchase.status === 'PENDING' ? 'Ref submitted on: ' : 'Purchased on: '}
                  {new Date(purchase.createdAt).toLocaleDateString()} {purchase.paymentId ? `• Ref: ${purchase.paymentId}` : ''}
                </div>
              </div>
            </div>

            <p className="input-label" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1, color: 'var(--text)' }}>
              {item.description}
            </p>

            <div style={{ marginTop: 'auto' }}>
              {purchase.status === 'PENDING' ? (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  background: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  textAlign: 'center',
                  color: '#eab308',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>
                  ⏳ Payment verification in progress. Access will be unlocked once approved by Admin.
                </div>
              ) : item.type === 'MOCK_TEST' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {purchase.bestMockSubmission && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '0.5rem 0.85rem', borderRadius: '10px' }}>
                      <span className="input-label" style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 700 }}>Best Score:</span>
                      <Badge variant="success">
                        {purchase.bestMockSubmission.score} / {purchase.bestMockSubmission.totalMarks}
                      </Badge>
                    </div>
                  )}
                  <Button 
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => router.push(`/dashboard/student/mock-test/${item.id.replace(/^mocktest-/, '')}`)}
                  >
                    {purchase.bestMockSubmission ? '🔄 Retake Chapter Mock Test' : '📝 Start Chapter Mock Test'}
                  </Button>
                </div>
              ) : item.type === 'NOTES' ? (
                item.fileUrl ? (
                  <a 
                    href={item.fileUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn-ui btn-primary btn-full"
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
                  >
                    📄 Open / Download Notes PDF ↗
                  </a>
                ) : (
                  <Button variant="secondary" size="md" fullWidth disabled>
                    📄 PDF File Available Soon
                  </Button>
                )
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
