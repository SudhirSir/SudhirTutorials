import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
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
      {/* Glow ambient background lights */}
      <div style={{
        position: "absolute",
        top: "30%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "350px",
        height: "350px",
        background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
        filter: "blur(50px)",
        pointerEvents: "none"
      }} />

      <div style={{
        background: "rgba(20, 20, 25, 0.9)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "28px",
        padding: "3.5rem 2.5rem",
        maxWidth: "500px",
        width: "100%",
        boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        zIndex: 1
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <Image src="/logo.png" alt="Sudhir Tutorials Logo" width={40} height={40} style={{ objectFit: "contain" }} />
          <span style={{ fontWeight: 900, fontSize: "1.2rem" }}>
            <span style={{ color: "#ef4444" }}>SUDHIR</span> <span style={{ color: "#3b82f6" }}>TUTORIALS</span>
          </span>
        </div>

        <div style={{
          fontSize: "4rem",
          fontWeight: 900,
          background: "linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1
        }}>
          404
        </div>

        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "#ffffff" }}>
            Page Not Found
          </h2>
          <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.7)", margin: 0, lineHeight: 1.6 }}>
            The link or page you are looking for may have moved or no longer exists.
          </p>
        </div>

        <Link
          href="/"
          style={{
            width: "100%",
            padding: "0.9rem",
            borderRadius: "14px",
            border: "none",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "0.95rem",
            textDecoration: "none",
            display: "inline-block",
            boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
            marginTop: "0.5rem"
          }}
        >
          Return to Home Page →
        </Link>
      </div>
    </div>
  );
}
