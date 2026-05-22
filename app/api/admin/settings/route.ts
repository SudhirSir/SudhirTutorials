import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

async function ensureSystemSettingTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemSetting" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL
      );
    `);
  } catch (err) {
    console.error('Failed to auto-create SystemSetting table:', err);
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureSystemSettingTable();

    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc: any, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    // Ensure defaults are present
    const perDayFine = settingsMap.perDayFine || "10";
    const flatFineAfter10Days = settingsMap.flatFineAfter10Days || "100";

    return NextResponse.json({
      perDayFine: parseFloat(perDayFine),
      flatFineAfter10Days: parseFloat(flatFineAfter10Days),
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

    const { perDayFine, flatFineAfter10Days } = await req.json();

    await ensureSystemSettingTable();

    if (perDayFine !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'perDayFine' },
        update: { value: String(perDayFine) },
        create: { key: 'perDayFine', value: String(perDayFine) }
      });
    }

    if (flatFineAfter10Days !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: 'flatFineAfter10Days' },
        update: { value: String(flatFineAfter10Days) },
        create: { key: 'flatFineAfter10Days', value: String(flatFineAfter10Days) }
      });
    }

    await logActivity(
      session.user.id,
      'UPDATE_SETTINGS',
      `Updated late fines: per day = ₹${perDayFine}, flat after 10 days = ₹${flatFineAfter10Days}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

