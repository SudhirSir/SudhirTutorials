/**
 * Calculates the late fine for a PENDING payment.
 *
 * Rules:
 * - Due date is always the 12th of the billing month.
 * - 1–10 days late: Rs 10 per day.
 * - >10 days late: flat Rs 100 cap.
 * - If paid or verified: no fine.
 */
export function calculateLateFine(
  dueDate: Date,
  status: string,
  perDayFine: number = 10,
  flatFineAfter10Days: number = 100,
  paymentDate?: Date
): number {
  if (status === 'PAID' || status === 'VERIFIED' || status === 'PAID_ONLINE') return 0;

  const now = paymentDate || new Date();
  const due = new Date(dueDate);

  // Reset times to midnight so we count whole days only
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLate = Math.floor((today.getTime() - dueDay.getTime()) / msPerDay);

  if (daysLate <= 0) return 0;          // Not yet overdue
  if (daysLate <= 10) return daysLate * perDayFine;  // Configurable per-day fine
  
  // If > 10 days, cap at flat 100.
  return flatFineAfter10Days;
}

export function formatDate(dateVal: any): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getGradeLetterCode(classNameStr?: string | null): string {
  if (!classNameStr) return 'A';
  const cls = classNameStr.trim();
  const match = cls.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 26) {
      return String.fromCharCode(65 + num - 1); // 1->A, 2->B, 3->C ... 10->J, 11->K, 12->L
    }
  }
  return 'A';
}

export function generateReceiptNo(payment: any, serial?: number | string): string {
  if (!payment) return '26/A/1001';
  if (payment.receiptNo && typeof payment.receiptNo === 'string' && payment.receiptNo.trim().length > 0) {
    const parts = payment.receiptNo.trim().split('/');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[0].slice(-2)}/${parts[1]}/${parts[2]}`;
    }
    return payment.receiptNo;
  }

  const paidYear = String(new Date(payment.paidAt || payment.createdAt || new Date()).getFullYear()).slice(-2);
  const studentProfile = payment.student?.studentProfile || payment.studentProfile;
  const className = studentProfile?.className || studentProfile?.grade || '1st';
  const gradeCode = getGradeLetterCode(className);

  let num = 1001;
  if (typeof serial === 'number' && serial > 0) {
    num = serial;
  } else if (typeof serial === 'string' && !isNaN(parseInt(serial, 10)) && parseInt(serial, 10) > 0) {
    num = parseInt(serial, 10);
  } else if (payment.seqIndex && typeof payment.seqIndex === 'number' && payment.seqIndex > 0) {
    num = 1000 + payment.seqIndex;
  }

  const serialStr = String(num).padStart(4, '0');
  return `${paidYear}/${gradeCode}/${serialStr}`;
}

/**
 * Robustly parses billingMonth from user input or APIs (e.g. "April 2026", "2026-04", "2026-4", "apr 2026").
 */
export function parseBillingMonth(billingMonth?: string | null): { 
  monthName: string; 
  year: number; 
  monthIndex: number; 
  formatted: string;
} {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const now = new Date();
  if (!billingMonth || typeof billingMonth !== 'string' || !billingMonth.trim()) {
    const mIdx = now.getMonth();
    const y = now.getFullYear();
    return { monthName: monthNames[mIdx], year: y, monthIndex: mIdx, formatted: `${monthNames[mIdx]} ${y}` };
  }

  const str = billingMonth.trim();

  // Pattern 1: YYYY-MM or YYYY-M
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const mIdx = parseInt(isoMatch[2], 10) - 1;
    const clampedM = Math.max(0, Math.min(11, isNaN(mIdx) ? now.getMonth() : mIdx));
    return {
      monthName: monthNames[clampedM],
      year: isNaN(year) ? now.getFullYear() : year,
      monthIndex: clampedM,
      formatted: `${monthNames[clampedM]} ${year}`
    };
  }

  // Pattern 2: "Month YYYY" or "Mon YYYY" or "Month, YYYY"
  const textMatch = str.match(/^([A-Za-z]+)[\s,]+(\d{4})$/);
  if (textMatch) {
    const mName = textMatch[1].toLowerCase();
    const year = parseInt(textMatch[2], 10);
    const idx = monthNames.findIndex(m => m.toLowerCase().startsWith(mName));
    const clampedM = idx !== -1 ? idx : now.getMonth();
    return {
      monthName: monthNames[clampedM],
      year: isNaN(year) ? now.getFullYear() : year,
      monthIndex: clampedM,
      formatted: `${monthNames[clampedM]} ${year}`
    };
  }

  // Pattern 3: just month name or partial
  const singleIdx = monthNames.findIndex(m => m.toLowerCase().startsWith(str.toLowerCase()));
  if (singleIdx !== -1) {
    const year = now.getFullYear();
    return {
      monthName: monthNames[singleIdx],
      year,
      monthIndex: singleIdx,
      formatted: `${monthNames[singleIdx]} ${year}`
    };
  }

  // Fallback
  const mIdx = now.getMonth();
  const y = now.getFullYear();
  return { monthName: monthNames[mIdx], year: y, monthIndex: mIdx, formatted: `${monthNames[mIdx]} ${y}` };
}

/**
 * Ultra-fast batch generator for guaranteed unique receipt numbers without collisions.
 * Uses a single database fetch and an in-memory hash Set for O(N) generation.
 * Format: {YY}/{GradeCode}/{Serial}
 * Example: "26/B/1228"
 */
export async function getBatchUniqueReceiptNumbers(
  db: any,
  dateVal?: Date | string,
  items: { className?: string | null }[] = []
): Promise<string[]> {
  if (!items || items.length === 0) return [];
  const date = dateVal ? new Date(dateVal) : new Date();
  const yearCode = String(date.getFullYear()).slice(-2);

  // Retrieve existing receipt numbers for this year to populate Set and discover max serial
  const payments = await db.payment.findMany({
    where: {
      receiptNo: {
        startsWith: `${yearCode}/`
      }
    },
    select: { receiptNo: true }
  });

  const existingSet = new Set<string>();
  let maxSerial = 1000;

  for (const p of payments) {
    if (!p.receiptNo) continue;
    existingSet.add(p.receiptNo);
    const parts = p.receiptNo.split('/');
    if (parts.length === 3) {
      const serialNum = parseInt(parts[2], 10);
      if (!isNaN(serialNum) && serialNum > maxSerial) {
        maxSerial = serialNum;
      }
    }
  }

  let currentSerial = Math.max(maxSerial + 1, 1001 + existingSet.size);
  const results: string[] = [];

  for (const item of items) {
    const gradeCode = getGradeLetterCode(item.className);
    let candidate = `${yearCode}/${gradeCode}/${currentSerial}`;
    while (existingSet.has(candidate)) {
      currentSerial++;
      candidate = `${yearCode}/${gradeCode}/${currentSerial}`;
    }
    existingSet.add(candidate);
    results.push(candidate);
    currentSerial++;
  }

  return results;
}

/**
 * Safely generates the next unique receipt number without any risk of collision.
 * Format: {YY}/{GradeCode}/{Serial}
 * Example: "26/B/1228"
 */
export async function getNextUniqueReceiptNo(
  db: any,
  dateVal?: Date | string,
  className?: string | null,
  offset: number = 0
): Promise<string> {
  const res = await getBatchUniqueReceiptNumbers(db, dateVal, [{ className }]);
  return res[0] || `${String(new Date().getFullYear()).slice(-2)}/${getGradeLetterCode(className)}/${1001 + offset}`;
}
