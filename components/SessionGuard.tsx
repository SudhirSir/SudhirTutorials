"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { safeSessionStorage } from "@/lib/safeStorage";

export function SessionGuard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Periodically check session validation (single login per user)
  useEffect(() => {
    if (status !== "authenticated") return;

    let isMounted = true;

    const checkSession = async () => {
      if (typeof window !== "undefined" && (window as any).isLoggingOut) return;
      if (safeSessionStorage.getItem('isLoggingOut') === 'true') return;

      try {
        const res = await fetch("/api/auth/check-session");
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.valid === false && isMounted) {
          if (typeof window !== "undefined" && (window as any).isLoggingOut) return;
          if (safeSessionStorage.getItem('isLoggingOut') === 'true') return;
          const errorType = data.error === "Logged in elsewhere" ? "concurrent_login" : "session_expired";
          signOut({ redirect: false }).then(() => {
            window.location.href = `/login?error=${errorType}`;
          });
        }
      } catch (err) {
        if (typeof window !== "undefined" && (window as any).isLoggingOut) return;
        if (safeSessionStorage.getItem('isLoggingOut') === 'true') return;
        console.error("Failed to verify active session", err);
      }
    };

    // Check immediately on page load / path change
    checkSession();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    // Poll every 30 seconds to catch concurrent login in real-time
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [status, pathname]);

  return null;
}

