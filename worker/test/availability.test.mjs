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
    items_page: { items: [{ id: "1", name: "אירוע", group: { id: "g1" }, column_values: [
      { id: "date5bab58wj", type: "date", text: "2026-09-14", date: "2026-09-14" },
      { id: "hour_a", type: "hour", text: "18:00" },
      { id: "hour_b", type: "hour", text: "02:00" },
    ]}] } }] } });
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
console.log("PASS: availability returns", body.booked.length, "booked date(s), build", body.build);
