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
        error: validation.error.errors[0].message 
      }, { status: 400 });
    }

    const { role, name } = validation.data;

    // Generate random 8-character password
    const password = Math.random().toString(36).slice(-8);

    // Generate specific ID
    const randomDigits = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits
    let username = '';
    
    if (role === 'TEACHER') {
      username = `FAC${randomDigits}`;
    } else if (role === 'STUDENT') {
      username = `STU${randomDigits}`;
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if uniquely generated exists (rare but possible)
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
