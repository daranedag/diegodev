import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const FORMATS = [
    { slug: 'standard' },
    { slug: 'modern' },
    { slug: 'pauper' },
];

export default function DeckInput({ onAnalyze, isAnalyzing, error }) {
    const { t } = useTranslation();
    const [formatSlug, setFormatSlug] = useState('');
    const [deckName, setDeckName] = useState('');
    const [rawDecklist, setRawDecklist] = useState('');
    const [validationError, setValidationError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError(null);

        if (!rawDecklist.trim()) {
            setValidationError(t('mtg.deckInput.errors.emptyDecklist'));
            return;
        }
        if (!formatSlug) {
            setValidationError(t('mtg.deckInput.errors.noFormat'));
            return;
        }

        onAnalyze(rawDecklist.trim(), formatSlug, deckName.trim() || null);
    };

    const displayError = validationError || error;

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col gap-4 h-full"
        >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('mtg.deckInput.title')}
            </h2>

            {/* Format selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('mtg.deckInput.format')}
                </label>
                <select
                    value={formatSlug}
                    onChange={(e) => setFormatSlug(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">{t('mtg.deckInput.selectFormat')}</option>
                    {FORMATS.map((f) => (
                        <option key={f.slug} value={f.slug}>
                            {t(`mtg.formats.${f.slug}`)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Deck name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('mtg.deckInput.deckName')}
                </label>
                <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    placeholder={t('mtg.deckInput.deckNamePlaceholder')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            {/* Decklist textarea */}
            <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('mtg.deckInput.decklist')}
                </label>
                <textarea
                    value={rawDecklist}
                    onChange={(e) => setRawDecklist(e.target.value)}
                    placeholder={t('mtg.deckInput.decklistPlaceholder')}
                    rows={16}
                    className="flex-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
            </div>

            {/* Validation / API error */}
            {displayError && (
                <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
                {isAnalyzing ? (
                    <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle
                                className="opacity-25"
                                cx="12" cy="12" r="10"
                                stroke="currentColor" strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                        {t('mtg.deckInput.analyzing')}
                    </>
                ) : (
                    t('mtg.deckInput.analyze')
                )}
            </button>
        </form>
    );
}

DeckInput.propTypes = {
    onAnalyze: PropTypes.func.isRequired,
    isAnalyzing: PropTypes.bool.isRequired,
    error: PropTypes.string,
};
