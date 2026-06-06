export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

// GET /api/admin/students/[id] — Fetch full student profile by username
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find by username (STU*****) or internal id
    const user = await withDbRetry(() => prisma.user.findFirst({
      where: {
        OR: [
          { username: id },
          { id: id },
        ],
        role: 'STUDENT',
      },
      include: {
        studentProfile: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }));

    if (!user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student: user });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/admin/students/[id] — Update student profile fields
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      name,
      isActive,
      rollNumber,
      registrationNo,
      grade,
      className,
      batch,
      school,
      email,
      phone,
      parentName,
      fatherName,
      parentContact,
      address,
      dob,
      photoUrl,
      attendancePercent,
      marksObtained,
      marksTotal,
      baseFee,
      board,
      scholarship,
      aadhaarNumber,
      createdAt,
    } = body;

    // Validate inputs
    if (name !== undefined) {
      if (name.length > 25 || !/^[a-zA-Z\s]+$/.test(name)) {
        return NextResponse.json({ error: 'Name must contain only alphabets and spaces, and be at most 25 characters long.' }, { status: 400 });
      }
    }
    if (fatherName !== undefined) {
      if (fatherName && (fatherName.length > 25 || !/^[a-zA-Z\s]+$/.test(fatherName))) {
        return NextResponse.json({ error: "Father's name must contain only alphabets and spaces, and be at most 25 characters long." }, { status: 400 });
      }
    }
    if (parentName !== undefined) {
      if (parentName && (parentName.length > 25 || !/^[a-zA-Z\s]+$/.test(parentName))) {
        return NextResponse.json({ error: "Parent's name must contain only alphabets and spaces, and be at most 25 characters long." }, { status: 400 });
      }
    }
    if (address !== undefined) {
      if (address && address.length > 60) {
        return NextResponse.json({ error: 'Address must be at most 60 characters long.' }, { status: 400 });
      }
    }
    if (phone !== undefined && phone !== null && phone !== '') {
      if (!/^\d{10}$/.test(phone)) {
        return NextResponse.json({ error: 'Phone number must be exactly 10 digits.' }, { status: 400 });
      }
    }
    if (parentContact !== undefined && parentContact !== null && parentContact !== '') {
      if (!/^\d{10}$/.test(parentContact)) {
        return NextResponse.json({ error: 'Parent contact must be exactly 10 digits.' }, { status: 400 });
      }
    }
 
    // Find the user first
    const user = await withDbRetry(() => prisma.user.findFirst({
      where: {
        OR: [{ username: id }, { id }],
        role: 'STUDENT',
      },
    }));
 
    if (!user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
 
    // Update name, isActive, and createdAt on the User model if provided
    if (name !== undefined || isActive !== undefined || createdAt !== undefined) {
      await withDbRetry(() => prisma.user.update({
        where: { id: user.id },
        data: { 
          ...(name !== undefined && { name }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(createdAt && { createdAt: new Date(createdAt) }),
        },
      }));
    }
 
    if (batch !== undefined) {
      // Clear previous batches
      await withDbRetry(() => prisma.user.update({
        where: { id: user.id },
        data: { studentBatches: { set: [] } }
      }));
      
      if (batch) {
        const matchedBatch = await withDbRetry(() => prisma.batch.findFirst({
          where: { OR: [{ name: batch }, { id: batch }] }
        }));
        if (matchedBatch) {
          await withDbRetry(() => prisma.user.update({
            where: { id: user.id },
            data: { studentBatches: { connect: { id: matchedBatch.id } } }
          }));
        }
      }
    }
 
    // Upsert the StudentProfile
    const profile = await withDbRetry(() => prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        ...(rollNumber !== undefined && { rollNumber }),
        ...(registrationNo !== undefined && { registrationNo }),
        ...(grade !== undefined && { grade }),
        ...(className !== undefined && { className }),
        ...(board !== undefined && { board }),
        ...(scholarship !== undefined && { scholarship: scholarship ? parseFloat(String(scholarship)) : 0 }),
        ...(batch !== undefined && { batch }),
        ...(school !== undefined && { school }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(fatherName !== undefined && { fatherName }),
        ...(parentName !== undefined && { fatherName: parentName }),
        ...(parentContact !== undefined && { parentContact }),
        ...(address !== undefined && { address }),
        ...(dob !== undefined && { dob }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(attendancePercent !== undefined && { attendancePercent: parseFloat(String(attendancePercent)) }),
        ...(marksObtained !== undefined && { marksObtained: parseFloat(String(marksObtained)) }),
        ...(marksTotal !== undefined && { marksTotal: parseFloat(String(marksTotal)) }),
        ...(baseFee !== undefined && { baseFee: baseFee ? parseFloat(String(baseFee)) : 0 }),
        ...(aadhaarNumber !== undefined && { aadhaarNumber }),
      },
      create: {
        userId: user.id,
        rollNumber: rollNumber || null,
        registrationNo: registrationNo || null,
        grade: grade || null,
        className: className || null,
        board: board || null,
        scholarship: scholarship ? parseFloat(String(scholarship)) : 0,
        batch: batch || null,
        school: school || null,
        email: email || null,
        phone: phone || null,
        fatherName: fatherName || parentName || null,
        parentContact: parentContact || null,
        address: address || null,
        dob: dob || null,
        photoUrl: photoUrl || null,
        attendancePercent: attendancePercent ? parseFloat(String(attendancePercent)) : null,
        marksObtained: marksObtained ? parseFloat(String(marksObtained)) : null,
        marksTotal: marksTotal ? parseFloat(String(marksTotal)) : null,
        baseFee: baseFee ? parseFloat(String(baseFee)) : 0,
        aadhaarNumber: aadhaarNumber || null,
      },
    }));

    try {
      await withDbRetry(() => prisma.notification.create({
        data: {
          userId: user.id,
          title: '📝 Profile Updated',
          message: 'Your profile details have been updated by the administration.',
          type: 'SYSTEM',
          isRead: false
        }
      }));
    } catch (err) {
      console.error('Failed to send notification to student:', err);
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error updating student profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/students/[id] — Delete student account
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find the user first
    const user = await withDbRetry(() => prisma.user.findFirst({
      where: {
        OR: [{ username: id }, { id }],
        role: 'STUDENT',
      },
    }));

    if (!user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete the user (cascade will handle StudentProfile)
    await withDbRetry(() => prisma.user.delete({
      where: { id: user.id },
    }));

    return NextResponse.json({ success: true, message: 'Student deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
