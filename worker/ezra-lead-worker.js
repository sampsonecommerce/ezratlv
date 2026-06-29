// Cloudflare Worker: Ezra lead endpoint (BRIDGE ONLY).
// Used while the static site is on GitHub Pages and ezratlv.com isn't on Cloudflare yet.
// The site's forms POST here cross-origin. Once the domain moves to Cloudflare Pages, the
// forms go back to same-origin /api/submit-lead and this worker can be deleted.
//
// Deploy: Cloudflare dashboard -> Workers & Pages -> Create Worker -> paste this -> Deploy.
// Secrets (Settings -> Variables): MONDAY_TOKEN (scoped, leave unset while Monday is paused),
// META_CAPI_TOKEN. Never put tokens in this file.
//
// Hardening: CORS is locked to the site origins below; a honeypot field (`hp`) is silently
// dropped; add a Cloudflare Rate Limiting rule on this worker's route for extra protection.

// Homepage private/birthday leads keep going to the original "Events Form" board.
const PRIVATE_BOARD = "5092854682";
const PRIVATE_GROUP = "group_mm18zcww";
// All company-events leads (booking flow, custom 450+ consultation, abandoned) go to the
// dedicated "Company Events Form" board, each into its matching pipeline group.
const COMPANY_BOARD = "5099350637";
const GRP_AGREEMENT = "group_mm187fg9";   // completed booking flow -> Agreement Sent (active 12h)
const GRP_CUSTOM    = "group_mm4rwdcv";   // custom 450+ consultation -> Custom Package Inquiry (450+)
const GRP_FOLLOWUP  = "group_mm4rtvy5";   // abandoned / "talk to us" -> Packages (Asked For Follow Up!)
// Availability source = the real "Events Form" calendar (holds every lead, private + company).
// A date is "taken" only when a committed event sits on it: these three groups.
const AVAIL_BOARD = "5092854682";          // Events Form
const AVAIL_GROUPS = ["group_mm18mks7", "group_mm1fz3kg", "group_mm187fg9"]; // Closed Deals, Pre Payment, Proposal Sent
const META_PIXEL_ID = "2174553826420246";

const ALLOWED_ORIGINS = [
  "https://ezratlv.com",
  "https://www.ezratlv.com",
  "https://sampsonecommerce.github.io",
  "http://localhost:8000",
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    // GET = availability feed for the on-site calendar (booked dates from the Monday board)
    if (request.method === "GET") return availability(env, cors);
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors });

    let d;
    try { d = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400, cors); }

    // honeypot: real users never fill this hidden field; bots do -> drop silently
    if (d.hp) return json({ ok: true, dropped: true }, 200, cors);

    const ip = request.headers.get("CF-Connecting-IP") || "";
    const ua = request.headers.get("user-agent") || "";
    await sendMetaCapi(d, ip, ua, env).catch((e) => console.error("CAPI failed:", e));

    const TOKEN = env.MONDAY_TOKEN;
    if (!TOKEN) {
      console.log("submit-lead (no MONDAY_TOKEN) payload:", JSON.stringify(d));
      return json({ ok: true, stub: true }, 200, cors);
    }

    const isCustom = d.leadType === "custom";
    const isPrivate = d.leadType === "private";
    const isIncomplete = d.leadType === "incomplete";
    const timeLabel = d.menu === "evening" ? "ערב" : "צהריים";
    const ils = (n) => (n == null ? "" : n + " ₪");
    const notes = isIncomplete ? [
      "סוג פנייה: נטישת תהליך הזמנה (אירועי חברה)",
      d.pausedStepLabel ? `נעצר בשלב: ${d.pausedStepLabel}` : "",
      d.plan ? `מסלול: ${d.plan}` : "",
      `תאריך: ${d.date || "-"}    שעה: ${d.slot || "-"}`,
      d.menu ? `תפריט: ${d.menu === "evening" ? "ערב" : "יום"}` : "",
      `אורחים: ${d.guests ?? "-"}`,
      (d.addonLabels && d.addonLabels.length) ? `תוספות: ${d.addonLabels.join(", ")}` : "",
      d.company ? `חברה: ${d.company}` : "",
      d.notes ? `הערה: ${d.notes}` : "",
      "★ הלקוח עזב את התהליך וביקש שנחזור אליו",
    ].filter(Boolean).join("\n") : isCustom ? [
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
    if (d.consent) cols.boolean_mm4nqth1 = { checked: "true" };
    if (d.foodMenuText) cols.text_mm1tgvh0 = d.foodMenuText;   // contract food-text (package leads only)

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
    const board = isPrivate ? PRIVATE_BOARD : COMPANY_BOARD;
    const group = isPrivate ? PRIVATE_GROUP
                : isCustom ? GRP_CUSTOM
                : isIncomplete ? GRP_FOLLOWUP
                : GRP_AGREEMENT;
    const variables = {
      board,
      group,
      name: (isCustom ? "שיחת אפיון · " : isIncomplete ? "נטוש · " : "") + String(d.name || "ליד מהאתר").slice(0, 230),
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
        return json({ ok: false, error: out.errors }, 502, cors);
      }
      return json({ ok: true, id: out.data?.create_item?.id }, 200, cors);
    } catch (e) {
      console.error("submit-lead failed:", e);
      return json({ ok: false, error: String(e) }, 502, cors);
    }
  },
};

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...cors } });
}

// Availability for the on-site calendar: dates already taken on the "Events Form" calendar,
// so the calendar can grey them out. This is the single source of truth for BOTH private and
// company bookings. A date counts as taken only when a committed event sits on it: items in the
// Closed Deals / Pre Payment / Proposal Sent groups (date column date5bab58wj). While
// MONDAY_TOKEN is unset it returns an empty list (every date open). Cached 5 min at the edge.
async function availability(env, cors) {
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return json({ booked: [] }, 200, cors);
  const query = `query {
    boards(ids: ${AVAIL_BOARD}) {
      groups(ids: ${JSON.stringify(AVAIL_GROUPS)}) {
        items_page(limit: 500) {
          items { column_values(ids: ["date5bab58wj"]) { ... on DateValue { date } } }
        }
      }
    }
  }`;
  try {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    });
    const out = await r.json();
    const groups = out?.data?.boards?.[0]?.groups || [];
    const items = groups.flatMap((g) => g.items_page?.items || []);
    const booked = [...new Set(items.flatMap((it) => (it.column_values || []).map((c) => c.date).filter(Boolean)))];
    return new Response(JSON.stringify({ booked }), {
      status: 200,
      headers: { "content-type": "application/json", "Cache-Control": "public, max-age=300", ...cors },
    });
  } catch (e) {
    console.error("availability failed:", e);
    return json({ booked: [] }, 200, cors);   // fail open
  }
}

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendMetaCapi(d, ip, ua, env) {
  const TOKEN = env.META_CAPI_TOKEN;
  if (!TOKEN) return;
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
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: [event] }) });
  const out = await r.json().catch(() => ({}));
  if (out.error) console.error("Meta CAPI error:", JSON.stringify(out.error));
}
