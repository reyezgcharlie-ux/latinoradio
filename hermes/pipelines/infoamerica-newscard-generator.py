#!/usr/bin/env python3
"""
INFOAMERICA Newscard Generator v4 — video vertical multi-plataforma
imagen(es) RSS + narración voz natural + título grande + Ken Burns + música + subtítulos
+ combina 2 noticias si una sola no llega al minuto + publica en Telegram/FB/IG/TikTok/YouTube
Diseñado por Claude para SYNAPT Network | 2026-07-02
"""
import html, json, os, re, subprocess, sys, tempfile, textwrap, urllib.request, urllib.error, time
from datetime import datetime, timezone

CF_ACCOUNT = "9cd06a9cb40a471bc7a2adb149d1df5a"
D1_DB_ID = "0f5b7816-8fd3-437e-acaf-98322cad2d1a"
R2_PUBLIC = "https://pub-f72a1045793847688e3debefd7b7d7b7.r2.dev"
R2_MEDIA_PUBLIC = "https://pub-f72a1045793847688e3debefd7b7d7b7.r2.dev"  # bucket synapt-media
INTRO_URL = f"{R2_PUBLIC}/podcast/intro.mp3"
BG_MUSIC_URL = "https://pub-f72a1045793847688e3debefd7b7d7b7.r2.dev/noticiasbackground%20.mp3"
LOGO_URL = f"{R2_PUBLIC}/Webtools/file_000000000b6c71f58ab933c4beb14b43.png"
VOICE = "es-MX-DaliaNeural"
MAX_CARDS = 1  # videos generados por corrida (cada uno puede llevar 1 o 2 noticias adentro)
MIN_SECONDS_SINGLE = 55  # si la 1a noticia narra menos que esto, se le agrega una 2a
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

HASHTAGS = "#InfoAmerica #NoticiasMexico #UltimaHora #InfoAmericaPress #Mexico"
PROMO_SPOKEN = (
    "Síguenos en Infoamérica punto press para más noticias. "
    "Encuentra ofertas increíbles de Amazon en inventario punto rest. "
    "Y escúchanos en Sin F M, disponible en TuneIn, con música regional mexicana y reggaetón, sin comerciales."
)
CAPTION_FOOTER = "📰 InfoAmerica.press | 🛒 Ofertas en inventario.rest | 🎧 SynFM en TuneIn (sin comerciales)"

RSS_FEEDS = [
    ("El Universal MX", "https://www.eluniversal.com.mx/arc/outboundfeeds/rss/", "rss"),
    ("Excélsior", "https://www.excelsior.com.mx/rss", "rss"),
    ("Google News MX", "https://news.google.com/rss?hl=es-419&gl=MX&ceid=MX:es-419", "google"),
    ("Google News MX - Trending", "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=es-419&gl=MX&ceid=MX:es-419", "google"),
    ("El País", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", "rss"),
]


def load_creds():
    creds = {}
    with open(os.path.expanduser("~/.hermes/.env")) as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                creds[k] = v
    return creds


def fetch_rss(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        return urllib.request.urlopen(req, timeout=15).read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  ERROR RSS {url}: {e}")
        return None


def parse_items(xml_text, source_name, is_google):
    items = []
    for m in re.finditer(r"<item>(.*?)</item>", xml_text, re.S):
        block = m.group(1)
        title_m = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", block, re.S)
        desc_m = re.search(r"<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", block, re.S)
        link_m = re.search(r"<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</link>", block, re.S)
        img_m = re.search(r'<media:content[^>]*url="([^"]+)"', block) or re.search(r'<enclosure[^>]*url="([^"]+)"', block)
        title = html.unescape(re.sub(r"<[^>]+>", "", title_m.group(1))).strip() if title_m else ""
        desc = html.unescape(re.sub(r"<[^>]+>", "", desc_m.group(1))).strip() if desc_m else ""
        link = html.unescape(re.sub(r"<[^>]+>", "", link_m.group(1))).strip() if link_m else ""
        img = html.unescape(img_m.group(1)) if img_m else ""  # el RSS trae &amp; en vez de & en URLs firmadas
        if is_google:
            title = re.sub(r"\s*-\s*[^-]+$", "", title)
        if title and len(title) > 15:
            items.append({"title": title, "description": desc, "image": img, "source": source_name, "link": link})
    return items



def fetch_full_article(url, min_chars=400):
    """Descarga la pagina del articulo y extrae el texto real de los parrafos.
    Devuelve None si falla o si el articulo resulta muy corto (no vale la pena)."""
    if not url:
        return None
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
        html_raw = urllib.request.urlopen(req, timeout=12).read().decode("utf-8", errors="replace")
    except Exception:
        return None
    html_clean = re.sub(r"<(script|style|nav|footer|header)[^>]*>.*?</\1>", " ", html_raw, flags=re.S | re.I)
    paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", html_clean, re.S | re.I)
    texts = []
    for p in paragraphs:
        t = html.unescape(re.sub(r"<[^>]+>", "", p)).strip()
        if len(t) > 40:  # ignora parrafos basura (menus, avisos legales cortos, etc.)
            texts.append(t)
    full_text = " ".join(texts)
    if len(full_text) < min_chars:
        return None
    return full_text

def get_recent_titles(creds, limit=300):
    body = json.dumps({"sql": f"SELECT title FROM newscards ORDER BY id DESC LIMIT {limit}"}).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB_ID}/query",
        data=body,
        headers={"X-Auth-Email": "reyezgcharlie@gmail.com", "X-Auth-Key": creds["CLOUDFLARE_GLOBAL_API_KEY"], "Content-Type": "application/json"},
    )
    try:
        resp = json.loads(urllib.request.urlopen(req).read())
        return {r["title"].lower().strip()[:60] for r in resp["result"][0]["results"]}
    except Exception:
        return set()


