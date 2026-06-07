export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    let formattedMessage = message;

    if (!isBugReport) {
      // Fetch reporter info from DB
      const reporterUser = await withDbRetry(() => prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, username: true, role: true }
      }));
      const reporterName = reporterUser?.name || 'Unknown';
      const reporterUsername = reporterUser?.username || 'Unknown';
      const reporterInfo = `Reporter: ${reporterName} (${reporterUsername})\nReporter ID/Username: ${reporterUsername}\nReporter Role: ${reporterUser?.role || 'Unknown'}`;

      let reportedUserInfo = "";
      if (reportedUserId) {
        const reportedUser = await withDbRetry(() => prisma.user.findUnique({
          where: { id: reportedUserId },
          select: { id: true, name: true, username: true, role: true }
        }));
        if (reportedUser) {
          reportedUserInfo = `\nReported Person: ${reportedUser.name || 'Unknown'} (${reportedUser.username || 'Unknown'})\nReported Person ID/Username: ${reportedUser.username || reportedUser.id}\nReported Person Role: ${reportedUser.role}`;
        } else {
          reportedUserInfo = `\nReported Person ID: ${reportedUserId}`;
        }
      }
      
      formattedMessage = `Reason/Problem:\n"${message}"\n\n---\n\n${reporterInfo}${reportedUserInfo}`;
    } else {
      formattedMessage = `${message}\n\nSubmitted by: ${session?.user?.email || session?.user?.name || 'Anonymous'}${email ? `\n[Email: ${email}]` : ''}${screenshot ? `\n\n[Screenshot: ${screenshot}]` : ''}`;
    }

    // Prepare notifications for all admins
    const notifications = admins.map(admin => ({
      userId: admin.id,
      title: isBugReport ? `🐛 Bug Report / Suggestion: ${title}` : `⚠️ User Report: ${title}`,
      message: formattedMessage,
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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reports = await withDbRetry(() => prisma.notification.findMany({
      where: { type: 'REPORT' },
      orderBy: { createdAt: 'desc' },
      take: 50
    }));

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing report ID' }, { status: 400 });
    }

    await withDbRetry(() => prisma.notification.delete({
      where: { id }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
