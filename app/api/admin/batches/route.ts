export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const batchSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Batch name too short").max(50),
  className: z.string().optional(),
  subjects: z.string().optional(),
  courseId: z.string().min(1, "Course is required"),
  teacherUsernames: z.array(z.string()).optional(),
  studentUsernames: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        course: { select: { name: true } },
        teachers: { select: { name: true, username: true } },
        students: { select: { name: true, username: true } },
        schedules: true,
        _count: { select: { students: true } }
      },
    });
    return NextResponse.json({ batches });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = batchSchema.safeParse(body);
    if (!validation.success)
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );

    const { name, courseId, teacherUsernames, studentUsernames, className, subjects } = validation.data;

    // Connect teachers

    const teachers = teacherUsernames?.length
      ? await prisma.user.findMany({ where: { username: { in: teacherUsernames }, role: 'TEACHER' } })
      : [];

    // Connect students
    const students = studentUsernames?.length
      ? await prisma.user.findMany({ where: { username: { in: studentUsernames }, role: 'STUDENT' } })
      : [];

    const batch = await prisma.batch.create({
      data: {
        name,
        className,
        subjects,
        courseId,
        teachers: { connect: teachers.map((t: any) => ({ id: t.id })) },
        students: { connect: students.map((s: any) => ({ id: s.id })) }
      },
      include: {
        course: { select: { name: true } },
        teachers: { select: { name: true } },
        _count: { select: { students: true } }
      }
    });

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, courseId, teacherUsernames, studentUsernames, className, subjects } = body;
    if (!id) return NextResponse.json({ error: 'Missing batch ID' }, { status: 400 });

    // Find teachers and students
    const teachers = teacherUsernames ? await prisma.user.findMany({ where: { username: { in: teacherUsernames } } }) : [];
    const students = studentUsernames ? await prisma.user.findMany({ where: { username: { in: studentUsernames } } }) : [];

    const batch = await prisma.batch.update({
      where: { id },
      data: {
        name,
        courseId,
        className,
        subjects,
        teachers: { set: teachers.map((t: any) => ({ id: t.id })) },
        students: { set: students.map((s: any) => ({ id: s.id })) }
      }
    });

    return NextResponse.json({ success: true, batch });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    await prisma.batch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
