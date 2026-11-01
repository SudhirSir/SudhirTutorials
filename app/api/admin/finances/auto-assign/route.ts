export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { getLateFineSettings } from '@/lib/feeSettings';
import { parseBillingMonth, getBatchUniqueReceiptNumbers } from '@/lib/feeUtils';
import { appCache } from '@/lib/cache';

function isAuthorized(session: any, request: Request) {
  if (session?.user?.role === 'ADMIN') return true;
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-vercel-cron')) return true;
  return false;
}

// GET: Preview auto-billing for a specific month
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!isAuthorized(session, request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const billingMonthParam = searchParams.get('billingMonth');
    if (!billingMonthParam) {
      return NextResponse.json({ error: 'Billing month is required' }, { status: 400 });
    }

    const parsedMonth = parseBillingMonth(billingMonthParam);
    const billingMonth = parsedMonth.formatted;

    // Get active students who are not store users
    const activeStudents = await withDbRetry(() => prisma.user.findMany({
      where: { 
        role: 'STUDENT', 
        isActive: true,
        NOT: { isStoreUser: true }
      },
      include: {
        studentProfile: { select: { baseFee: true, scholarship: true, className: true } },
        studentBatches: { select: { defaultFee: true, name: true, className: true } }
      },
      orderBy: { name: 'asc' }
    }));

    // Find who already has fees for this month (check both formatted and raw string)
    const existingFees = await withDbRetry(() => prisma.payment.findMany({
      where: {
        OR: [
          { billingMonth: billingMonth },
          { billingMonth: billingMonthParam }
        ]
      },
      select: { studentId: true }
    }));
    const existingStudentIds = new Set(existingFees.map(f => f.studentId));

    let alreadyBilledCount = 0;
    let pendingBillingCount = 0;
    let totalPendingAmount = 0;

    const previewData = activeStudents.map(student => {
      const profileBaseFee = student.studentProfile?.baseFee || 0;
      const batchDefaultFee = student.studentBatches?.[0]?.defaultFee || 0;
      const baseFee = profileBaseFee > 0 ? profileBaseFee : batchDefaultFee;
      const discount = student.studentProfile?.scholarship || 0;
      const alreadyAssigned = existingStudentIds.has(student.id);

      if (alreadyAssigned) {
        alreadyBilledCount++;
      } else if (baseFee > 0) {
        pendingBillingCount++;
        totalPendingAmount += Math.max(0, baseFee - discount);
      }

      const className = student.studentProfile?.className || student.studentBatches?.[0]?.className || 'N/A';

      return {
        id: student.id,
        name: student.name,
        username: student.username,
        class: className,
        className: className,
        baseFee,
        discount,
        netFee: Math.max(0, baseFee - discount),
        alreadyAssigned,
        alreadyBilled: alreadyAssigned
      };
    }).filter(s => s.baseFee > 0);

    return NextResponse.json({ 
      preview: previewData,
      totalActiveStudents: previewData.length,
      alreadyBilledCount,
      pendingBillingCount,
      totalPendingAmount,
      billingMonth
    });
  } catch (error: any) {
    console.error("Auto Assign GET Error:", error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Execute auto-billing for all active students who don't have fees for the month
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!isAuthorized(session, request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const billingMonthParam = body?.billingMonth || new URL(request.url).searchParams.get('billingMonth');
    if (!billingMonthParam) {
      return NextResponse.json({ error: 'Billing month is required' }, { status: 400 });
    }

    // Support selective billing if admin checked specific students in preview
    const selectedStudentIds = Array.isArray(body?.selectedStudentIds) ? new Set(body.selectedStudentIds) : null;

    const parsedMonth = parseBillingMonth(billingMonthParam);
    const billingMonth = parsedMonth.formatted;

    const activeStudents = await withDbRetry(() => prisma.user.findMany({
      where: { 
        role: 'STUDENT', 
        isActive: true,
        NOT: { isStoreUser: true }
      },
      include: {
        studentProfile: { select: { baseFee: true, scholarship: true, className: true } },
        studentBatches: { select: { defaultFee: true, name: true, className: true } }
      }
    }));

    const existingFees = await withDbRetry(() => prisma.payment.findMany({
      where: {
        OR: [
          { billingMonth: billingMonth },
          { billingMonth: billingMonthParam }
        ]
      },
      select: { studentId: true }
    }));
    const existingStudentIds = new Set(existingFees.map(f => f.studentId));

    const { feeDueDay } = await getLateFineSettings();
    const dueDate = new Date(parsedMonth.year, parsedMonth.monthIndex, feeDueDay);

    const studentsToBill = activeStudents.filter(student => {
      if (existingStudentIds.has(student.id)) return false;
      if (selectedStudentIds && !selectedStudentIds.has(student.id)) return false;
      const baseFee = (student.studentProfile?.baseFee || 0) > 0 
        ? student.studentProfile?.baseFee 
        : (student.studentBatches?.[0]?.defaultFee || 0);
      return (baseFee || 0) > 0;
    });

    if (studentsToBill.length === 0) {
      return NextResponse.json({ 
        success: true, 
        count: 0, 
        skippedCount: activeStudents.length, 
        totalProcessed: activeStudents.length,
        message: 'No pending students to bill for this month.'
      });
    }

    // Generate unique receipt numbers in ONE fast batch without sequential DB hammering
    const receiptItems = studentsToBill.map(s => ({
      className: s.studentProfile?.className || s.studentBatches?.[0]?.className
    }));
    const receiptNumbers = await getBatchUniqueReceiptNumbers(prisma, dueDate, receiptItems);

    const paymentsToCreate = studentsToBill.map((student, idx) => {
      const baseFee = (student.studentProfile?.baseFee || 0) > 0 
        ? student.studentProfile!.baseFee! 
        : (student.studentBatches?.[0]?.defaultFee || 0);
      const discount = student.studentProfile?.scholarship || 0;
      const receiptNo = receiptNumbers[idx];

      return {
        studentId: student.id,
        receiptNo,
        title: 'Monthly Fee',
        billingMonth,
        dueDate,
        amount: baseFee,
        discount,
        status: 'PENDING'
      };
    });

    await withDbRetry(() => prisma.payment.createMany({
      data: paymentsToCreate
    }));

    // Notification to students:
    // Format due date in DD/MM/YYYY
    const dueDayStr = String(dueDate.getDate()).padStart(2, '0');
    const dueMonthStr = String(dueDate.getMonth() + 1).padStart(2, '0');
    const formattedDueDate = `${dueDayStr}/${dueMonthStr}/${dueDate.getFullYear()}`;

    const senderId = session?.user?.id || null;

    const notifsToCreate = studentsToBill.map(student => {
      const baseFee = (student.studentProfile?.baseFee || 0) > 0 
        ? student.studentProfile!.baseFee! 
        : (student.studentBatches?.[0]?.defaultFee || 0);
      const discount = student.studentProfile?.scholarship || 0;
      const netFee = Math.max(0, baseFee - discount);

      return {
        userId: student.id,
        senderId,
        type: 'FEE',
        title: `💳 Monthly Fee Added: ${billingMonth}`,
        message: `Your monthly fee of ₹${netFee.toFixed(0)} for ${billingMonth} has been added. Kindly pay by due date (${formattedDueDate}) to avoid late fee fine.`,
        isRead: false
      };
    });

    if (notifsToCreate.length > 0) {
      await withDbRetry(() => prisma.notification.createMany({
        data: notifsToCreate
      })).catch(err => console.error("Auto-assign notifications error:", err));

      appCache.invalidate('badges');
    }

    if (session?.user?.id) {
      await logActivity(
        session.user.id,
        'AUTO_ASSIGN_FEE',
        `Auto-assigned monthly fees for ${billingMonth} to ${studentsToBill.length} students.`
      );
    }

    appCache.invalidate('admin:finances');
    appCache.invalidate('admin:overview');

    return NextResponse.json({ 
      success: true, 
      count: studentsToBill.length, 
      skippedCount: activeStudents.length - studentsToBill.length, 
      totalProcessed: activeStudents.length 
    });

  } catch (error: any) {
    console.error("Auto Assign POST Error:", error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
