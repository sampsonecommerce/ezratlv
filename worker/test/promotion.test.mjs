// A lead that becomes real on Open Events has to reach Events Form, the sales pipeline of record.
// Music leads are worked entirely on Open Events by somebody outside the company, so without this
// they would never appear where the sales manager and Eylam look.
//
// The properties that make it safe to run unattended every fifteen minutes:
//
//   1. only committed statuses promote - a New Lead does not
//   2. every promoted copy carries the Source Item marker, or the mirror sync loops it straight back
//   3. running again promotes nothing new
//   4. commitment is a STATUS, not a payment - an invited show with no money still promotes
//   5. a label Events Form does not define is dropped, never sent (create_labels_if_missing: false
//      means one bad label fails the whole create and the lead never arrives)
//
//   node worker/test/promotion.test.mjs
import worker from "../ezra-lead-worker.js";

const OPEN = "5102602771", FORM = "5092854682", COMPANY = "5099350637";

const st = (labels) => JSON.stringify({ labels });
const OPEN_COLUMNS = [
  { id: "name", title: "Name", type: "name", settings_str: "{}" },
  { id: "color_mm6d8eqs", title: "Status", type: "status",
    settings_str: st({ 7: "New Lead", 13: "Proposal Sent", 19: "Pre Payment", 105: "Closed Deal" }) },
  { id: "date_mm6djw2v", title: "Requested event date", type: "date", settings_str: "{}" },
  { id: "hour_mm6j2kcg", title: "Start Time", type: "hour", settings_str: "{}" },
  { id: "hour_mm6d1kst", title: "End Time", type: "hour", settings_str: "{}" },
  { id: "color_mm6dn79a", title: "Event type", type: "status",
    settings_str: st({ 3: "הופעה", 10: "אחר", 105: "אירוע חברה" }) },
  { id: "color_mm6dh5pe", title: "Time of event", type: "status", settings_str: st({ 109: "ערב" }) },
  { id: "numeric_mm6d85m", title: "Estimated number of guests", type: "numbers", settings_str: "{}" },
  { id: "phone_mm6dxgj2", title: "Phone number", type: "phone", settings_str: "{}" },
  { id: "email_mm6dwhjs", title: "Email address", type: "email", settings_str: "{}" },
  { id: "long_text_mm6d2npw", title: "Additional notes", type: "long_text", settings_str: "{}" },
  { id: "text_mm6jn3tz", title: "Source Item", type: "text", settings_str: "{}" },
];
// Events Form deliberately does NOT define "הופעה" here: that label was added to both boards on
// 2026-08-26, and this asserts the promotion survives a board that has not caught up.
const FORM_COLUMNS = [
  { id: "name", title: "Name", type: "name", settings_str: "{}" },
  { id: "color_mm18ym70", title: "Status", type: "status",
    settings_str: st({ 13: "Proposal Sent", 19: "Pre Payment", 105: "Closed Deal" }) },
  { id: "date5bab58wj", title: "Requested event date", type: "date", settings_str: "{}" },
  { id: "hour_mm1q610q", title: "Start Time", type: "hour", settings_str: "{}" },
  { id: "hour_mm1qa44s", title: "End Time", type: "hour", settings_str: "{}" },
  { id: "single_selecta6erdt9", title: "Event type", type: "status", settings_str: st({ 105: "אירוע חברה" }) },
  { id: "single_select943s5p9", title: "Time of event", type: "status", settings_str: st({ 109: "ערב" }) },
  { id: "numeric_mm1qj01x", title: "Guest Count", type: "numbers", settings_str: "{}" },
  { id: "phone0zyibnut", title: "Phone number", type: "phone", settings_str: "{}" },
  { id: "emailj9eufer1", title: "Email address", type: "email", settings_str: "{}" },
  { id: "long_textlwbyhlq0", title: "Additional notes", type: "long_text", settings_str: "{}" },
  { id: "text_mm6ktd3a", title: "Source Item", type: "text", settings_str: "{}" },
];

const openItem = (id, name, status, over = {}) => ({
  id, name, group: { id: "group_mm6djw93", title: "New Leads" },
  cv: {
    color_mm6d8eqs: { text: status },
    date_mm6djw2v: { text: "2026-12-04", date: "2026-12-04" },
    hour_mm6j2kcg: { text: "08:00 PM" },
    hour_mm6d1kst: { text: "01:00 AM" },
    color_mm6dn79a: { text: "הופעה" },
    color_mm6dh5pe: { text: "ערב" },
    numeric_mm6d85m: { text: "80" },
    phone_mm6dxgj2: { text: "0501234567" },
    email_mm6dwhjs: { text: "band@example.com" },
    long_text_mm6d2npw: { text: "הרכב אינדי, סאונדצ'ק ב-18:00" },
    ...over,
  },
});

