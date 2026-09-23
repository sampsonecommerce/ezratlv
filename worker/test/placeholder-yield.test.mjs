// Tuesday and Wednesday are shown as open nights before anything is booked for them: placeholders
// on the schedule board. They never block a date, and when anything committed lands on their
// evening they give way. This drives yieldPlaceholders over a stateful mock and asserts:
//
//   1. a private booking on a placeholder's evening cancels it: אישור תוכן בוטל, אתר לא לפרסם
//   2. a confirmed open event on the same evening cancels it too
//   3. a lunch booking on a placeholder evening does not
//   4. confirmed events, already-cancelled placeholders and past placeholders are never touched
//   5. the update names the kind of booking, never the customer; a second run changes nothing
//   6. placeholders do not book dates on the public calendar
//
//   node worker/test/placeholder-yield.test.mjs
import worker from "../ezra-lead-worker.js";

const OPEN = "5102602771", FORM = "5092854682", COMPANY = "5099350637", SCHED = "5103189386";
const KIND = "color_mm7fd9hh", APPROVAL = "color_mm7fr9sh", WEBSITE = "color_mm6q8g2v";

const hourText = (hhmm) => {
  const [H, M] = hhmm.split(":").map(Number);
  const h = H % 12 === 0 ? 12 : H % 12;
  return `${String(h).padStart(2, "0")}:${String(M).padStart(2, "0")} ${H < 12 ? "AM" : "PM"}`;
};
const booking = (id, name, date, start, end) => ({
  id, name, group: { id: "group_mm18mks7", title: "Closed Deals" },
  cv: { date5bab58wj: { text: date, date }, hour_mm1q610q: { text: hourText(start) }, hour_mm1qa44s: { text: hourText(end) } },
});
const sched = (id, name, kind, approval, date) => ({
  id, name, group: { id: "topics", title: "עסקה נסגרה - ממתין לתוכן" },
  cv: { [KIND]: { text: kind }, [APPROVAL]: { text: approval }, [WEBSITE]: { text: "ממתין" }, date_mm6qf10d: { text: date, date } },
});

const DB = {
  [FORM]: {
    groups: [{ id: "group_mm18mks7", title: "Closed Deals" }],
    items: [
      booking("111", "משפחת כהן", "2030-10-01", "20:00", "01:00"),   // private evening on a placeholder Tuesday
      booking("112", "צהריים", "2030-10-08", "12:00", "16:00"),        // lunch on a placeholder Tuesday
    ],
  },
  [COMPANY]: { groups: [], items: [] },
  [OPEN]: {
    groups: [{ id: "group_mm6dvqnj", title: "Closed Deals" }],
    items: [{ id: "300", name: "DJ night", group: { id: "group_mm6dvqnj", title: "Closed Deals" },
      cv: { date_mm6djw2v: { text: "2030-10-02", date: "2030-10-02" }, hour_mm6j2kcg: { text: hourText("19:00") }, color_mm6dh5pe: { text: "ערב" } } }],
  },
  [SCHED]: {
    groups: [{ id: "topics", title: "עסקה נסגרה - ממתין לתוכן" }],
    items: [
      sched("P1", "ערב פתוח – 01.10", "שומר מקום", "טיוטה", "2030-10-01"),
      sched("P2", "ערב פתוח – 02.10", "שומר מקום", "מאושר", "2030-10-02"),
      sched("P3", "ערב פתוח – 08.10", "שומר מקום", "טיוטה", "2030-10-08"),
      sched("P4", "ערב פתוח – 15.10", "שומר מקום", "טיוטה", "2030-10-15"),
      sched("E1", "DJ night", "אירוע", "מאושר", "2030-10-02"),
      sched("C1", "תפוס לאירוע פרטי", "שומר מקום", "בוטל", "2030-10-01"),
      sched("O1", "ערב פתוח – ישן", "שומר מקום", "טיוטה", "2020-01-07"),
    ],
  },
};

