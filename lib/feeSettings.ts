import { prisma, withDbRetry } from './prisma';

let cachedLateFineSettings: { perDayFine: number; flatFineAfter10Days: number; feeDueDay: number } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function clearLateFineSettingsCache() {
  cachedLateFineSettings = null;
  cacheTimestamp = 0;
}

export async function getLateFineSettings() {
  const now = Date.now();
  if (cachedLateFineSettings && (now - cacheTimestamp < CACHE_TTL_MS)) {
    return cachedLateFineSettings;
  }

  try {
    const settings = await withDbRetry(() => prisma.systemSetting.findMany({
      where: {
        key: { in: ['perDayFine', 'flatFineAfter10Days', 'feeDueDay'] }
      }
    }));
    
    let perDayFine = 10;
    let flatFineAfter10Days = 100;
    let feeDueDay = 12;
    
    for (const s of settings) {
      if (s.key === 'perDayFine') {
        perDayFine = parseFloat(s.value);
        if (isNaN(perDayFine)) perDayFine = 10;
      }
      if (s.key === 'flatFineAfter10Days') {
        flatFineAfter10Days = parseFloat(s.value);
        if (isNaN(flatFineAfter10Days)) flatFineAfter10Days = 100;
      }
      if (s.key === 'feeDueDay') {
        feeDueDay = parseInt(s.value, 10);
        if (isNaN(feeDueDay) || feeDueDay < 1 || feeDueDay > 31) feeDueDay = 12;
      }
    }
    
    cachedLateFineSettings = { perDayFine, flatFineAfter10Days, feeDueDay };
    cacheTimestamp = now;
    return cachedLateFineSettings;
  } catch (err) {
    console.warn("Failed to fetch late fine settings from DB, using default values:", err);
    return { perDayFine: 10, flatFineAfter10Days: 100, feeDueDay: 12 };
  }
}
