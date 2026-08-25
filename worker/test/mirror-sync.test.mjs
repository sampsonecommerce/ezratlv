// The Open Events board is the money-free answer to "what is happening at Ezra and when".
// syncMirror reconciles it against the two working boards. This drives that reconciliation over a
// stateful mock of all three boards and asserts the four properties that make it safe to run
// unattended every fifteen minutes:
//
//   1. a committed event produces one mirror, with no money on it
//   2. running again changes nothing - the sync is idempotent
//   3. a booking that stops being committed takes its mirror with it
//   4. an item with no Source Item is never touched, in any group
//
//   node worker/test/mirror-sync.test.mjs
import worker from "../ezra-lead-worker.js";

const OPEN = "5102602771", FORM = "5092854682", COMPANY = "5099350637";
const MIRROR_GROUP = "group_mm6d3y71";

const st = (labels) => JSON.stringify({ labels });
const OPEN_COLUMNS = [
  { id: "name", title: "Name", type: "name", settings_str: "{}" },
  { id: "date_mm6djw2v", title: "Requested event date", type: "date", settings_str: "{}" },
  { id: "hour_mm6dy9b6", title: "Start Time", type: "hour", settings_str: "{}" },
  { id: "hour_mm6d1kst", title: "End Time", type: "hour", settings_str: "{}" },
  { id: "text_mm6d8r2y", title: "Start-End", type: "text", settings_str: "{}" },
  { id: "color_mm6dn79a", title: "Event type", type: "status",
    settings_str: st({ 10: "אחר", 105: "אירוע חברה", 106: "יום הולדת" }) },
  { id: "color_mm6dh5pe", title: "Time of event", type: "status",
    settings_str: st({ 14: "גמיש", 105: "צהריים", 106: "בוקר", 109: "ערב" }) },
  { id: "numeric_mm6d85m", title: "Estimated number of guests", type: "numbers", settings_str: "{}" },
  { id: "long_text_mm6d2npw", title: "Additional notes or special requests", type: "long_text", settings_str: "{}" },
  { id: "text_mm6jn3tz", title: "Source Item", type: "text", settings_str: "{}" },
];
const COLUMN_TYPE = new Map(OPEN_COLUMNS.map((c) => [c.id, c.type]));

// Monday renders an hour column back in 12-hour form. Getting this wrong in the mock would hide a
// real idempotency bug: every run would see a difference and rewrite every mirror forever.
const hourText = (v) => {
  const h = v.hour % 12 === 0 ? 12 : v.hour % 12;
  return `${String(h).padStart(2, "0")}:${String(v.minute || 0).padStart(2, "0")} ${v.hour < 12 ? "AM" : "PM"}`;
};
const render = (id, v) => {
  switch (COLUMN_TYPE.get(id)) {
    case "date":      return { text: v.date, date: v.date };
    case "hour":      return { text: hourText(v) };
    case "status":    return { text: v.label };
    case "long_text": return { text: v.text };
    default:          return { text: String(v) };
  }
};

const NOTES = [
  "40 איש, מנה עיקרית טבעונית",
  "מקדמה 1,500 ₪ שולמה",
  "צריך מקרן ומסך",
  "סה\"כ 12,000 ILS כולל בר",
  // Real note from the first live run. The plural inflects away from the singular stem, so a
  // substring match on "עלות" does not see it.
  "אשמח לדעת מה העלויות ולראות תפריט לדוגמא",
  "מחירון לפי ראש 350 ש\"ח",
].join("\n");

const srcItem = (id, name, groupId, groupTitle, over = {}) => ({
  id, name, group: { id: groupId, title: groupTitle },
  cv: {
    date5bab58wj: { text: "2026-11-20", date: "2026-11-20" },
    hour_mm1q610q: { text: "06:00 PM" },
    hour_mm1qa44s: { text: "02:00 AM" },
    text_mm4t1h0s: { text: "" },   // blank on every hand-entered booking - derived from the hours
    single_selecta6erdt9: { text: "אירוע חברה" },
    single_select943s5p9: { text: "ערב" },
    numeric_mm1qj01x: { text: "40" },
    long_textlwbyhlq0: { text: NOTES },
    ...over,
  },
});