def ensure_table(creds):
    body = json.dumps({"sql": (
        "CREATE TABLE IF NOT EXISTS newscards ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, title2 TEXT, source TEXT, "
        "video_key TEXT, telegram_msg_id TEXT, social_fb TEXT, social_tt TEXT, social_ig TEXT, social_yt TEXT, "
        "posted_at TEXT)"
    )}).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB_ID}/query",
        data=body, method="POST",
        headers={"X-Auth-Email": "reyezgcharlie@gmail.com", "X-Auth-Key": creds["CLOUDFLARE_GLOBAL_API_KEY"], "Content-Type": "application/json"},
    )
    urllib.request.urlopen(req)
    # por si la tabla ya existia de una version anterior sin estas columnas
    for col in ["title2", "social_fb", "social_tt", "social_ig", "social_yt"]:
        try:
            b2 = json.dumps({"sql": f"ALTER TABLE newscards ADD COLUMN {col} TEXT"}).encode()
            r2 = urllib.request.Request(
                f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB_ID}/query",
                data=b2, method="POST",
                headers={"X-Auth-Email": "reyezgcharlie@gmail.com", "X-Auth-Key": creds["CLOUDFLARE_GLOBAL_API_KEY"], "Content-Type": "application/json"},
            )
            urllib.request.urlopen(r2)
        except Exception:
            pass


def wrap_title(title, width_chars=16):
    return "\n".join(textwrap.wrap(title[:110], width=width_chars))


def split_caption_chunks(text, words_per_chunk=7, max_chunks=24):
    words = text.split()
    chunks = [" ".join(words[i:i+words_per_chunk]) for i in range(0, len(words), words_per_chunk)]
    return chunks[:max_chunks]


def tts_to_file(text, path):
    subprocess.run(["edge-tts", "--voice", VOICE, "--text", text, "--write-media", path],
                    check=True, capture_output=True, text=True)


def get_duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                        capture_output=True, text=True)
    return float(r.stdout.strip())


def download_image(url, out_path):
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    try:
        subprocess.run(["curl", "-sL", "-A", ua, "--max-time", "15", "-o", out_path, url], check=True, timeout=18)
        chk = subprocess.run(["ffprobe", "-v", "error", out_path], capture_output=True, timeout=5)
        if chk.returncode != 0 or os.path.getsize(out_path) < 500:
            raise Exception("imagen inválida o bloqueada")
    except Exception as e:
        print(f"   ⚠️ No se pudo descargar imagen de la noticia ({url[:70]}): {e} — usando logo de respaldo")
        subprocess.run(["curl", "-sL", "-o", out_path, LOGO_URL], check=True, timeout=10)


