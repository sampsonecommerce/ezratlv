// Regression gate for the homepage private-event lead path.
//
// Two things went wrong on 2026-09-06 and neither was visible from the board:
//
//   1. The page showed "קיבלנו, תודה!" for a lead that never arrived. That half is fixed on the
//      page (awaited fetch, keepalive). This half is the worker's contract with that page: a
//      lead with phone OR email is accepted and stored without writing an empty Monday value
//      into the other column; a lead with neither is refused with 400, never silently dropped.
//   2. Every lead without a UTM read "website / private_form", so Google organic and a
//      WhatsApp-shared link were indistinguishable. The page now sends `referrer`; the worker
//      turns it into a Traffic Source. A payload with no `referrer` key (old cached page) must
//      keep whatever it sent.
//
//   node worker/test/private-lead.test.mjs
import worker from "../ezra-lead-worker.js";

const GROUPS = [
  { id: "group_mm18zcww", title: "New Leads" },
  { id: "group_mm18g8a8", title: "In Contact" },
  { id: "group_mm18mks7", title: "Closed Deals" },
];
const st = (labels) => JSON.stringify({ labels });
// The live Private Events board (5092854682), the columns the worker writes for this path.
const COLUMNS = [
  { id: "name", title: "Name", type: "name", settings_str: "{}" },
  { id: "color_mm18ym70", title: "Status", type: "status", settings_str: st({ 4: "New Lead", 0: "In Contact" }) },
  { id: "single_selecta6erdt9", title: "Event type", type: "status", settings_str: st({ 0: "יום הולדת", 2: "אירוסין", 4: "אחר" }) },
  { id: "single_select943s5p9", title: "Time of event", type: "status", settings_str: st({ 0: "צהריים", 1: "בוקר", 2: "ערב", 3: "גמיש" }) },
  { id: "single_selectl0ocmt7", title: "Best time to call", type: "status", settings_str: st({ 0: "בוקר (09:00 -12:00)", 3: "בכל זמן במהלך היום" }) },
  { id: "date5bab58wj", title: "Requested event date", type: "date", settings_str: "{}" },
  { id: "phone0zyibnut", title: "Phone number", type: "phone", settings_str: "{}" },
  { id: "emailj9eufer1", title: "Email address", type: "email", settings_str: "{}" },
  { id: "number0kzol2wl", title: "Estimated number of guests", type: "numbers", settings_str: "{}" },
  { id: "numeric_mm1qj01x", title: "Guest Count", type: "numbers", settings_str: "{}" },
  { id: "dropdown_mm1qs76g", title: "Age range of attendees", type: "dropdown", settings_str: "{}" },
  { id: "long_textlwbyhlq0", title: "Additional notes or special requests", type: "long_text", settings_str: "{}" },
  { id: "short_textoant7hbw", title: "Campaign Name", type: "text", settings_str: "{}" },
  { id: "short_textgjnrhjdi", title: "Traffic Source", type: "text", settings_str: "{}" },
  { id: "boolean_mm4nqth1", title: "Marketing Approval", type: "checkbox", settings_str: "{}" },
];
const KNOWN_COLUMNS = new Set(COLUMNS.map((c) => c.id));

let created = null;
globalThis.fetch = async (url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  if (!String(url).includes("api.monday.com")) return J({});   // Meta CAPI etc.
  const body = JSON.parse(opts.body);
  const q = body.query || "";
  if (q.includes("create_item")) {
    const v = body.variables || {};
    const cols = JSON.parse(v.cols || "{}");
    const unknown = Object.keys(cols).filter((k) => !KNOWN_COLUMNS.has(k));
    if (unknown.length) return J({ errors: [{ message: `Column(s) not found: ${unknown.join(", ")}` }] });
    // Monday rejects an empty email/phone value outright - mirror that so a regression fails here.
    if (cols.emailj9eufer1 && !cols.emailj9eufer1.email) return J({ errors: [{ message: "invalid email value" }] });
    if (cols.phone0zyibnut && !cols.phone0zyibnut.phone) return J({ errors: [{ message: "invalid phone value" }] });
    created = { board: v.board, group: v.group, name: v.name, cols };
    return J({ data: { create_item: { id: "888" } } });
  }
  return J({ data: { boards: [{ columns: COLUMNS, groups: GROUPS }] } });
};

