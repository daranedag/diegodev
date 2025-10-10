// src/pages/Blog.jsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BlogList from '../components/Blog/BlogList';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const Blog = ({ isDark, toggleTheme }) => {
    const { t, i18n } = useTranslation();

    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Header isDark={isDark} toggleTheme={toggleTheme} />
            <main className="flex-grow">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                    <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-light dark:text-text-dark">
                            {t('blog.title', 'Blog')}
                        </h1>
                        <p className="mt-6 text-lg text-text-light/70 dark:text-text-dark/70">
                            {t('blog.description', 'Thoughts, ideas, and insights about development, technology, and more.')}
                        </p>
                    </div>
                    <BlogList currentLanguage={i18n.language} />
                </div>
            </main>
            <Footer />
        </div>
    );
};

Blog.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Blog;