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
const GRP_AGREEMENT = "group_mm187fg9";   // completed booking flow -> Agreement Sent (active 24h)
const GRP_CUSTOM    = "group_mm4rwdcv";   // custom 450+ consultation -> Custom Package Inquiry (450+)
const GRP_FOLLOWUP  = "group_mm4rtvy5";   // abandoned / "talk to us" -> Packages (Asked For Follow Up!)
const GRP_IN_AGREEMENT = "group_mm18zcww"; // completed package booking -> Packages (In Agreement Process)
// Availability for the on-site calendar merges two sources, so a date is "taken" the moment it is
// committed OR the moment a website booking completes:
//   1) Events Form board  — committed events: Closed Deals / Pre Payment / Proposal Sent.
//   2) Company Events Form — a finished website booking holds its date right away: it lands in
//      "In Agreement Process" and moves to "Agreement Sent" (24h contract). Add later "held" stages here.
const DATE_COL = "date5bab58wj";           // event-date column (same id on both boards)
// Time source, in priority order: the two Hour-picker columns are what staff actually fill in when
// entering an event by hand on the board; the combined text field is a bonus/fallback (it's only
// reliably populated for leads our own site created). Query both and prefer the hour columns.
const HOUR_START_COL = "hour_mm1q610q";
const HOUR_END_COL   = "hour_mm1qa44s";
const TIME_COL = "text_mm4t1h0s";          // "Start-End (Text)" column, e.g. "13:00-18:00" (fallback)
const AVAIL_BOARD = "5092854682";          // Events Form
const AVAIL_GROUPS = ["group_mm18mks7", "group_mm1fz3kg", "group_mm187fg9"]; // Closed Deals, Pre Payment, Proposal Sent
const COMPANY_AVAIL_GROUPS = [GRP_IN_AGREEMENT, GRP_AGREEMENT];               // In Agreement Process, Agreement Sent
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
    // GET = availability feed for the on-site calendar; OR ?leadById=<id> for the private calculator
    // prefill (secret-gated, never public).
    if (request.method === "GET") {
      const leadId = new URL(request.url).searchParams.get("leadById");
      if (leadId) return leadById(leadId, request, env, cors);
      return availability(env, cors);
    }
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors });

    let d;
    try { d = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400, cors); }

    // Private calculator write-back: complete an existing (abandoned/custom) lead IN PLACE.
    // Secret-gated; fill-only (no group/status change, no contract); never runs CAPI. Company board only.
    if (d.mode === "updateLead") return updateLead(d, request, env, cors);

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
    let notes = isIncomplete ? [
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
    // attribution block on the lead for a Monday glance. Google fills utm_content=ad group; Facebook
    // fills utm_content={{adset.name}}, utm_term={{ad.name}}; utm_source tells the two apart.
    const atto = [
      d.utm_source   ? `מקור: ${d.utm_source}` : "",
      d.utm_campaign ? `קמפיין: ${d.utm_campaign}` : "",
      d.utm_content  ? `קבוצת מודעות / אדסט: ${d.utm_content}` : "",
      d.utm_term     ? `מודעה / מילת מפתח: ${d.utm_term}` : "",
      d.gclid        ? `gclid: ${d.gclid}` : "",   // month-2 offline-conversion upload key
    ].filter(Boolean);
    if (atto.length) notes += "\n— שיוך מקור —\n" + atto.join("\n");

    const cols = {
      emailj9eufer1:         { email: d.email || "", text: d.email || "" },
      phone0zyibnut:         { phone: String(d.phone || ""), countryShortName: "IL" },
      single_selecta6erdt9:  { label: d.eventType || "אירוע חברה" },
      number0kzol2wl:        String(d.guests ?? ""),
      numeric_mm1qj01x:      String(d.guests ?? ""),
      short_textoant7hbw:    d.utm_campaign || "",
      short_textgjnrhjdi:    d.utm_source || "",
      color_mm18ym70:        { label: "New Lead" },
    };
    const isPackage = !d.leadType;   // website booking lead (no leadType)
    // Summary blob: company board -> Lead Summary (long_text_mm4t4fjb); private board lacks that
    // column, so keep the blob in long_textlwbyhlq0 there (private path unchanged).
    if (isPrivate) cols.long_textlwbyhlq0 = { text: notes };
    else           cols.long_text_mm4t4fjb = { text: notes };
    const timeOfEvent = d.menu ? timeLabel : (d.eventTime || "");
    if (timeOfEvent) cols.single_select943s5p9 = { label: timeOfEvent };
    // Total: package leads -> Total Price (Packages) text only; non-package leads keep the Custom
    // price columns (reserved for in-Monday calc). CAPI value reads d.estTotal directly, not the column.
    if (d.estTotal != null && d.estTotal !== "") {
      if (isPackage) cols.text_mm4trhj9 = "₪" + Number(d.estTotal).toLocaleString("en-US");   // Total Price (Packages)
      else { cols.numeric_mm3rxrb4 = String(d.estTotal); cols.text_mm1qdk3m = "₪" + Number(d.estTotal).toLocaleString("en-US"); }
    }
    if (d.date) cols.date5bab58wj = { date: d.date };
    if (d.callbackTime) cols.single_selectl0ocmt7 = { label: d.callbackTime };
    if (Array.isArray(d.ageRanges) && d.ageRanges.length) cols.dropdown_mm1qs76g = { labels: d.ageRanges };
    if (d.consent) cols.boolean_mm4nqth1 = { checked: "true" };
    if (d.foodMenuText) cols.text_mm1tgvh0 = d.foodMenuText;   // contract food-text (package leads only)
    // bar / DJ / add-ons: package booking lead only (no leadType). Incomplete leads also carry
    // addonLabels but must not populate these columns (per spec scope).
    if (isPackage && d.barLabel) cols.color_mm1gytg8 = { label: d.barLabel };   // bar tier (included)
    if (isPackage && d.djLabel)  cols.color_mm1g4y0y = { label: d.djLabel };    // music/DJ tier (included)
    if (isPackage && Array.isArray(d.addonLabels) && d.addonLabels.length) cols.dropdown_mm1gze4c = { labels: d.addonLabels };   // chosen add-ons
    // Contact Name (the person) for company-board lead types. The column lives only on the Company
    // Events board; private leads go to the Events Form board (5092854682) which lacks it, so skip
    // them to avoid a create_item error and to never touch that board.
    if (!isPrivate && d.name) cols.text_mm4the60 = String(d.name);                  // Contact Name = person
    // ad attribution → dedicated columns (company board only; private board lacks them). source/campaign
    // already map to short_textgjnrhjdi/short_textoant7hbw above.
    if (!isPrivate && d.utm_content) cols.text_mm53a533 = String(d.utm_content);    // ad group (Google) / adset (Facebook)
    if (!isPrivate && d.utm_term)    cols.text_mm53htse = String(d.utm_term);       // keyword (Google) / ad (Facebook)
    if (!isPrivate && d.gclid)       cols.text_mm53djv5 = String(d.gclid);          // Google click id → offline-conversion upload
    // gclid on the private board: repurposed "Short text" column (private board has no dedicated
    // attribution columns like the company board does).
    if (isPrivate && d.gclid)        cols.short_text53r8p0sy = String(d.gclid);     // Google click id → offline-conversion upload
    // package-contract columns (package booking leads only)
    if (isPackage && d.packageLabel) cols.color_mm4tbcbp = { label: d.packageLabel }; // חבילה (status)
    if (isPackage && d.barMenuText)  cols.text_mm4t9mgc  = d.barMenuText;             // Alcohol Package Details (full drinks text)
    if (isPackage && d.perHeadText)  cols.text_mm4ts8zc  = d.perHeadText;             // עלות לאדם (₪ text)
    if (isPackage && d.addonsText)   cols.text_mm4t3vrm  = d.addonsText;              // עלות התוספות (₪ text)
    // customer note -> הערות הלקוח (clean note only). Combine the menu note and the food note if present.
    // Company board only: the private board keeps the summary blob in this column (set above).
    const _custNote = [d.notes, d.foodNotes].filter(Boolean).join("\n").trim();
    if (!isPrivate && _custNote) cols.long_textlwbyhlq0 = { text: _custNote };         // הערות הלקוח

    // Package leads finished the whole website flow: distinct status, no callback needed, Ezra venue.
    // Set last so they override the generic status/callback writes above.
    if (isPackage) {
      cols.color_mm18ym70       = { label: "New Lead - Packages" };
      cols.single_selectl0ocmt7 = { label: "לא רלוונטי לצלצל" };
      cols.color_mm4ssjj3       = { label: "עזרא" };
    }

    const slot = String(d.slot || "");
    const parseHM = (s) => { const m = /(\d{1,2}):(\d{2})/.exec(s || ""); return m ? { hour: +m[1], minute: +m[2] } : null; };
    const [startStr, endStr] = slot.split("-");
    const startHM = parseHM(startStr), endHM = parseHM(endStr);
    if (slot)    cols.text_mm4t1h0s = slot;   // Start-End (Text), e.g. "21:00-02:00"
    if (startHM) cols.hour_mm1q610q = startHM;
    if (endHM)   cols.hour_mm1qa44s = endHM;

    const query = `mutation ($board: ID!, $group: String, $name: String!, $cols: JSON!) {
      create_item(board_id: $board, group_id: $group, item_name: $name, column_values: $cols, create_labels_if_missing: false) { id }
    }`;
    const board = isPrivate ? PRIVATE_BOARD : COMPANY_BOARD;
    // Completed package leads land in "Packages (In Agreement Process)"; a Monday/GetSign automation
    // moves them to "Agreement Sent" after the contract is sent (not the worker's job).
    const group = isPrivate ? PRIVATE_GROUP
                : isCustom ? GRP_CUSTOM
                : isIncomplete ? GRP_FOLLOWUP
                : GRP_IN_AGREEMENT;
    // item name: company for ALL lead types; fall back to person if no company
    const displayName = String(d.company || d.name || "ליד מהאתר");
    const variables = {
      board,
      group,
      // no "נטוש ·" prefix on incomplete/abandoned leads: the item's group (Asked For Follow Up)
      // already signals that, and this same name feeds the generated contract - a literal "abandoned"
      // label there would be wrong once the lead comes back and books.
      name: (isCustom ? "שיחת אפיון · " : "") + displayName.slice(0, 230),
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
    "Access-Control-Allow-Headers": "content-type, x-ezra-calc-secret",
    "Vary": "Origin",
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...cors } });
}

