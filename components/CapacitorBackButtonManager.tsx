"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function CapacitorBackButtonManager() {
  const pathname = usePathname();
  const router = useRouter();
  // Debounce ref to prevent double-trigger on rapid back presses
  const lastBackPress = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isListenerActive = true;
    let backListener: any = null;

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

        backListener = await App.addListener('backButton', () => {
          if (!isListenerActive) return;

          // Debounce: ignore presses within 350ms of the last one
          const now = Date.now();
          if (now - lastBackPress.current < 350) return;
          lastBackPress.current = now;

          const searchParams = new URLSearchParams(window.location.search);
          const tab = searchParams.get('tab');

          // Only exit the app on the true entry-points where there is nowhere to go back to
          const isExitPage = pathname === '/login' || pathname === '/';

          if (isExitPage) {
            App.exitApp();
            return;
          }

          // For dashboard pages: pressing back when on the "home" tab navigates
          // to the home tab; on non-home tabs it switches back to the home tab.
          // This keeps the user inside the app instead of exiting.
          if (pathname.startsWith('/dashboard/admin')) {
            if (!tab || tab === 'overview') {
              // Already on home tab — do nothing (user must use OS task switcher to exit)
              // Alternatively, you could show an "Exit?" confirm dialog here
              return;
            } else {
              router.push('/dashboard/admin?tab=overview');
            }
          } else if (pathname.startsWith('/dashboard/teacher')) {
            if (!tab || tab === 'classes') {
              return;
            } else {
              router.push('/dashboard/teacher?tab=classes');
            }
          } else if (pathname.startsWith('/dashboard/student')) {
            if (!tab || tab === 'dashboard') {
              return;
            } else {
              router.push('/dashboard/student?tab=dashboard');
            }
          } else {
            // For any other page (forgot-password, settings, etc.) go back in history
            router.back();
          }
        });
      } catch (err) {
        console.warn('Capacitor App plugin not available:', err);
      }
    };

    setupListener();

    return () => {
      isListenerActive = false;
      if (backListener) {
        backListener.remove();
      }
    };
  }, [pathname, router]);

  return null;
}
