export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

// GET: list all salary records
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const salaries = await withDbRetry(() => prisma.salaryRecord.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            username: true,
            teacherProfile: {
              select: {
                subject: true,
                phone: true,
                salary: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }));

    return NextResponse.json({ salaries });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    return NextResponse.json({ error: 'Failed to fetch salaries' }, { status: 500 });
  }
}

// POST: generate/assign a new salary record
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teacherId, month, baseSalary, bonus, deductions, remarks } = await req.json();

    if (!teacherId || !month || baseSalary === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify teacher exists
    const teacher = await withDbRetry(() => prisma.user.findUnique({
      where: { id: teacherId },
      include: { teacherProfile: true }
    }));

    if (!teacher || teacher.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Selected user is not a teacher or does not exist' }, { status: 400 });
    }

    // Prevent duplicate for same month
    const existing = await withDbRetry(() => prisma.salaryRecord.findFirst({
      where: { teacherId, month }
    }));

    if (existing) {
      return NextResponse.json({ error: 'Salary record already generated for this teacher and month' }, { status: 400 });
    }

    const finalBaseSalary = parseFloat(baseSalary);
    const finalBonus = parseFloat(bonus || 0);
    const finalDeductions = parseFloat(deductions || 0);
    const netPaid = Math.max(0, finalBaseSalary + finalBonus - finalDeductions);

    const salaryRecord = await withDbRetry(() => prisma.salaryRecord.create({
      data: {
        teacherId,
        month,
        baseSalary: finalBaseSalary,
        bonus: finalBonus,
        deductions: finalDeductions,
        netPaid,
        status: 'PENDING',
        remarks
      }
    }));

    // Notify teacher
    try {
      await withDbRetry(() => prisma.notification.create({
        data: {
          userId: teacherId,
          title: '💵 Salary Slip Generated',
          message: `A new salary slip of ₹${netPaid.toFixed(0)} has been generated for you for the month of ${month}. Status: PENDING`,
          type: 'SALARY',
          isRead: false
        }
      }));
    } catch (nErr) {
      console.error('Failed to notify teacher of salary slip assignment:', nErr);
    }

    // Log Activity
    await logActivity(
      session.user.id,
      'ASSIGN_SALARY',
      `Assigned salary slip for ${teacher.name} for ${month}. Net Amount: ₹${netPaid.toFixed(2)}`
    );

    return NextResponse.json({ success: true, salaryRecord });
  } catch (error) {
    console.error('Error creating salary record:', error);
    return NextResponse.json({ error: 'Failed to create salary record' }, { status: 500 });
  }
}

// PATCH: payout/process salary disbursement
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, transactionId, remarks } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing salary record ID' }, { status: 400 });
    }

    const record = await withDbRetry(() => prisma.salaryRecord.findUnique({
      where: { id },
      include: { teacher: true }
    }));

    if (!record) {
      return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
    }

    if (record.status === 'PAID') {
      return NextResponse.json({ error: 'Salary record is already marked as PAID' }, { status: 400 });
    }

    const updatedRecord = await withDbRetry(() => prisma.salaryRecord.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        transactionId: transactionId || `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        remarks: remarks || record.remarks
      }
    }));

    // Create synchronized Bookkeeping Expense entry
    const expense = await withDbRetry(() => prisma.expense.create({
      data: {
        title: `Salary Payout – ${record.teacher.name} (${record.month})`,
        category: 'SALARY',
        amount: record.netPaid,
        date: new Date(),
        remarks: `Disbursed via Admin. Txn ID: ${updatedRecord.transactionId}. Remarks: ${remarks || 'None'}`
      }
    }));

    // Notify teacher
    try {
      await withDbRetry(() => prisma.notification.create({
        data: {
          userId: record.teacherId,
          title: '✅ Salary Payout Completed',
          message: `Your salary for the month of ${record.month} (₹${record.netPaid.toFixed(0)}) has been disbursed and marked as PAID. Reference Txn ID: ${updatedRecord.transactionId}`,
          type: 'SALARY',
          isRead: false
        }
      }));
    } catch (nErr) {
      console.error('Failed to notify teacher of salary payout completion:', nErr);
    }

    // Log Activity
    await logActivity(
      session.user.id,
      'PAY_TEACHER_SALARY',
      `Disbursed teacher salary to ${record.teacher.name} for ${record.month}. Paid Amount: ₹${record.netPaid.toFixed(2)}, Txn ID: ${updatedRecord.transactionId}`
    );

    return NextResponse.json({ success: true, salaryRecord: updatedRecord, expense });
  } catch (error) {
    console.error('Error updating salary payout:', error);
    return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, month, baseSalary, bonus, deductions, remarks, status, transactionId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing salary record ID' }, { status: 400 });
    }

    const record = await withDbRetry(() => prisma.salaryRecord.findUnique({
      where: { id }
    }));

    if (!record) {
      return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
    }

    const finalBaseSalary = baseSalary !== undefined ? parseFloat(baseSalary) : record.baseSalary;
    const finalBonus = bonus !== undefined ? parseFloat(bonus) : record.bonus;
    const finalDeductions = deductions !== undefined ? parseFloat(deductions) : record.deductions;
    const netPaid = Math.max(0, finalBaseSalary + finalBonus - finalDeductions);

    const data: any = {
      baseSalary: finalBaseSalary,
      bonus: finalBonus,
      deductions: finalDeductions,
      netPaid,
      remarks: remarks !== undefined ? remarks : record.remarks,
      month: month !== undefined ? month : record.month
    };

    if (status !== undefined) {
      data.status = status;
      if (status === 'PAID') {
        data.paidAt = record.paidAt || new Date();
        data.transactionId = transactionId || record.transactionId || `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      } else {
        data.paidAt = null;
        data.transactionId = null;
      }
    }

    const updatedRecord = await withDbRetry(() => prisma.salaryRecord.update({
      where: { id },
      data,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    }));

    await logActivity(
      session.user.id,
      'EDIT_SALARY_RECORD',
      `Edited salary record ID ${id} for teacher ${updatedRecord.teacher.name}. New Net Paid: ₹${netPaid}`
    );

    return NextResponse.json({ success: true, salaryRecord: updatedRecord });
  } catch (error) {
    console.error('Error updating salary record:', error);
    return NextResponse.json({ error: 'Failed to update salary record' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing salary record ID' }, { status: 400 });
    }

    const record = await withDbRetry(() => prisma.salaryRecord.findUnique({
      where: { id },
      include: { teacher: true }
    }));

    if (!record) {
      return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });
    }

    await withDbRetry(() => prisma.salaryRecord.delete({
      where: { id }
    }));

    await logActivity(
      session.user.id,
      'DELETE_SALARY_RECORD',
      `Deleted salary record for teacher ${record.teacher.name} for ${record.month}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting salary record:', error);
    return NextResponse.json({ error: 'Failed to delete salary record' }, { status: 500 });
  }
}
