export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ valid: false, error: "Not authenticated" });
    }

    const userId = (session.user as any).id;
    const sessionToken = (session.user as any).activeToken;

    const user = await withDbRetry(() => prisma.user.findUnique({
      where: { id: userId },
      select: { activeToken: true, isProfileVerified: true, onboardingCompleted: true }
    }));

    if (!user) {
      return NextResponse.json({ valid: false, error: "User not found" });
    }

    if (user.activeToken !== sessionToken) {
      return NextResponse.json({ valid: false, error: "Logged in elsewhere" });
    }

    return NextResponse.json({ 
      valid: true,
      isProfileVerified: user.isProfileVerified,
      onboardingCompleted: user.onboardingCompleted
    });
  } catch (error: any) {
    console.error("Error checking session:", error);
    return NextResponse.json({ valid: false, error: "Server error" }, { status: 500 });
  }
}
