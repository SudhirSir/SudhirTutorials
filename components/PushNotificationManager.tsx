"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Capacitor } from "@capacitor/core";

export function PushNotificationManager() {
  const { data: session, status } = useSession();
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; body: string }>>([]);

  useEffect(() => {
    // Only run if user is authenticated and running on a native platform (iOS/Android)
    if (status !== "authenticated" || !Capacitor.isNativePlatform()) {
      return;
    }

    let isListenerActive = true;

    async function initPush() {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.warn("Push notification permission not granted:", permStatus.receive);
          return;
        }

        // Create default channel for Android 8.0+ background notifications with high importance (5)
        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'default',
            name: 'Default Channel',
            description: 'Default notification channel',
            importance: 5, // 5 = high/max importance for heads-up banners with sound
            visibility: 1, // 1 = public visibility
            sound: 'default',
            vibration: true
          });
        }

        // Register with Apple / Google to receive push token
        await PushNotifications.register();

        // On success, we get a token
        await PushNotifications.addListener("registration", async (token) => {
          if (!isListenerActive) return;
          console.log("Push registration success, token:", token.value);
          try {
            await fetch("/api/user/push-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: token.value }),
            });
          } catch (e) {
            console.error("Failed to upload push token:", e);
          }
        });

        // On error
        await PushNotifications.addListener("registrationError", (error) => {
          console.error("Push registration error:", error);
        });

        // Show toast or alert when notification is received in foreground
        await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          if (!isListenerActive) return;
          console.log("Push notification received in foreground:", notification);
          
          const id = Math.random().toString();
          setToasts((prev) => [
            ...prev,
            {
              id,
              title: notification.title || "Notification",
              body: notification.body || "",
            },
          ]);

          // Auto-dismiss after 4 seconds
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }, 4000);
        });

        // Handle action performed when user taps on the notification
        await PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
          console.log("Push notification action performed:", notification);
        });

      } catch (err) {
        console.error("Failed to initialize push notifications:", err);
      }
    }

    initPush();

    return () => {
      isListenerActive = false;
    };
  }, [status]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: "1rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 99999,
      width: "calc(100% - 2rem)",
      maxWidth: "400px",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      pointerEvents: "none"
    }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{
          pointerEvents: "auto",
          background: "var(--glass-bg)",
          backdropFilter: "blur(16px) saturate(180%)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "1rem",
          boxShadow: "var(--shadow-lg)",
          color: "var(--text)",
          animation: "toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          gap: "1rem"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.1rem" }}>🔔</span>
              <span>{toast.title}</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.4" }}>{toast.body}</div>
          </div>
          <button 
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "1rem",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              marginTop: "2px",
              opacity: 0.7,
              transition: "opacity 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.7"}
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateY(-20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
