// ALPHA RESET — tienda: web + Stripe Checkout + order bump + upsell post-compra + descarga protegida + captura de leads
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const env = process.env;
const SITE_URL = (env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const PORT = Number(env.PORT || 3000);
const DOWNLOAD_SECRET = env.DOWNLOAD_SECRET || crypto.randomBytes(32).toString("hex");
const LINK_VALID_DAYS = Number(env.LINK_VALID_DAYS || 30);
if (!env.STRIPE_SECRET_KEY) { console.error("Falta STRIPE_SECRET_KEY en .env"); process.exit(1); }
const stripe = require("stripe")(env.STRIPE_SECRET_KEY);
const capi = require("./capi");

// ---------- Catálogo (precios en centavos USD; cámbialos en .env) ----------
const PRODUCTS = {
  book:    { name: "ALPHA RESET — The 30-Day Protocol for Men (PDF)", amount: Number(env.PRICE_BOOK || 2999),
             files: ["ALPHA_RESET_Premium_Edition.pdf", "ALPHA_RESET_2AM_Relapse_Protocol.pdf"] },
  scripts: { name: "The Scripts Pack — 60 messages for the next 90 days (PDF)", amount: Number(env.PRICE_SCRIPTS || 1700),
             files: ["ALPHA_RESET_Scripts_Pack.pdf"] },
};
const PRIVATE = path.join(__dirname, "private");
const log = (file, obj) => fs.appendFile(path.join(PRIVATE, file), JSON.stringify({ t: new Date().toISOString(), ...obj }) + "\n", () => {});

const app = express();
app.set("trust proxy", 1);

// ---------- Webhook Stripe (raw body) ----------
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(200);
  let ev;
  try { ev = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], env.STRIPE_WEBHOOK_SECRET); }
  catch (e) { return res.status(400).send(`Webhook error: ${e.message}`); }
  if (ev.type === "checkout.session.completed") {
    const s = ev.data.object;
    log("orders.jsonl", { session: s.id, email: s.customer_details?.email, amount: s.amount_total, items: s.metadata?.items, link: downloadLink(s.id, s.metadata?.items || "book") });
    capi.send("Purchase", { req: { ip: s.metadata?.ip, headers: { "user-agent": s.metadata?.ua || "", cookie: s.metadata?.ck || "" } }, email: s.customer_details?.email, eventId: s.id, url: `${SITE_URL}/thanks`, value: (s.amount_total || 0) / 100, custom: { content_name: s.metadata?.items || "book" } });
  }
  res.sendStatus(200);
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

// ---------- Enlaces firmados ----------
const sign = (sid, items, exp) => crypto.createHmac("sha256", DOWNLOAD_SECRET).update(`${sid}.${items}.${exp}`).digest("hex");
function downloadLink(sid, items) {
  const exp = Date.now() + LINK_VALID_DAYS * 86400000;
  return `${SITE_URL}/download?s=${encodeURIComponent(sid)}&i=${encodeURIComponent(items)}&e=${exp}&t=${sign(sid, items, exp)}`;
}
function verify(q) {
  const { s = "", i = "", e = "", t = "" } = q;
  if (!/^cs_/.test(s) || Number(e) < Date.now() || t.length !== 64) return false;
  return crypto.timingSafeEqual(Buffer.from(sign(s, i, e)), Buffer.from(String(t)));
}

// ---------- Checkout principal (libro + order bump opcional) ----------
app.post("/api/checkout", async (req, res) => {
  try {
    const bump = !!(req.body && req.body.scripts);
    const items = bump ? "book,scripts" : "book";
    const line_items = (bump ? ["book", "scripts"] : ["book"]).map(k => ({
      price_data: { currency: "usd", unit_amount: PRODUCTS[k].amount, product_data: { name: PRODUCTS[k].name, images: [`${SITE_URL}/cover.png`] } }, quantity: 1 }));
    const session = await stripe.checkout.sessions.create({
      mode: "payment", line_items, allow_promotion_codes: true,
      success_url: `${SITE_URL}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/book#buy`,
      metadata: { items, profile: String(req.body?.profile || ""), ip: req.ip, ua: (req.headers["user-agent"] || "").slice(0, 400), ck: ((req.headers.cookie || "").match(/_fb[pc]=[^;]+/g) || []).join("; ") },
    });
    capi.send("InitiateCheckout", { req, eventId: req.body?.event_id, url: `${SITE_URL}/book`, value: line_items.reduce((a, l) => a + l.price_data.unit_amount, 0) / 100 });
    res.json({ url: session.url });
  } catch (e) { console.error(e); res.status(500).json({ error: "checkout_failed" }); }
});

