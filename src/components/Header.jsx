import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import LogoLight from '../../assets/img/logoBlanco.png';
import LogoDark from '../../assets/img/logoNegro.png';
import FotoProfile from '../../assets/img/perfilNuevo.png';

const misLinks = [
    { nombre: 'bio', ruta: '../pages/Bio.jsx' },
    // { nombre: 'cv', ruta: '#' },
    // { nombre: 'portfolio', ruta: '#' },
    // { nombre: 'blog', ruta: '#' }
]

const Header = ({ isDark, toggleTheme }) => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Verificar si estamos en la página Bio
    const isBioPage = location.pathname.includes('Bio');

    const toggleLanguage = () => {
        const newLang = i18n.language === 'es' ? 'en' : 'es';
        i18n.changeLanguage(newLang);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    return (
        <header className="sticky top-3 z-10 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100"
                            to="/"
                            onClick={closeMenu}
                        >
                            <span className="text-purple-600 dark:text-purple-400">
                                <img
                                    src={isDark ? LogoLight : LogoDark}
                                    alt="Logo"
                                    className="milogo"
                                />
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-4">
                        <nav className="flex items-center gap-6">
                            {misLinks.map((link) => (
                                <Link
                                    key={link.nombre}
                                    className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                    to={link.ruta}
                                >
                                    {t(`header.${link.nombre}`)}
                                </Link>
                            ))}
                            {!isBioPage && (
                                <span className="text-purple-600 dark:text-purple-400">
                                    <img
                                        src={FotoProfile}
                                        alt="Perfil"
                                        className="perfil"
                                    />
                                </span>
                            )}
                        </nav>

                        {/* Botón de cambio de idioma */}
                        <button
                            className="relative h-10 w-10 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-300 dark:border-gray-600"
                            onClick={toggleLanguage}
                            aria-label="Change language"
                            title={`Switch to ${i18n.language === 'es' ? 'English' : 'Español'}`}
                        >
                            <LanguageIcon className="w-5 h-5" />
                            <span className="text-xs font-semibold absolute -bottom-1">
                                {i18n.language === 'es' ? 'en' : 'es'}
                            </span>
                        </button>

                        {/* Botón de cambio de tema */}
                        <button
                            className="relative h-10 w-10 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-300 dark:border-gray-600"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            title={t('header.themeToggle', { mode: isDark ? t('header.light') : t('header.dark') })}
                        >
                            {isDark ? (
                                // Sol - cuando está en modo oscuro, muestra el sol para cambiar a claro
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                                    />
                                </svg>
                            ) : (
                                // Luna - cuando está en modo claro, muestra la luna para cambiar a oscuro
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden items-center gap-2">
                        {/* Botón de cambio de idioma móvil */}
                        <button
                            className="relative h-10 w-10 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-300 dark:border-gray-600"
                            onClick={toggleLanguage}
                            aria-label="Change language"
                        >
                            <LanguageIcon className="w-5 h-5" />
                            <span className="text-xs font-semibold absolute -bottom-1">
                                {i18n.language === 'es' ? 'en' : 'es'}
                            </span>
                        </button>

                        {/* Botón de cambio de tema móvil */}
                        <button
                            className="relative h-10 w-10 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-300 dark:border-gray-600"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                                    />
                                </svg>
                            )}
                        </button>

                        {/* Hamburger button */}
                        <button
                            className="h-10 w-10 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                            onClick={toggleMenu}
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? (
                                <XMarkIcon className="w-6 h-6" />
                            ) : (
                                <Bars3Icon className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <nav className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col gap-4">
                            {misLinks.map((link) => (
                                <Link
                                    key={link.nombre}
                                    className="text-base font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                    to={link.ruta}
                                    onClick={closeMenu}
                                >
                                    {t(`header.${link.nombre}`)}
                                </Link>
                            ))}
                            {!isBioPage && (
                                <div className="flex items-center gap-2 px-2 py-2">
                                    <img
                                        src={FotoProfile}
                                        alt="Perfil"
                                        className="perfil"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Diego Araneda</span>
                                </div>
                            )}
                        </div>
                    </nav>
                )}
            </div>
        </header>
    );
};

Header.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Header;
