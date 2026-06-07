export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one numeric digit")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/, "Password must contain at least one special symbol"),
});

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(150, "Name must be at most 150 characters").regex(/^[a-zA-Z\s]+$/, "Name must contain only alphabets and spaces"),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await withDbRetry(() => prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        studentProfile: true,
        teacherProfile: true
      }
    }));

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      user: {
        name: user.name,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        isProfileVerified: user.isProfileVerified,
        email: user.studentProfile?.email || '',
        phone: user.studentProfile?.phone || ''
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === 'PASSWORD') {
      const validation = passwordSchema.safeParse(body);
      if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

      const { currentPassword, newPassword } = validation.data;
      const user = await withDbRetry(() => prisma.user.findUnique({ where: { id: session.user.id } }));
      
      const isMatch = await bcrypt.compare(currentPassword, user!.passwordHash);
      if (!isMatch) return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 });

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await withDbRetry(() => prisma.user.update({
        where: { id: session.user.id },
        data: { passwordHash, mustChangePassword: false }
      }));

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    if (action === 'RECOVERY_PIN') {
      const { currentPassword, newPin } = body;
      if (!currentPassword || !newPin) {
        return NextResponse.json({ error: 'Missing current password or new PIN' }, { status: 400 });
      }
      if (newPin.length !== 6 || isNaN(Number(newPin))) {
        return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
      }

      const user = await withDbRetry(() => prisma.user.findUnique({ where: { id: session.user.id } }));
      const isMatch = await bcrypt.compare(currentPassword, user!.passwordHash);
      if (!isMatch) return NextResponse.json({ error: 'Password incorrect' }, { status: 400 });

      const recoveryPinHash = await bcrypt.hash(newPin, 10);
      await withDbRetry(() => prisma.user.update({
        where: { id: session.user.id },
        data: { recoveryPinHash }
      }));

      return NextResponse.json({ success: true, message: 'Secret PIN updated successfully' });
    }

    if (action === 'PROFILE') {
      const validation = profileSchema.safeParse(body);
      if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

      const { name, email, phone } = validation.data;

      // Update basic user name
      await withDbRetry(() => prisma.user.update({
        where: { id: session.user.id },
        data: { name }
      }));

      // Update profile specific (currently only StudentProfile has email/phone in schema)
      if (session.user.role === 'STUDENT') {
        await withDbRetry(() => prisma.studentProfile.upsert({
          where: { userId: session.user.id },
          update: { email, phone },
          create: { userId: session.user.id, email, phone }
        }));
      }

      return NextResponse.json({ success: true, message: 'Profile updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
