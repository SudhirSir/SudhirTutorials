import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name, email, phone, password, otp } = await req.json();

    if (!name || !email || !password || !otp) {
      return NextResponse.json({ error: 'Please provide all required fields.' }, { status: 400 });
    }

    // 1. Verify OTP
    const verification = await withDbRetry(() => prisma.otpVerification.findUnique({
      where: { email },
    }));

    if (!verification) {
      return NextResponse.json({ error: 'No verification code was requested for this email. Please request a new one.' }, { status: 400 });
    }

    if (verification.otp !== otp) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    if (new Date() > verification.expiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // 2. Check if email is already in use
    const existingProfile = await withDbRetry(() => prisma.studentProfile.findFirst({
      where: { email }
    }));

    if (existingProfile) {
      return NextResponse.json({ error: 'This email is already registered to an account.' }, { status: 400 });
    }

    // 3. Create the user
    // Generate a unique system username
    const username = `st_${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await withDbRetry(() => prisma.user.create({
      data: {
        name,
        username,
        passwordHash,
        role: 'STUDENT',
        isStoreUser: true,
        isProfileVerified: true, // Auto-approve store users who register via OTP
        mustChangePassword: false, // They just created it, no need to change
        onboardingCompleted: true, // They completed the onboarding via this form
        studentProfile: {
          create: {
            email,
            phone: phone || null,
            emailVerified: true // Since they just verified the OTP
          }
        }
      }
    }));

    // 4. Delete the OTP record
    await withDbRetry(() => prisma.otpVerification.delete({
      where: { email }
    }));

    return NextResponse.json({ success: true, message: 'Account created successfully', username });
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json({ error: 'Failed to create account. Please try again later.' }, { status: 500 });
  }
}
