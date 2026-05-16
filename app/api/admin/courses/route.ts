import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        _count: {
          select: { batches: true },
        },
      },
    });
    return NextResponse.json({ courses });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, description } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Course name is required' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: { name, description },
    });

    return NextResponse.json({ success: true, course });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
