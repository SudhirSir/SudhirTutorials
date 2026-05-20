export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/students/[id] — Fetch full student profile by username
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Find by username (STU*****) or internal id
    const user = await prisma.user.findFirst({
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
    });

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
    } = body;

    // Find the user first
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: id }, { id }],
        role: 'STUDENT',
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Update name and isActive on the User model if provided
    if (name !== undefined || isActive !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          ...(name !== undefined && { name }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
      });
    }

    if (batch !== undefined) {
      // Clear previous batches
      await prisma.user.update({
        where: { id: user.id },
        data: { studentBatches: { set: [] } }
      });
      
      if (batch) {
        const matchedBatch = await prisma.batch.findFirst({
          where: { OR: [{ name: batch }, { id: batch }] }
        });
        if (matchedBatch) {
          await prisma.user.update({
            where: { id: user.id },
            data: { studentBatches: { connect: { id: matchedBatch.id } } }
          });
        }
      }
    }

    // Upsert the StudentProfile
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        ...(rollNumber !== undefined && { rollNumber }),
        ...(registrationNo !== undefined && { registrationNo }),
        ...(grade !== undefined && { grade }),
        ...(className !== undefined && { className }),
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
      },
      create: {
        userId: user.id,
        rollNumber: rollNumber || null,
        registrationNo: registrationNo || null,
        grade: grade || null,
        className: className || null,
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
      },
    });

    try {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: '📝 Profile Updated',
          message: 'Your profile details have been updated by the administration.',
          type: 'SYSTEM',
          isRead: false
        }
      });
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
    const { id } = await params;

    // Find the user first
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: id }, { id }],
        role: 'STUDENT',
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Delete the user (cascade will handle StudentProfile)
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({ success: true, message: 'Student deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
