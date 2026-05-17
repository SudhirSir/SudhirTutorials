import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const userSchema = z.object({
  role: z.enum(['STUDENT', 'TEACHER']),
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = userSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error.issues[0].message 
      }, { status: 400 });
    }

    const { role, name } = validation.data;

    // Generate cryptographically secure 8-character password
    const password = require('crypto').randomBytes(4).toString('hex').toUpperCase();


    // Generate specific ID sequentially
    let username = '';
    
    if (role === 'TEACHER') {
      const lastTeacher = await prisma.user.findFirst({
        where: { role: 'TEACHER', username: { startsWith: 'FAC' } },
        orderBy: { username: 'desc' } // Gets the highest FAC string
      });
      let nextNumber = 10100;
      if (lastTeacher && lastTeacher.username) {
        const num = parseInt(lastTeacher.username.replace('FAC', ''), 10);
        if (!isNaN(num)) nextNumber = num + 1;
      }
      username = `FAC${nextNumber}`;
    } else if (role === 'STUDENT') {
      const lastStudent = await prisma.user.findFirst({
        where: { role: 'STUDENT', username: { startsWith: 'STU' } },
        orderBy: { username: 'desc' }
      });
      let nextNumber = 101;
      if (lastStudent && lastStudent.username) {
        const num = parseInt(lastStudent.username.replace('STU', ''), 10);
        if (!isNaN(num)) nextNumber = num + 1;
      }
      username = `STU${nextNumber.toString().padStart(5, '0')}`;
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if uniquely generated exists (rare but possible in race conditions)
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "ID collision, please try again." }, { status: 500 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        username,
        name: name || '',
        passwordHash,
        role: role,
        mustChangePassword: true,
      }
    });

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
