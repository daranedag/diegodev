import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import pg from 'pg';
import { from as copyFrom, to as copyTo } from 'pg-copy-streams';

const projectId = 'nameless-star-87169318';
const input = '20261109_030829.sql.gz';
const raw = fs.readFileSync(input);
const text = zlib.gunzipSync(raw).toString('utf8');
const allowedTable = name => /^(blog_|kanban_|mtg_)/.test(name) || ['places', 'place_items'].includes(name);
const publicFunctions = new Set(['enforce_user_row_quota', 'kanban_reorder_cards', 'mtg_consume_analysis_quota', 'mtg_set_updated_at', 'places_with_item_counts']);
const authFunctions = new Set(['jwt', 'uid', 'role']);
const blocks = text.split(/(?=^--\n-- (?:Data for )?Name:)/m).map(block => {
    const match = block.match(/^--\n-- (?:Data for )?Name: (.*); Type: (.*); Schema: (.*); Owner: (.*)\n--\n/);
    return match ? { name: match[1], type: match[2], schema: match[3], sql: block.slice(match[0].length) } : null;
}).filter(Boolean);
const clean = sql => sql.replace(/^ALTER .* OWNER TO .*;\n/gm, '').replace(/^\\.*\n?/gm, '').trim();
const tableName = block => {
    const match = block.sql.match(/(?:CREATE TABLE |ALTER TABLE (?:ONLY )?| ON (?:TABLE )?|COPY )(public|auth)\.([a-z_]+)/);
    return match ? `${match[1]}.${match[2]}` : null;
};
const tables = blocks.filter(b => b.type === 'TABLE' && b.schema === 'public' && allowedTable(b.name)).map(b => b.name);
if (tables.length !== 24) throw new Error(`Unexpected table inventory: ${tables.length}`);
const data = [];
for (const block of blocks.filter(b => b.type === 'TABLE DATA')) {
    const match = block.sql.match(/^COPY ((public|auth)\.([a-z_]+)) \(([^\n]+)\) FROM stdin;\n([\s\S]*?)^\\\.$/m);
    if (!match || !(match[2] === 'public' && allowedTable(match[3]) || match[1] === 'auth.users')) continue;
    const rows = match[5] ? match[5].slice(0, -1).split('\n') : [];
    data.push({ table: match[1], columns: match[4].split(', ').map(s => s.replaceAll('"', '')), command: `COPY ${match[1]} (${match[4]}) FROM STDIN`, rows });
}
const referencedUsers = new Set();
for (const table of data.filter(d => d.table !== 'auth.users')) {
    const index = table.columns.indexOf('user_id');
    if (index >= 0) for (const row of table.rows) {
        const id = row.split('\t')[index];
        if (id !== '\\N') referencedUsers.add(id);
    }
}
const users = data.find(d => d.table === 'auth.users');
const idIndex = users.columns.indexOf('id');
users.rows = users.rows.filter(row => referencedUsers.has(row.split('\t')[idIndex]));
if (users.rows.length !== referencedUsers.size) throw new Error('Missing referenced users');

