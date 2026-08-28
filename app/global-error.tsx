"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global uncaught exception:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: "#0a0a0c",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          textAlign: "center",
          padding: "2rem",
          maxWidth: "440px",
          width: "100%"
        }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>⚡</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, margin: "0 0 0.5rem 0" }}>
            Sudhir Tutorials
          </h1>
          <p style={{ color: "#a1a1aa", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            An unexpected application error occurred. Click below to reload the platform.
          </p>
          <button
            onClick={() => reset()}
            style={{
              width: "100%",
              padding: "0.9rem",
              borderRadius: "14px",
              border: "none",
              background: "linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(239, 68, 68, 0.3)"
            }}
          >
            Reload Page ➔
          </button>
        </div>
      </body>
    </html>
  );
}
