import { supabase } from '../lib/supabase.js'

export class BlogService {
    static async getPosts({
        language = 'es',
        page = 0,
        limit = 10,
        category = null,
        tag = null
    } = {}) {
        try {
            // Normalizar el código de idioma (es-CL -> es, en-US -> en)
            const normalizedLanguage = language.split('-')[0];

            let query = supabase
                .from('blog_posts')
                .select(`
                    id,
                    slug,
                    cover_image_url,
                    published_at,
                    views_count,
                    reading_time_minutes,
                    blog_post_translations!inner(
                        title,
                        excerpt,
                        meta_description
                    ),
                    blog_post_tags(
                        blog_tags(
                            slug,
                            blog_tag_translations!inner(name)
                        )
                    )
                `, { count: 'exact' })
                .eq('status', 'published')
                .eq('blog_post_translations.language_code', normalizedLanguage)
                .order('published_at', { ascending: false })
                .range(page * limit, (page + 1) * limit - 1);

            if (tag) {
                query = query.eq('blog_post_tags.blog_tags.slug', tag);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                posts: data || [],
                totalCount: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
                currentPage: page
            };
        } catch (error) {
            console.error('Error fetching posts:', error);
            throw error;
        }
    }

    static async getPostBySlug(slug, language = 'es') {
        try {
            const normalizedLanguage = language.split('-')[0];

            const { data, error } = await supabase
                .from('blog_posts')
                .select(`
                    id,
                    slug,
                    cover_image_url,
                    published_at,
                    views_count,
                    reading_time_minutes,
                    blog_post_translations!inner(
                        title,
                        excerpt,
                        content,
                        meta_description
                    )
                `)
                .eq('slug', slug)
                .eq('status', 'published')
                .eq('blog_post_translations.language_code', normalizedLanguage)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching post:', error);
            throw error;
        }
    }

    static async getRelatedPosts(postId, language = 'es', limit = 3) {
        try {
            const normalizedLanguage = language.split('-')[0];

            const { data, error } = await supabase
                .from('blog_posts')
                .select(`
                    id,
                    slug,
                    cover_image_url,
                    published_at,
                    blog_post_translations!inner(
                        title,
                        excerpt
                    )
                `)
                .eq('status', 'published')
                .eq('blog_post_translations.language_code', normalizedLanguage)
                .neq('id', postId)
                .order('published_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching related posts:', error);
            throw error;
        }
    }
}

export default BlogService;
