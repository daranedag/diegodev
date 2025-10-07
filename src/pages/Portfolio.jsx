import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Project from '../components/Portfolio/Project';
import PropTypes from 'prop-types';

const Portfolio = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();
    const projects = ["project1", "project2", "project3", "project4"];
    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <Header isDark={isDark} toggleTheme={toggleTheme} />
                <main className="flex-grow">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-light dark:text-text-dark">{t('portfolio.title')}</h1>
                            <p className="mt-6 text-lg text-text-light/70 dark:text-text-dark/70">{t('portfolio.description')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {projects.map((project, index) => (
                                <Project
                                    key={index}
                                    title={t(`portfolio.${project}.title`)}
                                    description={t(`portfolio.${project}.description`)}
                                    link={t(`portfolio.${project}.link`) || '#'}
                                />
                            ))}
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

Portfolio.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Portfolio;
