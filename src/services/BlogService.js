import { supabase } from '../lib/supabase.js'

export class BlogService {
    /**
     * Obtener todos los posts publicados con paginación
     * @param {string} language - Código del idioma ('es', 'en')
     * @param {number} page - Página actual (empieza en 0)
     * @param {number} limit - Número de posts por página
     * @param {string} category - Slug de categoría (opcional)
     * @param {string} tag - Slug de tag (opcional)
     */
    static async getPosts({
        language = 'es',
        page = 0,
        limit = 10,
        category = null,
        tag = null
    } = {}) {
        try {
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
                `)
                .eq('status', 'published')
                .eq('blog_post_translations.language_code', language)
                .eq('blog_post_tags.blog_tags.blog_tag_translations.language_code', language)
                .order('published_at', { ascending: false })
                .range(page * limit, (page + 1) * limit - 1);

            // Filtrar por categoría si se especifica
            if (category) {
                // Aquí agregarías el filtro por categoría cuando implementes esa funcionalidad
            }

            // Filtrar por tag si se especifica
            if (tag) {
                query = query.eq('blog_post_tags.blog_tags.slug', tag);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                posts: data,
                totalCount: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            };
        } catch (error) {
            console.error('Error fetching posts:', error);
            throw error;
        }
    }

    /**
     * Obtener un post específico por slug
     * @param {string} slug - Slug del post
     * @param {string} language - Código del idioma
     */
    static async getPostBySlug(slug, language = 'es') {
        try {
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
                    ),
                    blog_post_tags(
                        blog_tags(
                            slug,
                            blog_tag_translations!inner(name)
                        )
                    )
                `)
                .eq('slug', slug)
                .eq('status', 'published')
                .eq('blog_post_translations.language_code', language)
                .eq('blog_post_tags.blog_tags.blog_tag_translations.language_code', language)
                .single();

            if (error) throw error;

            // Incrementar views
            await this.incrementViews(data.id);

            return data;
        } catch (error) {
            console.error('Error fetching post:', error);
            throw error;
        }
    }

    /**
     * Incrementar el contador de vistas de un post
     * @param {string} postId - ID del post
     */
    static async incrementViews(postId) {
        try {
            const { error } = await supabase.rpc('increment_post_views', {
                post_id: postId
            });

            if (error) throw error;
        } catch (error) {
            console.error('Error incrementing views:', error);
            // No lanzar error aquí para no afectar la carga del post
        }
    }

    /**
     * Obtener todos los tags con sus traducciones
     * @param {string} language - Código del idioma
     */
    static async getTags(language = 'es') {
        try {
            const { data, error } = await supabase
                .from('blog_tags')
                .select(`
                    id,
                    slug,
                    blog_tag_translations!inner(name)
                `)
                .eq('blog_tag_translations.language_code', language)
                .order('blog_tag_translations.name');

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching tags:', error);
            throw error;
        }
    }

    /**
     * Buscar posts por texto
     * @param {string} searchTerm - Término de búsqueda
     * @param {string} language - Código del idioma
     * @param {number} limit - Límite de resultados
     */
    static async searchPosts(searchTerm, language = 'es', limit = 10) {
        try {
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
                        meta_description
                    )
                `)
                .eq('status', 'published')
                .eq('blog_post_translations.language_code', language)
                .or(`blog_post_translations.title.ilike.%${searchTerm}%,blog_post_translations.excerpt.ilike.%${searchTerm}%,blog_post_translations.content.ilike.%${searchTerm}%`)
                .order('published_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error searching posts:', error);
            throw error;
        }
    }

    /**
     * Obtener posts relacionados (por tags similares)
     * @param {string} postId - ID del post actual
     * @param {string} language - Código del idioma
     * @param {number} limit - Número de posts relacionados
     */
    static async getRelatedPosts(postId, language = 'es', limit = 3) {
        try {
            // Esta es una consulta más compleja que podrías implementar más adelante
            // Por ahora, devolvemos los posts más recientes excluyendo el actual
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
                .eq('blog_post_translations.language_code', language)
                .neq('id', postId)
                .order('published_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching related posts:', error);
            throw error;
        }
    }
}

export default BlogService;