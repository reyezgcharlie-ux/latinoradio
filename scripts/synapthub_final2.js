// ============================================================
// SYNAPT.LIVE — synapthub Worker — FASE 1 PRO
// Mejoras: URLs únicas /noticia/:slug, vistas reales,
// búsqueda live, dark mode, SEO/OG por artículo,
// paginación, compartir artículos
// ============================================================

const FAVICON = "https://pub-f72a1045793847688e3debefd7b7d7b7.r2.dev/Picsart_26-05-06_20-55-46-242.png";
const TUNEIN  = "https://tunein.com/radio/SynFm-Radio-s355835/";
const RADIONET = "https://www.radio.net/s/synfm";
const LOGO_URL = "https://pub-f72a1045793847688e3debefd7b7d7b7.r2.dev/1778173084232.png";
const LOGO_FOOTER = "https://pub-f72a1045793847688e3debefd7b7d7b7.r2.dev/posts/synapt_logo_transparent%20(1).png";
const SITE_URL = "https://synapt.live";

// ─── CSS ────────────────────────────────────────────────────
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --blue:#1a56db;--blue2:#1e429f;--ink:#0F0F0F;--soft:#666;--softer:#999;
  --bg:#F5F5F0;--bg2:#EDEDEA;--white:#fff;--border:#DEDED8;--border2:#C8C8C2;
  --radius:2px;
}
[data-theme="dark"]{
  --ink:#F0F0EC;--soft:#aaa;--softer:#666;
  --bg:#0a0a0a;--bg2:#111;--white:#161616;--border:#222;--border2:#333;
}
html{scroll-behavior:smooth;overflow-x:hidden;}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ink);overflow-x:hidden;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s;}
a{text-decoration:none;color:inherit;}img{display:block;max-width:100%;}

/* ── TOPBAR ── */
.topbar{background:var(--ink);padding:6px 2rem;display:flex;align-items:center;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.1em;}
.topbar-left{display:flex;gap:16px;align-items:center;color:#555;}
.topbar-right{display:flex;gap:12px;align-items:center;}
.topbar-right a{color:#555;transition:color .2s;}.topbar-right a:hover{color:#fff;}
.live-badge{display:flex;align-items:center;gap:5px;color:var(--blue);font-size:9px;letter-spacing:.15em;}
.live-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);animation:blink 1s infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}

