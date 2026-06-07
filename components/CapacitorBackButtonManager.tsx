"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function CapacitorBackButtonManager() {
  const pathname = usePathname();

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
        
        // Remove any existing backButton listeners if we recreate
        if (backListener) {
          await backListener.remove();
        }

        backListener = await App.addListener('backButton', () => {
          if (!isListenerActive) return;

          const searchParams = new URLSearchParams(window.location.search);
          const tab = searchParams.get('tab');

          const isLandingPage = pathname === '/' || pathname === '/login' || pathname === '/register';
          const isDashboardLanding =
            (pathname === '/dashboard/admin' && (!tab || tab === 'overview')) ||
            (pathname === '/dashboard/teacher' && (!tab || tab === 'classes')) ||
            (pathname === '/dashboard/student' && (!tab || tab === 'dashboard'));

          if (isLandingPage || isDashboardLanding) {
            App.exitApp();
          } else {
            window.history.back();
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
  }, [pathname]);

  return null;
}
