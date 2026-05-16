import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password, email, phone, parentName, parentContact } = await req.json();

    const updateData: any = {
      onboardingCompleted: true,
      isProfileVerified: false
    };

    if (password && session.user.mustChangePassword) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
      updateData.mustChangePassword = false;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    });

    if (session.user.role === 'STUDENT') {
      await prisma.studentProfile.upsert({
        where: { userId: session.user.id },
        update: { email, phone, fatherName: parentName, parentContact },
        create: {
          userId: session.user.id,
          email,
          phone,
          fatherName: parentName,
          parentContact
        }
      });
    } else if (session.user.role === 'TEACHER') {
      // Not collecting specific profile info for teacher yet, but we ensure profile is verified.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to process onboarding' }, { status: 500 });
  }
}
