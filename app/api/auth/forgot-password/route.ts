export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, recoveryPin, newPassword } = await req.json();

    if (!username || !recoveryPin || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await withDbRetry(() => prisma.user.findUnique({
      where: { username }
    }));

    if (!user || !user.recoveryPinHash) {
      return NextResponse.json({ error: 'User not found or Recovery PIN not set' }, { status: 404 });
    }

    const isPinValid = await bcrypt.compare(recoveryPin, user.recoveryPinHash);
    if (!isPinValid) {
      return NextResponse.json({ error: 'Incorrect Recovery PIN' }, { status: 401 });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await withDbRetry(() => prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false // They just changed it manually
      }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
