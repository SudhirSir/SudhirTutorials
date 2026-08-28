"use client";

import React, { useState, useEffect, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { safeSessionStorage } from "@/lib/safeStorage";

export default function StoreLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Mode: sign-in vs registration
  const [isRegistering, setIsRegistering] = useState(false);

  // Sign In State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Registration State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push("/dashboard/store");
    }
  }, [status, session, router]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      if (!username || !password) {
        setError("Please enter both email/username and password.");
        setLoading(false);
        return;
      }

      try {
        safeSessionStorage.setItem("tabSessionActive", "true");
        const res = await signIn("credentials", {
          redirect: false,
          username,
          password,
          role: "student",
          isApp: Capacitor.isNativePlatform().toString()
        });

        if (res?.error) {
          if (res.error === "USER_NOT_FOUND") {
            setError("Account not found. Please register to purchase.");
          } else if (res.error === "INVALID_PASSWORD") {
            setError("Invalid password. Please try again.");
          } else if (res.error === "ROLE_MISMATCH") {
            setError("This account is not registered as a storefront student.");
          } else {
            setError("Failed to sign in. Please check your credentials.");
          }
          safeSessionStorage.removeItem("tabSessionActive");
          setLoading(false);
        } else {
          safeSessionStorage.setItem("onboarding_allowed", "true");
          router.push("/dashboard/store");
        }
      } catch (err) {
        console.error("Login error:", err);
        setError("An unexpected error occurred during sign in.");
        safeSessionStorage.removeItem("tabSessionActive");
        setLoading(false);
      }
    },
    [username, password, router]
  );

  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setRegError("");

      if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
        setRegError("Please fill in all required fields.");
        return;
      }

      if (regPhone && !/^\d{10}$/.test(regPhone)) {
        setRegError("Phone number must be exactly 10 digits.");
        return;
      }

      setRegLoading(true);
      try {
        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: regEmail.trim(), type: "REGISTRATION" })
        });
        const data = await res.json();
        if (res.ok) {
          setOtpSent(true);
        } else {
          setRegError(data.error || "Failed to send verification OTP.");
        }
      } catch (err) {
        console.error(err);
        setRegError("Network error while sending verification OTP.");
      } finally {
        setRegLoading(false);
      }
    },
    [regName, regEmail, regPassword, regPhone]
  );

  const handleVerifyOtpAndRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setRegError("");

      if (!regOtp || regOtp.trim().length < 4) {
        setRegError("Please enter a valid OTP code.");
        return;
      }

      setRegLoading(true);
      try {
        const verifyRes = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: regEmail.trim(),
            otp: regOtp.trim(),
            type: "REGISTRATION"
          })
        });

        if (!verifyRes.ok) {
          const vData = await verifyRes.json();
          setRegError(vData.error || "Invalid or expired OTP code.");
          setRegLoading(false);
          return;
        }

        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: regName.trim(),
            email: regEmail.trim(),
            phone: regPhone.trim() || undefined,
            password: regPassword,
            role: "STUDENT",
            isStoreRegistration: true
          })
        });

        const regData = await regRes.json();
        if (regRes.ok) {
          sessionStorage.setItem("tabSessionActive", "true");
          const authRes = await signIn("credentials", {
            redirect: false,
            username: regEmail.trim(),
            password: regPassword,
            role: "student",
            isApp: Capacitor.isNativePlatform().toString()
          });

          if (authRes?.ok) {
            sessionStorage.setItem("onboarding_allowed", "true");
            router.push("/dashboard/store");
          } else {
            setIsRegistering(false);
            setUsername(regEmail.trim());
            setError("Account created successfully! Please sign in.");
          }
        } else {
          setRegError(regData.error || "Registration failed.");
        }
      } catch (err) {
        console.error(err);
        setRegError("Network error during registration.");
      } finally {
        setRegLoading(false);
      }
    },
    [regOtp, regEmail, regName, regPhone, regPassword, router]
  );

  if (status === "loading") {
    return <Spinner center size="lg" />;
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", position: "relative" }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Header Title */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🛍️</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)", margin: "0 0 0.5rem 0" }}>
            ST Store Login
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: 0 }}>
            {isRegistering
              ? "Create your account to access tests & notes"
              : "Sign in to access your purchased tests & study notes"}
          </p>
        </div>

        <Card variant="glass">
          {error && (
            <div style={{ color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "0.85rem", borderRadius: "10px", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              ⚠️ {error}
            </div>
          )}

          {regError && (
            <div style={{ color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "0.85rem", borderRadius: "10px", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              ⚠️ {regError}
            </div>
          )}

          {!isRegistering ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Input
                label="Email / Username"
                placeholder="name@example.com or STS00101"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div style={{ textAlign: "right", marginTop: "0.35rem" }}>
                  <Link href="/forgot-password" style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading}>
                Sign In to Store
              </Button>
            </form>
          ) : (
            <form onSubmit={!otpSent ? handleSendOtp : handleVerifyOtpAndRegister} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {!otpSent ? (
                <>
                  <Input label="Full Name" placeholder="John Doe" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                  <Input label="Email Address" type="email" placeholder="name@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  <Input label="Phone Number (Optional)" placeholder="10-digit mobile number" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} maxLength={10} />
                  <Input label="Password" type="password" placeholder="Min 6 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />

                  <Button type="submit" variant="primary" size="lg" fullWidth isLoading={regLoading}>
                    Send Email OTP
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="info" style={{ alignSelf: "center" }}>
                    OTP Sent to {regEmail}
                  </Badge>
                  <Input label="Enter Verification Code" placeholder="4-6 digit OTP" value={regOtp} onChange={(e) => setRegOtp(e.target.value)} required />

                  <Button type="submit" variant="primary" size="lg" fullWidth isLoading={regLoading}>
                    Verify & Complete Signup
                  </Button>

                  <Button type="button" variant="ghost" size="sm" onClick={() => setOtpSent(false)}>
                    Edit Email Address
                  </Button>
                </>
              )}
            </form>
          )}

          <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.95rem", color: "var(--text-muted)" }}>
            {!isRegistering ? (
              <>
                New user?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setRegError("");
                  }}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
                >
                  Create Account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setRegError("");
                  }}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
