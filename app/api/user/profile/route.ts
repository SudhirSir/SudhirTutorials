export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, withDbRetry } from '@/lib/prisma';

// GET /api/user/profile — Get own profile (any role)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const targetUserId = userId || session.user.id;

    const user = await withDbRetry(() => prisma.user.findUnique({
      where: { id: targetUserId },
      include: { studentProfile: true, teacherProfile: true }
    }));
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const profile = user.role === 'STUDENT'
      ? user.studentProfile
      : (user.role === 'TEACHER' || user.role === 'ADMIN')
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

    // Backend size check for base64 photo upload (max 3 MB)
    if (photoUrl && photoUrl.startsWith('data:')) {
      try {
        const base64Data = photoUrl.split(',')[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          if (buffer.length > 3 * 1024 * 1024) {
            return NextResponse.json({ error: 'Profile picture size exceeds the 3 MB limit' }, { status: 400 });
          }
        }
      } catch (err) {
        console.error("Failed to parse base64 photo size:", err);
      }
    }

    console.log(`[API PUT /api/user/profile] User ID: ${session.user.id}, Role: ${session.user.role}, Name: ${name}`);

    // Update name and photoUrl on User
    if (name !== undefined || photoUrl !== undefined) {
      await withDbRetry(() => prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name !== undefined && { name }),
          ...(photoUrl !== undefined && { photoUrl }),
        }
      }));
      console.log(`[API PUT /api/user/profile] Updated User model successfully.`);
    }

    const userRole = session.user.role?.toUpperCase();

    if (userRole === 'STUDENT') {
      console.log(`[API PUT /api/user/profile] Upserting StudentProfile for userId: ${session.user.id}`);
      await withDbRetry(() => prisma.studentProfile.upsert({
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
      }));
      console.log(`[API PUT /api/user/profile] Upserted StudentProfile successfully.`);
    } else if (userRole === 'TEACHER' || userRole === 'ADMIN') {
      console.log(`[API PUT /api/user/profile] Upserting TeacherProfile for userId: ${session.user.id} (Role: ${userRole})`);
      await withDbRetry(() => prisma.teacherProfile.upsert({
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
      }));
      console.log(`[API PUT /api/user/profile] Upserted TeacherProfile successfully.`);
    } else {
      console.warn(`[API PUT /api/user/profile] Unknown role: ${userRole}. Only updated basic User info.`);
    }

    // Notify the user of successful profile update
    try {
      await withDbRetry(() => prisma.notification.create({
        data: {
          userId: session.user.id,
          title: '👤 Profile Updated',
          message: 'Your personal profile information has been successfully updated.',
          type: 'SYSTEM',
          isRead: false
        }
      }));
    } catch (err) {
      console.error('[API PUT /api/user/profile] Failed to create notification:', err);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[API PUT /api/user/profile] Error:', e);
    return NextResponse.json({ error: 'Server error: ' + e.message }, { status: 500 });
  }
}
