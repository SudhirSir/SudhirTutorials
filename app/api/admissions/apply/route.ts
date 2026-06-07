export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, withDbRetry } from '@/lib/prisma';
import { z } from 'zod';

const applySchema = z.object({
  name: z.string().min(2, "Name is too short").max(150, "Name must be at most 150 characters").regex(/^[a-zA-Z\s]+$/, "Name must contain only alphabets and spaces"),
  fatherName: z.string().min(2, "Father's name is too short").max(150, "Father's name must be at most 150 characters").regex(/^[a-zA-Z\s]+$/, "Father's name must contain only alphabets and spaces"),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  address: z.string().min(5, "Address is too short").max(150, "Address must be at most 150 characters"),
  className: z.string().min(1, "Class is required"),
  board: z.string().min(1, "Board is required"),
  program: z.string().min(1, "Program is required"),
  dob: z.string().min(1, "Date of birth is required"),
  message: z.string().optional().or(z.literal('')),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = applySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const data = validation.data;

    // Generate APPxxxx application number sequentially
    const lastApp = await withDbRetry(() => prisma.admissionApplication.findFirst({
      where: { appNumber: { startsWith: 'APP' } },
      orderBy: { appNumber: 'desc' }
    }));

    let nextNum = 1;
    if (lastApp && lastApp.appNumber) {
      const numPart = parseInt(lastApp.appNumber.replace('APP', ''), 10);
      if (!isNaN(numPart)) {
        nextNum = numPart + 1;
      }
    }

    const appNumber = `APP${nextNum.toString().padStart(4, '0')}`;

    const newApp = await withDbRetry(() => prisma.admissionApplication.create({
      data: {
        appNumber,
        name: data.name,
        fatherName: data.fatherName,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        className: data.className,
        board: data.board,
        program: data.program,
        dob: data.dob,
        status: 'PENDING'
      }
    }));

    return NextResponse.json({ success: true, appNumber: newApp.appNumber }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating admission application:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
