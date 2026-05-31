// ============================================================
// SYNAPT.LIVE — EVENTS WORKER v1.0
// Eventos autonomos: Ticketmaster + TMDB + TheSportsDB + TVMaze
// Monetizacion: Ticketmaster Affiliate + SeatGeek + AdSense + Amazon
// GitHub Actions lo llena cada 6 horas — tu no haces nada
// ============================================================

// ─── CONFIG ─────────────────────────────────────────────────
const SITE    = "https://synapt.live";
const FAVICON = "https://pub-f72a1045793847688e3debefd7b7d7b7.r2.dev/Picsart_26-05-06_20-55-46-242.png";
const LOGO    = "https://pub-f72a1045793847688e3debefd7b7d7b7.r2.dev/1778173084232.png";

// ── AFFILIATE LINKS (reemplaza con tus IDs cuando apliques) ──
const AFF = {
  ticketmaster: "https://www.tkqlhce.com/click-XXXXXXX-YYYYYYY", // Ticketmaster Affiliate
  seatgeek:     "https://seatgeek.com/?aid=XXXXXXX",             // SeatGeek Partner
  stubhub:      "https://www.stubhub.com/?rid=XXXXXXX",          // StubHub Affiliate
  amazon:       "https://www.amazon.com/?tag=synaptlive-20",      // Amazon Associates
};

// ── ADS.TXT Google AdSense (reemplaza pub- con tu ID real) ───
const ADSENSE_PUB = "pub-8048005026767909";

const E = s => s ? String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") : "";

// ─── ROUTER ─────────────────────────────────────────────────
export default {
  async fetch(req, env) {
    const url  = new URL(req.url);
    const path = url.pathname;

    if (path === "/ads.txt")        return adsTxt();
    if (path === "/manifest.json")  return manifest();
    if (path === "/sw.js")          return swJs();
    if (path === "/api/events")     return apiEvents(env, url);
    if (path === "/api/sync")       return apiSync(req, env);   // llamado por GitHub Actions
    if (path.startsWith("/evento/")) return eventoPage(path, env);
    if (path === "/deportes")       return categoryPage("deportes", env, url);
    if (path === "/musica")         return categoryPage("musica", env, url);
    if (path === "/cine")           return categoryPage("cine", env, url);
    if (path === "/tv")             return categoryPage("tv", env, url);
    if (path === "/teatro")         return categoryPage("teatro", env, url);

    return homePage(env, url);
  }
};

// ─── ADS.TXT ────────────────────────────────────────────────
function adsTxt() {
  return new Response(
    `google.com, ${ADSENSE_PUB}, DIRECT, f08c47fec0942fa0\n`,
    { headers: { "Content-Type": "text/plain", "Cache-Control": "public,max-age=86400" } }
  );
}

// ─── MANIFEST / SW ──────────────────────────────────────────
function manifest() {
  return new Response(JSON.stringify({
    name: "SYNAPT.LIVE Events",
    short_name: "SYNAPT",
    start_url: "/",
    display: "standalone",
    background_color: "#08090f",
    theme_color: "#6d5df0",
    icons: [{ src: FAVICON, sizes: "192x192", type: "image/png" }]
  }), { headers: { "Content-Type": "application/manifest+json" } });
}

function swJs() {
  return new Response(
    `self.addEventListener('install',e=>{e.waitUntil(caches.open('synapt-ev-v1').then(c=>c.addAll(['/', '/musica', '/deportes', '/cine'])))});` +
    `self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});`,
    { headers: { "Content-Type": "application/javascript" } }
  );
}

