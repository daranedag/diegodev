import { existsSync } from 'node:fs';
import pg from 'pg';

const TABLES = new Set(['mtg_cards', 'mtg_archetypes', 'mtg_meta_decks', 'mtg_meta_deck_cards', 'mtg_card_market_data', 'mtg_ingestion_runs']);
const identifier = value => {
    if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid SQL identifier');
    return `"${value}"`;
};

export function createImportDatabase({ dryRun = false } = {}) {
    for (const file of ['.env.neon.local', '.env']) {
        if (existsSync(file)) process.loadEnvFile(file);
    }
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        if (dryRun) return null;
        throw new Error('Missing DATABASE_URL for the Neon importer');
    }
    const url = new URL(connectionString);
    url.searchParams.set('sslmode', 'verify-full');
    const pool = new pg.Pool({ connectionString: url.toString(), max: 2, allowExitOnIdle: true });
    return {
        from(table) {
            if (!TABLES.has(table)) throw new Error('Table is outside the MTG importer scope');
            return new ImportQuery(pool, table);
        },
        end: () => pool.end(),
    };
}

// Only the query operations used by the two server-side MTG importers.
class ImportQuery {
    constructor(pool, table) {
        this.pool = pool;
        this.table = `public.${identifier(table)}`;
        this.operation = 'select';
        this.columns = '*';
        this.returning = false;
        this.filters = [];
    }
    select(columns = '*') { this.columns = columns; this.returning = true; return this; }
    insert(rows) { this.operation = 'insert'; this.rows = rows; return this; }
    upsert(rows, options) { this.insert(rows); this.conflict = options.onConflict.split(',').map(identifier); return this; }
    update(row) { this.operation = 'update'; this.row = row; return this; }
    delete() { this.operation = 'delete'; return this; }
    eq(column, value) { this.filters.push({ column, value }); return this; }
    in(column, value) { this.filters.push({ column, value, array: true }); return this; }
    order(column, { ascending = true } = {}) { this.sort = `${identifier(column)} ${ascending ? 'ASC' : 'DESC'}`; return this; }
    range(start, end) {
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) throw new Error('Invalid page range');
        this.page = { start, limit: end - start + 1 }; return this;
    }
    single() { this.one = true; return this; }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
    async execute() {
        try {
            const values = [];
            const bind = value => { values.push(value); return `$${values.length}`; };
            const selected = this.columns === '*' ? '*' : this.columns.split(',').map(c => identifier(c.trim())).join(',');
            let sql;
            if (this.operation === 'insert') {
                if (!this.rows.length) return { data: [], error: null };
                const keys = [...new Set(this.rows.flatMap(row => Object.keys(row)))];
                const columns = keys.map(identifier);
                const tuples = this.rows.map(row => `(${keys.map(key => {
                    if (!Object.hasOwn(row, key)) return 'DEFAULT';
                    const value = row[key];
                    return bind(value && typeof value === 'object' && !Array.isArray(value) ? JSON.stringify(value) : value);
                }).join(',')})`);
                sql = `INSERT INTO ${this.table} (${columns}) VALUES ${tuples.join(',')}`;
                if (this.conflict) {
                    const updates = columns.filter(column => !this.conflict.includes(column));
                    sql += ` ON CONFLICT (${this.conflict}) DO ${updates.length ? `UPDATE SET ${updates.map(column => `${column}=EXCLUDED.${column}`).join(',')}` : 'NOTHING'}`;
                }
            } else if (this.operation === 'update') {
                sql = `UPDATE ${this.table} SET ${Object.entries(this.row).map(([column, value]) => `${identifier(column)}=${bind(value)}`).join(',')}`;
            } else if (this.operation === 'delete') sql = `DELETE FROM ${this.table}`;
            else sql = `SELECT ${selected} FROM ${this.table}`;

            if (['update', 'delete'].includes(this.operation) && !this.filters.length) throw new Error('A mutation requires a filter');
            if (this.filters.length) sql += ` WHERE ${this.filters.map(filter => `${identifier(filter.column)} ${filter.array ? `= ANY(${bind(filter.value)})` : `= ${bind(filter.value)}`}`).join(' AND ')}`;
            if (this.operation === 'select') {
                if (this.sort) sql += ` ORDER BY ${this.sort}`;
                if (this.page) sql += ` LIMIT ${bind(this.page.limit)} OFFSET ${bind(this.page.start)}`;
            } else if (this.returning) sql += ` RETURNING ${selected}`;
            const result = await this.pool.query(sql, values);
            if (this.one && result.rows.length !== 1) throw new Error('Expected exactly one database row');
            return { data: this.one ? result.rows[0] : result.rows, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
}
