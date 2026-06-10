import { NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { prisma, withDbRetry } from '@/lib/prisma';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const position = formData.get('position') as string;
    const experience = formData.get('experience') as string;
    const coverLetter = formData.get('coverLetter') as string || '';
    const file = formData.get('file') as any;

    // Validation
    if (!name || !email || !phone || !position || !experience) {
      return NextResponse.json({ error: 'All mandatory fields (Name, Email, Phone, Position, Experience) are required.' }, { status: 400 });
    }

    let resumeUrl = '';
    if (file && typeof file !== 'string' && typeof file.arrayBuffer === 'function') {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Resume file size exceeds the 5MB limit.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const rawName = file.name || 'resume.pdf';
      const safeName = rawName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const ext = safeName.includes('.') ? safeName.split('.').pop() || 'pdf' : 'pdf';
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const filename = `Resume_${name.replace(/\s+/g, '_')}_${uniqueId}.${ext}`;

      const uploadDir = join(process.cwd(), 'public', 'uploads', 'resumes');
      await mkdir(uploadDir, { recursive: true });

      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);

      resumeUrl = `/uploads/resumes/${filename}`;
    }

    const appNumber = `APP-JOB-${Date.now().toString().slice(-6)}`;
    const newApplication = await withDbRetry(() => prisma.jobApplication.create({
      data: {
        appNumber,
        name,
        email,
        phone,
        position,
        experience,
        coverLetter: coverLetter || null,
        resumeUrl: resumeUrl || null,
      }
    }));

    // Send notifications to all Admins in DB
    try {
      const admins = await withDbRetry(() => prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      }));
      
      if (admins.length > 0) {
        const notifications = admins.map(admin => ({
          userId: admin.id,
          title: `💼 New Job Application: ${name}`,
          message: `A new application for the position of "${position}" has been submitted by ${name}.\nExperience: ${experience}\nEmail: ${email}\nPhone: ${phone}`,
          type: 'SYSTEM',
          isRead: false,
        }));

        await withDbRetry(() => prisma.notification.createMany({
          data: notifications,
        }));
      }
    } catch (err) {
      console.error('Failed to create notifications for new job application:', err);
    }

    return NextResponse.json({
      success: true,
      appNumber: appNumber,
      message: 'Application submitted successfully.'
    });
  } catch (error) {
    console.error('Error saving job application:', error);
    return NextResponse.json({ error: 'Failed to process application: ' + (error as any).message }, { status: 500 });
  }
}
