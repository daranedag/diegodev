import { useTranslation } from 'react-i18next';

const Hero = () => {
    const { t } = useTranslation();

    return (
        <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                {t('hero.name')}
            </h1>
            <h4 className="text-sm sm:text-sm md:text-xl tracking-tight text-gray-500 dark:text-gray-700">
                {t('hero.tagline')}
            </h4>
            <p className="mt-4 text-lg sm:text-xl text-gray-600 dark:text-gray-400">
                {t('hero.slogan')}
            </p>
            <div className="mt-8 flex justify-center gap-4">
                <a
                    className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    href="#ConnectSection"
                >
                    {t('hero.connect')}
                </a>
                {/* <a
                    className="inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-6 py-3 text-base font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                    href="./pages/portafolio.html"
                >
                    Ver Portafolio
                </a> */}
            </div>
        </div>
    );
};

export default Hero;
