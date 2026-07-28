import PropTypes from 'prop-types';
import { Squares2X2Icon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import WordleGame from '../components/Games/WordleGame';

const Wordle = ({ isDark, toggleTheme }) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-screen w-full flex-col bg-gray-50 font-sans text-gray-900 transition-colors duration-300 dark:bg-gray-900 dark:text-gray-100">
            <Header isDark={isDark} toggleTheme={toggleTheme} />
            <main className="flex-1 overflow-hidden">
                <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
                    <div className="mx-auto mb-8 max-w-3xl text-center">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300">
                            <Squares2X2Icon className="h-4 w-4" />
                            {t('wordle.eyebrow')}
                        </div>
                        <h1 className="text-4xl font-black tracking-[-0.045em] text-gray-950 dark:text-white sm:text-5xl">
                            {t('wordle.titleStart')} <span className="bg-gradient-to-r from-purple-600 to-violet-400 bg-clip-text text-transparent">{t('wordle.titleAccent')}</span>
                        </h1>
                        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400 sm:text-lg">
                            {t('wordle.subtitle')}
                        </p>
                    </div>

                    <div className="mx-auto max-w-5xl">
                        <WordleGame />
                        <div className="mx-auto mt-5 flex max-w-3xl items-start justify-center gap-3 text-center text-xs leading-5 text-gray-500 dark:text-gray-500 sm:text-sm">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                            <p>{t('wordle.howToPlay')}</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

Wordle.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};

export default Wordle;
