import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

// ── Style maps ────────────────────────────────────────────────────────────────

const TIER_CLASSES = {
    1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    2: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    3: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

const STRATEGY_CLASSES = {
    aggro: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    midrange: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    control: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    combo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    tempo: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    prison: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    ramp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCell({ label, value }) {
    return (
        <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

StatCell.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired };

function RecommendationItem({ rec, t }) {
    const isAdd = rec.action === 'add';
    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${isAdd
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}>
            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${isAdd ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                {isAdd ? '+' : '−'}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {rec.quantity_suggested}× {rec.card_name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({isAdd ? t('mtg.analysis.addToMain') : t('mtg.analysis.addToSide')})
                    </span>
                </div>
                {rec.reason && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{rec.reason}</p>
                )}
            </div>
        </div>
    );
}

RecommendationItem.propTypes = {
    rec: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalysisPanel({ result, loading }) {
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex items-center justify-center min-h-[440px]">
                <div className="text-center">
                    <svg className="animate-spin h-8 w-8 mx-auto text-purple-600 mb-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('mtg.loading')}</p>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex items-center justify-center min-h-[440px]">
                <div className="text-center max-w-xs px-4">
                    <span className="text-5xl block mb-4">🃏</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {t('mtg.analysis.noResult')}
                    </p>
                </div>
            </div>
        );
    }

    const {
        archetype_detected,
        strategy_detected,
        tier_detected,
        confidence_score,
        strengths,
        weaknesses,
        recommendations,
        similar_meta_decks,
        deck_stats,
        analysis_notes,
        data_available,
    } = result;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-5 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('mtg.analysis.title')}
            </h2>

            {/* Archetype + badges */}
            <div className="flex flex-wrap items-center gap-2">
                {archetype_detected ? (
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {archetype_detected}
                    </span>
                ) : (
                    <span className="text-gray-400 dark:text-gray-500 italic text-sm">
                        {t('mtg.analysis.archetype')}: —
                    </span>
                )}
                {tier_detected && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_CLASSES[tier_detected] ?? TIER_CLASSES[3]}`}>
                        Tier {tier_detected}
                    </span>
                )}
                {strategy_detected && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STRATEGY_CLASSES[strategy_detected] ?? 'bg-gray-100 text-gray-700'}`}>
                        {t(`mtg.strategies.${strategy_detected}`, strategy_detected)}
                    </span>
                )}
                {confidence_score != null && confidence_score > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                        {t('mtg.analysis.confidence')}: {Math.round(confidence_score * 100)}%
                    </span>
                )}
            </div>

            {/* Deck stats */}
            {deck_stats && (
                <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <StatCell label={t('mtg.analysis.mainCount')} value={deck_stats.main_count} />
                    <StatCell label={t('mtg.analysis.sideCount')} value={deck_stats.sideboard_count} />
                    <StatCell
                        label={t('mtg.analysis.avgCmc')}
                        value={deck_stats.avg_cmc != null ? deck_stats.avg_cmc.toFixed(1) : '—'}
                    />
                    <StatCell
                        label={t('mtg.analysis.legalStatus')}
                        value={deck_stats.is_legal ? t('mtg.analysis.legal') : t('mtg.analysis.notLegal')}
                    />
                </div>
            )}

            {/* Illegal cards */}
            {deck_stats?.illegal_cards?.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        {t('mtg.analysis.illegalCards')}:
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {deck_stats.illegal_cards.join(', ')}
                    </p>
                </div>
            )}

            {/* Data not available banner */}
            {data_available === false && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                        {t('mtg.dataNotAvailable')}
                    </p>
                </div>
            )}

            {/* Strengths */}
            {strengths?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {t('mtg.analysis.strengths')}
                    </h3>
                    <ul className="space-y-1">
                        {strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Weaknesses */}
            {weaknesses?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {t('mtg.analysis.weaknesses')}
                    </h3>
                    <ul className="space-y-1">
                        {weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                                {w}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommendations */}
            {recommendations?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {t('mtg.analysis.recommendations')}
                    </h3>
                    <div className="space-y-2">
                        {recommendations.map((rec, i) => (
                            <RecommendationItem key={i} rec={rec} t={t} />
                        ))}
                    </div>
                </div>
            )}

            {/* Similar meta decks */}
            {similar_meta_decks?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {t('mtg.analysis.similarDecks')}
                    </h3>
                    <div className="space-y-1">
                        {similar_meta_decks.map((d, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    {Math.round(d.similarity * 100)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Analysis notes */}
            {analysis_notes && (
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                    <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
                        {analysis_notes}
                    </p>
                </div>
            )}
        </div>
    );
}

AnalysisPanel.propTypes = {
    result: PropTypes.object,
    loading: PropTypes.bool.isRequired,
};
