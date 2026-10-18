export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

function createClearCookieHeaders(): Headers {
  const headers = new Headers();

  // W3C Clear-Site-Data header to wipe all cookies and client storage automatically
  headers.set('Clear-Site-Data', '"cookies", "storage"');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('Pragma', 'no-cache');

  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
  ];

  // Also clear any NextAuth chunked cookies (next-auth.session-token.0 .. 50)
  for (let i = 0; i <= 50; i++) {
    cookieNames.push(`next-auth.session-token.${i}`);
    cookieNames.push(`__Secure-next-auth.session-token.${i}`);
  }

  const cookieAttrs = [
    'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax',
    'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  ];

  for (const name of cookieNames) {
    for (const attr of cookieAttrs) {
      headers.append('Set-Cookie', `${name}=; ${attr}`);
    }
  }

  return headers;
}

export async function GET(req: Request) {
  const headers = createClearCookieHeaders();
  headers.set('Content-Type', 'text/html; charset=utf-8');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resetting Session - SUDHIR TUTORIALS</title>
  <style>
    body {
      background: #0b0b0f;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1.5rem;
      text-align: center;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 2.5rem 2rem;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 { font-size: 1.35rem; margin-bottom: 0.75rem; color: #fff; }
    p { color: #9ca3af; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .btn {
      display: inline-block;
      background: #6366f1;
      color: #fff;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.95rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Resetting Session & Restoring Connection</h2>
    <p>Oversized session headers have been cleared. Redirecting you back to login...</p>
    <a href="/login" class="btn">Proceed to Login →</a>
  </div>
  <script>
    try {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach(function(c) {
        var name = c.split("=")[0].trim();
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    } catch(e) {}
    setTimeout(function() {
      window.location.href = '/login';
    }, 1500);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers,
  });
}

export async function POST() {
  const headers = createClearCookieHeaders();
  return NextResponse.json({ success: true, message: 'Cookies cleared successfully' }, { headers });
}
