-- MTG Meta Decks Seed
-- Starter representative shells for mtg_meta_decks and mtg_meta_deck_cards.
-- Run after mtg-schema.sql and mtg-archetypes-seed.sql:
--   npx @insforge/cli db import migration/mtg-meta-decks-seed.sql -y
--
-- These rows are intentionally marked source='manual_seed'. They activate the
-- similarity engine and can later be replaced by imported tournament lists.

BEGIN;

CREATE TEMP TABLE seed_meta_decks (
    format_slug TEXT,
    archetype_name TEXT,
    deck_name TEXT,
    source TEXT,
    source_url TEXT,
    tournament_name TEXT,
    player_name TEXT,
    recorded_at DATE
) ON COMMIT DROP;

CREATE TEMP TABLE seed_meta_cards (
    deck_name TEXT,
    card_name TEXT,
    quantity INT,
    section TEXT
) ON COMMIT DROP;

INSERT INTO seed_meta_decks
    (format_slug, archetype_name, deck_name, source, source_url, tournament_name, player_name, recorded_at)
VALUES
    ('modern', 'Burn', 'Modern Burn - Representative Meta Shell', 'manual_seed', NULL, 'Representative seed', NULL, '2026-04-20'),
    ('modern', 'Izzet Murktide', 'Izzet Murktide - Representative Meta Shell', 'manual_seed', NULL, 'Representative seed', NULL, '2026-04-20'),
    ('modern', 'Amulet Titan', 'Amulet Titan - Representative Meta Shell', 'manual_seed', NULL, 'Representative seed', NULL, '2026-04-20'),
    ('pauper', 'Burn', 'Pauper Burn - Representative Meta Shell', 'manual_seed', NULL, 'Representative seed', NULL, '2026-04-20'),
    ('pauper', 'Affinity', 'Pauper Affinity - Representative Meta Shell', 'manual_seed', NULL, 'Representative seed', NULL, '2026-04-20'),
    ('pauper', 'Mono Blue Faeries', 'Mono Blue Faeries - Representative Meta Shell', 'manual_seed', NULL, 'Representative seed', NULL, '2026-04-20'),
    ('standard', 'Mono Red Aggro', 'Standard Mono Red Aggro - Representative Meta Shell', 'manual_seed', NULL, 'Representative seed', NULL, '2026-04-20'),
    ('standard', 'Domain Ramp', 'Standard Domain Ramp - Representative Meta Shell', 'manual_seed', NULL, 'Representative seed', NULL, '2026-04-20');

