import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import FeaturedWork from '../components/FeaturedWork';
import ConnectSection from '../components/ConnectSection';
import Footer from '../components/Footer';
import { useTheme } from '../hooks/useTheme';
const Home = () => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <Header isDark={isDark} toggleTheme={toggleTheme} />

                <main className="flex-1">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                        <Hero />
                        <div className="max-w-3xl mx-auto mt-24" id="about">
                            <p className="text-lg text-gray-900 dark:text-gray-100">
                                Ésta es mi página personal, donde mostraré cosas a modo de
                                experimento, pero con cierto tono profesional. Puedes navegar por
                                los links de arriba para lo que quieras ver.
                            </p>
                            <p className="text-sm mt-4 text-gray-600 dark:text-gray-400">
                                Esta presentación seguro cambiará en algún momento...
                            </p>
                        </div>
                        <FeaturedWork />
                        <ConnectSection />
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default Home;
