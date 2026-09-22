import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    {t('footer.copyright', { year: new Date().getFullYear() })}
                </p>
                <nav
                    aria-label={t('footer.legal')}
                    className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400"
                >
                    <a
                        href="/privacidad/"
                        className="underline underline-offset-4 hover:text-purple-600 dark:hover:text-purple-300"
                    >
                        {t('footer.privacy')}
                    </a>
                    <a
                        href="/eliminacion-de-datos/"
                        className="underline underline-offset-4 hover:text-purple-600 dark:hover:text-purple-300"
                    >
                        {t('footer.dataDeletion')}
                    </a>
                </nav>
            </div>
        </footer>
    );
};

export default Footer;
