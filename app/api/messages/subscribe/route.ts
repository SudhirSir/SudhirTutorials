import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { messageEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    let isClosed = false;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const enqueue = (data: string) => {
          if (isClosed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            cleanup();
          }
        };

        // Immediately confirm connection
        enqueue('{"type":"connected"}');

        // Keep-alive ping every 20s (Vercel times out idle connections at 25s)
        const pingInterval = setInterval(() => {
          enqueue('{"type":"ping"}');
        }, 20000);

        const onMessage = (data: any) => {
          // Only send events relevant to this user
          if (
            data.senderId === userId || 
            data.receiverId === userId || 
            data.deletedByUserId === userId ||
            (data.groupId && data.memberIds?.includes(userId))
          ) {
            enqueue(JSON.stringify(data));
          }
        };

        messageEmitter.on('message', onMessage);

        const cleanup = () => {
          if (isClosed) return;
          isClosed = true;
          clearInterval(pingInterval);
          messageEmitter.off('message', onMessage);
          try { controller.close(); } catch {}
        };

        req.signal.addEventListener('abort', cleanup);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Prevent nginx buffering
      },
    });
  } catch (error) {
    console.error('[SSE] Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
