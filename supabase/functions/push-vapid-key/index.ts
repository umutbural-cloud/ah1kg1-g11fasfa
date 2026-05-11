// Public endpoint that returns the VAPID public key for the browser to subscribe.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const key = (Deno.env.get("VAPID_PUBLIC_KEY") || Deno.env.get("VAPID_GENEL_ANAHTAR") || "").trim();
  if (!key) {
    console.error("[Push] VAPID_PUBLIC_KEY is not configured. Please use standard secret names: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY");
    return new Response(JSON.stringify({ error: "VAPID_PUBLIC_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[Push] VAPID public key served", key.slice(0, 10));
  return new Response(JSON.stringify({ publicKey: key }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
