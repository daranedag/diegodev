import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowRightIcon,
    BackspaceIcon,
    CheckCircleIcon,
    ClipboardDocumentIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import spanishFiveLetterWords from '../../data/spanishFiveLetterWords';
import spanishSixLetterWords from '../../data/spanishSixLetterWords';
import './WordleGame.css';

const MAX_GUESSES = 6;
const ROTATION_MS = 3 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'diegodev-wordle-3h';
const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
    ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
];
const STATUS_PRIORITY = { absent: 1, present: 2, correct: 3 };
const WORDS = [...spanishFiveLetterWords, ...spanishSixLetterWords];

const getSlot = (timestamp) => Math.floor(timestamp / ROTATION_MS);

const getWordForSlot = (slot) => {
    const mixedSeed = Math.imul(slot ^ (slot >>> 16), 2654435761) >>> 0;
    return WORDS[mixedSeed % WORDS.length];
};

const normalizeWord = (value) => value
    .toLocaleLowerCase('es')
    .replaceAll('ñ', '\u0000')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('\u0000', 'ñ')
    .replace(/[^a-zñ]/g, '');

const evaluateGuess = (guess, target) => {
    const result = Array(target.length).fill('absent');
    const remaining = {};

    [...guess].forEach((letter, index) => {
        if (letter === target[index]) {
            result[index] = 'correct';
        } else {
            remaining[target[index]] = (remaining[target[index]] || 0) + 1;
        }
    });

    [...guess].forEach((letter, index) => {
        if (result[index] === 'correct') return;
        if (remaining[letter] > 0) {
            result[index] = 'present';
            remaining[letter] -= 1;
        }
    });

    return result;
};

const loadGame = (slot, target) => {
    try {
        const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}:game:${slot}`));
        const guesses = Array.isArray(saved?.guesses)
            ? saved.guesses.filter((guess) => normalizeWord(guess).length === target.length).slice(0, MAX_GUESSES)
            : [];
        const won = guesses.includes(target);
        return { guesses, gameStatus: won ? 'won' : guesses.length === MAX_GUESSES ? 'lost' : 'playing' };
    } catch {
        return { guesses: [], gameStatus: 'playing' };
    }
};

const loadStats = () => {
    try {
        return {
            played: 0,
            wins: 0,
            streak: 0,
            bestStreak: 0,
            lastCompletedSlot: null,
            ...JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}:stats`)),
        };
    } catch {
        return { played: 0, wins: 0, streak: 0, bestStreak: 0, lastCompletedSlot: null };
    }
};

const formatCountdown = (milliseconds) => {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':');
};

