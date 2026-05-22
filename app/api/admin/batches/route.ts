export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const batchSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Batch name too short").max(50),
  className: z.string().optional(),
  subjects: z.string().optional(),
  defaultFee: z.number().optional(),
  courseId: z.string().min(1, "Course is required"),
  teacherUsernames: z.array(z.string()).optional(),
  studentUsernames: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batches = await withDbRetry(() => prisma.batch.findMany({
      include: {
        course: { select: { name: true } },
        teachers: { select: { name: true, username: true } },
        students: { 
          select: { 
            name: true, 
            username: true,
            studentProfile: {
              select: {
                baseFee: true
              }
            }
          } 
        },
        schedules: true,
        _count: { select: { students: true } }
      },
    }));
    return NextResponse.json({ batches });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = batchSchema.safeParse(body);
    if (!validation.success)
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );

    const { name, courseId, teacherUsernames, studentUsernames, className, subjects, defaultFee } = validation.data;

    // Connect teachers
    const teachers = teacherUsernames?.length
      ? await withDbRetry(() => prisma.user.findMany({ where: { username: { in: teacherUsernames }, role: { in: ['TEACHER', 'ADMIN'] } } }))
      : [];

    // Connect students
    const students = studentUsernames?.length
      ? await withDbRetry(() => prisma.user.findMany({ where: { username: { in: studentUsernames }, role: 'STUDENT' } }))
      : [];

    const batch = await withDbRetry(() => prisma.batch.create({
      data: {
        name,
        className,
        subjects,
        defaultFee: defaultFee || 0,
        courseId,
        teachers: { connect: teachers.map((t: any) => ({ id: t.id })) },
        students: { connect: students.map((s: any) => ({ id: s.id })) }
      },
      include: {
        course: { select: { name: true } },
        teachers: { select: { name: true } },
        _count: { select: { students: true } }
      }
    }));

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, courseId, teacherUsernames, studentUsernames, className, subjects, defaultFee } = body;
    if (!id) return NextResponse.json({ error: 'Missing batch ID' }, { status: 400 });

    // Find teachers and students
    const teachers = teacherUsernames ? await withDbRetry(() => prisma.user.findMany({ where: { username: { in: teacherUsernames } } })) : [];
    const students = studentUsernames ? await withDbRetry(() => prisma.user.findMany({ where: { username: { in: studentUsernames } } })) : [];

    const batch = await withDbRetry(() => prisma.batch.update({
      where: { id },
      data: {
        name,
        courseId,
        className,
        subjects,
        defaultFee: defaultFee ? Number(defaultFee) : 0,
        teachers: { set: teachers.map((t: any) => ({ id: t.id })) },
        students: { set: students.map((s: any) => ({ id: s.id })) }
      }
    }));

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    await withDbRetry(() => prisma.batch.delete({ where: { id } }));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