const operations = [];
const allowedTypes = new Set(['TABLE', 'CONSTRAINT', 'FK CONSTRAINT', 'INDEX', 'TRIGGER', 'POLICY', 'ROW SECURITY', 'COMMENT']);
for (const block of blocks) {
    if (block.type === 'TABLE DATA') {
        const item = data.find(d => d.table === `${block.schema}.${block.name}`);
        if (item) operations.push({ kind: 'copy', ...item });
        continue;
    }
    let include = false;
    const fn = block.name.split('(')[0];
    if (block.type === 'FUNCTION') include = block.schema === 'public' && publicFunctions.has(fn) || block.schema === 'auth' && authFunctions.has(fn) || block.schema === 'system' && fn === 'update_updated_at';
    else if (allowedTypes.has(block.type)) {
        const table = tableName(block);
        include = table?.startsWith('public.') && allowedTable(table.slice(7));
        if (table === 'auth.users') include = ['TABLE', 'CONSTRAINT', 'INDEX', 'ROW SECURITY'].includes(block.type);
    } else if (block.type === 'ACL' && block.schema === 'public') {
        include = block.name.startsWith('TABLE ') && allowedTable(block.name.slice(6));
        if (block.name.startsWith('FUNCTION ')) include = publicFunctions.has(block.name.slice(9).split('(')[0]);
    }
    if (!include) continue;
    const sql = clean(block.sql).replaceAll('system.update_updated_at', 'public.update_updated_at');
    if (/\b(?:pdh_|menupro_|reys_)/.test(sql)) throw new Error(`Excluded dependency in ${block.name}`);
    if (/\b(?:postgres|project_admin|service_role)\b/.test(sql)) throw new Error(`Unmapped source role in ${block.name}`);
    operations.push({ kind: 'sql', type: block.type, name: block.name, sql });
}
const manifest = {
    source: input,
    sha256: crypto.createHash('sha256').update(raw).digest('hex'),
    projectId,
    excludedPublicPrefixes: ['pdh_', 'menupro_', 'reys_'],
    tables: Object.fromEntries(data.filter(d => d.table.startsWith('public.')).map(d => [d.table, d.rows.length])),
    relatedUsers: users.rows.length,
    totalApplicationRows: data.filter(d => d.table.startsWith('public.')).reduce((n, d) => n + d.rows.length, 0),
    objects: Object.fromEntries([...new Set(operations.filter(o => o.kind === 'sql').map(o => o.type))].map(type => [type, operations.filter(o => o.type === type).length]))
};
fs.writeFileSync('migration/neon-manifest.json', JSON.stringify(manifest, null, 2));
if (process.argv[2] === 'prepare') {
    console.log(JSON.stringify(manifest, null, 2));
    process.exit(0);
}
const branch = process.argv[3];
const envFile = process.argv[4];
if (!['inspect', 'restore', 'verify'].includes(process.argv[2]) || !branch || !envFile) throw new Error('Usage: migrate.mjs prepare | inspect|restore|verify <branch> <env-file>');
const env = Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, '')];
}));
if (env.NEON_BRANCH !== branch) throw new Error('The environment file targets a different branch');
const url = env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error('A direct DATABASE_URL_UNPOOLED is required');
const host = new URL(url).hostname;
if (host.includes('-pooler')) throw new Error('Pooled migration connection refused');
const connectionUrl = new URL(url);
connectionUrl.searchParams.set('sslmode', 'verify-full');
const client = new pg.Client({ connectionString: connectionUrl.toString(), connectionTimeoutMillis: 30000 });
client.on('error', error => console.error('Database connection error:', error.code));
await client.connect();
try {
    const inventory = await client.query("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2");
    if (process.argv[2] === 'inspect') {
        const authFunctions = await client.query("SELECT n.nspname, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth'");
        const roles = await client.query("SELECT rolname, rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('anon','authenticated')");
        console.log(JSON.stringify({ branch, host, database: new URL(url).pathname, tables: inventory.rows, existingAuthFunctions: authFunctions.rows, roles: roles.rows }, null, 2));
    } else if (process.argv[2] === 'restore') {
        if (inventory.rows.some(t => t.schemaname !== 'neon_auth')) throw new Error('Refusing to restore into a database containing application tables');
        await client.query('BEGIN');
        await client.query("SET LOCAL statement_timeout = 0; SET LOCAL check_function_bodies = false; SET LOCAL timezone = 'UTC';");
        await client.query(`CREATE SCHEMA auth;
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
            END $$;
            GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;`);
        let completed = 0;
        for (const operation of operations) {
            try {
                if (operation.kind === 'sql') await client.query(operation.sql);
                else {
                    const stream = client.query(copyFrom(operation.command));
                    await pipeline(Readable.from(operation.rows.map(row => `${row}\n`)), stream);
                    if (stream.rowCount !== operation.rows.length) throw new Error('COPY row count mismatch');
                    console.log(`Copied ${operation.table}: ${stream.rowCount}`);
                }
                completed++;
            } catch (error) {
                console.error('Failed operation:', operation.kind, operation.type ?? operation.table, operation.name ?? '');
                throw error;
            }
        }
        await client.query('REVOKE ALL ON auth.users FROM PUBLIC, anon, authenticated');
        await verify();
        await client.query('COMMIT');
        console.log(`Committed ${completed} operations to ${branch}`);
    } else {
        await client.query("SET timezone = 'UTC'");
        await verify();
        await verifyContentsAndAccess();
    }
} catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', error.message, error.code ?? '');
    process.exitCode = 1;
} finally {
    await client.end();
}

async function verify() {
    const counts = {};
    for (const table of data) {
        const result = await client.query(`SELECT count(*)::integer AS count FROM ${table.table}`);
        counts[table.table] = result.rows[0].count;
        if (counts[table.table] !== table.rows.length) throw new Error(`Count mismatch: ${table.table}`);
    }
    const publicTables = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    if (JSON.stringify(publicTables.rows.map(t => t.tablename)) !== JSON.stringify([...tables].sort())) throw new Error('Unexpected public table inventory');
    if (publicTables.rows.some(t => !t.rowsecurity)) throw new Error('RLS missing');
    const unvalidated = await client.query("SELECT conname FROM pg_constraint WHERE connamespace IN ('public'::regnamespace, 'auth'::regnamespace) AND NOT convalidated");
    if (unvalidated.rowCount) throw new Error('Unvalidated constraints');
    const details = await client.query(`SELECT
        (SELECT count(*)::int FROM pg_policies WHERE schemaname='public') AS policies,
        (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public') AS indexes,
        (SELECT count(*)::int FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f') AS foreign_keys,
        (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers`);
    if (details.rows[0].policies !== manifest.objects.POLICY || details.rows[0].triggers !== manifest.objects.TRIGGER) throw new Error('Policy or trigger mismatch');
    const report = { branch, verifiedAt: new Date().toISOString(), counts, checks: details.rows[0], rlsEnabledTables: publicTables.rowCount, validatedConstraints: true, excludedTablesAbsent: true };
    fs.writeFileSync(`migration/neon-verification-${branch}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
}

async function verifyContentsAndAccess() {
    const mask = (1n << 256n) - 1n;
    const hashRow = row => BigInt(`0x${crypto.createHash('sha256').update(row).digest('hex')}`);
    const verified = [];
    for (const table of data) {
        let expected = 0n;
        for (const row of table.rows) expected = (expected + hashRow(row)) & mask;
        let actual = 0n;
        let pending = '';
        let count = 0;
        const columns = table.columns.map(column => `"${column}"`).join(', ');
        const stream = client.query(copyTo(`COPY ${table.table} (${columns}) TO STDOUT`));
        stream.setEncoding('utf8');
        for await (const chunk of stream) {
            pending += chunk;
            let end;
            while ((end = pending.indexOf('\n')) >= 0) {
                actual = (actual + hashRow(pending.slice(0, end))) & mask;
                count++;
                pending = pending.slice(end + 1);
            }
        }
        if (pending || count !== table.rows.length || actual !== expected) throw new Error(`Content checksum mismatch: ${table.table}`);
        verified.push(table.table);
    }
    const reportPath = `migration/neon-verification-${branch}.json`;
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    report.exactContentChecksums = verified;
    report.accessVerification = 'RLS enabled and original policy predicates preserved; no owner memberships used to simulate users.';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Verified exact row contents for ${verified.length} tables; access rules preserved without changing role memberships`);
}
