// migration/migrate-supabase-to-insforge.mjs
// Exporta datos de Supabase y genera SQL para importar en InsForge via CLI
// Ejecutar con: node migration/migrate-supabase-to-insforge.mjs
// Luego: npx @insforge/cli db import migration/data-export.sql -y

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const SUPABASE_URL = 'https://ajesmsnzzwzokqiqbxii.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqZXNtc256end6b2txaXFieGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDQ2NTMsImV4cCI6MjA3NTYyMDY1M30.joiE-JK2Y6Pn4flxBd42rMfbG3zaXZ12k3ftpi0Gje8'

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Escape a JS value to a SQL literal
function toSql(val) {
    if (val === null || val === undefined) return 'NULL'
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
    if (typeof val === 'number') return String(val)
    // Strings: escape single quotes
    return `'${String(val).replace(/'/g, "''")}'`
}

function rowsToInsert(table, rows, columns) {
    if (!rows || rows.length === 0) return `-- No data for ${table}\n`
    const lines = rows.map(row => {
        const vals = columns.map(col => toSql(row[col])).join(', ')
        return `(${vals})`
    })
    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${lines.join(',\n')};\n`
}

async function fetchAll(table) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) { console.error(`Error leyendo ${table}:`, error.message); process.exit(1) }
    return data || []
}

async function main() {
    console.log('🚀 Exportando datos de Supabase...\n')

    const tags = await fetchAll('blog_tags')
    const tagTrans = await fetchAll('blog_tag_translations')
    const posts = await fetchAll('blog_posts')
    const postTrans = await fetchAll('blog_post_translations')
    const postTags = await fetchAll('blog_post_tags')

    console.log(`  blog_tags: ${tags.length}`)
    console.log(`  blog_tag_translations: ${tagTrans.length}`)
    console.log(`  blog_posts: ${posts.length}`)
    console.log(`  blog_post_translations: ${postTrans.length}`)
    console.log(`  blog_post_tags: ${postTags.length}`)

    let sql = `-- Data migrated from Supabase on ${new Date().toISOString()}\n\n`

    sql += rowsToInsert('blog_tags', tags, ['id', 'slug', 'created_at'])
    sql += '\n'
    sql += rowsToInsert('blog_tag_translations', tagTrans, ['id', 'tag_id', 'language_code', 'name'])
    sql += '\n'
    sql += rowsToInsert('blog_posts', posts, ['id', 'slug', 'cover_image_url', 'published_at', 'views_count', 'reading_time_minutes', 'status', 'created_at', 'updated_at'])
    sql += '\n'
    sql += rowsToInsert('blog_post_translations', postTrans, ['id', 'post_id', 'language_code', 'title', 'excerpt', 'content', 'meta_description'])
    sql += '\n'
    sql += rowsToInsert('blog_post_tags', postTags, ['post_id', 'tag_id'])

    writeFileSync('migration/data-export.sql', sql, 'utf8')
    console.log('\n✅ Exportado a migration/data-export.sql')
    console.log('\nAhora ejecuta:')
    console.log('  npx @insforge/cli db import migration/data-export.sql -y')
}

main().catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
})
