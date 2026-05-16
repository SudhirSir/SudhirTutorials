import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: { passwordHash },
      create: {
        username: 'admin',
        name: 'Master Admin',
        passwordHash,
        role: 'ADMIN',
        mustChangePassword: false,
      }
    });

    return NextResponse.json({ success: true, admin });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