INSERT INTO seed_meta_cards (deck_name, card_name, quantity, section) VALUES
    ('Modern Burn - Representative Meta Shell', 'Goblin Guide', 4, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Monastery Swiftspear', 4, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Eidolon of the Great Revel', 4, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Lightning Bolt', 4, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Lava Spike', 4, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Rift Bolt', 4, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Boros Charm', 4, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Searing Blaze', 4, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Skewer the Critics', 4, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Lightning Helix', 3, 'main'),
    ('Modern Burn - Representative Meta Shell', 'Skullcrack', 3, 'sideboard'),
    ('Modern Burn - Representative Meta Shell', 'Smash to Smithereens', 3, 'sideboard'),
    ('Modern Burn - Representative Meta Shell', 'Roiling Vortex', 3, 'sideboard'),

    ('Izzet Murktide - Representative Meta Shell', 'Dragon''s Rage Channeler', 4, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Ragavan, Nimble Pilferer', 4, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Murktide Regent', 4, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Mishra''s Bauble', 4, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Lightning Bolt', 4, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Counterspell', 4, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Expressive Iteration', 4, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Consider', 4, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Unholy Heat', 4, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Spell Pierce', 2, 'main'),
    ('Izzet Murktide - Representative Meta Shell', 'Blood Moon', 2, 'sideboard'),
    ('Izzet Murktide - Representative Meta Shell', 'Mystical Dispute', 2, 'sideboard'),
    ('Izzet Murktide - Representative Meta Shell', 'Engineered Explosives', 2, 'sideboard'),

    ('Amulet Titan - Representative Meta Shell', 'Primeval Titan', 4, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Amulet of Vigor', 4, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Dryad of the Ilysian Grove', 4, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Arboreal Grazer', 4, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Summoner''s Pact', 4, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Explore', 4, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Urza''s Saga', 4, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Simic Growth Chamber', 4, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Tolaria West', 2, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Vesuva', 2, 'main'),
    ('Amulet Titan - Representative Meta Shell', 'Force of Vigor', 3, 'sideboard'),
    ('Amulet Titan - Representative Meta Shell', 'Dismember', 2, 'sideboard'),
    ('Amulet Titan - Representative Meta Shell', 'Boseiju, Who Endures', 2, 'sideboard'),

    ('Pauper Burn - Representative Meta Shell', 'Monastery Swiftspear', 4, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Kessig Flamebreather', 4, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Thermo-Alchemist', 4, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Lightning Bolt', 4, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Chain Lightning', 4, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Lava Spike', 4, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Rift Bolt', 4, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Fireblast', 4, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Skewer the Critics', 4, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Searing Blaze', 3, 'main'),
    ('Pauper Burn - Representative Meta Shell', 'Smash to Smithereens', 4, 'sideboard'),
    ('Pauper Burn - Representative Meta Shell', 'Pyroblast', 4, 'sideboard'),

    ('Pauper Affinity - Representative Meta Shell', 'Frogmite', 4, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Myr Enforcer', 4, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Thoughtcast', 4, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Galvanic Blast', 4, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Deadly Dispute', 4, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Ichor Wellspring', 4, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Blood Fountain', 4, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Makeshift Munitions', 2, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Seat of the Synod', 4, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Vault of Whispers', 4, 'main'),
    ('Pauper Affinity - Representative Meta Shell', 'Krark-Clan Shaman', 3, 'sideboard'),
    ('Pauper Affinity - Representative Meta Shell', 'Hydroblast', 3, 'sideboard'),

    ('Mono Blue Faeries - Representative Meta Shell', 'Faerie Seer', 4, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Faerie Miscreant', 4, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Spellstutter Sprite', 4, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Ninja of the Deep Hours', 4, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Moon-Circuit Hacker', 4, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Counterspell', 4, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Snap', 4, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Preordain', 4, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Spell Pierce', 2, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Spire Golem', 2, 'main'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Hydroblast', 4, 'sideboard'),
    ('Mono Blue Faeries - Representative Meta Shell', 'Annul', 3, 'sideboard'),

    ('Standard Mono Red Aggro - Representative Meta Shell', 'Monastery Swiftspear', 4, 'main'),
    ('Standard Mono Red Aggro - Representative Meta Shell', 'Play with Fire', 4, 'main'),
    ('Standard Mono Red Aggro - Representative Meta Shell', 'Kumano Faces Kakkazan', 4, 'main'),
    ('Standard Mono Red Aggro - Representative Meta Shell', 'Feldon, Ronom Excavator', 4, 'main'),
    ('Standard Mono Red Aggro - Representative Meta Shell', 'Thundering Raiju', 3, 'main'),
    ('Standard Mono Red Aggro - Representative Meta Shell', 'Nahiri''s Warcrafting', 3, 'main'),
    ('Standard Mono Red Aggro - Representative Meta Shell', 'Abrade', 3, 'sideboard'),
    ('Standard Mono Red Aggro - Representative Meta Shell', 'Lithomantic Barrage', 3, 'sideboard'),

    ('Standard Domain Ramp - Representative Meta Shell', 'Atraxa, Grand Unifier', 4, 'main'),
    ('Standard Domain Ramp - Representative Meta Shell', 'Topiary Stomper', 4, 'main'),
    ('Standard Domain Ramp - Representative Meta Shell', 'Sunfall', 4, 'main'),
    ('Standard Domain Ramp - Representative Meta Shell', 'Nissa, Ascended Animist', 2, 'main'),
    ('Standard Domain Ramp - Representative Meta Shell', 'Leyline Binding', 4, 'main'),
    ('Standard Domain Ramp - Representative Meta Shell', 'Herd Migration', 4, 'main'),
    ('Standard Domain Ramp - Representative Meta Shell', 'Negate', 3, 'sideboard'),
    ('Standard Domain Ramp - Representative Meta Shell', 'Temporary Lockdown', 3, 'sideboard');

INSERT INTO mtg_meta_decks (
    archetype_id,
    format_slug,
    name,
    source,
    source_url,
    tournament_name,
    player_name,
    recorded_at,
    is_active
)
SELECT
    a.id,
    s.format_slug,
    s.deck_name,
    s.source,
    s.source_url,
    s.tournament_name,
    s.player_name,
    s.recorded_at,
    TRUE
FROM seed_meta_decks s
JOIN mtg_archetypes a
    ON a.format_slug = s.format_slug
   AND a.name = s.archetype_name
WHERE NOT EXISTS (
    SELECT 1
    FROM mtg_meta_decks d
    WHERE d.format_slug = s.format_slug
      AND d.name = s.deck_name
      AND d.source = s.source
);

DELETE FROM mtg_meta_deck_cards c
USING mtg_meta_decks d, seed_meta_decks s
WHERE c.meta_deck_id = d.id
  AND d.format_slug = s.format_slug
  AND d.name = s.deck_name
  AND d.source = s.source;

INSERT INTO mtg_meta_deck_cards (meta_deck_id, card_name, quantity, section)
SELECT d.id, c.card_name, c.quantity, c.section
FROM seed_meta_cards c
JOIN seed_meta_decks s ON s.deck_name = c.deck_name
JOIN mtg_meta_decks d
    ON d.format_slug = s.format_slug
   AND d.name = s.deck_name
   AND d.source = s.source;

COMMIT;
