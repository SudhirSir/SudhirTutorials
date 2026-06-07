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

    const stream = new ReadableStream({
      start(controller) {
        // Send a connection established message
        controller.enqueue('data: {"type":"connected"}\n\n');

        // Periodically send ping to keep connection alive
        const pingInterval = setInterval(() => {
          if (isClosed) return;
          try {
            controller.enqueue('data: {"type":"ping"}\n\n');
          } catch (e) {
            cleanup();
          }
        }, 15000);

        const onMessage = (data: any) => {
          if (isClosed) return;
          // Send event if it's relevant to the current user
          if (data.senderId === userId || data.receiverId === userId) {
            try {
              controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
            } catch (e) {
              cleanup();
            }
          }
        };

        messageEmitter.on('message', onMessage);

        const cleanup = () => {
          if (isClosed) return;
          isClosed = true;
          clearInterval(pingInterval);
          messageEmitter.off('message', onMessage);
          try {
            controller.close();
          } catch (e) {}
        };

        // If the request is aborted (client disconnects), clean up
        req.signal.addEventListener('abort', cleanup);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('SSE Subscription Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
