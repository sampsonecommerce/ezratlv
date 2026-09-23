// זמינות תאריך on Open Events tells whoever works a lead whether its date and hours are already
// taken. The board's automations refuse to close a lead that is not פנוי, so this column is a lock:
// a wrong פנוי lets a double booking through, and a wrong תפוס blocks a real deal. This drives
// syncDateAvailability over a stateful mock of all three boards and asserts:
//
//   1. an overlap with a private booking reads תפוס - פרטי, including across midnight
//   2. an overlap with another committed open event reads תפוס - פתוח
//   3. a lead that overlaps nothing reads פנוי
//   4. a lead with no date reads לא נבדק; a past lead and a committed item are never written
//   5. running again writes nothing - the pass is idempotent
//   6. if any board cannot be read, every judged lead reads לא נבדק, never פנוי
//
//   node worker/test/date-availability.test.mjs
import worker from "../ezra-lead-worker.js";

const OPEN = "5102602771", FORM = "5092854682", COMPANY = "5099350637";
const AVAIL = "color_mm7frjv4";

const COLUMN_TYPE = new Map([
  ["date_mm6djw2v", "date"], ["hour_mm6j2kcg", "hour"], ["hour_mm6d1kst", "hour"], [AVAIL, "status"],
]);
const hourText = (hhmm) => {
  const [H, M] = hhmm.split(":").map(Number);
  const h = H % 12 === 0 ? 12 : H % 12;
  return `${String(h).padStart(2, "0")}:${String(M).padStart(2, "0")} ${H < 12 ? "AM" : "PM"}`;
};
const lead = (id, name, groupId, groupTitle, date, start, end) => ({
  id, name, group: { id: groupId, title: groupTitle },
  cv: {
    ...(date ? { date_mm6djw2v: { text: date, date } } : {}),
    ...(start ? { hour_mm6j2kcg: { text: hourText(start) } } : {}),
    ...(end ? { hour_mm6d1kst: { text: hourText(end) } } : {}),
  },
});
const booking = (id, name, groupId, groupTitle, date, start, end) => ({
  id, name, group: { id: groupId, title: groupTitle },
  cv: {
    date5bab58wj: { text: date, date },
    hour_mm1q610q: { text: hourText(start) },
    hour_mm1qa44s: { text: hourText(end) },
  },
});

const NEW = ["group_mm6djw93", "New Leads"];
const OE_CLOSED = ["group_mm6dvqnj", "Closed Deals"];
const DB = {
  [FORM]: {
    groups: [{ id: "group_mm18zcww", title: "New Leads" }, { id: "group_mm18mks7", title: "Closed Deals" }],
    items: [booking("111", "יום הולדת", "group_mm18mks7", "Closed Deals", "2030-11-20", "18:00", "02:00")],
  },
  [COMPANY]: { groups: [{ id: "group_mm18mks7", title: "Closed Deals" }], items: [] },
  [OPEN]: {
    groups: [
      { id: "group_mm6d3y71", title: "תאריכים תפוסים" }, { id: NEW[0], title: NEW[1] },
      { id: OE_CLOSED[0], title: OE_CLOSED[1] }, { id: "group_mm6drn0q", title: "Past Events" },
    ],
    items: [
      lead("A", "evening on a private evening", ...NEW, "2030-11-20", "20:00", "23:00"),
      lead("B", "lunch before a private evening", ...NEW, "2030-11-20", "12:00", "15:00"),
      lead("C", "after midnight into a private evening", ...NEW, "2030-11-21", "01:00", "03:00"),
      lead("D", "clashes with our own open event", ...NEW, "2030-11-22", "20:00", "23:00"),
      lead("E", "no date yet", ...NEW, null, null, null),
      lead("F", "long past", ...NEW, "2020-01-01", "20:00", "23:00"),
      lead("G", "committed open event", ...OE_CLOSED, "2030-11-22", "19:00", "23:00"),
      lead("H", "history", "group_mm6drn0q", "Past Events", "2030-11-20", "20:00", "23:00"),
    ],
  },
};

