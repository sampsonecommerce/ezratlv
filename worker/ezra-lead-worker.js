// Cloudflare Worker: Ezra lead endpoint (BRIDGE ONLY).
// Used while the static site is on GitHub Pages and ezratlv.com isn't on Cloudflare yet.
// The site's forms POST here cross-origin. Once the domain moves to Cloudflare Pages, the
// forms go back to same-origin /api/submit-lead and this worker can be deleted.
//
// Deploy: automatic. A push to `main` that touches worker/ runs
// .github/workflows/deploy-worker.yml, which runs the availability test, deploys with
// wrangler (worker/wrangler.toml), then reads the live worker back to confirm the
// deployed build is this commit's. Pasting into the dashboard is no longer the route.
// Secrets (Settings -> Variables, dashboard-managed): MONDAY_TOKEN (scoped, leave unset
// while Monday is paused), CALC_SECRET, META_CAPI_TOKEN. Never put tokens in this file;
// `keep_vars` in wrangler.toml stops a deploy from clearing them.
//
// Hardening: CORS is locked to the site origins below; a honeypot field (`hp`) is silently
// dropped; add a Cloudflare Rate Limiting rule on this worker's route for extra protection.

// Homepage private/birthday leads keep going to the original "Events Form" board.
const PRIVATE_BOARD = "5092854682";
const PRIVATE_GROUP = "group_mm18zcww";
// Open Events leads (events page inquiry with calendar) go to the Open Events board.
const OPEN_EVENTS_BOARD = "5102602771";
// Bump this in any commit that changes worker behaviour. It is returned on every response,
// and the deploy workflow refuses to pass until the live worker reports this exact value —
// so "is the deployed bundle the merged one?" is a question with an answer.
const BUILD_ID = "2026-08-26c";
// "topics" is Monday's default id for the first group of a brand-new board. It was assumed,
// never checked, and exists on none of our three boards - so every Open Events lead failed the
// group lookup and was filed into the board's top group, "תאריכים תפוסים". Verified 2026-08-25
// against the live board: New Leads is group_mm6djw93.
const OPEN_EVENTS_GROUP = "group_mm6djw93";
// Groups on the Open Events board that mean a date is genuinely taken. New Leads is deliberately
// absent: an inbound enquiry must not blank out its own requested date for every other visitor.
const OPEN_AVAIL_GROUPS = [
  "group_mm6d3y71",   // תאריכים תפוסים
  "group_mm6dfrqr",   // Pre Payment
  "group_mm6dt6jt",   // Proposal Sent
  "group_mm6dvqnj",   // Closed Deals
];
// Open Events has its own column ids, read from the live board on 2026-08-25. Before this they were
// guessed by column *type*, which wrote the customer name into "Campaign Name" (its title matches
// /name/i) and left gclid, traffic source, campaign, consent and status empty.
const OE = {
  name:      "name",
  phone:     "phone_mm6dxgj2",        // Phone number
  email:     "email_mm6dwhjs",        // Email address
  date:      "date_mm6djw2v",         // Requested event date
  guests:    "numeric_mm6d85m",       // Estimated number of guests
  eventType: "color_mm6dn79a",        // Event type (status)
  status:    "color_mm6d8eqs",        // Status (status) - has a "New Lead" label
  timeOf:    "color_mm6dh5pe",        // Time of event (status): בוקר / צהריים / ערב / גמיש
  notes:     "long_text_mm6d2npw",    // Additional notes or special requests
  // Monday has no mutation that moves a column, only create_column(after_column_id), so putting
  // Start Time back beside End Time meant creating it anew in the right place. The old column
  // (hour_mm6dy9b6) sat 22 columns away from End Time and is retired, not yet deleted.
  startHour: "hour_mm6j2kcg",         // Start Time
  endHour:   "hour_mm6d1kst",         // End Time
  slotText:  "text_mm6d8r2y",         // Start-End
  source:    "text_mm6da5k0",         // Traffic Source
  campaign:  "text_mm6dkmdg",         // Campaign Name
  adGroup:   "text_mm6d2cwt",         // Online campaign I.D
  gclid:     "text_mm6dreje",         // gclid
  consent:   "boolean_mm6d7ret",      // Marketing Approval
  sourceItem:"text_mm6jn3tz",         // Source Item - "<boardId>:<itemId>", set by the mirror sync
};
// What makes a committed date a *published* event rather than a merely blocked one. Added to the
// Open Events board on 2026-08-26; every id below was read back from the live board, not guessed.
// A private birthday and a public chef evening sit in the same committed group and are told apart
// by nothing else, so PUB.publish is the entire safety mechanism: unticked means the site shows the
// date as taken and says nothing whatsoever about it. Default-off, so a new booking cannot become
// public by accident - only by somebody ticking a box.
//
// The mirror sync writes none of these: change_multiple_column_values only sets the keys it is
// handed, so hand-written public copy survives every sync pass. It does not survive the source
// event leaving its committed group, which deletes the mirror item outright.
const PUB = {
  publish:  "boolean_mm6k8swg",       // Publish to site (checkbox) - the flag
  title:    "text_mm6kpbzk",          // Public title
  subtitle: "text_mm6k9g72",          // Public subtitle
  desc:     "long_text_mm6kwzwk",     // Public description
  // Repo-relative image paths, comma separated, first one is the card image. Deliberately not a
  // Monday file column: a file uploaded to Monday is served behind a Monday login, so the public
  // site cannot render it.
  images:   "text_mm6km603",          // Public images
  link:     "link_mm6k9nqy",          // Public link (Instagram)
  entry:    "color_mm6kapv3",         // Entry (status)
  rounds:   "text_mm6ktfbq",          // Seating rounds - "19:00,19:30,20:00"
};
// Committed events from the two working boards are mirrored onto Open Events, money stripped, so
// there is one money-free answer to "what is happening at Ezra and when". Mirrors live in
// "תאריכים תפוסים" and are owned entirely by the sync - see SRC and syncMirror below.
const MIRROR_GROUP = "group_mm6d3y71";
// Both source boards happen to use the same column ids for every field the mirror needs, so one
// map covers both. Anything not listed here is not copied: money cannot leak by omission.
const SRC = {
  date:      "date5bab58wj",          // Requested event date
  startHour: "hour_mm1q610q",         // Start Time
  endHour:   "hour_mm1qa44s",         // End Time
  slotText:  "text_mm4t1h0s",         // Start-End (Text) - Company Events
  slotAlt:   "text_mm2km76j",         // Start-End - Events Form
  eventType: "single_selecta6erdt9",  // Event type
  timeOf:    "single_select943s5p9",  // Time of event
  guests:    "numeric_mm1qj01x",      // Guest Count
  guestsAlt: "number0kzol2wl",        // Estimated number of guests
  notes:     "long_textlwbyhlq0",     // Additional notes or special requests
  origin:    "text_mm6ktd3a",         // Source Item on Events Form - "5102602771:<itemId>" when the
                                      // item was promoted from an Open Events lead (see below)
};
// ---------------------------------------------------------------------------------------------
// Promotion: an Open Events lead that becomes real is copied onto Events Form, the sales pipeline
// of record, so Eylam and the sales manager see it coming. Music leads are worked by Moshe entirely
// on Open Events and would otherwise never appear there.
//
// This lives in the worker rather than in a Monday automation on purpose. The automation route was
// attempted first and abandoned on 2026-08-26: the one-shot builder times out on the create-item
// block, and the workflow expert reports success while leaving the item-name field in a broken
// state and the column map bound to the wrong thing. A promotion that silently writes an unnamed
// item with no provenance marker is the one failure mode that must not ship - it loops.
//
// Commitment is a STATUS, never a payment. An invited show closes with no money attached and is
// still a real evening holding a slot, which is exactly what Moshe books.
const PROMOTE_STATUSES = {
  "Proposal Sent": "group_mm187fg9",   // Events Form -> Proposal Sent
  "Pre Payment":   "group_mm1fz3kg",   // Events Form -> Pre Payment
  "Closed Deal":   "group_mm18mks7",   // Events Form -> Closed Deals
};
// Events Form column ids the promotion writes. SRC above is the read map for the same board; this
// is the write map, and they are deliberately separate - reading a column is not permission to
// write it.
const EF = {
  date:      "date5bab58wj",
  startHour: "hour_mm1q610q",
  endHour:   "hour_mm1qa44s",
  eventType: "single_selecta6erdt9",
  timeOf:    "single_select943s5p9",
  guests:    "numeric_mm1qj01x",
  phone:     "phone0zyibnut",
  email:     "emailj9eufer1",
  notes:     "long_textlwbyhlq0",
  status:    "color_mm18ym70",
  origin:    "text_mm6ktd3a",          // Source Item - the loop guard
};
// Setting the promoted copy's Status is what fires Events Form automation 1717403286, which is the
// account's one guarded route onto the Ivchu operations board. It ALSO fires the five duplicate
// automations created on 2026-08-20 that each write a "🔒 אירוע סגור" item onto Open Events - so
// until four of those five are switched off, promoting with a status attached litters the board
// with five phantom items per deal. Flip this to true the moment they are gone; nothing else needs
// to change. Until then a human moving the promoted item's status does the same job by hand.
const PROMOTE_SETS_STATUS = false;

