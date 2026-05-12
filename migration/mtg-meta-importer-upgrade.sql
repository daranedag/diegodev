-- MTGTop8 weekly importer support.
-- Adds stable source identity and precomputed scores so analyze-deck can query
-- the strongest representative lists first.

ALTER TABLE mtg_archetypes
    ADD COLUMN IF NOT EXISTS source_external_id TEXT,
    ADD COLUMN IF NOT EXISTS meta_share NUMERIC,
    ADD COLUMN IF NOT EXISTS popularity_score NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;

ALTER TABLE mtg_meta_decks
    ADD COLUMN IF NOT EXISTS source_external_id TEXT,
    ADD COLUMN IF NOT EXISTS mtgtop8_archetype_id TEXT,
    ADD COLUMN IF NOT EXISTS meta_share NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS popularity_score NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS competitive_score NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rank_numeric INT,
    ADD COLUMN IF NOT EXISTS main_count INT,
    ADD COLUMN IF NOT EXISTS sideboard_count INT,
    ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE mtg_meta_deck_cards
    ADD COLUMN IF NOT EXISTS deck_card_score NUMERIC DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS mtg_meta_decks_source_external_uidx
    ON mtg_meta_decks (source, source_external_id);

CREATE INDEX IF NOT EXISTS mtg_meta_decks_format_score_idx
    ON mtg_meta_decks (format_slug, is_active, competitive_score DESC, recorded_at DESC);

CREATE INDEX IF NOT EXISTS mtg_archetypes_source_external_idx
    ON mtg_archetypes (format_slug, source_external_id);

ALTER TABLE mtg_ingestion_runs
    DROP CONSTRAINT IF EXISTS mtg_ingestion_runs_source_check;

ALTER TABLE mtg_ingestion_runs
    ADD CONSTRAINT mtg_ingestion_runs_source_check
    CHECK (source IN ('scryfall_bulk', 'mtgjson', 'manual', 'mtgtop8'));
