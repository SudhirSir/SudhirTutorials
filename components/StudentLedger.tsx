"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';

interface StudentLedgerProps {
  studentId?: string;
  refreshTrigger?: number;
  onPayOnline?: (fee: any) => void;
  onViewReceipt?: (feeId: string) => void;
  isAdmin?: boolean;
  onCollect?: (fee: any) => void;
  onEdit?: (fee: any) => void;
  onDelete?: (feeId: string) => void;
}

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function StudentLedger({
  studentId,
  refreshTrigger,
  onPayOnline,
  onViewReceipt,
  isAdmin = false,
  onCollect,
  onEdit,
  onDelete
}: StudentLedgerProps) {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'month' | 'year' | 'statement' | 'latest-payments'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showMonthlyDetails, setShowMonthlyDetails] = useState(true);
  const [downloadingStatement, setDownloadingStatement] = useState(false);

  useEffect(() => {
    fetchLedger();
  }, [studentId, refreshTrigger]);

  const fetchLedger = async (retryCount = 0) => {
    setLoading(true);
    try {
      const url = studentId
        ? `/api/admin/finances?studentId=${studentId}`
        : `/api/student/fees`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFees(data.fees || []);
        setLoading(false);
      } else if (res.status === 401 && retryCount < 3) {
        // Session may not be ready yet after tab navigation — retry with backoff
        setTimeout(() => fetchLedger(retryCount + 1), 600 * (retryCount + 1));
        return; // keep loading spinner
      } else {
        console.error("Error fetching ledger, status:", res.status);
        setLoading(false);
      }
    } catch (e) {
      console.error("Error fetching ledger:", e);
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
        date: new Date(fee.createdAt),
        description: `Tuition Fee – ${fee.billingMonth} (${fee.title})`,
        reference: '–',
        type: 'DEBIT',
        debit: fee.amount,
        credit: 0,
        fee: fee,
      });

      // 2. Discount as a separate CREDIT entry (proper accounting)
      if (fee.discount > 0) {
        postings.push({
          date: new Date(fee.createdAt),
          description: `Fee Discount / Concession – ${fee.billingMonth}`,
          reference: '–',
          type: 'CREDIT',
          debit: 0,
          credit: fee.discount,
          fee: fee,
        });
      }

      // 3. Late fine as DEBIT – always use the max of stored lateFine or real-time currentLateFine
      const fineVal = Math.max(fee.lateFine || 0, fee.currentLateFine || 0);
      if (fineVal > 0) {
        postings.push({
          date: new Date(fee.paidAt || fee.dueDate || fee.createdAt),
          description: `Late Payment Fine – ${fee.billingMonth}`,
          reference: '–',
          type: 'FINE',
          debit: fineVal,
          credit: 0,
          fee: fee,
        });
      }

      // 4. Payment received as CREDIT
      if (fee.paidAmount > 0 || ['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(fee.status)) {
        const creditAmt = fee.paidAmount > 0 
          ? fee.paidAmount 
          : (fee.amount + fineVal - fee.discount);
        postings.push({
          date: new Date(fee.paidAt || fee.createdAt),
          description: `Payment Received – ${fee.paymentMethod || 'Online'}`,
          reference: fee.receiptNo || '–',
          type: 'CREDIT',
          debit: 0,
          credit: creditAmt,
          fee: fee,
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

  const isBlockedByPrevious = useMemo(() => {
    return (record: any) => {
      if (!record.dueDate) return false;
      const currentDueTime = new Date(record.dueDate).getTime();
      return fees.some(f => 
        f.status === 'PENDING' && 
        f.id !== record.id && 
        f.dueDate && 
        new Date(f.dueDate).getTime() < currentDueTime
      );
    };
  }, [fees]);

  const handlePrintStatement = async () => {
    setDownloadingStatement(true);
    try {
      // Dynamically load jsPDF (much more reliable than html2canvas on mobile)
      const loadJsPDF = (): Promise<any> =>
        new Promise((resolve, reject) => {
          if ((window as any).jspdf?.jsPDF) { resolve((window as any).jspdf.jsPDF); return; }
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s.onload = () => resolve((window as any).jspdf.jsPDF);
          s.onerror = () => reject(new Error('Failed to load jsPDF'));
          document.head.appendChild(s);
        });

      const jsPDF = await loadJsPDF();

      const postings = getStatementPostings;
      const totalDebit  = postings.reduce((s: number, p: any) => s + p.debit,  0);
      const totalCredit = postings.reduce((s: number, p: any) => s + p.credit, 0);
      const finalBalance = postings.length > 0 ? postings[postings.length - 1].balance : 0;
      const student = fees[0]?.student;
      const sp      = student?.studentProfile;
      const studentName = student?.name || 'Student';
      const today   = new Date().toLocaleDateString('en-GB');

      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const PAGE_W = 210;
      const MARGIN = 14;
      const COL_W  = PAGE_W - MARGIN * 2;
      let y = MARGIN;

      // ── Dual-color top accent bar ──
      doc.setFillColor(239, 68, 68); // Red
      doc.rect(0, 0, PAGE_W / 2, 2, 'F');
      doc.setFillColor(37, 99, 235); // Blue
      doc.rect(PAGE_W / 2, 0, PAGE_W / 2, 2, 'F');

      let hasLogo = false;
      let logoDataUrl = '';
      // Try to add logo
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = '/logo.png';
        await new Promise<void>((resolve) => {
          logoImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = logoImg.naturalWidth;
            canvas.height = logoImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(logoImg, 0, 0);
              logoDataUrl = canvas.toDataURL('image/png');
              hasLogo = true;
            }
            resolve();
          };
          logoImg.onerror = () => resolve();
          setTimeout(() => resolve(), 2000);
        });
      } catch (_) { /* logo optional */ }

      // Brand name: SUDHIR (red) + TUTORIALS (blue)
      const logoOffset = hasLogo ? MARGIN + 15 : MARGIN;
      if (hasLogo && logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', MARGIN, 6, 12, 12);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(239, 68, 68); // Red
      doc.text('SUDHIR', logoOffset, 12);
      const sudhirWidth = doc.getTextWidth('SUDHIR');
      doc.setTextColor(37, 99, 235); // Blue
      doc.text(' TUTORIALS', logoOffset + sudhirWidth, 12);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128); // Gray
      doc.text('Official Student Fee Statement', logoOffset, 17);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39); // Dark Gray
      doc.text('FEE STATEMENT', PAGE_W - MARGIN, 11, { align: 'right' });
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128); // Gray
      doc.text('Generated: ' + today, PAGE_W - MARGIN, 16.5, { align: 'right' });

      // Divider line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, 21, PAGE_W - MARGIN, 21);

      y = 25;

      // ── Student info box ──
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(MARGIN, y, COL_W, 32, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text('STUDENT PROFILE', MARGIN + 4, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 46);
      doc.text(studentName, MARGIN + 4, y + 12);

      const infoRows: string[][] = [
        ['Student ID', student?.username || 'N/A', 'Class / Grade', sp?.className || 'N/A'],
        ['Roll Number', sp?.rollNumber  || 'N/A', 'Batch',         sp?.batch      || 'N/A'],
        ["Father's Name", sp?.fatherName || 'N/A', 'Contact',      sp?.phone      || 'N/A'],
      ];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      infoRows.forEach((row, ri) => {
        const ry = y + 17 + ri * 5;
        doc.setFont('helvetica', 'bold');   doc.text(row[0] + ':', MARGIN + 4, ry);
        doc.setFont('helvetica', 'normal'); doc.text(row[1], MARGIN + 30, ry);
        doc.setFont('helvetica', 'bold');   doc.text(row[2] + ':', MARGIN + COL_W / 2 + 2, ry);
        doc.setFont('helvetica', 'normal'); doc.text(row[3], MARGIN + COL_W / 2 + 28, ry);
      });
      y += 37;

      // ── Summary boxes ──
      const BOX_W = (COL_W - 4) / 3;
      const summaryItems: { label: string; val: string; color: [number,number,number] }[] = [
        { label: 'TOTAL CHARGED (Dr)', val: 'Rs. ' + totalDebit.toFixed(2),  color: [220, 38, 38] },
        { label: 'TOTAL SETTLED (Cr)', val: 'Rs. ' + totalCredit.toFixed(2), color: [29, 78, 216] },
        {
          label: 'OUTSTANDING BALANCE',
          val: finalBalance === 0
            ? 'Settled'
            : finalBalance > 0
              ? '+Rs. ' + finalBalance.toFixed(2) + ' (Adv)'
              : 'Rs. ' + Math.abs(finalBalance).toFixed(2) + ' Due',
          color: finalBalance > 0 ? [16, 185, 129] : finalBalance < 0 ? [220, 38, 38] : [29, 78, 216],
        },
      ];
      summaryItems.forEach((item, i) => {
        const bx = MARGIN + i * (BOX_W + 2);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(bx, y, BOX_W, 16, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(107, 114, 128);
        doc.text(item.label, bx + 4, y + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...item.color);
        doc.text(item.val, bx + 4, y + 12);
      });
      y += 22;

      // ── Table header ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
      doc.text('TRANSACTION LEDGER', MARGIN, y + 1);
      y += 5;

      const cols: { label: string; w: number; align: string }[] = [
        { label: 'Date',        w: 24, align: 'left'  },
        { label: 'Receipt No.', w: 28, align: 'left'  },
        { label: 'Description', w: 62, align: 'left'  },
        { label: 'Debit (Dr)',  w: 24, align: 'right' },
        { label: 'Credit (Cr)', w: 24, align: 'right' },
        { label: 'Balance',     w: 22, align: 'right' },
      ];
      const ROW_H = 7;
      const HEAD_H = 8;

      doc.setFillColor(243, 244, 246);
      doc.setDrawColor(209, 213, 219);
      doc.rect(MARGIN, y, COL_W, HEAD_H, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(55, 65, 81);
      let cx = MARGIN + 2;
      cols.forEach(col => {
        doc.text(col.label, col.align === 'right' ? cx + col.w - 2 : cx, y + 5.5, { align: col.align as any });
        cx += col.w;
      });
      y += HEAD_H;

      // ── Table rows ──
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      postings.forEach((p: any, idx: number) => {
        if (y + ROW_H > 270) { doc.addPage(); y = MARGIN; }
        const bg: [number,number,number] = idx % 2 === 0 ? [255,255,255] : [249,250,251];
        doc.setFillColor(...bg);
        doc.setDrawColor(229, 231, 235);
        doc.rect(MARGIN, y, COL_W, ROW_H, 'FD');
        const isDebit  = p.type === 'DEBIT' || p.type === 'FINE';
        const isCredit = p.type === 'CREDIT';
        cx = MARGIN + 2;
        const cells: { val: string; color: [number,number,number]; w: number; align: string }[] = [
          { val: new Date(p.date).toLocaleDateString('en-GB'), color: [31,41,55],   w: cols[0].w, align: 'left'  },
          { val: p.reference,                                  color: [75,85,99],   w: cols[1].w, align: 'left'  },
          { val: p.description.length > 38 ? p.description.substring(0,38)+'...' : p.description, color: [31,41,55], w: cols[2].w, align: 'left' },
          { val: p.debit  > 0 ? 'Rs. ' + p.debit.toFixed(2)  : '-', color: isDebit  ? [220,38,38]  : [107,114,128], w: cols[3].w, align: 'right' },
          { val: p.credit > 0 ? 'Rs. ' + p.credit.toFixed(2) : '-', color: isCredit ? [29,78,216]  : [107,114,128], w: cols[4].w, align: 'right' },
          { val: p.balance >= 0 ? 'Rs. '+p.balance.toFixed(2)+' Cr' : 'Rs. '+Math.abs(p.balance).toFixed(2)+' Dr',
            color: p.balance >= 0 ? [29,78,216] : [220,38,38], w: cols[5].w, align: 'right' },
        ];
        cells.forEach(cell => {
          doc.setFont('helvetica', cell.align === 'right' ? 'bold' : 'normal');
          doc.setTextColor(...cell.color);
          doc.text(cell.val, cell.align === 'right' ? cx + cell.w - 2 : cx, y + 4.8, { align: cell.align as any });
          cx += cell.w;
        });
        y += ROW_H;
      });

      if (postings.length === 0) {
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'italic');
        doc.text('No transactions found.', MARGIN + 4, y + 5);
        y += 10;
      }

      // ── Footer ──
      y += 12;
      if (y > 260) { doc.addPage(); y = MARGIN; }
      doc.setDrawColor(209, 213, 219);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 6;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text('* Computer generated statement. No signature required.', MARGIN, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(55, 65, 81);
      doc.text('Authorized Signatory', PAGE_W - MARGIN, y, { align: 'right' });
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(156, 163, 175);
      doc.text('(c) ' + new Date().getFullYear() + ' Sudhir Tutorials. All rights reserved. Confidential Academic Record.', PAGE_W / 2, y, { align: 'center' });

      // ── Save / share ──
      const filename = 'Sudhir_Tutorials_Statement_' + studentName.replace(/\s+/g, '_') + '.pdf';
      const cap = (window as any).Capacitor;
      const isNative = cap?.isNativePlatform?.();
      if (isNative) {
        try {
          const { Filesystem } = await import('@capacitor/filesystem');
          const { Share }      = await import('@capacitor/share');
          const base64 = doc.output('datauristring').split(',')[1];
          let uri = '';
          try {
            const wr = await Filesystem.writeFile({ path: filename, data: base64, directory: 'DOCUMENTS' as any });
            uri = wr.uri;
            alert('Statement saved to Downloads as ' + filename);
          } catch {
            const wr = await Filesystem.writeFile({ path: filename, data: base64, directory: 'CACHE' as any });
            uri = wr.uri;
          }
          if (uri) await Share.share({ title: 'Fee Statement', files: [uri], dialogTitle: 'Open / Share Fee Statement' });
        } catch (e) {
          console.error('Mobile save error:', e);
          doc.save(filename);
        }
      } else {
        doc.save(filename);
        alert('Statement downloaded successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate statement PDF. Please try again.');
    } finally {
      setDownloadingStatement(false);
    }
  };
  // Memoized derived data – only recalculates when fees changes
  const years = useMemo(() => {
    const feeYears = fees.map(f => getParsedFeeDetails(f).year);
    const currentYear = new Date().getFullYear();
    const allYears = new Set([currentYear, currentYear - 1, ...feeYears]);
    return Array.from(allYears).sort((a, b) => b - a);
  }, [fees, getParsedFeeDetails]);

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
        
        // Dynamic outstanding balance subtracting credits
        const yrOutstanding = yrFees.reduce((acc, f) => {
          if (['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) {
            const netDue = f.amount + (f.lateFine || 0) - f.discount;
            const excess = Math.max(0, (f.paidAmount || 0) - netDue);
            return acc - excess;
          } else {
            const fine = Math.max(f.lateFine || 0, f.currentLateFine || 0);
            const remaining = Math.max(0, f.amount + fine - f.discount - (f.paidAmount || 0));
            return acc + remaining;
          }
        }, 0);

        return { year: yr, totalBilled, totalFines, totalDiscounts, totalPaid, totalOutstanding: yrOutstanding, recordsCount: yrFees.length };
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
    <div className="glass-card student-ledger-main-card" style={{ padding: '2rem', marginTop: '1.5rem', border: '1px solid var(--border)', background: 'var(--surface)' }}>
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
        <div>
          {!showMonthlyDetails ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3.5rem 2rem',
              background: 'var(--surface-light)',
              borderRadius: '16px',
              border: '1px dashed var(--border)',
              textAlign: 'center',
              gap: '1rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '3rem', animation: 'bounce-slow 3s infinite' }}>📂</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>Monthly Fee Structure</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>View month-by-month details, billing status, and fine statements for {selectedYear}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthlyDetails(true)}
                className="btn-secondary"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                📂 Open Monthly Fee Details
              </button>
              <style>{`
                @keyframes bounce-slow {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-6px); }
                }
              `}</style>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowMonthlyDetails(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📁 Hide Monthly Details
                </button>
              </div>
              <div className="monthly-fee-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
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
                            {record.paidAmount > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary)', fontWeight: 600 }}>
                                <span>Paid (Cr)</span>
                                <span>-₹{record.paidAmount}</span>
                              </div>
                            )}
                            {record.collectedBy && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                                <span>Collected By</span>
                                <span style={{ fontWeight: 600 }}>{record.collectedBy}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No bill generated.</div>
                        )}
                      </div>

                      {hasRecord && (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', marginTop: '0.875rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <span style={{ fontSize: '0.7rem', color: status === 'PENDING' ? '#ef4444' : 'var(--text-muted)', display: 'block', fontWeight: status === 'PENDING' ? 700 : 500 }}>Net Amount Due</span>
                              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: status === 'PENDING' ? '#ef4444' : 'var(--text)' }}>
                                ₹{Math.max(0, record.amount + fineVal - (record.discount || 0) - (record.paidAmount || 0))}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {isAdmin && (
                                <>
                                  {status === 'PENDING' && onCollect && (
                                    <button type="button" onClick={() => onCollect(record)}
                                      className="btn-primary"
                                      style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer' }}>
                                      💵 Collect
                                    </button>
                                  )}
                                  {onEdit && (
                                    <button type="button" onClick={() => onEdit(record)}
                                      style={{ padding: '6px 12px', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                                      ✏️ Edit
                                    </button>
                                  )}
                                  {onDelete && (
                                    <button type="button" onClick={() => onDelete(record.id)}
                                      style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                                      🗑️ Delete
                                    </button>
                                  )}
                                </>
                              )}
                              
                              {!isAdmin && ['PENDING', 'VERIFIED'].includes(status) && (record.amount + fineVal - (record.discount || 0) - (record.paidAmount || 0) > 0) && onPayOnline && (() => {
                                const blocked = isBlockedByPrevious(record);
                                return (
                                  <button type="button" 
                                    onClick={() => !blocked && onPayOnline(record)}
                                    disabled={blocked}
                                    className={blocked ? "" : "btn-primary"} 
                                    style={{ 
                                      padding: '6px 12px', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 700,
                                      cursor: blocked ? 'not-allowed' : 'pointer',
                                      background: blocked ? 'rgba(255,255,255,0.05)' : undefined,
                                      color: blocked ? 'var(--text-muted)' : undefined,
                                      border: blocked ? '1px solid var(--border)' : undefined,
                                      borderRadius: '8px'
                                    }}
                                    title={blocked ? "You must pay previous months' pending fees first." : "Pay this invoice"}
                                  >
                                    {blocked ? 'Blocked' : 'Pay'}
                                  </button>
                                );
                              })()}
                              {isPaid && onViewReceipt && (
                                <button type="button" onClick={() => onViewReceipt(record.id)}
                                  style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.1)', color: 'var(--secondary)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s' }}>
                                  Receipt
                                </button>
                              )}
                            </div>
                          </div>
                          {isBlockedByPrevious(record) && (
                            <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '0.5rem', textAlign: 'right' }}>
                              ⚠️ Pay previous pending fees first
                            </div>
                          )}
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
            </div>
          )}
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
                <div className="student-profile-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem 1.5rem', fontSize: '0.85rem' }}>
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
            <div className="statement-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Total Charged', value: `₹${totalDebit.toFixed(2)}`, color: 'var(--primary)' },
                { label: 'Total Settled', value: `₹${totalCredit.toFixed(2)}`, color: 'var(--secondary)' },
                { 
                  label: 'Net Balance', 
                  value: finalBalance > 0 
                    ? `+₹${finalBalance.toFixed(2)} Credit` 
                    : finalBalance < 0 
                      ? `₹${Math.abs(finalBalance).toFixed(2)} Due` 
                      : 'Settled', 
                  color: finalBalance > 0 ? 'var(--secondary)' : finalBalance < 0 ? '#ef4444' : 'var(--secondary)' 
                },
              ].map(s => (
                <div key={s.label} style={{ padding: '1.1rem 1.5rem', background: 'var(--surface-light)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, marginTop: '0.4rem', display: 'block' }}>{s.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>All chronological credit/debit postings</span>
              <button type="button" onClick={handlePrintStatement} disabled={downloadingStatement}
                className="btn-secondary"
                style={{ padding: '8px 18px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem' }}>
                {downloadingStatement ? 'Generating PDF...' : 'Download Statement PDF'}
              </button>
            </div>

            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-light)', width: '100%', maxWidth: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800 }}>
                    <th style={{ padding: '1.1rem 1.5rem' }}>Date</th>
                    <th>Receipt No.</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Debit (Dr)</th>
                    <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Balance</th>
                    {(isAdmin || !!onViewReceipt) && <th style={{ textAlign: 'center', paddingLeft: '1rem', paddingRight: '1.5rem' }}>Actions</th>}
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
                      <td style={{ textAlign: 'right', paddingRight: '1.5rem', fontWeight: 800, color: p.balance >= 0 ? 'var(--secondary)' : '#ef4444' }}>
                        {p.balance >= 0 ? `₹${p.balance.toFixed(2)} Cr` : `₹${Math.abs(p.balance).toFixed(2)} Dr`}
                      </td>
                      {(isAdmin || !!onViewReceipt) && (
                        <td style={{ textAlign: 'center', paddingRight: '1.5rem' }}>
                          {p.fee ? (
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              {isAdmin && p.fee.status === 'PENDING' && onCollect && (
                                <button type="button" onClick={() => onCollect(p.fee)}
                                  className="btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' }}
                                  title="Collect Fee">
                                  💵 Collect
                                </button>
                              )}
                              {isAdmin && onEdit && (
                                <button type="button" onClick={() => onEdit(p.fee)}
                                  style={{ padding: '4px 8px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                                  title="Edit Fee">
                                  ✏️ Edit
                                </button>
                              )}
                              {isAdmin && onDelete && (
                                <button type="button" onClick={() => onDelete(p.fee.id)}
                                  style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                                  title="Delete Fee">
                                  🗑️ Delete
                                </button>
                              )}
                              {p.type === 'CREDIT' && onViewReceipt && (
                                <button type="button" onClick={() => onViewReceipt(p.fee.id)}
                                  style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                                  title="View Receipt">
                                  🧾 Receipt
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>–</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {postings.length === 0 && (
                    <tr><td colSpan={isAdmin ? 7 : 6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No transactions recorded.</td></tr>
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
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-light)', width: '100%', maxWidth: '100%' }}>
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
                      {p.collectedBy && <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 600 }}>By: {p.collectedBy}</div>}
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
        th {
          color: var(--text-muted) !important;
        }
      `}</style>
    </div>
  );
}
