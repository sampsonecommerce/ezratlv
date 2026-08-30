// Cloudflare Pages Function: GET /api/event-image/<assetId>
// Proxies a monday asset (the "תמונה / פוסטר" file on the Ezra Events - Site Archive
// board) so the site gets a stable public image URL. monday's own asset URLs are
// signed and expire, so /api/past-events hands out this route instead; here we
// resolve a fresh signed URL per fill and cache the bytes at the edge for a day.

const CACHE_SECONDS = 86400;

export async function onRequestGet({ env, params, request }) {
  const TOKEN = env.MONDAY_TOKEN;
  const assetId = String(params.assetId || "");
  if (!TOKEN) return new Response("not configured", { status: 503 });
  if (!/^\d+$/.test(assetId)) return new Response("bad id", { status: 400 });

  const cache = caches.default;
  const cacheKey = new Request(new URL(`/api/event-image/${assetId}`, request.url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: TOKEN },
    body: JSON.stringify({
      query: "query ($ids: [ID!]!) { assets(ids: $ids) { public_url } }",
      variables: { ids: [assetId] },
    }),
  });
  if (!r.ok) return new Response("upstream", { status: 502 });
  const data = await r.json();
  const url = data?.data?.assets?.[0]?.public_url;
  if (!url) return new Response("not found", { status: 404 });

  const img = await fetch(url);
  if (!img.ok) return new Response("not found", { status: 404 });

  const res = new Response(img.body, {
    status: 200,
    headers: {
      "Content-Type": img.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, max-age=3600`,
    },
  });
  await cache.put(cacheKey, res.clone());
  return res;
}
