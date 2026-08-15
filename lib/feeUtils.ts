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

export function generateReceiptNo(payment: any, serial?: number | string): string {
  if (!payment) return 'REC/2026/0000';
  if (payment.receiptNo) return payment.receiptNo;

  const paidYear = new Date(payment.paidAt || payment.createdAt || new Date()).getFullYear();
  const studentProfile = payment.student?.studentProfile;
  const className = studentProfile?.className || studentProfile?.grade || '1st';
  const match = className.match(/\d+/);
  let gradeCode = 'S';
  if (match) {
    const num = parseInt(match[0]);
    if (num >= 1 && num <= 26) {
      gradeCode = String.fromCharCode(65 + num - 1);
    }
  }

  const serialVal = serial ?? (payment.id ? payment.id.slice(-4).toUpperCase() : '1001');
  return `${paidYear}/${gradeCode}/${serialVal}`;
}