def build_segment_video(img_path, title_text, caption_chunks, seg_duration, seg_start_offset, tmp_dir, seg_name):
    """Genera un segmento de video (Ken Burns + banda + titulo + subtitulos) sin audio."""
    title_wrapped = wrap_title(title_text)
    title_file = os.path.join(tmp_dir, f"{seg_name}_title.txt")
    with open(title_file, "w") as f:
        f.write(title_wrapped)

    caption_filters = []
    if caption_chunks:
        chunk_dur = seg_duration / max(len(caption_chunks), 1)
        for idx, chunk in enumerate(caption_chunks):
            c_file = os.path.join(tmp_dir, f"{seg_name}_cap{idx}.txt")
            with open(c_file, "w") as f:
                f.write(chunk)
            start = idx * chunk_dur
            end = start + chunk_dur
            caption_filters.append(
                f"drawtext=textfile={c_file}:fontfile={FONT_BOLD}:fontsize=52:fontcolor=white:"
                f"borderw=5:bordercolor=black:x=(w-text_w)/2:y=760:"
                f"enable='between(t,{start:.2f},{end:.2f})'"
            )
    captions_vf = ("," + ",".join(caption_filters)) if caption_filters else ""

    output = os.path.join(tmp_dir, f"{seg_name}.mp4")
    total_frames = int((seg_duration + 0.5) * 25)
    vf = (
        "scale=1350:2400:force_original_aspect_ratio=increase,crop=1350:2400,"
        f"zoompan=z='min(zoom+0.0006,1.35)':d=1:s=1080x1920:fps=25,"
        "drawbox=x=0:y=1280:w=1080:h=640:color=black@0.78:t=fill,"
        "drawbox=x=0:y=1272:w=1080:h=10:color=red@0.95:t=fill,"
        f"drawtext=textfile={title_file}:fontfile={FONT_BOLD}:"
        "fontsize=72:fontcolor=white:borderw=6:bordercolor=black:"
        "x=(w-text_w)/2:y=1370:line_spacing=16:text_align=center,"
        "drawtext=text='INFOAMERICA.PRESS':fontfile=" + FONT_BOLD + ":"
        "fontsize=36:fontcolor=red:borderw=2:bordercolor=black:x=(w-text_w)/2:y=1310"
        + captions_vf
    )
    cmd = [
        "ffmpeg", "-y", "-loop", "1", "-i", img_path,
        "-vf", vf, "-frames:v", str(total_frames),
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-pix_fmt", "yuv420p",
        output,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=200)
    if r.returncode != 0:
        print(f"  ERROR ffmpeg segmento {seg_name}:", r.stderr[-400:])
        return None
    return output


