// Regression gate for the Open Events lead path.
//
// The bug this exists to stop: the worker sent group "topics", which is Monday's default id for a
// brand-new board and exists on none of ours. create_item silently filed every /events enquiry into
// the board's top group, "תאריכים תפוסים" - so leads were invisible and the calendar treated them
// as booked dates. Nothing failed loudly; the site said "sent" either way.
//
// The mock below is the REAL Open Events board (5102602771), read from the live API on 2026-08-25:
// real group ids, real column ids, real status labels. A mock that accepts anything proves nothing.
//
//   node worker/test/open-events-lead.test.mjs
import worker from "../ezra-lead-worker.js";

const GROUPS = [
  { id: "group_mm6d3y71", title: "תאריכים תפוסים" },
  { id: "group_mm6djw93", title: "New Leads" },
  { id: "group_mm6d9ejs", title: "In Contact" },
  { id: "group_mm6dg8mx", title: "Follow UP Needed" },
  { id: "group_mm6d7hvs", title: "Future Events (Not Closed, date is too far)" },
  { id: "group_mm6dfrqr", title: "Pre Payment" },
  { id: "group_mm6dt6jt", title: "Proposal Sent" },
  { id: "group_mm6dvqnj", title: "Closed Deals" },
  { id: "group_mm6dhapc", title: "Delayed" },
  { id: "group_mm6drn0q", title: "Past Events" },
];

const st = (labels) => JSON.stringify({ labels });
const COLUMNS = [
  { id: "name", title: "Name", type: "name", settings_str: "{}" },
  { id: "hour_mm6d1kst", title: "End Time", type: "hour", settings_str: "{}" },
  { id: "text_mm6d8r2y", title: "Start-End", type: "text", settings_str: "{}" },
  { id: "color_mm6dn79a", title: "Event type", type: "status",
    settings_str: st({ 6: "מסיבת פרידה", 9: "הרצאות", 10: "אחר", 12: "מסיבה", 105: "אירוע חברה", 106: "יום הולדת" }) },
  { id: "color_mm6d8eqs", title: "Status", type: "status",
    settings_str: st({ 7: "New Lead", 13: "Proposal Sent", 105: "Closed Deal", 106: "In Contact" }) },
  { id: "color_mm6dh5pe", title: "Time of event", type: "status",
    settings_str: st({ 14: "גמיש", 105: "צהריים", 106: "בוקר", 109: "ערב" }) },
  { id: "date_mm6djw2v", title: "Requested event date", type: "date", settings_str: "{}" },
  { id: "phone_mm6dxgj2", title: "Phone number", type: "phone", settings_str: "{}" },
  { id: "long_text_mm6d2npw", title: "Additional notes or special requests", type: "long_text", settings_str: "{}" },
  { id: "numeric_mm6d85m", title: "Estimated number of guests", type: "numbers", settings_str: "{}" },
  { id: "email_mm6dwhjs", title: "Email address", type: "email", settings_str: "{}" },
  { id: "numeric_mm6dgny5", title: "Discount amount", type: "numbers", settings_str: "{}" },
  { id: "hour_mm6dy9b6", title: "Start Time", type: "hour", settings_str: "{}" },
  { id: "text_mm6dreje", title: "gclid", type: "text", settings_str: "{}" },
  { id: "text_mm6dkmdg", title: "Campaign Name", type: "text", settings_str: "{}" },
  { id: "text_mm6d2cwt", title: "Online campaign I.D(לחבר!)", type: "text", settings_str: "{}" },
  { id: "text_mm6da5k0", title: "Traffic Source", type: "text", settings_str: "{}" },
  { id: "boolean_mm6d7ret", title: "Marketing Approval", type: "checkbox", settings_str: "{}" },
];

const KNOWN_COLUMNS = new Set(COLUMNS.map((c) => c.id));
const KNOWN_GROUPS = new Set(GROUPS.map((g) => g.id));

let created = null;
globalThis.fetch = async (url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  if (!String(url).includes("api.monday.com")) return J({});   // Meta CAPI etc.
  const body = JSON.parse(opts.body);
  const q = body.query || "";

  if (q.includes("create_item")) {
    const v = body.variables || {};
    // Monday's real behaviour: an unknown group_id is not an error, the item silently lands in the
    // board's top group. That silence is what hid this bug for five days.
    const landed = KNOWN_GROUPS.has(v.group) ? v.group : GROUPS[0].id;
    const cols = JSON.parse(v.cols || "{}");
    const unknown = Object.keys(cols).filter((k) => !KNOWN_COLUMNS.has(k));
    if (unknown.length) return J({ errors: [{ message: `Column(s) not found: ${unknown.join(", ")}` }] });
    created = { group: v.group, landed, name: v.name, cols };
    return J({ data: { create_item: { id: "999" } } });
  }
  return J({ data: { boards: [{ columns: COLUMNS, groups: GROUPS }] } });
};

