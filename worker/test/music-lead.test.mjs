// Regression gate for the /music-shows lead path.
//
// A band enquiry is mechanically an Open Events lead, and the whole routing mechanism is one status
// label: Monday automation 1718742172 watches Event type and assigns Moshe, who books the music.
// Two things must therefore hold, and neither is visible from the board once they stop holding:
//
//   1. Event type is "הופעה" - forced by the worker, not trusted from the page.
//   2. It is set by a FOLLOW-UP change_column_value, never inside create_item. A Monday
//      "when the status changes to X" trigger does not fire for a value that arrives at creation,
//      so a type written there is correct on the board and routed to nobody.
//
// Everything the form collects that the board has no column for (Spotify, Instagram, the band's own
// description, the two equipment answers) lives in the notes blob. If that blob loses a field, the
// enquiry reaches Moshe with the useful half missing - so each one is asserted by name.
//
//   node worker/test/music-lead.test.mjs
import worker from "../ezra-lead-worker.js";

const GROUPS = [
  { id: "group_mm6d3y71", title: "תאריכים תפוסים" },
  { id: "group_mm6djw93", title: "New Leads" },
  { id: "group_mm6dfrqr", title: "Pre Payment" },
  { id: "group_mm6dt6jt", title: "Proposal Sent" },
  { id: "group_mm6dvqnj", title: "Closed Deals" },
];

const st = (labels) => JSON.stringify({ labels });
// The live Open Events board (5102602771). "הופעה" and "פופ אפ אוכל" were added on 2026-08-26;
// "הופעה" is the label this whole path depends on, so it is in the mock deliberately.
const COLUMNS = [
  { id: "name", title: "Name", type: "name", settings_str: "{}" },
  { id: "color_mm6dn79a", title: "Event type", type: "status",
    settings_str: st({ 6: "מסיבת פרידה", 9: "הרצאות", 10: "אחר", 12: "מסיבה", 101: "הופעה",
                       102: "מסיבת השמעה", 103: "פופ אפ אוכל", 105: "אירוע חברה", 106: "יום הולדת" }) },
  { id: "color_mm6d8eqs", title: "Status", type: "status",
    settings_str: st({ 7: "New Lead", 13: "Proposal Sent", 105: "Closed Deal", 106: "In Contact" }) },
  { id: "color_mm6dh5pe", title: "Time of event", type: "status",
    settings_str: st({ 14: "גמיש", 105: "צהריים", 106: "בוקר", 109: "ערב" }) },
  { id: "date_mm6djw2v", title: "Requested event date", type: "date", settings_str: "{}" },
  { id: "phone_mm6dxgj2", title: "Phone number", type: "phone", settings_str: "{}" },
  { id: "email_mm6dwhjs", title: "Email address", type: "email", settings_str: "{}" },
  { id: "long_text_mm6d2npw", title: "Additional notes or special requests", type: "long_text", settings_str: "{}" },
  { id: "numeric_mm6d85m", title: "Estimated number of guests", type: "numbers", settings_str: "{}" },
  { id: "hour_mm6j2kcg", title: "Start Time", type: "hour", settings_str: "{}" },
  { id: "hour_mm6d1kst", title: "End Time", type: "hour", settings_str: "{}" },
  { id: "text_mm6d8r2y", title: "Start-End", type: "text", settings_str: "{}" },
  { id: "text_mm6dreje", title: "gclid", type: "text", settings_str: "{}" },
  { id: "text_mm6dkmdg", title: "Campaign Name", type: "text", settings_str: "{}" },
  { id: "text_mm6d2cwt", title: "Online campaign I.D(לחבר!)", type: "text", settings_str: "{}" },
  { id: "text_mm6da5k0", title: "Traffic Source", type: "text", settings_str: "{}" },
  { id: "boolean_mm6d7ret", title: "Marketing Approval", type: "checkbox", settings_str: "{}" },
];

const KNOWN_COLUMNS = new Set(COLUMNS.map((c) => c.id));
const KNOWN_GROUPS = new Set(GROUPS.map((g) => g.id));

