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

  // Generate bank-style transaction postings chronologically
  const getStatementPostings = () => {
    const postings: any[] = [];
    
    fees.forEach(fee => {
      // 1. Fee Assignment (Debit)
      const baseDebit = Math.max(0, fee.amount - fee.discount);
      postings.push({
        date: new Date(fee.dueDate || fee.createdAt),
        description: `Tuition Fee Assignment - ${fee.billingMonth} (${fee.title})`,
        reference: fee.receiptNo || `BILL-${fee.id.slice(-6).toUpperCase()}`,
        type: 'DEBIT',
        debit: baseDebit,
        credit: 0
      });
      
      // 2. Late Fine if applicable (Debit)
      const fineVal = fee.status === 'PENDING' ? (fee.currentLateFine || 0) : (fee.lateFine || 0);
      if (fineVal > 0) {
        postings.push({
          date: new Date(fee.dueDate || fee.createdAt),
          description: `Late Payment Fine Applied - ${fee.billingMonth}`,
          reference: `FINE-${fee.receiptNo ? fee.receiptNo.split('/').pop() : fee.id.slice(-4).toUpperCase()}`,
          type: 'FINE',
          debit: fineVal,
          credit: 0
        });
      }
      
      // 3. Payment Received (Credit)
      if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(fee.status)) {
        postings.push({
          date: new Date(fee.paidAt || fee.createdAt),
          description: `Fee Payment Received - ${fee.paymentMethod || 'Online'}`,
          reference: fee.transactionId ? `TXN-${fee.transactionId.slice(-8).toUpperCase()}` : `RCPT-${fee.receiptNo}`,
          type: 'CREDIT',
          debit: 0,
          credit: fee.paidAmount || (fee.amount + fineVal - fee.discount)
        });
      }
    });
    
    // Sort chronologically ascending
    postings.sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      if (diff !== 0) return diff;
      // Put credit at the end of the day
      if (a.type === 'CREDIT' && b.type !== 'CREDIT') return 1;
      if (a.type !== 'CREDIT' && b.type === 'CREDIT') return -1;
      return 0;
    });
    
    // Calculate running balance
    let balance = 0;
    const enrichedPostings = postings.map(p => {
      if (p.type === 'DEBIT' || p.type === 'FINE') {
        balance -= p.debit;
      } else if (p.type === 'CREDIT') {
        balance += p.credit;
      }
      return {
        ...p,
        balance
      };
    });
    
    return enrichedPostings;
  };

  const handlePrintStatement = () => {
    const postings = getStatementPostings();
    const totalDebit = postings.reduce((sum, p) => sum + p.debit, 0);
    const totalCredit = postings.reduce((sum, p) => sum + p.credit, 0);
    const finalBalance = postings.length > 0 ? postings[postings.length - 1].balance : 0;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Sudhir Tutorials - Student Fee Statement</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; font-size: 24px; color: #4f46e5; }
            .header p { margin: 5px 0 0; font-size: 14px; color: #666; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .meta-card { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .meta-card h3 { margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-card p { margin: 0; font-size: 16px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f3f4f6; color: #374151; font-weight: bold; border-bottom: 2px solid #d1d5db; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            .debit { color: #dc2626; }
            .credit { color: #16a34a; }
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
              <p style="font-weight: bold; color: #4f46e5; margin: 0 0 5px 0;">OFFICIAL STUDENT FEE STATEMENT</p>
              <p style="margin: 0;">Generated: ${new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-card">
              <h3>Account Holder & Profile</h3>
              <p style="font-size: 18px; margin-bottom: 8px; color: #1e1b4b; font-weight: bold;">${fees[0]?.student?.name || 'Academic Student'}</p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 12px; color: #4b5563;">
                <div><strong>Student ID:</strong> @${fees[0]?.student?.username || 'N/A'}</div>
                <div><strong>Roll Number:</strong> ${fees[0]?.student?.studentProfile?.rollNumber || 'N/A'}</div>
                <div><strong>Registration No:</strong> ${fees[0]?.student?.studentProfile?.registrationNo || 'N/A'}</div>
                <div><strong>Class / Grade:</strong> ${fees[0]?.student?.studentProfile?.className || fees[0]?.student?.studentProfile?.grade || 'N/A'}</div>
                <div><strong>Batch:</strong> ${fees[0]?.student?.studentProfile?.batch || 'N/A'}</div>
                <div><strong>Father's Name:</strong> ${fees[0]?.student?.studentProfile?.fatherName || 'N/A'}</div>
                <div><strong>Contact Phone:</strong> ${fees[0]?.student?.studentProfile?.phone || 'N/A'}</div>
                <div><strong>Email Address:</strong> ${fees[0]?.student?.studentProfile?.email || 'N/A'}</div>
              </div>
              <div style="font-size: 12px; color: #4b5563; margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px;">
                <strong>Address:</strong> ${fees[0]?.student?.studentProfile?.address || 'N/A'}
              </div>
            </div>
            <div class="meta-card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <h3>Total Debited (Charges)</h3>
                <p class="debit">₹${totalDebit.toFixed(2)}</p>
              </div>
              <div>
                <h3>Total Credited (Cleared)</h3>
                <p class="credit">₹${totalCredit.toFixed(2)}</p>
              </div>
              <div style="grid-column: span 2; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                <h3>Current Outstanding Balance</h3>
                <p style="color: ${finalBalance >= 0 ? '#16a34a' : '#dc2626'}">
                  ${finalBalance >= 0 ? 'Settled ✓' : '₹' + Math.abs(finalBalance).toFixed(2) + ' Dr'}
                </p>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Transaction Date</th>
                <th>Description / Narrative</th>
                <th>Cheque/Ref No.</th>
                <th style="text-align: right;">Withdrawal / Debit (Dr)</th>
                <th style="text-align: right;">Deposit / Credit (Cr)</th>
                <th style="text-align: right;">Balance (Dr/Cr)</th>
              </tr>
            </thead>
            <tbody>
              ${postings.map(p => `
                <tr>
                  <td>${new Date(p.date).toLocaleDateString('en-GB')}</td>
                  <td>${p.description}</td>
                  <td style="font-family: monospace;">${p.reference}</td>
                  <td class="debit" style="text-align: right;">${p.debit > 0 ? '₹' + p.debit.toFixed(2) : '-'}</td>
                  <td class="credit" style="text-align: right;">${p.credit > 0 ? '₹' + p.credit.toFixed(2) : '-'}</td>
                  <td class="balance" style="text-align: right; color: ${p.balance >= 0 ? '#16a34a' : '#dc2626'}">
                    ${p.balance >= 0 ? '₹' + p.balance.toFixed(2) + ' Cr' : '₹' + Math.abs(p.balance).toFixed(2) + ' Dr'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="sign-row">
            <div class="sign-box" style="border: none; text-align: left; color: #6b7280; font-style: italic;">
              * Computer generated statement.<br/>No signature required.
            </div>
            <div class="sign-box">
              Authorized Signatory
            </div>
          </div>
          
          <div class="footer">
            © ${new Date().getFullYear()} Sudhir Tutorials. All rights reserved. Confidential Academic Record.
          </div>
          
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', display: 'flex', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '4px' }}>
            <button 
              type="button"
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
              type="button"
              onClick={() => setViewType('year')}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                background: viewType === 'year' ? 'var(--primary)' : 'transparent',
                color: viewType === 'year' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              📊 Year-wise
            </button>
            <button 
              type="button"
              onClick={() => setViewType('statement')}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                background: viewType === 'statement' ? 'var(--primary)' : 'transparent',
                color: viewType === 'statement' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              🏦 Student Fee Statement
            </button>
            <button 
              type="button"
              onClick={() => setViewType('latest-payments')}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                background: viewType === 'latest-payments' ? 'var(--primary)' : 'transparent',
                color: viewType === 'latest-payments' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              💳 Latest 10 Payments
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
                            type="button"
                            onClick={() => onPayOnline(record)}
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            Pay
                          </button>
                        )}
                        {['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(status) && onViewReceipt && (
                          <button 
                            type="button"
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
                        Paid on {(() => {
                          const d = new Date(record.paidAt);
                          const day = String(d.getDate()).padStart(2, '0');
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const year = d.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
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

      {/* BANK STATEMENT CREDIT/DEBIT VIEW */}
      {viewType === 'statement' && (() => {
        const postings = getStatementPostings();
        const totalDebit = postings.reduce((sum, p) => sum + p.debit, 0);
        const totalCredit = postings.reduce((sum, p) => sum + p.credit, 0);
        const finalBalance = postings.length > 0 ? postings[postings.length - 1].balance : 0;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Student Info Profile Card */}
            {fees[0]?.student && (
              <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', background: 'var(--surface-light)', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>👤 Student Account Profile Details</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem 1.5rem', fontSize: '0.85rem' }}>
                  <div><strong style={{ color: 'var(--text-muted)' }}>Real Name:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fees[0].student.name || 'N/A'}</span></div>
                  <div><strong style={{ color: 'var(--text-muted)' }}>Student ID:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>@{fees[0].student.username || 'N/A'}</span></div>
                  <div><strong style={{ color: 'var(--text-muted)' }}>Roll Number:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fees[0].student.studentProfile?.rollNumber || 'N/A'}</span></div>
                  <div><strong style={{ color: 'var(--text-muted)' }}>Registration No:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fees[0].student.studentProfile?.registrationNo || 'N/A'}</span></div>
                  <div><strong style={{ color: 'var(--text-muted)' }}>Class / Grade:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fees[0].student.studentProfile?.className || fees[0].student.studentProfile?.grade || 'N/A'}</span></div>
                  <div><strong style={{ color: 'var(--text-muted)' }}>Batch:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fees[0].student.studentProfile?.batch || 'N/A'}</span></div>
                  <div><strong style={{ color: 'var(--text-muted)' }}>Father's Name:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fees[0].student.studentProfile?.fatherName || 'N/A'}</span></div>
                  <div><strong style={{ color: 'var(--text-muted)' }}>Contact Phone:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fees[0].student.studentProfile?.phone || 'N/A'}</span></div>
                  <div style={{ gridColumn: 'span 2' }}><strong style={{ color: 'var(--text-muted)' }}>Email Address:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fees[0].student.studentProfile?.email || 'N/A'}</span></div>
                  <div style={{ gridColumn: 'span 2' }}><strong style={{ color: 'var(--text-muted)' }}>Residential Address:</strong> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fees[0].student.studentProfile?.address || 'N/A'}</span></div>
                </div>
              </div>
            )}
            {/* Bank Header Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="glass-card" style={{ padding: '1.25rem 1.5rem', background: 'var(--surface-light)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Charged (Debits)</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '0.5rem', display: 'block' }}>₹{totalDebit.toFixed(2)}</span>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem 1.5rem', background: 'var(--surface-light)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Payments (Credits)</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '0.5rem', display: 'block' }}>₹{totalCredit.toFixed(2)}</span>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem 1.5rem', background: 'var(--surface-light)', borderRadius: '16px', border: '1px solid var(--border)', gridColumn: 'span 1' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Academic Balance</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: finalBalance >= 0 ? '#10b981' : '#f59e0b', marginTop: '0.5rem', display: 'block' }}>
                  {finalBalance >= 0 ? 'Settled ✓' : `-₹${Math.abs(finalBalance).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Showing all chronological credit/debit transaction postings
              </span>
              <button 
                type="button"
                onClick={handlePrintStatement}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem' }}
              >
                🖨️ Print / Save Ledger PDF
              </button>
            </div>

            {/* Statement Grid */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--surface-light)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>
                    <th style={{ padding: '1.25rem 1.5rem' }}>Value Date</th>
                    <th>Reference</th>
                    <th>Narrative / Description</th>
                    <th style={{ textAlign: 'right' }}>Debit (Charged)</th>
                    <th style={{ textAlign: 'right' }}>Credit (Deposited)</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {postings.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text)' }}>
                        {(() => {
                          const d = new Date(p.date);
                          const day = String(d.getDate()).padStart(2, '0');
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const year = d.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)' }}>{p.reference}</td>
                      <td style={{ color: 'var(--text)', fontWeight: 600 }}>{p.description}</td>
                      <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>
                        {p.debit > 0 ? `₹${p.debit.toFixed(2)}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>
                        {p.credit > 0 ? `₹${p.credit.toFixed(2)}` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '1.5rem', fontWeight: 800, color: p.balance >= 0 ? '#10b981' : '#f59e0b' }}>
                        {p.balance >= 0 ? `₹${p.balance.toFixed(2)}` : `-₹${Math.abs(p.balance).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                  {postings.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No transactions recorded in passbook.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* LATEST 10 PAYMENTS VIEW */}
      {viewType === 'latest-payments' && (() => {
        const paidPayments = fees
          .filter(f => ['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status))
          .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())
          .slice(0, 10);

        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Showing the latest 10 successful/verified payments
              </span>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--surface-light)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>
                    <th style={{ padding: '1.25rem 1.5rem' }}>Payment Date</th>
                    <th>Ref / Receipt No</th>
                    <th>Fee Details</th>
                    <th style={{ textAlign: 'right' }}>Amount Paid</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'center', paddingRight: '1.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paidPayments.map((p, idx) => (
                    <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text)', fontWeight: 600 }}>
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-GB') : new Date(p.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 700 }}>
                        {p.receiptNo || `REC-${p.id.slice(-6).toUpperCase()}`}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.title || 'Monthly Fee'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Billing Period: {p.billingMonth}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                        ₹{(p.paidAmount || p.amount).toFixed(2)}
                      </td>
                      <td>
                        <span style={{ 
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800,
                          background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8'
                        }}>
                          {p.paymentMethod || 'ONLINE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', paddingRight: '1.5rem' }}>
                        {onViewReceipt ? (
                          <button 
                            type="button"
                            onClick={() => onViewReceipt(p.id)}
                            style={{
                              padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px',
                              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s'
                            }}
                            className="btn-receipt"
                          >
                            🧾 View Receipt
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No receipts config</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paidPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No successful payments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

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
