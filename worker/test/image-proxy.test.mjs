// ?eventImage=<assetId> turns a monday file into a public URL. The token behind it reads every
// board, including signed proposals and prepayment confirmations, and asset ids are plain numbers,
// so the proxy must serve only files something public uses. This asserts that:
//
//   1. a file on a schedule item marked פורסם באתר is served (the site's cards)
//   2. a file on a post subitem of an item whose אישור תוכן is מאושר is served (Buffer's media)
//   3. a file on a draft item, a subitem of an unapproved item, or any other board is refused -
//      and refused before the worker ever asks monday for its download URL
//
//   node worker/test/image-proxy.test.mjs
import worker from "../ezra-lead-worker.js";

globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };

const WEBSITE = "color_mm6q8g2v", APPROVAL = "color_mm7fr9sh";
const item = (website, approval, assets, subAssets = []) => ({
  column_values: [{ id: WEBSITE, text: website }, { id: APPROVAL, text: approval }],
  assets: assets.map((id) => ({ id })),
  subitems: subAssets.length ? [{ assets: subAssets.map((id) => ({ id })) }] : [],
});
const SCHEDULE_ITEMS = [
  item("פורסם באתר", "מאושר", ["11"]),             // live card
  item("ממתין", "טיוטה", ["12"], ["15"]),         // draft: neither card nor posts
  item("ממתין", "מאושר", [], ["13"]),              // approved, website not selected: post media only
  item("לא לפרסם", "מוכן לבדיקה", ["16"], ["14"]), // handed in, not approved
];

const urlLookups = [];
globalThis.fetch = async (url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  if (String(url).startsWith("https://files.test/")) {
    return new Response("bytes", { headers: { "content-type": "image/jpeg" } });
  }
  const q = JSON.parse(opts.body).query || "";
  if (q.includes("assets(ids:")) {
    const id = JSON.parse(opts.body).variables.ids[0];
    urlLookups.push(id);
    return J({ data: { assets: [{ public_url: `https://files.test/${id}` }] } });
  }
  if (q.includes("boards(ids: [5103189386])")) {
    return J({ data: { boards: [{ items_page: { cursor: null, items: SCHEDULE_ITEMS } }] } });
  }
  return J({ errors: [{ message: `unexpected query: ${q.slice(0, 80)}` }] });
};

const env = { MONDAY_TOKEN: "test-token" };
const get = async (id) => (await worker.fetch(new Request(`https://ezra-lead.test/?eventImage=${id}`), env)).status;

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

check(await get("11") === 200, "a published card image was refused");
check(await get("13") === 200, "an approved post's media was refused");
for (const [id, what] of [["12", "a draft item's file"], ["15", "a draft item's post media"],
                          ["14", "an unapproved item's post media"], ["16", "a file on an item marked לא לפרסם"],
                          ["999", "a file from another board (a signed proposal)"]]) {
  check(await get(id) === 404, `${what} (${id}) was served`);
}
check(urlLookups.every((id) => id === "11" || id === "13"),
  `the worker asked monday for the download URL of a refused file: ${JSON.stringify(urlLookups)}`);
check(await get("abc") === 400, "a non-numeric id was not rejected");

if (fails.length) {
  console.error("FAIL:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log("PASS: the image proxy serves published cards and approved post media, and nothing else.");
