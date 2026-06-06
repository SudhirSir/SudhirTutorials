import { prisma, withDbRetry } from './prisma';

export async function getLateFineSettings() {
  try {
    const settings = await withDbRetry(() => prisma.systemSetting.findMany({
      where: {
        key: { in: ['perDayFine', 'flatFineAfter10Days'] }
      }
    }));
    
    let perDayFine = 10;
    let flatFineAfter10Days = 100;
    
    for (const s of settings) {
      if (s.key === 'perDayFine') {
        perDayFine = parseFloat(s.value);
        if (isNaN(perDayFine)) perDayFine = 10;
      }
      if (s.key === 'flatFineAfter10Days') {
        flatFineAfter10Days = parseFloat(s.value);
        if (isNaN(flatFineAfter10Days)) flatFineAfter10Days = 100;
      }
    }
    
    return { perDayFine, flatFineAfter10Days };
  } catch (err) {
    console.warn("Failed to fetch late fine settings from DB, using default values:", err);
    return { perDayFine: 10, flatFineAfter10Days: 100 };
  }
}
