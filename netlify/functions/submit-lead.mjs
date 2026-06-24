// Netlify Function: submit-lead
// Receives the on-site booking flow (package, date, time, guests, menu, add-ons,
// contact details) and creates a "New Lead" on the Monday "Events Form" board.
// Monday's own board automations then generate the GetSign contract and email it.
//
// SECURITY: the Monday API token is read from the Netlify env var MONDAY_TOKEN
// (Site config -> Environment variables). It is never in the repo. The browser
// only calls /api/submit-lead and never sees the token.

const BOARD_ID = "5092854682";        // Events Form
const NEW_LEADS_GROUP = "group_mm18zcww";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let d;
  try { d = await req.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }

  const TOKEN = process.env.MONDAY_TOKEN;
  if (!TOKEN) {
    // Token not set yet: no-op so the site keeps working, but log the payload.
    console.log("submit-lead (no MONDAY_TOKEN) payload:", JSON.stringify(d));
    return json({ ok: true, stub: true }, 200);
  }

  const timeLabel = d.menu === "evening" ? "ערב" : "צהריים";
  const ils = (n) => (n == null ? "" : n + " ₪");
  const notes = [
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
  ].filter(Boolean).join("\n");

  const cols = {
    emailj9eufer1:         { email: d.email || "", text: d.email || "" },
    phone0zyibnut:         { phone: String(d.phone || ""), countryShortName: "IL" },
    single_selecta6erdt9:  { label: "אירוע חברה" },          // Event type
    single_select943s5p9:  { label: timeLabel },             // Time of event
    number0kzol2wl:        String(d.guests ?? ""),           // Estimated guests
    numeric_mm1qj01x:      String(d.guests ?? ""),           // Guest Count
    numeric_mm3rxrb4:      String(d.estTotal ?? ""),         // Total Price (Numbers)
    short_textoant7hbw:    d.utm_campaign || "",             // Campaign Name
    short_textgjnrhjdi:    d.utm_source || "",               // Traffic Source
    color_mm18ym70:        { label: "New Lead" },            // Status
    long_textlwbyhlq0:     { text: notes },                  // Additional notes
  };
  if (d.date) cols.date5bab58wj = { date: d.date };          // Requested event date (YYYY-MM-DD)

  const query = `mutation ($board: ID!, $group: String, $name: String!, $cols: JSON!) {
    create_item(board_id: $board, group_id: $group, item_name: $name, column_values: $cols, create_labels_if_missing: false) { id }
  }`;
  const variables = {
    board: BOARD_ID,
    group: NEW_LEADS_GROUP,
    name: String(d.name || "ליד מהאתר").slice(0, 250),
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
