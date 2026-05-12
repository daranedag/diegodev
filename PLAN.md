# Plan: Precios MTGJSON en Tooltips de Recomendaciones

## Resumen
Implementar un flujo semanal que importe desde MTGJSON la impresión base no-foil de cada carta recomendada, junto con precios USD de CardKingdom y TCGPlayer cuando existan, y exponer esos datos en `analyze-deck` para mostrarlos en un tooltip al pasar el mouse o tocar el nombre de la carta en la sección de Recomendaciones.

## Cambios Principales

- Crear una tabla nueva `mtg_card_market_data` para cachear datos de mercado por carta:
  - `oracle_id`, `card_name`, `mtgjson_uuid`, `scryfall_id`
  - `image_uri`, `scryfall_uri`
  - `cardkingdom_id`, `cardkingdom_price_usd`, `cardkingdom_url`
  - `tcgplayer_product_id`, `tcgplayer_price_usd`, `tcgplayer_url`
  - `price_date`, `fetched_at`, `updated_at`
  - índice por `LOWER(card_name)` y `mtgjson_uuid`
  - lectura pública/RLS compatible con el patrón actual, escritura vía service key

- Agregar un importador `scripts/import-mtgjson-market-data.mjs`:
  - usar `AllPrintings.json` para elegir la impresión base y obtener identificadores
  - usar `AllPricesToday.json` para precios actuales no-foil
  - filtrar impresiones en inglés, paper, no digitales y con versión non-foil
  - elegir la impresión base no-foil usando la referencia MTGJSON/Scryfall cuando sea posible; si hay varias opciones, usar una impresión estable no-foil, sin optimizar por precio
  - guardar solo precios `normal/nonfoil`, ignorando foil
  - generar link de TCGPlayer con `tcgplayerProductId` cuando esté disponible
  - generar link de CardKingdom con `cardKingdomId` solo si el patrón directo queda verificado; si no, usar link de búsqueda por nombre/set
  - soportar `--dry-run`, carga de `.env`, `.insforge/project.json` y upsert por lotes como el importador de MTGTop8

- Agregar script npm:
  - `mtg:import-market`

- Extender el workflow semanal en `.github/workflows/deploy.yml`:
  - ejecutar el importador de MTGJSON una vez por semana con `INSFORGE_URL` e `INSFORGE_API_KEY`
  - mantener opción manual vía `workflow_dispatch`
  - correr el importador después del flujo de meta para que ambos datasets queden frescos

## Backend y API

- Extender `analyze-deck` para consultar `mtg_card_market_data` después de calcular las recomendaciones.
- Agregar a cada recomendación un campo opcional:

```ts
market_data?: {
  card_name: string
  image_uri?: string
  scryfall_uri?: string
  cardkingdom_price_usd?: number
  cardkingdom_url?: string
  tcgplayer_price_usd?: number
  tcgplayer_url?: string
  price_date?: string
  is_base_nonfoil: true
} | null
```

- Matchear por nombre de carta de forma case-insensitive.
- No hacer llamadas externas en tiempo real desde `analyze-deck`; solo leer datos cacheados.
- Si no hay datos importados, devolver `market_data: null` y mantener funcionando el análisis.
- Subir `ANALYSIS_CACHE_VERSION` para evitar respuestas antiguas sin datos de mercado.

## Frontend

- En `AnalysisPanel.jsx`, convertir el nombre de cada carta recomendada en un objetivo de tooltip accesible.
- El tooltip debe mostrar:
  - imagen de la carta base no-foil en inglés
  - precio CardKingdom en USD y link, si existe
  - precio TCGPlayer en USD y link, si existe
  - fecha del precio/importación
  - fallback claro: “Sin datos de mercado todavía”
- Soportar hover en desktop y click/tap en mobile.
- Reutilizar el estilo visual de tooltips existente, evitando que el tooltip rompa el acordeón o genere scroll horizontal.
- Agregar textos nuevos a `src/locales/es.json` y `src/locales/en.json`.

## Pruebas

- Validar sintaxis del importador:
  - `node --check scripts/import-mtgjson-market-data.mjs`
- Ejecutar importador en modo dry-run y confirmar que selecciona una impresión base no-foil.
- Aplicar migración en InsForge local/remoto y correr importador real.
- Verificar filas para cartas conocidas como `Temple Garden`, `Ethereal Armor` y `Optimistic Scavenger`.
- Ejecutar:
  - `npm run build`
- Probar `analyze-deck` con un deck que genere recomendaciones y confirmar que la respuesta incluye `market_data`.
- Probar visualmente la sección Recomendaciones:
  - tooltip con imagen
  - precios separados por tienda
  - links abren CardKingdom/TCGPlayer
  - fallback cuando falten precios

## Supuestos Cerrados

- La actualización de precios será semanal.
- La impresión usada será siempre base no-foil, no la más barata ni la más cara.
- MTGJSON será la fuente de precios; el frontend no consultará APIs externas.
- CardKingdom puede requerir fallback a link de búsqueda si el `cardKingdomId` no permite construir una URL directa confiable.
- Los precios se mostrarán solo en USD.
