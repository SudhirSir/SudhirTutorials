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

        backListener = await App.addListener('backButton', ({ canGoBack }) => {
          if (!isListenerActive) return;

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

          const searchParams = new URLSearchParams(window.location.search);
          const tab = searchParams.get('tab');

          // Check if we are at the dashboard entry-point homes or root landing/login pages
          const isAdminHome = pathname === '/dashboard/admin' && (!tab || tab === 'overview');
          const isTeacherHome = pathname === '/dashboard/teacher' && (!tab || tab === 'classes');
          const isStudentHome = pathname === '/dashboard/student' && (!tab || tab === 'dashboard');
          const isExitPage = pathname === '/login' || pathname === '/';

          if (isExitPage || isAdminHome || isTeacherHome || isStudentHome || !canGoBack) {
            App.exitApp();
            return;
          }

          // Otherwise, navigate back in the WebView history
          window.history.back();
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
