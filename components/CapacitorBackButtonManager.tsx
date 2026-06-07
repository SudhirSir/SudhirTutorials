"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function CapacitorBackButtonManager() {
  const pathname = usePathname();
  const router = useRouter();

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
          
          if (isLandingPage) {
            App.exitApp();
            return;
          }

          if (pathname.startsWith('/dashboard/admin')) {
            if (!tab || tab === 'overview') {
              App.exitApp();
            } else {
              router.push('/dashboard/admin?tab=overview');
            }
          } else if (pathname.startsWith('/dashboard/teacher')) {
            if (!tab || tab === 'classes') {
              App.exitApp();
            } else {
              router.push('/dashboard/teacher?tab=classes');
            }
          } else if (pathname.startsWith('/dashboard/student')) {
            if (!tab || tab === 'dashboard') {
              App.exitApp();
            } else {
              router.push('/dashboard/student?tab=dashboard');
            }
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
  }, [pathname, router]);

  return null;
}
