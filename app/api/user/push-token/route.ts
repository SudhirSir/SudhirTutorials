export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const tokenSchema = z.object({
  token: z.string().min(1, "Token cannot be empty"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = tokenSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { token } = validation.data;

    // Update user record with push token
    await withDbRetry(() => prisma.user.update({
      where: { id: session.user.id },
      data: { pushToken: token }
    }));

    return NextResponse.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    console.error("Error registering push token:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
