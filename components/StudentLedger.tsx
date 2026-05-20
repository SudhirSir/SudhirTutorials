"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';

interface StudentLedgerProps {
  studentId?: string;
  refreshTrigger?: number;
  onPayOnline?: (fee: any) => void;
  onViewReceipt?: (feeId: string) => void;
}

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function StudentLedger({ studentId, refreshTrigger, onPayOnline, onViewReceipt }: StudentLedgerProps) {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'month' | 'year' | 'statement' | 'latest-payments'>('month');
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

  // O(1) year extraction via date parsing – memoized per fee id
  const getParsedFeeDetails = useCallback((fee: any) => {
    let year = new Date().getFullYear();
    if (fee.dueDate) {
      const parsedDate = new Date(fee.dueDate);
      if (!isNaN(parsedDate.getTime())) year = parsedDate.getFullYear();
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
  }, []);

  // Bank-style statement: base fee DEBIT, discount as CREDIT, late fine as DEBIT, payment as CREDIT
  const getStatementPostings = useMemo(() => {
    const postings: any[] = [];

    fees.forEach(fee => {
      // 1. Full base fee as DEBIT (never reduced by discount here)
      postings.push({
        date: new Date(fee.dueDate || fee.createdAt),
        description: `Tuition Fee – ${fee.billingMonth} (${fee.title})`,
        reference: fee.receiptNo || `BILL-${fee.id.slice(-6).toUpperCase()}`,
        type: 'DEBIT',
        debit: fee.amount,
        credit: 0,
      });

      // 2. Discount as a separate CREDIT entry (proper accounting)
      if (fee.discount > 0) {
        postings.push({
          date: new Date(fee.dueDate || fee.createdAt),
          description: `Fee Discount / Concession – ${fee.billingMonth}`,
          reference: `DISC-${fee.id.slice(-6).toUpperCase()}`,
          type: 'CREDIT',
          debit: 0,
          credit: fee.discount,
        });
      }

      // 3. Late fine as DEBIT – always use the max of stored lateFine or real-time currentLateFine
      const fineVal = Math.max(fee.lateFine || 0, fee.currentLateFine || 0);
      if (fineVal > 0) {
        postings.push({
          date: new Date(fee.dueDate || fee.createdAt),
          description: `Late Payment Fine – ${fee.billingMonth}`,
          reference: `FINE-${fee.receiptNo ? fee.receiptNo.split('/').pop() : fee.id.slice(-4).toUpperCase()}`,
          type: 'FINE',
          debit: fineVal,
          credit: 0,
        });
      }

      // 4. Payment received as CREDIT
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(fee.status)) {
        postings.push({
          date: new Date(fee.paidAt || fee.createdAt),
          description: `Payment Received – ${fee.paymentMethod || 'Online'}`,
          reference: fee.transactionId ? `TXN-${fee.transactionId.slice(-8).toUpperCase()}` : `RCPT-${fee.receiptNo}`,
          type: 'CREDIT',
          debit: 0,
          credit: fee.paidAmount || (fee.amount + fineVal - fee.discount),
        });
      }
    });

    // Sort chronologically; credits after debits on same day
    postings.sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      if (diff !== 0) return diff;
      if (a.type === 'CREDIT' && b.type !== 'CREDIT') return 1;
      if (a.type !== 'CREDIT' && b.type === 'CREDIT') return -1;
      return 0;
    });

    // Running balance (credit = positive, debit = negative)
    let balance = 0;
    return postings.map(p => {
      if (p.type === 'DEBIT' || p.type === 'FINE') {
        balance -= p.debit;
      } else {
        balance += p.credit;
      }
      return { ...p, balance };
    });
  }, [fees]);

  const handlePrintStatement = () => {
    const postings = getStatementPostings;
    const totalDebit = postings.reduce((s, p) => s + p.debit, 0);
    const totalCredit = postings.reduce((s, p) => s + p.credit, 0);
    const finalBalance = postings.length > 0 ? postings[postings.length - 1].balance : 0;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Sudhir Tutorials – Student Fee Statement</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a2e; }
            .header { border-bottom: 2px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; font-size: 24px; color: #ef4444; }
            .header p { margin: 5px 0 0; font-size: 14px; color: #666; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .meta-card { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .meta-card h3 { margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-card p { margin: 0; font-size: 16px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f3f4f6; color: #374151; font-weight: bold; border-bottom: 2px solid #d1d5db; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            .debit { color: #dc2626; }
            .credit { color: #1d4ed8; }
            .balance { font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px dashed #d1d5db; padding-top: 20px; }
            .sign-row { display: flex; justify-content: space-between; margin-top: 50px; }
            .sign-box { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 8px; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>SUDHIR TUTORIALS</h1>
              <p>Official Student Fee Statement</p>
            </div>
            <div style="text-align: right;">
              <p style="font-weight: bold; color: #ef4444; margin: 0 0 5px 0;">OFFICIAL STUDENT FEE STATEMENT</p>
              <p style="margin: 0;">Generated: ${new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          <div class="meta-grid">
            <div class="meta-card">
              <h3>Student Profile</h3>
              <p style="font-size: 18px; margin-bottom: 8px; color: #1a1a2e; font-weight: bold;">${fees[0]?.student?.name || 'Academic Student'}</p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 12px; color: #4b5563;">
                <div><strong>Student ID:</strong> ${fees[0]?.student?.username || 'N/A'}</div>
                <div><strong>Roll Number:</strong> ${fees[0]?.student?.studentProfile?.rollNumber || 'N/A'}</div>
                <div><strong>Class / Grade:</strong> ${fees[0]?.student?.studentProfile?.className || 'N/A'}</div>
                <div><strong>Batch:</strong> ${fees[0]?.student?.studentProfile?.batch || 'N/A'}</div>
                <div><strong>Father's Name:</strong> ${fees[0]?.student?.studentProfile?.fatherName || 'N/A'}</div>
                <div><strong>Contact:</strong> ${fees[0]?.student?.studentProfile?.phone || 'N/A'}</div>
              </div>
            </div>
            <div class="meta-card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <h3>Total Charged (Dr)</h3>
                <p class="debit">₹${totalDebit.toFixed(2)}</p>
              </div>
              <div>
                <h3>Total Settled (Cr)</h3>
                <p class="credit">₹${totalCredit.toFixed(2)}</p>
              </div>
              <div style="grid-column: span 2; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                <h3>Outstanding Balance</h3>
                <p style="color: ${finalBalance >= 0 ? '#1d4ed8' : '#dc2626'}">
                  ${finalBalance >= 0 ? 'Settled' : '₹' + Math.abs(finalBalance).toFixed(2) + ' Due'}
                </p>
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Ref No.</th>
                <th style="text-align:right">Debit (Dr)</th>
                <th style="text-align:right">Credit (Cr)</th>
                <th style="text-align:right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${postings.map(p => `
                <tr>
                  <td>${new Date(p.date).toLocaleDateString('en-GB')}</td>
                  <td>${p.description}</td>
                  <td style="font-family:monospace">${p.reference}</td>
                  <td class="debit" style="text-align:right">${p.debit > 0 ? '₹' + p.debit.toFixed(2) : '-'}</td>
                  <td class="credit" style="text-align:right">${p.credit > 0 ? '₹' + p.credit.toFixed(2) : '-'}</td>
                  <td class="balance" style="text-align:right;color:${p.balance >= 0 ? '#1d4ed8' : '#dc2626'}">
                    ${p.balance >= 0 ? '₹' + p.balance.toFixed(2) + ' Cr' : '₹' + Math.abs(p.balance).toFixed(2) + ' Dr'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="sign-row">
            <div class="sign-box" style="border:none;text-align:left;color:#6b7280;font-style:italic;">
              * Computer generated statement.<br/>No signature required.
            </div>
            <div class="sign-box">Authorized Signatory</div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Sudhir Tutorials. All rights reserved. Confidential Academic Record.
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Memoized derived data – only recalculates when fees changes
  const years = useMemo(() =>
    Array.from(new Set(fees.map(f => getParsedFeeDetails(f).year))).sort((a, b) => b - a),
    [fees, getParsedFeeDetails]
  );

  const yearFees = useMemo(() =>
    fees.filter(f => getParsedFeeDetails(f).year === selectedYear),
    [fees, selectedYear, getParsedFeeDetails]
  );

  const monthlyLedger = useMemo(() =>
    MONTHS_LIST.map(month => ({
      month,
      record: yearFees.find(f => getParsedFeeDetails(f).monthName.toLowerCase() === month.toLowerCase()),
    })),
    [yearFees, getParsedFeeDetails]
  );

  const allYearsSummary = useMemo(() =>
    Array.from(new Set(fees.map(f => getParsedFeeDetails(f).year)))
      .sort((a, b) => b - a)
      .map(yr => {
        const yrFees = fees.filter(f => getParsedFeeDetails(f).year === yr);
        const totalBilled = yrFees.reduce((acc, f) => acc + f.amount, 0);
        const totalFines = yrFees.reduce((acc, f) => acc + Math.max(f.lateFine || 0, f.currentLateFine || 0), 0);
        const totalDiscounts = yrFees.reduce((acc, f) => acc + (f.discount || 0), 0);
        const totalPaid = yrFees.reduce((acc, f) => acc + (f.paidAmount || 0), 0);
        const totalOutstanding = yrFees.filter(f => f.status === 'PENDING')
          .reduce((acc, f) => acc + (f.amount + Math.max(f.lateFine || 0, f.currentLateFine || 0) - (f.discount || 0)), 0);
        return { year: yr, totalBilled, totalFines, totalDiscounts, totalPaid, totalOutstanding, recordsCount: yrFees.length };
      }),
    [fees, getParsedFeeDetails]
  );

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
  });

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '2.5rem', marginTop: '1.5rem', border: '1px solid var(--border)', minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(239,68,68,0.2)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'ledger-spin 0.8s linear infinite' }} />
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Loading Financial Ledger...</div>
        <style>{`@keyframes ledger-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '2rem', marginTop: '1.5rem', border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>Financial Fee Ledger</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Complete historical transactions and billing overview</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {viewType === 'month' && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              style={{ padding: '0.5rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}
            >
              {years.map(y => <option key={y} value={y}>{y} Academic Year</option>)}
            </select>
          )}
          <div style={{ background: 'rgba(0,0,0,0.1)', padding: '4px', borderRadius: '12px', display: 'flex', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '4px' }}>
            <button type="button" onClick={() => setViewType('month')} style={TAB_STYLE(viewType === 'month')}>Monthly Fee Details</button>
            <button type="button" onClick={() => setViewType('statement')} style={TAB_STYLE(viewType === 'statement')}>Fee Statement</button>
            <button type="button" onClick={() => setViewType('latest-payments')} style={TAB_STYLE(viewType === 'latest-payments')}>Recent Payments</button>
          </div>
        </div>
      </div>

      {/* 12-MONTH GRID */}
      {viewType === 'month' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {monthlyLedger.map(({ month, record }) => {
            const hasRecord = !!record;
            const status = record?.status || 'NO_RECORD';
            const isOverdue = status === 'PENDING' && (record?.lateFine > 0 || record?.currentLateFine > 0);
            const isPaid = ['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(status);

            let borderColor = 'rgba(255,255,255,0.06)';
            let statusBg = 'rgba(255,255,255,0.03)';
            let statusColor = 'var(--text-muted)';
            let statusText = 'Not Assigned';

            if (isPaid) {
              borderColor = 'var(--secondary)'; statusBg = 'rgba(59,130,246,0.08)';
              statusColor = 'var(--secondary)'; statusText = status === 'VERIFIED' ? 'Verified' : 'Paid';
            } else if (isOverdue) {
              borderColor = 'var(--primary)'; statusBg = 'rgba(239,68,68,0.08)';
              statusColor = 'var(--primary)'; statusText = 'Overdue';
            } else if (status === 'PENDING') {
              borderColor = 'hsl(217,70%,65%)'; statusBg = 'rgba(59,130,246,0.05)';
              statusColor = 'hsl(217,70%,65%)'; statusText = 'Pending';
            }

            const fineVal = Math.max(record?.lateFine || 0, record?.currentLateFine || 0);

            return (
              <div
                key={month}
                className="ledger-month-card"
                style={{
                  padding: '1.25rem', borderRadius: '14px',
                  background: hasRecord ? 'var(--surface-light)' : 'var(--surface)',
                  border: `1px solid var(--border)`, borderLeft: `4px solid ${borderColor}`,
                  opacity: hasRecord ? 1 : 0.55,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: '190px', transition: 'all 0.25s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>{month}</span>
                    <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: statusBg, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{statusText}</span>
                  </div>
                  {hasRecord ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                        <span>Base Fee</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>₹{record.amount}</span>
                      </div>
                      {record.discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary)', fontWeight: 600 }}>
                          <span>Discount (Cr)</span>
                          <span>-₹{record.discount}</span>
                        </div>
                      )}
                      {fineVal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontWeight: 600 }}>
                          <span>Late Fine (Dr)</span>
                          <span>+₹{fineVal}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No bill generated.</div>
                  )}
                </div>

                {hasRecord && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', marginTop: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Net Amount</span>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                          ₹{Math.max(0, record.amount + fineVal - (record.discount || 0))}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {status === 'PENDING' && onPayOnline && (
                          <button type="button" onClick={() => onPayOnline(record)}
                            className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            Pay
                          </button>
                        )}
                        {isPaid && onViewReceipt && (
                          <button type="button" onClick={() => onViewReceipt(record.id)}
                            style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.1)', color: 'var(--secondary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s' }}>
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>
                    {record.paidAt && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
                        Paid {new Date(record.paidAt).toLocaleDateString('en-GB')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BANK STATEMENT VIEW */}
      {viewType === 'statement' && (() => {
        const postings = getStatementPostings;
        const totalDebit = postings.reduce((s, p) => s + p.debit, 0);
        const totalCredit = postings.reduce((s, p) => s + p.credit, 0);
        const finalBalance = postings.length > 0 ? postings[postings.length - 1].balance : 0;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {fees[0]?.student && (
              <div style={{ padding: '1.25rem', background: 'var(--surface-light)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.875rem' }}>Student Account Profile</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem 1.5rem', fontSize: '0.85rem' }}>
                  {[
                    ['Name', fees[0].student.name],
                    ['Student ID', `${fees[0].student.username}`],
                    ['Roll Number', fees[0].student.studentProfile?.rollNumber],
                    ['Class', fees[0].student.studentProfile?.className],
                    ['Batch', fees[0].student.studentProfile?.batch],
                    ['Father', fees[0].student.studentProfile?.fatherName],
                    ['Phone', fees[0].student.studentProfile?.phone],
                    ['Email', fees[0].student.studentProfile?.email],
                  ].map(([label, val]) => val && (
                    <div key={label}><strong style={{ color: 'var(--text-muted)' }}>{label}:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{val}</span></div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Total Charged', value: `₹${totalDebit.toFixed(2)}`, color: 'var(--primary)' },
                { label: 'Total Settled', value: `₹${totalCredit.toFixed(2)}`, color: 'var(--secondary)' },
                { label: 'Net Balance', value: finalBalance >= 0 ? 'Settled' : `-₹${Math.abs(finalBalance).toFixed(2)}`, color: finalBalance >= 0 ? 'var(--secondary)' : 'var(--primary)' },
              ].map(s => (
                <div key={s.label} style={{ padding: '1.1rem 1.5rem', background: 'var(--surface-light)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, marginTop: '0.4rem', display: 'block' }}>{s.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>All chronological credit/debit postings</span>
              <button type="button" onClick={handlePrintStatement}
                className="btn-secondary"
                style={{ padding: '8px 18px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem' }}>
                Print / Save PDF
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-light)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800 }}>
                    <th style={{ padding: '1.1rem 1.5rem' }}>Date</th>
                    <th>Ref No.</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Debit (Dr)</th>
                    <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {postings.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                      <td style={{ padding: '1.1rem 1.5rem', color: 'var(--text)' }}>{new Date(p.date).toLocaleDateString('en-GB')}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)' }}>{p.reference}</td>
                      <td style={{ color: 'var(--text)', fontWeight: 600 }}>{p.description}</td>
                      <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 700 }}>{p.debit > 0 ? `₹${p.debit.toFixed(2)}` : '–'}</td>
                      <td style={{ textAlign: 'right', color: 'var(--secondary)', fontWeight: 700 }}>{p.credit > 0 ? `₹${p.credit.toFixed(2)}` : '–'}</td>
                      <td style={{ textAlign: 'right', paddingRight: '1.5rem', fontWeight: 800, color: p.balance >= 0 ? 'var(--secondary)' : 'var(--primary)' }}>
                        {p.balance >= 0 ? `₹${p.balance.toFixed(2)} Cr` : `₹${Math.abs(p.balance).toFixed(2)} Dr`}
                      </td>
                    </tr>
                  ))}
                  {postings.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No transactions recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* LATEST PAYMENTS */}
      {viewType === 'latest-payments' && (() => {
        const paidPayments = fees
          .filter(f => ['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status))
          .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())
          .slice(0, 10);
        return (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-light)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '680px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800 }}>
                  <th style={{ padding: '1.1rem 1.5rem' }}>Date</th>
                  <th>Receipt No.</th>
                  <th>Fee Details</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Method</th>
                  <th style={{ textAlign: 'center', paddingRight: '1.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paidPayments.map((p, idx) => (
                  <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '1.1rem 1.5rem', color: 'var(--text)', fontWeight: 600 }}>
                      {new Date(p.paidAt || p.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 700 }}>
                      {p.receiptNo || `REC-${p.id.slice(-6).toUpperCase()}`}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.title || 'Monthly Fee'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.billingMonth}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--secondary)' }}>
                      ₹{(p.paidAmount || p.amount).toFixed(2)}
                    </td>
                    <td>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(59,130,246,0.1)', color: 'var(--secondary)' }}>
                        {p.paymentMethod || 'ONLINE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', paddingRight: '1.5rem' }}>
                      {onViewReceipt ? (
                        <button type="button" onClick={() => onViewReceipt(p.id)}
                          style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.1)', color: 'var(--secondary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.2s' }}>
                          View Receipt
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
                {paidPayments.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No payments recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}



      <style>{`
        .ledger-month-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(239,68,68,0.08);
        }
      `}</style>
    </div>
  );
}
