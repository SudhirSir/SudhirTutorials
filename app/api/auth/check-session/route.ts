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

    let isValid = false;
    if (user.activeToken === sessionToken) {
      isValid = true;
    } else if (user.activeToken && user.activeToken.includes('|')) {
      const parts = user.activeToken.split('|');
      let webToken = "";
      let appToken = "";
      parts.forEach(part => {
        if (part.startsWith('web:')) webToken = part.slice(4);
        else if (part.startsWith('app:')) appToken = part.slice(4);
      });
      if (sessionToken === webToken || sessionToken === appToken) {
        isValid = true;
      }
    }

    if (!isValid) {
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
