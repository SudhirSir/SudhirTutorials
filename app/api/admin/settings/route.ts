export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { clearLateFineSettingsCache } from '@/lib/feeSettings';

async function ensureSystemSettingTable() {
  try {
    await withDbRetry(() => prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemSetting" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL
      );
    `));
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

    const settings = await withDbRetry(() => prisma.systemSetting.findMany());
    const settingsMap = settings.reduce((acc: any, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    // Ensure defaults are present
    const perDayFine = settingsMap.perDayFine || "10";
    const flatFineAfter10Days = settingsMap.flatFineAfter10Days || "100";
    const feeDueDay = settingsMap.feeDueDay || "12";

    const classFees: Record<string, number> = {};
    for (const key of Object.keys(settingsMap)) {
      if (key.startsWith('classFee_')) {
        const className = key.replace('classFee_', '');
        classFees[className] = parseFloat(settingsMap[key]) || 0;
      }
    }

    return NextResponse.json({
      perDayFine: parseFloat(perDayFine),
      flatFineAfter10Days: parseFloat(flatFineAfter10Days),
      feeDueDay: parseInt(feeDueDay, 10),
      minAppVersion: settingsMap.minAppVersion || "1.0.0",
      classFees,
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

    const { perDayFine, flatFineAfter10Days, feeDueDay, minAppVersion, classFees } = await req.json();

    await ensureSystemSettingTable();

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

    if (feeDueDay !== undefined) {
      await withDbRetry(() => prisma.systemSetting.upsert({
        where: { key: 'feeDueDay' },
        update: { value: String(feeDueDay) },
        create: { key: 'feeDueDay', value: String(feeDueDay) }
      }));
    }

    if (minAppVersion !== undefined) {
      await withDbRetry(() => prisma.systemSetting.upsert({
        where: { key: 'minAppVersion' },
        update: { value: String(minAppVersion) },
        create: { key: 'minAppVersion', value: String(minAppVersion) }
      }));
    }

    if (classFees !== undefined) {
      // Find all existing keys starting with classFee_
      const existingSettings = await withDbRetry(() => prisma.systemSetting.findMany({
        where: { key: { startsWith: 'classFee_' } }
      }));
      
      const newKeys = Object.keys(classFees).map(c => `classFee_${c}`);
      
      // Delete any setting that is no longer in newKeys
      for (const s of existingSettings) {
        if (!newKeys.includes(s.key)) {
          await withDbRetry(() => prisma.systemSetting.delete({ where: { id: s.id } }));
        }
      }

      // Upsert new ones
      for (const [className, fee] of Object.entries(classFees)) {
        await withDbRetry(() => prisma.systemSetting.upsert({
          where: { key: `classFee_${className}` },
          update: { value: String(fee) },
          create: { key: `classFee_${className}`, value: String(fee) }
        }));
      }
    }

    await logActivity(
      session.user.id,
      'UPDATE_SETTINGS',
      `Updated settings: fines, class fees, minAppVersion = ${minAppVersion || 'not changed'}`
    );

    // Invalidate the late fine settings cache
    clearLateFineSettingsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