const DB = {
  [FORM]: {
    groups: [{ id: "group_mm18zcww", title: "New Leads" }, { id: "group_mm18mks7", title: "Closed Deals" }],
    columns: [], items: [srcItem("111", "חברת אלפא", "group_mm18mks7", "Closed Deals")],
  },
  [COMPANY]: {
    groups: [{ id: "group_mm4rtvy5", title: "Packages (Asked For Follow Up!)" }, { id: "group_mm187fg9", title: "Agreement Sent (Active For 24h)" }],
    columns: [], items: [srcItem("222", "חברת בטא", "group_mm187fg9", "Agreement Sent (Active For 24h)")],
  },
  [OPEN]: {
    groups: [{ id: MIRROR_GROUP, title: "תאריכים תפוסים" }, { id: "group_mm6djw93", title: "New Leads" }],
    columns: OPEN_COLUMNS,
    // A website enquiry somebody promoted by hand. No Source Item. The sync must never remove it,
    // even though it sits in the same group the mirrors live in.
    items: [{ id: "900", name: "ערב פתוח - הרכב ג'אז", group: { id: MIRROR_GROUP, title: "תאריכים תפוסים" }, cv: {} }],
  },
};

let nextId = 1000;
globalThis.fetch = async (_url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  const body = JSON.parse(opts.body);
  const q = body.query || "", v = body.variables || {};

  if (q.includes("create_item")) {
    const b = DB[String(v.board)];
    const cols = JSON.parse(v.cols || "{}");
    const cv = {};
    for (const [id, val] of Object.entries(cols)) cv[id] = render(id, val);
    const g = b.groups.find((x) => x.id === v.group) || b.groups[0];
    const item = { id: String(++nextId), name: v.name, group: { id: g.id, title: g.title }, cv };
    b.items.push(item);
    return J({ data: { create_item: { id: item.id } } });
  }
  if (q.includes("change_multiple_column_values")) {
    const it = DB[String(v.board)].items.find((x) => x.id === String(v.item));
    for (const [id, val] of Object.entries(JSON.parse(v.cols || "{}"))) it.cv[id] = render(id, val);
    return J({ data: { change_multiple_column_values: { id: it.id } } });
  }
  if (q.includes("change_column_value")) {
    const it = DB[String(v.board)].items.find((x) => x.id === String(v.item));
    it.name = JSON.parse(v.name);
    return J({ data: { change_column_value: { id: it.id } } });
  }
  if (q.includes("delete_item")) {
    for (const b of Object.values(DB)) {
      const i = b.items.findIndex((x) => x.id === String(v.item));
      if (i !== -1) { b.items.splice(i, 1); break; }
    }
    return J({ data: { delete_item: { id: String(v.item) } } });
  }

  const boardId = (/boards\(ids: \[(\d+)\]\)/.exec(q) || [])[1];
  const b = DB[boardId];
  if (!b) return J({ data: { boards: [] } });
  if (q.includes("settings_str")) return J({ data: { boards: [{ columns: b.columns, groups: b.groups }] } });

  const ids = (() => { const m = /column_values\(ids: (\[[^\]]*\])\)/.exec(q); return m ? JSON.parse(m[1]) : null; })();
  const items = b.items.map((it) => ({
    id: it.id, name: it.name, group: it.group,
    column_values: Object.entries(it.cv)
      .filter(([id]) => !ids || ids.includes(id))
      .map(([id, val]) => ({ id, ...val })),
  }));
  return J({ data: { boards: [{ id: boardId, groups: b.groups, items_page: { cursor: null, items } }] } });
};