const env = { MONDAY_TOKEN: "test-token" };
const post = (payload) => worker.fetch(
  new Request("https://ezra-lead.test/", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://ezratlv.com" },
    body: JSON.stringify(payload),
  }),
  env,
);

const BASE = {
  leadType: "private",
  name: "דנה כהן",
  eventType: "אירוסין",
  date: "2026-11-20",
  eventTime: "ערב",
  guests: 35,
  ageRanges: ["27- 30"],
  callbackTime: "בכל זמן במהלך היום",
  notes: "",
  consent: false,
  utm_campaign: "private_form",
  utm_source: "website",
};

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
async function run(payload) { created = null; const r = await post(payload); return { status: r.status, out: await r.json() }; }

// 1. phone only, Google organic referrer
{
  const { status, out } = await run({ ...BASE, phone: "0501234567", email: "", referrer: "https://www.google.com/" });
  check(status === 200 && out.ok === true, `phone-only lead rejected: ${status} ${JSON.stringify(out)}`);
  check(created?.board === "5092854682", `landed on board ${created?.board}, expected the Private Events board`);
  check(created?.group === "group_mm18zcww", `landed in ${created?.group}, expected New Leads`);
  check(created?.cols.phone0zyibnut?.phone === "0501234567", "phone column not written");
  check(created?.cols.emailj9eufer1 === undefined, `empty email was written: ${JSON.stringify(created?.cols.emailj9eufer1)}`);
  check(created?.cols.short_textgjnrhjdi === "google_organic", `Traffic Source is ${JSON.stringify(created?.cols.short_textgjnrhjdi)}, expected google_organic`);
  check(created?.cols.boolean_mm4nqth1 === undefined, "Marketing Approval was written for an unticked consent");
  check(String(created?.cols.long_textlwbyhlq0?.text || "").includes("google.com"), "notes do not carry the referrer");
}
// 2. email only, direct
{
  const { status, out } = await run({ ...BASE, phone: "", email: "dana@example.com", referrer: "" });
  check(status === 200 && out.ok === true, `email-only lead rejected: ${status} ${JSON.stringify(out)}`);
  check(created?.cols.emailj9eufer1?.email === "dana@example.com", "email column not written");
  check(created?.cols.phone0zyibnut === undefined, `empty phone was written: ${JSON.stringify(created?.cols.phone0zyibnut)}`);
  check(created?.cols.short_textgjnrhjdi === "direct", `Traffic Source is ${JSON.stringify(created?.cols.short_textgjnrhjdi)}, expected direct`);
}
// 3. neither -> 400, nothing created
{
  const { status, out } = await run({ ...BASE, phone: "", email: "", referrer: "" });
  check(status === 400 && out.ok === false, `contact-less lead was not refused: ${status} ${JSON.stringify(out)}`);
  check(created === null, "contact-less lead still reached create_item");
}
// 4. a real UTM is never overridden by the referrer
{
  await run({ ...BASE, phone: "0501234567", utm_source: "instagram", utm_campaign: "bio_form", referrer: "https://l.instagram.com/" });
  check(created?.cols.short_textgjnrhjdi === "instagram", `UTM source was overridden: ${JSON.stringify(created?.cols.short_textgjnrhjdi)}`);
  check(created?.cols.short_textoant7hbw === "bio_form", "campaign lost");
}
// 5. old cached page: no referrer key at all -> leave "website"
{
  await run({ ...BASE, phone: "0501234567" });
  check(created?.cols.short_textgjnrhjdi === "website", `no-referrer payload became ${JSON.stringify(created?.cols.short_textgjnrhjdi)}, expected website untouched`);
}
// 6. referrer hosts
for (const [ref, want] of [
  ["https://ezratlv.com/company-events", "website"],
  ["https://l.instagram.com/?u=x", "instagram"],
  ["https://m.facebook.com/", "facebook"],
  ["https://chatgpt.com/", "chatgpt.com"],
  ["https://www.bing.com/search?q=ezra", "bing_organic"],
]) {
  await run({ ...BASE, phone: "0501234567", referrer: ref });
  check(created?.cols.short_textgjnrhjdi === want, `${ref} -> ${JSON.stringify(created?.cols.short_textgjnrhjdi)}, expected ${want}`);
}

if (fails.length) { console.error("private-lead test FAILED:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("private-lead test passed");
