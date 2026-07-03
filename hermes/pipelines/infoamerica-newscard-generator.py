#!/usr/bin/env python3
"""
INFOAMERICA Newscard Generator — video vertical 1080x1920 con:
  imagen de noticia + narración en voz natural + título grande estilo noticiero clásico
Diseñado por Claude para SYNAPT Network | 2026-07-02
Reutiliza: mismas fuentes RSS gratis del podcast, misma voz edge-tts (gratis, ilimitada).
Corre independiente del pipeline de episodios — no toca la tabla `episodes`.
"""
import html, json, os, re, subprocess, sys, tempfile, textwrap, urllib.request
from datetime import datetime, timezone

CF_ACCOUNT = "9cd06a9cb40a471bc7a2adb149d1df5a"
D1_DB_ID = "0f5b7816-8fd3-437e-acaf-98322cad2d1a"
R2_PUBLIC = "https://pub-f72a1045793847688e3debefd7b7d7b7.r2.dev"
LOGO_URL = f"{R2_PUBLIC}/Webtools/file_000000000b6c71f58ab933c4beb14b43.png"
VOICE = "es-MX-DaliaNeural"
MAX_CARDS = 2  # por ejecución, para no saturar cuota diaria de plataformas
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

RSS_FEEDS = [
    ("El Universal MX", "https://www.eluniversal.com.mx/arc/outboundfeeds/rss/", "rss"),
    ("BBC Mundo", "https://feeds.bbci.co.uk/mundo/rss.xml", "rss"),
    ("El País", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", "rss"),
    ("Google News MX", "https://news.google.com/rss?hl=es-419&gl=MX&ceid=MX:es-419", "google"),
    ("Google News Latino", "https://news.google.com/rss?hl=es-419&gl=US&ceid=US:es-419", "google"),
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
        img_m = re.search(r'<media:content[^>]*url="([^"]+)"', block) or re.search(r'<enclosure[^>]*url="([^"]+)"', block)
        title = html.unescape(re.sub(r"<[^>]+>", "", title_m.group(1))).strip() if title_m else ""
        desc = html.unescape(re.sub(r"<[^>]+>", "", desc_m.group(1))).strip() if desc_m else ""
        img = img_m.group(1) if img_m else ""
        if is_google:
            title = re.sub(r"\s*-\s*[^-]+$", "", title)  # quitar " - Fuente" que agrega Google News
        if title and len(title) > 15:
            items.append({"title": title, "description": desc or title, "image": img, "source": source_name})
    return items


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
        return set()  # tabla puede no existir aún, se crea en ensure_table()


def ensure_table(creds):
    body = json.dumps({"sql": (
        "CREATE TABLE IF NOT EXISTS newscards ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, source TEXT, "
        "video_key TEXT, telegram_msg_id TEXT, posted_at TEXT)"
    )}).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB_ID}/query",
        data=body, method="POST",
        headers={"X-Auth-Email": "reyezgcharlie@gmail.com", "X-Auth-Key": creds["CLOUDFLARE_GLOBAL_API_KEY"], "Content-Type": "application/json"},
    )
    urllib.request.urlopen(req)


def wrap_title(title, width_chars=18):
    """Parte el título en líneas cortas para que el texto grande no se salga de pantalla."""
    return "\n".join(textwrap.wrap(title[:110], width=width_chars))