/* dark toggle */
.dark-btn{background:none;border:1px solid #333;color:#555;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.1em;padding:3px 8px;cursor:pointer;transition:all .2s;}
.dark-btn:hover{border-color:#fff;color:#fff;}

/* ── MARKET BAR ── */
.market-bar{background:var(--bg2);border-bottom:2px solid var(--blue);height:30px;display:flex;align-items:center;overflow:hidden;}
.market-label{background:var(--blue);color:#fff;font-family:monospace;font-size:9px;letter-spacing:.15em;padding:0 14px;height:100%;display:flex;align-items:center;white-space:nowrap;flex-shrink:0;font-weight:700;}
.market-track{display:flex;align-items:center;animation:mscroll 40s linear infinite;white-space:nowrap;}
.market-bar:hover .market-track{animation-play-state:paused;}
@keyframes mscroll{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
.mq{display:inline-flex;align-items:center;gap:5px;padding:0 16px;font-family:monospace;font-size:10px;border-right:1px solid var(--border);height:30px;}
.mn{color:var(--softer);font-size:9px;}.mp{color:var(--ink);font-weight:700;font-size:11px;}
.mu{color:#16a34a;font-weight:700;}.md{color:#dc2626;font-weight:700;}.mf{color:#999;}

/* ── HEADER ── */
.site-header{background:var(--ink);border-bottom:4px solid var(--blue);}
.header-banner{width:100%;display:block;padding:0;background:var(--ink);text-align:center;line-height:0;}
.header-banner img{width:100%;height:220px;object-fit:cover;object-position:center;display:block;margin:0 auto;}

/* ── SEARCH BAR ── */
.search-bar{background:var(--bg2);border-bottom:1px solid var(--border);padding:8px 2rem;}
.search-inner{max-width:1280px;margin:0 auto;display:flex;gap:8px;align-items:center;}
.search-input{flex:1;background:var(--white);border:1px solid var(--border);color:var(--ink);font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.06em;padding:7px 12px;outline:none;transition:border .2s;}
.search-input:focus{border-color:var(--blue);}
.search-input::placeholder{color:var(--softer);}
.search-clear{background:none;border:none;color:var(--softer);font-size:16px;cursor:pointer;padding:0 4px;display:none;}
.search-results{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.92);z-index:999;overflow-y:auto;display:none;padding:2rem 1rem;}
.search-results.open{display:block;}
.search-results-inner{max-width:760px;margin:0 auto;}
.search-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
.search-title{font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:.1em;color:#fff;}
.search-close{background:none;border:1px solid #333;color:#666;font-family:'Share Tech Mono',monospace;font-size:11px;padding:6px 14px;cursor:pointer;transition:all .2s;}
.search-close:hover{border-color:#fff;color:#fff;}
.search-item{display:flex;gap:12px;background:#111;border-bottom:1px solid #1a1a1a;cursor:pointer;padding:12px;}
.search-item:hover{background:#1a1a1a;}
.search-item img{width:80px;height:54px;object-fit:cover;flex-shrink:0;}
.search-item-body{flex:1;}
.search-item-cat{font-family:'Share Tech Mono',monospace;font-size:.52rem;letter-spacing:.15em;color:var(--blue);text-transform:uppercase;margin-bottom:3px;}
.search-item-title{font-family:'Bebas Neue',sans-serif;font-size:1rem;color:#fff;line-height:1.2;}
.search-empty{font-family:'Share Tech Mono',monospace;font-size:.75rem;color:#444;text-align:center;padding:3rem;}

/* ── NAV ── */
.main-nav{background:var(--white);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:200;transition:background .3s;}
.main-nav-inner{max-width:1280px;margin:0 auto;padding:0 2rem;display:flex;align-items:center;overflow-x:auto;scrollbar-width:none;}
.main-nav-inner::-webkit-scrollbar{display:none;}
.nav-item{font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft);padding:12px 13px;border-bottom:3px solid transparent;white-space:nowrap;text-decoration:none;transition:all .2s;flex-shrink:0;}
.nav-item:hover,.nav-item.active{color:var(--blue);border-bottom-color:var(--blue);}
.nav-item.hi{background:var(--blue);color:#fff;border-bottom-color:var(--blue2);}.nav-item.hi:hover{background:var(--blue2);}

/* ── TICKER ── */

/* ── LAYOUT ── */
.site-container{max-width:1280px;margin:0 auto;padding:0 2rem;}
.content-grid{display:grid;grid-template-columns:1fr 300px;gap:24px;padding:24px 0;}
.main-content{min-width:0;}.sidebar{min-width:0;}

/* ── SECTION HEADERS ── */
.sec-head{display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid var(--blue);}
.sec-title{font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:.1em;color:var(--ink);}
.sec-tag{font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:.2em;color:var(--blue);border:1px solid rgba(26,86,219,.4);padding:2px 8px;border-radius:2px;text-transform:uppercase;}
.sec-more{margin-left:auto;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.1em;color:var(--soft);text-decoration:none;text-transform:uppercase;white-space:nowrap;}.sec-more:hover{color:var(--blue);}

/* ── HERO ── */
.hero-article{display:grid;grid-template-columns:1fr 340px;gap:1px;background:var(--border);margin-bottom:1px;}
.hero-main{background:var(--white);cursor:pointer;overflow:hidden;transition:background .3s;}.hero-main:hover{background:var(--bg2);}
.hero-main img{width:100%;height:340px;object-fit:cover;transition:transform .4s;}.hero-main:hover img{transform:scale(1.02);}
.hero-body{padding:20px 24px 24px;}
.hero-cat{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.2em;color:var(--blue);text-transform:uppercase;margin-bottom:8px;display:block;}
.hero-title{font-family:'Bebas Neue',sans-serif;font-size:2.2rem;letter-spacing:.05em;line-height:1.05;color:var(--ink);margin-bottom:8px;}
.hero-sub{font-size:.88rem;color:var(--soft);line-height:1.6;margin-bottom:12px;font-style:italic;}
.hero-meta{font-family:'Share Tech Mono',monospace;font-size:.58rem;color:var(--softer);display:flex;gap:12px;}
.breaking-tag{display:inline-flex;align-items:center;gap:5px;background:var(--blue);color:#fff;font-family:'Share Tech Mono',monospace;font-size:.6rem;letter-spacing:.15em;padding:3px 10px;margin-bottom:10px;}
.breaking-tag::before{content:'';width:5px;height:5px;border-radius:50%;background:#fff;animation:blink 1s infinite;}
.hero-side{background:var(--white);display:flex;flex-direction:column;gap:1px;transition:background .3s;}
.side-art{background:var(--white);cursor:pointer;flex:1;display:flex;flex-direction:column;transition:background .3s;}.side-art:hover{background:var(--bg2);}
.side-art+.side-art{border-top:1px solid var(--border);}
.side-art img{width:100%;height:140px;object-fit:cover;}
.side-body{padding:12px 14px;flex:1;}
.side-cat{font-family:'Share Tech Mono',monospace;font-size:.55rem;letter-spacing:.18em;color:var(--blue);text-transform:uppercase;margin-bottom:5px;}
.side-title{font-family:'Bebas Neue',sans-serif;font-size:1.05rem;line-height:1.2;color:var(--ink);margin-bottom:6px;}
.side-sub{font-size:.75rem;color:var(--soft);line-height:1.5;}

/* ── ARTICLE GRID ── */
.art-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);margin-bottom:1px;}
.art-card{background:var(--white);cursor:pointer;display:flex;flex-direction:column;transition:background .3s;}.art-card:hover{background:var(--bg2);}
.art-img-wrap{overflow:hidden;}.art-card img{width:100%;height:160px;object-fit:cover;transition:transform .4s;}.art-card:hover img{transform:scale(1.04);}
.art-body{padding:12px 14px;flex:1;display:flex;flex-direction:column;}
.art-cat{font-family:'Share Tech Mono',monospace;font-size:.54rem;letter-spacing:.18em;color:var(--blue);text-transform:uppercase;margin-bottom:5px;}
.art-title{font-family:'Bebas Neue',sans-serif;font-size:1rem;line-height:1.2;color:var(--ink);flex:1;margin-bottom:6px;}
.art-sub{font-size:.72rem;color:var(--soft);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.art-foot{padding:8px 14px;border-top:1px solid var(--border);font-family:'Share Tech Mono',monospace;font-size:.52rem;color:var(--softer);display:flex;justify-content:space-between;}

/* ── LIST ── */
.art-list-item{display:flex;background:var(--white);border-bottom:1px solid var(--border);cursor:pointer;transition:background .3s;}.art-list-item:hover{background:var(--bg2);}
.art-list-item img{width:110px;height:75px;object-fit:cover;flex-shrink:0;}
.ali-body{padding:10px 12px;flex:1;}
.ali-cat{font-family:'Share Tech Mono',monospace;font-size:.52rem;letter-spacing:.15em;color:var(--blue);text-transform:uppercase;margin-bottom:3px;}
.ali-title{font-family:'Bebas Neue',sans-serif;font-size:.95rem;line-height:1.2;color:var(--ink);margin-bottom:3px;}
.ali-meta{font-family:'Share Tech Mono',monospace;font-size:.5rem;color:var(--softer);}

/* ── SIDEBAR ── */
.widget{background:var(--white);border:1px solid var(--border);border-top:3px solid var(--blue);margin-bottom:20px;transition:background .3s;}
.widget-head{padding:10px 14px;border-bottom:1px solid var(--border);font-family:'Share Tech Mono',monospace;font-size:.68rem;letter-spacing:.2em;color:var(--blue);text-transform:uppercase;}
.widget-body{padding:12px 14px;}
.trending-item{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;}.trending-item:last-child{border-bottom:none;}
.trending-num{font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--border2);line-height:1;flex-shrink:0;width:26px;text-align:right;}
.trending-title{font-size:.78rem;font-weight:600;line-height:1.4;color:var(--ink);}
.trending-cat{font-family:'Share Tech Mono',monospace;font-size:.52rem;color:var(--soft);margin-top:2px;}
.follow-links{display:flex;flex-direction:column;gap:6px;}
.follow-link{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg);font-family:'Share Tech Mono',monospace;font-size:.62rem;letter-spacing:.08em;color:var(--ink);border:1px solid var(--border);text-decoration:none;transition:background .2s;}.follow-link:hover{background:var(--bg2);}

/* ── PAGINATION ── */
.pagination{display:flex;gap:4px;padding:20px 0;justify-content:center;}
.page-btn{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.1em;padding:6px 12px;border:1px solid var(--border);color:var(--soft);cursor:pointer;background:var(--white);transition:all .2s;}
.page-btn:hover,.page-btn.active{background:var(--blue);color:#fff;border-color:var(--blue);}
.page-btn:disabled{opacity:.3;cursor:not-allowed;}

/* ── RADIO STRIP ── */
.radio-strip{background:var(--ink);border-top:3px solid var(--blue);border-bottom:3px solid var(--blue);padding:32px 2rem;margin:24px 0;}
.radio-strip-inner{max-width:1280px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;}
.radio-name{font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:.15em;color:#fff;}
.radio-sub{font-family:'Share Tech Mono',monospace;font-size:.62rem;letter-spacing:.15em;color:#444;text-transform:uppercase;margin-top:4px;}
.radio-buttons{display:flex;gap:12px;flex-wrap:wrap;}
.radio-btn{display:flex;align-items:center;gap:8px;padding:12px 20px;font-family:'Share Tech Mono',monospace;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;border-radius:2px;transition:all .2s;}
.radio-btn.p{background:var(--blue);color:#fff;}.radio-btn.p:hover{background:var(--blue2);}
.radio-btn.o{border:1px solid #333;color:#666;}.radio-btn.o:hover{border-color:#fff;color:#fff;}

/* ── ARTICLE PAGE ── */
.article-page{max-width:1280px;margin:0 auto;padding:32px 2rem 60px;}
.article-grid{display:grid;grid-template-columns:1fr 300px;gap:32px;}
.article-hero-img{width:100%;max-height:480px;object-fit:cover;margin-bottom:24px;}
.article-cat-bar{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.article-cat{font-family:'Share Tech Mono',monospace;font-size:.6rem;letter-spacing:.25em;color:var(--blue);text-transform:uppercase;}
.article-breaking{display:inline-flex;align-items:center;gap:5px;background:var(--blue);color:#fff;font-family:'Share Tech Mono',monospace;font-size:.55rem;letter-spacing:.15em;padding:2px 8px;}
.article-breaking::before{content:'';width:4px;height:4px;border-radius:50%;background:#fff;animation:blink 1s infinite;}
.article-title{font-family:'Bebas Neue',sans-serif;font-size:2.8rem;letter-spacing:.05em;line-height:1.05;color:var(--ink);margin-bottom:12px;}
.article-sub{font-size:1.05rem;color:var(--soft);line-height:1.7;font-style:italic;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border);}
.article-meta{font-family:'Share Tech Mono',monospace;font-size:.58rem;color:var(--softer);display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid var(--border);}
.article-body{font-size:.95rem;line-height:1.95;color:var(--ink);white-space:pre-line;}
/* share bar */
.share-bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:28px;padding-top:20px;border-top:1px solid var(--border);}
.share-label{font-family:'Share Tech Mono',monospace;font-size:.6rem;letter-spacing:.15em;color:var(--softer);align-self:center;text-transform:uppercase;}
.share-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;font-family:'Share Tech Mono',monospace;font-size:.6rem;letter-spacing:.1em;border:1px solid var(--border);color:var(--ink);cursor:pointer;background:var(--bg);text-decoration:none;transition:all .2s;text-transform:uppercase;}
.share-btn:hover{background:var(--blue);color:#fff;border-color:var(--blue);}
/* views badge */
.views-badge{display:inline-flex;align-items:center;gap:5px;font-family:'Share Tech Mono',monospace;font-size:.56rem;color:var(--softer);}
.views-badge svg{opacity:.5;}
/* breadcrumb */
.breadcrumb{font-family:'Share Tech Mono',monospace;font-size:.58rem;letter-spacing:.1em;color:var(--softer);margin-bottom:20px;}
.breadcrumb a{color:var(--blue);text-decoration:none;}.breadcrumb a:hover{text-decoration:underline;}
.breadcrumb span{margin:0 6px;opacity:.3;}

/* ── MODAL (home) ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:500;display:none;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;}
.modal-overlay.open{display:flex;}
.modal-box{background:var(--white);max-width:760px;width:100%;position:relative;animation:mIn .25s ease;}
@keyframes mIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.modal-img{width:100%;max-height:380px;object-fit:cover;}
.modal-body{padding:24px 28px;}
.modal-cat{font-family:'Share Tech Mono',monospace;font-size:.58rem;letter-spacing:.25em;color:var(--blue);text-transform:uppercase;margin-bottom:8px;}
.modal-title{font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:.05em;line-height:1.1;margin-bottom:8px;color:var(--ink);}
.modal-sub{font-size:.9rem;color:var(--soft);font-style:italic;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);}
.modal-text{font-size:.88rem;line-height:1.9;color:var(--ink);white-space:pre-line;}
.modal-footer{margin-top:16px;padding-top:12px;border-top:1px solid var(--border);font-family:'Share Tech Mono',monospace;font-size:.55rem;color:var(--softer);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;}
.modal-close{position:absolute;top:12px;right:12px;width:36px;height:36px;background:var(--ink);color:var(--bg);border:none;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.modal-share{display:flex;gap:6px;flex-wrap:wrap;}
.modal-share-btn{font-family:'Share Tech Mono',monospace;font-size:.55rem;letter-spacing:.08em;padding:4px 10px;border:1px solid var(--border);color:var(--soft);cursor:pointer;background:none;transition:all .2s;text-decoration:none;display:inline-flex;align-items:center;}
.modal-share-btn:hover{background:var(--blue);color:#fff;border-color:var(--blue);}
.modal-open-btn{font-family:'Share Tech Mono',monospace;font-size:.55rem;padding:4px 12px;background:var(--blue);color:#fff;border:none;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;}

/* ── FOOTER ── */
footer{background:var(--ink);border-top:3px solid var(--blue);padding:48px 2rem 24px;color:#fff;}
.footer-inner{max-width:1280px;margin:0 auto;}
.footer-top{display:flex;justify-content:space-between;align-items:flex-start;gap:32px;flex-wrap:wrap;margin-bottom:32px;}
.footer-logo img{height:72px;width:auto;object-fit:contain;opacity:.9;margin-bottom:8px;}
.footer-tagline{font-family:'Share Tech Mono',monospace;font-size:.6rem;letter-spacing:.15em;color:#333;text-transform:uppercase;}
.footer-cols{display:flex;gap:40px;flex-wrap:wrap;}
.footer-col h4{font-family:'Share Tech Mono',monospace;font-size:.6rem;letter-spacing:.22em;color:var(--blue);text-transform:uppercase;margin-bottom:12px;}
.footer-col a{display:block;font-size:.82rem;color:#444;text-decoration:none;margin-bottom:8px;}.footer-col a:hover{color:#fff;}
.footer-bottom{border-top:1px solid #1a1a1a;padding-top:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;}
.footer-copy{font-family:'Share Tech Mono',monospace;font-size:.58rem;letter-spacing:.1em;color:#333;}
.footer-terms{display:flex;gap:16px;}.footer-terms a{font-family:'Share Tech Mono',monospace;font-size:.58rem;color:#333;text-decoration:none;}.footer-terms a:hover{color:var(--blue);}

/* ── SECCION ── */
.seccion-hero{background:var(--blue);padding:32px 2rem;}
.seccion-name{font-family:'Bebas Neue',sans-serif;font-size:3rem;letter-spacing:.15em;color:#fff;}
.seccion-count{font-family:'Share Tech Mono',monospace;font-size:.65rem;letter-spacing:.15em;color:rgba(255,255,255,.5);margin-top:6px;}
.seccion-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1px;background:var(--border);}

/* ── REVEAL ── */
.reveal{opacity:0;transform:translateY(16px);transition:opacity .5s ease,transform .5s ease;}.reveal.on{opacity:1;transform:translateY(0);}

/* ── RESPONSIVE ── */
@media(max-width:1024px){
  .hero-article{grid-template-columns:1fr;}
  .hero-side{flex-direction:row;}
  .side-art img{height:100px;}
  .content-grid,.article-grid{grid-template-columns:1fr;}
  .sidebar{display:none;}
}
@media(max-width:768px){
  .site-container{padding:0 1rem;}
  .art-grid{grid-template-columns:repeat(2,1fr);}
  .hero-main img{height:220px;}
  .hero-title{font-size:1.6rem;}
  .radio-strip{padding:24px 1rem;}
  .footer-top{flex-direction:column;}
  .topbar{display:none;}
  .header-banner img{min-height:80px;max-height:160px;}
  .article-title{font-size:2rem;}
  .search-bar{padding:8px 1rem;}
}
@media(max-width:480px){
  .art-grid{grid-template-columns:1fr;}
  .hero-side{flex-direction:column;}
  .nav-item{padding:10px 8px;font-size:10px;}
  .header-banner img{min-height:60px;max-height:120px;}
}
`;

// ─── HELPERS ────────────────────────────────────────────────
const E = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') : '';
const FD = ds => {
  if (!ds) return '';
  const d = new Date(ds), diff = Math.floor((Date.now()-d.getTime())/60000);
  if (diff < 1) return 'Ahora';
  if (diff < 60) return `Hace ${diff} min`;
  if (diff < 1440) return `Hace ${Math.floor(diff/60)}h`;
  return d.toLocaleDateString('es-CR',{day:'numeric',month:'short'});
};
const NC = c => {
  if (!c) return 'Mundo';
  const m = {mundo:'Mundo',politica:'Politica',tecnologia:'Tecnologia','tecnología':'Tecnologia',deportes:'Deportes',entretenimiento:'Entretenimiento',economia:'Economia','economía':'Economia',ciencia:'Ciencia',salud:'Salud',cultura:'Cultura',local:'Local'};
  return m[c.toLowerCase()] || c.charAt(0).toUpperCase()+c.slice(1);
};
const GUESS_CAT = (t,b,c) => {
  if(c && c.toLowerCase()!=="entretenimiento") return NC(c);
  const x=((t||"")+" "+(b||"")).toLowerCase();
  if(/nfl|nba|nhl|mlb|futbol|deporte|liga |partido|torneo|jugador|copa|champions|basketball|beisbol|soccer/.test(x)) return"Deportes";
  if(/tecnolog|iphone|android|samsung|microsoft|inteligencia artificial|robot|software|startup|openai|chatgpt|bitcoin|crypto/.test(x)) return"Tecnologia";
  if(/econom|mercado|bolsa|inflaci|banco central|finanza|inversion|recesion|desempleo|aranceles/.test(x)) return"Economia";
  if(/ciencia|espacio exterior|planeta|investigacion cient|evolucion|universo|asteroide|nuclear/.test(x)) return"Ciencia";
  if(/salud|hospital|medico|enfermedad|vacuna|cancer|covid|diabetes|tratamiento|pandemia|epidemia/.test(x)) return"Salud";
  if(/trump|biden|congreso|senado|eleccion|gobierno|presidente|politica|partido|democr|republic/.test(x)) return"Politica";
  if(/guerra|rusia|ucrania|china|israel|palestina|nato|onu|internacional/.test(x)) return"Mundo";
  return"Entretenimiento";
};
const makeSlug = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').substring(0,60);
const FALLBACK_IMG = FAVICON;
const imgFallback = `onerror="this.src='${FALLBACK_IMG}';this.onerror=null;this.style.objectFit='contain';this.style.background='#0a0a0a';this.style.padding='8px'"`;

function P(b,extra={}) { return new Response(b, { headers: { 'Content-Type':'text/html;charset=UTF-8','Cache-Control':'no-cache,no-store,must-revalidate','Pragma':'no-cache','Expires':'0',...extra } }); }
function jsonR(d,s=200) { return new Response(JSON.stringify(d), { status:s, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'} }); }

// ─── ROUTER ─────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // API
    if (path === '/api/news' && method === 'POST') return postNews(request, env);
    if (path === '/api/news' && method === 'GET')  return getNews(env, url);
    if (path === '/api/quotes') return getQuotes();
    if (path === '/api/videos' && method === 'POST') return postVideo(request, env);
    if (path === '/api/search') return apiSearch(env, url);
    if (path.startsWith('/api/view/')) return incrementView(path, env);

    // ADS.TXT
    if (path === '/ads.txt') return new Response('google.com, pub-8048005026767909, DIRECT, f08c47fec0942fa0\n', {headers:{'Content-Type':'text/plain','Cache-Control':'public,max-age=86400'}});

    // PWA
    if (path === '/manifest.json') return manifest();
    if (path === '/sw.js') return swjs();

    // Pages
    if (path === '/videos') return videosPage(env);
    if (path === '/quienes-somos') return P(staticPage('QUIENES SOMOS', aboutBody()));
    if (path === '/contacto') return P(staticPage('CONTACTO', contactBody()));
    if (path.startsWith('/seccion/')) return seccion(path, env, url);
    if (path.startsWith('/noticia/')) return articlePage(path, env);

    return index(env);
  }
};

// ─── MANIFEST / SW ──────────────────────────────────────────
function manifest() {
  return new Response(JSON.stringify({
    name:'SYNAPT.LIVE',short_name:'SYNAPT',
    description:'The Network - Noticias, Entretenimiento y Cultura',
    start_url:'/',display:'standalone',
    background_color:'#F5F5F0',theme_color:'#1a56db',
    icons:[{src:FAVICON,sizes:'192x192',type:'image/png'},{src:FAVICON,sizes:'512x512',type:'image/png'}]
  }),{headers:{'Content-Type':'application/manifest+json','Cache-Control':'public,max-age=86400'}});
}
function swjs() {
  return new Response(
    'self.addEventListener("install",e=>{e.waitUntil(caches.open("synapt-v2").then(c=>c.addAll(["/"])));});'+
    'self.addEventListener("fetch",e=>{e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});',
    {headers:{'Content-Type':'application/javascript','Cache-Control':'public,max-age=86400'}}
  );
}

// ─── QUOTES ─────────────────────────────────────────────────
async function getQuotes() {
  const syms=[['%5EGSPC','S&P 500'],['%5EIXIC','NASDAQ'],['%5EDJI','DOW'],['BTC-USD','BTC'],['GC%3DF','ORO'],['CL%3DF','PETROLEO']];
  try {
    const out = await Promise.all(syms.map(async([s,n])=>{
      try {
        const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval=1d&range=1d',{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}});
        const d = await r.json();
        const meta = d?.chart?.result?.[0]?.meta;
        if(!meta) return{n,p:null,c:null};
        const price=meta.regularMarketPrice,prev=meta.previousClose||meta.chartPreviousClose;
        return{n,p:price,c:prev?parseFloat(((price-prev)/prev*100).toFixed(2)):0};
      } catch(e){return{n,p:null,c:null};}
    }));
    return new Response(JSON.stringify(out),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'public,max-age=60'}});
  } catch(e){return new Response('[]',{headers:{'Content-Type':'application/json'}});}
}

// ─── NEWS CRUD ──────────────────────────────────────────────
async function postNews(req, env) {
  try {
    const b = await req.json();
    if (!b.titulo || !b.cuerpo || !b.categoria) return jsonR({error:'Faltan campos'},400);
    const slug = b.slug || makeSlug(b.titulo);
    await env.SYNAPT_NEWS_DB.prepare(
      'INSERT OR REPLACE INTO noticias (titulo,subtitulo,cuerpo,categoria,fuente,imagen_url,slug,breaking,activa) VALUES (?,?,?,?,?,?,?,?,1)'
    ).bind(b.titulo,b.subtitulo||'',b.cuerpo,NC(b.categoria),b.fuente||'SYNAPT.LIVE',b.imagen_url||'',slug,b.breaking?1:0).run();
    return jsonR({ok:true,slug});
  } catch(e){return jsonR({error:e.message},500);}
}

async function getNews(env, url) {
  const page  = parseInt(url.searchParams.get('page')||'1');
  const limit = parseInt(url.searchParams.get('limit')||'20');
  const cat   = url.searchParams.get('cat')||'';
  const offset = (page-1)*limit;
  let q = 'SELECT id,titulo,subtitulo,categoria,fuente,imagen_url,slug,destacada,breaking,vistas,publicado_en FROM noticias WHERE activa=1';
  const params = [];
  if(cat){q+=' AND LOWER(categoria)=LOWER(?)';params.push(cat);}
  q+=` ORDER BY publicado_en DESC LIMIT ${limit} OFFSET ${offset}`;
  const {results} = await env.SYNAPT_NEWS_DB.prepare(q).bind(...params).all();
  return jsonR({results:results||[],page,limit});
}

async function apiSearch(env, url) {
  const q = (url.searchParams.get('q')||'').trim();
  if(!q) return jsonR({results:[]});
  const term = `%${q}%`;
  const {results} = await env.SYNAPT_NEWS_DB.prepare(
    'SELECT id,titulo,subtitulo,categoria,imagen_url,slug,publicado_en FROM noticias WHERE activa=1 AND (titulo LIKE ? OR subtitulo LIKE ? OR cuerpo LIKE ?) ORDER BY publicado_en DESC LIMIT 15'
  ).bind(term,term,term).all();
  return jsonR({results:results||[]});
}

async function incrementView(path, env) {
  const id = parseInt(path.replace('/api/view/',''));
  if(!id||isNaN(id)) return jsonR({ok:false});
  try {
    await env.SYNAPT_NEWS_DB.prepare('UPDATE noticias SET vistas=COALESCE(vistas,0)+1 WHERE id=?').bind(id).run();
    return jsonR({ok:true});
  } catch(e){return jsonR({ok:false});}
}

async function postVideo(req, env) {
  try {
    const b = await req.json();
    if(!b.titulo||!b.url) return jsonR({error:'Faltan titulo y url'},400);
    await env.SYNAPT_NEWS_DB.prepare('INSERT INTO videos (titulo,descripcion,url,thumbnail,activo) VALUES (?,?,?,?,1)').bind(b.titulo,b.descripcion||'',b.url,b.thumbnail||'').run();
    return jsonR({ok:true});
  } catch(e){return jsonR({error:e.message},500);}
}

// ─── ARTICLE PAGE (URL única + SEO) ─────────────────────────
async function articlePage(path, env) {
  const slug = decodeURIComponent(path.replace('/noticia/',''));
  let noticia = null;
  // Buscar por slug primero, luego por ID
  try {
    const bySlug = await env.SYNAPT_NEWS_DB.prepare(
      'SELECT * FROM noticias WHERE activa=1 AND slug=? LIMIT 1'
    ).bind(slug).first();
    noticia = bySlug;
    if(!noticia && !isNaN(parseInt(slug))){
      noticia = await env.SYNAPT_NEWS_DB.prepare(
        'SELECT * FROM noticias WHERE activa=1 AND id=? LIMIT 1'
      ).bind(parseInt(slug)).first();
    }
  } catch(e){}

  if(!noticia) {
    return P(staticPage('404 – No encontrado',
      '<p style="font-family:Share Tech Mono,monospace;color:#999;text-align:center;padding:4rem;">El artículo no fue encontrado.</p>'
    ));
  }

  // Incrementar vistas en background
  try { env.SYNAPT_NEWS_DB.prepare('UPDATE noticias SET vistas=COALESCE(vistas,0)+1 WHERE id=?').bind(noticia.id).run(); } catch(e){}

  // Relacionadas (misma categoria)
  let related = [];
  try {
    const {results} = await env.SYNAPT_NEWS_DB.prepare(
      'SELECT id,titulo,subtitulo,categoria,imagen_url,slug,publicado_en FROM noticias WHERE activa=1 AND categoria=? AND id!=? ORDER BY publicado_en DESC LIMIT 4'
    ).bind(noticia.categoria, noticia.id).all();
    related = results||[];
  } catch(e){}

  const cat = GUESS_CAT(noticia.titulo, noticia.cuerpo, noticia.categoria);
  const img = (noticia.imagen_url||'').trim() || FALLBACK_IMG;
  const articleUrl = `${SITE_URL}/noticia/${noticia.slug||noticia.id}`;
  const shareText = encodeURIComponent(noticia.titulo);
  const shareUrl  = encodeURIComponent(articleUrl);

  const relatedHtml = related.length ? `
    <div style="margin-top:32px;">
      <div class="sec-head"><span class="sec-title">MÁS EN ${E(cat.toUpperCase())}</span></div>
      <div class="art-grid">${related.map(r=>card(r)).join('')}</div>
    </div>` : '';

  const body = `
    <div class="article-page">
      <div class="breadcrumb">
        <a href="/">Inicio</a><span>›</span>
        <a href="/seccion/${encodeURIComponent(cat.toLowerCase())}">${E(cat)}</a><span>›</span>
        ${E((noticia.titulo||'').substring(0,50))}${(noticia.titulo||'').length>50?'…':''}
      </div>
      <div class="article-grid">
        <article>
          ${img!==FALLBACK_IMG?`<img class="article-hero-img" src="${E(img)}" alt="${E(noticia.titulo)}" ${imgFallback}>`:''}
          <div class="article-cat-bar">
            ${noticia.breaking?'<span class="article-breaking">BREAKING</span>':''}
            <span class="article-cat">${E(cat)}</span>
          </div>
          <h1 class="article-title">${E(noticia.titulo||'')}</h1>
          ${noticia.subtitulo?`<p class="article-sub">${E(noticia.subtitulo)}</p>`:''}
          <div class="article-meta">
            <span>Fuente: ${E(noticia.fuente||'SYNAPT.LIVE')}</span>
            <span>${FD(noticia.publicado_en)}</span>
            <span class="views-badge">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ${noticia.vistas||0} vistas
            </span>
          </div>
          <div class="article-body">${E(noticia.cuerpo||'')}</div>
          <div class="share-bar">
            <span class="share-label">Compartir:</span>
            <a class="share-btn" href="https://telegram.me/share/url?url=${shareUrl}&text=${shareText}" target="_blank">Telegram</a>
            <a class="share-btn" href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank">WhatsApp</a>
            <a class="share-btn" href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" target="_blank">Twitter/X</a>
            <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank">Facebook</a>
            <button class="share-btn" onclick="navigator.clipboard.writeText('${articleUrl.replace(/'/g,"\\'")}').then(()=>this.textContent='¡Copiado!').catch(()=>{})">Copiar link</button>
          </div>
          ${relatedHtml}
        </article>
        <aside class="sidebar" id="art-sidebar"></aside>
      </div>
    </div>`;

  // OG meta tags para SEO
  const ogMeta = `
    <meta property="og:title" content="${E(noticia.titulo)}"/>
    <meta property="og:description" content="${E(noticia.subtitulo||noticia.cuerpo?.substring(0,160)||'')}"/>
    <meta property="og:image" content="${E(img)}"/>
    <meta property="og:url" content="${articleUrl}"/>
    <meta property="og:type" content="article"/>
    <meta property="og:site_name" content="SYNAPT.LIVE"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${E(noticia.titulo)}"/>
    <meta name="twitter:description" content="${E(noticia.subtitulo||'')}"/>
    <meta name="twitter:image" content="${E(img)}"/>
    <link rel="canonical" href="${articleUrl}"/>`;

  return P(buildPage(noticia.titulo, body, [], ogMeta));
}

// ─── SECCION PAGE (con paginación) ──────────────────────────
async function seccion(path, env, url) {
  const rawCat = decodeURIComponent(path.replace('/seccion/','')).replace(/-/g,' ');
  const cat = NC(rawCat);
  const page = parseInt(url.searchParams.get('page')||'1');
  const PER  = 24;
  const offset = (page-1)*PER;

  const [{results}, countRow] = await Promise.all([
    env.SYNAPT_NEWS_DB.prepare(
      'SELECT id,titulo,subtitulo,cuerpo,categoria,fuente,imagen_url,slug,breaking,vistas,publicado_en FROM noticias WHERE activa=1 AND LOWER(categoria)=LOWER(?) ORDER BY publicado_en DESC LIMIT ? OFFSET ?'
    ).bind(cat, PER, offset).all(),
    env.SYNAPT_NEWS_DB.prepare(
      'SELECT COUNT(*) as total FROM noticias WHERE activa=1 AND LOWER(categoria)=LOWER(?)'
    ).bind(cat).first()
  ]);

  const total = countRow?.total||0;
  const totalPages = Math.ceil(total/PER);
  const items = (results||[]).map(n=>({...n,categoria:GUESS_CAT(n.titulo,n.cuerpo,n.categoria)}));

  const paginationHtml = totalPages > 1 ? `
    <div class="pagination">
      ${page>1?`<button class="page-btn" onclick="location.href='/seccion/${encodeURIComponent(cat.toLowerCase())}?page=${page-1}'">← Anterior</button>`:''}
      ${Array.from({length:Math.min(totalPages,8)},(_,i)=>i+1).map(p=>
        `<button class="page-btn${p===page?' active':''}" onclick="location.href='/seccion/${encodeURIComponent(cat.toLowerCase())}?page=${p}'">${p}</button>`
      ).join('')}
      ${page<totalPages?`<button class="page-btn" onclick="location.href='/seccion/${encodeURIComponent(cat.toLowerCase())}?page=${page+1}'">Siguiente →</button>`:''}
    </div>` : '';

  const body = `
    <div class="seccion-hero">
      <div style="max-width:1280px;margin:0 auto;padding:0 2rem;">
        <div class="seccion-name">${E(cat.toUpperCase())}</div>
        <div class="seccion-count">${total} artículos · Página ${page} de ${Math.max(totalPages,1)}</div>
      </div>
    </div>
    <div class="site-container" style="padding-top:24px;padding-bottom:40px;">
      ${items.length
        ? `<div class="seccion-grid reveal">${items.map(n=>card(n)).join('')}</div>${paginationHtml}`
        : '<div style="padding:3rem;text-align:center;font-family:monospace;color:#999;">Sin artículos en esta sección.</div>'}
    </div>`;
  return P(buildPage(cat, body, items));
}

// ─── INDEX PAGE ─────────────────────────────────────────────
async function index(env) {
  const [nr, tr] = await Promise.all([
    env.SYNAPT_NEWS_DB.prepare(
      'SELECT id,titulo,subtitulo,cuerpo,categoria,fuente,imagen_url,slug,destacada,breaking,vistas,publicado_en FROM noticias WHERE activa=1 ORDER BY publicado_en DESC LIMIT 80'
    ).all(),
    Promise.resolve({results:[]})
  ]);
  const noticias = (nr.results||[]).map(n=>({...n,categoria:GUESS_CAT(n.titulo,n.cuerpo,n.categoria)}));


  const hero  = noticias.find(n=>n.breaking)||noticias[0];
  const rest  = hero ? noticias.filter(n=>n.id!==hero.id) : noticias.slice(1);
  const sides = rest.slice(0,2);
  const grid  = rest.slice(2,11);
  const lst   = rest.slice(11,17);
  const trending = [...noticias].sort((a,b)=>(b.vistas||0)-(a.vistas||0)).slice(0,7);

  const cats = {};
  noticias.forEach(n=>{const c=n.categoria||'Otros';if(!cats[c])cats[c]=[];cats[c].push(n);});

  const secHtml = ['Entretenimiento','Mundo','Tecnologia','Deportes','Economia','Ciencia'].map(cat=>{
    const items=cats[cat]||[];
    if(items.length<2) return '';
    return `<div class="site-container" style="padding-top:24px;">
      <div class="sec-head">
        <span class="sec-title">${cat.toUpperCase()}</span>
        <a href="/seccion/${cat.toLowerCase()}" class="sec-more">Ver todo →</a>
      </div>
      <div class="art-grid reveal">${items.slice(0,4).map(a=>card(a)).join('')}</div>
    </div>`;
  }).join('');

  const trendHtml = trending.map((n,i)=>
    `<div class="trending-item" onclick="nav('${E(n.slug||n.id)}')">
      <div class="trending-num">${i+1}</div>
      <div><div class="trending-title">${E(n.titulo)}</div>
      <div class="trending-cat">${E(n.categoria)} · ${n.vistas||0} vistas</div></div>
    </div>`
  ).join('');

  const body = `
    <div class="site-container"><div class="content-grid">
      <div class="main-content">
        <div style="padding:16px 0 1px;">
          <div class="sec-head">
            <span class="sec-title">ÚLTIMAS NOTICIAS</span>
            <span class="sec-tag">EN VIVO</span>
          </div>
          <div class="hero-article reveal">
            ${hero ? card(hero,'hero') : ''}
            <div class="hero-side">${sides.map(a=>card(a,'side')).join('')}</div>
          </div>
        </div>
        <div class="sec-head" style="margin-top:16px;"><span class="sec-title">MÁS NOTICIAS</span></div>
        <div class="art-grid reveal">${grid.map(a=>card(a)).join('')}</div>
        <div class="sec-head" style="margin-top:20px;"><span class="sec-title">RECIENTES</span></div>
        <div class="reveal">${lst.map(a=>card(a,'list')).join('')}</div>
      </div>
      <aside class="sidebar">
        <div class="widget">
          <div class="widget-head">Lo Más Visto</div>
          <div class="widget-body">${trendHtml}</div>
        </div>
        <div class="widget">
          <div class="widget-head">Síguenos</div>
          <div class="widget-body"><div class="follow-links">
            <a href="https://t.me/synaptliveofficial" target="_blank" class="follow-link">📢 Telegram</a>
            <a href="https://facebook.com/synapt.live" target="_blank" class="follow-link">📘 Facebook</a>
            <a href="https://youtube.com/@synaptlive" target="_blank" class="follow-link">📺 YouTube</a>
            <a href="https://x.com/synaptlive" target="_blank" class="follow-link">✕ Twitter/X</a>
          </div></div>
        </div>
      </aside>
    </div></div>
    ${secHtml}
    <div class="radio-strip"><div class="radio-strip-inner">
      <div>
        <div class="radio-name">SYN FM RADIO</div>
        <div class="radio-sub">Transmisión 24/7 en vivo</div>
      </div>
      <div class="radio-buttons">
        <a href="https://synfm.online" target="_blank" class="radio-btn p">🎙 Escuchar Ahora</a>
        <a href="${TUNEIN}" target="_blank" class="radio-btn o">TuneIn</a>
        <a href="${RADIONET}" target="_blank" class="radio-btn o">Radio.net</a>
      </div>
    </div></div>`;

  return P(buildPage('SYNAPT.LIVE - The Network', body, noticias));
}

// ─── CARD ────────────────────────────────────────────────────
function card(n, sz='normal') {
  const img  = (n.imagen_url&&n.imagen_url.trim()!=='') ? E(n.imagen_url) : FALLBACK_IMG;
  const cat  = E(n.categoria||'');
  const tit  = E(n.titulo||'');
  const sub  = E(n.subtitulo||'');
  const src  = E(n.fuente||'SYNAPT');
  const id   = n.id;
  const dt   = FD(n.publicado_en);
  const slug = n.slug||id;
  // Artículo página directa en cards de sección, modal en index
  const onClick = `onclick="nav('${slug}')"`;

  if(sz==='hero'){
    const bb = n.breaking?'<div class="breaking-tag">BREAKING</div>':'';
    return `<div class="hero-main" ${onClick}>
      <img src="${img}" alt="" loading="lazy" ${imgFallback}/>
      <div class="hero-body">${bb}
        <span class="hero-cat">${cat}</span>
        <div class="hero-title">${tit}</div>
        <div class="hero-sub">${sub}</div>
        <div class="hero-meta"><span>${src}</span><span>${dt}</span></div>
      </div></div>`;
  }
  if(sz==='side') return `<div class="side-art" ${onClick}>
    <img src="${img}" alt="" loading="lazy" ${imgFallback}/>
    <div class="side-body">
      <div class="side-cat">${cat}</div>
      <div class="side-title">${tit}</div>
      <div class="side-sub">${sub}</div>
    </div></div>`;
  if(sz==='list') return `<div class="art-list-item" ${onClick}>
    <img src="${img}" alt="" loading="lazy" ${imgFallback}/>
    <div class="ali-body">
      <div class="ali-cat">${cat}</div>
      <div class="ali-title">${tit}</div>
      <div class="ali-meta">${src} · ${dt}</div>
    </div></div>`;
  return `<div class="art-card" ${onClick}>
    <div class="art-img-wrap"><img src="${img}" alt="" loading="lazy" ${imgFallback}></div>
    <div class="art-body">
      <div class="art-cat">${cat}</div>
      <div class="art-title">${tit}</div>
      <div class="art-sub">${sub}</div>
    </div>
    <div class="art-foot"><span>${src}</span><span>${dt}</span></div>
  </div>`;
}

// ─── BUILD PAGE ──────────────────────────────────────────────
function buildPage(title, body, ndb=[], extraMeta='') {
  const ndbJ = JSON.stringify((ndb||[]).map(n=>({
    id:n.id,titulo:n.titulo||'',subtitulo:n.subtitulo||'',
    cuerpo:n.cuerpo||'',categoria:n.categoria||'',
    fuente:n.fuente||'',imagen_url:n.imagen_url||'',
    slug:n.slug||'',publicado_en:n.publicado_en||''
  })));

  const header = `
    <div class="topbar">
      <div class="topbar-left"><span id="td"></span><span>San Jose, CA</span></div>
      <div class="topbar-right">
        <div class="live-badge"><span class="live-dot"></span>EN VIVO</div>
        <a href="https://synfm.online" target="_blank">SYN FM</a>
        <a href="/contacto">Contacto</a>
        <a href="/quienes-somos">Nosotros</a>
        <button class="dark-btn" id="dmBtn" onclick="toggleDark()">◑ DARK</button>
      </div>
    </div>
    <div class="market-bar">
      <div class="market-label">MERCADOS</div>
      <div class="market-track">
        <span class="mq"><span class="mn">S&P 500</span><span class="mp" id="p0">--</span><span class="mf" id="c0">--</span></span>
        <span class="mq"><span class="mn">NASDAQ</span><span class="mp" id="p1">--</span><span class="mf" id="c1">--</span></span>
        <span class="mq"><span class="mn">DOW</span><span class="mp" id="p2">--</span><span class="mf" id="c2">--</span></span>
        <span class="mq"><span class="mn">BTC</span><span class="mp" id="p3">--</span><span class="mf" id="c3">--</span></span>
        <span class="mq"><span class="mn">ORO</span><span class="mp" id="p4">--</span><span class="mf" id="c4">--</span></span>
        <span class="mq"><span class="mn">PETROLEO</span><span class="mp" id="p5">--</span><span class="mf" id="c5">--</span></span>
        <span class="mq"><span class="mn">S&P 500</span><span class="mp" id="p0b">--</span><span class="mf" id="c0b">--</span></span>
        <span class="mq"><span class="mn">NASDAQ</span><span class="mp" id="p1b">--</span><span class="mf" id="c1b">--</span></span>
        <span class="mq"><span class="mn">DOW</span><span class="mp" id="p2b">--</span><span class="mf" id="c2b">--</span></span>
        <span class="mq"><span class="mn">BTC</span><span class="mp" id="p3b">--</span><span class="mf" id="c3b">--</span></span>
        <span class="mq"><span class="mn">ORO</span><span class="mp" id="p4b">--</span><span class="mf" id="c4b">--</span></span>
        <span class="mq"><span class="mn">PETROLEO</span><span class="mp" id="p5b">--</span><span class="mf" id="c5b">--</span></span>
      </div>
    </div>
    <header class="site-header">
      <div class="header-banner"><a href="/"><img src="${LOGO_URL}" alt="SYNAPT.LIVE"/></a></div>
    </header>
    <div class="search-bar">
      <div class="search-inner">
        <input class="search-input" id="searchInput" type="text" placeholder="🔍  Buscar noticias..." autocomplete="off" oninput="onSearch(this.value)"/>
        <button class="search-clear" id="searchClear" onclick="clearSearch()">✕</button>
      </div>
    </div>
    <nav class="main-nav">
      <div class="main-nav-inner">
        <a href="/" class="nav-item active">Inicio</a>
        <a href="/seccion/mundo" class="nav-item">Mundo</a>
        <a href="/seccion/politica" class="nav-item">Politica</a>
        <a href="/seccion/tecnologia" class="nav-item">Tecnologia</a>
        <a href="/seccion/deportes" class="nav-item">Deportes</a>
        <a href="/seccion/entretenimiento" class="nav-item">Entretenimiento</a>
        <a href="/seccion/economia" class="nav-item">Economia</a>
        <a href="/seccion/ciencia" class="nav-item">Ciencia</a>
        <a href="/seccion/salud" class="nav-item">Salud</a>
        <a href="/seccion/cultura" class="nav-item">Cultura</a>
        <a href="/videos" class="nav-item">Videos</a>
        <a href="https://synfm.online" target="_blank" class="nav-item hi">SYN FM</a>
      </div>
    </nav>
    <!-- SEARCH OVERLAY -->
    <div class="search-results" id="searchResults">
      <div class="search-results-inner">
        <div class="search-head">
          <div class="search-title" id="searchCount">Buscando...</div>
          <button class="search-close" onclick="clearSearch()">✕ CERRAR</button>
        </div>
        <div id="searchList"></div>
      </div>
    </div>`;

  const footer = `
    <footer>
      <div class="footer-inner">
        <div class="footer-top">
          <div>
            <div class="footer-logo"><img src="${LOGO_FOOTER}" alt="SYNAPT Network"/></div>
            <div class="footer-tagline">// SYNAPT NETWORK - EST. 2026 // SAN JOSE, CA</div>
          </div>
          <div class="footer-cols">
            <div class="footer-col">
              <h4>Secciones</h4>
              <a href="/seccion/mundo">Mundo</a><a href="/seccion/politica">Politica</a>
              <a href="/seccion/tecnologia">Tecnologia</a><a href="/seccion/deportes">Deportes</a>
              <a href="/seccion/entretenimiento">Entretenimiento</a><a href="/seccion/economia">Economia</a>
              <a href="/seccion/ciencia">Ciencia</a>
            </div>
            <div class="footer-col">
              <h4>Network</h4>
              <a href="/quienes-somos">Quienes Somos</a><a href="/contacto">Contacto</a>
              <a href="https://synfm.online" target="_blank">SYN FM Radio</a>
              <a href="https://elfilme.com" target="_blank">ElFilme.com</a>
              <a href="https://dash.synapt.live" target="_blank">Dashboard</a>
            </div>
            <div class="footer-col">
              <h4>Síguenos</h4>
              <a href="https://t.me/synaptliveofficial" target="_blank">Telegram</a>
              <a href="https://facebook.com/synapt.live" target="_blank">Facebook</a>
              <a href="https://youtube.com/@synaptlive" target="_blank">YouTube</a>
              <a href="https://x.com/synaptlive" target="_blank">Twitter/X</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="footer-copy">© 2026 SYNAPT NETWORK — ALL RIGHTS RESERVED — SAN JOSE, CA</div>
          <div class="footer-terms"><a href="/quienes-somos">About</a><a href="/contacto">Contacto</a></div>
        </div>
      </div>
    <div style="text-align:center;padding:14px 0;border-top:1px solid #333;"><a href="https://buymeacoffee.com/synaptnetwork" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#FFDD00;color:#000;font-family:Arial,sans-serif;font-weight:700;font-size:13px;padding:9px 18px;border-radius:8px;text-decoration:none;">&#9749; Apoya SYNAPT Network</a></div></footer>`;

  return `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${E(title)} | SYNAPT.LIVE</title>
<meta name="description" content="SYNAPT.LIVE - The Network. Noticias, entretenimiento y cultura desde San Jose, CA."/>
<link rel="icon" type="image/png" href="${FAVICON}"/>
<link rel="apple-touch-icon" href="${FAVICON}"/>
<meta name="theme-color" content="#1a56db"/>
<meta name="mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta name="apple-mobile-web-app-title" content="SYNAPT"/>
<meta property="og:site_name" content="SYNAPT.LIVE"/>
<meta property="og:image" content="${FAVICON}"/>
<meta property="og:type" content="website"/>
<link rel="manifest" href="/manifest.json"/>
${extraMeta}
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
<style>${CSS}</style>
</head><body>
${header}${body}${footer}
<!-- MODAL (home/index) -->
<div class="modal-overlay" id="mo">
  <div class="modal-box">
    <button class="modal-close" onclick="cm()">✕</button>
    <img class="modal-img" id="mi" src="" alt="" onerror="this.style.display='none'"/>
    <div class="modal-body">
      <div class="modal-cat" id="mc"></div>
      <div class="modal-title" id="mt"></div>
      <div class="modal-sub" id="ms"></div>
      <div class="modal-text" id="mx"></div>
      <div class="modal-footer">
        <div class="modal-share" id="msh"></div>
        <div style="display:flex;gap:6px;align-items:center;">
          <a class="modal-open-btn" id="moLink" href="#" target="_blank">Abrir artículo →</a>
          <span id="mv" style="font-family:Share Tech Mono,monospace;font-size:.52rem;color:#666;"></span>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
// ── DATA ──
var D=["Domingo","Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"];
var M=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
var d=new Date(),s=D[d.getDay()]+", "+d.getDate()+" de "+M[d.getMonth()]+" de "+d.getFullYear();
var td=document.getElementById("td");if(td)td.textContent=s;
var NDB=${ndbJ};

// ── DARK MODE ──
function toggleDark(){
  var html=document.documentElement;
  var cur=html.getAttribute('data-theme')||'';
  var next=cur==='dark'?'':'dark';
  html.setAttribute('data-theme',next);
  localStorage.setItem('synapt-theme',next);
  var btn=document.getElementById('dmBtn');
  if(btn)btn.textContent=next==='dark'?'☀ LIGHT':'◑ DARK';
}
(function(){
  var t=localStorage.getItem('synapt-theme')||'';
  if(t){document.documentElement.setAttribute('data-theme',t);}
  var btn=document.getElementById('dmBtn');
  if(btn&&t==='dark')btn.textContent='☀ LIGHT';
})();

// ── NAVIGATE ── (abre modal en index, navega en secciones)
function nav(slug){
  // Si hay NDB cargado, intenta modal primero
  if(NDB&&NDB.length){
    var n=NDB.find(function(x){return String(x.slug)===String(slug)||String(x.id)===String(slug);});
    if(n){om(n);return;}
  }
  // Sino navega directo
  window.location.href='/noticia/'+slug;
}

// ── MODAL ──
function om(n){
  fetch('/api/view/'+n.id).catch(function(){});
  var mi=document.getElementById('mi');
  if(mi){mi.src=n.imagen_url||'';mi.style.display=n.imagen_url?'block':'none';}
  document.getElementById('mc').textContent=n.categoria||'';
  document.getElementById('mt').textContent=n.titulo||'';
  document.getElementById('ms').textContent=n.subtitulo||'';
  document.getElementById('mx').textContent=n.cuerpo||'';
  document.getElementById('mv').textContent=n.publicado_en?new Date(n.publicado_en).toLocaleString('es-CR'):'';
  var artSlug=n.slug||n.id;
  var artUrl=window.location.origin+'/noticia/'+artSlug;
  var msh=document.getElementById('msh');
  var mLink=document.getElementById('moLink');
  if(mLink)mLink.href=artUrl;
  if(msh){
    var shareText=encodeURIComponent(n.titulo);var shareUrl=encodeURIComponent(artUrl);
    msh.innerHTML='<span style="font-family:Share Tech Mono,monospace;font-size:.52rem;color:#666;align-self:center;">COMPARTIR:</span>'+
      '<a class="modal-share-btn" href="https://telegram.me/share/url?url='+shareUrl+'&text='+shareText+'" target="_blank">TG</a>'+
      '<a class="modal-share-btn" href="https://wa.me/?text='+shareText+'%20'+shareUrl+'" target="_blank">WA</a>'+
      '<a class="modal-share-btn" href="https://twitter.com/intent/tweet?url='+shareUrl+'&text='+shareText+'" target="_blank">X</a>';
  }
  document.getElementById('mo').classList.add('open');
  document.body.style.overflow='hidden';
}
function cm(){document.getElementById('mo').classList.remove('open');document.body.style.overflow='';}
document.getElementById('mo').addEventListener('click',function(e){if(e.target===this)cm();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')cm();});

// ── SEARCH ──
var _st=null;
function onSearch(val){
  var clr=document.getElementById('searchClear');
  if(clr)clr.style.display=val?'block':'none';
  if(!val){clearSearch();return;}
  clearTimeout(_st);
  _st=setTimeout(function(){doSearch(val);},300);
}
function doSearch(q){
  if(!q){clearSearch();return;}
  var res=document.getElementById('searchResults');
  var lst=document.getElementById('searchList');
  var cnt=document.getElementById('searchCount');
  if(res)res.classList.add('open');
  if(cnt)cnt.textContent='Buscando "'+q+'"...';
  // Búsqueda local primero (instantánea)
  var lq=q.toLowerCase();
  var found=NDB.filter(function(n){
    return (n.titulo||'').toLowerCase().indexOf(lq)>-1||(n.subtitulo||'').toLowerCase().indexOf(lq)>-1;
  }).slice(0,12);
  renderSearch(found,q);
  // También búsqueda server-side para cuerpo
  fetch('/api/search?q='+encodeURIComponent(q)).then(function(r){return r.json();}).then(function(d){
    var srv=d.results||[];
    // Merge sin duplicados
    var ids=new Set(found.map(function(n){return n.id;}));
    srv.forEach(function(n){if(!ids.has(n.id))found.push(n);});
    renderSearch(found,q);
  }).catch(function(){});
}
function renderSearch(items,q){
  var lst=document.getElementById('searchList');
  var cnt=document.getElementById('searchCount');
  if(cnt)cnt.textContent=items.length+' resultado'+(items.length===1?'':'s')+' para "'+q+'"';
  if(!lst)return;
  if(!items.length){lst.innerHTML='<div class="search-empty">Sin resultados para "'+q+'"</div>';return;}
  lst.innerHTML=items.map(function(n){
    var img=n.imagen_url||'${FALLBACK_IMG}';
    var slug=n.slug||n.id;
    return '<div class="search-item" onclick="clearSearch();nav(\''+String(slug).replace(/'/g,"\\'")+'\')">'
      +'<img src="'+img+'" alt="" onerror="this.style.display=\'none\'">'
      +'<div class="search-item-body">'
      +'<div class="search-item-cat">'+(n.categoria||'')+'</div>'
      +'<div class="search-item-title">'+(n.titulo||'')+'</div>'
      +'</div></div>';
  }).join('');
}
function clearSearch(){
  var inp=document.getElementById('searchInput');
  var res=document.getElementById('searchResults');
  var clr=document.getElementById('searchClear');
  if(inp)inp.value='';
  if(res)res.classList.remove('open');
  if(clr)clr.style.display='none';
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape')clearSearch();
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();var inp=document.getElementById('searchInput');if(inp)inp.focus();}
});

// ── REVEAL ──
var rv=document.querySelectorAll('.reveal');
var ro=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('on');ro.unobserve(e.target);}});},{threshold:0.08});
rv.forEach(function(el){ro.observe(el);});

// ── MARKETS ──
window.addEventListener('load',function(){
  function fP(p){if(!p&&p!==0)return'--';if(p>10000)return'$'+Math.round(p).toLocaleString('en-US');if(p>1)return'$'+p.toFixed(2);return p.toFixed(4);}
  function fC(c){if(c===null||c===undefined)return'--';var n=parseFloat(c);return(n>0?'+':'')+n.toFixed(2)+'%';}
  function upd(i,pr,ch,cl){['','b'].forEach(function(s){var pe=document.getElementById('p'+i+s);var ce=document.getElementById('c'+i+s);if(pe)pe.textContent=pr;if(ce){ce.textContent=ch;ce.className=cl;}});}
  function run(){fetch('/api/quotes').then(function(r){return r.json();}).then(function(d){if(!Array.isArray(d))return;d.forEach(function(q,i){if(i>5)return;upd(i,fP(q.p),fC(q.c),q.c>0?'mu':q.c<0?'md':'mf');});}).catch(function(){});}
  run();setInterval(run,60000);
});

// ── PWA ──
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}
</script>
</body></html>`;
}

// ─── STATIC PAGES ────────────────────────────────────────────
function staticPage(title, body) {
  return buildPage(title,
    `<div class="seccion-hero"><div style="max-width:1280px;margin:0 auto;padding:0 2rem;"><div class="seccion-name">${E(title)}</div></div></div>`
    +`<div class="site-container" style="padding:40px 0 60px;">${body}</div>`
  );
}
function aboutBody() {
  return '<p style="font-family:Bebas Neue,sans-serif;font-size:1.8rem;letter-spacing:.1em;margin-bottom:16px;">SYNAPT.LIVE THE NETWORK</p>'
    +'<p style="font-family:DM Sans,sans-serif;line-height:1.9;color:#333;font-size:.95rem;margin-bottom:16px;">Synapt.Live es una plataforma de medios digitales independiente basada en San Jose, California. Combinamos noticias editoriales, radio en vivo 24/7, streaming y herramientas digitales bajo una sola marca.</p>'
    +'<p style="font-family:DM Sans,sans-serif;line-height:1.9;color:#333;font-size:.95rem;margin-bottom:16px;">Nuestra red incluye synapt.live (noticias), synfm.online (radio), elfilme.com (streaming) e inventario.rest (gestión de bares y restaurantes).</p>'
    +'<p style="font-family:Share Tech Mono,monospace;font-size:.75rem;letter-spacing:.15em;color:#1a56db;">// THE NETWORK EST. 2026 SAN JOSE CA //</p>';
}
function contactBody() {
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">'
    +'<a href="mailto:contacto@synapt.live" style="display:block;padding:20px 24px;background:var(--white);border:1px solid var(--border);border-top:3px solid var(--blue);text-decoration:none;color:var(--ink);">'
    +'<div style="font-family:Share Tech Mono,monospace;font-size:.6rem;letter-spacing:.15em;color:var(--blue);margin-bottom:6px;">EMAIL</div>'
    +'<div style="font-size:1rem;font-weight:600;">contacto@synapt.live</div></a>'
    +'<a href="https://t.me/synaptliveofficial" target="_blank" style="display:block;padding:20px 24px;background:var(--white);border:1px solid var(--border);border-top:3px solid var(--blue);text-decoration:none;color:var(--ink);">'
    +'<div style="font-family:Share Tech Mono,monospace;font-size:.6rem;letter-spacing:.15em;color:var(--blue);margin-bottom:6px;">TELEGRAM</div>'
    +'<div style="font-size:1rem;font-weight:600;">@synaptliveofficial</div></a>'
    +'<a href="https://facebook.com/synapt.live" target="_blank" style="display:block;padding:20px 24px;background:var(--white);border:1px solid var(--border);border-top:3px solid var(--blue);text-decoration:none;color:var(--ink);">'
    +'<div style="font-family:Share Tech Mono,monospace;font-size:.6rem;letter-spacing:.15em;color:var(--blue);margin-bottom:6px;">FACEBOOK</div>'
    +'<div style="font-size:1rem;font-weight:600;">Synapt.Live San Jose</div></a>'
    +'</div>';
}
function videosPage(env) {
  const body = '<div class="seccion-hero"><div style="max-width:1280px;margin:0 auto;padding:0 2rem;"><div class="seccion-name">VIDEOS</div></div></div>'
             + '<div class="site-container" style="padding:40px 0;"><div style="padding:2rem;text-align:center;font-family:Share Tech Mono,monospace;font-size:.75rem;color:#999;">Galería de videos próximamente.</div></div>';
  return P(buildPage('VIDEOS', body));
}