"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { SessionGuard } from "./SessionGuard";
import { PushNotificationManager } from "./PushNotificationManager";
import { CapacitorBackButtonManager } from "./CapacitorBackButtonManager";
import { AppUpdateChecker } from "./AppUpdateChecker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <SessionGuard />
        <PushNotificationManager />
        <CapacitorBackButtonManager />
        <AppUpdateChecker />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}
