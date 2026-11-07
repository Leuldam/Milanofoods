"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";

type PushApp = "admin" | "miniapp";

function decodeApplicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function PushNotificationButton({ app }: { app: PushApp }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [message, setMessage] = useState("");

  const appPath = app === "admin" ? "/admin" : "/miniapp";
  const workerPath = app === "admin" ? "/admin-sw.js" : "/miniapp-sw.js";

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/push-subscriptions")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to check notification setup.");
        return response.json() as Promise<{ publicKey: string | null }>;
      })
      .then(async ({ publicKey: key }) => {
        if (!active) return;
        setPublicKey(key);
        if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
        const registration = await navigator.serviceWorker.getRegistration(appPath);
        if (!registration) return;
        const subscription = await registration.pushManager.getSubscription();
        if (active) {
          setEnabled(Boolean(subscription));
          if (!subscription && "Notification" in window && Notification.permission === "denied") {
            setMessage("Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.");
          }
        }
      })
      .catch(() => {
        if (active) setMessage("Could not check notification settings.");
      })
      .finally(() => {
        if (active) setCheckingSetup(false);
      });

    return () => {
      active = false;
    };
  }, [app, appPath]);

  async function toggleNotifications() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!publicKey) {
        throw new Error(
          "Server push alerts are not configured. Set the WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, and WEB_PUSH_SUBJECT environment variables, then deploy.",
        );
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("This browser does not support push notifications.");
      }
      if (Notification.permission === "denied") {
        throw new Error("Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.");
      }

      const telegramWindow = window as Window & {
        Telegram?: { WebApp?: { initData?: string } };
      };
      if (app === "miniapp" && telegramWindow.Telegram?.WebApp?.initData) {
        throw new Error("Open the installed Mini App in your browser to enable push alerts. Telegram alerts remain active here.");
      }

      const registration = await navigator.serviceWorker.register(workerPath, { scope: appPath });
      const currentSubscription = await registration.pushManager.getSubscription();

      if (currentSubscription) {
        const response = await fetch("/api/admin/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: currentSubscription.endpoint }),
        });
        if (!response.ok) throw new Error("Could not disable push notifications.");
        await currentSubscription.unsubscribe();
        setEnabled(false);
        setMessage("Order alerts are turned off on this device.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(
          permission === "denied"
            ? "Notifications are blocked for this site. Allow them in your browser or phone settings, then try again."
            : "Allow notifications when your browser asks to receive order alerts.",
        );
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationServerKey(publicKey),
      });
      const response = await fetch("/api/admin/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app, subscription: subscription.toJSON() }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        await subscription.unsubscribe();
        throw new Error(result?.error || "Could not save this device's subscription.");
      }

      setEnabled(true);
      setMessage("This device will receive new order alerts.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update notification settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <button
        type="button"
        onClick={() => void toggleNotifications()}
        disabled={busy || checkingSetup}
        aria-pressed={enabled}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          minHeight: 38,
          padding: "7px 12px",
          borderRadius: 8,
          border: "1px solid #DED8CC",
          background: enabled ? "#E8F5E9" : "#FFFFFF",
          color: "#073D2E",
          fontSize: 12,
          fontWeight: 700,
          cursor: busy || checkingSetup ? "not-allowed" : "pointer",
          opacity: busy || checkingSetup ? 0.65 : 1,
        }}
      >
        <BellRing size={15} />
        {busy ? "Please wait…" : enabled ? "Turn off order alerts" : "Enable order alerts"}
      </button>
      {message && (
        <span role="status" style={{ maxWidth: 250, color: "#5F675F", fontSize: 11, lineHeight: 1.4 }}>
          {message}
        </span>
      )}
      {!publicKey && !message && (
        <span style={{ color: "#777C75", fontSize: 11 }}>Push alert setup is required.</span>
      )}
    </div>
  );
}
