// Cloudflare Pages Function: GET /api/past-events
// Serves the past-events archive for events.html / english-events.html from the
// "Open Events Schedule + Archive" monday board (Marketing workspace). That board
// is the marketing side of the events pipeline: a Closed Deal on Open Events lands
// there for content, and when the event's date+time passes the item moves to the
// אירועי עבר group - which is what this endpoint serves. Responses are cached at
// the edge for CACHE_SECONDS, so a board edit is live within minutes.
//
// Contract with the board (column ids are stable; titles are display-only):
//   - only items in the אירועי עבר group (PAST_GROUP_ID) are considered
//   - of those, only items whose "פרסום לאתר" status is "פורסם באתר" are served
//   - an item with no image file is skipped (site rule: no photo/poster, no card)
//   - an item with no English title is skipped from the `en` list only
// Image URLs point at /api/event-image/<assetId> because monday asset URLs are
// private and signed; that function proxies them.

const BOARD_ID = "5103189386";
const PAST_GROUP_ID = "group_mm6qsdzy"; // אירועי עבר
const COL = {
  date: "date_mm6qf10d",         // תאריך האירוע
  startTime: "hour_mm6qkm9x",    // Start Time (mapped from Open Events)
  endTime: "hour_mm6q583v",      // End Time (mapped from Open Events)
  type: "color_mm6qqvht",        // סוג ערב: the 6 site format cards + אחר
  descHe: "long_text_mm6qtxhj",  // תיאור לאתר (עברית)
  titleEn: "text_mm6qpsjd",      // Title (EN)
  descEn: "long_text_mm6qkkby",  // Description (EN)
  instagram: "link_mm6qx5r9",    // פוסט אינסטגרם
  artistLink: "link_mm6q76f3",   // קישור אמן
  image: "file_mm6qygx2",        // תמונה / פוסטר (first file wins)
  publish: "color_mm6q8g2v",     // פרסום לאתר (gate)
};
const PUBLISHED_LABEL = "פורסם באתר";
// Badge class on the card, keyed by the "סוג ערב" label. Must match events.html CSS
// (only three sticker classes exist there today; other formats get no badge).
const TYPE_BADGE = {
  "השמעות אלבומים וסלון תקליטים": "sticker--vinyl",
  "מוזיקה חיה וסשנים אקוסטיים": "sticker--live",
  "פופ-אפ שפים וערבי טאבון": "sticker--food",
};
const CACHE_SECONDS = 300;

const QUERY = `query ($boardId: [ID!]) {
  boards(ids: $boardId) {
    items_page(limit: 100) {
      items {
        id
        name
        group { id }
        column_values(ids: ${JSON.stringify(Object.values(COL))}) {
          id
          text
          value
        }
        assets { id name file_extension }
      }
    }
  }
}`;

function colMap(item) {
  const m = {};
  for (const cv of item.column_values) m[cv.id] = cv;
  return m;
}

function linkUrl(cv) {
  if (!cv || !cv.value) return null;
  try { return JSON.parse(cv.value).url || null; } catch { return null; }
}

// monday date column text is "YYYY-MM-DD"; the cards show "DD.MM.YYYY".
function displayDate(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null;
}

export async function onRequestGet({ env, request }) {
  const TOKEN = env.MONDAY_TOKEN;
  if (!TOKEN) return json({ error: "not configured" }, 503);

  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/past-events", request.url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: TOKEN },
    body: JSON.stringify({ query: QUERY, variables: { boardId: [BOARD_ID] } }),
  });
  if (!r.ok) return json({ error: "upstream" }, 502);
  const data = await r.json();
  const items = data?.data?.boards?.[0]?.items_page?.items || [];

  const he = [];
  const en = [];
  for (const item of items) {
    if (item.group?.id !== PAST_GROUP_ID) continue;
    const c = colMap(item);
    if (c[COL.publish]?.text !== PUBLISHED_LABEL) continue;
    const asset = item.assets?.[0];
    if (!asset) continue; // no image, no card
    const date = c[COL.date]?.text || null;
    const base = {
      id: item.id,
      date,
      dateDisplay: displayDate(date),
      startTime: c[COL.startTime]?.text || null,
      endTime: c[COL.endTime]?.text || null,
      type: c[COL.type]?.text || null,
      badgeClass: TYPE_BADGE[c[COL.type]?.text] || null,
      image: `/api/event-image/${asset.id}`,
      instagram: linkUrl(c[COL.instagram]),
      artistLink: linkUrl(c[COL.artistLink]),
    };
    he.push({ ...base, title: item.name, description: c[COL.descHe]?.text || "" });
    const titleEn = c[COL.titleEn]?.text;
    if (titleEn) en.push({ ...base, title: titleEn, description: c[COL.descEn]?.text || "" });
  }
  // newest first, like the hardcoded slider
  const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "");
  he.sort(byDateDesc);
  en.sort(byDateDesc);

  const res = json({ he, en }, 200, {
    "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, max-age=60`,
  });
  await cache.put(cacheKey, res.clone());
  return res;
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}