// Belt and braces on top of the allow-list above: drop any notes line that talks about money.
// Hebrew inflects, and a substring match on the singular does not cover the plural: "העלויות"
// does not contain "עלות" (ע-ל-ו-י-ו-ת against ע-ל-ו-ת), which is how "אשמח לדעת מה העלויות"
// survived the first live run. Match stems, and spell out both apostrophes used for ש"ח.
const MONEY_LINE = /₪|\bILS\b|\bNIS\b|\bprice\b|ש"ח|ש״ח|שקל|מחיר|עלות|עלוי|תשלומ|תשלום|מקדמ|הנחה|הנחת|סה"כ|סה״כ|סהכ|מע"מ|מע״מ|פרייס|תקציב/;
// All company-events leads (booking flow, custom 450+ consultation, abandoned) go to the
// dedicated "Company Events Form" board, each into its matching pipeline group.
const COMPANY_BOARD = "5099350637";
const GRP_AGREEMENT = "group_mm187fg9";   // completed booking flow -> Agreement Sent (active 24h)
const GRP_CUSTOM    = "group_mm4rwdcv";   // custom 450+ consultation -> Custom Package Inquiry (450+)
const GRP_FOLLOWUP  = "group_mm4rtvy5";   // abandoned / "talk to us" -> Packages (Asked For Follow Up!)
const GRP_IN_AGREEMENT = "group_mm18zcww"; // completed package booking -> Packages (In Agreement Process)
// Saved wizard drafts (resume-link feature): items land in a dedicated group on the company board.
const DRAFTS_GROUP    = "group_mm5eq9a9";
const DRAFT_STATE_COL = "long_text_mm5eajcn"; // Long Text — full wizard-state JSON blob
const DRAFT_TOKEN_COL = "text_mm5e3gzm";      // Text — opaque resume token (getDraft looks up by this)
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
  // Cron. Reconciles the Open Events board against the two working boards - see syncMirror. The
  // public calendar does not depend on this running: availability reads the source boards live on
  // every request, so a missed run leaves the board stale, never the site wrong.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      // Promote first: a lead that just became real should reach the pipeline before the mirror
      // pass reads Events Form, so its copy is seen and skipped in the same run rather than the
      // next one.
      promoteLeads(env)
        .then((r) => console.log("promotion:", JSON.stringify(r)))
        .catch((e) => console.error("promotion failed:", e))
        .then(() => syncMirror(env))
        .then((r) => console.log("mirror sync:", JSON.stringify(r)))
        .catch((e) => console.error("mirror sync failed:", e)),
    );
  },

  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    // GET = availability feed for the on-site calendar; OR ?leadById=<id> for the private calculator
    // prefill (secret-gated, never public).
    if (request.method === "GET") {
      const params = new URL(request.url).searchParams;
      const resume = params.get("resume");
      if (resume) return getDraft(resume, env, cors);   // public: restore a saved draft by opaque token
      const leadId = params.get("leadById");
      if (leadId) return leadById(leadId, request, env, cors);
      // Manual mirror run, same code the cron calls. Secret-gated: it writes to a board, and its
      // result names source item ids. Used to verify a deploy without waiting for the schedule.
      if (params.get("sync") === "1") {
        if (!calcAuthorized(request, env)) return json({ ok: false, error: "unauthorized" }, 401, cors);
        const promotion = await promoteLeads(env);
        return json({ promotion, mirror: await syncMirror(env) }, 200, cors);
      }
      return availability(request, env, cors);
    }
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors });

    let d;
    try { d = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400, cors); }

    // Private calculator write-back: complete an existing (abandoned/custom) lead IN PLACE.
    // Secret-gated; fill-only (no group/status change, no contract); never runs CAPI. Company board only.
    if (d.mode === "updateLead") return updateLead(d, request, env, cors);
    // wizard save-for-later (public): create/update a draft item, never a lead, never CAPI.
    if (d.mode === "saveDraft")  return saveDraft(d, request, env, cors);
    if (d.mode === "clearDraft") return clearDraft(d, env, cors);

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
    const isNewsletter = d.leadType === "newsletter";
    // A seat held at a published evening. It is an Open Events lead in every mechanical respect -
    // same board, same New Leads group - and differs only in what the notes say and in never
    // carrying a price. New Leads is deliberately not a committed group, so holding a seat at an
    // evening cannot mark that evening's date unavailable to anyone else.
    const isRsvp = d.leadType === "rsvp";
    const isOpenEvents = d.leadType === "open_events" || isRsvp || d.board === "5102602771";
    const isIncomplete = d.leadType === "incomplete";
    const timeLabel = d.menu === "evening" ? "ערב" : "צהריים";
    const ils = (n) => (n == null ? "" : n + " ₪");
    let notes = isNewsletter ? [
      "סוג פנייה: הרשמה לעדכונים על ערבים פתוחים (ניוזלטר)",
      `נושא: ${d.eventType || "-"}`,
      "★ לא ליד מכירות - בקשה לקבל עדכון על אירועים",
    ].filter(Boolean).join("\n") : isRsvp ? [
      "סוג פנייה: שריון מקום לערב פתוח (מעמוד האירועים)",
      `האירוע: ${d.eventTitle || "-"}`,
      `תאריך: ${d.date || "-"}`,
      d.round ? `סבב ישיבה: ${d.round}` : "",
      `סועדים: ${d.guests ?? "-"}`,
      d.notes ? `הערות: ${d.notes}` : "",
      `אישור דיוור שיווקי: ${d.consent ? "כן" : "לא"}`,
      "★ שריון מקום - לחזור ללקוח ולאשר",
    ].filter(Boolean).join("\n") : isOpenEvents ? [
      "סוג פנייה: ליד מעמוד אירועים פתוחים (Open Events)",
      `סוג אירוע: ${d.eventType || "-"}`,
      `תאריך מבוקש: ${d.date || "-"}`,
      `שעה/סלוט: ${d.slot || "-"}`,
      `אורחים: ${d.guests ?? "-"}`,
      d.notes ? `הערות: ${d.notes}` : "",
      `אישור דיוור שיווקי: ${d.consent ? "כן" : "לא"}`,
    ].filter(Boolean).join("\n") : isIncomplete ? [
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
      single_selecta6erdt9:  { label: d.eventType || (isOpenEvents ? "אירוע פתוח" : "אירוע חברה") },
      number0kzol2wl:        String(d.guests ?? ""),
      numeric_mm1qj01x:      String(d.guests ?? ""),
      short_textoant7hbw:    d.utm_campaign || "",
      short_textgjnrhjdi:    d.utm_source || "",
      color_mm18ym70:        { label: "New Lead" },
    };
    const isPackage = !d.leadType;   // website booking lead (no leadType)
    // Summary blob: company board -> Lead Summary (long_text_mm4t4fjb); private board lacks that
    // column, so keep the blob in long_textlwbyhlq0 there (private path unchanged).
    if (isPrivate || isOpenEvents || isNewsletter) cols.long_textlwbyhlq0 = { text: notes };
    else           cols.long_text_mm4t4fjb = { text: notes };
    const rawSlot = String(d.eventTime || d.slot || "");
    // "ערב (18:00-02:00)" is not a label on the board; "ערב" is. Anything we do
    // not recognise (e.g. "גמיש") is left off the status and stays in the notes.
    const slotLabel = /צהריים/.test(rawSlot) ? "צהריים"
                    : /ערב/.test(rawSlot)    ? "ערב"
                    : /^(צהריים|ערב)$/.test(rawSlot.trim()) ? rawSlot.trim()
                    : "";
    const timeOfEvent = d.menu ? timeLabel : slotLabel;
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
    if (!isPrivate && !isNewsletter && d.name) cols.text_mm4the60 = String(d.name);                  // Contact Name = person
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
    const board = (isOpenEvents || isNewsletter) ? OPEN_EVENTS_BOARD : isPrivate ? PRIVATE_BOARD : COMPANY_BOARD;
    let group = (isOpenEvents || isNewsletter) ? (d.group || OPEN_EVENTS_GROUP)
                : isPrivate ? PRIVATE_GROUP
                : isCustom ? GRP_CUSTOM
                : isIncomplete ? DRAFTS_GROUP
                : GRP_IN_AGREEMENT;
    // A column ID belongs to a board, not to this worker. The map above was written against the
    // Events Form and Company Events boards; Open Events is a separate board with its own IDs, and
    // create_item rejects the whole mutation if it is handed even one ID the board does not have -
    // which is how an Open Events lead was lost. So ask the target board what it actually has and
    // send only that. For Open Events we cannot guess IDs at all, so we map by column type instead.
    const schema = await boardSchema(board, TOKEN);
    let cols2 = cols;
    if (schema) {
      if (isOpenEvents || isNewsletter) {
        cols2 = openEventsCols(schema, d, notes, isNewsletter);
        // Only if the board has been restructured out from under us: keep the type-matching
        // heuristic as a last resort rather than saving a lead with nothing but a name on it.
        if (!Object.keys(cols2).length) cols2 = colsByType(schema, d, notes);
      }
      const known = new Set(schema.columns.map((c) => c.id));
      const unknown = Object.keys(cols2).filter((k) => !known.has(k));
      if (unknown.length) {
        console.warn(`Board ${board} has no column(s): ${unknown.join(", ")} - dropped so the lead still saves.`);
        cols2 = { ...cols2 };
        unknown.forEach((k) => delete cols2[k]);
      }
      if (group && !schema.groups.includes(group)) {
        // Falling through to the board default group is wrong on Open Events: its default group is
        // "תאריכים תפוסים", so a bad group id turns a lead into a blocked date. Browsers also cache
        // events.html, so the retired "topics" id keeps arriving for a while after a deploy. Prefer
        // this worker's own constant, and only give up on the group if that is invalid too.
        const fallback = (board === OPEN_EVENTS_BOARD && schema.groups.includes(OPEN_EVENTS_GROUP))
          ? OPEN_EVENTS_GROUP : null;
        console.warn(`Board ${board} has no group "${group}" - using ${fallback || "the board default group"}.`);
        group = fallback;
      }
    }
    // item name: company for ALL lead types; fall back to person if no company
    const displayName = isRsvp
      ? "שריון · " + String(d.name || "ללא שם")
      : String(d.company || d.name || "ליד מהאתר");
    const variables = {
      board,
      group,
      // no "נטוש ·" prefix on incomplete/abandoned leads: the item's group (Asked For Follow Up)
      // already signals that, and this same name feeds the generated contract - a literal "abandoned"
      // label there would be wrong once the lead comes back and books.
      name: (isCustom ? "שיחת אפיון · " : "") + displayName.slice(0, 230),
      cols: JSON.stringify(cols2),
    };

    try {
      const r = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
        body: JSON.stringify({ query, variables }),
      });
      let out = await r.json();
      // A lead must never be lost to a label the board does not happen to have.
      // create_labels_if_missing is false by design, so if the only problem is a
      // status value we do not recognise, drop those columns and try again - the
      // same information is already in the notes blob.
      if (out.errors) {
        console.error("Monday API errors (attempt 1):", JSON.stringify(out.errors));
        const retryCols = { ...cols2 };
        delete retryCols.single_select943s5p9;   // time of event
        delete retryCols.single_selecta6erdt9;   // event type
        delete retryCols.color_mm18ym70;         // status
        const r2 = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
          body: JSON.stringify({ query, variables: { ...variables, cols: JSON.stringify(retryCols) } }),
        });
        const out2 = await r2.json();
        if (!out2.errors) {
          console.warn("Lead saved on retry without status columns.");
          return json({ ok: true, id: out2.data?.create_item?.id, degraded: true }, 200, cors);
        }
        console.error("Monday API errors (attempt 2):", JSON.stringify(out2.errors));
        return json({ ok: false, error: out2.errors }, 502, cors);
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
// Board schema lookup, so a lead is never lost to a column ID that belongs to a different board.
// Cached per isolate: the shape of a board changes far more slowly than leads arrive.
const _schemaCache = new Map();
async function boardSchema(board, TOKEN) {
  if (_schemaCache.has(board)) return _schemaCache.get(board);
  const query = `query { boards(ids: [${board}]) { columns { id title type settings_str } groups { id } } }`;
  try {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    });
    const out = await r.json();
    if (out.errors) { console.error("boardSchema Monday errors:", JSON.stringify(out.errors)); return null; }
    const b = out?.data?.boards?.[0];
    if (!b) return null;
    const schema = { columns: b.columns || [], groups: (b.groups || []).map((g) => g.id) };
    _schemaCache.set(board, schema);
    return schema;
  } catch (e) {
    // A schema lookup failure must not cost us the lead: the caller falls back to sending the map
    // unfiltered, which is exactly the behaviour we had before.
    console.error("boardSchema failed:", e);
    return null;
  }
}

