import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import FeaturedWork from '../components/FeaturedWork';
import ConnectSection from '../components/ConnectSection';
import Footer from '../components/Footer';
import PropTypes from 'prop-types';

const Home = ({ isDark, toggleTheme }) => {
    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <Header isDark={isDark} toggleTheme={toggleTheme} />

                <main className="flex-1">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                        <Hero />
                        <div className="max-w-3xl mx-auto mt-24" id="about">
                            <p className="text-lg text-gray-900 dark:text-gray-100 text-justify">
                                Ingeniero Civil en Informática con más de diez años de experiencia en la creación de soluciones digitales innovadoras.
                                Mi enfoque combina la lógica del código con una mirada humana, buscando siempre mejorar la experiencia del usuario y la calidad del producto.
                                Creo que la mejor tecnología surge del trabajo colaborativo, la comunicación honesta y el deseo constante de aprender y mejorar.
                            </p>
                            <p className="text-sm mt-4 text-gray-500 dark:text-gray-700">
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

Home.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Home;
