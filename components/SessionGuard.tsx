"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SessionGuard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // 1. Detect page refresh / reload and enforce maximum of 3 refreshes
  useEffect(() => {
    if (status === "authenticated") {
      // If sessionStorage has no active tab flag, it means they closed the tab/browser previously or opened a new one. WIPE session!
      if (!sessionStorage.getItem('tabSessionActive')) {
        console.warn("New tab/window detected without an active tab session. Logging out for security.");
        signOut({ callbackUrl: "/login" });
        return;
      }

      const navigationEntries = performance.getEntriesByType('navigation');
      const isReload = navigationEntries.length > 0 && (navigationEntries[0] as PerformanceNavigationTiming).type === 'reload';
      
      if (isReload) {
        const storedCount = sessionStorage.getItem('reload_count');
        const currentCount = storedCount ? parseInt(storedCount, 10) : 0;
        const newCount = currentCount + 1;
        
        console.log(`Page refresh detected! Reload count: ${newCount}`);
        
        if (newCount > 3) {
          console.warn("Reload limit of 3 exceeded. Logging out...");
          sessionStorage.removeItem('reload_count');
          signOut({ callbackUrl: "/login" });
        } else {
          sessionStorage.setItem('reload_count', newCount.toString());
        }
      }
    } else if (status === "unauthenticated") {
      sessionStorage.removeItem('reload_count');
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
