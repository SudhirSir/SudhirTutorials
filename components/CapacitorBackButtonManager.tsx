"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function CapacitorBackButtonManager() {
  const router = useRouter();
  const routerRef = useRef(router);
  const navigationCount = useRef(0);

  // Keep the router reference fresh so the listener always uses the current router
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let backListener: any = null;
    const lastBackPress = { current: 0 };

    // Track navigation count live via history pushState/replaceState and popstate
    const handleLocationChange = () => {
      navigationCount.current += 1;
      console.log('[CapacitorBackButton] Navigation detected. New count:', navigationCount.current);
    };

    window.addEventListener('popstate', handleLocationChange);

    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPush.apply(this, args);
      handleLocationChange();
    };

    window.history.replaceState = function(...args) {
      originalReplace.apply(this, args);
      handleLocationChange();
    };

    const setupListener = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) {
          return;
        }

        const { App } = await import('@capacitor/app');

        // Remove any existing backButton listener before adding a new one
        if (backListener) {
          await backListener.remove();
        }

        backListener = await App.addListener('backButton', ({ canGoBack }) => {
          try {
            // Debounce: ignore presses within 350ms of the last one
            const now = Date.now();
            if (now - lastBackPress.current < 350) return;
            lastBackPress.current = now;

            // Dispatch a custom event to allow open modals to intercept back press
            const event = new CustomEvent('backbuttonpress', { cancelable: true });
            window.dispatchEvent(event);
            if (event.defaultPrevented) {
              return;
            }

            // Read pathname and tab parameters LIVE from the window at press-time
            const pathname = window.location.pathname;
            const cleanPathname = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
            const searchParams = new URLSearchParams(window.location.search);
            const tab = searchParams.get('tab');

            console.log('[CapacitorBackButton] Press. Path:', cleanPathname, 'Tab:', tab, 'Count:', navigationCount.current, 'canGoBack:', canGoBack);

            // Check if we are on dashboard sub-tabs
            const isSubTab = 
              (cleanPathname.startsWith('/dashboard/admin') && tab && tab !== 'overview') ||
              (cleanPathname.startsWith('/dashboard/teacher') && tab && tab !== 'classes') ||
              (cleanPathname.startsWith('/dashboard/student') && tab && tab !== 'dashboard');

            if (isSubTab) {
              if (navigationCount.current > 0) {
                console.log('[CapacitorBackButton] Going back stepwise');
                // Adjust count: popstate will fire and add +1, so we do -2 for a net -1
                navigationCount.current = Math.max(0, navigationCount.current - 2); 
                window.history.back();
              } else {
                console.log('[CapacitorBackButton] No history, redirecting to home');
                if (cleanPathname.startsWith('/dashboard/admin')) {
                  routerRef.current.push('/dashboard/admin?tab=overview');
                } else if (cleanPathname.startsWith('/dashboard/teacher')) {
                  routerRef.current.push('/dashboard/teacher?tab=classes');
                } else if (cleanPathname.startsWith('/dashboard/student')) {
                  routerRef.current.push('/dashboard/student?tab=dashboard');
                }
              }
              return;
            }

            // Check if we are at the dashboard entry-point homes or root landing/login pages
            const isAdminHome = cleanPathname.startsWith('/dashboard/admin') && (!tab || tab === 'overview');
            const isTeacherHome = cleanPathname.startsWith('/dashboard/teacher') && (!tab || tab === 'classes');
            const isStudentHome = cleanPathname.startsWith('/dashboard/student') && (!tab || tab === 'dashboard');
            const isExitPage = cleanPathname === '/login' || cleanPathname === '/' || cleanPathname === '';

            if (isExitPage || isAdminHome || isTeacherHome || isStudentHome || !canGoBack) {
              console.log('[CapacitorBackButton] Exiting app');
              App.exitApp();
              return;
            }

            // Otherwise, navigate back in the WebView history
            console.log('[CapacitorBackButton] Navigating back stepwise');
            navigationCount.current = Math.max(0, navigationCount.current - 2);
            window.history.back();
          } catch (error) {
            console.error('[CapacitorBackButton] Error handling back button:', error);
            if (canGoBack) {
              window.history.back();
            } else {
              App.exitApp();
            }
          }
        });
      } catch (err) {
        console.warn('Capacitor App plugin not available:', err);
      }
    };

    setupListener();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      if (backListener) {
        backListener.remove();
      }
    };
  }, []);

  return null;
}
