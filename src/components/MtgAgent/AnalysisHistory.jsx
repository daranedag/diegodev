import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const TIER_TEXT = {
    1: 'text-yellow-600 dark:text-yellow-400',
    2: 'text-gray-500 dark:text-gray-400',
    3: 'text-orange-600 dark:text-orange-400',
};

export default function AnalysisHistory({ history, loading, onSelect }) {
    const { t } = useTranslation();

    if (loading) {
        return (
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('mtg.history.title')}
                </h2>
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('mtg.loading')}</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('mtg.history.title')}
            </h2>

            {history.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('mtg.history.empty')}
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {history.map((run) => (
                        <button
                            key={run.id}
                            onClick={() => onSelect(run)}
                            className="text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all"
                        >
                            {/* Format + Tier */}
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                                    {t(`mtg.formats.${run.format_slug}`, run.format_slug)}
                                </span>
                                {run.tier_detected && (
                                    <span className={`text-xs font-bold ${TIER_TEXT[run.tier_detected]}`}>
                                        T{run.tier_detected}
                                    </span>
                                )}
                            </div>

                            {/* Deck name */}
                            {(run.mtg_user_decks?.name || run.analysis_data?.deck_name) && (
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate mb-0.5">
                                    {run.mtg_user_decks?.name || run.analysis_data?.deck_name}
                                </p>
                            )}

                            {/* Archetype or fallback */}
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {run.archetype_detected || '—'}
                            </p>

                            {/* Confidence + date */}
                            <div className="flex items-center justify-between mt-2">
                                {run.confidence_score > 0 && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {Math.round(run.confidence_score * 100)}%
                                    </span>
                                )}
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                    {new Date(run.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

AnalysisHistory.propTypes = {
    history: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    onSelect: PropTypes.func.isRequired,
};
