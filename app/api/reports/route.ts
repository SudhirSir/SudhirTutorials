import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { title, message, reportedUserId, isBugReport, email, screenshot } = body;

    // Find all admins
    const admins = await withDbRetry(() => prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    }));

    if (admins.length === 0) {
      return NextResponse.json({ error: 'No admins found to receive report' }, { status: 404 });
    }

    // Prepare notifications for all admins
    const notifications = admins.map(admin => ({
      userId: admin.id,
      title: isBugReport ? `🐛 Bug Report / Suggestion: ${title}` : `⚠️ User Report: ${title}`,
      message: `${message}\n\nSubmitted by: ${session?.user?.email || 'Anonymous'}${email ? `\n[Email: ${email}]` : ''}${reportedUserId ? `\nTarget User ID: ${reportedUserId}` : ''}${screenshot ? `\n\n[Screenshot: ${screenshot}]` : ''}`,
      type: 'REPORT',
      isRead: false,
    }));

    // Insert all notifications in a transaction
    await withDbRetry(() => prisma.notification.createMany({
      data: notifications,
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
