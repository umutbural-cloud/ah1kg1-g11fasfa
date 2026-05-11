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
  } catch (err) {
    console.error("[Push] VAPID key fetch failed", err);
    throw err instanceof Error ? err : new Error("VAPID anahtarı alınamadı");
  }
  return cachedPublicKey;
};

export const usePushSubscription = () => {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    pushSupported ? Notification.permission : "unsupported",
  );
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  // Service worker is harmless to register because it does NOT cache — but skip in preview iframe.
  const registerSw = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!pushSupported) return null;
    if (isInIframe || isPreviewHost) return null;
    return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  }, []);

  const refreshState = useCallback(async () => {
    if (!pushSupported || isInIframe || isPreviewHost) return;
    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setSubscribed(!!sub);
    } catch { setSubscribed(false); }
  }, []);

  useEffect(() => { refreshState(); }, [refreshState]);

  const subscribe = useCallback(async () => {
    if (!pushSupported) throw new Error("Tarayıcı bildirimleri desteklemiyor");
    if (isInIframe || isPreviewHost) {
      throw new Error("Bildirimler sadece yayınlanmış adresinizde çalışır (preview iframe değil)");
    }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Bildirim izni verilmedi");

      const reg = (await registerSw()) ?? (await navigator.serviceWorker.ready);
      const publicKey = await fetchPublicKey();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const { error } = await supabase.functions.invoke("push-subscribe", {
        body: {
          subscription: sub.toJSON(),
          device_label: navigator.platform || "Cihaz",
        },
      });
      if (error) throw error;
      setSubscribed(true);
    } finally { setBusy(false); }
  }, [registerSw]);

  const unsubscribe = useCallback(async () => {
    if (!pushSupported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.functions.invoke("push-subscribe", { body: { action: "unsubscribe", endpoint } });
      }
      setSubscribed(false);
    } finally { setBusy(false); }
  }, []);

  return {
    permission, subscribed, busy,
    supported: pushSupported && !isInIframe && !isPreviewHost,
    inPreview: isInIframe || isPreviewHost,
    subscribe, unsubscribe, refresh: refreshState,
  };
};