const DB = {
  [OPEN]: {
    groups: [{ id: "group_mm6d3y71", title: "תאריכים תפוסים" }, { id: "group_mm6djw93", title: "New Leads" }],
    columns: OPEN_COLUMNS,
    items: [
      // An invited show: committed, no payment anywhere. This is the case the whole design turns on.
      openItem("501", "הרכב אינדי - ערב הופעה", "Closed Deal"),
      openItem("502", "מסיבת השמעה - אלבום חדש", "Proposal Sent"),
      // Not committed. Must not promote.
      openItem("503", "פנייה חדשה", "New Lead"),
    ],
  },
  [FORM]: {
    groups: [
      { id: "group_mm18zcww", title: "New Leads" },
      { id: "group_mm187fg9", title: "Proposal Sent" },
      { id: "group_mm1fz3kg", title: "Pre Payment" },
      { id: "group_mm18mks7", title: "Closed Deals" },
    ],
    columns: FORM_COLUMNS,
    items: [],
  },
  [COMPANY]: { groups: [], columns: [], items: [] },
};

let nextId = 9000;
globalThis.fetch = async (_url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  const body = JSON.parse(opts.body);
  const q = body.query || "", v = body.variables || {};

  if (q.includes("create_item")) {
    const b = DB[String(v.board)];
    const cols = JSON.parse(v.cols || "{}");
    const known = new Set(b.columns.map((c) => c.id));
    const unknown = Object.keys(cols).filter((k) => !known.has(k));
    if (unknown.length) return J({ errors: [{ message: `Column(s) not found: ${unknown.join(", ")}` }] });
    // create_labels_if_missing is false in the real mutation: a label the board does not define
    // fails the whole create. The mock must be just as strict or it proves nothing.
    for (const [id, val] of Object.entries(cols)) {
      if (val && typeof val === "object" && val.label) {
        const defined = Object.values(JSON.parse(b.columns.find((c) => c.id === id).settings_str || "{}").labels || {});
        if (!defined.includes(val.label)) return J({ errors: [{ message: `Label "${val.label}" not found on ${id}` }] });
      }
    }
    const g = b.groups.find((x) => x.id === v.group) || b.groups[0];
    const cv = {};
    for (const [id, val] of Object.entries(cols)) {
      cv[id] = typeof val === "object"
        ? { text: val.label || val.date || val.email || val.phone || val.text || "", ...(val.date ? { date: val.date } : {}) }
        : { text: String(val) };
    }
    const item = { id: String(++nextId), name: v.name, group: { id: g.id, title: g.title }, cv };
    b.items.push(item);
    return J({ data: { create_item: { id: item.id } } });
  }
  if (q.includes("change_multiple_column_values") || q.includes("change_column_value") || q.includes("delete_item")) {
    return J({ data: {} });
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
const run = async () => {
  const r = await worker.fetch(
    new Request("https://ezra-lead.test/?sync=1", { headers: { "x-ezra-calc-secret": "test-secret" } }),
    env,
  );
  return (await r.json()).promotion;
};

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
const formItems = () => DB[FORM].items;

// 1. Committed leads promote; the uncommitted one does not.
const first = await run();
check(first.ok === true, `promotion failed: ${JSON.stringify(first)}`);
check(first.promoted === 2, `promoted ${first.promoted}, expected 2`);
check(formItems().length === 2, `${formItems().length} items on Events Form, expected 2`);
check(!formItems().some((i) => i.name === "פנייה חדשה"), "a New Lead was promoted");

const show = formItems().find((i) => i.cv.text_mm6ktd3a?.text === `${OPEN}:501`);
check(!!show, "the invited show did not reach Events Form");
if (show) {
  // 2. The marker, without which the mirror sync copies this straight back.
  check(show.cv.text_mm6ktd3a.text === `${OPEN}:501`, "Source Item marker missing");
  check(show.group.id === "group_mm18mks7", `landed in ${show.group.id}, expected Closed Deals`);
  check(show.cv.date5bab58wj?.date === "2026-12-04", "date not carried");
  check(show.cv.numeric_mm1qj01x?.text === "80", "guest count not carried");
  check(show.cv.phone0zyibnut?.text === "0501234567", "phone not carried");
  check(show.cv.single_select943s5p9?.text === "ערב", "time of event not carried");
  // 5. Events Form has no "הופעה" label, so it must be dropped rather than sent.
  check(!show.cv.single_selecta6erdt9, "an undefined label was sent and would have failed the create");
  // PROMOTE_SETS_STATUS is false while the five duplicate Events Form automations are still live.
  check(!show.cv.color_mm18ym70, "status was set while the duplicate automations are still active");
}
check(formItems().find((i) => i.cv.text_mm6ktd3a?.text === `${OPEN}:502`)?.group.id === "group_mm187fg9",
  "the Proposal Sent lead did not land in Proposal Sent");

// 3. Idempotent: the marker is read back from Events Form, so nothing is promoted twice.
const second = await run();
check(second.promoted === 0 && second.skipped === 2,
  `second run promoted ${second.promoted} / skipped ${second.skipped}, expected 0 / 2`);
check(formItems().length === 2, `Events Form grew to ${formItems().length} on a second run`);

// 4. A lead becoming committed later is picked up on the next pass.
DB[OPEN].items.push(openItem("504", "ערב ויניל", "Pre Payment"));
const third = await run();
check(third.promoted === 1, `promoted ${third.promoted} after a new commitment, expected 1`);
check(formItems().find((i) => i.cv.text_mm6ktd3a?.text === `${OPEN}:504`)?.group.id === "group_mm1fz3kg",
  "the Pre Payment lead did not land in Pre Payment");

if (fails.length) {
  console.error("FAIL:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log("PASS: committed leads promote once, carry the marker, and undefined labels are dropped.");
