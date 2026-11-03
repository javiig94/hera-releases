// Meta Conversions API — envía eventos servidor → Meta, deduplicados con el píxel por event_id
const crypto = require("crypto");
const PIXEL = process.env.META_PIXEL_ID, TOKEN = process.env.META_CAPI_TOKEN, TEST = process.env.META_TEST_EVENT_CODE;
const sha = v => v ? crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex") : undefined;

function userData(req, email) {
  const cookies = Object.fromEntries((req.headers.cookie || "").split(";").map(c => c.trim().split("=")).filter(p => p[0]));
  return {
    em: email ? [sha(email)] : undefined,
    client_ip_address: req.ip, client_user_agent: req.headers["user-agent"],
    fbp: cookies._fbp, fbc: cookies._fbc,
  };
}

async function send(name, { req, email, eventId, url, value, custom }) {
  if (!PIXEL || !TOKEN) return;
  const body = { data: [{
    event_name: name, event_time: Math.floor(Date.now() / 1000), event_id: eventId, action_source: "website",
    event_source_url: url, user_data: userData(req, email),
    custom_data: { currency: "USD", ...(value != null ? { value } : {}), ...(custom || {}) },
  }], ...(TEST ? { test_event_code: TEST } : {}) };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${PIXEL}/events?access_token=${TOKEN}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) console.error("CAPI", name, r.status, await r.text());
  } catch (e) { console.error("CAPI", name, e.message); }
}

module.exports = { send };
