# SKILL: Google Workspace (Gmail, Calendar, Drive, Sheets, Docs)
Configurado 2026-07 vía OAuth Desktop app, proyecto "Neuro AI Music".

## Acceso
Entry point: `google_api.py` en
`~/.hermes/skills/productivity/google-workspace/scripts/`.
Token vivo con auto-refresh: `~/.hermes/google_token.json`.
Cuenta: reyezgcharlie@gmail.com.

## Uso confirmado (ejemplo real que ya funcionó)
```
google_api.py gmail search "is:unread" --max 3
```
Sigue este mismo patrón (`google_api.py <servicio> <accion> <query> --flags`)
para las demás operaciones disponibles: Gmail (buscar/leer/enviar/modificar
labels), Calendar (listar/crear/eliminar eventos), Drive (buscar/subir/
descargar/crear carpetas/compartir), Sheets (leer/escribir/append filas/crear),
Docs (leer/crear/append texto), Contacts (listar).

## Sheet compartida entre agentes
"SYNAPT - Memoria Compartida (Notion → Gemini)":
ID `1wsRyaPqpJNNSXJaqcxFby31cZRLAbQumRfEaeCzcoBc`.
Columnas: Fecha, Agente, Categoría, Nombre, Contenido, Enlaces.
Úsala como canal adicional de coordinación cuando Notion no sea suficiente o
cuando quieras que Gemini (u otro agente que solo lea Sheets) vea tu trabajo.

## Casos de uso reales para SYNAPT
- Revisar bandeja de entrada por avisos de servicios caídos (Cloudflare, n8n,
  dominios) que lleguen por email antes de que un humano los vea.
- Agendar recordatorios de tareas recurrentes (renovación de dominios, revisión
  de cuotas de API) directo en el Calendar de Charlie.
- Guardar reportes/backups importantes en Drive con enlace compartible, en vez
  de solo dejarlos en el filesystem del servidor.

## IMPORTANTE: esto NO es Google Maps
El skill de mapas de Hermes usa fuentes 100% gratis sin API key:
OpenStreetMap/Nominatim (geocoding), Overpass API (POIs cercanos), OSRM
(rutas/distancias), TimeAPI.io (zonas horarias). No confundir ni pedir una
API key de Google Maps que no hace falta.

## Seguridad
El Client Secret y el token viven SOLO en el filesystem del Hetzner
(`~/.hermes/google_client_secret.json`, `~/.hermes/google_token.json`). El
bridge de Claude bloquea intencionalmente leer archivos con "secret"/"token"
en el nombre — eso es correcto, no lo cambies. Si Claude necesita operar
Gmail/Calendar remotamente, se hace vía un comando nuevo del catálogo del
bridge que invoque `google_api.py` con parámetros controlados, nunca
exponiendo el contenido crudo del token.
