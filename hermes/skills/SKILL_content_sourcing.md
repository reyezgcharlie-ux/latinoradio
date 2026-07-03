# SKILL: Obtención de Contenido (RSS, Trends, scraping)
Fuentes 100% gratis usadas en SYNAPT, con sus trampas reales.

## Fuentes confiables (dan imagen Y texto completo)
Feeds RSS directos de medios (El Universal, Excélsior, El País, etc.) — tienen
`<media:content>`/`<enclosure>` con imagen real, y su `<link>` apunta directo
al artículo (no a un redirect), así que `fetch_full_article()` funciona bien.

## Fuentes que NO dan imagen (Google News, cualquier formato)
Ni los feeds por tema ni los de búsqueda de Google News traen imagen embebida.
Su `<link>` además es una página de REDIRECT de Google (no el artículo real) —
0 párrafos extraíbles ahí. Solo sirve para sacar `og:image` de esa página
intermedia (funciona porque Google sí pone su propio meta tag), NUNCA para
texto de artículo.

## Google Trends (tendencias de búsqueda)
RSS oficial gratis: `https://trends.google.com/trending/rss?geo=MX` (ojo, NO es
`/trends/trendingsearches/daily/rss` que es el endpoint viejo). Trae término +
`<ht:approx_traffic>`, sin imagen ni contexto — hay que buscarlo aparte.

## Patrón recomendado: cruzar tendencia con fuente propia
1. Traer tendencias de Google Trends.
2. Traer (una sola vez, no por cada tendencia) tus feeds RSS directos completos.
3. Para cada tendencia, buscar coincidencia de palabras significativas (ignorar
   artículos/preposiciones) contra los títulos ya descargados.
4. Si hay coincidencia → usas esa fuente (imagen+texto confiables).
5. Si no hay coincidencia → Google News como respaldo, SOLO para imagen
   (og:image), nunca para texto real (ver arriba). Si tampoco hay contenido
   suficiente, mejor saltar esa tendencia que publicar algo vacío o repetitivo.

## Bug de escape doble en descripciones de Google News
La `<description>` de resultados de búsqueda de Google News viene con HTML
DOBLEMENTE escapado (`&lt;a href="..."&gt;texto&lt;/a&gt;`). Si quitas
etiquetas ANTES de desescapar, las etiquetas reales sobreviven como texto
literal en el resultado. Orden correcto siempre: `html.unescape()` PRIMERO,
luego `re.sub(r"<[^>]+>","",...)`.

## Límite de intentos "lentos" en discovery
Si por cada candidata sin coincidencia directa haces una descarga de página
completa (500KB+), limita cuántas veces lo intentas por corrida (ej. máximo 4)
— si no, el discovery completo puede tardar minutos y comerse el timeout del
pipeline antes de llegar siquiera a generar el video.

## Imagen de respaldo cuando nada más funciona
Mejor un fondo de marca diseñado (logo + texto de la marca) que el logo suelto
sin contexto — se ve mucho más profesional como último recurso.
