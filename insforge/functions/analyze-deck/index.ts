// InsForge edge function — MTG Deck Analysis
// Runtime: Deno (compatible with Supabase Edge Functions runtime)
// Deploy: npx @insforge/cli functions deploy analyze-deck
//
// This function:
//   1. Parses a raw decklist (Arena format or plain text)
//   2. Queries mtg_cards & mtg_archetypes from the DB using the REST API
//   3. Computes structural stats, legality, archetype matching, and recommendations
//   4. Returns a structured AnalysisResponse — no writes (frontend persists the run)
//
// NOTE: Global tables have public-read RLS, so the anon key is sufficient here.

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_FORMATS = ["standard", "modern", "pauper"] as const;
type Format = (typeof VALID_FORMATS)[number];

interface DeckCard {
    name: string;
    quantity: number;
    section: "main" | "sideboard";
}

interface Recommendation {
    action: "add" | "remove";
    section: "main" | "sideboard";
    card_name: string;
    quantity_suggested: number;
    reason: string;
    priority: number;
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
    similar_meta_decks: Array<{ name: string; archetype: string; similarity: number }>;
    deck_stats: {
        main_count: number;
        sideboard_count: number;
        avg_cmc: number | null;
        color_identity: string[];
        is_legal: boolean;
        illegal_cards: string[];
    };
    analysis_notes: string;
    data_available: boolean;
}

// ── Deck parser ───────────────────────────────────────────────────────────────
function parseDecklist(raw: string): { main: DeckCard[]; sideboard: DeckCard[] } {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const main: DeckCard[] = [];
    const sideboard: DeckCard[] = [];
    let inSideboard = false;

    for (const line of lines) {
        // Sideboard section markers
        if (/^(sideboard|\/\/\s*sideboard|sb:|side\s*:?|mazo\s*\(side\))$/i.test(line)) {
            inSideboard = true;
            continue;
        }
        // Comment / deck header lines to skip
        if (/^(\/\/|deck\s*$|mazo\s*$)/i.test(line)) continue;

        // Match "4 Card Name (SET) 123" or "4x Card Name" or "4 Card Name"
        const match = line.match(/^(\d+)[x]?\s+(.+?)(?:\s+\([^)]{2,5}\)\s+\d+)?$/);
        if (!match) continue;

        const quantity = parseInt(match[1], 10);
        const name = match[2].trim();
        if (!quantity || !name) continue;

        const card: DeckCard = { name, quantity, section: inSideboard ? "sideboard" : "main" };
        if (inSideboard) sideboard.push(card);
        else main.push(card);
    }

    return { main, sideboard };
}

function totalCards(cards: DeckCard[]): number {
    return cards.reduce((sum, c) => sum + c.quantity, 0);
}