def generate_video(items, creds, tmp_dir):
    """items: lista de 1 o 2 noticias. Genera un solo video combinando ambas si son 2."""
    intro_path = os.path.join(tmp_dir, "intro.mp3")
    subprocess.run(["curl", "-sL", "-o", intro_path, INTRO_URL], check=True, timeout=15)
    intro_duration = get_duration(intro_path)

    bg_music_path = os.path.join(tmp_dir, "bgmusic.mp3")
    subprocess.run(["curl", "-sL", "-o", bg_music_path, BG_MUSIC_URL], check=True, timeout=15)

    logo_path = os.path.join(tmp_dir, "logo.png")
    subprocess.run(["curl", "-sL", "-o", logo_path, LOGO_URL], check=True, timeout=10)

    # --- Narracion + video por cada segmento de noticia ---
    audio_parts = [intro_path]
    video_segments = []
    seg_video_durations = []

    for i, item in enumerate(items):
        title_clean = item['title'].strip()
        # full_body ya viene resuelto desde main(): texto del articulo completo si se pudo
        # extraer, o la description del RSS como respaldo. Misma proteccion anti-duplicado.
        body_clean = re.sub(r"<[^>]+>", "", item.get('full_body', '') or "").strip()
        if not body_clean or body_clean.lower() == title_clean.lower() or body_clean.lower().startswith(title_clean.lower()[:40]):
            narration = f"{title_clean}."
        else:
            narration = f"{title_clean}. {body_clean[:2200]}"
        tts_path = os.path.join(tmp_dir, f"tts{i}.mp3")
        tts_to_file(narration, tts_path)
        seg_dur = get_duration(tts_path)
        audio_parts.append(tts_path)

        img_path = os.path.join(tmp_dir, f"img{i}.jpg")
        download_image(item["image"], img_path)

        chunks = split_caption_chunks(narration)
        seg_video = build_segment_video(img_path, item["title"], chunks, seg_dur, 0, tmp_dir, f"seg{i}")
        if seg_video:
            video_segments.append(seg_video)
            seg_video_durations.append(seg_dur)

    # --- Outro con promo hablada + tarjeta visual simple (usa el logo, sin imagen de fondo especifica) ---
    promo_tts = os.path.join(tmp_dir, "promo.mp3")
    tts_to_file(PROMO_SPOKEN, promo_tts)
    promo_dur = get_duration(promo_tts)
    audio_parts.append(promo_tts)
    promo_img = os.path.join(tmp_dir, "promo_img.jpg")
    download_image(LOGO_URL, promo_img)  # fondo simple para la tarjeta de cierre
    promo_title_file = os.path.join(tmp_dir, "promo_title.txt")
    with open(promo_title_file, "w") as f:
        f.write("INFOAMERICA.PRESS\nINVENTARIO.REST\nSYNFM en TuneIn")
    promo_video = os.path.join(tmp_dir, "promo_seg.mp4")
    promo_frames = int((promo_dur + 0.5) * 25)
    promo_vf = (
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=8,"
        "drawbox=x=0:y=760:w=1080:h=420:color=black@0.75:t=fill,"
        f"drawtext=textfile={promo_title_file}:fontfile={FONT_BOLD}:fontsize=58:fontcolor=white:"
        "borderw=5:bordercolor=red:x=(w-text_w)/2:y=830:line_spacing=20:text_align=center"
    )
    r_promo = subprocess.run(
        ["ffmpeg", "-y", "-loop", "1", "-i", promo_img, "-vf", promo_vf, "-frames:v", str(promo_frames),
         "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-pix_fmt", "yuv420p", promo_video],
        capture_output=True, text=True, timeout=100,
    )
    if r_promo.returncode == 0:
        video_segments.append(promo_video)

    if not video_segments:
        return None, 0

    # --- Concatenar todos los segmentos de video ---
    concat_list = os.path.join(tmp_dir, "vconcat.txt")
    with open(concat_list, "w") as f:
        for seg in video_segments:
            f.write(f"file '{seg}'\n")
    video_concat = os.path.join(tmp_dir, "video_concat.mp4")
    rc = subprocess.run(
        ["ffmpeg", "-f", "concat", "-safe", "0", "-i", concat_list, "-c", "copy", "-y", video_concat],
        capture_output=True, text=True, timeout=60,
    )
    if rc.returncode != 0:
        print("  ERROR concat video:", rc.stderr[-400:])
        return None, 0

    # --- Concatenar todo el audio (intro + narraciones + promo) ---
    audio_list = os.path.join(tmp_dir, "aconcat.txt")
    with open(audio_list, "w") as f:
        for a in audio_parts:
            f.write(f"file '{a}'\n")
    voice_path = os.path.join(tmp_dir, "voice_full.mp3")
    subprocess.run(
        ["ffmpeg", "-f", "concat", "-safe", "0", "-i", audio_list, "-c:a", "libmp3lame", "-b:a", "128k", "-ar", "44100", "-y", voice_path],
        check=True, capture_output=True, text=True, timeout=60,
    )
    total_duration = get_duration(voice_path)

    # --- Mezclar con musica de fondo ---
    audio_final = os.path.join(tmp_dir, "audio_final.mp3")
    mix_cmd = [
        "ffmpeg", "-y", "-i", voice_path, "-stream_loop", "-1", "-i", bg_music_path,
        "-filter_complex",
        f"[1:a]volume=0.14,atrim=0:{total_duration}[bgt];[0:a][bgt]amix=inputs=2:duration=first:dropout_transition=0[aout]",
        "-map", "[aout]", "-c:a", "libmp3lame", "-b:a", "128k", audio_final,
    ]
    rmix = subprocess.run(mix_cmd, capture_output=True, text=True, timeout=60)
    if rmix.returncode != 0:
        print("  ERROR mezcla musica:", rmix.stderr[-300:])
        audio_final = voice_path

    # --- Combinar video + audio final + watermark ---
    output = os.path.join(tmp_dir, "newscard.mp4")
    cmd = [
        "ffmpeg", "-y", "-i", video_concat, "-loop", "1", "-i", logo_path, "-i", audio_final,
        "-filter_complex", "[1:v]scale=140:140[logos];[0:v][logos]overlay=W-w-28:36[outv]",
        "-map", "[outv]", "-map", "2:a",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
        "-c:a", "aac", "-b:a", "128k", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",  # moov atom al inicio - requerido por Instagram para leer el video via URL
        "-shortest", output,
    ]
    r2 = subprocess.run(cmd, capture_output=True, text=True, timeout=150)
    if r2.returncode != 0:
        print("  ERROR ffmpeg final:", r2.stderr[-500:])
        return None, 0

    return output, total_duration


