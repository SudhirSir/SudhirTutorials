export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, otp, newPassword } = await req.json();

    if (!username || !otp || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await withDbRetry(() => prisma.user.findUnique({
      where: { username },
      include: {
        studentProfile: true,
        teacherProfile: true
      }
    }));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const email = user.studentProfile?.email || user.teacherProfile?.email;
    if (!email) {
      return NextResponse.json({ error: 'No email address is registered on this account.' }, { status: 400 });
    }

    // Verify OTP
    const otpRecord = await withDbRetry(() => prisma.otpVerification.findUnique({
      where: { email },
    }));

    if (!otpRecord || otpRecord.otp !== otp) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: 'Verification code has expired.' }, { status: 400 });
    }

    // Delete verified OTP
    await withDbRetry(() => prisma.otpVerification.delete({
      where: { email },
    }));

    // Complexity validation
    if (newPassword.length < 8 ||
        !/[a-z]/.test(newPassword) ||
        !/[A-Z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) ||
        !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)) {
      return NextResponse.json({ error: 'New password does not meet complexity requirements (at least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character)' }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await withDbRetry(() => prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false // They just changed it manually
      }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
