"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { SessionGuard } from "./SessionGuard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <SessionGuard />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}