const writes = [], notes = [];
globalThis.fetch = async (_url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  const body = JSON.parse(opts.body);
  const q = body.query || "", v = body.variables || {};
  if (q.includes("change_multiple_column_values")) {
    const it = DB[String(v.board)].items.find((x) => x.id === String(v.item));
    for (const [id, val] of Object.entries(JSON.parse(v.cols))) { it.cv[id] = { text: val.label }; writes.push([it.id, id, val.label]); }
    return J({ data: { change_multiple_column_values: { id: it.id } } });
  }
  if (q.includes("create_update")) { notes.push([String(v.item), v.body]); return J({ data: { create_update: { id: "u" } } }); }
  if (/mutation/.test(q)) return J({ errors: [{ message: `unexpected mutation: ${q.slice(0, 80)}` }] });
  const boardId = (/boards\(ids: \[(\d+)\]\)/.exec(q) || [])[1];
  const b = DB[boardId];
  if (!b) return J({ data: { boards: [] } });
  if (q.includes("settings_str")) return J({ data: { boards: [{ columns: [], groups: b.groups }] } });
  const ids = (() => { const m = /column_values\(ids: (\[[^\]]*\])\)/.exec(q); return m ? JSON.parse(m[1]) : null; })();
  const items = b.items.map((it) => ({ id: it.id, name: it.name, group: it.group,
    column_values: Object.entries(it.cv).filter(([id]) => !ids || ids.includes(id)).map(([id, val]) => ({ id, ...val })) }));
  return J({ data: { boards: [{ id: boardId, groups: b.groups, items_page: { cursor: null, items } }] } });
};

const env = { MONDAY_TOKEN: "t", CALC_SECRET: "s" };
const run = async () => (await (await worker.fetch(
  new Request("https://ezra-lead.test/?sync=1", { headers: { "x-ezra-calc-secret": "s" } }), env)).json()).placeholders;

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
const cv = (id, col) => DB[SCHED].items.find((x) => x.id === id).cv[col]?.text;

const first = await run();
check(cv("P1", APPROVAL) === "בוטל" && cv("P1", WEBSITE) === "לא לפרסם", `P1 (private evening) not cancelled: ${cv("P1", APPROVAL)}/${cv("P1", WEBSITE)}`);
check(cv("P2", APPROVAL) === "בוטל", `P2 (confirmed open event the same evening) not cancelled: ${cv("P2", APPROVAL)}`);
check(cv("P3", APPROVAL) === "טיוטה", `P3 (only a lunch that day) was cancelled`);
check(cv("P4", APPROVAL) === "טיוטה", `P4 (nothing booked) was cancelled`);
check(cv("E1", APPROVAL) === "מאושר", "a confirmed event was touched");
check(!writes.some(([id]) => ["E1", "C1", "O1", "P3", "P4"].includes(id)), `wrote to an item it should not: ${JSON.stringify(writes)}`);
check(first.cancelled === 2, `cancelled ${first.cancelled}, expected 2`);
const p1note = notes.find(([id]) => id === "P1")?.[1] || "";
check(p1note.includes("אירוע פרטי"), `P1's update does not say a private event took the night: ${p1note}`);
check(!notes.some(([, b]) => b.includes("כהן")), "an update names the customer - the schedule board is shared with a guest");
check((notes.find(([id]) => id === "P2")?.[1] || "").includes("אירוע פתוח"), "P2's update does not say an open event took the night");

writes.length = 0; notes.length = 0;
const second = await run();
check(second.cancelled === 0 && writes.length === 0 && notes.length === 0, `second run was not idempotent: ${JSON.stringify(second)}`);

const feed = await (await worker.fetch(new Request("https://ezra-lead.test/"), env)).json();
check(!feed.booked.includes("2030-10-15"), "a placeholder booked its date on the public calendar");

if (fails.length) { console.error("FAIL:\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS: placeholders give way to any booking on their evening, quietly and once, and never block a date.");
