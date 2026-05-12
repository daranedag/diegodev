import { useState } from 'react';
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

function normalizeCardName(name) {
    return name.toLowerCase().trim();
}

function parseDecklistForComparison(rawDecklist) {
    const sections = { main: new Map(), sideboard: new Map() };
    let section = 'main';

    for (const line of rawDecklist.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^(sideboard|side board|sb:|side\s*:?)/i.test(trimmed)) {
            section = 'sideboard';
            continue;
        }
        if (/^(deck|mainboard|main deck)$/i.test(trimmed)) {
            section = 'main';
            continue;
        }

        const match = trimmed.match(/^(\d+)[x]?\s+(.+?)(?:\s+\([^)]{2,8}\)\s+\S+.*)?$/i);
        if (!match) continue;

        const quantity = Number(match[1]);
        const name = match[2].trim();
        const key = normalizeCardName(name);
        const current = sections[section].get(key) ?? { name, quantity: 0 };
        current.quantity += quantity;
        sections[section].set(key, current);
    }

    return sections;
}

function cloneDeckSections(sections) {
    return {
        main: new Map([...sections.main.entries()].map(([key, card]) => [key, { ...card }])),
        sideboard: new Map([...sections.sideboard.entries()].map(([key, card]) => [key, { ...card }])),
    };
}

function countSection(cards) {
    return [...cards.values()].reduce((sum, card) => sum + Math.max(card.quantity, 0), 0);
}

