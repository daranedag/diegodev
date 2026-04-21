import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DeckInput from '../components/MtgAgent/DeckInput';
import AnalysisPanel from '../components/MtgAgent/AnalysisPanel';
import AnalysisHistory from '../components/MtgAgent/AnalysisHistory';
import { MtgAgentService } from '../services/MtgAgentService';

export default function MtgAgent({ isDark, toggleTheme }) {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Auth guard — redirect unauthenticated users to home
    useEffect(() => {
        if (!loading && !user) navigate('/');
    }, [user, loading, navigate]);

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const data = await MtgAgentService.getAnalysisHistory(12);
            setHistory(data);
        } catch (err) {
            console.error('Failed to load analysis history:', err);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        if (user) loadHistory();
    }, [user, loadHistory]);

    const handleAnalyze = async (rawDecklist, formatSlug, deckName) => {
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            const result = await MtgAgentService.analyzeDecklist(rawDecklist, formatSlug, deckName);
            setAnalysisResult(result);
            // Persist the run in the background; refresh history when done
            if (user) {
                MtgAgentService.saveAnalysisRun(user.id, formatSlug, result)
                    .then(() => loadHistory())
                    .catch(console.error);
            }
        } catch (err) {
            setAnalysisError(err.message || t('mtg.deckInput.errors.analyzeFailed'));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSelectHistory = (run) => {
        setAnalysisResult(run.analysis_data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading || !user) return null;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
            <Header isDark={isDark} toggleTheme={toggleTheme} />

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {/* Page heading */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t('mtg.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('mtg.subtitle')}
                    </p>
                </div>

                {/* Input | Results grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
                    <div className="lg:col-span-2">
                        <DeckInput
                            onAnalyze={handleAnalyze}
                            isAnalyzing={isAnalyzing}
                            error={analysisError}
                        />
                    </div>
                    <div className="lg:col-span-3">
                        <AnalysisPanel result={analysisResult} loading={isAnalyzing} />
                    </div>
                </div>

                {/* History section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                    <AnalysisHistory
                        history={history}
                        loading={loadingHistory}
                        onSelect={handleSelectHistory}
                    />
                </div>
            </main>

            <Footer />
        </div>
    );
}

MtgAgent.propTypes = {
    isDark: PropTypes.bool.isRequired,
    toggleTheme: PropTypes.func.isRequired,
};
