import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as any;
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file uploaded or invalid file format' }, { status: 400 });
    }

    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds the 3MB limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const rawName = file.name || 'uploaded_file';
    const safeName = rawName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = safeName.includes('.') ? safeName.split('.').pop() || 'dat' : 'dat';
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const filename = `${uniqueId}.${ext}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'messages');
    await mkdir(uploadDir, { recursive: true });

    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/messages/${filename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      name: rawName,
      type: file.type || 'application/octet-stream',
      size: file.size
    });
  } catch (error) {
    console.error('Error in media upload API:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + (error as any).message }, { status: 500 });
  }
}
