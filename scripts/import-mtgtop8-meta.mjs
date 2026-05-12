import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@insforge/sdk';

const BASE_URL = 'https://mtgtop8.com';
const DEFAULT_FORMATS = [
    { slug: 'standard', code: 'ST' },
    { slug: 'modern', code: 'MO' },
    { slug: 'pauper', code: 'PAU' },
];
const META_WINDOW = process.env.MTGTOP8_META ?? '52';
const MAX_ARCHETYPES = Number(process.env.MTGTOP8_MAX_ARCHETYPES ?? 10);
const MAX_DECKS_PER_ARCHETYPE = Number(process.env.MTGTOP8_MAX_DECKS_PER_ARCHETYPE ?? 10);
const REQUEST_DELAY_MS = Number(process.env.MTGTOP8_REQUEST_DELAY_MS ?? 650);
const DRY_RUN = process.argv.includes('--dry-run');

const cliFormatArg = process.argv.find((arg) => arg.startsWith('--format='));
const requestedFormats = (process.env.MTGTOP8_FORMATS ?? cliFormatArg?.split('=')[1] ?? '')
    .split(',')
    .map((format) => format.trim().toLowerCase())
    .filter(Boolean);
const FORMATS = requestedFormats.length
    ? DEFAULT_FORMATS.filter((format) => requestedFormats.includes(format.slug))
    : DEFAULT_FORMATS;

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

        process.env[key] = rawValue
            .trim()
            .replace(/^['"]|['"]$/g, '');
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
        headers: {
            apikey: INSFORGE_API_KEY,
        },
        timeout: 60000,
        retryCount: 3,
    }).database
    : null;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value) {
    return value
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;|&apos;/g, '\'')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeName(name) {
    return decodeHtml(name)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function toIsoDate(ddmmyy) {
    const match = ddmmyy.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    return `20${year}-${month}-${day}`;
}

function dateAgeDays(isoDate) {
    if (!isoDate) return 90;
    const ms = Date.now() - new Date(`${isoDate}T00:00:00Z`).getTime();
    return Math.max(0, Math.round(ms / 86400000));
}

function parseRankNumber(rank) {
    const match = String(rank ?? '').match(/\d+/);
    return match ? Number(match[0]) : null;
}

function placementScore(rank) {
    const text = String(rank ?? '').trim();
    if (/^1$/.test(text)) return 100;
    if (/^2$/.test(text)) return 92;
    if (/^3-4$|^3$|^4$/.test(text)) return 84;
    if (/^5-8$|^[5-8]$/.test(text)) return 74;
    if (/^9-16$|^1[0-6]$|^9$/.test(text)) return 58;
    const rankNumber = parseRankNumber(text);
    return rankNumber ? Math.max(25, 65 - rankNumber * 1.4) : 45;
}

function inferStrategy(section, archetypeName) {
    const normalized = normalizeName(archetypeName);
    if (normalized.includes('tempo')) return 'tempo';
    if (normalized.includes('ramp')) return 'ramp';
    if (normalized.includes('prison')) return 'prison';
    if (normalized.includes('midrange')) return 'midrange';
    if (normalized.includes('control')) return 'control';
    if (normalized.includes('combo') || normalized.includes('reanimator')) return 'combo';
    if (section === 'CONTROL') return 'control';
    if (section === 'COMBO') return 'combo';
    return 'aggro';
}

function computeTier(metaShare) {
    if (metaShare >= 8) return 1;
    if (metaShare >= 2) return 2;
    return 3;
}

function computeCompetitiveScore({ rank, levelStars, metaShare, recordedAt }) {
    const placement = placementScore(rank);
    const eventLevel = Math.min(levelStars, 3) / 3 * 100;
    const popularity = Math.min(metaShare * 6, 100);
    const recency = Math.max(35, 100 - dateAgeDays(recordedAt) * 1.8);
    return Math.round((placement * 0.45 + eventLevel * 0.2 + popularity * 0.25 + recency * 0.1) * 10) / 10;
}

async function fetchHtml(path) {
    const url = path.startsWith('http') ? path : `${BASE_URL}/${path.replace(/^\//, '')}`;
    const response = await fetch(url, {
        headers: {
            'user-agent': 'diegodev-mtg-agent/1.0 (+https://github.com/)',
            accept: 'text/html',
        },
    });
    if (!response.ok) throw new Error(`MTGTop8 request failed ${response.status}: ${url}`);
    const html = await response.text();
    await sleep(REQUEST_DELAY_MS);
    return html;
}

function sectionAt(html, index) {
    const prefix = html.slice(0, index);
    const matches = [...prefix.matchAll(/<div class=meta_arch[^>]*>(AGGRO|CONTROL|COMBO|MIDRANGE|OTHER)[^<]*<\/div>/g)];
    return matches.at(-1)?.[1] ?? 'AGGRO';
}

function parseArchetypes(html, formatCode) {
    const archetypes = [];
    const seen = new Set();
    const regex = /<a href=archetype\?a=(\d+)&meta=\d+&f=([A-Z]+)>([^<]+)<\/a>[\s\S]{0,650}?<div[^>]*class=S14[^>]*>\s*([\d.]+)\s*%/g;
    for (const match of html.matchAll(regex)) {
        const [, mtgtop8Id, code, rawName, rawShare] = match;
        if (code !== formatCode || seen.has(mtgtop8Id)) continue;
        seen.add(mtgtop8Id);
        const name = decodeHtml(rawName);
        const metaShare = Number(rawShare);
        archetypes.push({
            mtgtop8Id,
            name,
            metaShare,
            strategy: inferStrategy(sectionAt(html, match.index ?? 0), name),
        });
    }
    return archetypes
        .sort((a, b) => b.metaShare - a.metaShare)
        .slice(0, MAX_ARCHETYPES);
}

function parseDeckRows(html, formatCode, archetype) {
    const rows = [];
    const rowRegex = /<tr class=hover_tr>([\s\S]*?)<\/tr>/g;
    for (const rowMatch of html.matchAll(rowRegex)) {
        const row = rowMatch[1];
        const deckLink = row.match(/<td><a href=\/event\?e=(\d+)&d=(\d+)&f=([A-Z]+)>([\s\S]*?)<\/a><\/td>/);
        if (!deckLink || deckLink[3] !== formatCode) continue;

        const player = row.match(/<td><a class=player[^>]*>([\s\S]*?)<\/a><\/td>/);
        const event = row.match(/<td><a href=\/event\?e=\d+&f=[A-Z]+>([\s\S]*?)<\/a><\/td>/);
        const cells = [...row.matchAll(/<td(?:\s+[^>]*)?>([\s\S]*?)<\/td>/g)].map((cell) => cell[1]);
        const rank = decodeHtml(cells.at(-2) ?? '');
        const recordedAt = toIsoDate(decodeHtml(cells.at(-1) ?? ''));
        const levelStars = (row.match(/\/graph\/star\.png/g) ?? []).length;

        rows.push({
            eventId: deckLink[1],
            deckId: deckLink[2],
            formatCode,
            name: decodeHtml(deckLink[4]),
            archetypeName: archetype.name,
            mtgtop8ArchetypeId: archetype.mtgtop8Id,
            metaShare: archetype.metaShare,
            strategy: archetype.strategy,
            playerName: player ? decodeHtml(player[1]) : null,
            tournamentName: event ? decodeHtml(event[1]) : null,
            placement: rank,
            rankNumeric: parseRankNumber(rank),
            levelStars,
            recordedAt,
            url: `${BASE_URL}/event?e=${deckLink[1]}&d=${deckLink[2]}&f=${formatCode}`,
        });
    }
    return rows.slice(0, MAX_DECKS_PER_ARCHETYPE);
}

function parseDeckCards(html) {
    const cards = [];
    const cardRegex = /<div id=(md|sb)[^>]*class="deck_line[^"]*"[^>]*>\s*(\d+)\s*<span class=L14>([\s\S]*?)<\/span>/g;
    for (const match of html.matchAll(cardRegex)) {
        const section = match[1] === 'sb' ? 'sideboard' : 'main';
        const quantity = Number(match[2]);
        const cardName = decodeHtml(match[3]);
        if (quantity > 0 && cardName) {
            cards.push({ section, quantity, card_name: cardName });
        }
    }
    return cards;
}

