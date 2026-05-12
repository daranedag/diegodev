import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createClient } from '@insforge/sdk';

const MTGJSON_IDENTIFIERS_URL =
    process.env.MTGJSON_IDENTIFIERS_URL ?? 'https://mtgjson.com/api/v5/AllIdentifiers.json.gz';
const MTGJSON_PRICES_URL =
    process.env.MTGJSON_PRICES_URL ?? 'https://mtgjson.com/api/v5/AllPricesToday.json.gz';
const UPSERT_CHUNK_SIZE = Number(process.env.MTGJSON_MARKET_UPSERT_CHUNK_SIZE ?? 500);
const CARD_PAGE_SIZE = Number(process.env.MTGJSON_MARKET_CARD_PAGE_SIZE ?? 1000);
const DRY_RUN = process.argv.includes('--dry-run');

function loadDotEnv() {
    const envPath = resolve(process.cwd(), '.env');
    if (!existsSync(envPath)) return;

    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) continue;

        const [, key, rawValue] = match;
        if (process.env[key] != null) continue;
        process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
    }
}

function readLocalProjectConfig() {
    const projectPath = resolve(process.cwd(), '.insforge', 'project.json');
    if (!existsSync(projectPath)) return {};
    try {
        return JSON.parse(readFileSync(projectPath, 'utf8'));
    } catch {
        return {};
    }
}

function requireEnv(name, fallbackName) {
    const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
    if (!value && !DRY_RUN) throw new Error(`Missing required env var: ${name}`);
    return value;
}

function normalizeUuid(value) {
    if (!value) return null;
    return String(value).trim().toLowerCase();
}

function normalizeOracleId(value) {
    return normalizeUuid(value);
}

