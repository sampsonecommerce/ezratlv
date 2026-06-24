// Netlify Function: submit-lead
// Receives the booking-flow data (package, menu, add-ons, details) from the
// website and, once Monday is connected, creates an item on the Monday board.
// Monday's own automation then generates the GetSign contract and emails it.
//
// SECURITY: the Monday API token is read from an environment variable set in the
// Netlify dashboard (Site settings -> Environment variables -> MONDAY_TOKEN).
// It must NEVER be committed to the repo. The browser only calls /api/submit-lead;
// it never sees the token.
//
// STATUS: Monday is not connected yet, so this is a stub. When MONDAY_TOKEN is
// absent it just echoes the payload back so the front-end flow can be tested.

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "invalid JSON body" }, 400);
  }

  const MONDAY_TOKEN = process.env.MONDAY_TOKEN;

  // --- Stub mode: Monday not wired up yet ---
  if (!MONDAY_TOKEN) {
    console.log("submit-lead (stub) received:", JSON.stringify(payload));
    return json({ ok: true, stub: true, received: payload }, 200);
  }

  // --- Real mode (to implement once Monday is connected) ---
  // 1. Map `payload` -> Monday column_values (match the existing board columns).
  // 2. POST a create_item mutation to https://api.monday.com/v2 with header
  //    Authorization: MONDAY_TOKEN.
  // 3. Monday's automation fires the GetSign contract on item creation.
  return json({ ok: false, error: "Monday integration not implemented yet" }, 501);
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
