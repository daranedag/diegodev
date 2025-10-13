import React, { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BlogService from '../services/BlogService';
import PropTypes from 'prop-types';

const BlogPost = ({ isDark, toggleTheme }) => {
    const { slug } = useParams();
    const { t, i18n } = useTranslation();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);

    const locale = i18n.language === 'es' ? es : enUS;

    useEffect(() => {
        if (slug) {
            fetchPost();
        }
    }, [slug, i18n.language]);

    const fetchPost = async () => {
        try {
            setLoading(true);
            const postData = await BlogService.getPostBySlug(slug, i18n.language);
            setPost(postData);

            // Obtener posts relacionados
            if (postData) {
                try {
                    const related = await BlogService.getRelatedPosts(postData.id, i18n.language);
                    setRelatedPosts(related);
                } catch (relatedError) {
                    // No es un error crítico, continuamos sin posts relacionados
                    console.warn('Error obteniendo posts relacionados:', relatedError);
                }
            }

            setError(null);
        } catch (err) {
            console.error('Error fetching post:', err);
            setError('Post no encontrado');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return format(date, 'MMMM dd, yyyy', { locale });
    };

    if (loading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900">
                <Header isDark={isDark} toggleTheme={toggleTheme} />
                <main className="flex-grow flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !post) {
        return <Navigate to="/pages/Blog.jsx" replace />;
    }

    const postTranslation = post.blog_post_translations?.[0];

    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Header isDark={isDark} toggleTheme={toggleTheme} />

            <main className="flex-grow">
                <article className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                    <div className="max-w-4xl mx-auto">
                        {/* Header del post */}
                        <header className="mb-8">
                            {/* Imagen de portada */}
                            {post.cover_image_url && (
                                <div className="aspect-video mb-8 overflow-hidden rounded-xl">
                                    <img
                                        src={post.cover_image_url}
                                        alt={postTranslation?.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            {/* Título */}
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
                                {postTranslation?.title}
                            </h1>

                            {/* Meta información */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
                                <time dateTime={post.published_at}>
                                    {formatDate(post.published_at)}
                                </time>
                                {post.reading_time_minutes && (
                                    <span>
                                        {post.reading_time_minutes} min lectura
                                    </span>
                                )}
                                {post.views_count > 0 && (
                                    <span>
                                        {post.views_count} vistas
                                    </span>
                                )}
                            </div>

                            {/* Excerpt */}
                            {postTranslation?.excerpt && (
                                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 border-l-4 border-purple-500 pl-4 italic">
                                    {postTranslation.excerpt}
                                </p>
                            )}

                            {/* Tags */}
                            {post.blog_post_tags && post.blog_post_tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {post.blog_post_tags.map((tagRelation, index) => (
                                        <span
                                            key={index}
                                            className="inline-block px-3 py-1 text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full"
                                        >
                                            {tagRelation.blog_tags?.blog_tag_translations?.[0]?.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </header>

                        {/* Contenido del post */}
                        <div
                            className="prose prose-lg dark:prose-invert max-w-none blog-content"
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(postTranslation?.content || '', {
                                    ADD_TAGS: ['iframe'],
                                    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
                                })
                            }}
                        />

                        {/* Posts relacionados */}
                        {relatedPosts.length > 0 && (
                            <section className="mt-16 pt-16 border-t border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                                    {t('blog.relatedPosts', 'Posts relacionados')}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {relatedPosts.map((relatedPost) => (
                                        <article
                                            key={relatedPost.id}
                                            className="group bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                                        >
                                            {relatedPost.cover_image_url && (
                                                <div className="aspect-video overflow-hidden">
                                                    <img
                                                        src={relatedPost.cover_image_url}
                                                        alt={relatedPost.blog_post_translations?.[0]?.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                            )}
                                            <div className="p-4">
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                    <Link to={`/pages/blog/${relatedPost.slug}`}>
                                                        {relatedPost.blog_post_translations?.[0]?.title}
                                                    </Link>
                                                </h3>
                                                {relatedPost.blog_post_translations?.[0]?.excerpt && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                                        {relatedPost.blog_post_translations[0].excerpt}
                                                    </p>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </article>
            </main>

            <Footer />
        </div>
    );
};

BlogPost.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default BlogPost;