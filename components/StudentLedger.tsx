"use client";

import { useState, useEffect } from 'react';

interface StudentLedgerProps {
  studentId?: string; // Optional: if provided, fetches as admin. If omitted, fetches own student ledger.
  refreshTrigger?: number; // Optional: trigger to force-refresh from parent components
  onPayOnline?: (fee: any) => void; // Callback for online payments (for student portal integration)
  onViewReceipt?: (feeId: string) => void; // Callback for viewing receipts
}

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function StudentLedger({ studentId, refreshTrigger, onPayOnline, onViewReceipt }: StudentLedgerProps) {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchLedger();
  }, [studentId, refreshTrigger]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const url = studentId 
        ? `/api/admin/finances?studentId=${studentId}` 
        : `/api/student/fees`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFees(data.fees || []);
      }
    } catch (e) {
      console.error("Error fetching ledger:", e);
    } finally {
      setLoading(false);
    }
  };

  const getParsedFeeDetails = (fee: any) => {
    let year = new Date().getFullYear();
    if (fee.dueDate) {
      const parsedDate = new Date(fee.dueDate);
      if (!isNaN(parsedDate.getTime())) {
        year = parsedDate.getFullYear();
      }
    }
    let monthName = "";

    if (fee.billingMonth) {
      const parts = fee.billingMonth.split(' ');
      if (parts.length === 2) {
        monthName = parts[0];
        const parsedYear = parseInt(parts[1]);
        if (!isNaN(parsedYear)) year = parsedYear;
      }
    }

    if (!monthName && fee.dueDate) {
      monthName = MONTHS_LIST[new Date(fee.dueDate).getMonth()];
    }

    return { year, monthName };
  };

  // Get unique years in ledger
  const years = Array.from(new Set(fees.map(f => getParsedFeeDetails(f).year)))
    .sort((a, b) => b - a);

  if (years.length === 0) {
    years.push(new Date().getFullYear());
  }

  // Filter fees for selected year
  const yearFees = fees.filter(f => getParsedFeeDetails(f).year === selectedYear);

  // Map 12 months for month-wise view
  const monthlyLedger = MONTHS_LIST.map(month => {
    const record = yearFees.find(f => getParsedFeeDetails(f).monthName.toLowerCase() === month.toLowerCase());
    return {
      month,
      record
    };
  });

  // Calculate year-wise summary totals
  const allYearsSummary = Array.from(new Set(fees.map(f => getParsedFeeDetails(f).year)))
    .sort((a, b) => b - a)
    .map(yr => {
      const yrFees = fees.filter(f => getParsedFeeDetails(f).year === yr);
      const totalBilled = yrFees.reduce((acc, f) => acc + f.amount, 0);
      const totalFines = yrFees.reduce((acc, f) => acc + (f.lateFine || f.currentLateFine || 0), 0);
      const totalDiscounts = yrFees.reduce((acc, f) => acc + (f.discount || 0), 0);
      const totalPaid = yrFees.reduce((acc, f) => acc + (f.paidAmount || (f.status !== 'PENDING' ? f.amount + (f.lateFine || 0) - f.discount : 0)), 0);
      const totalOutstanding = yrFees.filter(f => f.status === 'PENDING').reduce((acc, f) => acc + (f.amount + (f.currentLateFine || f.lateFine || 0) - f.discount), 0);
      
      return {
        year: yr,
        totalBilled,
        totalFines,
        totalDiscounts,
        totalPaid,
        totalOutstanding,
        recordsCount: yrFees.length
      };
    });

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '2.5rem', marginTop: '1.5rem', border: '1px solid var(--border)', minHeight: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem', width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.5px' }}>Loading Financial Ledger...</div>
        </div>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '2rem', marginTop: '1.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
            💳 Financial Fee Ledger
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Complete historical transactions and billing overview</p>
        </div>

        {/* View Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Year Dropdown */}
          {viewType === 'month' && (
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              style={{ padding: '0.5rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}
            >
              {years.map(y => <option key={y} value={y}>{y} Academic Year</option>)}
            </select>
          )}

          {/* Toggle Type */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', display: 'flex', border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setViewType('month')}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                background: viewType === 'month' ? 'var(--primary)' : 'transparent',
                color: viewType === 'month' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              📅 12 Months
            </button>
            <button 
              onClick={() => setViewType('year')}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                background: viewType === 'year' ? 'var(--primary)' : 'transparent',
                color: viewType === 'year' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              📊 Year-wise summary
            </button>
          </div>
        </div>
      </div>

      {/* 12-MONTH GRID VIEW */}
      {viewType === 'month' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {monthlyLedger.map(({ month, record }) => {
            const hasRecord = !!record;
            const status = record?.status || 'NO RECORD';
            const isOverdue = status === 'PENDING' && (record?.lateFine > 0 || record?.currentLateFine > 0);
            
            // Premium status badge styling
            let statusBg = 'rgba(255,255,255,0.02)';
            let statusColor = 'var(--text-muted)';
            let statusText = 'Not Assigned';
            let leftBorderColor = 'rgba(255,255,255,0.05)';

            if (status === 'PAID' || status === 'VERIFIED' || status === 'PAID_ONLINE') {
              statusBg = 'rgba(16, 185, 129, 0.1)';
              statusColor = '#10b981';
              statusText = status === 'VERIFIED' ? 'Verified ✓' : 'Paid';
              leftBorderColor = '#10b981';
            } else if (isOverdue) {
              statusBg = 'rgba(239, 68, 68, 0.1)';
              statusColor = '#ef4444';
              statusText = 'Overdue';
              leftBorderColor = '#ef4444';
            } else if (status === 'PENDING') {
              statusBg = 'rgba(245, 158, 11, 0.1)';
              statusColor = '#f59e0b';
              statusText = 'Pending';
              leftBorderColor = '#f59e0b';
            }

            return (
              <div 
                key={month} 
                className="ledger-month-card"
                style={{ 
                  padding: '1.5rem', 
                  borderRadius: '16px', 
                  background: hasRecord ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.002)', 
                  border: `1px solid var(--border)`,
                  borderLeft: `4px solid ${leftBorderColor}`,
                  opacity: hasRecord ? 1 : 0.6,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '210px',
                  transition: 'all 0.2s',
                  boxShadow: hasRecord ? '0 4px 15px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text)' }}>{month}</span>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                      background: statusBg, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>
                      {statusText}
                    </span>
                  </div>

                  {hasRecord ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span>Base Fee:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>₹{record.amount}</span>
                      </div>
                      {record.discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                          <span>Discount:</span>
                          <span>-₹{record.discount}</span>
                        </div>
                      )}
                      {(record.lateFine > 0 || record.currentLateFine > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
                          <span>Late Fine:</span>
                          <span>+₹{record.lateFine || record.currentLateFine}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      No bills generated.
                    </div>
                  )}
                </div>

                {hasRecord && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Amount:</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
                          ₹{Math.max(0, record.amount + (record.lateFine || record.currentLateFine || 0) - record.discount)}
                        </span>
                      </div>
                      
                      {/* Action buttons inside monthly card */}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {status === 'PENDING' && onPayOnline && (
                          <button 
                            onClick={() => onPayOnline(record)}
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            Pay
                          </button>
                        )}
                        {['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(status) && onViewReceipt && (
                          <button 
                            onClick={() => onViewReceipt(record.id)}
                            className="btn-secondary" 
                            style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            🧾 Receipt
                          </button>
                        )}
                      </div>
                    </div>
                    {record.paidAt && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                        Paid on {new Date(record.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                    {record.remarks && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.remarks}>
                        * {record.remarks}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* YEAR-WISE BREAKDOWN TABLE VIEW */}
      {viewType === 'year' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem 0.5rem' }}>Academic Year</th>
                <th>Invoiced Base</th>
                <th>Total Discounts</th>
                <th>Collected Fines</th>
                <th>Total Paid Amount</th>
                <th>Outstanding Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allYearsSummary.map(yr => (
                <tr key={yr.year} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.95rem' }}>
                  <td style={{ padding: '1.25rem 0.5rem', fontWeight: 800, color: 'var(--text)' }}>{yr.year}</td>
                  <td style={{ color: 'var(--text)' }}>₹{yr.totalBilled}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>-₹{yr.totalDiscounts}</td>
                  <td style={{ color: yr.totalFines > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>+₹{yr.totalFines}</td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>₹{yr.totalPaid}</td>
                  <td style={{ color: yr.totalOutstanding > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: yr.totalOutstanding > 0 ? 800 : 400 }}>
                    {yr.totalOutstanding > 0 ? `₹${yr.totalOutstanding}` : 'Settled ✓'}
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                      background: yr.totalOutstanding === 0 && yr.recordsCount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                      color: yr.totalOutstanding === 0 && yr.recordsCount > 0 ? '#10b981' : 'var(--text-muted)',
                      textTransform: 'uppercase'
                    }}>
                      {yr.recordsCount === 0 ? 'No Data' : yr.totalOutstanding === 0 ? 'COMPLETELY PAID' : 'PENDING DUES'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .ledger-month-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.05);
        }
      `}</style>
    </div>
  );
}
