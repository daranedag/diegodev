// InsForge edge function — MTG Deck Analysis
// Runtime: Deno (compatible with Supabase Edge Functions runtime)
// Deploy: pnpm dlx @insforge/cli functions deploy analyze-deck
//
// This function:
//   1. Parses a raw decklist (Arena format or plain text)
//   2. Queries mtg_cards & mtg_archetypes from the DB using the REST API
//   3. Computes structural stats, legality, archetype matching, and rule-based insights
//   4. Enriches results via LLM (InsForge AI) with concrete card recommendations
//   5. Returns a structured AnalysisResponse — no writes (frontend persists the run)
//
// NOTE: Global tables have public-read RLS, so the anon key is sufficient here.

const DEFAULT_ALLOWED_ORIGINS = [
    "https://diegui.dev",
    "https://www.diegui.dev",
    "http://localhost:5173",
];
const MAX_BODY_BYTES = 64 * 1024;
const MAX_DECKLIST_CHARS = 32_000;
const MAX_DECK_NAME_CHARS = 120;
const MAX_DECK_LINES = 250;
const MAX_UNIQUE_CARDS = 200;
const MAX_QUANTITY_PER_LINE = 100;
const MAX_TOTAL_CARDS = 500;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8_000;

function allowedOrigins(): Set<string> {
    const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    return new Set(configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function corsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get("origin");
    const headers: Record<string, string> = {
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin",
    };
    if (origin && allowedOrigins().has(origin)) headers["Access-Control-Allow-Origin"] = origin;
    return headers;
}

function jsonResponse(req: Request, body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders(req), ...extraHeaders, "Content-Type": "application/json" },
    });
}

