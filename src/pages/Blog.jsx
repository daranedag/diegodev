// src/pages/Blog.jsx
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BlogList from '../components/Blog/BlogList';
import { useTranslation } from 'react-i18next';

const Blog = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900">
            <Header isDark={isDark} toggleTheme={toggleTheme} />
            <main className="flex-grow">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-3xl mx-auto text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            {t('blog.title')}
                        </h1>
                        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400">
                            {t('blog.description')}
                        </p>
                    </div>
                    <BlogList />
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Blog;