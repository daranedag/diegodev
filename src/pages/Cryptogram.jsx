import PropTypes from 'prop-types';
import { KeyIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CryptogramGame from '../components/Games/CryptogramGame';

const Cryptogram = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-50 font-sans text-gray-900 transition-colors duration-300 dark:bg-gray-900 dark:text-gray-100">
            <Header isDark={isDark} toggleTheme={toggleTheme} />
            <main className="flex-1 overflow-hidden">
                <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
                    <div className="mx-auto mb-8 max-w-3xl text-center">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300">
                            <KeyIcon className="h-4 w-4" />
                            {t('cryptogram.eyebrow')}
                        </div>
                        <h1 className="text-4xl font-black tracking-[-0.045em] text-gray-950 dark:text-white sm:text-5xl">
                            {t('cryptogram.titleStart')} <span className="bg-gradient-to-r from-purple-600 to-violet-400 bg-clip-text text-transparent">{t('cryptogram.titleAccent')}</span>
                        </h1>
                        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400 sm:text-lg">
                            {t('cryptogram.subtitle')}
                        </p>
                    </div>

                    <div className="mx-auto max-w-5xl">
                        <CryptogramGame />
                        <div className="mx-auto mt-5 flex max-w-3xl items-start justify-center gap-3 text-center text-xs leading-5 text-gray-500 dark:text-gray-500 sm:text-sm">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                            <p>{t('cryptogram.howToPlay')}</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

Cryptogram.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Cryptogram;
