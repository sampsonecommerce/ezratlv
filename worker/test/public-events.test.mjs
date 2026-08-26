import worker from "../ezra-lead-worker.js";

// The published half of the availability feed. Built from the Open Events board's real column ids
// and real value shapes, read off the live board on 2026-08-26 - a mock that answers any query
// proves nothing, which is the lesson the mirror test already paid for.
//
// The rule under test, above every other: a committed date publishes NOTHING unless somebody
// ticked "Publish to site". A private birthday and a public chef evening sit in the same group and
// are told apart by that checkbox alone.

const OPEN_EVENTS_BOARD = "5102602771";
const PUBLISH  = "boolean_mm6k8swg";
const TITLE    = "text_mm6kpbzk";
const SUBTITLE = "text_mm6k9g72";
const DESC     = "long_text_mm6kwzwk";
const IMAGES   = "text_mm6km603";
const LINK     = "link_mm6k9nqy";
const ENTRY    = "color_mm6kapv3";
const ROUNDS   = "text_mm6ktfbq";
const SLOT     = "text_mm6d8r2y";   // Start-End, e.g. "20:00-01:00"
const DATE     = "date_mm6djw2v";
const START    = "hour_mm6j2kcg";
const END      = "hour_mm6d1kst";

const cb = (checked) => ({ id: PUBLISH, text: checked ? "v" : "", value: JSON.stringify({ checked }) });
const t  = (id, text) => ({ id, text, value: JSON.stringify(text) });
const dt = (date) => ({ id: DATE, text: date, date, value: JSON.stringify({ date }) });
const ln = (url, text) => ({ id: LINK, text, value: JSON.stringify({ url, text }) });

// Every item below is committed (group "תאריכים תפוסים"), so each one holds its date whether or
// not it is published. Publishing changes the description, never the availability.
const ITEMS = [
  // Published, walk-in: no seating rounds, so doors come from the start hour.
  { id: "1", name: "הופעה מוס טאון", group: { id: "g1" }, column_values: [
    cb(true),
    t(TITLE, "מוס טאון · הופעת בכורה בתל אביב"),
    t(SUBTITLE, "Moss Town · פסיכדליה אינסטרומנטלית"),
    t(DESC, "עיירת הטחב שואבים השראה מהטבע."),
    t(IMAGES, "images/events/moss-town-poster.jpg, images/events/moss-town-band.jpg"),
    ln("https://www.instagram.com/mosstown_project/", "Moss Town באינסטגרם"),
    t(ENTRY, "פתוח לקהל"),
    t(ROUNDS, ""),
    dt("2026-08-30"), t(START, "08:00 PM"), t(END, "01:00 AM"), t(SLOT, "20:00-01:00"),
  ]},
  // Published, sit-down: doors are the first seating round (19:00), not the venue slot (20:00).
  { id: "2", name: "עידו וידר", group: { id: "g1" }, column_values: [
    cb(true),
    t(TITLE, "ערב שף בעזרא · עידו וידר"),
    t(SUBTITLE, "Puccia · תפריט טבעוני"),
    t(DESC, "מתחילים ב-19:00."),
    t(IMAGES, "images/events/ido-vider-poster.jpg"),
    ln("https://www.instagram.com/puccia_kitchen/", "Puccia באינסטגרם"),
    t(ENTRY, "בהזמנת מקום"),
    t(ROUNDS, "19:00,19:30,20:00,20:30"),
    dt("2026-09-01"), t(START, "08:00 PM"), t(END, "01:00 AM"), t(SLOT, "20:00-01:00"),
  ]},
  // NOT published, and it is a real customer with a real name. Nothing about it may reach the feed.
  { id: "3", name: "נועם ארבל", group: { id: "g1" }, column_values: [
    cb(false),
    t(TITLE, "יום הולדת של נועם"),
    t(DESC, "טקסט שאסור שיגיע לאתר"),
    dt("2026-08-29"), t(START, "08:00 PM"), t(END, "01:00 AM"), t(SLOT, "20:00-01:00"),
  ]},
  // Publish column absent entirely - an older item, or the column deleted. Absence is not consent.
  { id: "4", name: "מסיבת תקליטים", group: { id: "g1" }, column_values: [
    t(TITLE, "ערב ויניל"),
    dt("2026-08-31"), t(START, "08:00 PM"), t(END, "01:00 AM"), t(SLOT, "20:00-01:00"),
  ]},
  // Published but hostile content: a link and image paths that must not survive the worker.
  { id: "5", name: "בדיקה", group: { id: "g1" }, column_values: [
    cb(true),
    t(TITLE, "ערב בדיקה"),
    t(IMAGES, "https://evil.example/x.jpg, ../../etc/passwd, //evil.example/y.jpg, images/events/ok.jpg"),
    ln("javascript:alert(1)", "לחצו כאן"),
    t(ENTRY, "פתוח לקהל"),
    dt("2026-09-03"), t(START, "09:00 PM"), t(END, "02:00 AM"), t(SLOT, "21:00-02:00"),
  ]},
  // Published with no date. It has nowhere on a calendar to appear, so it is dropped.
  { id: "6", name: "ללא תאריך", group: { id: "g1" }, column_values: [
    cb(true), t(TITLE, "אירוע בלי תאריך"), t(ENTRY, "פתוח לקהל"),
  ]},
];

