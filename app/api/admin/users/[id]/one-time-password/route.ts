import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;

    // 1. Authenticate and check if the current user is an ADMIN
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin rights required.' }, { status: 403 });
    }

    // 2. Find target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // 3. Generate a cryptographically secure 8-character temporary one-time password
    const crypto = require('crypto');
    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. 'F3A8C9DE'

    // 4. Hash and update
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true, // Force reset on their next login!
      }
    });

    return NextResponse.json({
      success: true,
      username: targetUser.username,
      oneTimePassword: tempPassword
    });

  } catch (error: any) {
    console.error("Error generating one-time password:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
