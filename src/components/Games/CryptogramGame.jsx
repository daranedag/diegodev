import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowPathIcon,
    BackspaceIcon,
    CheckCircleIcon,
    LightBulbIcon,
    LinkIcon,
    LockClosedIcon,
    Squares2X2Icon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import cryptogramPhrases from '../../data/cryptogramPhrases';
import './CryptogramGame.css';

const MAX_ATTEMPTS = 3;
const STORAGE_PREFIX = 'diegodev-cryptogram-v1';
const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const normalizeLetter = (value) => value
    .toLocaleUpperCase('es')
    .replaceAll('Ñ', '\u0000')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('\u0000', 'Ñ')
    .replace(/[^A-ZÑ]/g, '');

const hashString = (value) => {
    let hash = 2166136261;
    for (const character of value) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const seededRandom = (initialSeed) => {
    let seed = initialSeed >>> 0;
    return () => {
        seed += 0x6D2B79F5;
        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

const buildPuzzle = (phrase, language) => {
    const text = phrase[language] ?? phrase.es;
    const letters = [...text].map(normalizeLetter).filter(Boolean);
    const uniqueLetters = [...new Set(letters)];
    const numbers = Array.from({ length: uniqueLetters.length }, (_, index) => index + 1);
    const random = seededRandom(hashString(`${phrase.id}:${language}`));

    for (let index = numbers.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [numbers[index], numbers[swapIndex]] = [numbers[swapIndex], numbers[index]];
    }

    const letterToNumber = Object.fromEntries(uniqueLetters.map((letter, index) => [letter, numbers[index]]));
    const numberToLetter = Object.fromEntries(uniqueLetters.map((letter) => [letterToNumber[letter], letter]));
    const frequencies = letters.reduce((counts, letter) => ({
        ...counts,
        [letter]: (counts[letter] ?? 0) + 1,
    }), {});
    const hintOrder = [...uniqueLetters]
        .sort((letterA, letterB) => frequencies[letterB] - frequencies[letterA])
        .map((letter) => letterToNumber[letter]);
    let cellIndex = 0;
    const words = text
        .split(/(\s+)/)
        .filter((part) => !/^\s+$/.test(part))
        .map((word) => [...word].map((character) => {
            const letter = normalizeLetter(character);
            if (!letter) return { id: `punctuation-${cellIndex++}`, character, isLetter: false };
            return {
                id: `cell-${cellIndex++}`,
                character,
                isLetter: true,
                letter,
                number: letterToNumber[letter],
            };
        }));
    const cells = words.flat().filter((cell) => cell.isLetter);

    return {
        text,
        words,
        cells,
        numberToLetter,
        hintOrder,
        initialHintNumber: hintOrder[0],
    };
};

const randomPhraseId = (excludedId = null) => {
    const choices = cryptogramPhrases.filter((phrase) => phrase.id !== excludedId);
    const randomValue = globalThis.crypto?.getRandomValues
        ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
        : Date.now();
    return choices[randomValue % choices.length].id;
};

const loadSession = (language) => {
    const fallback = {
        phraseId: randomPhraseId(),
        guesses: {},
        cellGuesses: {},
        revealedNumbers: [],
        fillMode: 'linked',
        attemptsUsed: 0,
        status: 'playing',
    };
    try {
        const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}:${language}`));
        if (!cryptogramPhrases.some((phrase) => phrase.id === saved?.phraseId)) return fallback;
        return {
            phraseId: saved.phraseId,
            guesses: saved.guesses && typeof saved.guesses === 'object' ? saved.guesses : {},
            cellGuesses: saved.cellGuesses && typeof saved.cellGuesses === 'object' ? saved.cellGuesses : {},
            revealedNumbers: Array.isArray(saved.revealedNumbers) ? saved.revealedNumbers.map(Number) : [],
            fillMode: saved.fillMode === 'single' ? 'single' : 'linked',
            attemptsUsed: Math.min(MAX_ATTEMPTS, Math.max(0, Number(saved.attemptsUsed) || 0)),
            status: ['playing', 'won', 'lost'].includes(saved.status) ? saved.status : 'playing',
        };
    } catch {
        return fallback;
    }
};

const CryptogramGame = () => {
    const { t, i18n } = useTranslation();
    const language = i18n.language?.startsWith('en') ? 'en' : 'es';
    const [session, setSession] = useState(() => loadSession(language));
    const [selectedCellId, setSelectedCellId] = useState(null);
    const [notice, setNotice] = useState('');

    const phrase = useMemo(() => (
        cryptogramPhrases.find((item) => item.id === session.phraseId) ?? cryptogramPhrases[0]
    ), [session.phraseId]);
    const puzzle = useMemo(() => buildPuzzle(phrase, language), [language, phrase]);
    const attributionType = phrase.author ? 'author' : 'source';
    const attributionValue = phrase[attributionType];
    const attribution = typeof attributionValue === 'string'
        ? attributionValue
        : attributionValue?.[language] ?? attributionValue?.es;

    useEffect(() => {
        setSession(loadSession(language));
        setSelectedCellId(null);
        setNotice('');
    }, [language]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_PREFIX}:${language}`, JSON.stringify(session));
    }, [language, session]);

    useEffect(() => {
        if (!Object.keys(session.guesses).length) return;
        setSession((current) => {
            const cellGuesses = { ...current.cellGuesses };
            puzzle.cells.forEach((cell) => {
                if (!cellGuesses[cell.id] && current.guesses[cell.number]) {
                    cellGuesses[cell.id] = current.guesses[cell.number];
                }
            });
            return { ...current, guesses: {}, cellGuesses };
        });
    }, [puzzle.cells, session.guesses]);

    const revealedNumbers = useMemo(() => new Set([
        puzzle.initialHintNumber,
        ...session.revealedNumbers,
    ]), [puzzle.initialHintNumber, session.revealedNumbers]);
    const getCellValue = useCallback((cell) => (
        revealedNumbers.has(cell.number) ? cell.letter : session.cellGuesses[cell.id] ?? ''
    ), [revealedNumbers, session.cellGuesses]);
    const selectedCell = useMemo(() => (
        puzzle.cells.find((cell) => cell.id === selectedCellId) ?? null
    ), [puzzle.cells, selectedCellId]);

    useEffect(() => {
        if (
            selectedCell
            && !revealedNumbers.has(selectedCell.number)
            && getCellValue(selectedCell) !== selectedCell.letter
        ) return;
        const firstEditable = puzzle.cells.find((cell) => (
            !revealedNumbers.has(cell.number) && getCellValue(cell) !== cell.letter
        ));
        setSelectedCellId(firstEditable?.id ?? null);
    }, [getCellValue, puzzle.cells, revealedNumbers, selectedCell]);

    const selectNextUnresolved = useCallback((currentCellId, guesses, fillMode) => {
        const currentIndex = puzzle.cells.findIndex((cell) => cell.id === currentCellId);
        const ordered = [
            ...puzzle.cells.slice(currentIndex + 1),
            ...puzzle.cells.slice(0, currentIndex + 1),
        ];
        const currentNumber = puzzle.cells[currentIndex]?.number;
        const next = ordered.find((cell) => (
            !revealedNumbers.has(cell.number)
            && guesses[cell.id] !== cell.letter
            && (fillMode === 'single' || cell.number !== currentNumber)
        ));
        if (next) setSelectedCellId(next.id);
    }, [puzzle.cells, revealedNumbers]);

    const enterLetter = useCallback((rawLetter) => {
        if (!selectedCell || session.status !== 'playing' || revealedNumbers.has(selectedCell.number)) return;
        const letter = normalizeLetter(rawLetter);
        if (letter.length !== 1) return;

        if (letter !== selectedCell.letter) {
            const attemptsUsed = session.attemptsUsed + 1;
            const isLost = attemptsUsed >= MAX_ATTEMPTS;
            setSession((current) => ({
                ...current,
                attemptsUsed,
                status: isLost ? 'lost' : 'playing',
            }));
            setNotice(isLost ? '' : t('cryptogram.notices.incorrectLetter', {
                count: MAX_ATTEMPTS - attemptsUsed,
            }));
            return;
        }

        const nextGuesses = { ...session.cellGuesses };
        puzzle.cells.forEach((cell) => {
            if (cell.number !== selectedCell.number && nextGuesses[cell.id] === letter) {
                delete nextGuesses[cell.id];
            }
        });

        if (session.fillMode === 'linked') {
            puzzle.cells.forEach((cell) => {
                if (cell.number === selectedCell.number) nextGuesses[cell.id] = letter;
            });
        } else {
            nextGuesses[selectedCell.id] = letter;
        }

        const isSolved = puzzle.cells.every((cell) => (
            revealedNumbers.has(cell.number) || nextGuesses[cell.id] === cell.letter
        ));
        setSession((current) => ({
            ...current,
            cellGuesses: nextGuesses,
            status: isSolved ? 'won' : 'playing',
        }));
        setNotice('');
        if (!isSolved) selectNextUnresolved(selectedCell.id, nextGuesses, session.fillMode);
    }, [puzzle.cells, revealedNumbers, selectNextUnresolved, selectedCell, session.attemptsUsed, session.cellGuesses, session.fillMode, session.status, t]);

    const clearSelected = useCallback(() => {
        if (!selectedCell || session.status !== 'playing' || revealedNumbers.has(selectedCell.number)) return;
        setSession((current) => {
            const cellGuesses = { ...current.cellGuesses };
            if (current.fillMode === 'linked') {
                puzzle.cells.forEach((cell) => {
                    if (cell.number === selectedCell.number) delete cellGuesses[cell.id];
                });
            } else {
                delete cellGuesses[selectedCell.id];
            }
            return { ...current, cellGuesses };
        });
        setNotice('');
    }, [puzzle.cells, revealedNumbers, selectedCell, session.status]);

    const clearBoard = () => {
        if (session.status !== 'playing') return;
        setSession((current) => ({ ...current, cellGuesses: {} }));
        setNotice('');
    };

    const changeFillMode = (fillMode) => {
        if (session.status !== 'playing' || fillMode === session.fillMode) return;
        setSession((current) => ({ ...current, fillMode }));
        setNotice(t(`cryptogram.notices.${fillMode}Mode`));
    };

    const revealHint = () => {
        if (session.status !== 'playing') return;
        const nextNumber = puzzle.hintOrder.find((number) => !revealedNumbers.has(number));
        if (!nextNumber) return;
        const letter = puzzle.numberToLetter[nextNumber];
        const cellGuesses = { ...session.cellGuesses };
        puzzle.cells.forEach((cell) => {
            if (cell.number === nextNumber || cellGuesses[cell.id] === letter) delete cellGuesses[cell.id];
        });
        const nextRevealedNumbers = new Set([...revealedNumbers, nextNumber]);
        const isSolved = puzzle.cells.every((cell) => (
            nextRevealedNumbers.has(cell.number) || cellGuesses[cell.id] === cell.letter
        ));
        setSession((current) => ({
            ...current,
            cellGuesses,
            revealedNumbers: [...new Set([...current.revealedNumbers, nextNumber])],
            status: isSolved ? 'won' : 'playing',
        }));
        setNotice(isSolved ? '' : t('cryptogram.notices.hintRevealed', { number: nextNumber, letter }));
    };

    const submitSolution = useCallback(() => {
        if (session.status !== 'playing') return;
        const isSolved = puzzle.cells.every((cell) => getCellValue(cell) === cell.letter);
        if (!isSolved) {
            setNotice(t('cryptogram.notices.unsolved'));
            return;
        }

        setSession((current) => ({ ...current, status: 'won' }));
        setNotice('');
    }, [getCellValue, puzzle.cells, session.status, t]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key === 'Enter') {
                event.preventDefault();
                submitSolution();
            } else if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                clearSelected();
            } else if (/^[a-zA-ZñÑáéíóúÁÉÍÓÚ]$/.test(event.key)) {
                enterLetter(event.key);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clearSelected, enterLetter, submitSolution]);

    const startNewPuzzle = () => {
        setSession((current) => ({
            phraseId: randomPhraseId(current.phraseId),
            guesses: {},
            cellGuesses: {},
            revealedNumbers: [],
            fillMode: current.fillMode,
            attemptsUsed: 0,
            status: 'playing',
        }));
        setSelectedCellId(null);
        setNotice('');
    };

    const assignedLetters = new Set(puzzle.cells.map(getCellValue).filter(Boolean));
    const solvedCount = puzzle.cells.filter((cell) => getCellValue(cell) === cell.letter).length;
    const progress = Math.round((solvedCount / puzzle.cells.length) * 100);
    const showSolution = session.status === 'won' || session.status === 'lost';
    const hintsAvailable = puzzle.hintOrder.some((number) => !revealedNumbers.has(number));

    return (
        <section className="cryptogram-shell" aria-label={t('cryptogram.gameLabel')}>
            <div className="cryptogram-topbar">
                <div className="cryptogram-attempts" aria-label={t('cryptogram.attemptsLabel')}>
                    <span>{t('cryptogram.attempts')}</span>
                    <div>
                        {Array.from({ length: MAX_ATTEMPTS }, (_, index) => (
                            <i className={index < MAX_ATTEMPTS - session.attemptsUsed ? 'is-available' : ''} key={index} />
                        ))}
                    </div>
                </div>
                <div className="cryptogram-progress">
                    <span>{t('cryptogram.progress')}</span>
                    <strong>{progress}%</strong>
                </div>
            </div>

            <div className="cryptogram-toolbar">
                <div className="cryptogram-mode" aria-label={t('cryptogram.fillMode.label')}>
                    <button
                        type="button"
                        className={session.fillMode === 'linked' ? 'is-active' : ''}
                        onClick={() => changeFillMode('linked')}
                        disabled={session.status !== 'playing'}
                        aria-pressed={session.fillMode === 'linked'}
                    >
                        <LinkIcon />
                        {t('cryptogram.fillMode.linked')}
                    </button>
                    <button
                        type="button"
                        className={session.fillMode === 'single' ? 'is-active' : ''}
                        onClick={() => changeFillMode('single')}
                        disabled={session.status !== 'playing'}
                        aria-pressed={session.fillMode === 'single'}
                    >
                        <Squares2X2Icon />
                        {t('cryptogram.fillMode.single')}
                    </button>
                </div>

                <div className="cryptogram-hints">
                    <div className="cryptogram-hint-list">
                        <LightBulbIcon />
                        <span>{t('cryptogram.hint')}</span>
                        {[...revealedNumbers].map((number) => (
                            <strong key={number}>{number} = {puzzle.numberToLetter[number]}</strong>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="cryptogram-hint-button"
                        onClick={revealHint}
                        disabled={!hintsAvailable || session.status !== 'playing'}
                    >
                        <LightBulbIcon />
                        {hintsAvailable ? t('cryptogram.revealHint') : t('cryptogram.noHints')}
                    </button>
                </div>
            </div>

            <div className={`cryptogram-board ${session.status === 'lost' ? 'is-revealed' : ''}`}>
                {puzzle.words.map((word, wordIndex) => (
                    <div className="cryptogram-word" key={wordIndex}>
                        {word.map((cell) => {
                            if (!cell.isLetter) {
                                return <span className="cryptogram-punctuation" key={cell.id}>{cell.character}</span>;
                            }
                            const isHint = revealedNumbers.has(cell.number);
                            const currentValue = getCellValue(cell);
                            const value = showSolution ? cell.letter : currentValue;
                            const isCorrect = value === cell.letter;
                            const isSelected = selectedCellId === cell.id
                                || (session.fillMode === 'linked' && selectedCell?.number === cell.number);
                            return (
                                <button
                                    type="button"
                                    className={`cryptogram-cell ${isSelected ? 'is-selected' : ''} ${isHint ? 'is-hint' : ''} ${showSolution ? 'is-solved' : ''}`}
                                    key={cell.id}
                                    onClick={() => {
                                        if (!isHint && !isCorrect && session.status === 'playing') setSelectedCellId(cell.id);
                                    }}
                                    aria-label={t('cryptogram.cellLabel', { number: cell.number, letter: value || t('cryptogram.emptyCell') })}
                                >
                                    <span>{value}</span>
                                    <small className={isCorrect ? 'is-hidden' : ''}>{cell.number}</small>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className={`cryptogram-notice ${notice ? 'is-visible' : ''}`} aria-live="polite">
                {notice || '\u00a0'}
            </div>

            {showSolution && (
                <div className={`cryptogram-result is-${session.status}`}>
                    {session.status === 'won' ? <CheckCircleIcon /> : <LockClosedIcon />}
                    <div>
                        <span>{t(`cryptogram.result.${session.status}Eyebrow`)}</span>
                        <strong>{t(`cryptogram.result.${session.status}`)}</strong>
                        <p>{puzzle.text}</p>
                        {session.status === 'won' && attribution && (
                            <p className="cryptogram-result-attribution">
                                <b>{t(`cryptogram.result.${attributionType}`)}:</b>
                                <cite>{attribution}</cite>
                            </p>
                        )}
                    </div>
                    <button type="button" onClick={startNewPuzzle}>
                        <ArrowPathIcon />
                        {t('cryptogram.newPhrase')}
                    </button>
                </div>
            )}

            <div className="cryptogram-controls">
                <div className="cryptogram-keyboard" aria-label={t('cryptogram.keyboardLabel')}>
                    {KEYBOARD_ROWS.map((row, rowIndex) => (
                        <div key={rowIndex}>
                            {row.map((letter) => (
                                <button
                                    type="button"
                                    key={letter}
                                    className={assignedLetters.has(letter) ? 'is-assigned' : ''}
                                    onClick={() => enterLetter(letter)}
                                    disabled={session.status !== 'playing'}
                                >
                                    {letter}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="cryptogram-actions">
                    <button type="button" className="cryptogram-clear" onClick={clearSelected} disabled={session.status !== 'playing'}>
                        <BackspaceIcon />
                        {t('cryptogram.delete')}
                    </button>
                    <button type="button" className="cryptogram-clear" onClick={clearBoard} disabled={session.status !== 'playing'}>
                        <XMarkIcon />
                        {t('cryptogram.clear')}
                    </button>
                    <button type="button" className="cryptogram-submit" onClick={submitSolution} disabled={session.status !== 'playing'}>
                        {t('cryptogram.check')}
                        <CheckCircleIcon />
                    </button>
                </div>
            </div>
        </section>
    );
};

export default CryptogramGame;