function summarizeKeyCards(decks) {
    const byArchetype = new Map();
    for (const deck of decks) {
        const current = byArchetype.get(deck.archetypeKey) ?? new Map();
        const deckCards = new Set(deck.cards.filter((card) => card.section === 'main').map((card) => card.card_name));
        for (const cardName of deckCards) {
            current.set(cardName, (current.get(cardName) ?? 0) + 1);
        }
        byArchetype.set(deck.archetypeKey, current);
    }

    const result = new Map();
    for (const [archetypeKey, counts] of byArchetype.entries()) {
        result.set(
            archetypeKey,
            [...counts.entries()]
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 12)
                .map(([cardName]) => cardName)
        );
    }
    return result;
}

async function collectFormat(format) {
    console.log(`Collecting ${format.slug} from MTGTop8 meta=${META_WINDOW}`);
    const formatHtml = await fetchHtml(`format?f=${format.code}&meta=${META_WINDOW}`);
    const archetypes = parseArchetypes(formatHtml, format.code);
    const decks = [];

    for (const archetype of archetypes) {
        const pageHtml = await fetchHtml(`archetype?a=${archetype.mtgtop8Id}&meta=${META_WINDOW}&f=${format.code}`);
        const rows = parseDeckRows(pageHtml, format.code, archetype);
        for (const row of rows) {
            try {
                const deckHtml = await fetchHtml(`event?e=${row.eventId}&d=${row.deckId}&f=${format.code}`);
                const cards = parseDeckCards(deckHtml);
                const mainCount = cards.filter((card) => card.section === 'main').reduce((sum, card) => sum + card.quantity, 0);
                const sideboardCount = cards.filter((card) => card.section === 'sideboard').reduce((sum, card) => sum + card.quantity, 0);
                if (mainCount < 40) continue;

                const competitiveScore = computeCompetitiveScore({
                    rank: row.placement,
                    levelStars: row.levelStars,
                    metaShare: row.metaShare,
                    recordedAt: row.recordedAt,
                });

                decks.push({
                    ...row,
                    formatSlug: format.slug,
                    archetypeKey: `${format.slug}:${row.archetypeName}`,
                    sourceExternalId: `mtgtop8:${format.code}:${row.deckId}`,
                    competitiveScore,
                    performanceScore: placementScore(row.placement),
                    popularityScore: Math.min(row.metaShare * 6, 100),
                    mainCount,
                    sideboardCount,
                    cards,
                });
            } catch (error) {
                console.warn(`Skipping deck ${row.url}: ${error.message}`);
            }
        }
    }

    console.log(`Collected ${decks.length} ${format.slug} decks across ${archetypes.length} archetypes`);
    return { archetypes, decks };
}

