// A closed open event is booked exactly like a private one, so until its content is published the
// page could only render its evening as "closed for a private event". The feed's `openEvenings`
// says which taken evenings are open to the public. This asserts, against the schedule board's
// real column ids:
//
//   1. a confirmed event (סוג פריט אירוע) that is not cancelled is listed, published or not
//   2. placeholders, cancelled events and past events are not
//   3. only date, type and hours leave the board - never an item name
//   4. listing an evening never frees its date: `booked` still carries it
//
//   node worker/test/open-evenings.test.mjs
import worker from "../ezra-lead-worker.js";

const FORM = "5092854682", COMPANY = "5099350637", OPEN = "5102602771", SCHED = "5103189386";
const KIND = "color_mm7fd9hh", APPROVAL = "color_mm7fr9sh", TYPE = "color_mm6qqvht";
const DATE = "date_mm6qf10d", START = "hour_mm6qkm9x", END = "hour_mm6q583v";

const hourText = (hhmm) => {
  const [H, M] = hhmm.split(":").map(Number);
  const h = H % 12 === 0 ? 12 : H % 12;
  return `${String(h).padStart(2, "0")}:${String(M).padStart(2, "0")} ${H < 12 ? "AM" : "PM"}`;
};
const sched = (id, name, kind, approval, date, type, group = { id: "topics", title: "עסקה נסגרה - ממתין לתוכן" }) => ({
  id, name, group,
  cv: { [KIND]: { text: kind }, [APPROVAL]: { text: approval }, [TYPE]: { text: type },
        [DATE]: { text: date, date }, [START]: { text: hourText("19:00") }, [END]: { text: hourText("23:30") } },
});

const DB = {
  // The promotion's copy of the reggae night: a committed booking on the sales board.
  [FORM]: { groups: [{ id: "group_mm18mks7", title: "Closed Deals" }], items: [
    { id: "900", name: "ערב תקליטים רגאיי", group: { id: "group_mm18mks7", title: "Closed Deals" },
      cv: { date5bab58wj: { text: "2030-09-29", date: "2030-09-29" }, hour_mm1q610q: { text: hourText("19:00") }, hour_mm1qa44s: { text: hourText("23:30") } } },
  ] },
  [COMPANY]: { groups: [], items: [] },
  [OPEN]: { groups: [], items: [] },
  [SCHED]: { groups: [{ id: "topics", title: "עסקה נסגרה - ממתין לתוכן" }], items: [
    sched("E1", "ערב תקליטים רגאיי", "אירוע", "טיוטה", "2030-09-29", "השמעות אלבומים וסלון תקליטים"),
    sched("E2", "משפחת כהן - ערב קוקטיילים", "אירוע", "מוכן לבדיקה", "2030-09-30", "ערבי יין ומיקסולוגיה"),
    sched("P1", "ערב פתוח – 06.10", "שומר מקום", "טיוטה", "2030-10-06", ""),
    sched("C1", "ערב שבוטל", "אירוע", "בוטל", "2030-10-07", "אחר"),
    sched("O1", "ערב שעבר", "אירוע", "מאושר", "2020-01-07", "אחר"),
    sched("A1", "ערב שכבר עבר קבוצה", "אירוע", "מאושר", "2030-10-08", "אחר", { id: "group_mm6qsdzy", title: "אירועי עבר" }),
  ] },
};

globalThis.fetch = async (_url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  const body = JSON.parse(opts.body);
  const q = body.query || "", v = body.variables || {};
  if (/mutation/.test(q)) return J({ errors: [{ message: "the feed must not write" }] });
  const boardId = (/boards\(ids: \[(\d+)\]\)/.exec(q) || [])[1] || String((v.boardId || [])[0] || "");
  const b = DB[boardId];
  if (!b) return J({ data: { boards: [] } });
  if (q.includes("settings_str")) return J({ data: { boards: [{ columns: [], groups: b.groups }] } });
  const ids = (() => { const m = /column_values\(ids: (\[[^\]]*\])\)/.exec(q); return m ? JSON.parse(m[1]) : null; })();
  const items = b.items.map((it) => ({ id: it.id, name: it.name, group: it.group, assets: [],
    column_values: Object.entries(it.cv).filter(([id]) => !ids || ids.includes(id)).map(([id, val]) => ({ id, value: null, ...val })) }));
  return J({ data: { boards: [{ id: boardId, groups: b.groups, items_page: { cursor: null, items } }] } });
};

const env = { MONDAY_TOKEN: "t" };
const feed = await (await worker.fetch(new Request("https://ezra-lead.test/"), env)).json();

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };
const open = feed.openEvenings || [];
const dates = open.map((e) => e.date);

check(Array.isArray(feed.openEvenings), `feed has no openEvenings list: ${JSON.stringify(feed).slice(0, 200)}`);
check(dates.includes("2030-09-29"), "a confirmed open event in draft is missing");
check(dates.includes("2030-09-30"), "a confirmed open event awaiting review is missing");
check(!dates.includes("2030-10-06"), "a placeholder was listed as a confirmed open evening");
check(!dates.includes("2030-10-07"), "a cancelled event was listed");
check(!dates.includes("2020-01-07") && !dates.includes("2030-10-08"), "a past event was listed");
const reggae = open.find((e) => e.date === "2030-09-29") || {};
check(reggae.type === "השמעות אלבומים וסלון תקליטים", `type not carried: ${JSON.stringify(reggae)}`);
check(reggae.start === "19:00" && reggae.end === "23:30", `hours not carried: ${JSON.stringify(reggae)}`);
const leaked = JSON.stringify(open);
check(!/כהן|רגאיי|name/.test(leaked), `an item name reached the public feed: ${leaked}`);
check((feed.booked || []).includes("2030-09-29"), "listing an open evening freed its date");

if (fails.length) { console.error("FAIL:\n  " + fails.join("\n  ")); process.exit(1); }
console.log("PASS: confirmed open evenings are listed by date, type and hours only, and stay booked.");