def upload_to_r2(video_path, creds, key):
    with open(video_path, "rb") as f:
        video_data = f.read()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/r2/buckets/synapt-media/objects/{key}",
        data=video_data, method="PUT",
        headers={"X-Auth-Email": "reyezgcharlie@gmail.com", "X-Auth-Key": creds["CLOUDFLARE_GLOBAL_API_KEY"], "Content-Type": "video/mp4"},
    )
    resp = json.loads(urllib.request.urlopen(req).read())
    if not resp.get("success"):
        raise Exception("fallo subiendo a R2")
    return f"{R2_MEDIA_PUBLIC}/{key}"


def caption_text(items):
    title = items[0]["title"]
    extra = f"\n\nTambién: {items[1]['title']}" if len(items) > 1 else ""
    return f"📰 {title.upper()}{extra}\n\n{CAPTION_FOOTER}\n\n{HASHTAGS}"


def post_to_telegram(video_path, items, creds):
    bot_token = "8703293039:AAH0fhdqI9p-yEl3HGKIhcIRiLJGm6PGD8Q"
    chat_id = "-1003835663170"
    caption = caption_text(items)[:1024]
    cmd = ["curl", "-s", "-X", "POST", f"https://api.telegram.org/bot{bot_token}/sendVideo",
           "-F", f"chat_id={chat_id}", "-F", f"caption={caption}", "-F", f"video=@{video_path}"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    try:
        resp = json.loads(r.stdout)
        if resp.get("ok"):
            return True, resp["result"]["message_id"]
        print("  ❌ Telegram:", resp)
        return False, None
    except Exception as e:
        print("  ❌ Telegram parse:", e)
        return False, None


def post_to_facebook(video_path, items, creds):
    token = creds.get("FACEBOOK_PAGE_ACCESS_TOKEN", "")
    page_id = creds.get("FACEBOOK_PAGE_ID", "")
    if not token or not page_id:
        print("  ⚠️ Sin credenciales de Facebook"); return False, None
    caption = caption_text(items)
    cmd = ["curl", "-s", "-X", "POST", f"https://graph.facebook.com/v22.0/{page_id}/videos",
           "-F", f"source=@{video_path}", "-F", f"access_token={token}", "-F", "published=true"]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    try:
        resp = json.loads(result.stdout)
        if resp.get("id"):
            video_id = resp["id"]
            upd = ["curl", "-s", "-X", "POST", f"https://graph.facebook.com/v22.0/{video_id}",
                   "--data-urlencode", f"description={caption}", "--data-urlencode", f"access_token={token}"]
            subprocess.run(upd, capture_output=True, text=True, timeout=30)
            print(f"  ✅ Facebook: {video_id}")
            return True, video_id
        print("  ❌ Facebook:", resp.get("error", {}).get("message", result.stdout[:200]))
        return False, None
    except json.JSONDecodeError:
        print("  ❌ Facebook parse error:", result.stdout[:200]); return False, None


def post_to_instagram(video_url, items, creds):
    token = creds.get("INSTAGRAM_ACCESS_TOKEN", "")
    ig_id = creds.get("INSTAGRAM_BUSINESS_ID", "")
    if not token or not ig_id:
        print("  ⚠️ Sin credenciales de Instagram"); return False, None
    caption = caption_text(items)
    create_cmd = ["curl", "-s", "-X", "POST", f"https://graph.facebook.com/v22.0/{ig_id}/media",
                  "-F", "media_type=REELS", "-F", f"video_url={video_url}",
                  "--form-string", f"caption={caption}", "-F", f"access_token={token}"]
    result = subprocess.run(create_cmd, capture_output=True, text=True, timeout=30)
    try:
        resp = json.loads(result.stdout)
        if not resp.get("id"):
            print("  ❌ Instagram create:", resp.get("error", {}).get("message", result.stdout[:200])); return False, None
        container_id = resp["id"]
        finished = False
        last_status = None
        for attempt in range(18):  # hasta 18*8=144s, video con Ken Burns+subtitulos tarda mas en procesar
            time.sleep(8)
            st = subprocess.run(["curl", "-s", f"https://graph.facebook.com/v22.0/{container_id}",
                                  "-F", "fields=status_code,status", "-F", f"access_token={token}"],
                                 capture_output=True, text=True, timeout=10)
            st_resp = json.loads(st.stdout)
            last_status = st_resp
            code = st_resp.get("status_code")
            print(f"     IG poll #{attempt+1}: {code} {st_resp.get('status','')[:80]}")
            if code == "FINISHED":
                finished = True
                break
            if code == "ERROR":
                print("  ❌ Instagram procesando:", st_resp.get("status_detail") or st_resp); return False, None
        if not finished:
            print(f"  ❌ Instagram: tiempo agotado. Ultimo estado visto: {last_status}")
            return False, None
        pub = subprocess.run(["curl", "-s", "-X", "POST", f"https://graph.facebook.com/v22.0/{ig_id}/media_publish",
                               "-F", f"creation_id={container_id}", "-F", f"access_token={token}"],
                              capture_output=True, text=True, timeout=30)
        pub_resp = json.loads(pub.stdout)
        if pub_resp.get("id"):
            print(f"  ✅ Instagram: {pub_resp['id']}")
            return True, pub_resp["id"]
        print("  ❌ Instagram publish:", pub_resp.get("error", {}).get("message")); return False, None
    except json.JSONDecodeError:
        print("  ❌ Instagram parse error"); return False, None


def post_to_zernio(video_url, items, creds):
    """Publica en TikTok y YouTube via Zernio en una sola llamada."""
    zernio_key = creds.get("ZERNIO_API_KEY", "")
    tiktok_id = creds.get("ZERNIO_TIKTOK_ACCOUNT_ID", "")
    youtube_id = creds.get("ZERNIO_YOUTUBE_ACCOUNT_ID", "")
    if not zernio_key:
        print("  ⚠️ Sin ZERNIO_API_KEY"); return {}
    caption = caption_text(items)
    platforms = []
    if tiktok_id:
        platforms.append({"platform": "tiktok", "accountId": tiktok_id})
    if youtube_id:
        platforms.append({"platform": "youtube", "accountId": youtube_id})
    if not platforms:
        print("  ⚠️ Sin cuentas TikTok/YouTube en Zernio"); return {}

    post_body = {
        "content": caption,
        "mediaItems": [{"type": "video", "url": video_url}],
        "platforms": platforms,
        "tiktokSettings": {
            "privacy_level": "PUBLIC_TO_EVERYONE", "allow_comment": True,
            "allow_duet": True, "allow_stitch": True,
            "content_preview_confirmed": True, "express_consent_given": True,
        },
        "youtubeSettings": {
            "title": items[0]["title"][:95],
            "description": caption[:4900],
            "privacyStatus": "public",
            "madeForKids": False,
        },
        "publishNow": True,
    }
    body = json.dumps(post_body).encode()
    req = urllib.request.Request("https://api.zernio.com/v1/posts", data=body,
                                  headers={"Authorization": f"Bearer {zernio_key}", "Content-Type": "application/json"},
                                  method="POST")
    try:
        resp = json.loads(urllib.request.urlopen(req).read())
        post_id = resp.get("post", {}).get("_id", "")
        if post_id:
            print(f"  ✅ Zernio (TikTok+YouTube): {post_id}")
            return {"tiktok": post_id, "youtube": post_id}
        print("  ❌ Zernio:", resp.get("error", str(resp)[:200])); return {}
    except urllib.error.HTTPError as e:
        print(f"  ❌ Zernio HTTP {e.code}:", e.read().decode()[:300]); return {}


def save_record(items, video_key, ids, creds):
    body = json.dumps({
        "sql": ("INSERT INTO newscards (title, title2, source, video_key, telegram_msg_id, "
                "social_fb, social_tt, social_ig, social_yt, posted_at) VALUES (?,?,?,?,?,?,?,?,?,?)"),
        "params": [
            items[0]["title"], items[1]["title"] if len(items) > 1 else None, items[0]["source"],
            video_key, str(ids.get("telegram") or ""), str(ids.get("fb") or ""),
            str(ids.get("tiktok") or ""), str(ids.get("ig") or ""), str(ids.get("youtube") or ""),
            datetime.now(timezone.utc).isoformat(),
        ],
    }).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB_ID}/query",
        data=body, method="POST",
        headers={"X-Auth-Email": "reyezgcharlie@gmail.com", "X-Auth-Key": creds["CLOUDFLARE_GLOBAL_API_KEY"], "Content-Type": "application/json"},
    )
    urllib.request.urlopen(req)


