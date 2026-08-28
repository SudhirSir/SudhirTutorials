import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // onboarding logic
    if (token?.role && token.role !== 'ADMIN') {
      if (token.mustChangePassword || !token.onboardingCompleted) {
        if (!path.startsWith('/onboarding') && !path.startsWith('/api/onboarding') && !path.startsWith('/api/auth')) {
          return NextResponse.redirect(new URL("/onboarding", req.url));
        }
      } else if (!token.isProfileVerified) {
        if (!path.startsWith('/waiting-verification') && !path.startsWith('/api/onboarding') && !path.startsWith('/api/auth')) {
          return NextResponse.redirect(new URL("/waiting-verification", req.url));
        }
      }
    }

    if (path.startsWith('/onboarding') && token?.onboardingCompleted && !token.mustChangePassword) {
      return NextResponse.redirect(new URL(`/dashboard/${(token?.role as string)?.toLowerCase() || 'student'}`, req.url));
    }

    if (path.startsWith('/waiting-verification') && (token?.isProfileVerified || token?.role === 'ADMIN')) {
      return NextResponse.redirect(new URL(`/dashboard/${(token?.role as string)?.toLowerCase() || 'student'}`, req.url));
    }

    if (path.startsWith("/dashboard/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    if (path.startsWith("/dashboard/teacher") && token?.role !== "TEACHER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (path.startsWith("/dashboard/student")) {
      if (token?.role !== "STUDENT") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (token?.isStoreUser) {
        return NextResponse.redirect(new URL("/dashboard/store", req.url));
      }
    }

    if (path.startsWith("/dashboard/store")) {
      if (!token?.isStoreUser) {
        return NextResponse.redirect(new URL("/store-login", req.url));
      }
    }

    // Protect Admin API routes
    if (path.startsWith("/api/admin") && !path.startsWith("/api/admin/ai/ppt") && token?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // Protect Teacher API routes (will be added in future features)
    if (path.startsWith("/api/teacher") && token?.role !== "TEACHER" && token?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Teachers only" }, { status: 403 });
    }

    
    // Protect Student API routes (except Guru Ji AI routes which are also accessible by Teachers)
    if (path.startsWith("/api/student") && !path.startsWith("/api/student/guru-ji") && token?.role !== "STUDENT" && token?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Students only" }, { status: 403 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/admin/:path*", "/api/teacher/:path*", "/api/student/:path*", "/onboarding", "/waiting-verification"],
};
