export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { getLateFineSettings } from '@/lib/feeSettings';
import { getGradeLetterCode } from '@/lib/feeUtils';

// GET: Preview auto-billing for a specific month
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const billingMonth = searchParams.get('billingMonth');
    if (!billingMonth) {
      return NextResponse.json({ error: 'Billing month is required' }, { status: 400 });
    }

    // Get all active students
    const activeStudents = await withDbRetry(() => prisma.user.findMany({
      where: { role: 'STUDENT', isActive: true },
      include: {
        studentProfile: { select: { baseFee: true, scholarship: true, className: true } }
      }
    }));

    // Find who already has fees for this month
    const existingFees = await withDbRetry(() => prisma.payment.findMany({
      where: { billingMonth },
      select: { studentId: true }
    }));
    const existingStudentIds = new Set(existingFees.map(f => f.studentId));

    const previewData = activeStudents.map(student => {
      const baseFee = student.studentProfile?.baseFee || 0;
      const discount = student.studentProfile?.scholarship || 0;
      const alreadyAssigned = existingStudentIds.has(student.id);

      return {
        id: student.id,
        name: student.name,
        username: student.username,
        className: student.studentProfile?.className || 'N/A',
        baseFee,
        discount,
        netFee: Math.max(0, baseFee - discount),
        alreadyAssigned
      };
    });

    return NextResponse.json({ preview: previewData });
  } catch (error) {
    console.error("Auto Assign GET Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Execute auto-billing for all active students who don't have fees for the month
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { billingMonth } = body;
    if (!billingMonth) {
      return NextResponse.json({ error: 'Billing month is required' }, { status: 400 });
    }

    const activeStudents = await withDbRetry(() => prisma.user.findMany({
      where: { role: 'STUDENT', isActive: true },
      include: { studentProfile: { select: { baseFee: true, scholarship: true, className: true } } }
    }));

    const existingFees = await withDbRetry(() => prisma.payment.findMany({
      where: { billingMonth },
      select: { studentId: true }
    }));
    const existingStudentIds = new Set(existingFees.map(f => f.studentId));

    const { feeDueDay } = await getLateFineSettings();
    const dueDate = new Date();
    dueDate.setDate(feeDueDay);
    
    // Parse the billingMonth (e.g. "April 2026")
    const [monthName, yearStr] = billingMonth.split(' ');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = monthNames.indexOf(monthName);
    if (monthIndex !== -1 && yearStr) {
      dueDate.setFullYear(parseInt(yearStr), monthIndex, feeDueDay);
    }

    const currentTotalPayments = await withDbRetry(() => prisma.payment.count());
    const targetYear = dueDate.getFullYear();

    const paymentsToCreate: any[] = [];
    let assignedCount = 0;

    for (const student of activeStudents) {
      if (existingStudentIds.has(student.id)) continue; // skip already assigned

      const baseFee = student.studentProfile?.baseFee || 0;
      const discount = student.studentProfile?.scholarship || 0;
      const gradeCode = getGradeLetterCode(student.studentProfile?.className);
      const receiptNo = `${targetYear}/${gradeCode}/${1001 + currentTotalPayments + assignedCount}`;
      
      paymentsToCreate.push({
        studentId: student.id,
        receiptNo,
        title: 'Monthly Fee',
        billingMonth,
        dueDate,
        amount: baseFee,
        discount: discount,
        status: 'PENDING'
      });
      assignedCount++;
    }

    if (paymentsToCreate.length > 0) {
       await withDbRetry(() => prisma.payment.createMany({
         data: paymentsToCreate
       }));

       await logActivity(
         session.user.id,
         'AUTO_ASSIGN_FEE',
         `Auto-assigned monthly fees for ${billingMonth} to ${assignedCount} students.`
       );
    }

    return NextResponse.json({ 
      success: true, 
      count: assignedCount, 
      skippedCount: activeStudents.length - assignedCount, 
      totalProcessed: activeStudents.length 
    });

  } catch (error) {
    console.error("Auto Assign POST Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
