// Netlify Function: submit-lead
// Receives the on-site booking flow (package, date, time, guests, menu, add-ons,
// contact details) and creates a "New Lead" on the Monday "Events Form" board.
// Monday's own board automations then generate the GetSign contract and email it.
//
// SECURITY: the Monday API token is read from the Netlify env var MONDAY_TOKEN
// (Site config -> Environment variables). It is never in the repo. The browser
// only calls /api/submit-lead and never sees the token.

import { createHash } from "node:crypto";

const BOARD_ID = "5092854682";        // Events Form
const NEW_LEADS_GROUP = "group_mm18zcww";       // booking-flow leads (full quote -> contract automation)
const CUSTOM_LEADS_GROUP = "group_mm4m7apf";    // שיחות אפיון (אתר) — bespoke callback requests, no contract yet
const META_PIXEL_ID = "2174553826420246";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let d;
  try { d = await req.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }

  // honeypot: real users never fill the hidden field; bots do -> drop silently
  if (d.hp) return json({ ok: true, dropped: true }, 200);

  // Meta Conversions API: server-side Lead event, deduped with the browser pixel via event_id.
  // Runs independently of Monday so it fires even while the Monday token is paused.
  const ip = req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = req.headers.get("user-agent") || "";
  await sendMetaCapi(d, ip, ua).catch((e) => console.error("CAPI failed:", e));

  // Incomplete / "rather talk to us" leads (booking flow dropouts who asked to be contacted)
  // are PARKED from Monday until the dedicated company-events board exists. For now we just
  // capture them in the logs + Meta. TODO: write these to the future company-events board.
  if (d.leadType === "incomplete") {
    console.log("submit-lead incomplete lead (Monday parked):", JSON.stringify(d));
    return json({ ok: true, parked: true }, 200);
  }

  const TOKEN = process.env.MONDAY_TOKEN;
  if (!TOKEN) {
    // Token not set yet: no-op so the site keeps working, but log the payload.
    console.log("submit-lead (no MONDAY_TOKEN) payload:", JSON.stringify(d));
    return json({ ok: true, stub: true }, 200);
  }

  const isCustom = d.leadType === "custom";    // bespoke "שיחת אפיון" lead (company page)
  const isPrivate = d.leadType === "private";  // private/birthday lead from the on-site popup
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
    single_selecta6erdt9:  { label: d.eventType || "אירוע חברה" }, // Event type (private form sends its own)
    number0kzol2wl:        String(d.guests ?? ""),           // Estimated guests
    numeric_mm1qj01x:      String(d.guests ?? ""),           // Guest Count
    short_textoant7hbw:    d.utm_campaign || "",             // Campaign Name
    short_textgjnrhjdi:    d.utm_source || "",               // Traffic Source
    color_mm18ym70:        { label: "New Lead" },            // Status
    long_textlwbyhlq0:     { text: notes },                  // Additional notes
  };
  // Time of event: booking flow derives it from the menu (day/evening); the private form
  // sends an explicit label (בוקר/צהריים/ערב/גמיש). Skip entirely for שיחת אפיון leads.
  const timeOfEvent = d.menu ? timeLabel : (d.eventTime || "");
  if (timeOfEvent) cols.single_select943s5p9 = { label: timeOfEvent };
  if (d.estTotal != null && d.estTotal !== "") cols.numeric_mm3rxrb4 = String(d.estTotal); // Total Price
  if (d.date) cols.date5bab58wj = { date: d.date };          // Requested event date (YYYY-MM-DD)
  // Callback window -> the board's dedicated "Best time to call" column. The forms send the
  // exact existing labels, so they map without creating new labels.
  if (d.callbackTime) cols.single_selectl0ocmt7 = { label: d.callbackTime };
  // Age range(s) of attendees -> the board's multi-select dropdown (private form only).
  if (Array.isArray(d.ageRanges) && d.ageRanges.length) cols.dropdown_mm1qs76g = { labels: d.ageRanges };
  // Marketing consent -> the "Marketing Approval" checkbox column (checked = accepted dיוור).
  if (d.consent) cols.boolean_mm4nqth1 = { checked: "true" };

  // Exact time slot from the site (e.g. "17:00-20:00") -> dedicated time columns.
  // single_select943s5p9 (Time of event) stays a coarse bucket (ערב/צהריים) for filtering.
  const slot = String(d.slot || "");
  const parseHM = (s) => { const m = /(\d{1,2}):(\d{2})/.exec(s || ""); return m ? { hour: +m[1], minute: +m[2] } : null; };
  const [startStr, endStr] = slot.split("-");
  const startHM = parseHM(startStr), endHM = parseHM(endStr);
  if (slot)    cols.text_mm2km76j = slot;       // Start-End (text)
  if (startHM) cols.hour_mm1q610q = startHM;     // Start Time
  if (endHM)   cols.hour_mm1qa44s = endHM;       // End Time

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
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

const sha256 = (s) => createHash("sha256").update(String(s)).digest("hex");

// Server-side Meta Conversions API "Lead" event. Hashes PII (SHA-256), includes the
// browser cookies + IP/UA for matching, and reuses the browser event_id for dedup.
async function sendMetaCapi(d, ip, ua) {
  const TOKEN = process.env.META_CAPI_TOKEN;
  if (!TOKEN) return; // CAPI not configured

  const user_data = {};
  if (d.email) user_data.em = [sha256(String(d.email).trim().toLowerCase())];
  let phone = String(d.phone || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "972" + phone.slice(1); // IL local -> E.164 digits
  if (phone) user_data.ph = [sha256(phone)];
  if (d.name) {
    const parts = String(d.name).trim().split(/\s+/);
    user_data.fn = [sha256(parts[0].toLowerCase())];
    if (parts.length > 1) user_data.ln = [sha256(parts.slice(1).join(" ").toLowerCase())];
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
