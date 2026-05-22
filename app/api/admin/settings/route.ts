import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await withDbRetry(() => prisma.systemSetting.findMany());
    const settingsMap = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    // Ensure defaults are present
    const perDayFine = settingsMap.perDayFine || "10";
    const flatFineAfter10Days = settingsMap.flatFineAfter10Days || "100";
    const razorpayLink = settingsMap.razorpayLink || "https://razorpay.me/@sudhirtutorials";

    return NextResponse.json({
      perDayFine: parseFloat(perDayFine),
      flatFineAfter10Days: parseFloat(flatFineAfter10Days),
      razorpayLink,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { perDayFine, flatFineAfter10Days, razorpayLink } = await req.json();

    if (perDayFine !== undefined) {
      await withDbRetry(() => prisma.systemSetting.upsert({
        where: { key: 'perDayFine' },
        update: { value: String(perDayFine) },
        create: { key: 'perDayFine', value: String(perDayFine) }
      }));
    }

    if (flatFineAfter10Days !== undefined) {
      await withDbRetry(() => prisma.systemSetting.upsert({
        where: { key: 'flatFineAfter10Days' },
        update: { value: String(flatFineAfter10Days) },
        create: { key: 'flatFineAfter10Days', value: String(flatFineAfter10Days) }
      }));
    }

    if (razorpayLink !== undefined) {
      const sanitized = razorpayLink.trim();
      if (sanitized) {
        await withDbRetry(() => prisma.systemSetting.upsert({
          where: { key: 'razorpayLink' },
          update: { value: sanitized },
          create: { key: 'razorpayLink', value: sanitized }
        }));
      }
    }

    await logActivity(
      session.user.id,
      'UPDATE_SETTINGS',
      `Updated system settings: per day fine = ₹${perDayFine}, flat after 10 days = ₹${flatFineAfter10Days}${razorpayLink ? ', Razorpay link updated' : ''}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
