import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/profile — Get own profile (any role)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const targetUserId = userId || session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { studentProfile: true, teacherProfile: true }
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const profile = user.role === 'STUDENT'
      ? user.studentProfile
      : user.role === 'TEACHER'
      ? user.teacherProfile
      : null;

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      isProfileVerified: user.isProfileVerified,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt,
      profile
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/user/profile — Update own profile details & photo (any role)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, address, dob, photoUrl, subject, qualification, experience,
            fatherName, parentContact, school, className } = body;

    console.log(`[API PUT /api/user/profile] User ID: ${session.user.id}, Role: ${session.user.role}, Name: ${name}`);

    // Update name and photoUrl on User
    if (name !== undefined || photoUrl !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name !== undefined && { name }),
          ...(photoUrl !== undefined && { photoUrl }),
        }
      });
      console.log(`[API PUT /api/user/profile] Updated User model successfully.`);
    }

    const userRole = session.user.role?.toUpperCase();

    if (userRole === 'STUDENT') {
      console.log(`[API PUT /api/user/profile] Upserting StudentProfile for userId: ${session.user.id}`);
      await prisma.studentProfile.upsert({
        where: { userId: session.user.id },
        update: {
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(dob !== undefined && { dob }),
          ...(photoUrl !== undefined && { photoUrl }),
          ...(fatherName !== undefined && { fatherName }),
          ...(parentContact !== undefined && { parentContact }),
          ...(school !== undefined && { school }),
          ...(className !== undefined && { className }),
        },
        create: {
          userId: session.user.id,
          email: email || null,
          phone: phone || null,
          address: address || null,
          dob: dob || null,
          photoUrl: photoUrl || null,
          fatherName: fatherName || null,
          parentContact: parentContact || null,
          school: school || null,
          className: className || null,
        }
      });
      console.log(`[API PUT /api/user/profile] Upserted StudentProfile successfully.`);
    } else if (userRole === 'TEACHER') {
      console.log(`[API PUT /api/user/profile] Upserting TeacherProfile for userId: ${session.user.id}`);
      await prisma.teacherProfile.upsert({
        where: { userId: session.user.id },
        update: {
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(dob !== undefined && { dob }),
          ...(photoUrl !== undefined && { photoUrl }),
          ...(subject !== undefined && { subject }),
          ...(qualification !== undefined && { qualification }),
          ...(experience !== undefined && { experience }),
        },
        create: {
          userId: session.user.id,
          email: email || null,
          phone: phone || null,
          address: address || null,
          dob: dob || null,
          photoUrl: photoUrl || null,
          subject: subject || null,
          qualification: qualification || null,
          experience: experience || null,
        }
      });
      console.log(`[API PUT /api/user/profile] Upserted TeacherProfile successfully.`);
    } else {
      console.warn(`[API PUT /api/user/profile] Unknown or admin role: ${userRole}. Only updated basic User info.`);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[API PUT /api/user/profile] Error:', e);
    return NextResponse.json({ error: 'Server error: ' + e.message }, { status: 500 });
  }
}
