import { NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';

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

    // Save metadata to job_applications.json
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    const applicationsPath = join(uploadDir, 'job_applications.json');
    let applications = [];
    try {
      const fileData = await readFile(applicationsPath, 'utf-8');
      applications = JSON.parse(fileData);
    } catch (e) {
      // File doesn't exist yet, start with empty array
    }

    const appNumber = `APP-JOB-${Date.now().toString().slice(-6)}`;
    const newApplication = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      appNumber,
      name,
      email,
      phone,
      position,
      experience,
      coverLetter,
      resumeUrl,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    applications.push(newApplication);
    await writeFile(applicationsPath, JSON.stringify(applications, null, 2));

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
