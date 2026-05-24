import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch fresh user data from DB to bypass NextAuth session cache lag
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password, email, phone, parentName, parentContact, recoveryPin } = await req.json();

    const updateData: any = {
      onboardingCompleted: true,
      isProfileVerified: false
    };

    if (password && user.mustChangePassword) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
      updateData.mustChangePassword = false;
    }

    if (recoveryPin) {
      updateData.recoveryPinHash = await bcrypt.hash(recoveryPin, 10);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    if (user.role === 'STUDENT') {
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: { email, phone, fatherName: parentName, parentContact },
        create: {
          userId: user.id,
          email,
          phone,
          fatherName: parentName,
          parentContact
        }
      });
    } else if (user.role === 'TEACHER') {
      // Not collecting specific profile info for teacher yet, but we ensure profile is verified.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to process onboarding' }, { status: 500 });
  }
}