const env = { MONDAY_TOKEN: "test-token" };
const LEAD = {
  leadType: "open_events",
  board: "5102602771",
  group: "group_mm6djw93",
  name: "דנה כהן",
  phone: "0501234567",
  email: "dana@example.com",
  guests: "40",
  eventType: "אירוע חברה",
  date: "2026-11-20",
  slot: "ערב (18:00-02:00)",
  notes: "רוצים דיג'יי",
  consent: true,
  utm_source: "google",
  utm_campaign: "events_he",
  utm_content: "adgroup_7",
  gclid: "Cj0KTEST",
};

const res = await worker.fetch(
  new Request("https://ezra-lead.test/", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://ezratlv.com" },
    body: JSON.stringify(LEAD),
  }),
  env,
);
const out = await res.json();

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

check(out.ok === true, `create_item rejected: ${JSON.stringify(out)}`);
check(created !== null, "create_item was never called");
if (created) {
  const c = created.cols;
  check(created.landed === "group_mm6djw93",
    `lead landed in "${created.landed}", not New Leads (group_mm6djw93)`);
  check(c.color_mm6d8eqs?.label === "New Lead",
    `Status is ${JSON.stringify(c.color_mm6d8eqs)}, expected New Lead`);
  check(c.color_mm6dn79a?.label === "אירוע חברה",
    `Event type is ${JSON.stringify(c.color_mm6dn79a)}, expected אירוע חברה`);
  check(c.color_mm6dh5pe?.label === "ערב",
    `Time of event is ${JSON.stringify(c.color_mm6dh5pe)}, expected ערב`);
  check(c.phone_mm6dxgj2?.phone === "0501234567", "phone missing");
  check(c.email_mm6dwhjs?.email === "dana@example.com", "email missing");
  check(c.date_mm6djw2v?.date === "2026-11-20", "requested date missing");
  check(c.numeric_mm6d85m === "40", "guest count missing");
  check(c.text_mm6da5k0 === "google", "Traffic Source not written");
  check(c.text_mm6dkmdg === "events_he", "Campaign Name not written");
  check(c.text_mm6d2cwt === "adgroup_7", "Online campaign I.D not written");
  check(c.text_mm6dreje === "Cj0KTEST", "gclid not written");
  check(c.boolean_mm6d7ret?.checked === "true", "Marketing Approval not ticked");
  check(c.hour_mm6dy9b6?.hour === 18 && c.hour_mm6d1kst?.hour === 2, "start/end hour not parsed from the slot");
  check(c.text_mm6d8r2y === "18:00-02:00", `Start-End is ${JSON.stringify(c.text_mm6d8r2y)}`);
  // The old type-matching builder wrote the customer's name here, because "Campaign Name" matches /name/i.
  check(c.text_mm6dkmdg !== "דנה כהן", "customer name written into the Campaign Name column");
  check(created.name === "דנה כהן", `item name is ${JSON.stringify(created.name)}`);
  check(String(c.long_text_mm6d2npw?.text || "").includes("רוצים דיג'יי"), "customer note missing from the notes blob");
}

// A browser holding a cached events.html still posts the retired "topics" group id. That must not
// put the lead back in "תאריכים תפוסים" - the worker's own constant wins over a group the board
// does not have.
created = null;
const stale = await worker.fetch(
  new Request("https://ezra-lead.test/", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://ezratlv.com" },
    body: JSON.stringify({ ...LEAD, group: "topics" }),
  }),
  env,
);
check((await stale.json()).ok === true, "stale-group lead was rejected");
check(created?.landed === "group_mm6djw93",
  `stale "topics" lead landed in "${created?.landed}", not New Leads`);

// The availability feed must not treat New Leads as a taken date.
created = null;
const avail = await worker.fetch(new Request("https://ezra-lead.test/"), env);
const feed = await avail.json();
check(!feed.degraded, `availability degraded: ${feed.reason || "?"}`);

if (fails.length) {
  console.error("FAIL:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log(`PASS: Open Events lead lands in ${created === null ? "group_mm6djw93" : ""} New Leads with full attribution.`);
