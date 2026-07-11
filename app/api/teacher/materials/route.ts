export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isTeacher = session.user.role === 'TEACHER';
    const materials = await withDbRetry(() => prisma.material.findMany({
      where: isTeacher ? { teacherId: session.user.id } : {},
      include: {
        course: { select: { name: true } },
        teacher: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }));

    return NextResponse.json({ materials });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, type, url, courseId, isAssignment, deadline } = await req.json();

    if (!title || !type || !url || !courseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Backend size check for base64 file uploads (max 3 MB)
    if (url && url.startsWith('data:')) {
      try {
        const base64Data = url.split(',')[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          if (buffer.length > 3 * 1024 * 1024) {
            return NextResponse.json({ error: 'Uploaded file size exceeds the 3 MB limit' }, { status: 400 });
          }
        }
      } catch (err) {
        console.error("Failed to parse base64 file size:", err);
      }
    }

    // RBAC: Verify teacher teaches at least one batch in this course (skip for Admin)
    if (session.user.role === 'TEACHER') {
      const teacherAssignment = await withDbRetry(() => prisma.batch.findFirst({
        where: { courseId, teachers: { some: { id: session.user.id } } }
      }));

      if (!teacherAssignment) {
        return NextResponse.json({ error: 'Access Denied: You do not teach this course' }, { status: 403 });
      }
    }

    const material = await withDbRetry(() => prisma.material.create({
      data: {
        title,
        type,
        url,
        courseId,
        teacherId: session.user.id,
        isAssignment: isAssignment === true,
        deadline: deadline ? new Date(deadline) : null
      },
      include: {
        course: { select: { name: true } }
      }
    }));

    // Notify all students enrolled in batches of this course
    try {
      const enrolledStudents = await withDbRetry(() => prisma.user.findMany({
        where: {
          role: 'STUDENT',
          studentBatches: {
            some: {
              courseId: courseId
            }
          }
        },
        select: { id: true }
      }));

      if (enrolledStudents.length > 0) {
        await withDbRetry(() => prisma.notification.createMany({
          data: enrolledStudents.map(student => ({
            userId: student.id,
            title: '📚 New Material Uploaded',
            message: `A new ${type.toLowerCase()} "${title}" has been uploaded for "${material.course.name}".`,
            type: 'SYSTEM',
            isRead: false
          }))
        }));
      }
    } catch (err) {
      console.error("Failed to notify students of uploaded material:", err);
    }

    return NextResponse.json({ success: true, material });
  } catch (error) {
    console.error("ERROR UPLOADING STUDY MATERIAL:", error);
    return NextResponse.json({ error: 'Failed to upload material' }, { status: 500 });
  }
}

// DELETE Study Material (For Teachers & Admins)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });

    const material = await withDbRetry(() => prisma.material.findUnique({
      where: { id }
    }));

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Teachers can only delete their own materials, Admins can delete any material
    if (session.user.role === 'TEACHER' && material.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await withDbRetry(() => prisma.material.delete({
      where: { id }
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR DELETING MATERIAL:", error);
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
  }
}
