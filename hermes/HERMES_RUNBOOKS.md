# HERMES RUNBOOKS v1 — Comandos operativos exactos (Claude, 2026-07-01)
# Convención: los secretos se leen de variables de entorno del servicio (nunca hardcodeados).
# Variables esperadas en el systemd de Hermes: $N8N_API_KEY, $NOTION_TOKEN, $TELEGRAM_BOT_TOKEN, $TELEGRAM_CHAT_ID
# Si una variable falta, pídela a Charlie — NO la inventes ni la busques en archivos del sistema.

## R1 — LEER MEMORIA COMPARTIDA (inicio de toda tarea)
curl -s -X POST "https://api.notion.com/v1/databases/a048cbe4-ce68-46fc-9133-d6a6c702dc40/query" \
 -H "Authorization: Bearer $NOTION_TOKEN" -H "Notion-Version: 2022-06-28" -H "Content-Type: application/json" \
 -d '{"sorts":[{"property":"Fecha","direction":"descending"}],"page_size":10}'
# Lee Name + Contenido de cada resultado. Busca: qué está pausado, qué hizo otro agente, pendientes.

## R2 — ESCRIBIR EN MEMORIA COMPARTIDA (fin de toda tarea)
curl -s -X POST "https://api.notion.com/v1/pages" \
 -H "Authorization: Bearer $NOTION_TOKEN" -H "Notion-Version: 2022-06-28" -H "Content-Type: application/json" \
 -d '{"parent":{"database_id":"a048cbe4-ce68-46fc-9133-d6a6c702dc40"},"properties":{
  "Name":{"title":[{"text":{"content":"TITULO_CORTO"}}]},
  "Agente":{"select":{"name":"Hermes"}},
  "Categoria":{"select":{"name":"Workflow"}},
  "Fecha":{"date":{"start":"YYYY-MM-DD"}},
  "Contenido":{"rich_text":[{"text":{"content":"ÉXITO: ... ERRORES: ... PRÓXIMOS PASOS: ..."}}]}}}'
# Contenido máx 2000 caracteres. Categoria: Config|Nota|Workflow|Contenido.

## R3 — INVENTARIO DE WORKFLOWS n8n
curl -s "https://n8n.synapt.live/api/v1/workflows?limit=100" -H "X-N8N-API-KEY: $N8N_API_KEY"
# Campos clave por workflow: id, name, active, updatedAt (updatedAt reciente = alguien lo tocó).

## R4 — DIAGNÓSTICO DE UN WORKFLOW QUE FALLA
# a) últimas ejecuciones con error:
curl -s "https://n8n.synapt.live/api/v1/executions?workflowId=WID&status=error&limit=3" -H "X-N8N-API-KEY: $N8N_API_KEY"
# b) detalle de la ejecución (nodo exacto + datos):
curl -s "https://n8n.synapt.live/api/v1/executions/EID?includeData=true" -H "X-N8N-API-KEY: $N8N_API_KEY"
# Busca: resultData.lastNodeExecuted y resultData.error.message. Luego inspecciona el INPUT de ese nodo.
# c) verificar cadencia real (Schedule Trigger miente en la UI):
curl -s "https://n8n.synapt.live/api/v1/executions?workflowId=WID&limit=10" -H "X-N8N-API-KEY: $N8N_API_KEY"
# Compara startedAt consecutivos: esa es la frecuencia REAL.

## R5 — PAUSAR / REACTIVAR (contención de daño)
curl -s -X POST "https://n8n.synapt.live/api/v1/workflows/WID/deactivate" -H "X-N8N-API-KEY: $N8N_API_KEY"
curl -s -X POST "https://n8n.synapt.live/api/v1/workflows/WID/activate" -H "X-N8N-API-KEY: $N8N_API_KEY"
# SIEMPRE verificar después con R3 (active:true/false). El JSON de respuesta puede romper parsers estrictos
# (caracteres de control): usa json.loads(x, strict=False) en Python o simplemente verifica con el GET.

## R6 — BACKUP ANTES DE EDITAR (obligatorio)
curl -s "https://n8n.synapt.live/api/v1/workflows/WID" -H "X-N8N-API-KEY: $N8N_API_KEY" > /root/backups/WID_$(date +%s).json
# El PUT de vuelta de ese archivo ES tu rollback. Recuerda: PUT exige objeto completo.

## R7 — HEALTH CHECK DE LOS 5 SITIOS
for s in synapt.live elfilme.com synfm.online infoamerica.press inventario.rest; do
  echo "$s -> $(curl -s -o /dev/null -w '%{http_code} %{time_total}s' -m 15 https://$s)"; done
# 200 y <3s = sano. 5xx o timeout en synapt.live/n8n = probablemente Oracle/tunnel (avisar a Charlie, no arreglar tú).

## R8 — VERIFICAR FRESCURA DE CONTENIDO (¿los workflows están produciendo?)
curl -s "https://synapt.live/api/news" | head -c 500          # ¿el artículo más nuevo es de hoy?
curl -s "https://inventario.rest/api/deals" | head -c 500      # ¿hay ofertas recientes? (recuerda: Apify pausado desde 2026-07-01)
# Salud = trabajo reciente, no ausencia de errores.

## R9 — VALIDAR TOKENS (primera hipótesis ante 401)
curl -s "https://graph.facebook.com/v18.0/me?access_token=$FB_PAGE_TOKEN" | head -c 300   # nombre de la página = vivo
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe" | head -c 300              # ok:true = vivo
# Antes de culpar al token: verifica su LONGITUD (truncado = 401 silencioso).

## R10 — ALERTAR A CHARLIE
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
 -d chat_id="$TELEGRAM_CHAT_ID" -d text="[HERMES] mensaje"
# Úsalo para: nivel 1-2 de prioridad detectado, tarea escalada por regla de 30 min, o confirmación de acción destructiva.

## R11 — PROBAR UN LLM CALL AISLADO (patrón Groq con validación)
curl -s -m 60 "https://api.groq.com/openai/v1/chat/completions" -H "Authorization: Bearer $GROQ_API_KEY" \
 -H "Content-Type: application/json" -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"Responde SOLO con JSON sin markdown: {\"ok\":true}"}]}'
# Al parsear la respuesta de cualquier LLM: strip de ```json y ```, trim, try/catch, valida esquema.

## R12 — ESTADO PAUSADO ACTUAL (actualizado 2026-07-01)
# Apify expirado → pausados: 5NhlNVqDc8O8o3lB (Amazon), 2ZhvsUYKDmaSGH0n (Target), Nnx8GtPUrzOau2Go (eBay), SQROpsisSr57xLjj (Walmart).
# Activo y alimentando inventario.rest: MmCdJxZA8WBM0Ogb (DealNews+Slickdeals).
# NO reactives los 4 sin confirmar con Charlie que el token nuevo de Apify ya está en las credenciales de n8n.
