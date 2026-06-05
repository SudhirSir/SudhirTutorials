"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SessionGuard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Periodically check session validation (single login per user)
  useEffect(() => {
    if (status !== "authenticated") return;

    // Force re-authentication if tab was closed/reopened (sessionStorage is cleared) and accessing a protected route
    const isProtectedPath = pathname && (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/waiting-verification")
    );

    if (isProtectedPath && typeof window !== "undefined" && !sessionStorage.getItem('tabSessionActive')) {
      console.warn("New tab or browser session. Redirecting to login for re-authentication.");
      signOut({ callbackUrl: "/login?error=session_expired" });
      return;
    }

    let isMounted = true;

    const checkSession = async () => {
      if (typeof window !== "undefined" && (window as any).isLoggingOut) return;
      if (sessionStorage.getItem('isLoggingOut') === 'true') return;

      try {
        const res = await fetch("/api/auth/check-session");
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.valid === false && isMounted) {
          if (typeof window !== "undefined" && (window as any).isLoggingOut) return;
          if (sessionStorage.getItem('isLoggingOut') === 'true') return;
          console.warn("Session invalidated (logged in elsewhere or no session). Terminating session...");
          signOut({ callbackUrl: "/login" });
        }
      } catch (err) {
        if (typeof window !== "undefined" && (window as any).isLoggingOut) return;
        if (sessionStorage.getItem('isLoggingOut') === 'true') return;
        console.error("Failed to verify active session", err);
      }
    };

    // Check immediately on page load / path change
    checkSession();

    // Poll every 5 seconds to catch concurrent login in real-time
    const interval = setInterval(checkSession, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [status, pathname]);

  return null;
}

