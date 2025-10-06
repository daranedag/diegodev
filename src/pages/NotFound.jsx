import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from 'react-i18next';

const NotFound = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
            <Header isDark={isDark} toggleTheme={toggleTheme} />
            <main className="flex-1 flex items-center justify-center">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                    <div className="max-w-md mx-auto text-center">
                        <span className="text-9xl font-bold text-primary">404</span>
                        <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-on-surface-light dark:text-on-surface-dark">
                            {t('notfound.title')}
                        </h1>
                        <p className="mt-4 text-lg text-on-surface-variant-light dark:text-on-surface-variant-dark">
                            {t('notfound.message')}
                        </p>
                        <span className="mt-4 text-sm text-gray-400 dark:text-gray-700">
                            {t('notfound.disclaimer')}
                        </span>
                        <div className="mt-10">
                            <a className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-primary-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark" href="/">
                                <span className="material-symbols-outlined mr-2">home</span>
                                {t('notfound.home')}
                            </a>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
export default NotFound;