const WordleGame = () => {
    const { t } = useTranslation();
    const [now, setNow] = useState(Date.now());
    const slot = getSlot(now);
    const target = useMemo(() => getWordForSlot(slot), [slot]);
    const wordLength = target.length;
    const initialGame = useMemo(() => loadGame(slot, target), [slot, target]);
    const [guesses, setGuesses] = useState(initialGame.guesses);
    const [gameStatus, setGameStatus] = useState(initialGame.gameStatus);
    const [currentGuess, setCurrentGuess] = useState('');
    const [notice, setNotice] = useState('');
    const [revealingRow, setRevealingRow] = useState(-1);
    const [stats, setStats] = useState(loadStats);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const savedGame = loadGame(slot, target);
        setGuesses(savedGame.guesses);
        setGameStatus(savedGame.gameStatus);
        setCurrentGuess('');
        setNotice('');
        setRevealingRow(-1);
    }, [slot, target]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}:game:${slot}`, JSON.stringify({ guesses }));
    }, [guesses, slot]);

    const finishGame = useCallback((didWin) => {
        setStats((previous) => {
            if (previous.lastCompletedSlot === slot) return previous;

            const streak = didWin ? previous.streak + 1 : 0;
            const nextStats = {
                played: previous.played + 1,
                wins: previous.wins + (didWin ? 1 : 0),
                streak,
                bestStreak: Math.max(previous.bestStreak, streak),
                lastCompletedSlot: slot,
            };
            localStorage.setItem(`${STORAGE_PREFIX}:stats`, JSON.stringify(nextStats));
            return nextStats;
        });
    }, [slot]);

    const submitGuess = useCallback(() => {
        if (gameStatus !== 'playing') return;
        if (currentGuess.length !== wordLength) {
            setNotice(t('wordle.notices.incomplete', { count: wordLength }));
            return;
        }

        const submittedGuess = currentGuess;
        const nextGuesses = [...guesses, submittedGuess];
        const didWin = submittedGuess === target;
        const didLose = !didWin && nextGuesses.length === MAX_GUESSES;

        setGuesses(nextGuesses);
        setCurrentGuess('');
        setNotice('');
        setRevealingRow(nextGuesses.length - 1);

        if (didWin) {
            setGameStatus('won');
            finishGame(true);
        } else if (didLose) {
            setGameStatus('lost');
            finishGame(false);
        }
    }, [currentGuess, finishGame, gameStatus, guesses, t, target, wordLength]);

    const handleInput = useCallback((key) => {
        if (gameStatus !== 'playing') return;

        if (key === 'enter') {
            submitGuess();
            return;
        }
        if (key === 'backspace') {
            setCurrentGuess((value) => value.slice(0, -1));
            setNotice('');
            return;
        }

        const letter = normalizeWord(key);
        if (letter.length !== 1) return;
        setCurrentGuess((value) => value.length < wordLength ? `${value}${letter}` : value);
        setNotice('');
    }, [gameStatus, submitGuess, wordLength]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key === 'Enter') {
                event.preventDefault();
                handleInput('enter');
            } else if (event.key === 'Backspace') {
                event.preventDefault();
                handleInput('backspace');
            } else if (/^[a-zA-ZñÑáéíóúÁÉÍÓÚ]$/.test(event.key)) {
                handleInput(event.key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleInput]);

    const keyboardStatuses = useMemo(() => {
        const statuses = {};
        guesses.forEach((guess) => {
            evaluateGuess(guess, target).forEach((status, index) => {
                const letter = guess[index];
                if (!statuses[letter] || STATUS_PRIORITY[status] > STATUS_PRIORITY[statuses[letter]]) {
                    statuses[letter] = status;
                }
            });
        });
        return statuses;
    }, [guesses, target]);

    const copyResult = async () => {
        const squares = guesses.map((guess) => evaluateGuess(guess, target)
            .map((status) => ({ correct: '🟩', present: '🟨', absent: '⬛' })[status])
            .join(''))
            .join('\n');
        const resultText = `Palabra #${slot} ${guesses.length}/${MAX_GUESSES}\n${squares}`;

        try {
            await navigator.clipboard.writeText(resultText);
            setNotice(t('wordle.notices.copied'));
        } catch {
            setNotice(t('wordle.notices.copyFailed'));
        }
    };

    const rows = Array.from({ length: MAX_GUESSES }, (_, rowIndex) => {
        const submitted = guesses[rowIndex];
        const isActive = rowIndex === guesses.length && gameStatus === 'playing';
        const letters = submitted || (isActive ? currentGuess : '');
        const evaluation = submitted ? evaluateGuess(submitted, target) : null;

        return (
            <div className="wordle-row" key={rowIndex} aria-label={t('wordle.rowLabel', { number: rowIndex + 1 })}>
                {Array.from({ length: wordLength }, (_, letterIndex) => {
                    const status = evaluation?.[letterIndex];
                    const isRevealing = revealingRow === rowIndex;
                    return (
                        <div
                            className={`wordle-tile ${letters[letterIndex] ? 'wordle-tile-filled' : ''} ${status ? `wordle-tile-${status}` : ''} ${isRevealing ? 'wordle-tile-reveal' : ''}`}
                            data-status={status || undefined}
                            style={isRevealing ? { '--reveal-delay': `${letterIndex * 90}ms` } : undefined}
                            key={letterIndex}
                        >
                            {letters[letterIndex]?.toLocaleUpperCase('es') || ''}
                        </div>
                    );
                })}
            </div>
        );
    });

    const nextRotation = (slot + 1) * ROTATION_MS;
    const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

    return (
        <section className="wordle-shell" aria-label={t('wordle.gameLabel')}>
            <div className="wordle-topbar">
                <div>
                    <span className="wordle-kicker">{t('wordle.round')}</span>
                    <strong>#{slot}</strong>
                </div>
                <div className="wordle-countdown" aria-live="off">
                    <ClockIcon />
                    <span>
                        <small>{t('wordle.nextWord')}</small>
                        <strong>{formatCountdown(nextRotation - now)}</strong>
                    </span>
                </div>
            </div>

            <div className="wordle-content" style={{ '--word-length': wordLength }}>
                <div className="wordle-board-wrap">
                    <div className="wordle-board">{rows}</div>
                    <div className={`wordle-notice ${notice ? 'wordle-notice-visible' : ''}`} aria-live="polite">
                        {notice || '\u00a0'}
                    </div>
                </div>

                <div className="wordle-controls">
                    {gameStatus !== 'playing' && (
                        <div className={`wordle-result wordle-result-${gameStatus}`}>
                            <CheckCircleIcon />
                            <div>
                                <span>{gameStatus === 'won' ? t('wordle.result.wonEyebrow') : t('wordle.result.lostEyebrow')}</span>
                                <strong>{gameStatus === 'won' ? t('wordle.result.won') : t('wordle.result.lost')}</strong>
                                <p>{t('wordle.result.answer')} <b>{target.toLocaleUpperCase('es')}</b></p>
                            </div>
                            <button type="button" onClick={copyResult} aria-label={t('wordle.copyResult')}>
                                <ClipboardDocumentIcon />
                            </button>
                        </div>
                    )}

                    <div className="wordle-keyboard" aria-label={t('wordle.keyboardLabel')}>
                        {KEYBOARD_ROWS.map((row, rowIndex) => (
                            <div className="wordle-keyboard-row" key={rowIndex}>
                                {row.map((key) => {
                                    const isSpecial = key === 'enter' || key === 'backspace';
                                    return (
                                        <button
                                            type="button"
                                            key={key}
                                            onClick={() => handleInput(key)}
                                            className={`wordle-key ${isSpecial ? 'wordle-key-wide' : ''} ${keyboardStatuses[key] ? `wordle-key-${keyboardStatuses[key]}` : ''}`}
                                            aria-label={key === 'backspace' ? t('wordle.delete') : key === 'enter' ? t('wordle.submit') : key}
                                            disabled={gameStatus !== 'playing'}
                                        >
                                            {key === 'backspace' ? <BackspaceIcon /> : key === 'enter' ? t('wordle.enterKey') : key}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="wordle-submit-button"
                        onClick={submitGuess}
                        disabled={gameStatus !== 'playing'}
                    >
                        {t('wordle.submit')}
                        <ArrowRightIcon />
                    </button>
                </div>
            </div>

            <div className="wordle-stats" aria-label={t('wordle.stats.label')}>
                <div><strong>{stats.played}</strong><span>{t('wordle.stats.played')}</span></div>
                <div><strong>{winRate}%</strong><span>{t('wordle.stats.wins')}</span></div>
                <div><strong>{stats.streak}</strong><span>{t('wordle.stats.streak')}</span></div>
                <div><strong>{stats.bestStreak}</strong><span>{t('wordle.stats.best')}</span></div>
            </div>
        </section>
    );
};

export default WordleGame;
