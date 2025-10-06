import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Aside from '../components/Bio/Aside';
import MainData from '../components/Bio/MainData';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PropTypes from 'prop-types';


const Bio = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();

    // Calcular edad dinámicamente basado en fecha de nacimiento
    const age = useMemo(() => {
        const birthDate = new Date(1989, 1, 6); // Mes 1 = Febrero (0-indexed)
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        // Ajustar si aún no ha cumplido años este año
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
        }

        return calculatedAge;
    }, []);

    const ageExperience = useMemo(() => {
        const startDate = new Date(2015, 3, 14); // Mes 0 = Enero (0-indexed)
        const today = new Date();
        let calculatedExperience = today.getFullYear() - startDate.getFullYear();
        const monthDiff = today.getMonth() - startDate.getMonth();

        // Ajustar si aún no ha cumplido años este año
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < startDate.getDate())) {
            calculatedExperience--;
        }

        return calculatedExperience;
    }, []);

    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <Header isDark={isDark} toggleTheme={toggleTheme} />

                <main className="flex-1">
                    <div className="container mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
                        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-16">
                            <Aside />
                            <MainData age={age} ageExperience={ageExperience} />
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </>
    );
}

Bio.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Bio;
