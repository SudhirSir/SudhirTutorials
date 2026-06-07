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

    // Role-based Access Control (RBAC) to prevent IDOR
    if (session.user.role !== 'ADMIN') {
      if (session.user.role === 'STUDENT') {
        if (targetUserId !== session.user.id && user.role !== 'TEACHER') {
          return NextResponse.json({ error: 'Forbidden: Access Denied' }, { status: 403 });
        }
      } else if (session.user.role === 'TEACHER') {
        if (targetUserId !== session.user.id && user.role !== 'STUDENT') {
          return NextResponse.json({ error: 'Forbidden: Access Denied' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden: Access Denied' }, { status: 403 });
      }
    }

    let profile = user.role === 'STUDENT'
      ? user.studentProfile
      : (user.role === 'TEACHER' || user.role === 'ADMIN')
      ? user.teacherProfile
      : null;

    // Strip sensitive contact/financial fields of teachers from student viewers
    if (session.user.role === 'STUDENT' && user.role === 'TEACHER' && profile) {
      profile = {
        id: (profile as any).id,
        userId: (profile as any).userId,
        subject: (profile as any).subject,
        qualification: (profile as any).qualification,
        experience: (profile as any).experience,
        photoUrl: (profile as any).photoUrl,
        email: (profile as any).email
      } as any;
    }

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

    // Validate inputs
    if (name !== undefined) {
      if (name.length > 150 || !/^[a-zA-Z\s]+$/.test(name)) {
        return NextResponse.json({ error: 'Name must contain only alphabets and spaces, and be at most 150 characters long.' }, { status: 400 });
      }
    }
    if (fatherName !== undefined) {
      if (fatherName && (fatherName.length > 150 || !/^[a-zA-Z\s]+$/.test(fatherName))) {
        return NextResponse.json({ error: "Father's name must contain only alphabets and spaces, and be at most 150 characters long." }, { status: 400 });
      }
    }
    if (address !== undefined) {
      if (address && address.length > 150) {
        return NextResponse.json({ error: 'Address must be at most 150 characters long.' }, { status: 400 });
      }
    }
    if (phone !== undefined && phone !== null && phone !== '') {
      if (!/^\d{10}$/.test(phone)) {
        return NextResponse.json({ error: 'Phone number must be exactly 10 digits.' }, { status: 400 });
      }
    }
    if (parentContact !== undefined && parentContact !== null && parentContact !== '') {
      if (!/^\d{10}$/.test(parentContact)) {
        return NextResponse.json({ error: 'Parent contact must be exactly 10 digits.' }, { status: 400 });
      }
    }

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

    const isAdmin = session.user.role === 'ADMIN';

    // Update name and photoUrl on User
    if ((name !== undefined && isAdmin) || photoUrl !== undefined) {
      await withDbRetry(() => prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name !== undefined && isAdmin && { name }),
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
          // Only admin can update className
          ...(className !== undefined && isAdmin && { className }),
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
          className: isAdmin ? (className || null) : null,
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