async function fetchWithTimeout(
    input: string | URL,
    init: RequestInit = {},
    timeoutMs = UPSTREAM_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

const VALID_FORMATS = ["standard", "modern", "pauper"] as const;
const ANALYSIS_CACHE_VERSION = "mtg-agent-v3-market-tooltips";
type Format = (typeof VALID_FORMATS)[number];

interface DeckCard {
    name: string;
    quantity: number;
    section: "main" | "sideboard";
}

interface CardData {
    oracle_id: string;
    name: string;
    cmc: number;
    colors: string[];
    type_line?: string;
    legalities?: Record<string, string>;
}

interface Recommendation {
    action: "add" | "remove";
    section: "main" | "sideboard";
    card_name: string;
    quantity_suggested: number;
    reason: string;
    priority: number;
    verified?: boolean;
    verification_note?: string;
    market_data?: RecommendationMarketData | null;
}

interface RecommendationMarketData {
    card_name: string;
    image_uri?: string | null;
    scryfall_uri?: string | null;
    cardkingdom_price_usd?: number | null;
    cardkingdom_url?: string | null;
    tcgplayer_price_usd?: number | null;
    tcgplayer_url?: string | null;
    price_date?: string | null;
    is_base_nonfoil: true;
}

interface SimilarMetaDeck {
    name: string;
    archetype: string;
    similarity: number;
    competitive_score?: number | null;
    meta_share?: number | null;
    source?: string | null;
    source_url?: string | null;
    shared_cards?: string[];
    missing_main_cards?: string[];
}

interface AnalysisResponse {
    format_slug: string;
    deck_name: string | null;
    archetype_detected: string | null;
    strategy_detected: string | null;
    tier_detected: number | null;
    confidence_score: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: Recommendation[];
    similar_meta_decks: SimilarMetaDeck[];
    deck_stats: {
        main_count: number;
        sideboard_count: number;
        avg_cmc: number | null;
        color_identity: string[];
        is_legal: boolean;
        illegal_cards: string[];
        copy_violations: Array<{ card_name: string; count: number; max_allowed: number }>;
        legality_issues: string[];
    };
    analysis_notes: string;
    data_available: boolean;
    llm_used: boolean;
    deck_hash: string;
}

// ── Deck parser ───────────────────────────────────────────────────────────────
function cleanCardName(input: string): string {
    return input
        .replace(/\s+\*[^*]*\*$/g, "")
        .replace(/\s+\([^)]{2,8}\)\s+\S+.*$/g, "")
        .replace(/\s+#\d+$/g, "")
        .trim();
}

function parseDecklist(raw: string): { main: DeckCard[]; sideboard: DeckCard[]; ignored_lines: string[] } {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const main: DeckCard[] = [];
    const sideboard: DeckCard[] = [];
    const ignored_lines: string[] = [];
    let inSideboard = false;

    for (const line of lines) {
        // Sideboard section markers
        if (/^(sideboard|side board|\/\/\s*sideboard|sb:|side\s*:?|mazo\s*\(side\))$/i.test(line)) {
            inSideboard = true;
            continue;
        }
        if (/^(deck|mainboard|main deck|mazo)$/i.test(line)) {
            inSideboard = false;
            continue;
        }
        // Comment / deck header lines to skip
        if (/^(\/\/|#|name:|companion|commander|maybeboard|\d+\s+cards?$)/i.test(line)) continue;

        // Match "4 Card Name (SET) 123" or "4x Card Name" or "4 Card Name"
        const match = line.match(/^(\d+)[x]?\s+(.+)$/i);
        if (!match) {
            ignored_lines.push(line);
            continue;
        }

        const quantity = parseInt(match[1], 10);
        const name = cleanCardName(match[2]);
        if (!quantity || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE || !name || name.length > 200) {
            ignored_lines.push(line);
            continue;
        }

        const card: DeckCard = { name, quantity, section: inSideboard ? "sideboard" : "main" };
        if (inSideboard) sideboard.push(card);
        else main.push(card);
    }

    return { main, sideboard, ignored_lines };
}

function totalCards(cards: DeckCard[]): number {
    return cards.reduce((sum, c) => sum + c.quantity, 0);
}

function validateDecklistInput(rawDecklist: unknown, deckName: unknown): string | null {
    if (typeof rawDecklist !== "string" || !rawDecklist.trim()) return "raw_decklist is required";
    if (rawDecklist.length > MAX_DECKLIST_CHARS) {
        return `raw_decklist exceeds the ${MAX_DECKLIST_CHARS}-character limit`;
    }
    if (rawDecklist.split(/\r?\n/).length > MAX_DECK_LINES) {
        return `raw_decklist exceeds the ${MAX_DECK_LINES}-line limit`;
    }
    if (deckName != null && (typeof deckName !== "string" || deckName.length > MAX_DECK_NAME_CHARS)) {
        return `deck_name must be a string of at most ${MAX_DECK_NAME_CHARS} characters`;
    }
    return null;
}

// ── REST helper for reading public DB tables ───────────────────────────────────
function normalizeDecklistForHash(rawDecklist: string, formatSlug: string): string {
    const normalizedLines = rawDecklist
        .split("\n")
        .map((line) => line.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .join("\n");
    return `${ANALYSIS_CACHE_VERSION}\n${formatSlug}\n${normalizedLines}`;
}

async function sha256Hex(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function dbSelect(
    baseUrl: string,
    anonKey: string,
    table: string,
    params: Record<string, string>
): Promise<unknown[]> {
    const url = new URL(`${baseUrl}/api/database/records/${table}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetchWithTimeout(url, {
        headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Accept: "application/json",
        },
    });
    if (!res.ok) throw new Error(`DB ${table} query failed: ${res.status}`);
    const json = await res.json();
    return Array.isArray(json) ? json : (json?.data ?? []);
}

function bearerToken(req: Request): string | null {
    const authorization = req.headers.get("authorization") ?? "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
}

async function getAuthenticatedUser(
    baseUrl: string,
    anonKey: string,
    accessToken: string
): Promise<{ id: string } | null> {
    if (!accessToken || accessToken === anonKey) return null;
    const res = await fetchWithTimeout(`${baseUrl}/api/auth/sessions/current`, {
        headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
        },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json?.user?.id === "string" ? { id: json.user.id } : null;
}

async function consumeAnalysisQuota(
    baseUrl: string,
    anonKey: string,
    accessToken: string
): Promise<{ allowed: boolean; retry_after_seconds: number }> {
    const res = await fetchWithTimeout(`${baseUrl}/api/database/rpc/mtg_consume_analysis_quota`, {
        method: "POST",
        headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Analysis quota is unavailable");
    const json = await res.json();
    const value = Array.isArray(json) ? json[0] : (json?.data ?? json);
    return {
        allowed: value?.allowed === true,
        retry_after_seconds: Number(value?.retry_after_seconds) || 3600,
    };
}

async function getServerCachedAnalysis(
    baseUrl: string,
    anonKey: string,
    accessToken: string,
    deckHash: string
): Promise<Record<string, unknown> | null> {
    const url = new URL(`${baseUrl}/api/database/records/mtg_analysis_runs`);
    url.searchParams.set("select", "analysis_data,created_at");
    url.searchParams.set("deck_hash", `eq.${deckHash}`);
    url.searchParams.set("status", "eq.completed");
    url.searchParams.set("created_at", `gte.${new Date(Date.now() - CACHE_TTL_MS).toISOString()}`);
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", "1");
    const res = await fetchWithTimeout(url, {
        headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
        },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rows = Array.isArray(json) ? json : (json?.data ?? []);
    const analysis = rows?.[0]?.analysis_data;
    if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return null;
    const safeAnalysis = { ...analysis };
    delete safeAnalysis.llm_raw;
    delete safeAnalysis.raw_decklist;
    return { ...safeAnalysis, deck_hash: deckHash, cache_hit: true };
}

function chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

function quoteForPostgrestIn(value: string): string {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function fetchRecommendationMarketData(
    baseUrl: string,
    anonKey: string,
    recommendationNames: string[]
): Promise<Map<string, RecommendationMarketData>> {
    const uniqueNames = [...new Set(recommendationNames.map((name) => name.trim()).filter(Boolean))];
    const byName = new Map<string, RecommendationMarketData>();
    if (uniqueNames.length === 0) return byName;

    for (const chunk of chunkArray(uniqueNames, 40)) {
        const inValues = chunk.map((name) => quoteForPostgrestIn(name)).join(",");
        const rows = (await dbSelect(baseUrl, anonKey, "mtg_card_market_data", {
            select: "card_name,image_uri,scryfall_uri,cardkingdom_price_usd,cardkingdom_url,tcgplayer_price_usd,tcgplayer_url,price_date",
            card_name: `in.(${inValues})`,
            limit: "200",
        })) as MarketRow[];

        for (const row of rows) {
            if (!row?.card_name) continue;
            byName.set(normalizeCardName(row.card_name), {
                card_name: row.card_name,
                image_uri: row.image_uri ?? null,
                scryfall_uri: row.scryfall_uri ?? null,
                cardkingdom_price_usd: row.cardkingdom_price_usd ?? null,
                cardkingdom_url: row.cardkingdom_url ?? null,
                tcgplayer_price_usd: row.tcgplayer_price_usd ?? null,
                tcgplayer_url: row.tcgplayer_url ?? null,
                price_date: row.price_date ?? null,
                is_base_nonfoil: true,
            });
        }
    }

    return byName;
}

// ── Archetype matching ────────────────────────────────────────────────────────
interface Archetype {
    id: string;
    name: string;
    strategy: string;
    tier: number;
    key_cards: string[];
}

interface MetaDeck {
    id: string;
    archetype_id: string;
    format_slug: string;
    name: string;
    source?: string | null;
    source_url?: string | null;
    tournament_name?: string | null;
    player_name?: string | null;
    recorded_at?: string | null;
    placement?: string | null;
    competitive_score?: number | null;
    meta_share?: number | null;
}

interface MetaDeckCard {
    meta_deck_id: string;
    card_name: string;
    quantity: number;
    section: "main" | "sideboard";
    deck_card_score?: number | null;
}

interface MarketRow {
    card_name: string;
    image_uri?: string | null;
    scryfall_uri?: string | null;
    cardkingdom_price_usd?: number | null;
    cardkingdom_url?: string | null;
    tcgplayer_price_usd?: number | null;
    tcgplayer_url?: string | null;
    price_date?: string | null;
}

function matchArchetype(
    deckNames: string[],
    archetypes: Archetype[]
): { archetype: Archetype | null; confidence: number } {
    if (!archetypes.length || !deckNames.length) return { archetype: null, confidence: 0 };

    const deckLower = deckNames.map((n) => n.toLowerCase());
    let bestScore = 0;
    let best: Archetype | null = null;

    for (const arch of archetypes) {
        if (!arch.key_cards?.length) continue;
        const hits = arch.key_cards.filter((kc) =>
            deckLower.some((dn) => dn === kc.toLowerCase() || dn.includes(kc.toLowerCase()))
        );
        const score = hits.length / arch.key_cards.length;
        if (score > bestScore) {
            bestScore = score;
            best = arch;
        }
    }

    return { archetype: bestScore >= 0.25 ? best : null, confidence: bestScore };
}

function buildWeightedVector(cards: DeckCard[] | MetaDeckCard[]): Map<string, number> {
    const vector = new Map<string, number>();

    for (const card of cards) {
        const key = normalizeCardName("card_name" in card ? card.card_name : card.name);
        const weight = card.section === "sideboard" ? 0.35 : 1;
        vector.set(key, (vector.get(key) ?? 0) + card.quantity * weight);
    }

    return vector;
}

function weightedJaccard(a: Map<string, number>, b: Map<string, number>): number {
    const keys = new Set([...a.keys(), ...b.keys()]);
    let intersection = 0;
    let union = 0;

    for (const key of keys) {
        const av = a.get(key) ?? 0;
        const bv = b.get(key) ?? 0;
        intersection += Math.min(av, bv);
        union += Math.max(av, bv);
    }

    return union > 0 ? intersection / union : 0;
}

function topMissingMainCards(userMain: DeckCard[], metaCards: MetaDeckCard[], limit = 5): string[] {
    const userCounts = new Map(userMain.map((card) => [normalizeCardName(card.name), card.quantity]));

    return metaCards
        .filter((card) => card.section === "main")
        .filter((card) => (userCounts.get(normalizeCardName(card.card_name)) ?? 0) < card.quantity)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit)
        .map((card) => `${card.quantity} ${card.card_name}`);
}

function sharedMainCards(userMain: DeckCard[], metaCards: MetaDeckCard[], limit = 6): string[] {
    const userNames = new Set(userMain.map((card) => normalizeCardName(card.name)));

    return metaCards
        .filter((card) => card.section === "main" && userNames.has(normalizeCardName(card.card_name)))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit)
        .map((card) => card.card_name);
}

async function findSimilarMetaDecks(
    baseUrl: string,
    anonKey: string,
    params: {
        formatSlug: string;
        main: DeckCard[];
        sideboard: DeckCard[];
        archetypes: Archetype[];
        matchedArchetype: Archetype | null;
    }
): Promise<{ similar: SimilarMetaDeck[]; recommendations: Recommendation[] }> {
    const { formatSlug, main, sideboard, archetypes, matchedArchetype } = params;
    const archetypeById = new Map(archetypes.map((a) => [a.id, a]));

    const deckParams: Record<string, string> = {
        select: "id,archetype_id,format_slug,name,source,source_url,tournament_name,player_name,recorded_at,placement,competitive_score,meta_share",
        format_slug: `eq.${formatSlug}`,
        is_active: "eq.true",
        order: "competitive_score.desc",
        limit: "200",
    };
    if (matchedArchetype?.id) {
        deckParams.archetype_id = `eq.${matchedArchetype.id}`;
    }

    let metaDecks = (await dbSelect(baseUrl, anonKey, "mtg_meta_decks", deckParams)) as MetaDeck[];
    if (metaDecks.length === 0 && matchedArchetype?.id) {
        delete deckParams.archetype_id;
        metaDecks = (await dbSelect(baseUrl, anonKey, "mtg_meta_decks", deckParams)) as MetaDeck[];
    }

    const metaDeckIds = metaDecks.map((deck) => deck.id).filter(Boolean);
    if (metaDeckIds.length === 0) return { similar: [], recommendations: [] };

    const metaCards: MetaDeckCard[] = [];
    for (const ids of chunkArray(metaDeckIds, 25)) {
        const cards = (await dbSelect(baseUrl, anonKey, "mtg_meta_deck_cards", {
            select: "meta_deck_id,card_name,quantity,section,deck_card_score",
            meta_deck_id: `in.(${ids.join(",")})`,
            limit: "2000",
        })) as MetaDeckCard[];
        metaCards.push(...cards);
    }

    const cardsByDeck = new Map<string, MetaDeckCard[]>();
    for (const card of metaCards) {
        const cards = cardsByDeck.get(card.meta_deck_id) ?? [];
        cards.push(card);
        cardsByDeck.set(card.meta_deck_id, cards);
    }

    const userVector = buildWeightedVector([...main, ...sideboard]);
    const scored = metaDecks
        .map((deck) => {
            const cards = cardsByDeck.get(deck.id) ?? [];
            const similarity = weightedJaccard(userVector, buildWeightedVector(cards));
            const competitiveScore = Number(deck.competitive_score ?? 0);
            const score = similarity * (1 + Math.min(competitiveScore, 100) / 500);
            const archetype = archetypeById.get(deck.archetype_id);
            return {
                deck,
                cards,
                score,
                similarity,
                competitiveScore,
                archetypeName: archetype?.name ?? "Meta deck",
            };
        })
        .filter((entry) => entry.cards.length > 0 && entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    const similar = scored.map((entry) => ({
        name: entry.deck.name,
        archetype: entry.archetypeName,
        similarity: Math.round(entry.similarity * 100) / 100,
        competitive_score: entry.deck.competitive_score ?? null,
        meta_share: entry.deck.meta_share ?? null,
        source: entry.deck.source ?? null,
        source_url: entry.deck.source_url ?? null,
        shared_cards: sharedMainCards(main, entry.cards),
        missing_main_cards: topMissingMainCards(main, entry.cards),
    }));

    const userCounts = new Map(main.map((card) => [normalizeCardName(card.name), card.quantity]));
    const suggestionCounts = new Map<string, { card_name: string; quantity: number; decks: number; score: number }>();

    for (const entry of scored.slice(0, 3)) {
        for (const card of entry.cards.filter((c) => c.section === "main")) {
            const key = normalizeCardName(card.card_name);
            const currentCount = userCounts.get(key) ?? 0;
            if (currentCount >= card.quantity) continue;

            const current = suggestionCounts.get(key) ?? {
                card_name: card.card_name,
                quantity: 0,
                decks: 0,
                score: 0,
            };
            current.quantity = Math.max(current.quantity, card.quantity - currentCount);
            current.decks += 1;
            current.score += entry.score * (card.deck_card_score ?? entry.competitiveScore ?? 50);
            suggestionCounts.set(key, current);
        }
    }

    const recommendations = [...suggestionCounts.values()]
        .sort((a, b) => b.score - a.score || b.decks - a.decks || b.quantity - a.quantity)
        .slice(0, 4)
        .map((entry, index) => ({
            action: "add" as const,
            section: "main" as const,
            card_name: entry.card_name,
            quantity_suggested: Math.min(entry.quantity, 4),
            reason: `Aparece en ${entry.decks} de las listas competitivas mas parecidas y destaca por score de rendimiento en MTGTop8.`,
            priority: index + 1,
        }));

    return { similar, recommendations };
}

// ── Rule-based strengths / weaknesses ─────────────────────────────────────────
function deriveInsights(
    avgCmc: number | null,
    colorCount: number,
    sideCount: number,
    strategy: string | null
): { strengths: string[]; weaknesses: string[] } {
    const s: string[] = [];
    const w: string[] = [];

    if (avgCmc !== null) {
        if (avgCmc < 1.6) {
            s.push("Curva de maná muy baja — rápida y resistente a la disrupción de maná");
            w.push("Alcance tardío y ventaja de cartas limitados");
        } else if (avgCmc < 2.5) {
            s.push("Curva de maná eficiente — buen equilibrio entre velocidad y densidad de amenazas");
        } else if (avgCmc < 3.5) {
            s.push("Curva de rango medio — sólida en partidas equilibradas");
            w.push("Puede tener dificultades para estabilizarse a tiempo contra mazos aggro rápidos");
        } else {
            s.push("Amenazas de alto costo que dominan el juego tardío");
            w.push("Vulnerable a la presión temprana antes de poder lanzar las cartas clave");
        }
    }

    if (colorCount === 1) s.push("Base de maná monocolor — máxima consistencia");
    if (colorCount >= 3) w.push("Base de maná de 3 o más colores — mayor varianza por problemas de maná");

    if (strategy === "combo") {
        s.push("Gran potencial cuando el combo se ensambla");
        w.push("Vulnerable a la interacción y la disrupción de la mano");
    }
    if (strategy === "control") {
        s.push("Sólido en partidas largas de desgaste");
        w.push("Puede tener dificultades ante múltiples amenazas simultáneas");
    }

    if (sideCount < 10) w.push("Sideboard escaso que limita la flexibilidad en el mejor de tres");

    return { strengths: s, weaknesses: w };
}

// ── LLM enrichment ────────────────────────────────────────────────────────────

const LLM_MODEL = "anthropic/claude-sonnet-4.5";

interface LLMEnrichment {
    strengths: string[];
    weaknesses: string[];
    recommendations: Recommendation[];
    analysis_notes: string;
}

function buildDecklistText(main: DeckCard[], sideboard: DeckCard[]): string {
    const lines: string[] = [];
    for (const c of main) lines.push(`${c.quantity} ${c.name}`);
    if (sideboard.length > 0) {
        lines.push("Sideboard");
        for (const c of sideboard) lines.push(`${c.quantity} ${c.name}`);
    }
    return lines.join("\n");
}

async function callLLM(
    baseUrl: string,
    aiKey: string,
    params: {
        main: DeckCard[];
        sideboard: DeckCard[];
        formatSlug: string;
        avgCmc: number | null;
        colorIdentity: string[];
        archetype: Archetype | null;
        confidence: number;
        allArchetypes: Archetype[];
        similarMetaDecks: SimilarMetaDeck[];
        ruleStrengths: string[];
        ruleWeaknesses: string[];
    }
): Promise<LLMEnrichment | null> {
    const {
        main, sideboard, formatSlug, avgCmc, colorIdentity,
        archetype, confidence, allArchetypes, similarMetaDecks, ruleStrengths, ruleWeaknesses,
    } = params;

    const mainCount = main.reduce((s, c) => s + c.quantity, 0);
    const sideCount = sideboard.reduce((s, c) => s + c.quantity, 0);
    const decklistText = buildDecklistText(main, sideboard);

    // Gather key cards from all meta archetypes to give the LLM context about the meta
    const metaContext = allArchetypes
        .slice(0, 10)
        .map((a) => `- ${a.name} (${a.strategy}, Tier ${a.tier}): ${(a.key_cards ?? []).slice(0, 8).join(", ")}`)
        .join("\n");
    const similarDeckContext = similarMetaDecks
        .slice(0, 5)
        .map((d) => {
            const missing = d.missing_main_cards?.length ? `; faltantes: ${d.missing_main_cards.join(", ")}` : "";
            return `- ${d.name} (${d.archetype}, ${Math.round(d.similarity * 100)}% similitud${missing})`;
        })
        .join("\n");

    const systemPrompt = `Eres un experto en Magic: The Gathering competitivo con amplio conocimiento del meta de ${formatSlug}.
Tu tarea es analizar un mazo y entregar recomendaciones concretas de cartas: cuáles agregar y cuáles remover, con justificaciones específicas.

REGLAS CRÍTICAS:
- Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin \`\`\`.
- Todos los nombres de cartas deben ser exactos y en inglés.
- Las razones deben estar en español neutro, ser específicas y mencionar sinergias o debilidades concretas.
- Las recomendaciones deben ser cartas reales y legales en el formato ${formatSlug}.
- Sugiere entre 3 y 6 recomendaciones priorizadas.
- Cada carta que agregues al main deck debe venir balanceada con cortes del main deck si la lista ya tiene 60 o mas cartas. Cada carta que agregues al sideboard debe venir balanceada con cortes del sideboard si supera 15 cartas.
- Prioriza swaps concretos y accionables: por ejemplo, agregar 4 copias y remover 4 copias de cartas menos eficientes.
- Reescribe fortalezas y debilidades mencionando cartas concretas del mazo cuando sea posible.

FORMATO DE RESPUESTA (JSON estricto):
{
  "strengths": ["fortaleza 1 con carta concreta", "fortaleza 2"],
  "weaknesses": ["debilidad 1 con referencia concreta", "debilidad 2"],
  "recommendations": [
    {
      "action": "add",
      "section": "main",
      "card_name": "Nombre Exacto Carta",
      "quantity_suggested": 2,
      "reason": "Razón en español explicando por qué esta carta cubre X debilidad o potencia Y fortaleza",
      "priority": 1
    }
  ],
  "analysis_notes": "Resumen narrativo en español del mazo, su posición en el meta y potencial de mejora."
}`;

    const userMessage = `MAZO A ANALIZAR (${formatSlug}):
${decklistText}

ESTADÍSTICAS COMPUTADAS:
- Cartas en main: ${mainCount}
- Cartas en sideboard: ${sideCount}
- CMC promedio: ${avgCmc !== null ? avgCmc.toFixed(2) : "desconocido"}
- Identidad de colores: ${colorIdentity.length > 0 ? colorIdentity.join("") : "incoloro"}
- Arquetipo detectado: ${archetype ? `${archetype.name} (${archetype.strategy}, Tier ${archetype.tier}, ${Math.round(confidence * 100)}% coincidencia)` : "no identificado"}
- Cartas clave del arquetipo: ${archetype?.key_cards?.join(", ") ?? "N/A"}

ANÁLISIS BASE (reglas):
Fortalezas detectadas: ${ruleStrengths.join(" | ") || "ninguna"}
Debilidades detectadas: ${ruleWeaknesses.join(" | ") || "ninguna"}

META DEL FORMATO (arquetipos activos):
${metaContext || "Sin datos de meta disponibles"}

LISTAS DE META MAS PARECIDAS:
${similarDeckContext || "Sin listas representativas cargadas"}

Analiza el mazo y devuelve el JSON con recomendaciones concretas de cartas.`;

    try {
        const res = await fetchWithTimeout(`${baseUrl}/api/ai/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: aiKey,
                Authorization: `Bearer ${aiKey}`,
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
                temperature: 0.4,
                max_tokens: 1200,
            }),
        });

        if (!res.ok) return null;

        const json = await res.json();
        const raw = json?.choices?.[0]?.message?.content;
        if (!raw) return null;

        // Strip potential markdown code fences
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
        const parsed = JSON.parse(cleaned) as LLMEnrichment;

        // Validate minimal shape
        if (!Array.isArray(parsed.recommendations)) return null;

        const safeStrings = (value: unknown, maxItems: number, maxLength: number) =>
            Array.isArray(value)
                ? value.filter((item): item is string => typeof item === "string")
                    .slice(0, maxItems)
                    .map((item) => item.slice(0, maxLength))
                : [];
        const safeRecommendations = parsed.recommendations.slice(0, 12).map((rec) => ({
            ...rec,
            card_name: String(rec.card_name ?? "").slice(0, 200),
            reason: String(rec.reason ?? "").slice(0, 800),
            quantity_suggested: Math.min(100, Math.max(1, Number(rec.quantity_suggested) || 1)),
            priority: Math.min(100, Math.max(0, Number(rec.priority) || 0)),
        }));
        return {
            strengths: safeStrings(parsed.strengths, 8, 500),
            weaknesses: safeStrings(parsed.weaknesses, 8, 500),
            recommendations: safeRecommendations,
            analysis_notes: typeof parsed.analysis_notes === "string"
                ? parsed.analysis_notes.slice(0, 2_000)
                : "",
        };
    } catch {
        return null;
    }
}

// ── Scryfall fallback for cards not in DB ─────────────────────────────────────
interface ScryfallCardData {
    oracle_id: string;
    name: string;
    cmc: number;
    colors: string[];
    type_line?: string;
    legalities: Record<string, string>;
}

async function fetchScryfallCards(
    names: string[]
): Promise<{ found: ScryfallCardData[]; notFound: string[] }> {
    if (names.length === 0) return { found: [], notFound: [] };

    const BATCH = 75; // Scryfall collection endpoint limit
    const found: ScryfallCardData[] = [];
    const notFound: string[] = [];

    for (let i = 0; i < names.length; i += BATCH) {
        const batch = names.slice(i, i + BATCH);
        try {
            const res = await fetchWithTimeout("https://api.scryfall.com/cards/collection", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "diegodev-mtg-agent/1.0 (personal project)",
                },
                body: JSON.stringify({
                    identifiers: batch.map((name) => ({ name })),
                }),
            });

            if (!res.ok) {
                notFound.push(...batch);
                continue;
            }

            const data = await res.json();
            found.push(...(data.data ?? []));

            // Scryfall includes a not_found array with identifiers it couldn't resolve
            const apiNotFound: Array<{ name?: string }> = data.not_found ?? [];
            notFound.push(...apiNotFound.map((nf) => nf.name ?? "").filter(Boolean));
        } catch {
            // If Scryfall is unreachable, mark all batch cards as not found
            notFound.push(...batch);
        }
    }

    return { found, notFound };
}

// ── Main handler ──────────────────────────────────────────────────────────────
function normalizeCardName(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function isBasicLand(card: CardData | undefined, cardName: string): boolean {
    if (card?.type_line?.toLowerCase().includes("basic land")) return true;
    return ["plains", "island", "swamp", "mountain", "forest", "wastes"].includes(
        normalizeCardName(cardName)
    );
}

function maxCopiesForCard(card: CardData | undefined, cardName: string): number {
    if (isBasicLand(card, cardName)) return Infinity;

    const normalized = normalizeCardName(cardName);
    if (
        [
            "persistent petitioners",
            "rat colony",
            "relentless rats",
            "shadowborn apostle",
            "dragon's approach",
        ].includes(normalized)
    ) {
        return Infinity;
    }
    if (normalized === "seven dwarves") return 7;
    if (normalized === "nazgul") return 9;

    return 4;
}

function isCardLegal(card: CardData | undefined, legalOracleIds: Set<string>, formatSlug: string): boolean {
    if (!card) return false;
    if (legalOracleIds.has(card.oracle_id)) return true;
    return card.legalities?.[formatSlug] === "legal";
}

function getCopyViolations(
    allCards: DeckCard[],
    cardMap: Map<string, CardData>
): Array<{ card_name: string; count: number; max_allowed: number }> {
    const counts = new Map<string, { card_name: string; count: number }>();

    for (const card of allCards) {
        const key = normalizeCardName(card.name);
        const current = counts.get(key) ?? { card_name: card.name, count: 0 };
        current.count += card.quantity;
        counts.set(key, current);
    }

    return [...counts.values()]
        .map((entry) => {
            const resolved = cardMap.get(normalizeCardName(entry.card_name));
            const maxAllowed = maxCopiesForCard(resolved, entry.card_name);
            return { ...entry, max_allowed: maxAllowed };
        })
        .filter((entry) => Number.isFinite(entry.max_allowed) && entry.count > entry.max_allowed);
}

function cardIsLand(cardMap: Map<string, CardData>, cardName: string): boolean {
    const card = cardMap.get(normalizeCardName(cardName));
    return card?.type_line?.toLowerCase().includes("land") ?? false;
}

function cardIsBasicLandName(cardName: string): boolean {
    return ["plains", "island", "swamp", "mountain", "forest", "wastes"].includes(normalizeCardName(cardName));
}

function sumRecommendationQuantity(
    recommendations: Recommendation[],
    section: "main" | "sideboard",
    action: "add" | "remove",
    predicate: (rec: Recommendation) => boolean = () => true
): number {
    return recommendations
        .filter((rec) => rec.verified !== false && rec.section === section && rec.action === action && predicate(rec))
        .reduce((sum, rec) => sum + Math.max(Math.round(rec.quantity_suggested), 0), 0);
}

function mergeOrAppendRecommendation(recommendations: Recommendation[], recommendation: Recommendation): void {
    const key = `${recommendation.action}:${recommendation.section}:${normalizeCardName(recommendation.card_name)}`;
    const existing = recommendations.find((rec) =>
        `${rec.action}:${rec.section}:${normalizeCardName(rec.card_name)}` === key
    );

    if (existing) {
        existing.quantity_suggested += recommendation.quantity_suggested;
        existing.priority = Math.min(existing.priority, recommendation.priority);
        existing.reason = recommendation.reason;
        existing.verified = recommendation.verified;
        existing.verification_note = recommendation.verification_note;
        return;
    }

    recommendations.push(recommendation);
}

function buildCutCandidates(
    cards: DeckCard[],
    recommendations: Recommendation[],
    section: "main" | "sideboard",
    cardMap: Map<string, CardData>,
    protectedNames: Set<string>,
    preferLands: boolean
): Array<{ card: DeckCard; available: number; isLand: boolean; protected: boolean }> {
    const addedNames = new Set(
        recommendations
            .filter((rec) => rec.verified !== false && rec.section === section && rec.action === "add")
            .map((rec) => normalizeCardName(rec.card_name))
    );

    const alreadyRemoved = new Map<string, number>();
    for (const rec of recommendations.filter((r) => r.verified !== false && r.section === section && r.action === "remove")) {
        const key = normalizeCardName(rec.card_name);
        alreadyRemoved.set(key, (alreadyRemoved.get(key) ?? 0) + Math.max(Math.round(rec.quantity_suggested), 0));
    }

    return cards
        .map((card) => {
            const key = normalizeCardName(card.name);
            return {
                card,
                available: Math.max(card.quantity - (alreadyRemoved.get(key) ?? 0), 0),
                isLand: cardIsLand(cardMap, card.name),
                protected: protectedNames.has(key),
            };
        })
        .filter((entry) => entry.available > 0 && !addedNames.has(normalizeCardName(entry.card.name)))
        .sort((a, b) => {
            if (preferLands && a.isLand !== b.isLand) return a.isLand ? -1 : 1;
            if (!preferLands && a.isLand !== b.isLand) return a.isLand ? 1 : -1;
            if (a.protected !== b.protected) return a.protected ? 1 : -1;
            if (preferLands && cardIsBasicLandName(a.card.name) !== cardIsBasicLandName(b.card.name)) {
                return cardIsBasicLandName(a.card.name) ? -1 : 1;
            }
            return b.available - a.available || a.card.name.localeCompare(b.card.name);
        });
}

function balanceSwapRecommendations(
    recommendations: Recommendation[],
    params: {
        main: DeckCard[];
        sideboard: DeckCard[];
        cardMap: Map<string, CardData>;
        protectedCardNames: Set<string>;
    }
): { recommendations: Recommendation[]; autoCuts: number } {
    const balanced = recommendations.map((rec) => ({ ...rec }));
    let autoCuts = 0;
    let nextPriority = Math.max(0, ...balanced.map((rec) => rec.priority ?? 0)) + 1;

    for (const section of ["main", "sideboard"] as const) {
        const cards = section === "main" ? params.main : params.sideboard;
        const currentCount = totalCards(cards);
        const targetCount = section === "main" ? 60 : 15;
        const added = sumRecommendationQuantity(balanced, section, "add");
        const removed = sumRecommendationQuantity(balanced, section, "remove");
        let excess = currentCount + added - removed - targetCount;

        if (excess <= 0) continue;

        const addedLandCount = sumRecommendationQuantity(
            balanced,
            section,
            "add",
            (rec) => cardIsLand(params.cardMap, rec.card_name)
        );

        const passes = addedLandCount > 0 ? [true, false] : [false];
        for (const preferLands of passes) {
            if (excess <= 0) break;
            let passBudget = preferLands ? Math.min(excess, addedLandCount) : excess;
            const candidates = buildCutCandidates(
                cards,
                balanced,
                section,
                params.cardMap,
                params.protectedCardNames,
                preferLands
            );

            for (const candidate of candidates) {
                if (excess <= 0 || passBudget <= 0) break;
                if (preferLands && addedLandCount > 0 && !candidate.isLand) continue;
                const quantity = Math.min(candidate.available, excess, passBudget);
                if (quantity <= 0) continue;

                mergeOrAppendRecommendation(balanced, {
                    action: "remove",
                    section,
                    card_name: candidate.card.name,
                    quantity_suggested: quantity,
                    reason: section === "main"
                        ? "Corte sugerido para mantener el main deck en 60 cartas despues de aplicar las mejoras."
                        : "Corte sugerido para mantener el sideboard en 15 cartas despues de aplicar las mejoras.",
                    priority: nextPriority++,
                    verified: true,
                    verification_note: "Corte balanceado automaticamente desde la lista actual.",
                });
                autoCuts += quantity;
                excess -= quantity;
                passBudget -= quantity;
            }
        }
    }

    return {
        recommendations: balanced.sort((a, b) => a.priority - b.priority),
        autoCuts,
    };
}

async function validateRecommendations(
    recommendations: Recommendation[],
    params: {
        cardMap: Map<string, CardData>;
        legalOracleIds: Set<string>;
        formatSlug: string;
        deckCardNames: Set<string>;
    }
): Promise<{ recommendations: Recommendation[]; discarded: number; unverified: number }> {
    const { cardMap, legalOracleIds, formatSlug, deckCardNames } = params;
    const candidates = recommendations.filter((rec) => {
        return (
            (rec.action === "add" || rec.action === "remove") &&
            (rec.section === "main" || rec.section === "sideboard") &&
            typeof rec.card_name === "string" &&
            rec.card_name.trim().length > 0 &&
            Number.isFinite(rec.quantity_suggested) &&
            rec.quantity_suggested > 0
        );
    });

    const missingNames = [
        ...new Set(
            candidates
                .map((rec) => rec.card_name.trim())
                .filter((name) => !cardMap.has(normalizeCardName(name)))
        ),
    ];

    if (missingNames.length > 0) {
        const { found } = await fetchScryfallCards(missingNames);
        for (const card of found) {
            const entry: CardData = {
                oracle_id: card.oracle_id,
                name: card.name,
                cmc: card.cmc ?? 0,
                colors: card.colors ?? [],
                type_line: card.type_line,
                legalities: card.legalities,
            };
            cardMap.set(normalizeCardName(card.name), entry);
        }
    }

    const valid: Recommendation[] = [];
    const unverified: Recommendation[] = [];

    for (const rec of candidates) {
        const resolved = cardMap.get(normalizeCardName(rec.card_name));
        if (!resolved) {
            unverified.push({
                ...rec,
                verified: false,
                verification_note: "No se pudo confirmar que la carta exista.",
            });
            continue;
        }

        if (rec.action === "add" && !isCardLegal(resolved, legalOracleIds, formatSlug)) {
            unverified.push({
                ...rec,
                card_name: resolved.name,
                verified: false,
                verification_note: "La carta existe, pero no se pudo verificar como legal en el formato.",
            });
            continue;
        }
        if (rec.action === "remove" && !deckCardNames.has(normalizeCardName(rec.card_name))) {
            unverified.push({
                ...rec,
                card_name: resolved.name,
                verified: false,
                verification_note: "No se encontro esta carta en la lista actual.",
            });
            continue;
        }

        valid.push({
            action: rec.action,
            section: rec.section,
            card_name: resolved.name,
            quantity_suggested: Math.min(Math.max(Math.round(rec.quantity_suggested), 1), 15),
            reason: typeof rec.reason === "string" ? rec.reason : "",
            priority: Number.isFinite(rec.priority) ? rec.priority : valid.length + 1,
            verified: true,
            verification_note: "Carta verificada contra la base de datos/Scryfall.",
        });
    }

    const deduped = new Map<string, Recommendation>();
    for (const rec of [...valid, ...unverified]) {
        const key = `${rec.action}:${rec.section}:${normalizeCardName(rec.card_name)}`;
        const existing = deduped.get(key);
        if (!existing) {
            deduped.set(key, rec);
            continue;
        }

        deduped.set(key, {
            ...existing,
            quantity_suggested: Math.max(existing.quantity_suggested, rec.quantity_suggested),
            priority: Math.min(existing.priority, rec.priority),
            reason: existing.reason.length >= rec.reason.length ? existing.reason : rec.reason,
        });
    }

    return {
        recommendations: [...deduped.values()].sort((a, b) => a.priority - b.priority),
        discarded: recommendations.length - candidates.length,
        unverified: unverified.length,
    };
}

export default async function (req: Request) {
    const origin = req.headers.get("origin");
    if (origin && !allowedOrigins().has(origin)) {
        return jsonResponse(req, { error: "Origin not allowed" }, 403);
    }

    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    if (req.method !== "POST") {
        return jsonResponse(req, { error: "Method not allowed" }, 405);
    }

    try {
        const INSFORGE_URL =
            Deno.env.get("INSFORGE_BASE_URL") ??
            Deno.env.get("INSFORGE_URL") ??
            Deno.env.get("SUPABASE_URL");
        const INSFORGE_ANON_KEY =
            Deno.env.get("ANON_KEY") ??
            Deno.env.get("INSFORGE_ANON_KEY") ??
            Deno.env.get("SUPABASE_ANON_KEY");
        const INSFORGE_AI_KEY = Deno.env.get("INSFORGE_AI_KEY") ?? Deno.env.get("API_KEY");

        if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
            throw new Error("Missing INSFORGE_URL or INSFORGE_ANON_KEY env vars");
        }

        const accessToken = bearerToken(req);
        if (!accessToken) return jsonResponse(req, { error: "Authentication required" }, 401);
        if (!(await getAuthenticatedUser(INSFORGE_URL, INSFORGE_ANON_KEY, accessToken))) {
            return jsonResponse(req, { error: "Invalid or expired session" }, 401);
        }

        const quota = await consumeAnalysisQuota(INSFORGE_URL, INSFORGE_ANON_KEY, accessToken);
        if (!quota.allowed) {
            return jsonResponse(
                req,
                { error: "Analysis quota exceeded. Try again later." },
                429,
                { "Retry-After": String(quota.retry_after_seconds) }
            );
        }

        const contentLength = Number(req.headers.get("content-length") ?? 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
            return jsonResponse(req, { error: "Request body is too large" }, 413);
        }
        const rawBody = await req.text();
        if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
            return jsonResponse(req, { error: "Request body is too large" }, 413);
        }

        let body: unknown;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return jsonResponse(req, { error: "Request body must be valid JSON" }, 400);
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return jsonResponse(req, { error: "Request body must be a JSON object" }, 400);
        }
        const { raw_decklist, format_slug, deck_name } = body as {
            raw_decklist?: unknown;
            format_slug?: unknown;
            deck_name?: unknown;
        };

        const inputError = validateDecklistInput(raw_decklist, deck_name);
        if (inputError) return jsonResponse(req, { error: inputError }, 400);
        if (!VALID_FORMATS.includes(format_slug as Format)) {
            return jsonResponse(
                req,
                { error: `format_slug must be one of: ${VALID_FORMATS.join(", ")}` },
                400
            );
        }
        const safeDecklist = (raw_decklist as string).trim();
        const safeFormat = format_slug as Format;
        const safeDeckName = typeof deck_name === "string" ? deck_name.trim() || null : null;
        const deckHash = await sha256Hex(normalizeDecklistForHash(safeDecklist, safeFormat));

        const cachedAnalysis = await getServerCachedAnalysis(
            INSFORGE_URL,
            INSFORGE_ANON_KEY,
            accessToken,
            deckHash
        );
        if (cachedAnalysis) return jsonResponse(req, cachedAnalysis);

        // ── Parse ──────────────────────────────────────────────────────────────────
        const { main, sideboard, ignored_lines: ignoredLines } = parseDecklist(safeDecklist);
        const mainCount = totalCards(main);
        const sideCount = totalCards(sideboard);
        const allCards = [...main, ...sideboard];
        const uniqueNames = [...new Set(allCards.map((c) => c.name))];

        if (mainCount === 0) {
            return jsonResponse(req, { error: "No valid main-deck cards were parsed" }, 400);
        }
        if (uniqueNames.length > MAX_UNIQUE_CARDS) {
            return jsonResponse(req, { error: `Deck exceeds the ${MAX_UNIQUE_CARDS}-card-name limit` }, 400);
        }
        if (mainCount + sideCount > MAX_TOTAL_CARDS) {
            return jsonResponse(req, { error: `Deck exceeds the ${MAX_TOTAL_CARDS}-card total limit` }, 400);
        }

        // ── Query DB ───────────────────────────────────────────────────────────────
        let dbCards: CardData[] = [];
        let archetypes: Archetype[] = [];
        let legalOracleIds: Set<string> = new Set();
        let dataAvailable = false;
        let dbError: string | null = null;

        try {
            // Use PostgREST `in` filter — quote names that contain commas
            const inValues = uniqueNames.map(quoteForPostgrestIn).join(",");

            const rawCards = await dbSelect(INSFORGE_URL, INSFORGE_ANON_KEY, "mtg_cards", {
                select: "oracle_id,name,cmc,colors,type_line",
                name: `in.(${inValues})`,
                limit: "1000",
            });

            dbCards = rawCards as typeof dbCards;
            if (dbCards.length > 0) dataAvailable = true;

            if (dbCards.length > 0) {
                // Query real legalities from mtg_card_legalities for the target format
                const foundOracleIds = dbCards.map((c) => c.oracle_id).join(",");
                const rawLegalities = await dbSelect(
                    INSFORGE_URL,
                    INSFORGE_ANON_KEY,
                    "mtg_card_legalities",
                    {
                        select: "oracle_id,status",
                        oracle_id: `in.(${foundOracleIds})`,
                        format_slug: `eq.${safeFormat}`,
                        status: "eq.legal",
                        limit: "1000",
                    }
                );
                const legalRows = rawLegalities as Array<{ oracle_id: string; status: string }>;
                legalOracleIds = new Set(legalRows.map((r) => r.oracle_id));

                const rawArchetypes = await dbSelect(
                    INSFORGE_URL,
                    INSFORGE_ANON_KEY,
                    "mtg_archetypes",
                    {
                        select: "id,name,strategy,tier,key_cards",
                        format_slug: `eq.${safeFormat}`,
                        is_active: "eq.true",
                        order: "tier.asc",
                        limit: "50",
                    }
                );
                archetypes = rawArchetypes as Archetype[];
            }
        } catch (err) {
            dbError = err instanceof Error ? err.message : String(err);
            console.warn("MTG database lookup failed", dbError);
            dataAvailable = false;
        }

        if (archetypes.length === 0) {
            try {
                const rawArchetypes = await dbSelect(
                    INSFORGE_URL,
                    INSFORGE_ANON_KEY,
                    "mtg_archetypes",
                    {
                        select: "id,name,strategy,tier,key_cards",
                        format_slug: `eq.${safeFormat}`,
                        is_active: "eq.true",
                        order: "tier.asc",
                        limit: "50",
                    }
                );
                archetypes = rawArchetypes as Archetype[];
            } catch {
                // Archetype data is helpful but not required for structural validation.
            }
        }

        // ── Stats ──────────────────────────────────────────────────────────────────
        let avgCmc: number | null = null;
        let colorIdentity: string[] = [];
        let illegalCards: string[] = [];
        const cardMap = new Map<string, CardData>();

        {
            for (const card of dbCards) {
                cardMap.set(normalizeCardName(card.name), card);
            }

            // Cards not found in our local DB — try Scryfall as fallback
            const notInDb = uniqueNames.filter((n) => !cardMap.has(normalizeCardName(n)));

            let trulyNotFound: string[] = notInDb; // pessimistic default
            if (notInDb.length > 0) {
                const { found: sfCards, notFound: sfNotFound } = await fetchScryfallCards(notInDb);
                trulyNotFound = sfNotFound;

                for (const sc of sfCards) {
                    // Merge into dbCards so CMC/color calculations include them
                    const entry: CardData = {
                        oracle_id: sc.oracle_id,
                        name: sc.name,
                        cmc: sc.cmc ?? 0,
                        colors: sc.colors ?? [],
                        type_line: sc.type_line,
                        legalities: sc.legalities,
                    };
                    dbCards.push(entry);
                    cardMap.set(normalizeCardName(sc.name), entry);
                    // Mark as legal if Scryfall confirms it for the target format
                    if (sc.legalities?.[safeFormat] === "legal") {
                        legalOracleIds.add(sc.oracle_id);
                    }
                }
            }

            if (dbCards.length > 0) dataAvailable = true;

            // Illegal = in DB (or Scryfall) but not legal in this format,
            // OR genuinely not found anywhere
            const inDbButIllegal = dbCards
                .filter((c) => !isCardLegal(c, legalOracleIds, safeFormat))
                .map((c) => c.name);
            illegalCards = [
                ...inDbButIllegal,
                ...trulyNotFound.map((n) => `${n} (no encontrada)`),
            ];

            // Avg CMC across main deck copies
            let cmcTotal = 0;
            let cmcCardCount = 0;
            for (const deckCard of main) {
                const card = cardMap.get(normalizeCardName(deckCard.name));
                if (card?.cmc == null) continue;
                cmcTotal += Number(card.cmc) * deckCard.quantity;
                cmcCardCount += deckCard.quantity;
            }
            if (cmcCardCount > 0) {
                avgCmc = cmcTotal / cmcCardCount;
            }

            // Color identity union
            const colors = new Set<string>();
            for (const dc of allCards) {
                const card = cardMap.get(normalizeCardName(dc.name));
                if (card?.colors) card.colors.forEach((c) => colors.add(c));
            }
            colorIdentity = [...colors].sort();
        }

        const copyViolations = getCopyViolations(allCards, cardMap);
        const legalityIssues: string[] = [];
        if (mainCount < 60) legalityIssues.push("El mazo principal tiene menos de 60 cartas.");
        if (sideCount > 15) legalityIssues.push("El sideboard tiene mas de 15 cartas.");
        if (illegalCards.length > 0) legalityIssues.push("Hay cartas no legales o no encontradas en el formato seleccionado.");
        if (copyViolations.length > 0) legalityIssues.push("Hay cartas con mas copias de las permitidas.");
        if (ignoredLines.length > 0) legalityIssues.push("Algunas lineas no se pudieron interpretar como cartas.");

        const isLegal = legalityIssues.length === 0;

        // ── Archetype ──────────────────────────────────────────────────────────────
        const { archetype, confidence } = matchArchetype(uniqueNames, archetypes);

        // ── Insights ───────────────────────────────────────────────────────────────
        const { strengths, weaknesses } = deriveInsights(
            avgCmc,
            colorIdentity.length,
            sideCount,
            archetype?.strategy ?? null
        );

        // ── Recommendations ────────────────────────────────────────────────────────
        const recommendations: Recommendation[] = [];
        let similarMetaDecks: SimilarMetaDeck[] = [];

        try {
            const metaResult = await findSimilarMetaDecks(INSFORGE_URL, INSFORGE_ANON_KEY, {
                formatSlug: safeFormat,
                main,
                sideboard,
                archetypes,
                matchedArchetype: archetype ?? null,
            });
            similarMetaDecks = metaResult.similar;
            recommendations.push(...metaResult.recommendations);
        } catch {
            // Meta deck comparison is additive; the agent can still analyze without it.
        }

        // ── LLM enrichment (best-effort, falls back to rule-based) ────────────────
        let llmResult: LLMEnrichment | null = null;
        if (INSFORGE_AI_KEY) try {
            llmResult = await callLLM(INSFORGE_URL, INSFORGE_AI_KEY, {
                main,
                sideboard,
                formatSlug: safeFormat,
                avgCmc,
                colorIdentity,
                archetype: archetype ?? null,
                confidence,
                allArchetypes: archetypes,
                similarMetaDecks,
                ruleStrengths: strengths,
                ruleWeaknesses: weaknesses,
            });
        } catch {
            // LLM failure is non-fatal — fall through to rule-based output
        }

        const rawRecommendations = [
            ...recommendations,
            ...(llmResult?.recommendations ?? []),
        ];
        const validatedRecommendations = rawRecommendations.length
            ? await validateRecommendations(rawRecommendations, {
                cardMap,
                legalOracleIds,
                formatSlug: safeFormat,
                deckCardNames: new Set(allCards.map((c) => normalizeCardName(c.name))),
            })
            : { recommendations, discarded: 0, unverified: 0 };

        // ── Notes ──────────────────────────────────────────────────────────────────
        let analysisNotes: string;
        if (llmResult?.analysis_notes) {
            analysisNotes = llmResult.analysis_notes;
        } else if (!dataAvailable) {
            analysisNotes = "Los datos de cartas no están disponibles temporalmente. Intenta nuevamente más tarde.";
        } else if (!archetype) {
            analysisNotes =
                "Ningún arquetipo conocido coincidió con alta confianza. Tu mazo puede ser un híbrido o una construcción propia — ¡sigue refinándolo!";
        } else {
            analysisNotes = `Coincidencia con ${archetype.name}: ${Math.round(confidence * 100)}% de superposición en cartas clave.`;
        }

        if (validatedRecommendations.discarded > 0) {
            analysisNotes += ` Se omitieron ${validatedRecommendations.discarded} sugerencias porque no se pudieron verificar como cartas reales, legales o presentes en el mazo.`;
        }
        if (validatedRecommendations.unverified > 0) {
            analysisNotes += ` ${validatedRecommendations.unverified} sugerencias quedaron marcadas como no verificadas.`;
        }

        const finalStrengths = llmResult?.strengths?.length ? llmResult.strengths : strengths;
        const finalWeaknesses = llmResult?.weaknesses?.length ? llmResult.weaknesses : weaknesses;
        const protectedCardNames = new Set([
            ...(archetype?.key_cards ?? []),
            ...similarMetaDecks.flatMap((deck) => deck.shared_cards ?? []),
        ].map((name) => normalizeCardName(name)));
        const balancedRecommendations = balanceSwapRecommendations(validatedRecommendations.recommendations, {
            main,
            sideboard,
            cardMap,
            protectedCardNames,
        });
        if (balancedRecommendations.autoCuts > 0) {
            analysisNotes += ` Se agregaron ${balancedRecommendations.autoCuts} cortes balanceados para mantener la lista dentro del tamano recomendado.`;
        }
        const finalRecommendations = balancedRecommendations.recommendations;

        let recommendationsWithMarketData = finalRecommendations;
        try {
            const marketDataByName = await fetchRecommendationMarketData(
                INSFORGE_URL,
                INSFORGE_ANON_KEY,
                finalRecommendations.map((rec) => rec.card_name)
            );
            recommendationsWithMarketData = finalRecommendations.map((rec) => ({
                ...rec,
                market_data: marketDataByName.get(normalizeCardName(rec.card_name)) ?? null,
            }));
        } catch {
            recommendationsWithMarketData = finalRecommendations.map((rec) => ({
                ...rec,
                market_data: null,
            }));
        }

        const response: AnalysisResponse = {
            format_slug: safeFormat,
            deck_name: safeDeckName,
            archetype_detected: archetype?.name ?? null,
            strategy_detected: archetype?.strategy ?? null,
            tier_detected: archetype?.tier ?? null,
            confidence_score: Math.round(confidence * 100) / 100,
            strengths: finalStrengths,
            weaknesses: finalWeaknesses,
            recommendations: recommendationsWithMarketData,
            similar_meta_decks: similarMetaDecks,
            deck_stats: {
                main_count: mainCount,
                sideboard_count: sideCount,
                avg_cmc: avgCmc !== null ? Math.round(avgCmc * 100) / 100 : null,
                color_identity: colorIdentity,
                is_legal: isLegal,
                illegal_cards: illegalCards,
                copy_violations: copyViolations,
                legality_issues: legalityIssues,
            },
            analysis_notes: analysisNotes,
            data_available: dataAvailable,
            llm_used: llmResult !== null,
            deck_hash: deckHash,
        };

        return jsonResponse(req, response);
    } catch (err) {
        console.error("analyze-deck failed", err);
        return jsonResponse(req, { error: "Internal server error" }, 500);
    }
}