// Column values for the Open Events board, written against its real column ids (see OE above).
// Status labels are still checked against the live board before they are sent: create_labels_if_missing
// is false, so an invented label fails the whole create_item and loses the lead.
function openEventsCols(schema, d, notes, isNewsletter) {
  const cols = {};
  const byId = new Map((schema?.columns || []).map((c) => [c.id, c]));
  const has = (id) => byId.has(id);
  const labelsOf = (id) => {
    try { return Object.values(JSON.parse(byId.get(id)?.settings_str || "{}").labels || {}); }
    catch { return []; }
  };
  // Write a status only when the board already defines that exact label; otherwise fall back to the
  // first candidate it does define, and if none, leave the column alone. The notes blob has it all.
  const status = (id, ...candidates) => {
    if (!has(id)) return;
    const labels = labelsOf(id);
    const want = candidates.find((l) => l && labels.includes(l));
    if (want) cols[id] = { label: want };
  };

  if (has(OE.email) && d.email)  cols[OE.email] = { email: String(d.email), text: String(d.email) };
  if (has(OE.phone) && d.phone)  cols[OE.phone] = { phone: String(d.phone), countryShortName: "IL" };
  if (has(OE.date)  && d.date)   cols[OE.date]  = { date: d.date };
  if (has(OE.guests) && d.guests != null && d.guests !== "") cols[OE.guests] = String(d.guests);

  // Event type: exact match against whatever the board defines today, so adding a label in Monday
  // starts routing that type correctly with no redeploy. Anything unmatched lands on "אחר" and the
  // customer's own wording stays verbatim in the notes.
  status(OE.eventType, String(d.eventType || "").trim(), "אחר");
  status(OE.status, "New Lead", "ליד חדש", "New");

  const raw = String(d.eventTime || d.slot || "");
  const timeOf = /צהריים/.test(raw) ? "צהריים"
               : /ערב/.test(raw)    ? "ערב"
               : /בוקר/.test(raw)   ? "בוקר"
               : /גמיש/.test(raw)   ? "גמיש"
               : "";
  if (timeOf) status(OE.timeOf, timeOf);

  // "צהריים (12:00-18:00)" -> hour columns 12:00 and 18:00, and a clean "12:00-18:00" text.
  const hm = [...raw.matchAll(/(\d{1,2}):(\d{2})/g)].map((m) => ({ hour: +m[1], minute: +m[2] }));
  if (has(OE.startHour) && hm[0]) cols[OE.startHour] = hm[0];
  if (has(OE.endHour)   && hm[1]) cols[OE.endHour]   = hm[1];
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (t) => `${pad(t.hour)}:${pad(t.minute)}`;
  if (has(OE.slotText) && hm.length) cols[OE.slotText] = hm.slice(0, 2).map(fmt).join("-");

  // Ad attribution, the whole point of parity with the company board.
  if (has(OE.source)   && d.utm_source)   cols[OE.source]   = String(d.utm_source);
  if (has(OE.campaign) && d.utm_campaign) cols[OE.campaign] = String(d.utm_campaign);
  if (has(OE.adGroup)  && d.utm_content)  cols[OE.adGroup]  = String(d.utm_content);
  if (has(OE.gclid)    && d.gclid)        cols[OE.gclid]    = String(d.gclid);
  if (has(OE.consent)  && d.consent)      cols[OE.consent]  = { checked: "true" };

  // Safety net, last: anything that found no column of its own is still readable on the item.
  if (has(OE.notes)) {
    const spare = [
      (!has(OE.email) && d.email) ? `אימייל: ${d.email}` : "",
      (!has(OE.phone) && d.phone) ? `טלפון: ${d.phone}` : "",
      d.name ? `שם איש הקשר: ${d.name}` : "",
      isNewsletter ? "" : `סוג אירוע כפי שנבחר באתר: ${d.eventType || "-"}`,
    ].filter(Boolean);
    cols[OE.notes] = { text: spare.length ? notes + "\n" + spare.join("\n") : notes };
  }
  return cols;
}

