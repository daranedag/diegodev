import { insforge } from '../lib/insforge.js';

const ANALYSIS_CACHE_VERSION = 'mtg-agent-v3-market-tooltips';

function normalizeDecklistForHash(rawDecklist, formatSlug) {
    const normalizedLines = rawDecklist
        .split('\n')
        .map((line) => line.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
        .join('\n');
    return `${ANALYSIS_CACHE_VERSION}\n${formatSlug}\n${normalizedLines}`;
}

async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Service layer for the MTG Agent module.
 * Follows the same static-class pattern as PlacesService.
 */
export class MtgAgentService {
    static async getDeckHash(rawDecklist, formatSlug) {
        return sha256Hex(normalizeDecklistForHash(rawDecklist, formatSlug));
    }

    /**
     * Invokes the analyze-deck edge function and returns the analysis result.
     * @param {string} rawDecklist - Raw paste (Arena or plain text format)
     * @param {string} formatSlug  - 'standard' | 'modern' | 'pauper'
     * @param {string|null} deckName - Optional deck label
     */
    static async analyzeDecklist(rawDecklist, formatSlug, deckName = null) {
        const { data, error } = await insforge.functions.invoke('analyze-deck', {
            body: {
                raw_decklist: rawDecklist,
                format_slug: formatSlug,
                deck_name: deckName,
            },
        });
        if (error) throw new Error(error.message ?? 'Analysis failed');
        return data;
    }

    /**
     * Persists a completed analysis run for the authenticated user.
     * Called automatically after a successful analyzeDecklist() response.
     * @param {string} userId
     * @param {string} formatSlug
     * @param {object} analysisData - Full response from the edge function
     * @param {string|null} deckId  - Optional linked user deck id
     */
    static async saveAnalysisRun(userId, formatSlug, analysisData, deckId = null) {
        const { data, error } = await insforge.database
            .from('mtg_analysis_runs')
            .insert([{
                user_id: userId,
                deck_id: deckId,
                format_slug: formatSlug,
                status: 'completed',
                archetype_detected: analysisData.archetype_detected,
                strategy_detected: analysisData.strategy_detected,
                tier_detected: analysisData.tier_detected,
                confidence_score: analysisData.confidence_score,
                strengths: analysisData.strengths,
                weaknesses: analysisData.weaknesses,
                analysis_data: analysisData,
                deck_hash: analysisData.deck_hash,
            }])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Returns the most recent analysis runs for the authenticated user.
     * Includes the related deck name via a join.
     * @param {number} limit
     */
    static async getAnalysisHistory(limit = 12) {
        const { data, error } = await insforge.database
            .from('mtg_analysis_runs')
            .select(
                'id, format_slug, archetype_detected, strategy_detected, tier_detected, confidence_score, analysis_data, deck_id, created_at, mtg_user_decks(name)'
            )
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw new Error(error.message);
        return data ?? [];
    }

    /**
     * Returns a cached completed analysis for the current user and deck hash.
     */
    static async getCachedAnalysisRun(deckHash, userId) {
        const { data, error } = await insforge.database
            .from('mtg_analysis_runs')
            .select('id, analysis_data, created_at')
            .eq('user_id', userId)
            .eq('deck_hash', deckHash)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        return data ?? null;
    }

    /**
     * Saves a deck to the user's library (optional, tied to an analysis).
     */
    static async saveDeck(userId, name, formatSlug, rawDecklist) {
        const { data, error } = await insforge.database
            .from('mtg_user_decks')
            .insert([{ user_id: userId, name, format_slug: formatSlug, raw_decklist: rawDecklist }])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    /**
     * Deletes a single analysis run by id.
     */
    static async deleteAnalysisRun(id) {
        const { error } = await insforge.database
            .from('mtg_analysis_runs')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
    }
}
