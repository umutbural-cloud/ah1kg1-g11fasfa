// Saves or refreshes a Web Push subscription for the authenticated user.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[Push] Subscribe unauthorized: missing bearer token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      console.error("[Push] Subscribe unauthorized: invalid token", claimsErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const action = body?.action ?? "subscribe";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "unsubscribe") {
      const endpoint = String(body?.endpoint ?? "");
      if (!endpoint) {
        return new Response(JSON.stringify({ error: "endpoint required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.log("[Push] Removing subscription", endpoint.slice(0, 32));
      await admin.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sub = body?.subscription;
    const endpoint = String(sub?.endpoint ?? "");
    const p256dh = String(sub?.keys?.p256dh ?? "");
    const auth = String(sub?.keys?.auth ?? "");
    const deviceLabel = body?.device_label ? String(body.device_label) : null;
    const userAgent = req.headers.get("user-agent") ?? null;

    if (!endpoint || !p256dh || !auth) {
      console.error("[Push] Invalid subscription payload");
      return new Response(JSON.stringify({ error: "invalid subscription" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("[Push] Saving subscription", endpoint.slice(0, 32));
    const { error } = await admin.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      device_label: deviceLabel,
      user_agent: userAgent,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });

    if (error) {
      console.error("[Push] Subscription save failed", error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("[Push] Subscription saved");
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[Push] Subscribe function failed", e?.message ?? String(e));
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
