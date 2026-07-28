-- Security hardening for public content, per-user data and MTG analysis.
-- Apply this migration before deploying the hardened analyze-deck function.

BEGIN;

-- Public blog access must never expose drafts or scheduled posts.
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tag_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_blog_posts" ON blog_posts;
DROP POLICY IF EXISTS "public_read_blog_post_translations" ON blog_post_translations;
DROP POLICY IF EXISTS "public_read_blog_tags" ON blog_tags;
DROP POLICY IF EXISTS "public_read_blog_tag_translations" ON blog_tag_translations;
DROP POLICY IF EXISTS "public_read_blog_post_tags" ON blog_post_tags;

CREATE POLICY "public_read_published_blog_posts" ON blog_posts
    FOR SELECT TO anon, authenticated
    USING (
        status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
    );

CREATE POLICY "public_read_published_blog_translations" ON blog_post_translations
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM blog_posts post
            WHERE post.id = blog_post_translations.post_id
              AND post.status = 'published'
              AND (post.published_at IS NULL OR post.published_at <= NOW())
        )
    );

CREATE POLICY "public_read_blog_tags" ON blog_tags
    FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "public_read_blog_tag_translations" ON blog_tag_translations
    FOR SELECT TO anon, authenticated USING (TRUE);

CREATE POLICY "public_read_published_blog_post_tags" ON blog_post_tags
    FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM blog_posts post
            WHERE post.id = blog_post_tags.post_id
              AND post.status = 'published'
              AND (post.published_at IS NULL OR post.published_at <= NOW())
        )
    );

-- Parent and child rows must belong to the same authenticated user.
DROP POLICY IF EXISTS "users_own_columns" ON kanban_columns;
CREATE POLICY "users_own_columns" ON kanban_columns
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM kanban_boards board
            WHERE board.id = kanban_columns.board_id
              AND board.user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM kanban_boards board
            WHERE board.id = kanban_columns.board_id
              AND board.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "users_own_cards" ON kanban_cards;
CREATE POLICY "users_own_cards" ON kanban_cards
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM kanban_columns column_row
            WHERE column_row.id = kanban_cards.column_id
              AND column_row.user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM kanban_columns column_row
            WHERE column_row.id = kanban_cards.column_id
              AND column_row.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "users_own_place_items" ON place_items;
CREATE POLICY "users_own_place_items" ON place_items
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM places place
            WHERE place.id = place_items.place_id
              AND place.user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM places place
            WHERE place.id = place_items.place_id
              AND place.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "owner_all_analysis_runs" ON mtg_analysis_runs;
