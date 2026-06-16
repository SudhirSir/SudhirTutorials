import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP code are required.' }, { status: 400 });
    }

    const record = await withDbRetry(() => prisma.otpVerification.findUnique({
      where: { email },
    }));

    if (!record) {
      return NextResponse.json({ error: 'No verification request found for this email.' }, { status: 400 });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json({ error: 'Verification code has expired.' }, { status: 400 });
    }

    // Optional: delete the OTP record upon successful verification so it cannot be reused
    await withDbRetry(() => prisma.otpVerification.delete({
      where: { email },
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in verify-otp API:', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
