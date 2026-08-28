"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled client exception caught by app error boundary:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      backgroundColor: "var(--background, #0a0a0c)",
      color: "var(--text, #ffffff)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      textAlign: "center",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background Orbs */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "300px",
        height: "300px",
        background: "radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%)",
        filter: "blur(40px)",
        pointerEvents: "none"
      }} />

      <div style={{
        background: "rgba(20, 20, 25, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "24px",
        padding: "3rem 2rem",
        maxWidth: "480px",
        width: "100%",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        zIndex: 1
      }}>
        <div style={{
          fontSize: "3rem",
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          ⚠️
        </div>

        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 0.5rem 0" }}>
            Something Went Wrong
          </h1>
          <p style={{ fontSize: "0.92rem", color: "rgba(255, 255, 255, 0.7)", margin: 0, lineHeight: 1.6 }}>
            We encountered a temporary display issue. Don't worry, your data and account are safe.
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem", width: "100%", marginTop: "0.5rem" }}>
          <button
            onClick={() => reset()}
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "14px",
              border: "none",
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)"
            }}
          >
            🔄 Try Again
          </button>

          <Link
            href="/"
            style={{
              flex: 1,
              padding: "0.85rem",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "transparent",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            🏠 Home Page
          </Link>
        </div>
      </div>
    </div>
  );
}
