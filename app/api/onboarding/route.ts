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
      where: { id: session.user.id },
      include: {
        studentProfile: true,
        teacherProfile: true
      }
    }));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { 
      password, 
      email, 
      phone, 
      parentName, 
      parentContact, 
      className, 
      board, 
      school, 
      address, 
      dob, 
      gender, 
      aadhaarNumber, 
      otp 
    } = body;

    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    const cleanPhone = phone ? String(phone).trim() : '';
    const cleanParentName = parentName ? String(parentName).trim() : '';
    const cleanParentContact = parentContact ? String(parentContact).trim() : '';
    const cleanClassName = className ? String(className).trim() : '';
    const cleanBoard = board ? String(board).trim() : '';
    const cleanSchool = school ? String(school).trim() : '';
    const cleanAddress = address ? String(address).trim() : '';
    const cleanPassword = password ? String(password).trim() : '';
    const cleanOtp = otp ? String(otp).trim() : '';

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email address is required for verification.' }, { status: 400 });
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const isOAuthNewUser = user.passwordHash === 'OAUTH_PENDING_PASSWORD' || user.isStoreUser;
    const existingProfileEmail = user.role === 'STUDENT' ? user.studentProfile?.email : user.teacherProfile?.email;
    const existingProfileEmailVerified = user.role === 'STUDENT' ? user.studentProfile?.emailVerified : user.teacherProfile?.emailVerified;
    const isAlreadyVerified = Boolean(existingProfileEmailVerified && existingProfileEmail && existingProfileEmail.trim().toLowerCase() === cleanEmail);

    if (!isOAuthNewUser && !isAlreadyVerified) {
      if (!cleanOtp) {
        return NextResponse.json({ error: 'Verification OTP code is required.' }, { status: 400 });
      }

      // Verify the OTP
      const otpRecord = await withDbRetry(() => prisma.otpVerification.findUnique({
        where: { email: cleanEmail },
      }));

      if (!otpRecord || String(otpRecord.otp).trim() !== cleanOtp) {
        return NextResponse.json({ error: 'Invalid verification OTP code. Please check and try again.' }, { status: 400 });
      }

      if (new Date() > otpRecord.expiresAt) {
        return NextResponse.json({ error: 'Verification OTP has expired. Please send a new OTP.' }, { status: 400 });
      }
    }

    // Password validation if setting new password or if mustChangePassword
    if (user.mustChangePassword && !cleanPassword) {
      return NextResponse.json({ error: 'You must set a new password to proceed.' }, { status: 400 });
    }

    if (cleanPassword) {
      if (cleanPassword.length < 8 ||
          !/[a-z]/.test(cleanPassword) ||
          !/[A-Z]/.test(cleanPassword) ||
          !/[0-9]/.test(cleanPassword) ||
          !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(cleanPassword)) {
        return NextResponse.json({ 
          error: 'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol.' 
        }, { status: 400 });
      }
    }

    if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'Phone number must be exactly 10 digits.' }, { status: 400 });
    }

    const effectiveParentContact = cleanParentContact || cleanPhone;
    if (user.role === 'STUDENT' && effectiveParentContact && !/^\d{10}$/.test(effectiveParentContact)) {
      return NextResponse.json({ error: 'Parent/Guardian contact number must be exactly 10 digits.' }, { status: 400 });
    }

    if (user.role === 'STUDENT' && cleanParentName) {
      if (cleanParentName.length > 150 || !/^[a-zA-Z\s.]+$/.test(cleanParentName)) {
        return NextResponse.json({ error: 'Parent/Guardian name must contain only alphabets, spaces and dots, and be at most 150 characters long.' }, { status: 400 });
      }
    }

    // Update only fields that exist on the User model
    const userUpdateData: {
      onboardingCompleted: boolean;
      isProfileVerified: boolean;
      passwordHash?: string;
      mustChangePassword?: boolean;
    } = {
      onboardingCompleted: true,
      isProfileVerified: user.isProfileVerified ? true : false
    };

    if (cleanPassword) {
      userUpdateData.passwordHash = await bcrypt.hash(cleanPassword, 10);
      userUpdateData.mustChangePassword = false;
    }

    await withDbRetry(() => prisma.user.update({
      where: { id: user.id },
      data: userUpdateData
    }));

    if (user.role === 'STUDENT') {
      await withDbRetry(() => prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: { 
          email: cleanEmail, 
          phone: cleanPhone || undefined, 
          fatherName: cleanParentName || undefined, 
          parentContact: effectiveParentContact || undefined,
          className: cleanClassName || undefined,
          board: cleanBoard || undefined,
          school: cleanSchool || undefined,
          address: cleanAddress || undefined,
          dob: dob || undefined,
          gender: gender || undefined,
          aadhaarNumber: aadhaarNumber || undefined,
          emailVerified: true 
        },
        create: {
          userId: user.id,
          email: cleanEmail, 
          phone: cleanPhone || null, 
          fatherName: cleanParentName || null, 
          parentContact: effectiveParentContact || null,
          className: cleanClassName || null,
          board: cleanBoard || null,
          school: cleanSchool || null,
          address: cleanAddress || null,
          dob: dob || null,
          gender: gender || null,
          aadhaarNumber: aadhaarNumber || null,
          emailVerified: true
        }
      }));
    } else if (user.role === 'TEACHER') {
      await withDbRetry(() => prisma.teacherProfile.upsert({
        where: { userId: user.id },
        update: { 
          email: cleanEmail, 
          phone: cleanPhone || undefined, 
          address: cleanAddress || undefined, 
          emailVerified: true 
        },
        create: {
          userId: user.id,
          email: cleanEmail,
          phone: cleanPhone || null,
          address: cleanAddress || null,
          emailVerified: true
        }
      }));
    }

    // Clean up OTP record now that updates succeeded
    if (!isOAuthNewUser && !isAlreadyVerified && cleanEmail) {
      try {
        await withDbRetry(() => prisma.otpVerification.delete({
          where: { email: cleanEmail },
        }));
      } catch (e) {
        // Non-fatal if already deleted
      }
    }

    return NextResponse.json({ 
      success: true,
      isProfileVerified: userUpdateData.isProfileVerified
    });
  } catch (error: any) {
    console.error("Error in onboarding API:", error);
    return NextResponse.json({ 
      error: error?.message || 'Failed to process onboarding' 
    }, { status: 500 });
  }
}

