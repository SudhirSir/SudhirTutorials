export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apps = await withDbRetry(() => prisma.admissionApplication.findMany({
      orderBy: { createdAt: 'desc' }
    }));

    return NextResponse.json({ applications: apps });
  } catch (error) {
    console.error("Error fetching admin applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = patchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { id, status } = validation.data;

    const updated = await withDbRetry(() => prisma.admissionApplication.update({
      where: { id },
      data: { status }
    }));

    return NextResponse.json({ success: true, application: updated });
  } catch (error) {
    console.error("Error updating admission application status:", error);
    return NextResponse.json({ error: "Failed to update application status" }, { status: 500 });
  }
}
