import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import BlogService from '../../services/BlogService';
import PropTypes from 'prop-types';

const BlogList = ({ currentLanguage = 'es' }) => {
    const { t, i18n } = useTranslation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const locale = currentLanguage === 'es' ? es : enUS;

    useEffect(() => {
        fetchPosts();
    }, [currentLanguage, currentPage]);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const result = await BlogService.getPosts({
                language: currentLanguage || i18n.language,
                page: currentPage,
                limit: 6
            });

            setPosts(result.posts);
            setTotalPages(result.totalPages);
            setError(null);
        } catch (err) {
            console.error('Error fetching posts:', err);
            setError('Error cargando los posts del blog');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return format(date, 'MMMM dd, yyyy', { locale });
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                    onClick={fetchPosts}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    Intentar de nuevo
                </button>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                    No hay posts de blog disponibles aún.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Grid de posts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                    <article
                        key={post.id}
                        className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                    >
                        {/* Imagen de portada */}
                        {post.cover_image_url && (
                            <div className="aspect-video overflow-hidden">
                                <img
                                    src={post.cover_image_url}
                                    alt={post.blog_post_translations?.[0]?.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                        )}

                        {/* Contenido del post */}
                        <div className="p-6">
                            {/* Fecha y tiempo de lectura */}
                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                                <time dateTime={post.published_at}>
                                    {formatDate(post.published_at)}
                                </time>
                                {post.reading_time_minutes && (
                                    <span>
                                        {post.reading_time_minutes} min lectura
                                    </span>
                                )}
                            </div>

                            {/* Título */}
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                <Link to={`/blog/${post.slug}`}>
                                    {post.blog_post_translations?.[0]?.title}
                                </Link>
                            </h2>

                            {/* Excerpt */}
                            {post.blog_post_translations?.[0]?.excerpt && (
                                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                                    {post.blog_post_translations[0].excerpt}
                                </p>
                            )}

                            {/* Tags */}
                            {post.blog_post_tags && post.blog_post_tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {post.blog_post_tags.slice(0, 3).map((tagRelation, index) => (
                                        <span
                                            key={index}
                                            className="inline-block px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full"
                                        >
                                            {tagRelation.blog_tags?.blog_tag_translations?.[0]?.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Enlace para leer más */}
                            <Link
                                to={`/pages/Blog/${post.slug}`}
                                className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                            >
                                Leer más
                                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>

                            {/* Vistas */}
                            {post.views_count > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {post.views_count} vistas
                                    </span>
                                </div>
                            )}
                        </div>
                    </article>
                ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-12">
                    {/* Botón anterior */}
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 0}
                        className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Anterior
                    </button>

                    {/* Números de página */}
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg ${currentPage === i
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    {/* Botón siguiente */}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages - 1}
                        className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    );
};

export default BlogList;