# SKILL: Producción de Video Automatizado (imagen+voz+título)
Destilado de bugs reales encontrados y arreglados en sesión 2026-07-02/03.

## Stack probado y gratis
ffmpeg (local) + edge-tts (voz natural, sin límite de duración real, solo depende
del texto que le pases) + fuentes RSS/artículo real. Cero costo por video.

## Errores reales ya resueltos (no los repitas)
1. **Título duplicado en narración**: si `description` viene vacía o es igual al
   título, NO la uses como relleno — genera "título. título." Usa: `if not desc
   or desc==title: narration=title_only`.
2. **Imagen reemplazada por logo sin razón real**: si una URL de imagen viene con
   `&amp;` en vez de `&` (común en RSS con parámetros firmados tipo `?auth=...`),
   el `&amp;` literal ROMPE la firma → 403 de Akamai/CDN. SIEMPRE `html.unescape()`
   la URL de imagen, igual que haces con título/descripción. Verifica con curl
   directo antes de asumir que es "bloqueo anti-hotlink".
3. **Google News RSS nunca trae imágenes embebidas** (ni `<media:content>` ni
   `<enclosure>`). Si necesitas foto de una búsqueda/tendencia de Google News,
   visita la página del artículo (siguiendo el `<link>`) y extrae
   `<meta property="og:image" content="...">` — casi todo sitio moderno lo tiene.
   Imágenes servidas por `googleusercontent.com` aceptan pedir mayor resolución
   cambiando el sufijo `=s0-wN` por un número más grande (ej `=s0-w1080`).
4. **Links de Google News son redirects sin contenido real**: la página que
   devuelve `news.google.com/rss/articles/...` NO tiene `<p>` de artículo real
   (0 párrafos extraíbles) — solo sirve para sacar `og:image`. Para TEXTO real,
   cruza el término contra tus fuentes RSS directas propias (que sí dan artículo
   completo) en vez de depender de Google News para el cuerpo.
5. **`-movflags +faststart` en el comando final de ffmpeg**: sin esto, algunos
   consumidores de video por URL (no todos) pueden fallar al leer el archivo
   porque el moov atom queda al final. Inclúyelo siempre en el paso final.
6. **Loop que se rinde en el primer candidato**: si generas contenido evaluando
   varias fuentes y una no alcanza el mínimo de duración/calidad, NO termines la
   corrida — sigue con la siguiente candidata. Usa `while intentos<max and
   idx<len(candidatas)`, nunca `for _ in range(max)` con `continue` adentro (eso
   solo salta la iteración actual, no prueba una candidata nueva si max=1).

## Duración de narración (edge-tts, es-MX)
~14-15 caracteres por segundo de habla natural. Para 60s+ necesitas ~900-1300
caracteres reales de contenido (no relleno, no HTML mal escapado). Para audios
muy largos (5+ min, tipo debate), no uses una sola llamada gigante: genera un
archivo TTS por intervención/párrafo y concaténalos con
`ffmpeg -f concat -safe 0 -i list.txt -c:a libmp3lame -b:a 128k -ar 44100`.
NUNCA uses `-c copy` en el concat si los bitrates no son idénticos, se rompe.

## Timeout de scripts largos
Un pipeline RSS→TTS→video→multi-plataforma real tarda 2-7 minutos. Si tu
scheduler/wrapper tiene timeout por defecto de 120s, es demasiado bajo —
súbelo a 400-500s como mínimo para este tipo de trabajo.

## Checklist antes de dar por bueno un pipeline nuevo
- [ ] Verificar con curl directo que la imagen final descarga como imagen real
      (`file` la reconoce como JPEG/PNG), no como HTML de error.
- [ ] Imprimir la longitud real de la narración justo antes de llamar a TTS
      (no confiar en una estimación previa sin verificar).
- [ ] Confirmar que la duración final del video coincide con lo estimado —
      si no coincide, hay un bug en la construcción del texto, no en TTS.
