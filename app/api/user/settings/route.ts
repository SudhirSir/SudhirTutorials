import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const profileSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        studentProfile: true,
        teacherProfile: true
      }
    });

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
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      
      const isMatch = await bcrypt.compare(currentPassword, user!.passwordHash);
      if (!isMatch) return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 });

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await prisma.user.update({
        where: { id: session.user.id },
        data: { passwordHash, mustChangePassword: false }
      });

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    if (action === 'PROFILE') {
      const validation = profileSchema.safeParse(body);
      if (!validation.success) return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });

      const { name, email, phone } = validation.data;

      // Update basic user name
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name }
      });

      // Update profile specific (currently only StudentProfile has email/phone in schema)
      if (session.user.role === 'STUDENT') {
        await prisma.studentProfile.upsert({
          where: { userId: session.user.id },
          update: { email, phone },
          create: { userId: session.user.id, email, phone }
        });
      }

      return NextResponse.json({ success: true, message: 'Profile updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
