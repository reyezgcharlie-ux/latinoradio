# HERMES BRIDGE PROTOCOL v3 — Claude ↔ Hermes en tiempo real
Autor: Claude | 2026-07-02 | Transporte: HTTP sobre puente n8n (Oracle→Hetzner:9999)

## Filosofía
Esto NO es shell remoto. Es un catálogo cerrado de comandos seguros, cada uno una
función explícita en hermes_server.py. El token da acceso a ESE catálogo, no a la
máquina. Comandos con efectos secundarios exigen `confirm:true` explícito.

## Endpoints (servidor de Hermes, puerto 9999)
GET  /          → health + lista de comandos disponibles
POST /cmd        → ejecutar comando (síncrono o asíncrono según el comando)
GET  /job/{id}   → estado/resultado de un job asíncrono

## Formato de request a /cmd
{
  "token": "SYNAPT_CLAUDE_2026_bridge",
  "cmd": "health_check",
  "params": {},
  "confirm": false
}

## Respuesta síncrona
{"ok": true, "cmd": "health_check", "result": {...}}

## Respuesta asíncrona (comandos largos, ej. run_playbook)
{"ok": true, "async": true, "job_id": "a1b2c3d4"}
→ luego: GET /job/a1b2c3d4 → {"status":"done","result":{...}} | {"status":"pending"} | {"status":"error","error":"..."}

## Catálogo de comandos v3
| cmd              | confirm requerido | qué hace |
|-------------------|:---:|---|
| health_check      | no  | uptime, disco, memoria, estado de hermes-gateway |
| disk_usage        | no  | du -sh de un path |
| service_status    | no  | systemctl status de un servicio (nombre validado con regex) |
| tail_log          | no  | últimas N líneas de un log, SOLO dentro de /var/log/, /root/hermes-knowledge/, /root/backups/ |
| list_processes    | no  | ps aux, opcionalmente filtrado |
| restart_service   | SÍ  | reinicia un servicio — SOLO whitelist {hermes-gateway} |
| run_playbook      | SÍ  | ejecuta un script predefinido de /root/hermes-knowledge/playbooks/ (async, con job_id) |
| notion_pending    | no  | placeholder — Hermes debe implementar su propia consulta a Notion |

## Cómo llamar desde Claude (vía el puente n8n)
POST https://n8n.synapt.live/webhook/claude-hermes-direct
Body: {"token":"...", "route":"cmd", "cmd":"health_check", "params":{}, "confirm":false}
(el workflow de n8n reenvía a http://46.224.96.148:9999/cmd)

## Reglas de seguridad (no negociables)
1. Ningún comando nuevo se agrega sin pasar por whitelist explícita en COMMANDS{}.
2. Nada de eval, exec, subprocess con shell=True, ni interpolación de input del usuario en comandos shell.
3. Comandos destructivos (restart_service, run_playbook) SIEMPRE requieren confirm:true.
4. Para acciones fuera de este catálogo (editar código, tocar producción, cambios de infra):
   Claude NO las pide por este puente — las hace directo con sus propias herramientas
   (n8n API, Cloudflare API, etc.) o coordina con Charlie. El puente es para OPERACIONES
   LOCALES DEL HETZNER, no para reemplazar el trabajo de ingeniería de Claude.
5. Playbooks nuevos: se agregan como archivo .sh en playbooks/, revisados antes de subir.

## Extender el catálogo (para Hermes o Claude en el futuro)
1. Escribir función cmd_nombre(params) en hermes_server.py con validación estricta de inputs.
2. Agregarla a COMMANDS{} con su flag de confirm.
3. Documentarla aquí.
4. Si tarda >5s, agregarla a LONG_RUNNING para que corra async.
