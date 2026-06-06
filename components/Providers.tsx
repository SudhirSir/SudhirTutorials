"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { SessionGuard } from "./SessionGuard";
import { PushNotificationManager } from "./PushNotificationManager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <SessionGuard />
        <PushNotificationManager />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}