def main():
    print(f"🎬 INFOAMERICA Newscard Generator v4 — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    creds = load_creds()
    ensure_table(creds)
    existing = get_recent_titles(creds)
    print(f"   Newscards existentes (recientes): {len(existing)}")

    all_items = []
    for name, url, ftype in RSS_FEEDS:
        xml = fetch_rss(url)
        if not xml:
            continue
        items = parse_items(xml, name, ftype == "google")
        fresh = [it for it in items if it["title"].lower().strip()[:60] not in existing and it["image"]]
        print(f"   {name}: {len(items)} items, {len(fresh)} nuevos con imagen")
        all_items.extend(fresh)

    if not all_items:
        print("Sin novedades con imagen disponible.")
        return

    made = 0
    idx = 0
    for _ in range(MAX_CARDS):
        if idx >= len(all_items):
            break
        item1 = all_items[idx]; idx += 1
        key1 = item1["title"].lower().strip()[:60]
        if key1 in existing:
            continue
        existing.add(key1)

        # Enfoque de UNA sola noticia con profundidad real (mejor retencion = mejor monetizacion).
        # Se intenta traer el articulo completo; si sigue sin llegar al minuto, se SALTA
        # esta noticia (no se rellena ni se combina con otra distinta).
        print(f"\n🔎 Evaluando: {item1['title'][:70]}")
        full_text = fetch_full_article(item1.get("link", ""))
        if full_text:
            item1["full_body"] = full_text
            est_chars = len(item1["title"]) + len(full_text[:2200])
        else:
            d1 = (item1["description"] or "").strip()
            item1["full_body"] = d1 if (d1 and d1.lower() != item1["title"].strip().lower()) else ""
            est_chars = len(item1["title"]) + len(item1["full_body"])
        est_seconds = est_chars / 14.5  # ~14.5 caracteres/seg en voz natural es-MX

        if est_seconds < MIN_SECONDS_SINGLE:
            print(f"   ⏭️  Contenido insuficiente para 1min+ ({est_seconds:.0f}s estimados), se salta esta noticia")
            continue

        chosen = [item1]
        print(f"🎙 Generando newscard ({est_seconds:.0f}s estimados): {item1['title'][:70]}")
        with tempfile.TemporaryDirectory() as tmp:
            video_path, duration = generate_video(chosen, creds, tmp)
            if not video_path:
                continue
            print(f"   Duración final: {duration:.0f}s")

            video_key = f"newscards/{int(time.time())}.mp4"
            video_url = None
            try:
                video_url = upload_to_r2(video_path, creds, video_key)
                print(f"   Subido a R2: {video_url}")
            except Exception as e:
                print("   ERROR subiendo a R2:", e)

            ids = {}
            ok_tg, msg_id = post_to_telegram(video_path, chosen, creds)
            if ok_tg:
                ids["telegram"] = msg_id
                print(f"  ✅ Telegram: {msg_id}")

            ok_fb, fb_id = post_to_facebook(video_path, chosen, creds)
            if ok_fb:
                ids["fb"] = fb_id

            if video_url:
                ok_ig, ig_id = post_to_instagram(video_url, chosen, creds)
                if ok_ig:
                    ids["ig"] = ig_id
                zresult = post_to_zernio(video_url, chosen, creds)
                ids.update(zresult)

            save_record(chosen, video_key, ids, creds)
            if ids:
                made += 1

    print(f"\n✅ {made} newscards publicadas ({', '.join(sorted(set(k for k in ['telegram','fb','ig','tiktok','youtube'])))})")


if __name__ == "__main__":
    main()