let failBoard = null;
const writes = [];
globalThis.fetch = async (_url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  const body = JSON.parse(opts.body);
  const q = body.query || "", v = body.variables || {};

  if (q.includes("change_multiple_column_values")) {
    const it = DB[String(v.board)].items.find((x) => x.id === String(v.item));
    for (const [id, val] of Object.entries(JSON.parse(v.cols || "{}"))) {
      if (COLUMN_TYPE.get(id) !== "status") return J({ errors: [{ message: `unexpected write to ${id}` }] });
      it.cv[id] = { text: val.label };
      writes.push({ item: it.id, col: id, label: val.label });
    }
    return J({ data: { change_multiple_column_values: { id: it.id } } });
  }
  if (/mutation/.test(q)) return J({ errors: [{ message: `unexpected mutation: ${q.slice(0, 80)}` }] });

  const boardId = (/boards\(ids: \[(\d+)\]\)/.exec(q) || [])[1];
  if (boardId && boardId === failBoard) return J({ errors: [{ message: "Complexity budget exhausted" }] });
  const b = DB[boardId];
  if (!b) return J({ data: { boards: [] } });
  if (q.includes("settings_str")) return J({ data: { boards: [{ columns: [], groups: b.groups }] } });

  const ids = (() => { const m = /column_values\(ids: (\[[^\]]*\])\)/.exec(q); return m ? JSON.parse(m[1]) : null; })();
  const items = b.items.map((it) => ({
    id: it.id, name: it.name, group: it.group,
    column_values: Object.entries(it.cv).filter(([id]) => !ids || ids.includes(id)).map(([id, val]) => ({ id, ...val })),
  }));
  return J({ data: { boards: [{ id: boardId, groups: b.groups, items_page: { cursor: null, items } }] } });
};

const env = { MONDAY_TOKEN: "test-token", CALC_SECRET: "test-secret" };
const run = async () => {
  const r = await worker.fetch(
    new Request("https://ezra-lead.test/?sync=1", { headers: { "x-ezra-calc-secret": "test-secret" } }),
    env,
  );
  return (await r.json()).dateAvailability;
};

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
const label = (id) => DB[OPEN].items.find((x) => x.id === id).cv[AVAIL]?.text;

// 1-4. First pass.
const first = await run();
check(first.complete === true, `first pass incomplete: ${JSON.stringify(first)}`);
check(label("A") === "תפוס - פרטי", `A (20:00-23:00 on a private 18:00-02:00) reads ${label("A")}`);
check(label("B") === "פנוי", `B (12:00-15:00 before a private 18:00) reads ${label("B")}`);
check(label("C") === "תפוס - פרטי", `C (01:00 the morning after a private evening that ends 02:00) reads ${label("C")}`);
check(label("D") === "תפוס - פתוח", `D (on our own committed open event) reads ${label("D")}`);
check(label("E") === "לא נבדק", `E (no date) reads ${label("E")}`);
check(label("F") === undefined, `F (past) was written: ${label("F")}`);
check(label("G") === undefined, `G (committed) was written: ${label("G")} - it would clash with itself`);
check(label("H") === undefined, `H (Past Events) was written: ${label("H")}`);
check(first.judged === 5 && first.written === 5, `first pass judged/wrote ${first.judged}/${first.written}, expected 5/5`);
check(writes.every((w) => w.col === AVAIL), "wrote a column other than זמינות תאריך");

// 5. Nothing changed, so nothing is written.
writes.length = 0;
const second = await run();
check(second.written === 0 && writes.length === 0, `second pass wrote ${writes.length}: ${JSON.stringify(writes)}`);

// 6. A board that cannot be read makes every judged lead לא נבדק - never a stale פנוי.
failBoard = FORM;
const third = await run();
check(third.complete === false, `a failed board read was reported complete: ${JSON.stringify(third)}`);
for (const id of ["A", "B", "C", "D", "E"]) {
  check(label(id) === "לא נבדק", `${id} reads ${label(id)} after a failed read, expected לא נבדק`);
}
failBoard = null;
await run();
check(label("B") === "פנוי" && label("A") === "תפוס - פרטי", "the next good pass did not restore the answers");

if (fails.length) {
  console.error("FAIL:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log("PASS: זמינות תאריך is right across midnight, private over open, idempotent, and never פנוי on a failed read.");
