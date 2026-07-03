# SKILL: Publicación Multi-Plataforma (límites y trucos reales)
Datos verificados en sesión 2026-07-02/03, no teoría.

## Límites reales observados (no los de la documentación oficial)
- **TikTok vía Zernio**: se agota el rate limit con volumen moderado en un día
  si varios pipelines publican a la misma cuenta. Error real: HTTP 429
  `"This account is temporarily rate-limited. Please wait Nm before posting again"`.
  El JSON de error trae `rateLimitedUntil` — respétalo, no reintentes antes.
- **Instagram Graph API**: cuota de publicación real vía
  `GET /{ig-id}/content_publishing_limit?fields=config,quota_usage` — antes de
  sospechar bloqueo de cuenta, consulta esto primero (evita diagnósticos falsos).
- **YouTube + TikTok via Zernio**: se pueden publicar EN UNA SOLA LLAMADA POST a
  `/v1/posts` con `platforms: [{platform:tiktok,accountId:X},{platform:youtube,
  accountId:Y}]` — no hace falta 2 llamadas separadas.

## Instagram: contenedor + publish (flujo de 2 pasos)
1. `POST /{ig-id}/media` con `media_type=REELS`, `video_url=<URL pública>`,
   `caption=...` → devuelve `container_id`.
2. Poll `GET /{container_id}?fields=status_code` hasta ver `FINISHED` — puede
   tardar bastante más de 40s con video complejo (Ken Burns/subtítulos). Da
   margen real de 2-3 minutos de polling, no asumas que 40s alcanza.
3. Solo si `status_code==FINISHED` confirmado, llama
   `POST /{ig-id}/media_publish` con `creation_id`. NUNCA publiques si el
   polling se agotó sin ver FINISHED — mejor reportar "no publicado" limpio
   que intentar publicar un contenedor a medio procesar.
4. Si el error es `"Object with ID ... does not exist"` en TODOS los polls
   desde el primer intento (no solo al final), sospecha que Instagram nunca
   pudo DESCARGAR el video desde tu URL — no es cuestión de tiempo de espera.
   Verifica: (a) que el bucket público responda con Content-Type video/mp4
   correcto, (b) `-movflags +faststart` en el video, (c) que la cuenta/token
   tenga scope `instagram_content_publish` (verificar con
   `graph.facebook.com/debug_token?input_token=X&access_token=X`).

## Evitar agotar cuotas cuando hay varios pipelines
Si más de un pipeline publica a las mismas cuentas (ej. pipeline de noticias +
pipeline de tendencias + pipeline de podcast), las cuotas se SUMAN entre todos,
no son independientes. Antes de bajar la frecuencia de uno solo, calcula el
volumen TOTAL diario combinado de todos los pipelines activos a esa cuenta.

## Formato de caption recomendado
Título en mayúsculas o con emoji al inicio (📰🔥) + footer de marca con links
a tus propiedades + 5 hashtags al final. No mezclar más de 5 hashtags —
diluye relevancia sin ganar alcance extra.

## Diagnóstico rápido de "no publica"
1. `debug_token` del access token — ¿is_valid true? ¿tiene el scope correcto?
2. `content_publishing_limit` (IG) o revisar respuesta 429 (Zernio) — ¿cuota
   agotada?
3. Consultar la cuenta directamente (`GET /{id}?fields=id,username`) — ¿responde
   sano, sin restricciones visibles?
4. Solo después de descartar 1-3, sospechar del video/contenido en sí.
