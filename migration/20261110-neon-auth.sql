BEGIN;

-- Preserve the original policies while switching their runtime roles to Neon.
DO $$
DECLARE p record; roles_sql text;
BEGIN
    FOR p IN SELECT * FROM pg_policies WHERE schemaname = 'public' LOOP
        SELECT string_agg(CASE role_name
            WHEN 'insforge_anon' THEN 'anonymous'
            WHEN 'insforge_authenticated' THEN 'authenticated'
            WHEN 'public' THEN 'PUBLIC'
            ELSE quote_ident(role_name) END, ', ')
        INTO roles_sql FROM unnest(p.roles) AS role_name;
        EXECUTE format('ALTER POLICY %I ON %I.%I TO %s', p.policyname, p.schemaname, p.tablename, roles_sql);
    END LOOP;
END $$;

GRANT USAGE ON SCHEMA public, auth TO anonymous, authenticated;
GRANT SELECT ON public.blog_posts, public.blog_post_translations,
    public.blog_tags, public.blog_tag_translations, public.blog_post_tags,
    public.mtg_cards, public.mtg_card_legalities, public.mtg_card_market_data,
    public.mtg_formats, public.mtg_archetypes, public.mtg_meta_decks,
    public.mtg_meta_deck_cards TO anonymous, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_boards,
    public.kanban_columns, public.kanban_cards, public.kanban_card_labels,
    public.places, public.place_items, public.mtg_user_decks,
    public.mtg_user_deck_cards, public.mtg_analysis_runs,
    public.mtg_analysis_recommendations TO authenticated;
REVOKE ALL ON auth.users FROM PUBLIC, anonymous, authenticated;
GRANT EXECUTE ON FUNCTION public.places_with_item_counts(),
    public.kanban_reorder_cards(jsonb), public.mtg_consume_analysis_quota()
    TO authenticated;

-- Verified Google identities recover their historical application UUID.
-- Read managed identities without writing to neon_auth.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE subject text; historical_id uuid;
BEGIN
    subject := auth.jwt() ->> 'sub';
    IF subject IS NULL OR subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN NULL; END IF;
    SELECT old_user.id INTO historical_id
    FROM neon_auth."user" identity_user
    JOIN auth.users old_user ON lower(old_user.email) = lower(identity_user.email)
    WHERE identity_user.id = subject::uuid AND identity_user."emailVerified" = true;
    RETURN coalesce(historical_id, subject::uuid);
END $$;

CREATE OR REPLACE FUNCTION public.ensure_app_user() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE identity_user neon_auth."user"%ROWTYPE; app_user auth.users%ROWTYPE; subject text;
BEGIN
    subject := auth.jwt() ->> 'sub';
    IF subject IS NULL OR subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO identity_user FROM neon_auth."user" WHERE id = subject::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid identity' USING ERRCODE = '42501'; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(identity_user.email), 0));
    SELECT * INTO app_user FROM auth.users WHERE lower(email) = lower(identity_user.email);
    IF FOUND THEN
        IF app_user.id <> identity_user.id AND NOT identity_user."emailVerified" THEN
            RAISE EXCEPTION 'Verify your email before accessing existing data' USING ERRCODE = '42501';
        END IF;
    ELSE
        INSERT INTO auth.users (id, email, email_verified, profile)
        VALUES (identity_user.id, identity_user.email, identity_user."emailVerified",
            jsonb_build_object('name', identity_user.name, 'avatar_url', identity_user.image))
        RETURNING * INTO app_user;
    END IF;
    RETURN jsonb_build_object('id', app_user.id, 'email', identity_user.email,
        'name', identity_user.name, 'avatar_url', identity_user.image);
END $$;

REVOKE ALL ON FUNCTION public.ensure_app_user() FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.ensure_app_user() TO authenticated;
COMMIT;
