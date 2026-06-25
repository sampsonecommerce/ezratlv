// Cloudflare Pages Function: POST /api/submit-lead
// Cloudflare equivalent of netlify/functions/submit-lead.mjs. Routed automatically by file
// path (/functions/api/submit-lead.js -> /api/submit-lead). Creates a Monday lead + fires the
// Meta Conversions API "Lead" event. Secrets come from Pages env vars MONDAY_TOKEN /
// META_CAPI_TOKEN (Settings -> Environment variables); never in the repo, never in the browser.

const BOARD_ID = "5092854682";                  // Events Form
const NEW_LEADS_GROUP = "group_mm18zcww";        // booking-flow leads
const CUSTOM_LEADS_GROUP = "group_mm4m7apf";     // שיחת אפיון callback leads
const META_PIXEL_ID = "2174553826420246";

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }

  // Meta CAPI: server-side Lead event, deduped with the browser pixel via event_id.
  const ip = request.headers.get("CF-Connecting-IP") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "";
  await sendMetaCapi(d, ip, ua, env).catch((e) => console.error("CAPI failed:", e));

  // Incomplete / "rather talk to us" leads are PARKED from Monday until the dedicated
  // company-events board exists. For now we capture them in logs + Meta only.
  if (d.leadType === "incomplete") {
    console.log("submit-lead incomplete lead (Monday parked):", JSON.stringify(d));
    return json({ ok: true, parked: true }, 200);
  }

  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) {
    console.log("submit-lead (no MONDAY_TOKEN) payload:", JSON.stringify(d));
    return json({ ok: true, stub: true }, 200);
  }

  const isCustom = d.leadType === "custom";
  const isPrivate = d.leadType === "private";
  const timeLabel = d.menu === "evening" ? "ערב" : "צהריים";
  const ils = (n) => (n == null ? "" : n + " ₪");
  const notes = isCustom ? [
    "סוג פנייה: שיחת אפיון (מסלול מותאם אישית)",
    d.eventLocation ? `מיקום מבוקש: ${d.eventLocation}` : "",
    d.callbackTime ? `זמן נוח לחזרה: ${d.callbackTime}` : "",
    d.eventDate ? `מתי בערך: ${d.eventDate}` : "",
    `אורחים: ${d.guests ?? "-"}`,
    d.company ? `חברה: ${d.company}` : "",
    d.notes ? `פרטים: ${d.notes}` : "",
    "★ הלקוח ביקש שיחת אפיון - יש לחזור אליו",
    `אישור דיוור שיווקי: ${d.consent ? "כן" : "לא"}`,
  ].filter(Boolean).join("\n") : isPrivate ? [
    "סוג פנייה: אירוע פרטי (טופס אתר)",
    `סוג האירוע: ${d.eventType || "-"}`,
    `תאריך: ${d.date || "-"}    שעה: ${d.eventTime || "-"}`,
    `אורחים: ${d.guests ?? "-"}`,
    (Array.isArray(d.ageRanges) && d.ageRanges.length) ? `טווח גילאים: ${d.ageRanges.join(", ")}` : "",
    d.callbackTime ? `זמן נוח לחזרה: ${d.callbackTime}` : "",
    d.notes ? `הערות: ${d.notes}` : "",
    `אישור דיוור שיווקי: ${d.consent ? "כן" : "לא"}`,
  ].filter(Boolean).join("\n") : [
    `מסלול: ${d.plan || ""}${d.hours ? ` (${d.hours} שעות)` : ""}`,
    `תפריט: ${d.menu === "evening" ? "ערב" : "יום"}`,
    `תאריך: ${d.date || "-"}    שעה: ${d.slot || "-"}`,
    `אורחים: ${d.guests ?? "-"}`,
    `מחיר לראש: ${ils(d.perHead)} · בסיס: ${ils(d.base)} · תוספות: ${ils(d.addonsTotal)} · סה"כ משוער: ${ils(d.estTotal)}`,
    `תוספות: ${d.addonLabels && d.addonLabels.length ? d.addonLabels.join(", ") : "אין"}`,
    d.company ? `חברה: ${d.company}` : "",
    d.address ? `כתובת: ${d.address}` : "",
    d.notes ? `הערות: ${d.notes}` : "",
    d.foodNotes ? `הערות לאוכל: ${d.foodNotes}` : "",
    d.wantsCall ? "★ הלקוח ביקש לשוחח עם מנהל המכירות לפני חתימה" : "",
    `אישור דיוור שיווקי: ${d.consent ? "כן" : "לא"}`,
  ].filter(Boolean).join("\n");

  const cols = {
    emailj9eufer1:         { email: d.email || "", text: d.email || "" },
    phone0zyibnut:         { phone: String(d.phone || ""), countryShortName: "IL" },
    single_selecta6erdt9:  { label: d.eventType || "אירוע חברה" },
    number0kzol2wl:        String(d.guests ?? ""),
    numeric_mm1qj01x:      String(d.guests ?? ""),
    short_textoant7hbw:    d.utm_campaign || "",
    short_textgjnrhjdi:    d.utm_source || "",
    color_mm18ym70:        { label: "New Lead" },
    long_textlwbyhlq0:     { text: notes },
  };
  const timeOfEvent = d.menu ? timeLabel : (d.eventTime || "");
  if (timeOfEvent) cols.single_select943s5p9 = { label: timeOfEvent };
  if (d.estTotal != null && d.estTotal !== "") cols.numeric_mm3rxrb4 = String(d.estTotal);
  if (d.date) cols.date5bab58wj = { date: d.date };
  if (d.callbackTime) cols.single_selectl0ocmt7 = { label: d.callbackTime };
  if (Array.isArray(d.ageRanges) && d.ageRanges.length) cols.dropdown_mm1qs76g = { labels: d.ageRanges };
  if (d.consent) cols.boolean_mm4nqth1 = { checked: "true" };   // Marketing Approval

  const slot = String(d.slot || "");
  const parseHM = (s) => { const m = /(\d{1,2}):(\d{2})/.exec(s || ""); return m ? { hour: +m[1], minute: +m[2] } : null; };
  const [startStr, endStr] = slot.split("-");
  const startHM = parseHM(startStr), endHM = parseHM(endStr);
  if (slot)    cols.text_mm2km76j = slot;
  if (startHM) cols.hour_mm1q610q = startHM;
  if (endHM)   cols.hour_mm1qa44s = endHM;

  const query = `mutation ($board: ID!, $group: String, $name: String!, $cols: JSON!) {
    create_item(board_id: $board, group_id: $group, item_name: $name, column_values: $cols, create_labels_if_missing: false) { id }
  }`;
  const variables = {
    board: BOARD_ID,
    group: isCustom ? CUSTOM_LEADS_GROUP : NEW_LEADS_GROUP,
    name: (isCustom ? "שיחת אפיון · " : "") + String(d.name || "ליד מהאתר").slice(0, 230),
    cols: JSON.stringify(cols),
  };

  try {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
      body: JSON.stringify({ query, variables }),
    });
    const out = await r.json();
    if (out.errors) {
      console.error("Monday API errors:", JSON.stringify(out.errors));
      return json({ ok: false, error: out.errors }, 502);
    }
    return json({ ok: true, id: out.data?.create_item?.id }, 200);
  } catch (e) {
    console.error("submit-lead failed:", e);
    return json({ ok: false, error: String(e) }, 502);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

// SHA-256 hex via Web Crypto (Workers runtime has no node:crypto by default)
async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendMetaCapi(d, ip, ua, env) {
  const TOKEN = env.META_CAPI_TOKEN;
  if (!TOKEN) return; // CAPI not configured

  const user_data = {};
  if (d.email) user_data.em = [await sha256(String(d.email).trim().toLowerCase())];
  let phone = String(d.phone || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "972" + phone.slice(1);
  if (phone) user_data.ph = [await sha256(phone)];
  if (d.name) {
    const parts = String(d.name).trim().split(/\s+/);
    user_data.fn = [await sha256(parts[0].toLowerCase())];
    if (parts.length > 1) user_data.ln = [await sha256(parts.slice(1).join(" ").toLowerCase())];
  }
  if (d.fbp) user_data.fbp = d.fbp;
  if (d.fbc) user_data.fbc = d.fbc;
  if (ip) user_data.client_ip_address = ip;
  if (ua) user_data.client_user_agent = ua;

  const event = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: d.eventId || undefined,
    action_source: "website",
    event_source_url: d.pageUrl || "https://www.ezratlv.com/company-events.html",
    user_data,
    custom_data: { value: Number(d.estTotal) || 0, currency: "ILS" },
  };

  const url = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data: [event] }),
  });
  const out = await r.json().catch(() => ({}));
  if (out.error) console.error("Meta CAPI error:", JSON.stringify(out.error));
}
