"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SessionGuard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // 1. Detect page refresh / reload
  useEffect(() => {
    if (status === "authenticated") {
      const navigationEntries = performance.getEntriesByType('navigation');
      const isReload = navigationEntries.length > 0 && (navigationEntries[0] as PerformanceNavigationTiming).type === 'reload';
      
      if (isReload) {
        console.log("Page refresh detected! Terminating session...");
        signOut({ callbackUrl: "/login" });
      }
    }
  }, [status]);

  // 2. Periodically check session validation (single login per user)
  useEffect(() => {
    if (status !== "authenticated") return;

    let isMounted = true;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/check-session");
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.valid === false && isMounted) {
          console.warn("Session invalidated (logged in elsewhere or no session). Terminating session...");
          signOut({ callbackUrl: "/login" });
        }
      } catch (err) {
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
