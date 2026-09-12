// Every phone field on the site refuses a number that is not Israeli (il-phone.js). This is the
// worker's half of that rule: whatever shape arrives - an old cached page, a direct POST, a
// number with +972 or spaces or the leading 0 dropped - one shape reaches Monday, so the phone
// column is dialable and the CAPI hash is stable. And the worker never refuses a lead over its
// phone: a number it cannot read is stored as typed.
//
//   node worker/test/phone-normalize.test.mjs
import worker from "../ezra-lead-worker.js";

const GROUPS = [{ id: "group_mm18zcww", title: "New Leads" }];
const COLUMNS = [
  { id: "name", title: "Name", type: "name", settings_str: "{}" },
  { id: "color_mm18ym70", title: "Status", type: "status", settings_str: JSON.stringify({ labels: { 4: "New Lead" } }) },
  { id: "phone0zyibnut", title: "Phone number", type: "phone", settings_str: "{}" },
  { id: "emailj9eufer1", title: "Email address", type: "email", settings_str: "{}" },
  { id: "short_textgjnrhjdi", title: "Traffic Source", type: "text", settings_str: "{}" },
];

let created = null;
globalThis.fetch = async (url, opts) => {
  const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  if (!String(url).includes("api.monday.com")) return J({});
  const body = JSON.parse(opts.body);
  if ((body.query || "").includes("create_item")) {
    const v = body.variables || {};
    created = { cols: JSON.parse(v.cols || "{}") };
    return J({ data: { create_item: { id: "1" } } });
  }
  return J({ data: { boards: [{ columns: COLUMNS, groups: GROUPS }] } });
};

const env = { MONDAY_TOKEN: "test-token" };
const post = (phone) => worker.fetch(
  new Request("https://ezra-lead.test/", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://ezratlv.com" },
    body: JSON.stringify({ leadType: "private", name: "בדיקה", phone, eventType: "יום הולדת", guests: 20 }),
  }),
  env,
);

const cases = [
  ["+972 52-123 4567", "052-1234567"],   // international prefix, spaces, dashes
  ["972521234567",     "052-1234567"],   // prefix without +
  ["00972521234567",   "052-1234567"],   // dial-out prefix
  ["+972 052 1234567", "052-1234567"],   // +972 and the 0 both typed
  ["521234567",        "052-1234567"],   // leading 0 dropped
  ["(052) 1234567",    "052-1234567"],
  ["03-6123456",       "03-6123456"],    // landline
  ["36123456",         "03-6123456"],    // landline, 0 dropped
  ["0731234567",       "073-1234567"],   // VoIP
  ["+44 20 7946 0958", "+442079460958"], // foreign, kept
  ["12345",            "12345"],         // unreadable: stored as typed, lead not refused
];

let failed = 0;
for (const [input, want] of cases) {
  created = null;
  const res = await post(input);
  const body = await res.json();
  const got = created?.cols?.phone0zyibnut?.phone;
  const ok = res.status === 200 && body.ok === true && got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${JSON.stringify(input)} -> ${JSON.stringify(got)} (want ${JSON.stringify(want)})`);
  if (!ok) failed++;
}
if (failed) { console.error(`${failed} case(s) failed`); process.exit(1); }
console.log("phone normalisation: all cases pass");
