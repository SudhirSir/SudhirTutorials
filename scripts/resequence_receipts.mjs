import { PrismaClient } from '@prisma/client';
import fs from 'fs';

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) dbUrl = match[1];
}

if (dbUrl && !dbUrl.includes('sslmode=')) {
  dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'sslmode=require';
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

function getGradeLetterCode(classNameStr) {
  if (!classNameStr) return 'A';
  const cls = classNameStr.trim();
  const match = cls.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 26) {
      return String.fromCharCode(65 + num - 1);
    }
  }
  return 'A';
}

async function main() {
  console.log("Starting receipt number re-sequencing...");
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      student: {
        select: {
          studentProfile: {
            select: {
              className: true,
              grade: true
            }
          }
        }
      }
    }
  });

  console.log(`Found ${payments.length} payment records.`);
  let seq = 1001;

  for (const p of payments) {
    const paidYear = new Date(p.createdAt || new Date()).getFullYear();
    const className = p.student?.studentProfile?.className || p.student?.studentProfile?.grade || '1st';
    const gradeCode = getGradeLetterCode(className);
    const serialStr = String(seq).padStart(4, '0');
    const newReceiptNo = `${paidYear}/${gradeCode}/${serialStr}`;

    await prisma.payment.update({
      where: { id: p.id },
      data: { receiptNo: newReceiptNo }
    });

    console.log(`Updated Payment ID ${p.id} -> ${newReceiptNo}`);
    seq++;
  }

  console.log("Successfully re-sequenced all receipt numbers starting from 1001!");
}

main()
  .catch(e => {
    console.error("Error re-sequencing receipts:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
