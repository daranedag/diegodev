-- Keep the imported role objects while Neon provisions its own API roles.
-- No memberships are granted to the database owner.
BEGIN;
ALTER ROLE authenticated RENAME TO insforge_authenticated;
ALTER ROLE anon RENAME TO insforge_anon;
COMMIT;
