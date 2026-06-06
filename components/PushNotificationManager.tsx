"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { Capacitor } from "@capacitor/core";

export function PushNotificationManager() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only run if user is authenticated and running on a native platform (iOS/Android)
    if (status !== "authenticated" || !Capacitor.isNativePlatform()) {
      return;
    }

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

        // Register with Apple / Google to receive push token
        // SAFEGUARD: Temporarily disabled to prevent native crash because google-services.json is missing in android/app/.
        // Once FCM is configured with a google-services.json file, you can uncomment this line.
        console.warn("Push notifications permission granted, but native registration is bypassed because google-services.json is missing.");
        // await PushNotifications.register();

        // On success, we get a token
        await PushNotifications.addListener("registration", async (token) => {
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
          console.log("Push notification received in foreground:", notification);
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
  }, [status]);

  return null;
}
