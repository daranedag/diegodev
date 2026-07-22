import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Bars3Icon,
    ChevronDownIcon,
    CubeTransparentIcon,
    LanguageIcon,
    MoonIcon,
    PuzzlePieceIcon,
    SunIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import LogoLight from '../../assets/img/logoBlanco.png';
import LogoDark from '../../assets/img/logoNegro.png';
import FotoProfile from '../../assets/img/perfilNuevo.png';
import AuthButton from './Auth/AuthButton';
import { useAuth } from '../context/AuthContext';

const misLinks = [
    { nombre: 'bio', ruta: '../pages/Bio.jsx' },
    { nombre: 'cv', ruta: '../pages/CV.jsx' },
    { nombre: 'portfolio', ruta: '../pages/Portfolio.jsx' },
    { nombre: 'blog', ruta: '../pages/Blog.jsx' },
];

const gameLinks = [
    {
        nombre: 'arrowCube',
        descripcion: 'arrowCubeDescription',
        ruta: '/games/arrow-cube',
        icon: CubeTransparentIcon,
    },
];

const Header = ({ isDark, toggleTheme }) => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const location = useLocation();
    const gamesMenuRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isGamesOpen, setIsGamesOpen] = useState(false);
    const [isMobileGamesOpen, setIsMobileGamesOpen] = useState(false);

    const isBioPage = location.pathname.includes('Bio');

    useEffect(() => {
        setIsMenuOpen(false);
        setIsGamesOpen(false);
        setIsMobileGamesOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const closeGamesOnOutsideClick = (event) => {
            if (gamesMenuRef.current && !gamesMenuRef.current.contains(event.target)) {
                setIsGamesOpen(false);
            }
        };

        document.addEventListener('pointerdown', closeGamesOnOutsideClick);
        return () => document.removeEventListener('pointerdown', closeGamesOnOutsideClick);
    }, []);

    const toggleLanguage = () => {
        const newLang = i18n.language === 'es' ? 'en' : 'es';
        i18n.changeLanguage(newLang);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
        setIsMobileGamesOpen(false);
    };

    const utilityButtonClass = 'relative h-10 w-10 flex shrink-0 items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-300 dark:border-gray-600';
    const mobileLinkClass = 'text-base font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700';

    return (
        <header className="sticky top-3 z-30 w-full border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/90">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <Link
                        className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100"
                        to="/"
                        onClick={closeMenu}
                    >
                        <img src={isDark ? LogoLight : LogoDark} alt="DieGui DeV" className="milogo" />
                    </Link>

                    <div className="hidden items-center gap-3 md:flex">
                        <nav className="flex items-center gap-5" aria-label={t('header.mainNavigation')}>
                            {misLinks.map((link) => (
                                <Link
                                    key={link.nombre}
                                    className="text-sm font-medium text-gray-600 transition-colors hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                                    to={link.ruta}
                                >
                                    {t(`header.${link.nombre}`)}
                                </Link>
                            ))}

                            <div className="relative" ref={gamesMenuRef}>
                                <button
                                    type="button"
                                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${location.pathname.startsWith('/games') ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400'}`}
                                    onClick={() => setIsGamesOpen((open) => !open)}
                                    aria-expanded={isGamesOpen}
                                    aria-haspopup="menu"
                                >
                                    <PuzzlePieceIcon className="h-4 w-4" />
                                    {t('header.games')}
                                    <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${isGamesOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isGamesOpen && (
                                    <div className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-2xl border border-purple-100 bg-white p-2 shadow-xl shadow-purple-950/10 dark:border-gray-700 dark:bg-gray-800" role="menu">
                                        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                            {t('header.gamesEyebrow')}
                                        </p>
                                        {gameLinks.map((game) => {
                                            const GameIcon = game.icon;
                                            return (
                                                <Link
                                                    key={game.nombre}
                                                    to={game.ruta}
                                                    role="menuitem"
                                                    className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-purple-50 dark:hover:bg-gray-700"
                                                >
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 transition-transform group-hover:scale-105 dark:bg-purple-500/15 dark:text-purple-300">
                                                        <GameIcon className="h-6 w-6" />
                                                    </span>
                                                    <span>
                                                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t(`header.${game.nombre}`)}</span>
                                                        <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-gray-400">{t(`header.${game.descripcion}`)}</span>
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {!isBioPage && <img src={FotoProfile} alt="Diego Araneda" className="perfil" />}
                        </nav>

                        {user && (
                            <div className="flex items-center gap-3 border-l border-gray-200 pl-3 dark:border-gray-700">
                                <Link to="/kanban" className="text-sm font-medium text-purple-600 dark:text-purple-400">Kanban</Link>
                                <Link to="/places" className="text-sm font-medium text-purple-600 dark:text-purple-400">{t('places.navLink')}</Link>
                                <Link to="/mtg" className="text-sm font-medium text-purple-600 dark:text-purple-400">{t('mtg.navLink')}</Link>
                            </div>
                        )}

                        <AuthButton />

                        <button className={utilityButtonClass} onClick={toggleLanguage} aria-label={t('header.languageToggle')}>
                            <LanguageIcon className="h-5 w-5" />
                            <span className="absolute -bottom-1 text-xs font-semibold">{i18n.language === 'es' ? 'en' : 'es'}</span>
                        </button>

                        <button
                            className={utilityButtonClass}
                            onClick={toggleTheme}
                            aria-label={t('header.themeToggle', { mode: isDark ? t('header.light') : t('header.dark') })}
                        >
                            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 md:hidden">
                        <button className={utilityButtonClass} onClick={toggleLanguage} aria-label={t('header.languageToggle')}>
                            <LanguageIcon className="h-5 w-5" />
                            <span className="absolute -bottom-1 text-xs font-semibold">{i18n.language === 'es' ? 'en' : 'es'}</span>
                        </button>
                        <button className={utilityButtonClass} onClick={toggleTheme} aria-label={t('header.themeToggle', { mode: isDark ? t('header.light') : t('header.dark') })}>
                            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                        </button>
                        <button
                            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                            onClick={() => setIsMenuOpen((open) => !open)}
                            aria-label={t('header.menuToggle')}
                            aria-expanded={isMenuOpen}
                        >
                            {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {isMenuOpen && (
                    <nav className="border-t border-gray-200 py-4 dark:border-gray-700 md:hidden" aria-label={t('header.mainNavigation')}>
                        <div className="flex flex-col gap-1">
                            {misLinks.map((link) => (
                                <Link key={link.nombre} className={mobileLinkClass} to={link.ruta} onClick={closeMenu}>
                                    {t(`header.${link.nombre}`)}
                                </Link>
                            ))}

                            <button
                                type="button"
                                className={`${mobileLinkClass} flex w-full items-center justify-between text-left`}
                                onClick={() => setIsMobileGamesOpen((open) => !open)}
                                aria-expanded={isMobileGamesOpen}
                            >
                                <span className="flex items-center gap-2"><PuzzlePieceIcon className="h-5 w-5" />{t('header.games')}</span>
                                <ChevronDownIcon className={`h-4 w-4 transition-transform ${isMobileGamesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isMobileGamesOpen && (
                                <div className="ml-2 border-l-2 border-purple-200 pl-3 dark:border-purple-800">
                                    {gameLinks.map((game) => {
                                        const GameIcon = game.icon;
                                        return (
                                            <Link key={game.nombre} to={game.ruta} onClick={closeMenu} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-purple-50 dark:hover:bg-gray-700">
                                                <GameIcon className="h-6 w-6 text-purple-500" />
                                                <span>
                                                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t(`header.${game.nombre}`)}</span>
                                                    <span className="block text-xs text-gray-500 dark:text-gray-400">{t(`header.${game.descripcion}`)}</span>
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}

                            {!isBioPage && (
                                <div className="flex items-center gap-2 px-2 py-2">
                                    <img src={FotoProfile} alt="Diego Araneda" className="perfil" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Diego Araneda</span>
                                </div>
                            )}
                            {user && (
                                <>
                                    <Link to="/kanban" className={mobileLinkClass} onClick={closeMenu}>Kanban</Link>
                                    <Link to="/places" className={mobileLinkClass} onClick={closeMenu}>{t('places.navLink')}</Link>
                                    <Link to="/mtg" className={mobileLinkClass} onClick={closeMenu}>{t('mtg.navLink')}</Link>
                                </>
                            )}
                            <div className="px-2 pt-2"><AuthButton /></div>
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