let created = null, typed = null;
globalThis.fetch = async (url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  if (!String(url).includes("api.monday.com")) return J({});   // Meta CAPI etc.
  const body = JSON.parse(opts.body);
  const q = body.query || "";

  if (q.includes("change_column_value")) {
    const v = body.variables || {};
    typed = { board: v.board, item: v.item, col: v.col, value: JSON.parse(v.value) };
    return J({ data: { change_column_value: { id: v.item } } });
  }
  if (q.includes("create_item")) {
    const v = body.variables || {};
    // Monday's real behaviour: an unknown group_id is not an error, the item silently lands in the
    // board's top group - which on this board means "date taken".
    const landed = KNOWN_GROUPS.has(v.group) ? v.group : GROUPS[0].id;
    const cols = JSON.parse(v.cols || "{}");
    const unknown = Object.keys(cols).filter((k) => !KNOWN_COLUMNS.has(k));
    if (unknown.length) return J({ errors: [{ message: `Column(s) not found: ${unknown.join(", ")}` }] });
    created = { group: v.group, landed, name: v.name, cols };
    return J({ data: { create_item: { id: "777" } } });
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

const LEAD = {
  leadType: "music",
  board: "5102602771",
  group: "group_mm6djw93",
  eventType: "הופעה",
  name: "להקת בדיקה",
  phone: "0531234567",
  spotify: "https://open.spotify.com/artist/xyz",
  link: "https://instagram.com/testband",
  about: "שלישייה מתל אביב שמנגנת מאז 2024",
  style: "אינדי חשמלי, סט של שעה",
  bringing: "גיטרות וכלים אישיים",
  needs: "תופים, מגברים ומיקרופונים",
  date: "2026-10-11",
  notes: "אפשר סאונדצ'ק מוקדם?",
  utm_source: "music_shows_page",
  utm_campaign: "",
};

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

const out = await (await post(LEAD)).json();

check(out.ok === true, `create_item rejected: ${JSON.stringify(out)}`);
check(created !== null, "create_item was never called");
if (created) {
  const c = created.cols;
  check(created.landed === "group_mm6djw93",
    `music lead landed in "${created.landed}", not New Leads (group_mm6djw93)`);
  check(created.name === "להקת בדיקה", `item name is ${JSON.stringify(created.name)}, expected the band name`);
  check(c.color_mm6d8eqs?.label === "New Lead", `Status is ${JSON.stringify(c.color_mm6d8eqs)}, expected New Lead`);
  check(c.phone_mm6dxgj2?.phone === "0531234567", "phone missing");
  check(c.date_mm6djw2v?.date === "2026-10-11", "requested date missing");
  check(c.text_mm6da5k0 === "music_shows_page", "Traffic Source not written");

  // The routing contract, both halves.
  check(c.color_mm6dn79a === undefined,
    `Event type was written at creation (${JSON.stringify(c.color_mm6dn79a)}) - the Moshe automation will not fire`);
  check(typed?.col === "color_mm6dn79a" && typed?.value?.label === "הופעה",
    `Event type not set to הופעה by a follow-up change: ${JSON.stringify(typed)}`);
  check(typed?.item === "777", `Event type set on item ${JSON.stringify(typed?.item)}, expected the one just created`);
  check(out.eventType === "set", `response reports eventType ${JSON.stringify(out.eventType)}`);

  // Everything with no column of its own has to survive in the notes blob.
  const notes = String(c.long_text_mm6d2npw?.text || "");
  check(notes.includes("/music-shows"), "notes do not say the enquiry came from the music page");
  check(notes.includes("להקת בדיקה"), "notes do not carry the band name");
  check(notes.includes("open.spotify.com/artist/xyz"), "notes do not carry the Spotify link");
  check(notes.includes("instagram.com/testband"), "notes do not carry the Instagram/website link");
  check(notes.includes("שלישייה מתל אביב"), "notes do not carry the band's own description");
  check(notes.includes("אינדי חשמלי"), "notes do not carry the performance style");
  check(notes.includes("גיטרות וכלים אישיים"), "notes do not carry what the band brings");
  check(notes.includes("תופים, מגברים ומיקרופונים"), "notes do not carry what the band needs from us");
  check(notes.includes("סאונדצ'ק מוקדם"), "notes do not carry the band's own question");
  check(notes.includes("מושה"), "notes do not flag the lead for Moshe");
}

// The page could be cached, edited, or simply wrong about the label. Routing may not depend on it:
// the worker forces "הופעה" whatever the page sent.
created = null; typed = null;
await post({ ...LEAD, eventType: "אחר" });
check(typed?.value?.label === "הופעה",
  `a page sending the wrong Event type broke routing: ${JSON.stringify(typed?.value)}`);

// The date is optional on this form by design ("אפשר גם בערך"), and an enquiry with no date must
// still save rather than being rejected or filed with an empty date column.
created = null; typed = null;
const noDate = await (await post({ ...LEAD, date: "", notes: "", spotify: "" })).json();
check(noDate.ok === true, `dateless music lead was rejected: ${JSON.stringify(noDate)}`);
check(created?.cols?.date_mm6djw2v === undefined, "an empty date was written to the date column");
check(String(created?.cols?.long_text_mm6d2npw?.text || "").includes("לא צוין"),
  "notes do not say the band gave no date");

// New Leads is not a committed group, so an enquiry may never mark its own requested date as taken
// for everybody else.
const feed = await (await worker.fetch(new Request("https://ezra-lead.test/"), env)).json();
check(!feed.degraded, `availability degraded: ${feed.reason || "?"}`);

if (fails.length) {
  console.error("FAIL:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log("PASS: music lead lands in New Leads, is typed הופעה by a follow-up call, and keeps every form field.");
