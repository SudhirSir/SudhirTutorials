import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Delete OTP
    await withDbRetry(() => prisma.otpVerification.delete({
      where: { email },
    }));

    const userRole = session.user.role?.toUpperCase();

    if (userRole === 'STUDENT') {
      await withDbRetry(() => prisma.studentProfile.upsert({
        where: { userId: session.user.id },
        update: { email, emailVerified: true },
        create: {
          userId: session.user.id,
          email,
          emailVerified: true
        }
      }));
    } else if (userRole === 'TEACHER' || userRole === 'ADMIN') {
      await withDbRetry(() => prisma.teacherProfile.upsert({
        where: { userId: session.user.id },
        update: { email, emailVerified: true },
        create: {
          userId: session.user.id,
          email,
          emailVerified: true
        }
      }));
    }

    // Create system notification
    try {
      await withDbRetry(() => prisma.notification.create({
        data: {
          userId: session.user.id,
          title: '📧 Email Verified',
          message: `Your email address has been successfully verified to: ${email}`,
          type: 'SYSTEM',
          isRead: false
        }
      }));
    } catch (err) {
      console.error('Failed to create notification:', err);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in verify-email API:', error);
    return NextResponse.json({ error: 'Failed to verify email: ' + error.message }, { status: 500 });
  }
}
