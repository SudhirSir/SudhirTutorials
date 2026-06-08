"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function CapacitorBackButtonManager() {
  const router = useRouter();
  const routerRef = useRef(router);

  // Keep the router reference fresh so the listener always uses the current router
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let backListener: any = null;
    const lastBackPress = { current: 0 };

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

            console.log('[CapacitorBackButton] Press intercepted. Path:', cleanPathname, 'Tab:', tab, 'canGoBack:', canGoBack);

            // Check if we are on dashboard sub-tabs and redirect to home tab instead of exiting
            if (cleanPathname.startsWith('/dashboard/admin') && tab && tab !== 'overview') {
              if (routerRef.current) {
                routerRef.current.push('/dashboard/admin?tab=overview');
              } else {
                window.location.href = '/dashboard/admin?tab=overview';
              }
              return;
            }
            if (cleanPathname.startsWith('/dashboard/teacher') && tab && tab !== 'classes') {
              if (routerRef.current) {
                routerRef.current.push('/dashboard/teacher?tab=classes');
              } else {
                window.location.href = '/dashboard/teacher?tab=classes';
              }
              return;
            }
            if (cleanPathname.startsWith('/dashboard/student') && tab && tab !== 'dashboard') {
              if (routerRef.current) {
                routerRef.current.push('/dashboard/student?tab=dashboard');
              } else {
                window.location.href = '/dashboard/student?tab=dashboard';
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
            console.log('[CapacitorBackButton] Navigating back in WebView history');
            window.history.back();
          } catch (error) {
            console.error('[CapacitorBackButton] Error handling back button:', error);
            // Fallback: if everything else fails, let history.back() handle it or exit if no history
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
      if (backListener) {
        backListener.remove();
      }
    };
  }, []); // Run exactly once on mount to prevent duplicates/leaks

  return null;
}