def generate_video(item, creds, tmp_dir):
    """Video vertical 1080x1920, estilo noticiero clásico: banda negra inferior, texto blanco grande, acento rojo."""
    img_path = os.path.join(tmp_dir, "bg.jpg")
    try:
        subprocess.run(["curl", "-sL", "-o", img_path, item["image"]], check=True, timeout=15)
        chk = subprocess.run(["ffprobe", "-v", "error", img_path], capture_output=True, timeout=5)
        if chk.returncode != 0 or os.path.getsize(img_path) < 500:
            raise Exception("imagen inválida")
    except Exception:
        subprocess.run(["curl", "-sL", "-o", img_path, LOGO_URL], check=True, timeout=10)

    logo_path = os.path.join(tmp_dir, "logo.png")
    subprocess.run(["curl", "-sL", "-o", logo_path, LOGO_URL], check=True, timeout=10)

    # TTS: narra el título + primera parte de la descripción, voz natural gratis
    narration = f"{item['title']}. {item['description'][:220]}"
    narration = re.sub(r"<[^>]+>", "", narration)
    tts_path = os.path.join(tmp_dir, "tts.mp3")
    subprocess.run(
        ["edge-tts", "--voice", VOICE, "--text", narration, "--write-media", tts_path],
        check=True, capture_output=True, text=True,
    )

    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tts_path],
        capture_output=True, text=True,
    )
    duration = float(dur.stdout.strip())

    title_wrapped = wrap_title(item["title"])
    title_file = os.path.join(tmp_dir, "title.txt")
    with open(title_file, "w") as f:
        f.write(title_wrapped)

    output = os.path.join(tmp_dir, "newscard.mp4")

    # Paso 1: imagen 1080x1920 real (no cuadrada) + banda negra inferior + título GRANDE + barra roja de acento
    video_no_audio = os.path.join(tmp_dir, "v0.mp4")
    vf = (
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
        # banda negra semitransparente cubriendo el tercio inferior
        "drawbox=x=0:y=1330:w=1080:h=590:color=black@0.72:t=fill,"
        # barra roja de acento justo arriba de la banda
        "drawbox=x=0:y=1322:w=1080:h=8:color=red@0.95:t=fill,"
        # título grande, blanco, centrado, multilinea
        f"drawtext=textfile={title_file}:fontfile={FONT_BOLD}:"
        "fontsize=64:fontcolor=white:x=(w-text_w)/2:y=1400:line_spacing=14:"
        "text_align=center,"
        # etiqueta de marca en rojo, arriba de la banda de titulo
        "drawtext=text='INFOAMERICA.PRESS':fontfile=" + FONT_BOLD + ":"
        "fontsize=34:fontcolor=red:x=(w-text_w)/2:y=1350"
    )
    step1 = [
        "ffmpeg", "-y", "-loop", "1", "-i", img_path,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p",
        "-t", str(int(duration) + 1),
        video_no_audio,
    ]
    r1 = subprocess.run(step1, capture_output=True, text=True, timeout=120)
    if r1.returncode != 0:
        print("  ERROR ffmpeg paso1:", r1.stderr[-500:])
        return None, 0

    # Paso 2: logo + audio
    cmd = [
        "ffmpeg", "-y",
        "-i", video_no_audio, "-loop", "1", "-i", logo_path, "-i", tts_path,
        "-filter_complex", "[1:v]scale=90:90[logos];[0:v][logos]overlay=W-w-24:40[outv]",
        "-map", "[outv]", "-map", "2:a",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
        "-c:a", "aac", "-b:a", "128k", "-pix_fmt", "yuv420p",
        "-shortest", output,
    ]
    r2 = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if r2.returncode != 0:
        print("  ERROR ffmpeg paso2:", r2.stderr[-500:])
        return None, 0

    return output, duration


def post_to_telegram(video_path, item, creds):
    # Bot y canal del proyecto SYNAPT (fijo, no se toma del .env de Hermes para evitar
    # confundirse con el bot interno del propio agente Hermes, que es uno distinto).
    bot_token = "8703293039:AAH0fhdqI9p-yEl3HGKIhcIRiLJGm6PGD8Q"
    chat_id = "-1003835663170"
    if not bot_token or not chat_id:
        print("  ERROR: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en .env")
        return False, None
    caption = f"📰 {item['title'][:200]}\n\nFuente: {item['source']}"
    cmd = [
        "curl", "-s", "-X", "POST",
        f"https://api.telegram.org/bot{bot_token}/sendVideo",
        "-F", f"chat_id={chat_id}",
        "-F", f"caption={caption}",
        "-F", f"video=@{video_path}",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    try:
        resp = json.loads(r.stdout)
        if resp.get("ok"):
            msg_id = resp["result"]["message_id"]
            print(f"  ✅ Publicado en Telegram (msg_id {msg_id})")
            return True, msg_id
        print("  ERROR Telegram:", resp)
        return False, None
    except Exception as e:
        print("  ERROR parseando respuesta Telegram:", e, r.stdout[:300])
        return False, None


def save_record(item, video_key, telegram_msg_id, creds):
    body = json.dumps({
        "sql": "INSERT INTO newscards (title, source, video_key, telegram_msg_id, posted_at) VALUES (?, ?, ?, ?, ?)",
        "params": [item["title"], item["source"], video_key, str(telegram_msg_id or ""), datetime.now(timezone.utc).isoformat()],
    }).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/d1/database/{D1_DB_ID}/query",
        data=body, method="POST",
        headers={"X-Auth-Email": "reyezgcharlie@gmail.com", "X-Auth-Key": creds["CLOUDFLARE_GLOBAL_API_KEY"], "Content-Type": "application/json"},
    )
    urllib.request.urlopen(req)


def main():
    print(f"🎬 INFOAMERICA Newscard Generator — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
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
    for item in all_items[:MAX_CARDS]:
        key = item["title"].lower().strip()[:60]
        if key in existing:
            continue
        existing.add(key)
        print(f"\n🎙 Generando newscard: {item['title'][:70]}")
        with tempfile.TemporaryDirectory() as tmp:
            video_path, duration = generate_video(item, creds, tmp)
            if not video_path:
                continue
            ok, msg_id = post_to_telegram(video_path, item, creds)
            save_record(item, os.path.basename(video_path), msg_id, creds)
            if ok:
                made += 1

    print(f"\n✅ {made} newscards publicadas en Telegram")


if __name__ == "__main__":
    main()