globalThis.fetch = async (_u, opts) => {
  const q = JSON.parse(opts.body).query || "";
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });

  // boardSchema, asked before every availability board read.
  if (q.includes("settings_str")) return J({ data: { boards: [{ columns: [
    { id: DATE,  title: "Requested event date", type: "date", settings_str: "{}" },
    { id: START, title: "Start Time", type: "hour", settings_str: "{}" },
    { id: END,   title: "End Time",   type: "hour", settings_str: "{}" },
  ], groups: [{ id: "g1" }] }] } });

  // The published-events read asks for the Publish column by id and never asks for groups.
  if (q.includes(PUBLISH)) {
    if (!q.includes(OPEN_EVENTS_BOARD)) throw new Error("published events must be read from the Open Events board only");
    return J({ data: { boards: [{ items_page: { cursor: null, items: ITEMS } }] } });
  }

  // Availability: every item above is in a committed group, so every dated one holds its date.
  return J({ data: { boards: [{ id: OPEN_EVENTS_BOARD,
    groups: [{ id: "g1", title: "תאריכים תפוסים" }],
    items_page: { cursor: null, items: ITEMS } }] } });
};

const res = await worker.fetch(new Request("https://x/", { method: "GET" }), { MONDAY_TOKEN: "t" }, { waitUntil(){} });
const body = JSON.parse(await res.text());

let failed = 0;
const check = (label, ok, detail) => {
  if (ok) { console.log(`  ok   ${label}`); return; }
  failed++;
  console.error(`  FAIL ${label}${detail ? " - " + detail : ""}`);
};

const pub = body.public || [];
const byDate = new Map(pub.map((e) => [e.date, e]));

console.log("published events:", JSON.stringify(pub, null, 2));

// --- the safety rule, first and loudest ---------------------------------------------------
check("an unticked item publishes nothing", !byDate.has("2026-08-29"));
check("a missing Publish column publishes nothing", !byDate.has("2026-08-31"));
const leaked = JSON.stringify(pub);
check("no unpublished customer name reaches the feed", !leaked.includes("נועם ארבל"));
check("no unpublished text reaches the feed", !leaked.includes("שאסור שיגיע לאתר"));

// --- publishing does not free the date ----------------------------------------------------
check("a published date is still booked", (body.booked || []).includes("2026-08-30"));
check("a published date still holds its evening slot",
  (body.busy || []).some((b) => b.date === "2026-08-30" && b.start === "20:00"));
check("an unpublished date is booked too", (body.booked || []).includes("2026-08-29"));

// --- content -------------------------------------------------------------------------------
const moss = byDate.get("2026-08-30");
check("published event is returned", !!moss);
check("title comes from the Public title column", moss?.title === "מוס טאון · הופעת בכורה בתל אביב");
check("subtitle is carried", moss?.subtitle === "Moss Town · פסיכדליה אינסטרומנטלית");
check("images split and trim", JSON.stringify(moss?.images) ===
  JSON.stringify(["images/events/moss-town-poster.jpg", "images/events/moss-town-band.jpg"]));
check("https link survives", moss?.link === "https://www.instagram.com/mosstown_project/");
check("link text survives", moss?.linkText === "Moss Town באינסטגרם");
check("walk-in doors come from the start hour", moss?.doors === "20:00", `got ${moss?.doors}`);
check("no seating rounds on a walk-in night", (moss?.rounds || []).length === 0);

const ido = byDate.get("2026-09-01");
check("seating rounds parse in order", JSON.stringify(ido?.rounds) ===
  JSON.stringify(["19:00", "19:30", "20:00", "20:30"]));
// The board's hours are the venue's slot; the first table is what the guest actually turns up for.
check("sit-down doors are the first round, not the slot start", ido?.doors === "19:00", `got ${ido?.doors}`);
check("entry drives the reservation form", ido?.entry === "בהזמנת מקום");

// --- a board column must not become an arbitrary href or <img src> -------------------------
const hostile = byDate.get("2026-09-03");
check("hostile item is still published", !!hostile);
check("javascript: link is dropped", hostile?.link === "", `got ${hostile?.link}`);
check("absolute, protocol-relative and traversal image paths are dropped",
  JSON.stringify(hostile?.images) === JSON.stringify(["images/events/ok.jpg"]),
  JSON.stringify(hostile?.images));

// --- shape ---------------------------------------------------------------------------------
check("a published event with no date is dropped", !pub.some((e) => e.title === "אירוע בלי תאריך"));
check("events are sorted by date", pub.map((e) => e.date).join() ===
  pub.map((e) => e.date).slice().sort().join());
check("the feed is not degraded", !body.degraded, body.reason);

if (failed) { console.error(`\n${failed} check(s) failed.`); process.exit(1); }
console.log("\npublic-events: all checks passed.");
