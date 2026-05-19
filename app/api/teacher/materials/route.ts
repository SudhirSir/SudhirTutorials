import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isTeacher = session.user.role === 'TEACHER';
    const materials = await prisma.material.findMany({
      where: isTeacher ? { teacherId: session.user.id } : {},
      include: {
        course: { select: { name: true } },
        teacher: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

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

    const { title, type, url, courseId } = await req.json();

    if (!title || !type || !url || !courseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // RBAC: Verify teacher teaches at least one batch in this course (skip for Admin)
    if (session.user.role === 'TEACHER') {
      const teacherAssignment = await prisma.batch.findFirst({
        where: { courseId, teachers: { some: { id: session.user.id } } }
      });

      if (!teacherAssignment) {
        return NextResponse.json({ error: 'Access Denied: You do not teach this course' }, { status: 403 });
      }
    }

    const material = await prisma.material.create({
      data: {
        title,
        type,
        url,
        courseId,
        teacherId: session.user.id
      },
      include: {
        course: { select: { name: true } }
      }
    });

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

    const material = await prisma.material.findUnique({
      where: { id }
    });

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Teachers can only delete their own materials, Admins can delete any material
    if (session.user.role === 'TEACHER' && material.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.material.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR DELETING MATERIAL:", error);
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
  }
}
