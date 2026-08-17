import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user || !['ADMIN', 'TEACHER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Teacher access required.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as any;

    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file uploaded or invalid file format' }, { status: 400 });
    }

    // Set a generous 50MB limit for textbook notes PDF uploads
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds the 50MB limit.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const rawName = file.name || 'uploaded_notes.pdf';
    const filename = `${uniqueSuffix}-${rawName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Save to public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    return NextResponse.json({ 
      success: true, 
      fileUrl: `/uploads/${filename}` 
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload file: ' + (error.message || error) }, { status: 500 });
  }
}