CREATE POLICY "owner_all_analysis_runs" ON mtg_analysis_runs
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid()
        AND (
            deck_id IS NULL
            OR EXISTS (
                SELECT 1 FROM mtg_user_decks deck
                WHERE deck.id = mtg_analysis_runs.deck_id
                  AND deck.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        AND (
            deck_id IS NULL
            OR EXISTS (
                SELECT 1 FROM mtg_user_decks deck
                WHERE deck.id = mtg_analysis_runs.deck_id
                  AND deck.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "owner_all_deck_cards" ON mtg_user_deck_cards;
CREATE POLICY "owner_all_deck_cards" ON mtg_user_deck_cards
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM mtg_user_decks deck
            WHERE deck.id = mtg_user_deck_cards.deck_id
              AND deck.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM mtg_user_decks deck
            WHERE deck.id = mtg_user_deck_cards.deck_id
              AND deck.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "owner_all_recommendations" ON mtg_analysis_recommendations;
CREATE POLICY "owner_all_recommendations" ON mtg_analysis_recommendations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM mtg_analysis_runs run
            WHERE run.id = mtg_analysis_recommendations.analysis_run_id
              AND run.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM mtg_analysis_runs run
            WHERE run.id = mtg_analysis_recommendations.analysis_run_id
              AND run.user_id = auth.uid()
        )
    );

-- Bound payload sizes. NOT VALID protects new writes immediately without
-- making deployment depend on cleanup of historical rows.
ALTER TABLE kanban_boards
    ADD CONSTRAINT kanban_boards_title_size CHECK (char_length(title) BETWEEN 1 AND 200) NOT VALID;
ALTER TABLE kanban_columns
    ADD CONSTRAINT kanban_columns_title_size CHECK (char_length(title) BETWEEN 1 AND 120) NOT VALID;
ALTER TABLE kanban_cards
    ADD CONSTRAINT kanban_cards_text_size CHECK (
        char_length(title) BETWEEN 1 AND 300
        AND char_length(COALESCE(description, '')) <= 10000
    ) NOT VALID;
ALTER TABLE places
    ADD CONSTRAINT places_text_size CHECK (
        char_length(name) BETWEEN 1 AND 200
        AND char_length(COALESCE(notes, '')) <= 10000
    ) NOT VALID;
ALTER TABLE place_items
    ADD CONSTRAINT place_items_text_size CHECK (
        char_length(name) BETWEEN 1 AND 200
        AND char_length(COALESCE(notes, '')) <= 5000
    ) NOT VALID;
ALTER TABLE mtg_user_decks
    ADD CONSTRAINT mtg_user_decks_payload_size CHECK (
        char_length(name) BETWEEN 1 AND 120
        AND char_length(COALESCE(notes, '')) <= 10000
        AND char_length(COALESCE(raw_decklist, '')) <= 32000
    ) NOT VALID;
ALTER TABLE mtg_analysis_runs
    ADD CONSTRAINT mtg_analysis_runs_payload_size CHECK (
        pg_column_size(COALESCE(analysis_data, '{}'::jsonb)) <= 262144
        AND char_length(COALESCE(error_message, '')) <= 2000
        AND (deck_hash IS NULL OR deck_hash ~ '^[0-9a-f]{64}$')
    ) NOT VALID;

-- Coarse per-user row quotas prevent authenticated bot accounts from growing
-- private tables without bound. Limits can be adjusted here as usage evolves.
CREATE OR REPLACE FUNCTION enforce_user_row_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    row_limit INTEGER;
    current_rows BIGINT;
BEGIN
    row_limit := CASE TG_TABLE_NAME
        WHEN 'kanban_boards' THEN 50
        WHEN 'kanban_columns' THEN 500
        WHEN 'kanban_cards' THEN 5000
        WHEN 'places' THEN 1000
        WHEN 'place_items' THEN 10000
        WHEN 'mtg_user_decks' THEN 200
        WHEN 'mtg_analysis_runs' THEN 1000
        ELSE NULL
    END;
    IF row_limit IS NULL THEN RETURN NEW; END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::TEXT || ':' || TG_TABLE_NAME, 0));
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE user_id = $1', TG_TABLE_NAME)
        INTO current_rows USING NEW.user_id;
    IF current_rows >= row_limit THEN
        RAISE EXCEPTION 'Row quota exceeded for %', TG_TABLE_NAME
            USING ERRCODE = 'program_limit_exceeded';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kanban_boards_user_quota ON kanban_boards;
CREATE TRIGGER kanban_boards_user_quota BEFORE INSERT ON kanban_boards
    FOR EACH ROW EXECUTE FUNCTION enforce_user_row_quota();
DROP TRIGGER IF EXISTS kanban_columns_user_quota ON kanban_columns;
CREATE TRIGGER kanban_columns_user_quota BEFORE INSERT ON kanban_columns
    FOR EACH ROW EXECUTE FUNCTION enforce_user_row_quota();
DROP TRIGGER IF EXISTS kanban_cards_user_quota ON kanban_cards;
CREATE TRIGGER kanban_cards_user_quota BEFORE INSERT ON kanban_cards
    FOR EACH ROW EXECUTE FUNCTION enforce_user_row_quota();
DROP TRIGGER IF EXISTS places_user_quota ON places;
CREATE TRIGGER places_user_quota BEFORE INSERT ON places
    FOR EACH ROW EXECUTE FUNCTION enforce_user_row_quota();
DROP TRIGGER IF EXISTS place_items_user_quota ON place_items;
CREATE TRIGGER place_items_user_quota BEFORE INSERT ON place_items
    FOR EACH ROW EXECUTE FUNCTION enforce_user_row_quota();
DROP TRIGGER IF EXISTS mtg_user_decks_user_quota ON mtg_user_decks;
CREATE TRIGGER mtg_user_decks_user_quota BEFORE INSERT ON mtg_user_decks
    FOR EACH ROW EXECUTE FUNCTION enforce_user_row_quota();
DROP TRIGGER IF EXISTS mtg_analysis_runs_user_quota ON mtg_analysis_runs;
CREATE TRIGGER mtg_analysis_runs_user_quota BEFORE INSERT ON mtg_analysis_runs
    FOR EACH ROW EXECUTE FUNCTION enforce_user_row_quota();

-- Operational ingestion errors are private.
DROP POLICY IF EXISTS "public_read_ingestion_runs" ON mtg_ingestion_runs;

