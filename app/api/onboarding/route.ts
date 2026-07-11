export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch fresh user data from DB to bypass NextAuth session cache lag
    const user = await withDbRetry(() => prisma.user.findUnique({
      where: { id: session.user.id }
    }));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password, email, phone, parentName, parentContact, otp } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required for verification.' }, { status: 400 });
    }
    const isOAuthNewUser = user.passwordHash === 'OAUTH_PENDING_PASSWORD';

    if (!isOAuthNewUser) {
      if (!otp) {
        return NextResponse.json({ error: 'Verification OTP code is required.' }, { status: 400 });
      }

      // Verify the OTP
      const otpRecord = await withDbRetry(() => prisma.otpVerification.findUnique({
        where: { email },
      }));

      if (!otpRecord || otpRecord.otp !== otp) {
        return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
      }

      if (new Date() > otpRecord.expiresAt) {
        return NextResponse.json({ error: 'Verification code has expired.' }, { status: 400 });
      }

      // Delete the verified OTP
      await withDbRetry(() => prisma.otpVerification.delete({
        where: { email },
      }));
    }

    if (password && user.mustChangePassword) {
      if (password.length < 8 ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/[0-9]/.test(password) ||
          !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
        return NextResponse.json({ error: 'Password does not meet complexity requirements' }, { status: 400 });
      }
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Phone number must be exactly 10 digits.' }, { status: 400 });
    }

    if (user.role === 'STUDENT' && parentContact && !/^\d{10}$/.test(parentContact)) {
      return NextResponse.json({ error: 'Parent/Guardian contact number must be exactly 10 digits.' }, { status: 400 });
    }

    if (user.role === 'STUDENT' && parentName) {
      if (parentName.length > 150 || !/^[a-zA-Z\s]+$/.test(parentName)) {
        return NextResponse.json({ error: 'Parent/Guardian name must contain only alphabets and spaces, and be at most 150 characters long.' }, { status: 400 });
      }
    }

    const updateData: any = {
      onboardingCompleted: true,
      isProfileVerified: false
    };

    if (password && user.mustChangePassword) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
      updateData.mustChangePassword = false;
    }

    await withDbRetry(() => prisma.user.update({
      where: { id: user.id },
      data: updateData
    }));

    if (user.role === 'STUDENT') {
      await withDbRetry(() => prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: { email, phone, fatherName: parentName, parentContact, emailVerified: true },
        create: {
          userId: user.id,
          email,
          phone,
          fatherName: parentName,
          parentContact,
          emailVerified: true
        }
      }));
    } else if (user.role === 'TEACHER') {
      await withDbRetry(() => prisma.teacherProfile.upsert({
        where: { userId: user.id },
        update: { email, phone, emailVerified: true },
        create: {
          userId: user.id,
          email,
          phone,
          emailVerified: true
        }
      }));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to process onboarding' }, { status: 500 });
  }
}