const env = { MONDAY_TOKEN: "test-token", CALC_SECRET: "test-secret" };
const runSync = async () => {
  const r = await worker.fetch(
    new Request("https://ezra-lead.test/?sync=1", { headers: { "x-ezra-calc-secret": "test-secret" } }),
    env,
  );
  return r.json();
};

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
const mirrors = () => DB[OPEN].items.filter((it) => (it.cv.text_mm6jn3tz?.text || "").trim());
const native = () => DB[OPEN].items.filter((it) => !(it.cv.text_mm6jn3tz?.text || "").trim());

// 1. First run: both committed events mirror in, money-free.
const first = await runSync();
check(first.ok === true, `sync failed: ${JSON.stringify(first)}`);
check(first.created === 2, `created ${first.created}, expected 2`);
check(mirrors().length === 2, `${mirrors().length} mirrors on the board, expected 2`);

const m = mirrors().find((x) => x.cv.text_mm6jn3tz.text === `${FORM}:111`);
check(!!m, "no mirror for the Events Form booking");
if (m) {
  check(m.group.id === MIRROR_GROUP, `mirror landed in ${m.group.id}, expected ${MIRROR_GROUP}`);
  check(m.name === "חברת אלפא", `mirror name is ${JSON.stringify(m.name)}`);
  check(m.cv.date_mm6djw2v?.date === "2026-11-20", "date not mirrored");
  check(m.cv.color_mm6dn79a?.text === "אירוע חברה", "event type not mirrored");
  check(m.cv.color_mm6dh5pe?.text === "ערב", "time of event not mirrored");
  check(m.cv.numeric_mm6d85m?.text === "40", "guest count not mirrored");
  check(m.cv.text_mm6d8r2y?.text === "18:00-02:00",
    `Start-End is ${JSON.stringify(m.cv.text_mm6d8r2y?.text)} - should be derived from the hour pickers`);
  check(m.cv.hour_mm6dy9b6?.text === "06:00 PM", `start hour is ${JSON.stringify(m.cv.hour_mm6dy9b6?.text)}`);
  const notes = m.cv.long_text_mm6d2npw?.text || "";
  check(notes.includes("מנה עיקרית טבעונית") && notes.includes("מקרן"), "non-money notes were lost");
  check(!/₪|ILS|מקדמה|סה"כ|עלוי|מחירון|ש"ח/.test(notes), `money survived into the mirrored notes: ${JSON.stringify(notes)}`);
  check(!Object.keys(m.cv).some((id) => /price|numeric_mm1|text_mm1f43ad|text_mm1g6c5r/.test(id)), "a price column was written");
}

// 2. Nothing changed at the source, so nothing should be written.
const second = await runSync();
check(second.created === 0 && second.updated === 0 && second.removed === 0,
  `second run was not idempotent: ${JSON.stringify(second)}`);

// 3. A source booking that stops being committed loses its mirror.
DB[FORM].items[0].group = { id: "group_mm18zcww", title: "New Leads" };
const third = await runSync();
check(third.removed === 1, `removed ${third.removed}, expected 1`);
check(!mirrors().some((x) => x.cv.text_mm6jn3tz.text === `${FORM}:111`), "the stale mirror is still on the board");

// 4. The hand-made item was never any of the sync's business.
check(native().length === 1 && native()[0].id === "900",
  `an item with no Source Item was touched: ${JSON.stringify(native().map((x) => x.name))}`);

// 5. A source edit propagates rather than duplicating.
DB[COMPANY].items[0].cv.numeric_mm1qj01x = { text: "65" };
const fourth = await runSync();
check(fourth.updated === 1 && fourth.created === 0, `edit run was ${JSON.stringify(fourth)}`);
check(mirrors().find((x) => x.cv.text_mm6jn3tz.text === `${COMPANY}:222`)?.cv.numeric_mm6d85m?.text === "65",
  "the guest-count edit did not reach the mirror");

if (fails.length) {
  console.error("FAIL:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log("PASS: mirror is money-free, idempotent, self-cleaning, and leaves hand-made items alone.");
