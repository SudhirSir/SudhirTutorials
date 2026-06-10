import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const applications = await withDbRetry(() => prisma.jobApplication.findMany({
      orderBy: { createdAt: 'desc' }
    }));

    return NextResponse.json({ success: true, applications });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch job applications: ' + (error as any).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'ID and Status are required.' }, { status: 400 });
    }

    const updated = await withDbRetry(() => prisma.jobApplication.update({
      where: { id },
      data: { status }
    }));

    return NextResponse.json({ success: true, message: `Application status updated to ${status}.`, application: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update application: ' + (error as any).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Application ID is required.' }, { status: 400 });
    }

    await withDbRetry(() => prisma.jobApplication.delete({
      where: { id }
    }));

    return NextResponse.json({ success: true, message: 'Application deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete application: ' + (error as any).message }, { status: 500 });
  }
}
