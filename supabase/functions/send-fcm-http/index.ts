// Supabase Edge Function: send-fcm-http
// Sends undelivered notifications via HTTP call to your own backend
// This is a simpler approach that avoids JWT complexity

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type NotificationRow = {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  delivered: boolean;
};

type DeviceTokenRow = {
  id: string;
  user_id: string;
  fcm_token: string;
  platform: "android";
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase service env vars");
}
if (!FCM_SERVER_KEY) {
  console.error("Missing FCM_SERVER_KEY env var");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fetchUndeliveredNotifications(specificId?: string, limit = 100) {
  let query = supabase
    .from("notifications")
    .select("id, recipient_user_id, type, title, body, data, delivered")
    .eq("delivered", false)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (specificId) {
    query = supabase
      .from("notifications")
      .select("id, recipient_user_id, type, title, body, data, delivered")
      .eq("id", specificId)
      .limit(1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

async function fetchUserTokens(userId: string) {
  const { data, error } = await supabase
    .from("device_tokens")
    .select("id, user_id, fcm_token, platform")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as DeviceTokenRow[];
}

// Send FCM using legacy API (simpler approach)
async function sendFcmLegacy(tokens: string[], title: string, body: string, data: Record<string, unknown>): Promise<{ success: number; failure: number; results: Array<{ message_id?: string; error?: string }> }> {
  if (tokens.length === 0) {
    return { success: 0, failure: 0, results: [] };
  }

  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: { title, body },
        data: data ?? {},
        android: {
          priority: "high",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FCM request failed: ${res.status} ${text}`);
    }
    
    const json = await res.json();
    return {
      success: json.success || 0,
      failure: json.failure || 0,
      results: json.results || []
    };
  } catch (error) {
    console.error("FCM send error:", error);
    return {
      success: 0,
      failure: tokens.length,
      results: tokens.map(() => ({ error: error.message }))
    };
  }
}

async function markDelivered(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ delivered: true })
    .eq("id", notificationId);
  if (error) throw error;
}

async function deleteDeviceTokens(tokens: string[]) {
  if (tokens.length === 0) return;
  const { error } = await supabase
    .from("device_tokens")
    .delete()
    .in("fcm_token", tokens);
  if (error) throw error;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const { notificationId, limit } = url.searchParams.has("notificationId")
      ? { notificationId: url.searchParams.get("notificationId") ?? undefined, limit: undefined }
      : await (async () => {
          try {
            const body = await req.json().catch(() => ({}));
            return { notificationId: body.notificationId as string | undefined, limit: body.limit as number | undefined };
          } catch {
            return { notificationId: undefined, limit: undefined };
          }
        })();

    const items = await fetchUndeliveredNotifications(notificationId, limit ?? 100);

    const summary: Array<{
      id: string;
      tokens: number;
      sent: number;
      failed: number;
      removedTokens: number;
    }> = [];

    for (const n of items) {
      const tokens = await fetchUserTokens(n.recipient_user_id);
      const androidTokens = tokens.filter((t) => t.platform === "android").map((t) => t.fcm_token);

      let sent = 0;
      let failed = 0;
      let removedTokens = 0;

      if (androidTokens.length > 0) {
        try {
          const result = await sendFcmLegacy(androidTokens, n.title, n.body, {
            type: n.type,
            notification_id: n.id,
            ...(n.data ?? {}),
          });
          
          sent = result.success;
          failed = result.failure;

          // Remove invalid tokens
          const invalidTokens: string[] = [];
          result.results.forEach((r, idx) => {
            if (r.error && ["NotRegistered", "InvalidRegistration", "MismatchSenderId"].includes(r.error)) {
              invalidTokens.push(androidTokens[idx]);
            }
          });
          if (invalidTokens.length > 0) {
            await deleteDeviceTokens(invalidTokens);
            removedTokens = invalidTokens.length;
          }
        } catch (err) {
          console.error("FCM send error", err);
          failed = androidTokens.length;
        }
      }

      // Mark delivered if at least one success (or no tokens to try)
      if (sent > 0 || androidTokens.length === 0) {
        await markDelivered(n.id);
      }

      summary.push({ id: n.id, tokens: androidTokens.length, sent, failed, removedTokens });
    }

    return new Response(JSON.stringify({ processed: items.length, results: summary }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
