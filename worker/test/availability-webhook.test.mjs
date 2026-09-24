// monday webhooks re-run the availability passes the moment a lead, booking or schedule item
// changes, instead of at the next quarter hour. The endpoint writes to boards, so it asserts:
//
//   1. no key configured: 503; a wrong or missing key: 401, and nothing is read or written
//   2. monday's verification challenge is echoed back, but only with the right key
//   3. an event runs the availability passes (זמינות תאריך is written) and nothing else - no
//      promotion, which creates items and must not race itself
//
//   node worker/test/availability-webhook.test.mjs
import worker from "../ezra-lead-worker.js";

const OPEN = "5102602771";
const AVAIL = "color_mm7frjv4";
const lead = { id: "L1", name: "lead", group: { id: "group_mm6djw93", title: "New Leads" },
  cv: { date_mm6djw2v: { text: "2030-11-10", date: "2030-11-10" }, hour_mm6j2kcg: { text: "06:00 PM" } } };

const calls = [];
globalThis.fetch = async (_url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  const body = JSON.parse(opts.body);
  const q = body.query || "", v = body.variables || {};
  calls.push(q.slice(0, 60));
  if (q.includes("change_multiple_column_values")) {
    for (const [id, val] of Object.entries(JSON.parse(v.cols || "{}"))) lead.cv[id] = { text: val.label };
    return J({ data: { change_multiple_column_values: { id: v.item } } });
  }
  if (/mutation/.test(q)) return J({ errors: [{ message: `unexpected mutation: ${q.slice(0, 80)}` }] });
  const boardId = (/boards\(ids: \[(\d+)\]\)/.exec(q) || [])[1];
  const groups = boardId === OPEN ? [{ id: "group_mm6djw93", title: "New Leads" }] : [];
  if (q.includes("settings_str")) return J({ data: { boards: [{ columns: [], groups }] } });
  const items = boardId === OPEN ? [{ id: lead.id, name: lead.name, group: lead.group,
    column_values: Object.entries(lead.cv).map(([id, val]) => ({ id, ...val })) }] : [];
  return J({ data: { boards: [{ id: boardId, groups, items_page: { cursor: null, items } }] } });
};

const hook = (key, payload, env) => worker.fetch(new Request(`https://ezra-lead.test/?hook=monday${key ? `&key=${key}` : ""}`,
  { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }), env);
const env = { MONDAY_TOKEN: "t", MONDAY_WEBHOOK_KEY: "k3y" };

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

check((await hook("k3y", { challenge: "c" }, { MONDAY_TOKEN: "t" })).status === 503, "no key configured must refuse");
check((await hook("nope", { challenge: "c" }, env)).status === 401, "a wrong key must be refused");
check((await hook("", { event: { type: "update_column_value" } }, env)).status === 401, "a missing key must be refused");
check(calls.length === 0, `a refused call reached monday: ${calls.join(" | ")}`);

const ch = await hook("k3y", { challenge: "abc123" }, env);
check(ch.status === 200 && (await ch.json()).challenge === "abc123", "the challenge was not echoed");
check(calls.length === 0, "the challenge must not run the passes");

const ev = await (await hook("k3y", { event: { type: "update_column_value", boardId: 5102602771, pulseId: 1 } }, env)).json();
check(ev.ok === true && ev.dateAvailability, `the event did not run the availability passes: ${JSON.stringify(ev).slice(0, 200)}`);
check(lead.cv[AVAIL]?.text === "פנוי", `the lead was not judged: ${lead.cv[AVAIL]?.text}`);
check(!("promotion" in ev), "the webhook ran the promotion");
check(!calls.some((c) => /create_item/.test(c)), "the webhook created an item");

if (fails.length) { console.error("FAIL:\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS: the webhook is key-gated, answers monday's challenge, and runs only the availability passes.");
