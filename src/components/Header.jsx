import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageIcon } from '@heroicons/react/24/outline';
import LogoLight from '../../assets/img/logoBlanco.png';
import LogoDark from '../../assets/img/logoNegro.png';
import FotoProfile from '../../assets/img/perfilNuevo.png';

const misLinks = [
    { nombre: 'Bio', ruta: '../pages/Bio.jsx' },
    // { nombre: 'CV', ruta: '#' },
    // { nombre: 'Portafolio', ruta: '#' },
    // { nombre: 'Blog', ruta: '#' }
]

const Header = ({ isDark, toggleTheme }) => {
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'es' ? 'en' : 'es';
        i18n.changeLanguage(newLang);
    };

    return (
        <header className="sticky top-3 z-10 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a
                            className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100"
                            href="#"
                        >
                            <span className="text-purple-600 dark:text-purple-400">
                                <img
                                    src={isDark ? LogoLight : LogoDark}
                                    alt="Logo"
                                    className="milogo"
                                />
                            </span>
                        </a>
                    </div>
                    <div className="flex items-center gap-4">
                        <nav className="md:flex items-center gap-6">
                            {misLinks.map((link) => (
                                <Link
                                    key={link.nombre}
                                    className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-300 dark:hover:text-purple-400"
                                    to={link.ruta}
                                >
                                    {link.nombre}
                                </Link>
                            ))}
                            <span className="text-purple-600 dark:text-purple-400">
                                <img
                                    src={FotoProfile}
                                    alt="Perfil"
                                    className="perfil"
                                />
                            </span>
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
                </div>
            </div>
        </header>
    );
};

Header.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Header;