function toIsoDateOrNull(value) {
    if (!value) return null;
    const normalized = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function cardIsPaper(card) {
    if (!Array.isArray(card.availability) || card.availability.length === 0) return true;
    return card.availability.includes('paper');
}

function cardLooksNonFoil(card) {
    if (Array.isArray(card.finishes) && card.finishes.length > 0) {
        return card.finishes.includes('nonfoil');
    }
    return Boolean(card.nonfoil_uuid);
}

function bestDate(a, b) {
    if (!a) return b ?? null;
    if (!b) return a;
    return a > b ? a : b;
}

function extractLatestPriceFromPoints(points) {
    if (!points) return { price: null, date: null };
    if (typeof points === 'number' && Number.isFinite(points)) return { price: points, date: null };
    if (typeof points !== 'object') return { price: null, date: null };

    let latestDate = null;
    let latestPrice = null;
    for (const [date, value] of Object.entries(points)) {
        if (!Number.isFinite(value)) continue;
        const iso = toIsoDateOrNull(date);
        if (!iso) continue;
        if (!latestDate || iso > latestDate) {
            latestDate = iso;
            latestPrice = value;
        }
    }

    if (latestPrice == null) return { price: null, date: null };
    return { price: latestPrice, date: latestDate };
}

function extractProviderPrice(providerData) {
    if (!providerData || typeof providerData !== 'object') return { price: null, date: null };

    // MTGJSON v5 shape: retail.normal -> { "YYYY-MM-DD": number }
    const retail = providerData.retail ?? providerData;
    const normalPoints = retail?.normal ?? retail?.nonfoil ?? null;
    if (normalPoints) {
        return extractLatestPriceFromPoints(normalPoints);
    }

    // Conservative fallback for unexpected payloads.
    return { price: null, date: null };
}

async function fetchJsonPayload(url, label) {
    console.log(`Downloading ${label}: ${url}`);
    const response = await fetch(url, {
        headers: {
            'user-agent': 'diegodev-mtg-agent/1.0 (+github actions)',
            accept: 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to download ${label}. HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    let text;
    try {
        text = gunzipSync(buffer).toString('utf8');
    } catch {
        text = buffer.toString('utf8');
    }

    const payload = JSON.parse(text);
    if (payload?.data != null) return payload;
    return { data: payload, meta: null };
}

function extractIdentifiers(entry) {
    if (!entry || typeof entry !== 'object') return null;
    if (entry.identifiers && typeof entry.identifiers === 'object') return entry.identifiers;
    return entry;
}

function buildIdentifierCard(uuid, card, fallbackReleaseDate = null) {
    const identifiers = extractIdentifiers(card);
    if (!identifiers) return null;

    const oracleId = normalizeOracleId(identifiers.scryfallOracleId);
    if (!oracleId) return null;

    const normalizedUuid = normalizeUuid(uuid ?? card.uuid ?? identifiers.mtgjsonNonFoilVersionId);
    if (!normalizedUuid) return null;

    const purchaseUrls = card.purchaseUrls && typeof card.purchaseUrls === 'object'
        ? card.purchaseUrls
        : {};

    return {
        uuid: normalizedUuid,
        oracle_id: oracleId,
        scryfall_id: normalizeUuid(identifiers.scryfallId),
        cardkingdom_id: identifiers.cardKingdomId ? String(identifiers.cardKingdomId) : null,
        tcgplayer_product_id: identifiers.tcgplayerProductId ? String(identifiers.tcgplayerProductId) : null,
        nonfoil_uuid: normalizeUuid(identifiers.mtgjsonNonFoilVersionId),
        language: card.language ?? null,
        availability: Array.isArray(card.availability) ? card.availability : [],
        finishes: Array.isArray(card.finishes) ? card.finishes : [],
        release_date: toIsoDateOrNull(card.releaseDate) ?? fallbackReleaseDate,
        card_name: card.name ?? null,
        purchase_urls: {
            cardkingdom: purchaseUrls.cardKingdom ?? null,
            tcgplayer: purchaseUrls.tcgplayer ?? null,
        },
    };
}

function buildIdentifierIndexes(allIdentifiersData) {
    const byOracle = new Map();
    const byUuid = new Map();
    let scanned = 0;

    const append = (candidate) => {
        if (!candidate) return;
        byUuid.set(candidate.uuid, candidate);
        const cards = byOracle.get(candidate.oracle_id) ?? [];
        cards.push(candidate);
        byOracle.set(candidate.oracle_id, cards);
        scanned += 1;
    };

    // Shape A: Set map (setCode -> { releaseDate, cards: [...] })
    const asSets = Object.values(allIdentifiersData).filter(
        (value) => value && typeof value === 'object' && Array.isArray(value.cards)
    );
    if (asSets.length > 0) {
        for (const setData of asSets) {
            const releaseDate = toIsoDateOrNull(setData.releaseDate);
            for (const card of setData.cards) {
                append(buildIdentifierCard(card.uuid, card, releaseDate));
            }
        }
        return { byOracle, byUuid, scanned };
    }

    // Shape B: UUID map (uuid -> card object or identifiers-only object)
    for (const [uuid, value] of Object.entries(allIdentifiersData)) {
        append(buildIdentifierCard(uuid, value));
    }
    return { byOracle, byUuid, scanned };
}

function scoreCandidate(candidate) {
    let score = 0;
    if (candidate.uuid && candidate.nonfoil_uuid && candidate.uuid === candidate.nonfoil_uuid) score += 400;
    if (cardLooksNonFoil(candidate)) score += 140;
    if (cardIsPaper(candidate)) score += 100;
    if (String(candidate.language ?? '').toLowerCase() === 'english') score += 60;
    if (candidate.purchase_urls.cardkingdom || candidate.cardkingdom_id) score += 30;
    if (candidate.purchase_urls.tcgplayer || candidate.tcgplayer_product_id) score += 30;
    if (candidate.release_date) score += 10;
    return score;
}

function selectBaseNonFoilCandidate(candidates, byUuid) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;

    const sorted = [...candidates].sort((a, b) => {
        const scoreDiff = scoreCandidate(b) - scoreCandidate(a);
        if (scoreDiff !== 0) return scoreDiff;
        const dateA = a.release_date ?? '';
        const dateB = b.release_date ?? '';
        return dateB.localeCompare(dateA);
    });

    const best = sorted[0];
    if (!best) return null;

    if (best.nonfoil_uuid && byUuid.has(best.nonfoil_uuid)) {
        return byUuid.get(best.nonfoil_uuid);
    }

    return best;
}

function buildCardKingdomSearchUrl(cardName) {
    if (!cardName) return null;
    return `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${encodeURIComponent(cardName)}`;
}

function buildTcgPlayerUrl(productId) {
    if (!productId) return null;
    return `https://www.tcgplayer.com/product/${productId}`;
}

async function assertOk(result, label) {
    if (result.error) throw new Error(`${label}: ${result.error.message}`);
    return result.data;
}

loadDotEnv();
const localProject = readLocalProjectConfig();

const INSFORGE_URL = requireEnv('INSFORGE_URL', 'VITE_INSFORGE_URL');
const INSFORGE_API_KEY =
    process.env.INSFORGE_API_KEY ??
    process.env.INSFORGE_SERVICE_ROLE_KEY ??
    localProject.api_key;
if (!INSFORGE_API_KEY && !DRY_RUN) throw new Error('Missing required env var: INSFORGE_API_KEY');

const db = INSFORGE_URL && INSFORGE_API_KEY
    ? createClient({
        baseUrl: INSFORGE_URL,
        anonKey: INSFORGE_API_KEY,
        headers: { apikey: INSFORGE_API_KEY },
        timeout: 120000,
        retryCount: 3,
    }).database
    : null;

async function fetchAllMtgCards() {
    if (!db) return [];
    const all = [];
    let offset = 0;
    while (true) {
        const batch = await assertOk(
            await db
                .from('mtg_cards')
                .select('oracle_id,name,image_uri,scryfall_uri')
                .order('name', { ascending: true })
                .range(offset, offset + CARD_PAGE_SIZE - 1),
            `fetch mtg_cards page @${offset}`
        );
        all.push(...batch);
        if (batch.length < CARD_PAGE_SIZE) break;
        offset += CARD_PAGE_SIZE;
    }
    return all;
}

function resolveMarketRows(params) {
    const { mtgCards, byOracle, byUuid, pricesByUuid, defaultPriceDate } = params;
    const rows = [];

    for (const card of mtgCards) {
        const oracleId = normalizeOracleId(card.oracle_id);
        if (!oracleId) continue;

        const candidates = byOracle.get(oracleId);
        if (!candidates || candidates.length === 0) continue;

        const baseCandidate = selectBaseNonFoilCandidate(candidates, byUuid);
        if (!baseCandidate) continue;

        const priceNode = pricesByUuid[baseCandidate.uuid] ?? null;
        const paper = priceNode?.paper ?? {};

        const ck = extractProviderPrice(paper.cardkingdom);
        const tcg = extractProviderPrice(paper.tcgplayer);
        const priceDate = bestDate(ck.date, tcg.date) ?? defaultPriceDate;

        rows.push({
            oracle_id: card.oracle_id,
            card_name: card.name,
            mtgjson_uuid: baseCandidate.uuid,
            scryfall_id: baseCandidate.scryfall_id,
            cardkingdom_id: baseCandidate.cardkingdom_id,
            tcgplayer_product_id: baseCandidate.tcgplayer_product_id,
            cardkingdom_price_usd: ck.price,
            tcgplayer_price_usd: tcg.price,
            cardkingdom_url: baseCandidate.purchase_urls.cardkingdom ?? buildCardKingdomSearchUrl(card.name),
            tcgplayer_url: baseCandidate.purchase_urls.tcgplayer ?? buildTcgPlayerUrl(baseCandidate.tcgplayer_product_id),
            image_uri: card.image_uri ?? null,
            scryfall_uri: card.scryfall_uri ?? null,
            price_date: priceDate,
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    }

    return rows;
}

async function persistRows(rows) {
    if (DRY_RUN) {
        console.log(`[dry-run] Would upsert ${rows.length} rows into mtg_card_market_data.`);
        return;
    }
    if (!db) throw new Error('Database client not configured.');

    const ingestionRun = await assertOk(
        await db
            .from('mtg_ingestion_runs')
            .insert([{
                source: 'mtgjson',
                status: 'running',
            }])
            .select('id')
            .single(),
        'create ingestion run'
    );

    try {
        for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
            const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
            await assertOk(
                await db
                    .from('mtg_card_market_data')
                    .upsert(chunk, { onConflict: 'oracle_id' }),
                `upsert market data chunk ${Math.floor(i / UPSERT_CHUNK_SIZE) + 1}`
            );
        }

        await assertOk(
            await db
                .from('mtg_ingestion_runs')
                .update({
                    cards_imported: rows.length,
                    status: 'completed',
                    finished_at: new Date().toISOString(),
                })
                .eq('id', ingestionRun.id),
            'complete ingestion run'
        );
    } catch (error) {
        await db
            .from('mtg_ingestion_runs')
            .update({
                status: 'failed',
                error_message: error.message,
                finished_at: new Date().toISOString(),
            })
            .eq('id', ingestionRun.id);
        throw error;
    }
}

async function main() {
    console.log([
        'MTGJSON market importer flow:',
        '1. Download AllIdentifiers payload.',
        '2. Download AllPricesToday payload.',
        '3. Index print identifiers by oracle_id/uuid.',
        '4. Resolve base non-foil print per oracle_id.',
        '5. Extract non-foil USD prices (CardKingdom/TCGPlayer).',
        '6. Build tooltip market rows with links and image references.',
        '7. Upsert rows into mtg_card_market_data and log ingestion run.',
    ].join('\n'));

    const [identifiersPayload, pricesPayload] = await Promise.all([
        fetchJsonPayload(MTGJSON_IDENTIFIERS_URL, 'AllIdentifiers'),
        fetchJsonPayload(MTGJSON_PRICES_URL, 'AllPricesToday'),
    ]);

    const { byOracle, byUuid, scanned } = buildIdentifierIndexes(identifiersPayload.data ?? {});
    const pricesByUuid = pricesPayload.data ?? {};
    const defaultPriceDate = toIsoDateOrNull(pricesPayload?.meta?.date);

    console.log(`Indexed ${scanned} identifier cards across ${byOracle.size} oracle groups.`);

    const mtgCards = db ? await fetchAllMtgCards() : [];
    const rows = resolveMarketRows({
        mtgCards,
        byOracle,
        byUuid,
        pricesByUuid,
        defaultPriceDate,
    });

    console.log(`Resolved ${rows.length} market rows from ${mtgCards.length} mtg_cards records.`);
    await persistRows(rows);
    console.log('MTGJSON market import finished.');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
