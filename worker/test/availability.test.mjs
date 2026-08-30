import worker from "../ezra-lead-worker.js";

// Monday's real field sets. The previous mock answered any query, which is why it
// missed Board.title being invalid - the exact bug that broke the feed.
const BOARD_FIELDS  = new Set(["id","name","state","board_kind","description","columns","groups","items_page","items_count","permissions","owners","workspace"]);
const GROUP_FIELDS  = new Set(["id","title","color","position","items_page"]);
const COLUMN_FIELDS = new Set(["id","title","type","settings_str","description","archived"]);

function checkBlock(q, header, allowed, typeName) {
  const i = q.indexOf(header);
  if (i === -1) return null;
  let d = 0, j = q.indexOf("{", i), body = "";
  for (let k = j; k < q.length; k++) {
    if (q[k] === "{") d++;
    else if (q[k] === "}") { d--; if (!d) { body = q.slice(j + 1, k); break; } }
  }
  // top-level identifiers only: strip nested blocks
  let depth = 0, top = "";
  for (const ch of body) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (!depth) top += ch;
  }
  for (const tok of top.split(/[\s,()]+/).filter(Boolean)) {
    if (/^[a-z_][a-z0-9_]*$/i.test(tok) && !allowed.has(tok)) {
      return `Cannot query field "${tok}" on type "${typeName}".`;
    }
  }
  return null;
}

globalThis.fetch = async (_u, opts) => {
  const q = JSON.parse(opts.body).query || "";
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  for (const [hdr, set, name] of [["boards(", BOARD_FIELDS, "Board"], ["groups {", GROUP_FIELDS, "Group"], ["columns {", COLUMN_FIELDS, "Column"]]) {
    const err = checkBlock(q, hdr, set, name);
    if (err) return J({ errors: [{ message: err }] });
  }
  if (q.includes("settings_str")) return J({ data: { boards: [{ columns: [
    { id: "date5bab58wj", title: "תאריך", type: "date", settings_str: "{}" },
    { id: "hour_a", title: "שעת התחלה", type: "hour", settings_str: "{}" },
    { id: "hour_b", title: "שעת סיום", type: "hour", settings_str: "{}" },
  ], groups: [{ id: "g1" }] }] } });
  return J({ data: { boards: [{ id: "5092854682",
    groups: [{ id: "g1", title: "תפוס" }],
    items_page: { items: [
      { id: "1", name: "אירוע", group: { id: "g1" }, column_values: [
        { id: "date5bab58wj", type: "date", text: "2026-09-14", date: "2026-09-14" },
        { id: "hour_a", type: "hour", text: "18:00" },
        { id: "hour_b", type: "hour", text: "02:00" },
      ]},
      // Evening by the dedicated Time-of-event column; the free-text column mentions both slots
      // and must not drag the date into the full-day guess.
      { id: "2", name: "אירוע ערב", group: { id: "g1" }, column_values: [
        { id: "date5bab58wj", type: "date", text: "2026-09-17", date: "2026-09-17" },
        { id: "single_select943s5p9", type: "status", text: "ערב" },
        { id: "long_textlwbyhlq0", type: "long_text", text: "מתלבטים בין צהריים לערב, נעדכן" },
      ]},
      // Hours under the Open Events board's own column ids (a mirror item).
      { id: "3", name: "מראה", group: { id: "g1" }, column_values: [
        { id: "date5bab58wj", type: "date", text: "2026-09-18", date: "2026-09-18" },
        { id: "hour_mm6j2kcg", type: "hour", text: "20:00" },
        { id: "hour_mm6d1kst", type: "hour", text: "01:00" },
      ]},
      // Homepage noon lead: slot only as text, in the Events-Form Start-End column.
      { id: "4", name: "ליד צהריים", group: { id: "g1" }, column_values: [
        { id: "date5bab58wj", type: "date", text: "2026-09-19", date: "2026-09-19" },
        { id: "text_mm2km76j", type: "text", text: "צהריים (12:00 - 17:00)" },
      ]},
    ] } }] } });
};

const res = await worker.fetch(new Request("https://x/", { method: "GET" }), { MONDAY_TOKEN: "t" }, { waitUntil(){} });
console.log(await res.text());

// Assertions, so this fails loudly rather than printing something that looks fine.
const body = JSON.parse(await (await worker.fetch(
  new Request("https://x/", { method: "GET" }), { MONDAY_TOKEN: "t" }, { waitUntil(){} })).text());
if (body.degraded) {
  console.error("FAIL: availability degraded -", body.reason);
  process.exit(1);
}
if (!Array.isArray(body.booked) || !body.booked.length) {
  console.error("FAIL: no booked dates returned");
  process.exit(1);
}
// Slot parsing: each item must produce exactly the slot its dedicated columns describe.
const slotsOf = (date) => body.busy.filter((b) => b.date === date).map((b) => `${b.start}-${b.end}`).sort();
const expect = {
  "2026-09-17": ["18:00-02:00"],          // timeOf "ערב"; free text mentioning צהריים must not widen it
  "2026-09-18": ["20:00-01:00"],          // Open Events hour column ids
  "2026-09-19": ["12:00-17:00"],          // Start-End text on the Events Form column
};
for (const [date, want] of Object.entries(expect)) {
  const got = slotsOf(date);
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    console.error(`FAIL: ${date} busy slots ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    process.exit(1);
  }
}
console.log("PASS: availability returns", body.booked.length, "booked date(s), build", body.build);
