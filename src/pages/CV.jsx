import React from 'react';
import Educacion from '../components/CV/Educacion';
import Skills from '../components/CV/Skills';
import Experiencia from '../components/CV/Experiencia';
import Logros from '../components/CV/Logros';
import Resumen from '../components/CV/Resumen';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';

const CV = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();

    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <Header isDark={isDark} toggleTheme={toggleTheme} />
                <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
                            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('cv.title')}</h2>
                            <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 dark:focus:ring-offset-background-dark transition-all" href="#">
                                <span className="material-symbols-outlined text-base">download</span>
                                Download PDF
                            </a>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="md:col-span-1 space-y-10">
                                <Resumen />
                                <Educacion />
                                <Skills />
                            </div>
                            <div className="md:col-span-2 space-y-10">
                                <Experiencia />
                                <Logros />
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default CV;
