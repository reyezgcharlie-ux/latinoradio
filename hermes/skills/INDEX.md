# ÍNDICE DE SKILLS DE HERMES
Consulta el archivo relevante ANTES de actuar en ese dominio — no improvises
sobre algo que ya está documentado con evidencia real de bugs encontrados.

| Skill | Cuándo consultarlo |
|---|---|
| SKILL_video_production.md | Antes de tocar cualquier pipeline de imagen+voz+título (ffmpeg, edge-tts, duración, subtítulos) |
| SKILL_social_platforms.md | Antes de publicar o depurar fallos en Telegram/FB/IG/TikTok/YouTube |
| SKILL_content_sourcing.md | Antes de construir/tocar cualquier fuente de RSS, Google Trends, o scraping de artículos |
| SKILL_google_workspace.md | Antes de usar Gmail/Calendar/Drive/Sheets/Docs |
| SKILL_monetization.md | Al proponer o priorizar nuevas funciones — para alinear con lo que realmente genera ingreso |
| SKILL_infra_recovery.md | Ante cualquier problema de firewall, servicio caído, o timeout |

Todos viven en /root/hermes-knowledge/skills/. Complementan (no reemplazan)
HERMES_KNOWLEDGE.md (metodología general) y BRIDGE_PROTOCOL.md (protocolo de
comandos). Si encuentras un bug nuevo en un dominio ya cubierto por un skill,
AGRÉGALO a ese archivo (vía write_file con backup automático) en vez de crear
uno paralelo — mantén el conocimiento consolidado, no fragmentado.