// ---------- Upsell post-compra: Scripts Pack para quien no cogió el order bump ----------
app.post("/api/upsell", async (req, res) => {
  try {
    const sid = String(req.body?.session_id || "");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price_data: { currency: "usd", unit_amount: PRODUCTS.scripts.amount, product_data: { name: PRODUCTS.scripts.name, images: [`${SITE_URL}/cover.png`] } }, quantity: 1 }],
      customer_email: req.body?.email || undefined,
      success_url: `${SITE_URL}/thanks?session_id=${encodeURIComponent(sid)}&up={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/thanks?session_id=${encodeURIComponent(sid)}`,
      metadata: { items: "scripts", parent: sid, ip: req.ip, ua: (req.headers["user-agent"] || "").slice(0, 400), ck: ((req.headers.cookie || "").match(/_fb[pc]=[^;]+/g) || []).join("; ") },
    });
    res.json({ url: session.url });
  } catch (e) { console.error(e); res.status(500).json({ error: "upsell_failed" }); }
});

// ---------- Quiz completado (sin email) — para estadísticas de perfiles ----------
app.post("/api/quiz", (req, res) => { log("quiz.jsonl", { profile: req.body?.profile, score: req.body?.score, answers: req.body?.answers }); res.json({ ok: true }); });

// ---------- Leads (checklist gratis) ----------
app.post("/api/lead", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "bad_email" });
  log("leads.jsonl", { email, src: req.body?.src || "", profile: req.body?.profile, score: req.body?.score, answers: req.body?.answers });
  capi.send("Lead", { req, email, eventId: req.body?.event_id, url: `${SITE_URL}/${req.body?.src === "quiz" ? "quiz" : ""}`, custom: { content_name: req.body?.profile || req.body?.src || "checklist" } });
  res.json({ ok: true, url: `${SITE_URL}/free/ALPHA_RESET_7_Mistakes_Checklist.pdf` });
});

// ---------- Gracias: verifica pago, upsell, descarga automática ----------
app.get("/thanks", async (req, res) => {
  const sid = String(req.query.session_id || ""), upSid = String(req.query.up || "");
  let paid = false, email = "", items = "book";
  try {
    if (sid.startsWith("cs_")) { const s = await stripe.checkout.sessions.retrieve(sid); paid = s.payment_status === "paid"; email = s.customer_details?.email || ""; items = s.metadata?.items || "book"; }
    if (upSid.startsWith("cs_")) { const u = await stripe.checkout.sessions.retrieve(upSid); if (u.payment_status === "paid" && u.metadata?.parent === sid && !items.includes("scripts")) items += ",scripts"; }
  } catch (_) {}
  const tpl = fs.readFileSync(path.join(__dirname, "views", "thanks.html"), "utf8");
  res.send(tpl.replace(/{{DOWNLOAD_URL}}/g, paid ? downloadLink(sid, items) : "")
    .replace(/{{EMAIL}}/g, email).replace(/{{PAID}}/g, paid ? "1" : "0").replace(/{{SID}}/g, sid)
    .replace(/{{HAS_SCRIPTS}}/g, items.includes("scripts") ? "1" : "0")
    .replace(/{{SCRIPTS_PRICE}}/g, (PRODUCTS.scripts.amount / 100).toFixed(0)));
});

// ---------- Descarga protegida (zip si hay varios archivos) ----------
app.get("/download", (req, res) => {
  if (!verify(req.query)) return res.status(403).send("Link invalid or expired. Reply to your Stripe receipt email and we'll resend it.");
  const files = String(req.query.i).split(",").flatMap(k => PRODUCTS[k]?.files || []);
  if (files.length === 1) return res.download(path.join(PRIVATE, files[0]), files[0]);
  const archiver = require("archiver");
  res.attachment("ALPHA_RESET.zip");
  const zip = archiver("zip", { zlib: { level: 1 } });
  zip.pipe(res);
  files.forEach(f => zip.file(path.join(PRIVATE, f), { name: f }));
  zip.finalize();
});

app.listen(PORT, () => console.log(`ALPHA RESET shop → ${SITE_URL} (port ${PORT})`));