// ─── API: GET EVENTS ────────────────────────────────────────
async function apiEvents(env, url) {
  const cat    = url.searchParams.get("cat") || "";
  const page   = parseInt(url.searchParams.get("page") || "1");
  const limit  = parseInt(url.searchParams.get("limit") || "24");
  const search = url.searchParams.get("q") || "";
  const offset = (page - 1) * limit;

  let q = "SELECT * FROM events WHERE 1=1";
  const params = [];

  if (cat)    { q += " AND LOWER(category)=LOWER(?)"; params.push(cat); }
  if (search) { q += " AND (title LIKE ? OR venue LIKE ? OR city LIKE ?)"; const s = `%${search}%`; params.push(s, s, s); }

  q += ` ORDER BY event_date ASC, updated_at DESC LIMIT ${limit} OFFSET ${offset}`;

  try {
    const { results } = await env.EVENTS_DB.prepare(q).bind(...params).all();
    return new Response(JSON.stringify({ results: results || [], page, limit }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public,max-age=60" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ results: [], error: e.message }), { headers: { "Content-Type": "application/json" } });
  }
}

// ─── API: SYNC (llamado por GitHub Actions con Bearer token) ─
async function apiSync(req, env) {
  const auth = req.headers.get("Authorization") || "";
  if (auth !== `Bearer ${env.SYNC_TOKEN}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.json();
    const events = body.events || [];
    let inserted = 0;

    for (const ev of events) {
      if (!ev.title || !ev.event_date) continue;
      const slug = makeSlug(ev.title + "-" + ev.event_date);
      await env.EVENTS_DB.prepare(`
        INSERT OR REPLACE INTO events
        (slug, title, category, subcategory, venue, city, state,
         event_date, event_time, image_url, ticket_url, affiliate_url,
         price_min, price_max, source, external_id, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      `).bind(
        slug, ev.title, ev.category || "otros", ev.subcategory || "",
        ev.venue || "", ev.city || "Bay Area", ev.state || "CA",
        ev.event_date, ev.event_time || "",
        ev.image_url || "", ev.ticket_url || "", ev.affiliate_url || "",
        ev.price_min || null, ev.price_max || null,
        ev.source || "api", ev.external_id || slug
      ).run();
      inserted++;
    }

    return new Response(JSON.stringify({ ok: true, inserted }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}

// ─── EVENTO INDIVIDUAL PAGE ──────────────────────────────────
async function eventoPage(path, env) {
  const slug = decodeURIComponent(path.replace("/evento/", ""));
  let ev = null;
  try {
    ev = await env.EVENTS_DB.prepare("SELECT * FROM events WHERE slug=? OR id=? LIMIT 1")
      .bind(slug, parseInt(slug) || 0).first();
  } catch (e) {}

  if (!ev) return html(notFoundPage(), "Evento no encontrado");

  const ticketLink = buildAffiliateLink(ev);
  const dateStr    = formatDate(ev.event_date);
  const catColor   = getCatColor(ev.category);

  const body = `
    <div style="max-width:900px;margin:0 auto;padding:40px 24px 80px;">

      ${ev.image_url ? `<img src="${E(ev.image_url)}" alt="${E(ev.title)}"
        style="width:100%;max-height:420px;object-fit:cover;border-radius:16px;margin-bottom:28px;"
        onerror="this.style.display='none'">` : ""}

      <div style="display:inline-flex;align-items:center;gap:8px;
        background:${catColor}18;border:1px solid ${catColor}44;
        border-radius:99px;padding:5px 14px;margin-bottom:16px;">
        <span style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;
          text-transform:uppercase;color:${catColor};">${E(ev.category)}</span>
      </div>

      <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(26px,4vw,46px);
        line-height:1.05;letter-spacing:-1px;color:#eeeef5;margin-bottom:14px;">${E(ev.title)}</h1>

      <div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:28px;
        padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,.07);">
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;
            color:#5a6070;text-transform:uppercase;margin-bottom:4px;">Fecha</div>
          <div style="font-size:15px;font-weight:500;">${E(dateStr)}${ev.event_time ? " · " + E(ev.event_time) : ""}</div>
        </div>
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;
            color:#5a6070;text-transform:uppercase;margin-bottom:4px;">Venue</div>
          <div style="font-size:15px;font-weight:500;">${E(ev.venue || "—")}</div>
        </div>
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;
            color:#5a6070;text-transform:uppercase;margin-bottom:4px;">Ciudad</div>
          <div style="font-size:15px;font-weight:500;">${E(ev.city || "—")}, ${E(ev.state || "")}</div>
        </div>
        ${ev.price_min ? `<div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;
            color:#5a6070;text-transform:uppercase;margin-bottom:4px;">Precio</div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#e8a820;">
            $${ev.price_min}${ev.price_max && ev.price_max !== ev.price_min ? " – $" + ev.price_max : ""} <span style="font-size:11px;color:#5a6070;font-family:'Outfit',sans-serif;font-weight:400;">desde</span>
          </div>
        </div>` : ""}
      </div>

      <!-- CTA TICKET -->
      <a href="${E(ticketLink)}" target="_blank" rel="noopener"
        style="display:inline-flex;align-items:center;gap:10px;
          padding:15px 32px;
          background:linear-gradient(135deg,#6d5df0,#4535cc);
          color:#fff;border-radius:12px;font-size:15px;font-weight:700;
          text-decoration:none;letter-spacing:.3px;margin-bottom:36px;
          box-shadow:0 0 32px rgba(109,93,240,.35);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
        Comprar Boletos
      </a>

      <!-- GOOGLE ADSENSE SLOT -->
      <div style="margin:32px 0;">
        <ins class="adsbygoogle"
          style="display:block;background:rgba(255,255,255,.02);border-radius:8px;min-height:90px;"
          data-ad-client="${ADSENSE_PUB}"
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"></ins>
      </div>

      <!-- AMAZON MERCH PROMO -->
      ${ev.category === "musica" || ev.category === "deportes" ? `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
        border-radius:12px;padding:18px 20px;margin-bottom:28px;
        display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;
            color:#9b8bf8;text-transform:uppercase;margin-bottom:4px;">Merch del artista</div>
          <div style="font-size:14px;color:#8891a4;">Camisetas, gorras y más en Amazon</div>
        </div>
        <a href="${AFF.amazon}ref=synapt_${ev.category}&keywords=${encodeURIComponent(ev.title + " merch")}"
          target="_blank" rel="noopener"
          style="padding:9px 20px;border:1px solid rgba(255,255,255,.12);border-radius:8px;
            font-size:13px;color:#eeeef5;text-decoration:none;white-space:nowrap;
            transition:all .2s;">Ver en Amazon →</a>
      </div>` : ""}

      <a href="/" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;
        color:#5a6070;text-decoration:none;">← Volver a eventos</a>
    </div>`;

  return html(pageShell(ev.title, body), ev.title, ev.image_url);
}

// ─── CATEGORY PAGE ───────────────────────────────────────────
async function categoryPage(cat, env, url) {
  const page  = parseInt(url.searchParams.get("page") || "1");
  const limit = 24;
  const offset = (page - 1) * limit;

  let events = [];
  try {
    const { results } = await env.EVENTS_DB.prepare(
      "SELECT * FROM events WHERE LOWER(category)=? ORDER BY event_date ASC LIMIT ? OFFSET ?"
    ).bind(cat, limit, offset).all();
    events = results || [];
  } catch (e) {}

  const catLabels = {
    musica: "Musica & Conciertos", deportes: "Deportes", cine: "Cine & Estrenos",
    tv: "TV en Vivo", teatro: "Teatro & Arte"
  };

  const body = `
    <div style="background:linear-gradient(135deg,rgba(109,93,240,.15),transparent);
      border-bottom:1px solid rgba(255,255,255,.06);padding:40px 40px 32px;">
      <div style="max-width:1280px;margin:0 auto;">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;
          color:#6d5df0;text-transform:uppercase;margin-bottom:10px;">Categoria</div>
        <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(32px,5vw,52px);
          letter-spacing:-1px;line-height:1;">${E(catLabels[cat] || cat)}</h1>
        <div style="font-size:13px;color:#5a6070;margin-top:8px;">${events.length} eventos proximos</div>
      </div>
    </div>
    <div style="max-width:1280px;margin:0 auto;padding:32px 24px 80px;">
      ${events.length
        ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
            ${events.map(ev => eventCard(ev)).join("")}
           </div>`
        : `<div style="text-align:center;padding:80px 0;font-family:'DM Mono',monospace;
            font-size:12px;color:#3a4050;letter-spacing:1px;">
            Cargando eventos... los datos se actualizan cada 6 horas via GitHub Actions.
           </div>`
      }
    </div>`;

  return html(pageShell(catLabels[cat] || cat, body), catLabels[cat] || cat);
}

// ─── HOME PAGE ───────────────────────────────────────────────
async function homePage(env, url) {
  const search = url.searchParams.get("q") || "";

  let allEvents = [];
  try {
    const q = search
      ? "SELECT * FROM events WHERE (title LIKE ? OR venue LIKE ? OR city LIKE ?) ORDER BY event_date ASC LIMIT 60"
      : "SELECT * FROM events ORDER BY event_date ASC LIMIT 60";
    const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
    const { results } = await env.EVENTS_DB.prepare(q).bind(...params).all();
    allEvents = results || [];
  } catch (e) {}

  // group by category
  const bycat = {};
  for (const ev of allEvents) {
    const c = ev.category || "otros";
    if (!bycat[c]) bycat[c] = [];
    bycat[c].push(ev);
  }

  const cats = [
    { key: "musica",    label: "Musica & Conciertos",   color: "#9b8bf8" },
    { key: "deportes",  label: "Deportes",               color: "#1ec8e0" },
    { key: "cine",      label: "Cine & Estrenos",        color: "#8ecf2a" },
    { key: "tv",        label: "TV en Vivo",             color: "#e05575" },
    { key: "teatro",    label: "Teatro & Arte",           color: "#e8a820" },
  ];

  // featured = soonest event across all cats
  const featured = allEvents.length > 0 ? allEvents[0] : null;

  const sectionsHtml = cats.map(cat => {
    const items = bycat[cat.key] || [];
    if (!items.length) return "";
    return `
      <section style="margin-bottom:52px;">
        <div style="display:flex;align-items:center;justify-content:space-between;
          margin-bottom:18px;padding-bottom:12px;
          border-bottom:1px solid rgba(255,255,255,.06);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:3px;height:22px;background:${cat.color};border-radius:2px;"></div>
            <h2 style="font-family:'Syne',sans-serif;font-weight:700;font-size:18px;letter-spacing:-.3px;">${E(cat.label)}</h2>
          </div>
          <a href="/${E(cat.key)}" style="font-family:'DM Mono',monospace;font-size:10px;
            letter-spacing:1.5px;text-transform:uppercase;color:#5a6070;
            text-decoration:none;transition:color .2s;">Ver todo</a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:13px;">
          ${items.slice(0, 4).map(ev => eventCard(ev)).join("")}
        </div>
      </section>`;
  }).join("");

  // AdSense banner slot
  const adBanner = `
    <div style="margin:0 0 40px;">
      <ins class="adsbygoogle"
        style="display:block;background:rgba(255,255,255,.02);border-radius:10px;min-height:90px;"
        data-ad-client="${ADSENSE_PUB}"
        data-ad-slot="9876543210"
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
    </div>`;

  const emptyState = `
    <div style="text-align:center;padding:100px 0;
      font-family:'DM Mono',monospace;font-size:12px;
      color:#3a4050;letter-spacing:1px;line-height:1.8;">
      Sincronizando eventos...<br>
      Los datos se actualizan automaticamente cada 6 horas.<br>
      <span style="color:#2a2d38;">GitHub Actions → Ticketmaster API → Cloudflare D1</span>
    </div>`;

  const body = `
    <div style="max-width:1280px;margin:0 auto;padding:40px 24px 80px;">
      ${adBanner}
      ${allEvents.length ? sectionsHtml : emptyState}
    </div>`;

  return html(pageShell("Eventos en Bay Area & Nacional", body), "SYNAPT.LIVE — Eventos");
}

// ─── EVENT CARD ──────────────────────────────────────────────
function eventCard(ev) {
  const ticketLink = buildAffiliateLink(ev);
  const color      = getCatColor(ev.category);
  const dateStr    = formatDateShort(ev.event_date);
  const slug       = ev.slug || ev.id;

  return `
    <a href="/evento/${E(slug)}" style="text-decoration:none;display:block;">
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
        border-radius:14px;overflow:hidden;transition:all .25s;cursor:pointer;height:100%;"
        onmouseover="this.style.borderColor='rgba(255,255,255,.12)';this.style.transform='translateY(-3px)'"
        onmouseout="this.style.borderColor='rgba(255,255,255,.06)';this.style.transform='translateY(0)'">

        ${ev.image_url
          ? `<div style="height:148px;overflow:hidden;background:#0c0e1a;">
               <img src="${E(ev.image_url)}" alt="${E(ev.title)}"
                 style="width:100%;height:100%;object-fit:cover;"
                 onerror="this.parentNode.style.display='none'">
             </div>`
          : `<div style="height:148px;background:linear-gradient(135deg,#0c0e1a,#10132a);
               display:flex;align-items:center;justify-content:center;">
               ${catSvg(ev.category)}
             </div>`
        }

        <div style="padding:14px 15px 15px;">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;
            text-transform:uppercase;color:${color};margin-bottom:6px;">${E(ev.category || "")}</div>
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;
            line-height:1.22;color:#eeeef5;margin-bottom:6px;
            display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${E(ev.title)}</div>
          <div style="font-size:11px;color:#5a6070;margin-bottom:12px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${E(ev.venue || "")}${ev.city ? " · " + E(ev.city) : ""}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;
            padding-top:11px;border-top:1px solid rgba(255,255,255,.05);">
            <div style="font-size:11px;color:#6b7a90;">${E(dateStr)}</div>
            ${ev.price_min
              ? `<div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:#e8a820;">
                   $${ev.price_min} <span style="font-size:9px;color:#5a6070;font-family:'Outfit',sans-serif;font-weight:400;">desde</span>
                 </div>`
              : `<div style="font-size:11px;color:#5a6070;">Ver precios</div>`
            }
          </div>
        </div>
      </div>
    </a>`;
}

// ─── PAGE SHELL ──────────────────────────────────────────────
function pageShell(title, body) {
  const nav = [
    { href: "/",          label: "Inicio" },
    { href: "/musica",    label: "Musica" },
    { href: "/deportes",  label: "Deportes" },
    { href: "/cine",      label: "Cine" },
    { href: "/tv",        label: "TV en Vivo" },
    { href: "/teatro",    label: "Teatro" },
  ];

  const network = [
    { href: "https://synapt.live",      label: "Synapt.Live",     tag: "Noticias",      color: "#9b8bf8" },
    { href: "https://elfilme.com",      label: "ElFilme.com",     tag: "Streaming",     color: "#1ec8e0" },
    { href: "https://synfm.online",     label: "SynFM",           tag: "Radio",         color: "#8ecf2a" },
    { href: "https://inventario.rest",  label: "Inventario.rest", tag: "Herramientas",  color: "#e8a820" },
  ];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${E(title)} | SYNAPT.LIVE</title>
<meta name="description" content="Descubre eventos en vivo: conciertos, deportes, cine y mas. Bay Area y nacional. Compra boletos en SYNAPT.LIVE">
<meta property="og:title" content="${E(title)} | SYNAPT.LIVE">
<meta property="og:description" content="Eventos en Bay Area y nacional — conciertos, deportes, cine, TV en vivo.">
<meta property="og:image" content="${FAVICON}">
<meta property="og:site_name" content="SYNAPT.LIVE">
<meta name="theme-color" content="#6d5df0">
<link rel="icon" href="${FAVICON}">
<link rel="manifest" href="/manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB}" crossorigin="anonymous"></script>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:#08090f;color:#eeeef5;font-family:'Outfit',sans-serif;min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse 60% 50% at 10% 15%,rgba(109,93,240,.12) 0%,transparent 65%),
    radial-gradient(ellipse 50% 40% at 90% 80%,rgba(30,200,224,.07) 0%,transparent 60%)}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#08090f}::-webkit-scrollbar-thumb{background:#6d5df0;border-radius:99px}
a{text-decoration:none;color:inherit}img{display:block;max-width:100%}
</style>
</head>
<body>

<!-- TICKER -->
<div id="ticker-bar" style="background:linear-gradient(90deg,#6d5df0,#4535cc);padding:8px 0;overflow:hidden;position:relative;z-index:10;">
  <div id="ticker-inner" style="display:inline-flex;gap:0;white-space:nowrap;animation:tickscroll 35s linear infinite;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1.2px;">
    <span style="padding:0 36px;border-right:1px solid rgba(255,255,255,.2);">Cargando eventos...</span>
  </div>
</div>
<style>@keyframes tickscroll{to{transform:translateX(-50%)}}</style>

<!-- NAV -->
<nav style="position:sticky;top:0;z-index:100;height:60px;padding:0 32px;
  display:flex;align-items:center;gap:0;
  background:rgba(8,9,15,.88);backdrop-filter:blur(20px);
  border-bottom:1px solid rgba(255,255,255,.06);">
  <a href="/" style="font-family:'Syne';font-weight:800;font-size:17px;letter-spacing:4px;
    text-transform:uppercase;margin-right:40px;color:#eeeef5;flex-shrink:0;">SYNAPT<span style="opacity:.35">.</span>LIVE</a>
  <div style="display:flex;gap:0;flex:1;overflow-x:auto;scrollbar-width:none;">
    ${nav.map(n => `<a href="${n.href}" style="padding:0 14px;line-height:60px;font-size:13px;
      font-weight:500;color:#6b7a90;white-space:nowrap;transition:color .2s;position:relative;"
      onmouseover="this.style.color='#eeeef5'" onmouseout="this.style.color='#6b7a90'">${E(n.label)}</a>`).join("")}
  </div>
  <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
    <div style="display:flex;align-items:center;gap:6px;font-family:'DM Mono',monospace;font-size:11px;
      color:#6b7a90;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
      border-radius:99px;padding:5px 12px;">
      <span style="width:5px;height:5px;background:#1ec8e0;border-radius:50%;animation:blink 2s infinite;"></span>
      Bay Area, CA
    </div>
  </div>
</nav>
<style>@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}</style>

<!-- HERO SEARCH -->
<div style="position:relative;z-index:2;padding:56px 32px 44px;text-align:center;">
  <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;
    color:#1ec8e0;text-transform:uppercase;margin-bottom:16px;
    display:inline-flex;align-items:center;gap:7px;">
    <span style="width:5px;height:5px;background:#1ec8e0;border-radius:50%;"></span>
    Bay Area &amp; Nacional — Actualizado cada 6 horas
  </div>
  <h1 style="font-family:'Syne',sans-serif;font-weight:800;
    font-size:clamp(32px,5vw,62px);line-height:1.0;letter-spacing:-1.5px;
    margin-bottom:10px;">
    Descubre
    <span style="background:linear-gradient(120deg,#9b8bf8,#1ec8e0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">eventos</span>
    cerca de ti
  </h1>

  <!-- SEARCH -->
  <form action="/" method="get" style="max-width:540px;margin:28px auto 0;
    display:flex;background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;">
    <input name="q" type="text" placeholder="Busca artista, equipo, venue..."
      style="flex:1;background:transparent;border:none;outline:none;
        padding:14px 18px;font-family:'Outfit',sans-serif;font-size:15px;
        color:#eeeef5;" autocomplete="off">
    <button type="submit"
      style="padding:14px 24px;background:linear-gradient(135deg,#6d5df0,#4535cc);
        border:none;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">
      Buscar
    </button>
  </form>
</div>

<!-- MAIN -->
<main style="position:relative;z-index:2;">${body}</main>

<!-- NETWORK FOOTER -->
<footer style="position:relative;z-index:2;border-top:1px solid rgba(255,255,255,.06);margin-top:0;">
  <div style="max-width:1280px;margin:0 auto;padding:48px 32px 36px;
    display:grid;grid-template-columns:1fr 3fr;gap:60px;align-items:start;">

    <div>
      <div style="font-family:'Syne';font-weight:800;font-size:20px;letter-spacing:5px;
        text-transform:uppercase;color:#eeeef5;margin-bottom:10px;">SYNAPT</div>
      <div style="font-size:13px;color:#5a6070;line-height:1.5;margin-bottom:18px;">
        Red de medios digitales<br>Bay Area, California
      </div>
      <div style="display:flex;gap:10px;">
        <a href="https://t.me/SynaptLiveOfficial" target="_blank"
          style="width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.04);
            border:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;"
          onmouseover="this.style.borderColor='rgba(109,93,240,.5)'" onmouseout="this.style.borderColor='rgba(255,255,255,.07)'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 4.5 2.5 11l7 2.5M21.5 4.5 16 20l-4.5-5.5M21.5 4.5 9.5 13.5m0 0v5L13 16"/></svg>
        </a>
        <a href="https://www.facebook.com/SynaptLiveSanJose" target="_blank"
          style="width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.04);
            border:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;"
          onmouseover="this.style.borderColor='rgba(109,93,240,.5)'" onmouseout="this.style.borderColor='rgba(255,255,255,.07)'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </a>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;">
      ${network.map(s => `
        <a href="${s.href}" target="_blank"
          style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);
            border-radius:12px;padding:16px;text-decoration:none;color:inherit;display:block;
            transition:all .25s;"
          onmouseover="this.style.borderColor='rgba(255,255,255,.12)';this.style.transform='translateY(-2px)'"
          onmouseout="this.style.borderColor='rgba(255,255,255,.06)';this.style.transform='translateY(0)'">
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:4px;">${E(s.label)}</div>
          <div style="font-size:12px;color:#5a6070;margin-bottom:10px;">${E(s.tag)}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;
            text-transform:uppercase;color:${s.color};background:${s.color}15;
            border:1px solid ${s.color}30;padding:3px 8px;border-radius:99px;display:inline-block;">${E(s.tag)}</div>
        </a>`).join("")}
    </div>
  </div>

  <div style="border-top:1px solid rgba(255,255,255,.05);padding:16px 32px;
    max-width:1280px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;
    flex-wrap:wrap;gap:10px;font-size:11px;color:#3a4050;font-family:'DM Mono',monospace;">
    <span>© 2026 SYNAPT Network — Redwood City, CA</span>
    <div style="display:flex;gap:20px;">
      <a href="/ads.txt" style="color:#3a4050;text-decoration:none;">Afiliados</a>
      <a href="mailto:contacto@synapt.live" style="color:#3a4050;text-decoration:none;">Contacto</a>
    </div>
  </div>
</footer>

<script>
// Load ticker from events DB
fetch('/api/events?limit=20').then(r=>r.json()).then(d=>{
  var evs=d.results||[];
  if(!evs.length)return;
  var inner=document.getElementById('ticker-inner');
  if(!inner)return;
  var items=evs.map(function(e){
    var d=e.event_date?e.event_date.slice(0,10):'';
    return '<span style="padding:0 36px;border-right:1px solid rgba(255,255,255,.2);">'
      +e.title+(e.venue?' \u2014 '+e.venue:'')+(d?' \u00B7 '+d:'')+'</span>';
  });
  var html=items.concat(items).join('');
  inner.innerHTML=html;
}).catch(function(){});

// AdSense init
(adsbygoogle=window.adsbygoogle||[]).push({});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(function(){});
</script>
</body>
</html>`;
}

// ─── HELPERS ────────────────────────────────────────────────
function html(content, title, img) {
  return new Response(content, {
    headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "no-cache,no-store,must-revalidate" }
  });
}

function buildAffiliateLink(ev) {
  if (ev.affiliate_url) return ev.affiliate_url;
  if (ev.ticket_url)    return ev.ticket_url;
  // Fallback: busca en Ticketmaster con el titulo
  return `${AFF.ticketmaster}?utm_source=synapt&utm_medium=affiliate&utm_campaign=${encodeURIComponent(ev.title || "")}`;
}

function getCatColor(cat) {
  const m = { musica: "#9b8bf8", deportes: "#1ec8e0", cine: "#8ecf2a", tv: "#e05575", teatro: "#e8a820" };
  return m[(cat || "").toLowerCase()] || "#6b7a90";
}

function formatDate(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("es-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch (e) { return d; }
}

function formatDateShort(d) {
  if (!d) return "";
  try {
    const dt   = new Date(d);
    const now  = new Date();
    const diff = Math.floor((dt - now) / 86400000);
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Manana";
    if (diff < 7)  return `En ${diff} dias`;
    return dt.toLocaleDateString("es-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (e) { return d; }
}

function makeSlug(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 80);
}

function notFoundPage() {
  return `<div style="text-align:center;padding:120px 24px;font-family:'DM Mono',monospace;">
    <div style="font-size:48px;font-weight:800;color:#2a2d38;margin-bottom:16px;">404</div>
    <div style="font-size:12px;letter-spacing:2px;color:#5a6070;">Evento no encontrado</div>
    <a href="/" style="display:inline-block;margin-top:24px;padding:10px 24px;
      border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:13px;color:#9b8bf8;">
      ← Volver al inicio</a>
  </div>`;
}

function catSvg(cat) {
  const svgs = {
    musica:   `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(155,139,248,.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    deportes: `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(30,200,224,.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
    cine:     `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(142,207,42,.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
    tv:       `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(224,85,117,.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>`,
    teatro:   `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(232,168,32,.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/></svg>`,
  };
  return svgs[(cat || "").toLowerCase()] || svgs.musica;
}
