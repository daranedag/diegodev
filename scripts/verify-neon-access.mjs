import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const envFile = process.argv[2] ?? '.env.neon-migration.local';
process.loadEnvFile(envFile);
const authUrl = process.env.NEON_AUTH_BASE_URL;
const apiUrl = process.env.NEON_DATA_API_URL;
if (!authUrl || !apiUrl) throw new Error('Neon Auth and Data API URLs are required');
if (process.env.NEON_BRANCH !== 'migration-insforge-20261109' &&
    !(process.env.NEON_BRANCH === 'production' && process.argv.includes('--production-fixtures'))) {
    throw new Error('Production fixture tests require --production-fixtures');
}
const origin = 'http://localhost:5173';
const checks = [];
const accounts = [];
const priorIdentities = fs.existsSync('migration/neon-test-identities.json')
    ? JSON.parse(fs.readFileSync('migration/neon-test-identities.json', 'utf8')) : [];

async function authRequest(path, account, body) {
    const response = await fetch(`${authUrl}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: [...account.cookies].map(([key, value]) => `${key}=${value}`).join('; ') },
        body: body ? JSON.stringify(body) : undefined,
    });
    for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0];
        const index = pair.indexOf('=');
        account.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const data = await response.json();
    if (!response.ok) throw new Error(`Auth ${path}: ${response.status} ${data.message ?? data.error?.message ?? ''}`);
    return data;
}

async function api(path, token, { method = 'GET', body } = {}) {
    const response = await fetch(`${apiUrl}/${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null };
}

async function makeAccount() {
    const account = { cookies: new Map(), email: `neon-migration-${crypto.randomUUID()}@example.invalid` };
    const signup = await authRequest('/sign-up/email', account, { email: account.email, password: crypto.randomBytes(24).toString('base64url'), name: 'Disposable migration test' });
    account.id = signup.user.id;
    accounts.push(account);
    fs.writeFileSync('migration/neon-test-identities.json', JSON.stringify([...priorIdentities, ...accounts.map(({ id, email }) => ({ id, email, branch: process.env.NEON_BRANCH }))], null, 2));
    const session = await authRequest('/get-session', account);
    assert.equal(session.user.id, account.id, 'Session survives a subsequent request');
    const token = await authRequest('/token', account);
    account.token = token.token;
    assert.ok(account.token);
    const claims = JSON.parse(Buffer.from(account.token.split('.')[1], 'base64url'));
    assert.ok([authUrl, new URL(authUrl).origin].includes(claims.iss));
    const profile = await api('rpc/ensure_app_user', account.token, { method: 'POST', body: {} });
    assert.equal(profile.status, 200, JSON.stringify(profile.data));
    assert.equal(profile.data.id, account.id);
    assert.equal(profile.data.email, account.email);
    return account;
}

try {
    const publicResponse = await fetch(`${authUrl}/token/anonymous`);
    const { token: anonymous } = await publicResponse.json();
    assert.ok(anonymous);
    const posts = await api('blog_posts?select=id,slug,blog_post_translations(title)&limit=3', anonymous);
    assert.equal(posts.status, 200, JSON.stringify(posts.data));
    assert.ok(posts.data.length > 0);
    const cards = await api('mtg_cards?select=oracle_id,name&limit=2', anonymous);
    assert.equal(cards.status, 200);
    assert.equal(cards.data.length, 2);
    const privateTables = ['kanban_boards', 'places', 'mtg_analysis_runs'];
    for (const table of privateTables) {
        const result = await api(`${table}?select=id&limit=1`, anonymous);
        assert.ok([401, 403].includes(result.status) || result.status === 200 && result.data.length === 0, `Anonymous access to ${table}`);
    }
    const privileged = await api('mtg_ingestion_runs?select=id&limit=1', anonymous);
    assert.ok([401, 403].includes(privileged.status));
    checks.push('Anonymous blog and card reads; private and ingestion access denied');

    const owner = await makeAccount();
    const outsider = await makeAccount();
    checks.push('Two disposable Auth accounts, persisted sessions, JWTs, application profiles');
    const boardId = crypto.randomUUID();
    const create = await api('kanban_boards', owner.token, { method: 'POST', body: { id: boardId, user_id: owner.id, title: 'Disposable isolation check', color: '#7c3aed' } });
    assert.equal(create.status, 201, JSON.stringify(create.data));
    const hidden = await api(`kanban_boards?id=eq.${boardId}&select=id,title`, outsider.token);
    assert.equal(hidden.status, 200);
    assert.deepEqual(hidden.data, []);
    const update = await api(`kanban_boards?id=eq.${boardId}`, outsider.token, { method: 'PATCH', body: { title: 'Unauthorized change' } });
    assert.equal(update.status, 200);
    assert.deepEqual(update.data, []);
    const forged = await api('kanban_boards', outsider.token, { method: 'POST', body: { user_id: owner.id, title: 'Unauthorized ownership' } });
    assert.equal(forged.status, 403, JSON.stringify(forged.data));
    const owned = await api(`kanban_boards?id=eq.${boardId}&select=title`, owner.token);
    assert.equal(owned.data[0].title, 'Disposable isolation check');
    const remove = await api(`kanban_boards?id=eq.${boardId}`, owner.token, { method: 'DELETE' });
    assert.ok([200, 204].includes(remove.status));
    checks.push('Owner CRUD; cross-user reads, updates, and forged ownership blocked');

    const places = await api('rpc/places_with_item_counts', owner.token, { method: 'POST', body: {} });
    assert.equal(places.status, 200, JSON.stringify(places.data));
    assert.deepEqual(places.data, []);
    const quota = await api('rpc/mtg_consume_analysis_quota', owner.token, { method: 'POST', body: {} });
    assert.equal(quota.status, 200, JSON.stringify(quota.data));
    assert.equal(quota.data.allowed, true);
    checks.push('Places and analysis quota RPCs accept Neon identity');
    if (process.argv[3]) {
        const target = process.argv[3];
        const analyze = target.startsWith('https://')
            ? request => fetch(target, { method: request.method, headers: request.headers, body: request.body, duplex: 'half' })
            : (await import(pathToFileURL(resolve(target)).href)).default;
        const request = token => new Request('https://diegodev-api.test/api/analyze-deck', {
            method: 'POST',
            headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ raw_decklist: '60 Mountain', format_slug: 'standard' }),
        });
        assert.equal((await analyze(request(null))).status, 401);
        assert.equal((await analyze(request('not-a-valid-token'))).status, 401);
        const analysis = await analyze(request(owner.token));
        const result = await analysis.json();
        assert.equal(analysis.status, 200, JSON.stringify(result));
        assert.equal(result.data_available, true);
        assert.ok(Array.isArray(result.recommendations));
        checks.push('Analysis handler rejects missing/invalid tokens and analyzes a deck using Neon data');
    }
    for (const account of accounts) {
        await authRequest('/sign-out', account, {});
        const session = await authRequest('/get-session', account);
        assert.ok(!session?.user);
    }
    checks.push('Sign-out clears both sessions');
    fs.writeFileSync(`migration/neon-access-verification-${process.env.NEON_BRANCH}.json`, JSON.stringify({ branch: process.env.NEON_BRANCH, verifiedAt: new Date().toISOString(), checks }, null, 2));
    console.log(checks.join('\n'));
} catch (error) {
    console.error('Access verification failed:', error.message);
    process.exitCode = 1;
}
