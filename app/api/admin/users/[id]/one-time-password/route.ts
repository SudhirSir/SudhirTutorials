import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

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

    // 3. Generate temporary password matching policy (at least 8 chars, 1 lower, 1 upper, 1 digit, 1 special)
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const symbols = "!@#$%^&*";
    const p1 = lowercase[crypto.randomInt(lowercase.length)];
    const p2 = uppercase[crypto.randomInt(uppercase.length)];
    const p3 = digits[crypto.randomInt(digits.length)];
    const p4 = symbols[crypto.randomInt(symbols.length)];
    let rest = "";
    const allChars = lowercase + uppercase + digits + symbols;
    for (let i = 0; i < 6; i++) {
      rest += allChars[crypto.randomInt(allChars.length)];
    }
    const tempPassword = (p1 + p2 + p3 + p4 + rest).split('').sort(() => crypto.randomInt(100) - 50).join('');

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