-- Atomic per-user quota used by analyze-deck.
CREATE TABLE IF NOT EXISTS mtg_analysis_rate_limits (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bucket TEXT NOT NULL CHECK (bucket IN ('hour', 'day')),
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    PRIMARY KEY (user_id, bucket, window_start)
);
CREATE INDEX IF NOT EXISTS mtg_analysis_rate_limits_window_idx
    ON mtg_analysis_rate_limits (window_start);

ALTER TABLE mtg_analysis_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE mtg_analysis_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION mtg_consume_analysis_quota()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    current_user_id UUID := auth.uid();
    hour_start TIMESTAMPTZ := date_trunc('hour', NOW());
    day_start TIMESTAMPTZ := date_trunc('day', NOW());
    hour_count INTEGER;
    day_count INTEGER;
BEGIN
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('allowed', FALSE, 'retry_after_seconds', 3600);
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::TEXT, 0));

    SELECT request_count INTO hour_count
    FROM mtg_analysis_rate_limits
    WHERE user_id = current_user_id AND bucket = 'hour' AND window_start = hour_start;

    SELECT request_count INTO day_count
    FROM mtg_analysis_rate_limits
    WHERE user_id = current_user_id AND bucket = 'day' AND window_start = day_start;

    IF COALESCE(hour_count, 0) >= 10 THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (hour_start + INTERVAL '1 hour' - NOW()))::INTEGER)
        );
    END IF;
    IF COALESCE(day_count, 0) >= 30 THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (day_start + INTERVAL '1 day' - NOW()))::INTEGER)
        );
    END IF;

    INSERT INTO mtg_analysis_rate_limits (user_id, bucket, window_start, request_count)
    VALUES (current_user_id, 'hour', hour_start, 1)
    ON CONFLICT (user_id, bucket, window_start)
    DO UPDATE SET request_count = mtg_analysis_rate_limits.request_count + 1;

    INSERT INTO mtg_analysis_rate_limits (user_id, bucket, window_start, request_count)
    VALUES (current_user_id, 'day', day_start, 1)
    ON CONFLICT (user_id, bucket, window_start)
    DO UPDATE SET request_count = mtg_analysis_rate_limits.request_count + 1;

    DELETE FROM mtg_analysis_rate_limits
    WHERE window_start < NOW() - INTERVAL '8 days';

    RETURN jsonb_build_object('allowed', TRUE, 'retry_after_seconds', 0);
END;
$$;

REVOKE ALL ON FUNCTION mtg_consume_analysis_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mtg_consume_analysis_quota() TO authenticated;

-- One transactional request replaces N card updates after a drag operation.
CREATE OR REPLACE FUNCTION kanban_reorder_cards(p_updates JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
    IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'array' OR jsonb_array_length(p_updates) > 500 THEN
        RAISE EXCEPTION 'Invalid reorder payload';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_updates) AS item(id UUID, column_id UUID, position INTEGER)
        LEFT JOIN kanban_cards card ON card.id = item.id
        LEFT JOIN kanban_columns column_row ON column_row.id = item.column_id
        WHERE item.position < 0
           OR card.id IS NULL
           OR card.user_id <> auth.uid()
           OR column_row.id IS NULL
           OR column_row.user_id <> auth.uid()
    ) THEN
        RAISE EXCEPTION 'Invalid or unauthorized card reorder';
    END IF;

    UPDATE kanban_cards card
    SET column_id = item.column_id,
        position = item.position,
        updated_at = NOW()
    FROM jsonb_to_recordset(p_updates) AS item(id UUID, column_id UUID, position INTEGER)
    WHERE card.id = item.id AND card.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION kanban_reorder_cards(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kanban_reorder_cards(JSONB) TO authenticated;

-- Fetch places and item counts in one RLS-protected query.
CREATE OR REPLACE FUNCTION places_with_item_counts()
RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT,
    google_maps_url TEXT,
    phone TEXT,
    instagram TEXT,
    website TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    item_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT
        place.id,
        place.name,
        place.type,
        place.google_maps_url,
        place.phone,
        place.instagram,
        place.website,
        place.notes,
        place.created_at,
        place.updated_at,
        COUNT(item.id)::BIGINT AS item_count
    FROM places place
    LEFT JOIN place_items item
      ON item.place_id = place.id
     AND item.user_id = auth.uid()
    WHERE place.user_id = auth.uid()
    GROUP BY place.id
    ORDER BY place.created_at DESC;
$$;

REVOKE ALL ON FUNCTION places_with_item_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION places_with_item_counts() TO authenticated;

COMMIT;