// ── REST helper for reading public DB tables ───────────────────────────────────
async function dbSelect(
    baseUrl: string,
    anonKey: string,
    table: string,
    params: Record<string, string>
): Promise<unknown[]> {
    const url = new URL(`${baseUrl}/api/database/records/${table}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), {
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

// ── Archetype matching ────────────────────────────────────────────────────────
interface Archetype {
    id: string;
    name: string;
    strategy: string;
    tier: number;
    key_cards: string[];
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
            s.push("Very low mana curve — fast and resilient to mana disruption");
            w.push("Limited late-game reach and card advantage");
        } else if (avgCmc < 2.5) {
            s.push("Efficient mana curve — good balance of speed and threat density");
        } else if (avgCmc < 3.5) {
            s.push("Mid-range curve — solid in fair matchups");
            w.push("May struggle to stabilize in time against fast aggro");
        } else {
            s.push("High-powered top-end threats that take over the late game");
            w.push("Vulnerable to early pressure before casting key spells");
        }
    }

    if (colorCount === 1) s.push("Mono-color manabase — maximally consistent");
    if (colorCount >= 3) w.push("3+ color manabase — higher variance from mana issues");

    if (strategy === "combo") {
        s.push("High ceiling when the combo assembles");
        w.push("Vulnerable to interaction and hand disruption");
    }
    if (strategy === "control") {
        s.push("Strong in attrition-based long games");
        w.push("Can struggle against multiple simultaneous threats");
    }

    if (sideCount < 10) w.push("Thin sideboard limits flexibility in best-of-three");

    return { strengths: s, weaknesses: w };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function (req: Request) {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
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

        if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
            throw new Error("Missing INSFORGE_URL or INSFORGE_ANON_KEY env vars");
        }

        const body = await req.json();
        const { raw_decklist, format_slug, deck_name } = body as {
            raw_decklist: string;
            format_slug: string;
            deck_name?: string;
        };

        if (!raw_decklist || typeof raw_decklist !== "string") {
            return new Response(JSON.stringify({ error: "raw_decklist is required" }), {
                status: 400,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            });
        }
        if (!VALID_FORMATS.includes(format_slug as Format)) {
            return new Response(
                JSON.stringify({ error: `format_slug must be one of: ${VALID_FORMATS.join(", ")}` }),
                { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        // ── Parse ──────────────────────────────────────────────────────────────────
        const { main, sideboard } = parseDecklist(raw_decklist);
        const mainCount = totalCards(main);
        const sideCount = totalCards(sideboard);
        const isLegal = mainCount >= 60 && sideCount <= 15;
        const allCards = [...main, ...sideboard];
        const uniqueNames = [...new Set(allCards.map((c) => c.name))];

        // ── Query DB ───────────────────────────────────────────────────────────────
        let dbCards: Array<{ name: string; cmc: number; colors: string[]; oracle_id: string }> = [];
        let archetypes: Archetype[] = [];
        let dataAvailable = false;
        let dbError: string | null = null;

        try {
            // Use PostgREST `in` filter — quote names that contain commas
            const inValues = uniqueNames
                .map((n) => (n.includes(",") ? `"${n.replace(/"/g, '\\"')}"` : n))
                .join(",");

            const rawCards = await dbSelect(INSFORGE_URL, INSFORGE_ANON_KEY, "mtg_cards", {
                select: "oracle_id,name,cmc,colors",
                name: `in.(${inValues})`,
                limit: "1000",
            });

            dbCards = rawCards as typeof dbCards;
            if (dbCards.length > 0) dataAvailable = true;

            if (dataAvailable) {
                const rawArchetypes = await dbSelect(
                    INSFORGE_URL,
                    INSFORGE_ANON_KEY,
                    "mtg_archetypes",
                    {
                        select: "id,name,strategy,tier,key_cards",
                        format_slug: `eq.${format_slug}`,
                        is_active: "eq.true",
                        order: "tier.asc",
                        limit: "50",
                    }
                );
                archetypes = rawArchetypes as Archetype[];
            }
        } catch (err) {
            dbError = err instanceof Error ? err.message : String(err);
            dataAvailable = false;
        }

        // ── Stats ──────────────────────────────────────────────────────────────────
        let avgCmc: number | null = null;
        let colorIdentity: string[] = [];
        let illegalCards: string[] = [];

        if (dataAvailable) {
            const cardMap = new Map(dbCards.map((c) => [c.name.toLowerCase(), c]));

            // Cards not found in DB are considered illegal (simplified check)
            illegalCards = uniqueNames.filter((n) => !cardMap.has(n.toLowerCase()));

            // Avg CMC across main deck copies
            const cmcValues = main.flatMap((dc) => {
                const card = cardMap.get(dc.name.toLowerCase());
                return card?.cmc != null ? Array(dc.quantity).fill(Number(card.cmc)) : [];
            });
            if (cmcValues.length > 0) {
                avgCmc = cmcValues.reduce((a, b) => a + b, 0) / cmcValues.length;
            }

            // Color identity union
            const colors = new Set<string>();
            for (const dc of allCards) {
                const card = cardMap.get(dc.name.toLowerCase());
                if (card?.colors) card.colors.forEach((c) => colors.add(c));
            }
            colorIdentity = [...colors].sort();
        }

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

        if (sideCount < 10 && mainCount >= 60) {
            recommendations.push({
                action: "add",
                section: "sideboard",
                card_name: "Format-appropriate hate pieces",
                quantity_suggested: Math.min(15 - sideCount, 15),
                reason:
                    "Your sideboard has fewer than 10 cards. A full 15-card sideboard maximizes flexibility in best-of-three.",
                priority: 1,
            });
        }

        // ── Notes ──────────────────────────────────────────────────────────────────
        let analysisNotes: string;
        if (!dataAvailable) {
            analysisNotes = dbError
                ? `DB query error: ${dbError}`
                : "Card database not yet populated. Run the ingestion pipeline (Scryfall/MTGJSON) to enable full archetype detection and card-level recommendations.";
        } else if (!archetype) {
            analysisNotes =
                "No known archetype matched with high confidence. Your deck may be a hybrid or a brew — keep refining!";
        } else {
            analysisNotes = `Matched to ${archetype.name} with ${Math.round(confidence * 100)}% key-card overlap.`;
        }

        const response: AnalysisResponse = {
            format_slug,
            deck_name: deck_name ?? null,
            archetype_detected: archetype?.name ?? null,
            strategy_detected: archetype?.strategy ?? null,
            tier_detected: archetype?.tier ?? null,
            confidence_score: Math.round(confidence * 100) / 100,
            strengths,
            weaknesses,
            recommendations,
            similar_meta_decks: [], // TODO: populate from mtg_meta_decks once data is ingested
            deck_stats: {
                main_count: mainCount,
                sideboard_count: sideCount,
                avg_cmc: avgCmc !== null ? Math.round(avgCmc * 100) / 100 : null,
                color_identity: colorIdentity,
                is_legal: isLegal,
                illegal_cards: illegalCards,
            },
            analysis_notes: analysisNotes,
            data_available: dataAvailable,
        };

        return new Response(JSON.stringify(response), {
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
            { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
}
