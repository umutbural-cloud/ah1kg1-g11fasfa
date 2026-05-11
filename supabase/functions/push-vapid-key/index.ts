// Public endpoint that returns the VAPID public key for the browser to subscribe.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const isLikelyVapidPublicKey = (key: string) => /^B[A-Za-z0-9_-]{80,90}$/.test(key);

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const key = [Deno.env.get("VAPID_PUBLIC_KEY"), Deno.env.get("VAPID_GENEL_ANAHTAR")]
    .map((value) => value?.trim() ?? "")
    .find(isLikelyVapidPublicKey) ?? "";
  if (!key) {
    console.error("[Push] VAPID_PUBLIC_KEY is missing or invalid. Please use standard secret names: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY");
    return new Response(JSON.stringify({ error: "VAPID_PUBLIC_KEY is not configured or invalid" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[Push] VAPID public key served", key.slice(0, 10));
  return new Response(JSON.stringify({ publicKey: key }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