function sectionRows(cards) {
    return [...cards.values()]
        .filter((card) => card.quantity > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
}

function buildDeckComparison(rawDecklist, recommendations = []) {
    const current = parseDecklistForComparison(rawDecklist);
    const suggested = cloneDeckSections(current);
    const changes = { main: new Map(), sideboard: new Map() };

    for (const rec of recommendations.filter((r) => r.verified !== false)) {
        const section = rec.section === 'sideboard' ? 'sideboard' : 'main';
        const cards = suggested[section];
        const sectionChanges = changes[section];
        const key = normalizeCardName(rec.card_name);
        const current = cards.get(key) ?? { name: rec.card_name, quantity: 0 };
        const quantity = Math.max(Math.round(rec.quantity_suggested ?? 0), 0);
        const change = sectionChanges.get(key) ?? { added: 0, removed: 0 };

        if (rec.action === 'add') {
            current.quantity += quantity;
            change.added += quantity;
        }
        if (rec.action === 'remove') {
            const removed = Math.min(current.quantity, quantity);
            current.quantity = Math.max(current.quantity - quantity, 0);
            change.removed += removed;
        }

        cards.set(key, current);
        sectionChanges.set(key, change);
    }

    return {
        current,
        suggested,
        changes,
        currentMainCount: countSection(current.main),
        currentSideCount: countSection(current.sideboard),
        suggestedMainCount: countSection(suggested.main),
        suggestedSideCount: countSection(suggested.sideboard),
    };
}

function InfoTooltip({ text, align = 'center' }) {
    const posClass =
        align === 'left'
            ? 'left-0 -translate-x-0'
            : align === 'right'
                ? 'right-0 translate-x-0'
                : 'left-1/2 -translate-x-1/2';
    return (
        <span className="relative group inline-flex items-center ml-1 align-middle">
            <span className="w-3.5 h-3.5 rounded-full border border-gray-400 dark:border-gray-500 text-gray-400 dark:text-gray-500 text-[9px] flex items-center justify-center cursor-default select-none leading-none">
                i
            </span>
            <span className={`absolute bottom-full mb-2 w-48 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 text-left leading-snug shadow-xl whitespace-normal ${posClass}`}>
                {text}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
            </span>
        </span>
    );
}

InfoTooltip.propTypes = { text: PropTypes.string.isRequired, align: PropTypes.oneOf(['left', 'center', 'right']) };

function formatUsdPrice(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

function CardMarketTooltip({ cardName, marketData, t }) {
    const [open, setOpen] = useState(false);
    const hasData = Boolean(marketData);
    const cardKingdomPrice = formatUsdPrice(marketData?.cardkingdom_price_usd);
    const tcgPlayerPrice = formatUsdPrice(marketData?.tcgplayer_price_usd);

    return (
        <span
            className="relative inline-flex max-w-full"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="text-left text-sm font-medium text-gray-900 underline decoration-dotted underline-offset-2 hover:text-purple-700 dark:text-white dark:hover:text-purple-300"
            >
                {cardName}
            </button>

            <div className={`absolute left-0 top-full mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-xl transition-opacity z-30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 ${open ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                {hasData ? (
                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                            {t('mtg.analysis.baseNonFoilLabel', 'Impresion base no-foil')}
                        </p>

                        {marketData.image_uri ? (
                            <img
                                src={marketData.image_uri}
                                alt={cardName}
                                className="h-36 w-24 rounded border border-gray-200 object-cover dark:border-gray-600"
                                loading="lazy"
                            />
                        ) : (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {t('mtg.analysis.marketImageMissing', 'Imagen no disponible')}
                            </p>
                        )}

                        <div className="space-y-1.5">
                            <p className="flex items-center justify-between gap-2">
                                <span className="font-semibold">CardKingdom</span>
                                <span>{cardKingdomPrice ?? t('mtg.analysis.marketPriceMissing', 'Sin precio')}</span>
                            </p>
                            {marketData.cardkingdom_url && (
                                <a
                                    href={marketData.cardkingdom_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-purple-700 underline underline-offset-2 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200"
                                >
                                    {t('mtg.analysis.openStoreLink', 'Abrir tienda')}
                                </a>
                            )}

                            <p className="flex items-center justify-between gap-2">
                                <span className="font-semibold">TCGPlayer</span>
                                <span>{tcgPlayerPrice ?? t('mtg.analysis.marketPriceMissing', 'Sin precio')}</span>
                            </p>
                            {marketData.tcgplayer_url && (
                                <a
                                    href={marketData.tcgplayer_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-purple-700 underline underline-offset-2 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200"
                                >
                                    {t('mtg.analysis.openStoreLink', 'Abrir tienda')}
                                </a>
                            )}
                        </div>

                        {marketData.price_date && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                {t('mtg.analysis.marketUpdatedLabel', 'Actualizado')}: {marketData.price_date}
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {t('mtg.analysis.marketDataMissing', 'Sin datos de mercado todavia')}
                    </p>
                )}
            </div>
        </span>
    );
}

CardMarketTooltip.propTypes = {
    cardName: PropTypes.string.isRequired,
    marketData: PropTypes.object,
    t: PropTypes.func.isRequired,
};

function StatCell({ label, value, tooltip, tooltipAlign }) {
    return (
        <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight flex items-center justify-center">
                {label}
                {tooltip && <InfoTooltip text={tooltip} align={tooltipAlign} />}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

StatCell.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    tooltip: PropTypes.string,
    tooltipAlign: PropTypes.oneOf(['left', 'center', 'right']),
};

function MetaMetricChip({ label, value, tooltip }) {
    return (
        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800/70 dark:text-gray-300 dark:ring-gray-600">
            <span className="mr-1 text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">{value}</span>
            <InfoTooltip text={tooltip} align="center" />
        </span>
    );
}

MetaMetricChip.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    tooltip: PropTypes.string.isRequired,
};

function DeckComparisonList({ sections, changes, t }) {
    const renderSection = (sectionKey, label) => {
        const rows = sectionRows(sections[sectionKey]);
        const count = countSection(sections[sectionKey]);
        if (rows.length === 0) return null;

        return (
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-gray-200 dark:border-gray-600">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {label}
                    </p>
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                        {count} {t('mtg.analysis.cardsCount', 'cartas')}
                    </span>
                </div>
                <div className="space-y-0.5">
                    {rows.map((card) => {
                        const change = changes?.[sectionKey]?.get(normalizeCardName(card.name));
                        return (
                            <div key={card.name} className="flex items-center justify-between gap-2 text-xs font-mono text-gray-700 dark:text-gray-300">
                                <span className="min-w-0 break-words">
                                    {card.quantity} {card.name}
                                </span>
                                {(change?.added > 0 || change?.removed > 0) && (
                                    <span className="flex-shrink-0 flex items-center gap-1 font-sans">
                                        {change.added > 0 && (
                                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                +{change.added}
                                            </span>
                                        )}
                                        {change.removed > 0 && (
                                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                -{change.removed}
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {renderSection('main', t('mtg.analysis.mainDeck', 'Main deck'))}
            {renderSection('sideboard', t('mtg.analysis.sideboardDeck', 'Sideboard'))}
        </div>
    );
}

DeckComparisonList.propTypes = {
    sections: PropTypes.shape({
        main: PropTypes.instanceOf(Map).isRequired,
        sideboard: PropTypes.instanceOf(Map).isRequired,
    }).isRequired,
    changes: PropTypes.shape({
        main: PropTypes.instanceOf(Map),
        sideboard: PropTypes.instanceOf(Map),
    }),
    t: PropTypes.func.isRequired,
};

function AccordionSection({ title, count, open, onToggle, children }) {
    return (
        <section className="rounded-lg border border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-700/30">
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/60"
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                        {title}
                    </span>
                    {count != null && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-600">
                            {count}
                        </span>
                    )}
                </span>
                <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
                    v
                </span>
            </button>
            {open && (
                <div className="space-y-2 border-t border-gray-200 p-3 dark:border-gray-700">
                    {children}
                </div>
            )}
        </section>
    );
}

AccordionSection.propTypes = {
    title: PropTypes.string.isRequired,
    count: PropTypes.number,
    open: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
};

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
                        {rec.quantity_suggested}x{' '}
                        <CardMarketTooltip cardName={rec.card_name} marketData={rec.market_data} t={t} />
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({rec.section === 'main' ? t('mtg.analysis.addToMain') : t('mtg.analysis.addToSide')})
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${rec.verified === false
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                        {rec.verified === false
                            ? t('mtg.analysis.unverified', 'No verificada')
                            : t('mtg.analysis.verified', 'Verificada')}
                    </span>
                </div>
                {rec.reason && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{rec.reason}</p>
                )}
                {rec.verification_note && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{rec.verification_note}</p>
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
    const [decklistOpen, setDecklistOpen] = useState(false);
    const [comparisonOpen, setComparisonOpen] = useState(false);
    const [recommendationsOpen, setRecommendationsOpen] = useState(true);
    const [similarDecksOpen, setSimilarDecksOpen] = useState(true);

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
        deck_name,
        raw_decklist,
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
        cache_hit,
        llm_used,
        llm_raw,
    } = result;
    const deckComparison = raw_decklist
        ? buildDeckComparison(raw_decklist, recommendations ?? [])
        : '';
    const showDebug = import.meta.env.DEV;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-5">
            {/* Title row: label + deck name + optional collapsible decklist toggle */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('mtg.analysis.title')}
                    </h2>
                    {deck_name && (
                        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium truncate mt-0.5">
                            {deck_name}
                        </p>
                    )}
                    {cache_hit && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                            {t('mtg.analysis.cacheHit', 'Resultado recuperado desde cache')}
                        </p>
                    )}
                </div>
                {raw_decklist && (
                    <div className="flex flex-wrap justify-end gap-2">
                        {recommendations?.length > 0 && (
                            <button
                                onClick={() => setComparisonOpen((o) => !o)}
                                className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1 transition-colors"
                            >
                                {comparisonOpen
                                    ? t('mtg.analysis.compareHide', 'Ocultar comparacion')
                                    : t('mtg.analysis.compareShow', 'Comparar listas')}
                            </button>
                        )}
                        <button
                            onClick={() => setDecklistOpen((o) => !o)}
                            className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1 transition-colors"
                        >
                            {decklistOpen ? t('mtg.analysis.decklistHide') : t('mtg.analysis.decklistShow')}
                        </button>
                    </div>
                )}
            </div>

            {/* Collapsible decklist */}
            {raw_decklist && decklistOpen && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 p-3">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed font-mono max-h-48 overflow-y-auto">
                        {raw_decklist.trim()}
                    </pre>
                </div>
            )}

            {/* Current vs suggested decklist */}
            {raw_decklist && comparisonOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 p-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            {t('mtg.analysis.currentList', 'Lista actual')}
                        </p>
                        <DeckComparisonList sections={deckComparison.current} t={t} />
                    </div>
                    <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3">
                        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                            {t('mtg.analysis.suggestedList', 'Lista sugerida')}
                        </p>
                        {(deckComparison.suggestedMainCount > 60 || deckComparison.suggestedSideCount > 15) && (
                            <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                                {t('mtg.analysis.suggestedDraftNotice', 'Borrador de cambios: faltan cortes para llegar a una lista final legal.')}
                            </p>
                        )}
                        <DeckComparisonList sections={deckComparison.suggested} changes={deckComparison.changes} t={t} />
                    </div>
                </div>
            )}

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
                    <StatCell label={t('mtg.analysis.mainCount')} value={deck_stats.main_count} tooltip={t('mtg.analysis.mainCountTooltip')} tooltipAlign="left" />
                    <StatCell label={t('mtg.analysis.sideCount')} value={deck_stats.sideboard_count} tooltip={t('mtg.analysis.sideCountTooltip')} tooltipAlign="center" />
                    <StatCell
                        label={t('mtg.analysis.avgCmc')}
                        value={deck_stats.avg_cmc != null ? deck_stats.avg_cmc.toFixed(1) : '—'}
                        tooltip={t('mtg.analysis.avgCmcTooltip')}
                        tooltipAlign="center"
                    />
                    <StatCell
                        label={t('mtg.analysis.legalStatus')}
                        value={deck_stats.is_legal ? t('mtg.analysis.legal') : t('mtg.analysis.notLegal')}
                        tooltip={t('mtg.analysis.legalStatusTooltip')}
                        tooltipAlign="right"
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

            {/* Legality issues */}
            {deck_stats?.legality_issues?.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        {t('mtg.analysis.legalityIssues', 'Problemas de legalidad')}:
                    </p>
                    <ul className="mt-1 space-y-1">
                        {deck_stats.legality_issues.map((issue, i) => (
                            <li key={i} className="text-sm text-red-600 dark:text-red-400">
                                {issue}
                            </li>
                        ))}
                    </ul>
                    {deck_stats.copy_violations?.length > 0 && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                            {deck_stats.copy_violations
                                .map((v) => `${v.card_name}: ${v.count}/${v.max_allowed}`)
                                .join(', ')}
                        </p>
                    )}
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
                <AccordionSection
                    title={t('mtg.analysis.recommendations')}
                    count={recommendations.length}
                    open={recommendationsOpen}
                    onToggle={() => setRecommendationsOpen((open) => !open)}
                >
                    <div className="space-y-2">
                        {recommendations.map((rec, i) => (
                            <RecommendationItem key={i} rec={rec} t={t} />
                        ))}
                    </div>
                </AccordionSection>
            )}

            {/* Similar meta decks */}
            {similar_meta_decks?.length > 0 && (
                <AccordionSection
                    title={t('mtg.analysis.similarDecks')}
                    count={similar_meta_decks.length}
                    open={similarDecksOpen}
                    onToggle={() => setSimilarDecksOpen((open) => !open)}
                >
                    <div className="space-y-2">
                        {similar_meta_decks.map((d, i) => (
                            <div key={i} className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 text-sm">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                            {d.name}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {d.archetype}
                                                {d.source ? ` · ${d.source}` : ''}
                                            </span>
                                            {d.competitive_score != null && (
                                                <MetaMetricChip
                                                    label={t('mtg.analysis.competitiveScore', 'Score')}
                                                    value={Math.round(d.competitive_score)}
                                                    tooltip={t('mtg.analysis.competitiveScoreTooltip', 'Puntaje interno calculado con resultado del torneo, nivel del evento, presencia en el meta y recencia. Mientras más alto, más fuerte es la referencia competitiva.')}
                                                />
                                            )}
                                            {d.meta_share != null && (
                                                <MetaMetricChip
                                                    label={t('mtg.analysis.metaShare', 'Meta')}
                                                    value={`${d.meta_share}%`}
                                                    tooltip={t('mtg.analysis.metaShareTooltip', 'Porcentaje aproximado de presencia del arquetipo en la ventana de metajuego importada desde MTGTop8.')}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <span className="inline-flex flex-shrink-0 items-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                                        {t('mtg.analysis.similarity', 'Similitud')} {Math.round(d.similarity * 100)}%
                                        <InfoTooltip
                                            text={t('mtg.analysis.similarityTooltip', 'Qué tanto se parece tu lista a este mazo meta, calculado por cartas compartidas y cantidades.')}
                                            align="right"
                                        />
                                    </span>
                                </div>
                                {d.missing_main_cards?.length > 0 && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                        {t('mtg.analysis.missingFromMeta', 'Faltan del meta')}: {d.missing_main_cards.join(', ')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </AccordionSection>
            )}

            {/* Analysis notes */}
            {analysis_notes && (
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                    <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
                        {analysis_notes}
                    </p>
                </div>
            )}

            {/* Debug panel */}
            {showDebug && (
                <details className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                    <summary className="cursor-pointer px-3 py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 select-none flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${llm_used ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        Debug - LLM: {llm_used ? 'activo' : 'fallback (reglas)'}
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium">llm_used:</span> {String(llm_used ?? false)}
                        </p>
                        {llm_raw ? (
                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">llm_raw (respuesta JSON del modelo):</p>
                                <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 rounded p-2 whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono leading-relaxed">
                                    {llm_raw}
                                </pre>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin respuesta cruda del LLM.</p>
                        )}
                    </div>
                </details>
            )}
        </div>
    );
}

AnalysisPanel.propTypes = {
    result: PropTypes.object,
    loading: PropTypes.bool.isRequired,
};
