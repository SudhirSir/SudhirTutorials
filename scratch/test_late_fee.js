const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateLateFine(dueDate, status) {
  if (status === 'PAID' || status === 'VERIFIED' || status === 'PAID_ONLINE') return 0;

  const now = new Date();
  const due = new Date(dueDate);

  // Reset times to midnight so we count whole days only
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLate = Math.floor((today.getTime() - dueDay.getTime()) / msPerDay);

  console.log('Today:', today);
  console.log('Due Day:', dueDay);
  console.log('Days Late:', daysLate);

  if (daysLate <= 0) return 0;          
  if (daysLate <= 10) return daysLate * 10;  
  return 100;                            
}

async function test() {
  const payment = await prisma.payment.findFirst({
    where: { status: 'PENDING' }
  });

  if (payment) {
    console.log('Payment:', payment);
    const fine = calculateLateFine(payment.dueDate, payment.status);
    console.log('Calculated Fine:', fine);
  } else {
    console.log('No pending payments found.');
  }
}

test();
