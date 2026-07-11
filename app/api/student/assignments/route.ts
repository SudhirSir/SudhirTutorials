export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { materialId, fileUrl } = await req.json();

    if (!materialId || !fileUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if it's base64 and validate size (max 5MB) and format (PDF)
    if (fileUrl.startsWith('data:')) {
      const isPdf = fileUrl.startsWith('data:application/pdf');
      if (!isPdf) {
         return NextResponse.json({ error: 'Only PDF format is allowed for assignments' }, { status: 400 });
      }

      const base64Data = fileUrl.split(',')[1];
      if (base64Data) {
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 5 * 1024 * 1024) {
          return NextResponse.json({ error: 'File size exceeds the 5 MB limit' }, { status: 400 });
        }
      }
    }

    // Check if the material is an assignment
    const material = await withDbRetry(() => prisma.material.findUnique({
      where: { id: materialId }
    }));

    if (!material || !material.isAssignment) {
      return NextResponse.json({ error: 'Invalid assignment material' }, { status: 400 });
    }

    if (material.deadline && new Date() > new Date(material.deadline)) {
      return NextResponse.json({ error: 'Deadline has passed' }, { status: 400 });
    }

    // Upsert or Create submission
    const existing = await withDbRetry(() => prisma.assignmentSubmission.findFirst({
      where: { materialId, studentId: session.user.id }
    }));

    if (existing) {
      // Update
      const submission = await withDbRetry(() => prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: { url: fileUrl }
      }));
      return NextResponse.json({ success: true, submission });
    }

    const submission = await withDbRetry(() => prisma.assignmentSubmission.create({
      data: {
        materialId,
        studentId: session.user.id,
        url: fileUrl
      }
    }));

    return NextResponse.json({ success: true, submission });

  } catch (error) {
    console.error("Assignment submission error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
