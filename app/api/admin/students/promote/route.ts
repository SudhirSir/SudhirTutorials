import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Define promotion map for standard ordinal classes
    const promotionMap: Record<string, string> = {
      // Ordinals
      "1st": "2nd",
      "2nd": "3rd",
      "3rd": "4th",
      "4th": "5th",
      "5th": "6th",
      "6th": "7th",
      "7th": "8th",
      "8th": "9th",
      "9th": "10th",
      "10th": "11th (Sci)",
      "11th (Sci)": "12th (Sci)",
      "11th (Com)": "12th (Com)",
      "12th (Sci)": "Graduated",
      "12th (Com)": "Graduated",
      // Add standard Classes
      "Class 1": "Class 2",
      "Class 2": "Class 3",
      "Class 3": "Class 4",
      "Class 4": "Class 5",
      "Class 5": "Class 6",
      "Class 6": "Class 7",
      "Class 7": "Class 8",
      "Class 8": "Class 9",
      "Class 9": "Class 10",
      "Class 10": "Class 11",
      "Class 11": "Class 12",
      "Class 12": "Graduated",
    };

    // Retrieve all student profiles
    const studentProfiles = await withDbRetry(() => prisma.studentProfile.findMany({
      select: {
        id: true,
        className: true,
      }
    }));

    let promotedCount = 0;
    const updates: any[] = [];

    for (const profile of studentProfiles) {
      const currentClass = profile.className;
      if (!currentClass) continue;

      let nextClass = promotionMap[currentClass];

      // Handle custom Class X naming using regex fallback if not in the map
      if (!nextClass) {
        const match = currentClass.match(/^Class\s+(\d+)$/i);
        if (match) {
          const num = parseInt(match[1]);
          if (num < 12) {
            nextClass = `Class ${num + 1}`;
          } else if (num === 12) {
            nextClass = "Graduated";
          }
        }
      }

      if (nextClass && nextClass !== currentClass) {
        updates.push(
          prisma.studentProfile.update({
            where: { id: profile.id },
            data: { className: nextClass }
          })
        );
        promotedCount++;
      }
    }

    if (updates.length > 0) {
      // Execute all updates in a transaction
      await withDbRetry(() => prisma.$transaction(updates));
    }

    return NextResponse.json({ success: true, promotedCount });
  } catch (error: any) {
    console.error('Error promoting students:', error);
    return NextResponse.json({ error: 'Failed to promote students: ' + error.message }, { status: 500 });
  }
}