// Build column values for a board whose IDs we do not know, by matching on column type. Anything we
// cannot place is not lost - the notes blob already carries every field in full.
function colsByType(schema, d, notes) {
  const cols = {};
  const first = (t) => schema.columns.find((c) => c.type === t)?.id;
  const email = first("email");
  if (email && d.email) cols[email] = { email: String(d.email), text: String(d.email) };
  const phone = first("phone");
  if (phone && d.phone) cols[phone] = { phone: String(d.phone), countryShortName: "IL" };
  const date = first("date");
  if (date && d.date) cols[date] = { date: d.date };
  const num = first("numbers");
  if (num && d.guests != null && d.guests !== "") cols[num] = String(d.guests);
  // Anchored on purpose: an unanchored /name/i also matches "Campaign Name", which is how the
  // customer's name ended up in the campaign column on the Open Events board.
  const nameCol = schema.columns.find((c) => c.type === "text" && /^(שם|שם מלא|שם הלקוח|name|full name|contact name|customer name)$/i.test((c.title || "").trim()));
  if (nameCol && d.name) cols[nameCol.id] = String(d.name);
  // Status only if the board already defines the label. create_labels_if_missing is false, so an
  // invented label would fail the create - the very thing this function exists to prevent.
  const statusCol = schema.columns.find((c) => c.type === "status" || c.type === "color");
  if (statusCol) {
    try {
      const labels = Object.values(JSON.parse(statusCol.settings_str || "{}").labels || {});
      const want = ["New Lead", "ליד חדש", "New"].find((l) => labels.includes(l));
      if (want) cols[statusCol.id] = { label: want };
    } catch { /* unreadable settings: skip the status, keep the lead */ }
  }
  // The notes blob is the safety net, so write it last and fold in any contact detail that did not
  // find a column of its own. A lead with the phone number only in free text is still a lead; a
  // lead with the phone number nowhere is not.
  const long = first("long_text");
  if (long) {
    const spare = [
      (!email && d.email) ? `אימייל: ${d.email}` : "",
      (!phone && d.phone) ? `טלפון: ${d.phone}` : "",
      (!nameCol && d.name) ? `שם: ${d.name}` : "",
    ].filter(Boolean);
    cols[long] = { text: spare.length ? notes + "\n" + spare.join("\n") : notes };
  }
  return cols;
}

// ---------------------------------------------------------------------------------------------
// Mirror: committed events from Events Form and Company Events, money stripped, onto Open Events.
//
// The sync owns exactly the items carrying a Source Item value and nothing else. An item with that
// column empty is somebody's own work - a website enquiry promoted by hand, an event typed straight
// onto the board - and is never created, updated or removed here, whatever group it sits in.
// ---------------------------------------------------------------------------------------------

// Read every item on a board with the given columns, following the cursor to the end.
async function fetchItems(boardId, TOKEN, columnIds) {
  const idsArg = columnIds?.length ? `(ids: ${JSON.stringify(columnIds)})` : "";
  const FIELDS = `
        id
        name
        group { id title }
        column_values${idsArg} { id text ... on DateValue { date } }`;
  const ask = async (query) => {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    });
    return r.json();
  };
  const first = await ask(`query { boards(ids: [${boardId}]) { items_page(limit: 100) { cursor items {${FIELDS}
      } } } }`);
  if (first.errors) throw new Error(`board ${boardId}: ${JSON.stringify(first.errors).slice(0, 300)}`);
  const page = first?.data?.boards?.[0]?.items_page;
  const items = [...(page?.items || [])];
  let cursor = page?.cursor || null;
  for (let i = 0; cursor && i < 20; i++) {
    const more = await ask(`query { next_items_page(limit: 100, cursor: ${JSON.stringify(cursor)}) { cursor items {${FIELDS}
      } } }`);
    if (more.errors) throw new Error(`board ${boardId} page ${i + 2}: ${JSON.stringify(more.errors).slice(0, 300)}`);
    items.push(...(more?.data?.next_items_page?.items || []));
    cursor = more?.data?.next_items_page?.cursor || null;
  }
  return items.map((it) => {
    const cv = {};
    for (const c of (it.column_values || [])) cv[c.id] = c;
    return { id: it.id, name: it.name, groupId: it.group?.id || "", groupTitle: it.group?.title || "", cv };
  });
}

// Notes minus anything that talks about money. Line by line, so one price line does not cost the
// whole note - "40 people, vegan main, projector" survives; "מקדמה 1,500 ₪" does not.
function stripMoney(text) {
  return String(text || "")
    .split("\n")
    .filter((line) => !MONEY_LINE.test(line))
    .join("\n")
    .trim();
}

// The money-free shape of one source event, as text, so a mirror can be compared to its source
// without caring how Monday formats a date or an hour.
function mirrorFields(src, labels) {
  const t = (id) => (src.cv[id]?.text || "").trim();
  const pick = (a, b) => t(a) || t(b);
  // An event type the Open Events board does not define falls back to "אחר": create_labels_if_missing
  // is false, so sending an unknown label would fail the write and lose the mirror entirely.
  const rawType = t(SRC.eventType);
  const eventType = labels.eventType.includes(rawType) ? rawType
                  : labels.eventType.includes("אחר") ? "אחר" : "";
  const rawTimeOf = t(SRC.timeOf);
  const timeOf = labels.timeOf.includes(rawTimeOf) ? rawTimeOf : "";
  return {
    name:      src.name || "אירוע",
    date:      (src.cv[SRC.date]?.date || t(SRC.date) || "").trim(),
    startHour: t(SRC.startHour),
    endHour:   t(SRC.endHour),
    // The Start-End text column is only ever filled for leads the website created; staff entering
    // an event by hand use the two hour pickers and leave it blank. Derive it from them, so the
    // column reads "20:00-01:00" instead of nothing on every hand-entered booking.
    slotText:  pick(SRC.slotText, SRC.slotAlt) || slotFromHours(t(SRC.startHour), t(SRC.endHour)),
    eventType,
    timeOf,
    guests:    pick(SRC.guests, SRC.guestsAlt),
    notes:     stripMoney(t(SRC.notes)),
  };
}

