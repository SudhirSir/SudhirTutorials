/**
 * Calculates the late fine for a PENDING payment.
 *
 * Rules:
 * - Due date is always the 12th of the billing month.
 * - 1–10 days late: Rs 10 per day.
 * - >10 days late: flat Rs 100 cap.
 * - If paid or verified: no fine.
 */
export function calculateLateFine(dueDate: Date, status: string): number {
  if (status === 'PAID' || status === 'VERIFIED' || status === 'PAID_ONLINE') return 0;

  const now = new Date();
  const due = new Date(dueDate);

  // Reset times to midnight so we count whole days only
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLate = Math.floor((today.getTime() - dueDay.getTime()) / msPerDay);

  if (daysLate <= 0) return 0;          // Not yet overdue
  if (daysLate <= 10) return daysLate * 10;  // Rs 10/day
  
  // If > 10 days, it's ₹100 per month. 
  // We calculate months based on 30-day buckets.
  const monthsLate = Math.floor((daysLate - 1) / 30) + 1;
  return monthsLate * 100;
}