// Availability for the on-site calendar. Returns two things:
//   busy   — the real [date, start, end] window for every committed/held event (see constants above
//            for which boards/groups count), so a slot picker can grey out only the overlapping hours.
//   booked — dates that have >=1 busy window, kept for the simpler date-only pickers (private form,
//            custom-consultation) that don't show time slots at all.
// An item with a date but no parseable time is skipped entirely - it does not block anything.
// While MONDAY_TOKEN is unset it returns everything open. Cached 60s at the edge so a fresh booking
// blocks the date for new visitors almost immediately.
const TIME_RANGE_RE = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/;
// "1:00 PM" / "13:00" / "1:00pm" -> "HH:MM" (24h). Handles both the Hour column's rendered text and
// a bare 24h string; returns null (not a guess) if nothing matches.
function parseHourText(text) {
  const m = /(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(text || "");
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ap = m[3] ? m[3].toLowerCase() : null;
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23) return null;
  return String(h).padStart(2, "0") + ":" + m[2];
}
async function availability(env, cors) {
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return json({ booked: [], busy: [] }, 200, cors);
  const cols = `["${DATE_COL}", "${HOUR_START_COL}", "${HOUR_END_COL}", "${TIME_COL}"]`;
  const query = `query {
    events: boards(ids: ${AVAIL_BOARD}) {
      groups(ids: ${JSON.stringify(AVAIL_GROUPS)}) {
        items_page(limit: 500) { items { column_values(ids: ${cols}) { id text ... on DateValue { date } } } }
      }
    }
    company: boards(ids: ${COMPANY_BOARD}) {
      groups(ids: ${JSON.stringify(COMPANY_AVAIL_GROUPS)}) {
        items_page(limit: 500) { items { column_values(ids: ${cols}) { id text ... on DateValue { date } } } }
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
    if (out.errors) { console.error("availability Monday errors:", JSON.stringify(out.errors)); return json({ booked: [], busy: [] }, 200, cors); }
    const boards = [...(out?.data?.events || []), ...(out?.data?.company || [])];
    const items = boards.flatMap((b) => (b.groups || []).flatMap((g) => g.items_page?.items || []));
    const busy = [];
    for (const it of items) {
      const cv = {};
      (it.column_values || []).forEach((c) => { cv[c.id] = c; });
      const date = cv[DATE_COL]?.date;
      if (!date) continue;
      // prefer the two Hour-picker columns (what staff actually fill in by hand on the board);
      // fall back to the combined "Start-End (Text)" field (reliable for site-created leads).
      let start = parseHourText(cv[HOUR_START_COL]?.text);
      let end = parseHourText(cv[HOUR_END_COL]?.text);
      if (!start || !end) {
        const m = TIME_RANGE_RE.exec(cv[TIME_COL]?.text || "");
        if (m) { start = m[1].padStart(2, "0") + ":" + m[2]; end = m[3].padStart(2, "0") + ":" + m[4]; }
      }
      if (!start || !end) continue;   // no parseable time anywhere -> does not block anything
      busy.push({ date, start, end });
    }
    const booked = [...new Set(busy.map((b) => b.date))];
    return new Response(JSON.stringify({ booked, busy }), {
      status: 200,
      headers: { "content-type": "application/json", "Cache-Control": "public, max-age=60", ...cors },
    });
  } catch (e) {
    console.error("availability failed:", e);
    return json({ booked: [], busy: [] }, 200, cors);   // fail open
  }
}

// ── Private calculator: shared secret gate (the manager's passcode is sent as this header).
// The Monday token never leaves the server; a request without the correct secret is rejected.
function calcAuthorized(request, env) {
  const secret = request.headers.get("x-ezra-calc-secret") || "";
  return !!env.CALC_SECRET && secret === env.CALC_SECRET;
}

// GET one lead's partial data for the calculator prefill (company board). Secret-gated.
async function leadById(itemId, request, env, cors) {
  if (!calcAuthorized(request, env)) return json({ ok: false, error: "unauthorized" }, 401, cors);
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return json({ ok: false, error: "no token" }, 503, cors);
  const query = `query ($id: [ID!]) {
    items(ids: $id) {
      id name
      column_values(ids: ["text_mm4the60","emailj9eufer1","phone0zyibnut","number0kzol2wl","date5bab58wj","text_mm4t1h0s","color_mm4tbcbp","dropdown_mm1gze4c","long_text_mm4t4fjb","long_textlwbyhlq0"]) {
        id text ... on DateValue { date }
      }
    }
  }`;
  try {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
      body: JSON.stringify({ query, variables: { id: [String(itemId)] } }),
    });
    const out = await r.json();
    if (out.errors) return json({ ok: false, error: out.errors }, 502, cors);
    const it = out?.data?.items?.[0];
    if (!it) return json({ ok: false, error: "not found" }, 404, cors);
    const cv = {};
    (it.column_values || []).forEach((c) => { cv[c.id] = c; });
    const item = {
      id: it.id,
      company: it.name || "",
      name: cv.text_mm4the60?.text || "",
      email: cv.emailj9eufer1?.text || "",
      phone: cv.phone0zyibnut?.text || "",
      guests: cv.number0kzol2wl?.text || "",
      date: cv.date5bab58wj?.date || "",
      slot: cv.text_mm4t1h0s?.text || "",
      packageLabel: cv.color_mm4tbcbp?.text || "",
      addons: cv.dropdown_mm1gze4c?.text || "",
      summary: cv.long_text_mm4t4fjb?.text || "",
      note: cv.long_textlwbyhlq0?.text || "",
    };
    return json({ ok: true, item }, 200, cors);
  } catch (e) {
    console.error("leadById failed:", e);
    return json({ ok: false, error: String(e) }, 502, cors);
  }
}

// Contract-ready columns for a completed lead, built from the same field names the site sends.
// Mirrors the package create-item mapping (minus status/group). Never sets the lead status.
function buildCalcCols(d) {
  const cols = {};
  if (d.name) cols.text_mm4the60 = String(d.name);                                     // Contact Name
  if (d.email) cols.emailj9eufer1 = { email: d.email, text: d.email };
  if (d.phone) cols.phone0zyibnut = { phone: String(d.phone), countryShortName: "IL" };
  if (d.guests != null && d.guests !== "") { cols.number0kzol2wl = String(d.guests); cols.numeric_mm1qj01x = String(d.guests); }
  if (d.date) cols.date5bab58wj = { date: d.date };
  if (d.packageLabel) cols.color_mm4tbcbp = { label: d.packageLabel };                  // Package (status)
  if (d.barMenuText) cols.text_mm4t9mgc = d.barMenuText;                                // Alcohol Package Details
  if (d.perHeadText) cols.text_mm4ts8zc = d.perHeadText;                                // Price per head
  if (d.addonsText) cols.text_mm4t3vrm = d.addonsText;                                  // Add on Price
  if (d.estTotal != null && d.estTotal !== "") cols.text_mm4trhj9 = "₪" + Number(d.estTotal).toLocaleString("en-US"); // Total Price (Packages)
  if (d.foodMenuText) cols.text_mm1tgvh0 = d.foodMenuText;                              // Food Menu
  if (d.barLabel) cols.color_mm1gytg8 = { label: d.barLabel };                          // bar tier
  if (d.djLabel) cols.color_mm1g4y0y = { label: d.djLabel };                            // DJ tier
  if (Array.isArray(d.addonLabels) && d.addonLabels.length) cols.dropdown_mm1gze4c = { labels: d.addonLabels };
  // Event Location: default עזרא for standard packages; custom mode may leave it to the manager.
  if (!d.customMode) cols.color_mm4ssjj3 = { label: d.eventLocation || "עזרא" };
  cols.single_selectl0ocmt7 = { label: "לא רלוונטי לצלצל" };                            // Best time to call
  const slot = String(d.slot || "");
  if (slot) cols.text_mm4t1h0s = slot;                                                  // Start-End (Text)
  const parseHM = (s) => { const m = /(\d{1,2}):(\d{2})/.exec(s || ""); return m ? { hour: +m[1], minute: +m[2] } : null; };
  const [s0, s1] = slot.split("-");
  const a = parseHM(s0), b = parseHM(s1);
  if (a) cols.hour_mm1q610q = a;
  if (b) cols.hour_mm1qa44s = b;
  const note = [d.notes, d.foodNotes].filter(Boolean).join("\n").trim();
  if (note) cols.long_textlwbyhlq0 = { text: note };                                    // הערות הלקוח
  return cols;
}

// POST update-existing: fill the completed data into the SAME Monday item (company board).
// Secret-gated; change_multiple_column_values (not create_item); never touches group/status/contract.
async function updateLead(d, request, env, cors) {
  if (!calcAuthorized(request, env)) return json({ ok: false, error: "unauthorized" }, 401, cors);
  if (!d.itemId) return json({ ok: false, error: "missing itemId" }, 400, cors);
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return json({ ok: false, error: "no token" }, 503, cors);
  const cols = buildCalcCols(d);
  const query = `mutation ($board: ID!, $item: ID!, $cols: JSON!) {
    change_multiple_column_values(board_id: $board, item_id: $item, column_values: $cols, create_labels_if_missing: false) { id }
  }`;
  // board is hardcoded to the company board - never targets the read-only Events Form board.
  const variables = { board: COMPANY_BOARD, item: String(d.itemId), cols: JSON.stringify(cols) };
  try {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
      body: JSON.stringify({ query, variables }),
    });
    const out = await r.json();
    if (out.errors) {
      console.error("updateLead Monday errors:", JSON.stringify(out.errors));
      return json({ ok: false, error: out.errors }, 502, cors);
    }
    return json({ ok: true, id: out.data?.change_multiple_column_values?.id }, 200, cors);
  } catch (e) {
    console.error("updateLead failed:", e);
    return json({ ok: false, error: String(e) }, 502, cors);
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