// Two hour-picker values -> "20:00-01:00". Empty unless both ends are known: half a range is more
// misleading on a calendar than no range at all.
function slotFromHours(startText, endText) {
  const a = hourValue(startText), b = hourValue(endText);
  if (!a || !b) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(a.hour)}:${pad(a.minute)}-${pad(b.hour)}:${pad(b.minute)}`;
}

// "06:00 PM" -> {hour:18, minute:0}. Monday renders hour columns in 12-hour form but only accepts
// 24-hour numbers back.
function hourValue(text) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(text || "").trim());
  if (!m) return null;
  let hour = +m[1];
  const ampm = (m[3] || "").toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return { hour, minute: +m[2] };
}

function mirrorColumnValues(f, key) {
  const cols = { [OE.sourceItem]: key };
  if (f.date)      cols[OE.date] = { date: f.date };
  if (f.eventType) cols[OE.eventType] = { label: f.eventType };
  if (f.timeOf)    cols[OE.timeOf] = { label: f.timeOf };
  if (f.guests)    cols[OE.guests] = String(f.guests);
  if (f.slotText)  cols[OE.slotText] = f.slotText;
  const sh = hourValue(f.startHour), eh = hourValue(f.endHour);
  if (sh) cols[OE.startHour] = sh;
  if (eh) cols[OE.endHour] = eh;
  cols[OE.notes] = { text: f.notes };
  return cols;
}

// What an existing mirror currently holds, in the same shape mirrorFields returns, so the two can
// be compared directly and an unchanged event costs no write.
function mirrorCurrent(item) {
  const t = (id) => (item.cv[id]?.text || "").trim();
  return {
    name:      item.name || "",
    date:      (item.cv[OE.date]?.date || t(OE.date) || "").trim(),
    startHour: t(OE.startHour),
    endHour:   t(OE.endHour),
    slotText:  t(OE.slotText),
    eventType: t(OE.eventType),
    timeOf:    t(OE.timeOf),
    guests:    t(OE.guests),
    notes:     t(OE.notes),
  };
}

function sameFields(a, b) {
  const hv = (x) => { const h = hourValue(x); return h ? `${h.hour}:${h.minute}` : ""; };
  return a.name === b.name &&
    a.date === b.date &&
    hv(a.startHour) === hv(b.startHour) &&
    hv(a.endHour) === hv(b.endHour) &&
    a.slotText === b.slotText &&
    a.eventType === b.eventType &&
    a.timeOf === b.timeOf &&
    String(a.guests) === String(b.guests) &&
    a.notes === b.notes;
}

async function mondayMutate(query, variables, TOKEN) {
  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
    body: JSON.stringify({ query, variables }),
  });
  const out = await r.json();
  if (out.errors) throw new Error(JSON.stringify(out.errors).slice(0, 300));
  return out.data;
}

// Copy an Open Events lead onto Events Form once it reaches a committed status. Idempotent by
// reading back what is already there: every promoted copy carries "<openEventsBoard>:<itemId>" in
// Events Form's Source Item, so a lead that already has one is skipped. No extra column on Open
// Events, and no state kept anywhere but the boards themselves.
async function promoteLeads(env) {
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return { ok: false, error: "MONDAY_TOKEN is not set on this deployment" };

  const openSchema = await boardSchema(OPEN_EVENTS_BOARD, TOKEN);
  const formSchema = await boardSchema(AVAIL_BOARD, TOKEN);
  if (!openSchema || !formSchema) return { ok: false, error: "could not read both board schemas" };
  if (!formSchema.columns.some((c) => c.id === EF.origin)) {
    // Without the marker every promoted copy would be mirrored straight back onto Open Events.
    // Refuse rather than create a loop.
    return { ok: false, error: `Events Form has no "${EF.origin}" column - refusing to promote` };
  }
  const labelsOf = (schema, id) => {
    try { return Object.values(JSON.parse(schema.columns.find((c) => c.id === id)?.settings_str || "{}").labels || {}); }
    catch { return []; }
  };
  const formLabels = {
    eventType: labelsOf(formSchema, EF.eventType),
    timeOf:    labelsOf(formSchema, EF.timeOf),
    status:    labelsOf(formSchema, EF.status),
  };

  // Already promoted, read from the target board rather than remembered.
  const promoted = new Set();
  for (const it of await fetchItems(AVAIL_BOARD, TOKEN, [EF.origin])) {
    const marker = (it.cv[EF.origin]?.text || "").trim();
    if (marker) promoted.add(marker);
  }

  const openColumns = [OE.status, OE.date, OE.startHour, OE.endHour, OE.eventType,
                       OE.timeOf, OE.guests, OE.phone, OE.email, OE.notes];
  const out = { ok: true, considered: 0, promoted: 0, skipped: 0, failed: [] };

  const CREATE = `mutation ($board: ID!, $group: String!, $name: String!, $cols: JSON!) {
    create_item(board_id: $board, group_id: $group, item_name: $name, column_values: $cols, create_labels_if_missing: false) { id }
  }`;

  for (const it of await fetchItems(OPEN_EVENTS_BOARD, TOKEN, openColumns)) {
    const status = (it.cv[OE.status]?.text || "").trim();
    const group = PROMOTE_STATUSES[status];
    if (!group) continue;                       // not a committed status
    out.considered++;
    const key = `${OPEN_EVENTS_BOARD}:${it.id}`;
    if (promoted.has(key)) { out.skipped++; continue; }

    const t = (id) => (it.cv[id]?.text || "").trim();
    const cols = { [EF.origin]: key };
    const date = (it.cv[OE.date]?.date || t(OE.date) || "").trim();
    if (date) cols[EF.date] = { date };
    const sh = hourValue(t(OE.startHour)), eh = hourValue(t(OE.endHour));
    if (sh) cols[EF.startHour] = sh;
    if (eh) cols[EF.endHour] = eh;
    if (t(OE.guests)) cols[EF.guests] = t(OE.guests);
    if (t(OE.phone)) cols[EF.phone] = { phone: t(OE.phone), countryShortName: "IL" };
    if (t(OE.email)) cols[EF.email] = { email: t(OE.email), text: t(OE.email) };
    if (t(OE.notes)) cols[EF.notes] = { text: t(OE.notes) };
    // Labels are checked against Events Form's own settings: create_labels_if_missing is false, so
    // an unrecognised label fails the whole create and the lead never reaches the pipeline.
    if (formLabels.eventType.includes(t(OE.eventType))) cols[EF.eventType] = { label: t(OE.eventType) };
    if (formLabels.timeOf.includes(t(OE.timeOf))) cols[EF.timeOf] = { label: t(OE.timeOf) };
    if (PROMOTE_SETS_STATUS && formLabels.status.includes(status)) cols[EF.status] = { label: status };

    try {
      await mondayMutate(CREATE, {
        board: AVAIL_BOARD,
        group: formSchema.groups.includes(group) ? group : null,
        name: (it.name || "אירוע").slice(0, 230),
        cols: JSON.stringify(cols),
      }, TOKEN);
      promoted.add(key);
      out.promoted++;
    } catch (e) {
      console.error(`promote ${key} failed:`, e);
      out.failed.push(key);
    }
  }
  return out;
}

async function syncMirror(env) {
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return { ok: false, error: "MONDAY_TOKEN is not set on this deployment" };

  const target = await boardSchema(OPEN_EVENTS_BOARD, TOKEN);
  if (!target) return { ok: false, error: "could not read the Open Events board schema" };
  if (!target.columns.some((c) => c.id === OE.sourceItem)) {
    // Without the provenance column the sync cannot tell its own items from anyone else's, and the
    // removal step would be free to delete real work. Refuse rather than guess.
    return { ok: false, error: `Open Events board has no "${OE.sourceItem}" column - refusing to sync` };
  }
  const labelsOf = (id) => {
    try { return Object.values(JSON.parse(target.columns.find((c) => c.id === id)?.settings_str || "{}").labels || {}); }
    catch { return []; }
  };
  const labels = { eventType: labelsOf(OE.eventType), timeOf: labelsOf(OE.timeOf) };

  // What should exist.
  const srcColumns = Object.values(SRC);
  const desired = new Map();
  for (const boardId of [AVAIL_BOARD, COMPANY_BOARD]) {
    for (const it of await fetchItems(boardId, TOKEN, srcColumns)) {
      if (!isCommittedGroup(it.groupTitle, it.groupId, boardId)) continue;
      // An item promoted from an Open Events lead carries its origin in Source Item. Mirroring it
      // back would put the same event on Open Events twice - once as the lead that started it,
      // once as a mirror of its own promoted copy. The lead is the original; skip the copy.
      // ANY non-empty value skips: the column exists solely for this marker, and the Monday UI's
      // create-item recipe may only manage a bare item id rather than the "5102602771:<id>" form.
      if ((it.cv[SRC.origin]?.text || "").trim()) continue;
      const f = mirrorFields(it, labels);
      if (!f.date) continue;   // an event with no date cannot hold a slot on a calendar
      desired.set(`${boardId}:${it.id}`, f);
    }
  }

  // What does exist. Only items carrying a Source Item are ours.
  const mirrorColumns = [OE.sourceItem, OE.date, OE.startHour, OE.endHour, OE.slotText,
                         OE.eventType, OE.timeOf, OE.guests, OE.notes];
  const existing = new Map();
  for (const it of await fetchItems(OPEN_EVENTS_BOARD, TOKEN, mirrorColumns)) {
    const key = (it.cv[OE.sourceItem]?.text || "").trim();
    if (!key) continue;
    existing.set(key, it);
  }

  const CREATE = `mutation ($board: ID!, $group: String!, $name: String!, $cols: JSON!) {
    create_item(board_id: $board, group_id: $group, item_name: $name, column_values: $cols, create_labels_if_missing: false) { id }
  }`;
  const UPDATE = `mutation ($board: ID!, $item: ID!, $cols: JSON!) {
    change_multiple_column_values(board_id: $board, item_id: $item, column_values: $cols) { id }
  }`;
  const RENAME = `mutation ($board: ID!, $item: ID!, $name: JSON!) {
    change_column_value(board_id: $board, item_id: $item, column_id: "name", value: $name) { id }
  }`;
  const REMOVE = `mutation ($item: ID!) { delete_item(item_id: $item) { id } }`;

  const out = { ok: true, scanned: desired.size, created: 0, updated: 0, removed: 0, failed: [] };
  const group = target.groups.includes(MIRROR_GROUP) ? MIRROR_GROUP : null;

  for (const [key, f] of desired) {
    const cols = JSON.stringify(mirrorColumnValues(f, key));
    const mirror = existing.get(key);
    try {
      if (!mirror) {
        await mondayMutate(CREATE, { board: OPEN_EVENTS_BOARD, group, name: f.name.slice(0, 230), cols }, TOKEN);
        out.created++;
      } else if (!sameFields(f, mirrorCurrent(mirror))) {
        await mondayMutate(UPDATE, { board: OPEN_EVENTS_BOARD, item: mirror.id, cols }, TOKEN);
        if (mirror.name !== f.name) {
          await mondayMutate(RENAME, { board: OPEN_EVENTS_BOARD, item: mirror.id, name: JSON.stringify(f.name.slice(0, 230)) }, TOKEN);
        }
        out.updated++;
      }
    } catch (e) {
      console.error(`mirror ${key} failed:`, e);
      out.failed.push(key);
    }
  }

  // Anything of ours whose source is no longer committed - cancelled, moved back to a lead group,
  // or deleted outright. delete_item lands in Monday's recycle bin, recoverable for 30 days.
  for (const [key, mirror] of existing) {
    if (desired.has(key)) continue;
    try {
      await mondayMutate(REMOVE, { item: mirror.id }, TOKEN);
      out.removed++;
    } catch (e) {
      console.error(`mirror removal ${key} failed:`, e);
      out.failed.push(key);
    }
  }
  return out;
}

// One definition of "this group means the date is taken", shared by the availability feed and the
// mirror sync. Two copies of this rule would let the public calendar and the Open Events board
// disagree about the same booking, which is exactly the confusion the board exists to end.
// The id lists are board-scoped on purpose. Group ids are NOT unique across boards: group_mm18zcww
// is "New Leads" on Events Form and "Packages (In Agreement Process)" on Company Events. Checking
// every list against every board therefore marked Events Form's New Leads as committed - so every
// private homepage lead was blocking its own requested date on the public calendar.
function isCommittedGroup(title, id, boardId) {
  const t = (title || "").toLowerCase();
  if (t.includes("תפוס") ||
      t.includes("סגור") ||
      t.includes("closed") ||
      t.includes("booked") ||
      t.includes("deal") ||
      t.includes("pre payment") ||
      t.includes("prepayment") ||
      t.includes("proposal") ||
      t.includes("agreement")) return true;
  const b = String(boardId || "");
  if (b === AVAIL_BOARD)        return AVAIL_GROUPS.includes(id);
  if (b === COMPANY_BOARD)      return COMPANY_AVAIL_GROUPS.includes(id);
  if (b === OPEN_EVENTS_BOARD)  return OPEN_AVAIL_GROUPS.includes(id);
  return false;
}

// Read one board's date/time columns. Asking for three boards, every group, 500 items and
// EVERY column (including `value`, a JSON blob per cell) in a single query is what took this
// feed down: Monday rejects the whole query on complexity, the handler logged it and returned
// an empty feed, and an empty feed is indistinguishable from "every date is free". One board
// per request, and only the columns that can carry a date or a time.
async function fetchBoardAvailability(boardId, TOKEN, diag, reasons) {
  const schema = await boardSchema(boardId, TOKEN);
  const wanted = (schema?.columns || [])
    .filter((c) => c.type === "date" || c.type === "hour" || /שעה|שעות|סלוט|time|start|end/i.test(c.title || ""))
    .map((c) => c.id);
  const idsArg = wanted.length ? `(ids: ${JSON.stringify(wanted)})` : "";
  // items_page is asked for once per BOARD, not once per group. Nesting it under groups
  // multiplies the cost by the number of groups, which is what made this query fail.
  const ITEM_FIELDS = `
          id
          name
          group { id }
          column_values${idsArg} {
            id
            type
            text
            ... on DateValue { date }
          }`;
  // items_page returns one page. Events Form holds 226 items against the 100 this used to ask for,
  // so 126 bookings were invisible to the calendar - dates read as free because nobody paged.
  const firstQuery = `query {
    boards(ids: [${boardId}]) {
      id
      groups { id title }
      items_page(limit: 100) {
        cursor
        items {${ITEM_FIELDS}
        }
      }
    }
  }`;
  const pageQuery = (cursor) => `query {
    next_items_page(limit: 100, cursor: ${JSON.stringify(cursor)}) {
      cursor
      items {${ITEM_FIELDS}
      }
    }
  }`;
  const ask = async (query) => {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    });
    return r.json();
  };
  try {
    const out = await ask(firstQuery);
    if (out.errors) {
      const msg = JSON.stringify(out.errors).slice(0, 400);
      console.error(`availability board ${boardId} errors:`, msg);
      if (diag) diag.push(`${boardId}: ${msg}`);
      reasons.push(sanitizeMondayError(out.errors));
      return null;
    }
    const b = out?.data?.boards?.[0];
    if (!b) {
      if (diag) diag.push(`${boardId}: board not returned`);
      return null;
    }
    // Walk the rest of the pages. Bounded so a cursor bug cannot spin: 20 pages is 2000 items,
    // an order of magnitude above the largest board, and running out of pages is logged, not
    // swallowed - a silently truncated calendar is what this whole block exists to stop.
    const items = [...(b.items_page?.items || [])];
    let cursor = b.items_page?.cursor || null;
    for (let page = 0; cursor && page < 20; page++) {
      const more = await ask(pageQuery(cursor));
      if (more.errors) {
        const msg = JSON.stringify(more.errors).slice(0, 400);
        console.error(`availability board ${boardId} page ${page + 2} errors:`, msg);
        if (diag) diag.push(`${boardId} page ${page + 2}: ${msg}`);
        break;
      }
      items.push(...(more?.data?.next_items_page?.items || []));
      cursor = more?.data?.next_items_page?.cursor || null;
    }
    if (cursor) console.warn(`availability board ${boardId}: stopped paging with a cursor still open`);
    b.items_page = { items };
    // Reshape to the groups[].items_page.items form the reader below expects, so the
    // parsing logic underneath is untouched.
    const byGroup = new Map((b.groups || []).map((g) => [g.id, { id: g.id, title: g.title, items_page: { items: [] } }]));
    for (const it of (b.items_page?.items || [])) {
      const gid = it.group?.id;
      if (!byGroup.has(gid)) byGroup.set(gid, { id: gid, title: "", items_page: { items: [] } });
      byGroup.get(gid).items_page.items.push(it);
    }
    return { id: b.id, groups: Array.from(byGroup.values()) };
  } catch (e) {
    console.error(`availability board ${boardId} failed:`, e);
    if (diag) diag.push(`${boardId}: ${String(e).slice(0, 200)}`);
    reasons.push("request failed");
    return null;
  }
}

// The published half of the feed: what is on at Ezra, for the public to read. Everything here is
// content somebody typed into the Public * columns on purpose. Nothing is derived from a lead, a
// name or a note, because those belong to customers - `/events` showed six invented weekday
// templates before this, which was fiction but at least nobody's fiction in particular.
//
// Two rules this function exists to keep:
//   1. Unticked publishes nothing. Not the title, not the notes, not the customer's name.
//   2. A published event still holds its date on the calendar. Publishing changes how a taken
//      evening is *described*, never whether it is taken.
async function fetchPublicEvents(TOKEN) {
  const ids = [PUB.publish, PUB.title, PUB.subtitle, PUB.desc, PUB.images, PUB.link,
               PUB.entry, PUB.rounds, OE.date, OE.startHour, OE.endHour];
  const ITEM_FIELDS = `
        id
        name
        column_values(ids: ${JSON.stringify(ids)}) {
          id
          text
          value
          ... on DateValue { date }
        }`;
  const ask = async (query) => {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "content-type": "application/json", "Authorization": TOKEN, "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    });
    return r.json();
  };
  const first = `query { boards(ids: [${OPEN_EVENTS_BOARD}]) { items_page(limit: 100) { cursor items {${ITEM_FIELDS}
  } } } }`;
  const more = (cursor) => `query { next_items_page(limit: 100, cursor: ${JSON.stringify(cursor)}) { cursor items {${ITEM_FIELDS}
  } } }`;

  const items = [];
  try {
    const out = await ask(first);
    if (out.errors) {
      console.error("public events read errors:", JSON.stringify(out.errors).slice(0, 300));
      return null;
    }
    const page = out?.data?.boards?.[0]?.items_page;
    if (!page) return null;
    items.push(...(page.items || []));
    // Same paging discipline as the availability read: items_page returns one page, and a board
    // that outgrows 100 items would otherwise start dropping published evenings without a word.
    let cursor = page.cursor || null;
    for (let p = 0; cursor && p < 20; p++) {
      const nxt = await ask(more(cursor));
      if (nxt.errors) { console.error("public events page errors:", JSON.stringify(nxt.errors).slice(0, 300)); break; }
      items.push(...(nxt?.data?.next_items_page?.items || []));
      cursor = nxt?.data?.next_items_page?.cursor || null;
    }
  } catch (e) {
    console.error("public events read failed:", e);
    return null;
  }

  const events = [];
  for (const it of items) {
    const cv = {};
    (it.column_values || []).forEach((c) => { cv[c.id] = c; });
    let checked = false;
    try { checked = JSON.parse(cv[PUB.publish]?.value || "{}").checked === true; } catch { checked = false; }
    if (!checked) continue;

    const date = (cv[OE.date]?.date || cv[OE.date]?.text || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;   // an event with no date has nowhere to appear

    const txt = (id) => (cv[id]?.text || "").trim();
    const start = parseHourText(cv[OE.startHour]?.text) || "";
    const end   = parseHourText(cv[OE.endHour]?.text) || "";
    const rounds = txt(PUB.rounds).split(",").map((s) => s.trim()).filter((s) => /^\d{1,2}:\d{2}$/.test(s));
    // Repo-relative only. An absolute URL here would let a board edit point the site's own <img>
    // at any host on the internet, which is not a power a Monday column should have.
    const images = txt(PUB.images).split(",").map((s) => s.trim())
      .filter((s) => s && !/^[a-z]+:/i.test(s) && !s.startsWith("//") && !s.includes(".."));
    let link = "", linkText = "";
    try {
      const raw = JSON.parse(cv[PUB.link]?.value || "{}");
      const u = raw.url || txt(PUB.link);
      // https only: this value becomes an href on a public page, and a board column should not be
      // able to hand a visitor a javascript: or http: destination.
      if (/^https:\/\//i.test(u)) { link = u; linkText = String(raw.text || "").trim(); }
    } catch { link = ""; }

    events.push({
      date,
      title: txt(PUB.title) || it.name,
      subtitle: txt(PUB.subtitle),
      desc: txt(PUB.desc),
      images,
      link,
      linkText,
      entry: txt(PUB.entry),
      rounds,
      // Doors: the first seating round if there is one, otherwise the event's start hour. A
      // sit-down evening opens when the first table does, not when the venue's slot begins.
      doors: rounds[0] || start,
      start,
      end,
    });
  }
  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return events;
}

// Monday's own error text names the cause ("Complexity budget exhausted", "Field 'x'
// doesn't exist on type 'y'") and carries no board content, so a trimmed version is
// safe to return publicly. Anything that looks like an id, address or number is dropped
// so this cannot become a leak if Monday ever changes its message format.
function sanitizeMondayError(errors) {
  let m = "";
  try {
    const first = Array.isArray(errors) ? errors[0] : errors;
    m = String(first?.message || first?.error_code || JSON.stringify(first) || "");
  } catch { m = "unreadable error"; }
  return m
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\b\d{6,}\b/g, "[id]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140) || "unknown error";
}

async function availability(request, env, cors) {
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return json({ booked: [], busy: [], degraded: true, reason: "MONDAY_TOKEN is not set on this deployment", where: "env", build: BUILD_ID }, 200, cors);
  // Secret-gated so the Monday error text is never public. Without this the only signal
  // was an empty feed, which is indistinguishable from a genuinely free calendar.
  const diag = calcAuthorized(request, env) ? [] : null;
  // Collected across the three board reads and surfaced on a degraded response.
  const reasons = [];
  try {
    const ids = [AVAIL_BOARD, COMPANY_BOARD, OPEN_EVENTS_BOARD];
    // Sequential on purpose: three reads at once, each preceded by a schema read, is a
    // six-query burst against a per-minute complexity budget.
    const boards = [];
    for (const id of ids) {
      const b = await fetchBoardAvailability(id, TOKEN, diag, reasons);
      if (b) boards.push(b);
    }
    const missing = ids.length - boards.length;
    if (!boards.length) {
      console.error("availability: no board could be read; returning an empty feed.");
      return json({ booked: [], busy: [], degraded: true, reason: reasons[0] || "unknown", where: "all-boards", build: BUILD_ID, ...(diag ? { errors: diag } : {}) }, 200, cors);
    }
    const busy = [];
    const bookedSet = new Set();

    const normalizeDate = (val, text) => {
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())) return String(val).trim();
      if (text) {
        const t = String(text).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
        const d = new Date(t);
        if (!isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        }
      }
      return null;
    };

    for (const b of boards) {
      for (const g of (b.groups || [])) {
        // Every board is filtered to its booked groups. The Open Events board used to be exempt
        // from this - every group counted, New Leads included - so a single inbound enquiry marked
        // its own requested date unavailable to everyone else the moment it arrived.
        if (!isCommittedGroup(g.title, g.id, b.id)) continue;

        for (const it of (g.items_page?.items || [])) {
          const cv = {};
          let discoveredDate = null;
          let timeSlotText = "";

          (it.column_values || []).forEach((c) => {
            cv[c.id] = c;
            if (!discoveredDate) {
              discoveredDate = normalizeDate(c.date, c.text);
            }
            const txt = (c.text || "").toLowerCase();
            if (txt.includes("צהריים") || txt.includes("ערב") || txt.includes("גמיש") || txt.includes("בוקר") || txt.includes(":")) {
              timeSlotText += " " + txt;
            }
          });

          const date = normalizeDate(cv[DATE_COL]?.date, cv[DATE_COL]?.text) || discoveredDate;
          if (!date) continue;

          let start = parseHourText(cv[HOUR_START_COL]?.text);
          let end = parseHourText(cv[HOUR_END_COL]?.text);
          if (!start || !end) {
            const m = TIME_RANGE_RE.exec(cv[TIME_COL]?.text || timeSlotText);
            if (m) { start = m[1].padStart(2, "0") + ":" + m[2]; end = m[3].padStart(2, "0") + ":" + m[4]; }
          }

          if (!start || !end) {
            if (timeSlotText.includes("צהריים") && !timeSlotText.includes("ערב")) {
              start = "12:00"; end = "18:00";
            } else if (timeSlotText.includes("ערב") && !timeSlotText.includes("צהריים")) {
              start = "18:00"; end = "02:00";
            } else {
              // Both afternoon & evening booked (full day)
              busy.push({ date, start: "12:00", end: "18:00" });
              start = "18:00"; end = "02:00";
            }
          }

          busy.push({ date, start, end });
          bookedSet.add(date);
        }
      }
    }
    const booked = Array.from(bookedSet);
    // A committed event and its Open Events mirror are the same booking read twice. `booked` is a
    // Set so dates are unaffected, but `busy` would carry the slot twice over.
    const seenSlot = new Set();
    const busyUnique = busy.filter((b2) => {
      const k = `${b2.date}|${b2.start}|${b2.end}`;
      if (seenSlot.has(k)) return false;
      seenSlot.add(k);
      return true;
    });
    busy.length = 0;
    busy.push(...busyUnique);
    // degraded says "this feed is incomplete", so the page can tell an empty calendar from a
    // broken one. Without it, a failed read renders as a month of free dates.
    // Published events ride the same response the calendar already fetches: one request, one
    // cache entry, and no window where the page knows a date is taken but not yet why. A failed
    // read is an empty list, never a thrown request - the calendar is the part that must not break.
    const published = (await fetchPublicEvents(TOKEN)) || [];
    const body = missing ? { booked, busy, public: published, degraded: true, reason: reasons[0] || "unknown", where: "some-boards", build: BUILD_ID, ...(diag ? { errors: diag } : {}) } : { booked, busy, public: published, build: BUILD_ID };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": missing ? "no-store" : "public, max-age=60",
        ...cors,
      },
    });
  } catch (e) {
    // This path hid the cause once already: it returned degraded with no reason, which is
    // indistinguishable from the older build and sent us chasing the wrong thing. Anything
    // that throws here now names itself, and `build` proves which bundle is live.
    console.error("availability failed:", e);
    return json({
      booked: [], busy: [], degraded: true,
      reason: sanitizeMondayError([{ message: String(e && e.message || e) }]),
      where: "availability",
      build: BUILD_ID,
    }, 200, cors);   // fail open, but say so
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

// ── Wizard drafts (resume-link). PUBLIC — no secret, since any visitor can save their own draft.
// Keyed by an opaque random token, NEVER the Monday item id (that's a guessable integer, and drafts
// hold name/phone/email — using it would let anyone enumerate other people's contact details).
function randToken() {
  const b = new Uint8Array(16); crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function mondayFetch(token, query, variables) {
  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "content-type": "application/json", "Authorization": token, "API-Version": "2024-01" },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}
// reuse the existing company-board contact columns so a draft is readable at a glance on Monday
function draftContactCols(s) {
  const cols = {};
  if (s.name)  cols.text_mm4the60 = String(s.name);
  if (s.email) cols.emailj9eufer1 = { email: s.email, text: s.email };
  if (s.phone) cols.phone0zyibnut = { phone: String(s.phone), countryShortName: "IL" };
  if (s.guests != null && s.guests !== "") cols.number0kzol2wl = String(s.guests);
  if (s.date)  cols.date5bab58wj = { date: s.date };
  if (s.slot)  cols.text_mm4t1h0s = String(s.slot);
  return cols;
}
async function saveDraft(d, request, env, cors) {
  if (d.hp) return json({ ok: true, dropped: true }, 200, cors);   // honeypot
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return json({ ok: false, error: "no token" }, 503, cors);
  const s = d.state || {};
  const base = d.lang === "en" ? "https://ezratlv.com/english-company-events" : "https://ezratlv.com/company-events";
  const cols = draftContactCols(s);
  cols[DRAFT_STATE_COL] = { text: JSON.stringify(s).slice(0, 60000) };   // long_text safety cap
  try {
    // repeat save from the same visitor -> update the SAME item (client passes back draftId + token)
    if (d.draftId) {
      const q = `mutation ($board: ID!, $item: ID!, $cols: JSON!) {
        change_multiple_column_values(board_id: $board, item_id: $item, column_values: $cols, create_labels_if_missing: false) { id }
      }`;
      const out = await mondayFetch(TOKEN, q, { board: COMPANY_BOARD, item: String(d.draftId), cols: JSON.stringify(cols) });
      if (out.errors) return json({ ok: false, error: out.errors }, 502, cors);
      const token = d.token || "";
      return json({ ok: true, draftId: String(d.draftId), token, url: token ? base + "?resume=" + encodeURIComponent(token) : base }, 200, cors);
    }
    // first save -> mint an opaque token and create the draft item
    const token = randToken();
    cols[DRAFT_TOKEN_COL] = token;
    const name = String(s.name || s.company || "טיוטה מהאתר").slice(0, 230);
    const q = `mutation ($board: ID!, $group: String, $name: String!, $cols: JSON!) {
      create_item(board_id: $board, group_id: $group, item_name: $name, column_values: $cols, create_labels_if_missing: false) { id }
    }`;
    const out = await mondayFetch(TOKEN, q, { board: COMPANY_BOARD, group: DRAFTS_GROUP, name, cols: JSON.stringify(cols) });
    if (out.errors) return json({ ok: false, error: out.errors }, 502, cors);
    const id = out.data?.create_item?.id;
    return json({ ok: true, draftId: String(id), token, url: base + "?resume=" + encodeURIComponent(token) }, 200, cors);
  } catch (e) {
    console.error("saveDraft failed:", e);
    return json({ ok: false, error: String(e) }, 502, cors);
  }
}
async function getDraft(token, env, cors) {
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return json({ ok: false, error: "no token" }, 503, cors);
  if (!token) return json({ ok: false, error: "missing token" }, 400, cors);
  const q = `query ($board: ID!, $cols: [ItemsPageByColumnValuesQuery!]) {
    items_page_by_column_values(board_id: $board, columns: $cols, limit: 1) {
      items { id column_values(ids: ["${DRAFT_STATE_COL}"]) { id text } }
    }
  }`;
  const vars = { board: COMPANY_BOARD, cols: [{ column_id: DRAFT_TOKEN_COL, column_values: [String(token)] }] };
  try {
    const out = await mondayFetch(TOKEN, q, vars);
    if (out.errors) return json({ ok: false, error: out.errors }, 502, cors);
    const it = out.data?.items_page_by_column_values?.items?.[0];
    if (!it) return json({ ok: false, error: "not found" }, 404, cors);
    const blob = (it.column_values || []).find((c) => c.id === DRAFT_STATE_COL)?.text || "";
    let state = {}; try { state = JSON.parse(blob || "{}"); } catch (e) {}
    return json({ ok: true, draftId: String(it.id), state }, 200, cors);
  } catch (e) {
    console.error("getDraft failed:", e);
    return json({ ok: false, error: String(e) }, 502, cors);
  }
}
async function clearDraft(d, env, cors) {
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN || !d.draftId) return json({ ok: true, skipped: true }, 200, cors);
  const q = `mutation ($item: ID!) { delete_item(item_id: $item) { id } }`;
  try {
    await mondayFetch(TOKEN, q, { item: String(d.draftId) });
    return json({ ok: true }, 200, cors);
  } catch (e) {
    console.error("clearDraft failed:", e);
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
