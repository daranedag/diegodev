import PropTypes from 'prop-types';
import LogoLight from '../../assets/img/DieGuiDev_Blanco.png';
import LogoDark from '../../assets/img/DieGuiDev_Negro.png';


const Header = ({ isDark, toggleTheme }) => {
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
                                    src={isDark ? LogoDark : LogoLight}
                                    alt="Logo"
                                    className="milogo"
                                />
                            </span>
                        </a>
                    </div>
                    <div className="flex items-center gap-4">
                        <nav className="md:flex items-center gap-6">
                            <a
                                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                href="./pages/bio.html"
                            >
                                Bio
                            </a>
                            <a
                                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                href="./pages/portafolio.html"
                            >
                                Portafolio
                            </a>
                            <a
                                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                href="./pages/hobbies.html"
                            >
                                Hobbies
                            </a>
                            <a
                                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                href="./pages/links.html"
                            >
                                Links
                            </a>
                            <a
                                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 opacity-50 cursor-not-allowed"
                                href="#"
                            >
                                Blog
                            </a>
                        </nav>
                        <button
                            className="h-10 w-10 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-300 dark:border-gray-600"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            title={`Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`}
                        >
                            {isDark ? (
                                // Sol para cuando está en modo oscuro (mostrar sol para cambiar a claro)
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                                    />
                                </svg>
                            ) : (
                                // Luna para cuando está en modo claro (mostrar luna para cambiar a oscuro)
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                                    />
                                </svg>
                            )}
                        </button>
                        <div
                            className="h-10 w-10 rounded-full bg-cover bg-center"
                            style={{ backgroundImage: 'url("./assets/img/perfilNuevo.png")' }}
                        ></div>
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
