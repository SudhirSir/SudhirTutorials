import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';

const userSchema = z.object({
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
  name: z.string().min(2, "Name must be at least 2 characters").max(25, "Name must be at most 25 characters").regex(/^[a-zA-Z\s]+$/, "Name must contain only alphabets and spaces"),
  className: z.string().optional(),
  board: z.string().optional(),
  subject: z.string().optional(),
  scholarship: z.union([z.string(), z.number()]).optional().transform(val => {
    if (val === undefined || val === '') return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  }),
  fatherName: z.string().optional().refine(val => !val || (val.length <= 25 && /^[a-zA-Z\s]+$/.test(val)), "Father's name must contain only alphabets and spaces, and be at most 25 characters long"),
  phone: z.string().optional().refine(val => !val || /^\d{10}$/.test(val), "Phone number must be exactly 10 digits"),
  email: z.string().optional(),
  address: z.string().optional().refine(val => !val || val.length <= 60, "Address must be at most 60 characters long"),
  dob: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = userSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error.issues[0].message 
      }, { status: 400 });
    }

    const { role, name, className, board, scholarship, subject, fatherName, phone, email, address, dob } = validation.data;

    // Generate temporary password matching policy (at least 8 chars, 1 lower, 1 upper, 1 digit, 1 special)
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const symbols = "!@#$%^&*";
    const p1 = lowercase[crypto.randomInt(lowercase.length)];
    const p2 = uppercase[crypto.randomInt(uppercase.length)];
    const p3 = digits[crypto.randomInt(digits.length)];
    const p4 = symbols[crypto.randomInt(symbols.length)];
    let rest = "";
    const allChars = lowercase + uppercase + digits + symbols;
    for (let i = 0; i < 6; i++) {
      rest += allChars[crypto.randomInt(allChars.length)];
    }
    const password = (p1 + p2 + p3 + p4 + rest).split('').sort(() => crypto.randomInt(100) - 50).join('');

    // Generate specific ID sequentially
    let username = '';
    
    if (role === 'TEACHER') {
      const lastTeacher = await withDbRetry(() => prisma.user.findFirst({
        where: { role: 'TEACHER', username: { startsWith: 'FAC' } },
        orderBy: { username: 'desc' } // Gets the highest FAC string
      }));
      let nextNumber = 10100;
      if (lastTeacher && lastTeacher.username) {
        const num = parseInt(lastTeacher.username.replace('FAC', ''), 10);
        if (!isNaN(num)) nextNumber = num + 1;
      }
      username = `FAC${nextNumber}`;
    } else if (role === 'STUDENT') {
      const lastStudent = await withDbRetry(() => prisma.user.findFirst({
        where: { role: 'STUDENT', username: { startsWith: 'STU' } },
        orderBy: { username: 'desc' }
      }));
      let nextNumber = 101;
      if (lastStudent && lastStudent.username) {
        const num = parseInt(lastStudent.username.replace('STU', ''), 10);
        if (!isNaN(num)) nextNumber = num + 1;
      }
      username = `STU${nextNumber.toString().padStart(5, '0')}`;
    } else if (role === 'ADMIN') {
      const lastAdmin = await withDbRetry(() => prisma.user.findFirst({
        where: { role: 'ADMIN', username: { startsWith: 'ADM' } },
        orderBy: { username: 'desc' }
      }));
      let nextNumber = 101;
      if (lastAdmin && lastAdmin.username) {
        const num = parseInt(lastAdmin.username.replace('ADM', ''), 10);
        if (!isNaN(num)) nextNumber = num + 1;
      }
      username = `ADM${nextNumber}`;
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if uniquely generated exists (rare but possible in race conditions)
    const existing = await withDbRetry(() => prisma.user.findUnique({ where: { username } }));
    if (existing) {
      return NextResponse.json({ error: "ID collision, please try again." }, { status: 500 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Auto reflect class default fee if it exists in settings
    let defaultFeeVal = 0;
    if (role === 'STUDENT' && className) {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: `classFee_${className}` }
      });
      if (setting && setting.value) {
        defaultFeeVal = parseFloat(setting.value) || 0;
      }
    }

    const newUser = await withDbRetry(() => prisma.user.create({
      data: {
        username,
        name: name || '',
        passwordHash,
        role: role,
        mustChangePassword: true,
        studentProfile: role === 'STUDENT' ? {
          create: {
            className: className || null,
            board: board || null,
            scholarship: scholarship !== undefined ? scholarship : 0,
            baseFee: defaultFeeVal,
            fatherName: fatherName || null,
            phone: phone || null,
            email: email || null,
            address: address || null,
            dob: dob || null,
          }
        } : undefined,
        teacherProfile: role === 'TEACHER' ? {
          create: {
            subject: subject || null,
          }
        } : undefined
      }
    }));

    return NextResponse.json({
      success: true,
      user: {
        username: newUser.username,
        role: newUser.role,
        password: password // Returning once to display to admin
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
