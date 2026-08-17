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
  if (!payment) return '2026/A/1001';
  if (payment.receiptNo && payment.receiptNo.includes('/')) return payment.receiptNo;

  const paidYear = new Date(payment.paidAt || payment.createdAt || new Date()).getFullYear();
  const studentProfile = payment.student?.studentProfile;
  const className = studentProfile?.className || studentProfile?.grade || '1st';
  const gradeCode = getGradeLetterCode(className);

  let num = 1001;
  if (typeof serial === 'number') {
    num = serial;
  } else if (typeof serial === 'string' && !isNaN(parseInt(serial, 10))) {
    num = parseInt(serial, 10);
  } else if (payment.seqIndex && typeof payment.seqIndex === 'number') {
    num = 1000 + payment.seqIndex;
  }

  const serialStr = String(num).padStart(4, '0');
  return `${paidYear}/${gradeCode}/${serialStr}`;
}