async function assertOk(result, label) {
    if (result.error) throw new Error(`${label}: ${result.error.message}`);
    return result.data;
}

async function persistFormat(format, archetypes, decks) {
    if (DRY_RUN) {
        console.log(`[dry-run] Would persist ${archetypes.length} archetypes and ${decks.length} decks for ${format.slug}`);
        return;
    }

    const ingestionRun = await assertOk(await db
        .from('mtg_ingestion_runs')
        .insert([{
            source: 'mtgtop8',
            format_slug: format.slug,
            status: 'running',
        }])
        .select('id')
        .single(), 'create ingestion run');

    try {
        const keyCardsByArchetype = summarizeKeyCards(decks);
        const archetypeRows = archetypes.map((archetype) => ({
            format_slug: format.slug,
            name: archetype.name,
            strategy: archetype.strategy,
            tier: computeTier(archetype.metaShare),
            key_cards: keyCardsByArchetype.get(`${format.slug}:${archetype.name}`) ?? [],
            is_active: true,
            source_external_id: `mtgtop8:${format.code}:arch:${archetype.mtgtop8Id}`,
            meta_share: archetype.metaShare,
            popularity_score: Math.min(archetype.metaShare * 6, 100),
            source_updated_at: new Date().toISOString(),
        }));

        const savedArchetypes = await assertOk(await db
            .from('mtg_archetypes')
            .upsert(archetypeRows, { onConflict: 'format_slug,name' })
            .select('id,name,format_slug'), 'upsert archetypes');
        const archetypeIdByName = new Map(savedArchetypes.map((row) => [`${row.format_slug}:${row.name}`, row.id]));

        await assertOk(await db
            .from('mtg_meta_decks')
            .update({ is_active: false })
            .eq('source', 'mtgtop8')
            .eq('format_slug', format.slug), 'deactivate previous meta decks');

        const deckRows = decks
            .map((deck) => ({
                archetype_id: archetypeIdByName.get(deck.archetypeKey),
                format_slug: deck.formatSlug,
                name: deck.name,
                source: 'mtgtop8',
                source_url: deck.url,
                source_external_id: deck.sourceExternalId,
                mtgtop8_archetype_id: deck.mtgtop8ArchetypeId,
                tournament_name: deck.tournamentName,
                placement: deck.placement,
                player_name: deck.playerName,
                recorded_at: deck.recordedAt,
                is_active: true,
                meta_share: deck.metaShare,
                popularity_score: deck.popularityScore,
                performance_score: deck.performanceScore,
                competitive_score: deck.competitiveScore,
                rank_numeric: deck.rankNumeric,
                main_count: deck.mainCount,
                sideboard_count: deck.sideboardCount,
                imported_at: new Date().toISOString(),
            }))
            .filter((row) => row.archetype_id);

        const savedDecks = await assertOk(await db
            .from('mtg_meta_decks')
            .upsert(deckRows, { onConflict: 'source,source_external_id' })
            .select('id,source_external_id,competitive_score'), 'upsert meta decks');
        const deckIdBySource = new Map(savedDecks.map((row) => [row.source_external_id, row.id]));

        const savedDeckIds = savedDecks.map((row) => row.id);
        if (savedDeckIds.length > 0) {
            await assertOk(await db
                .from('mtg_meta_deck_cards')
                .delete()
                .in('meta_deck_id', savedDeckIds), 'delete old deck cards');
        }

        const cardRows = [];
        for (const deck of decks) {
            const metaDeckId = deckIdBySource.get(deck.sourceExternalId);
            if (!metaDeckId) continue;
            for (const card of deck.cards) {
                cardRows.push({
                    meta_deck_id: metaDeckId,
                    card_name: card.card_name,
                    quantity: card.quantity,
                    section: card.section,
                    deck_card_score: Math.round(deck.competitiveScore * (card.section === 'main' ? 1 : 0.35) * 10) / 10,
                });
            }
        }

        for (let i = 0; i < cardRows.length; i += 500) {
            await assertOk(await db
                .from('mtg_meta_deck_cards')
                .insert(cardRows.slice(i, i + 500)), `insert deck cards chunk ${i / 500 + 1}`);
        }

        await assertOk(await db
            .from('mtg_ingestion_runs')
            .update({
                decks_imported: savedDecks.length,
                status: 'completed',
                finished_at: new Date().toISOString(),
            })
            .eq('id', ingestionRun.id), 'complete ingestion run');

        console.log(`Persisted ${savedDecks.length} ${format.slug} decks and ${cardRows.length} cards`);
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
    if (FORMATS.length === 0) throw new Error('No matching formats selected');

    console.log([
        'MTGTop8 importer flow:',
        '1. Read configured formats and meta window.',
        '2. Fetch MTGTop8 format metagame pages.',
        '3. Extract archetypes, shares and inferred strategies.',
        '4. Fetch recent competitive deck rows per archetype.',
        '5. Fetch each deck page and parse main/sideboard cards.',
        '6. Compute popularity, performance and competitive scores.',
        '7. Upsert archetypes, decks and cards into InsForge tables.',
    ].join('\n'));

    let totalDecks = 0;
    for (const format of FORMATS) {
        const { archetypes, decks } = await collectFormat(format);
        await persistFormat(format, archetypes, decks);
        totalDecks += decks.length;
    }
    console.log(`MTGTop8 import finished. Decks processed: ${totalDecks}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
