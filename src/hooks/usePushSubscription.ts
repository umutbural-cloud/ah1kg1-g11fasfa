import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SW_PATH = "/sw.js";

const urlBase64ToUint8Array = (base64String: string) => {
  if (!base64String || typeof base64String !== "string") {
    throw new Error("Geçersiz VAPID public key");
  }

  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .trim();

  let rawData: string;
  try {
    rawData = atob(base64);
  } catch (err) {
    console.error("[Push] atob decode failed", err);
    throw new Error("VAPID public key çözümlenemedi");
  }

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const isInIframe = (() => {
  try { return typeof window !== "undefined" && window.self !== window.top; } catch { return true; }
})();

const isPreviewHost = typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") || window.location.hostname.endsWith(".lovableproject.com"));

const pushSupported = typeof window !== "undefined" &&
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const pushDisabledInPreview = isInIframe || isPreviewHost;

if (pushDisabledInPreview) {
  console.log("[Push] Disabled in Lovable preview environment");
}

let cachedPublicKey: string | null = null;
const fetchPublicKey = async (): Promise<string> => {
  if (cachedPublicKey) return cachedPublicKey;
  try {
    console.log("[Push] Fetching VAPID public key");
    const { data, error } = await supabase.functions.invoke("push-vapid-key");
    if (error) {
      console.error("[Push] VAPID key fetch failed", error);
      throw new Error("VAPID anahtarı alınamadı");
    }
    const publicKey = typeof data?.publicKey === "string" ? data.publicKey.trim() : "";
    if (!publicKey) throw new Error("VAPID anahtarı alınamadı");
    console.log("[Push] VAPID key received:", publicKey.slice(0, 10));
    cachedPublicKey = publicKey;
    return publicKey;
  } catch (err) {
    console.error("[Push] VAPID key fetch failed", err);
    throw err instanceof Error ? err : new Error("VAPID anahtarı alınamadı");
  }
};

export const usePushSubscription = () => {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    pushSupported ? Notification.permission : "unsupported",
  );
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  // Service worker is harmless to register because it does NOT cache — but skip in preview iframe.
  const registerSw = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!pushSupported) throw new Error("Tarayıcınız push bildirimlerini desteklemiyor");
    if (pushDisabledInPreview) {
      console.log("[Push] Service worker registration skipped in preview");
      throw new Error("Push bildirimleri preview ortamında devre dışı");
    }
    try {
      console.log("[Push] Registering service worker", SW_PATH);
      const registration = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
      await navigator.serviceWorker.ready;
      console.log("[Push] Service worker ready", registration.scope);
      return registration;
    } catch (err) {
      console.error("[Push] Service worker registration failed", err);
      throw new Error("Service worker kaydı başarısız");
    }
  }, []);

  const refreshState = useCallback(async () => {
    if (!pushSupported) {
      console.log("[Push] Unsupported browser");
      return;
    }
    if (pushDisabledInPreview) {
      console.log("[Push] State refresh skipped in preview");
      return;
    }
    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setSubscribed(!!sub);
      console.log("[Push] Subscription state", !!sub);
    } catch (err) {
      console.error("[Push] Subscription state refresh failed", err);
      setSubscribed(false);
    }
  }, []);

  useEffect(() => { refreshState(); }, [refreshState]);

  const subscribe = useCallback(async () => {
    if (!pushSupported) throw new Error("Tarayıcınız push bildirimlerini desteklemiyor");
    if (pushDisabledInPreview) {
      console.log("[Push] Subscribe blocked in preview");
      throw new Error("Push bildirimleri Lovable preview içinde çalışmaz. Lütfen yayınlanan HTTPS adresinde normal Chrome sekmesinde test edin.");
    }
    setBusy(true);
    try {
      console.log("[Push] Requesting notification permission");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Bildirim izni verilmedi");

      const reg = await registerSw();
      const publicKey = await fetchPublicKey();
      if (!publicKey) throw new Error("VAPID anahtarı alınamadı");
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        console.log("[Push] Creating browser push subscription");
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      } else {
        console.log("[Push] Existing browser push subscription found");
      }

      console.log("[Push] Saving subscription");
      const { error } = await supabase.functions.invoke("push-subscribe", {
        body: {
          subscription: sub.toJSON(),
          device_label: navigator.platform || "Cihaz",
        },
      });
      if (error) throw error;
      console.log("[Push] Subscription saved");
      setSubscribed(true);
    } catch (err) {
      console.error("[Push] Subscribe failed", err);
      if (err instanceof Error) throw err;
      throw new Error("Bildirim aboneliği oluşturulamadı");
    } finally { setBusy(false); }
  }, [registerSw]);

  const unsubscribe = useCallback(async () => {
    if (!pushSupported) return;
    setBusy(true);
    try {
      console.log("[Push] Unsubscribe requested");
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.functions.invoke("push-subscribe", { body: { action: "unsubscribe", endpoint } });
      }
      console.log("[Push] Unsubscribed");
      setSubscribed(false);
    } catch (err) {
      console.error("[Push] Unsubscribe failed", err);
      throw err instanceof Error ? err : new Error("Bildirim aboneliği kapatılamadı");
    } finally { setBusy(false); }
  }, []);

  return {
    permission, subscribed, busy,
    supported: pushSupported && !pushDisabledInPreview,
    inPreview: pushDisabledInPreview,
    subscribe, unsubscribe, refresh: refreshState,
  };
};
