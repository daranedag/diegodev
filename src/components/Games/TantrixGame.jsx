import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    CursorArrowRaysIcon,
    HandRaisedIcon,
    PlayIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import './TantrixGame.css';

const COLORS = {
    Y: '#f6c945',
    R: '#ef476f',
    B: '#3b82f6',
};

const COLOR_NAMES = { Y: 'yellow', R: 'red', B: 'blue' };
const OPPOSITE_SIDE = [3, 4, 5, 0, 1, 2];
const NEIGHBORS = [
    [1, -1],
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
];

// Official Discovery tile order. Each string lists the six edge colours clockwise.
const TILES = [
    { id: 1, edges: 'YYBRBR' },
    { id: 2, edges: 'YYBRRB' },
    { id: 3, edges: 'RRBBYY' },
    { id: 4, edges: 'YRBRYB' },
    { id: 5, edges: 'YYRBBR' },
    { id: 6, edges: 'RBYBRY' },
    { id: 7, edges: 'BBYRYR' },
    { id: 8, edges: 'BBRYRY' },
    { id: 9, edges: 'YBRBYR' },
    { id: 10, edges: 'YYRBRB' },
];

const CHALLENGES = [
    { id: '3-Y', count: 3, color: 'Y', referenceSeconds: 20 },
    { id: '4-R', count: 4, color: 'R', referenceSeconds: 40 },
    { id: '5-R', count: 5, color: 'R', referenceSeconds: 60 },
    { id: '6-B', count: 6, color: 'B', referenceSeconds: 180 },
    { id: '7-R', count: 7, color: 'R', referenceSeconds: 360 },
    { id: '8-B', count: 8, color: 'B', referenceSeconds: 600 },
    { id: '9-Y', count: 9, color: 'Y', referenceSeconds: 900 },
    { id: '10-R', count: 10, color: 'R', referenceSeconds: 1080 },
    { id: '10-B', count: 10, color: 'B', referenceSeconds: 1200 },
    { id: '10-Y', count: 10, color: 'Y', referenceSeconds: 1500 },
];

const BOARD_RADIUS = 4;
const HEX_SIZE = 45;
const BOARD_CENTER = { x: 410, y: 330 };

const keyOf = (q, r) => `${q},${r}`;
const parseKey = key => key.split(',').map(Number);
const tileById = id => TILES[id - 1];

const BOARD_CELLS = [];
for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q += 1) {
    const minimumR = Math.max(-BOARD_RADIUS, -q - BOARD_RADIUS);
    const maximumR = Math.min(BOARD_RADIUS, -q + BOARD_RADIUS);
    for (let r = minimumR; r <= maximumR; r += 1) {
        BOARD_CELLS.push({ q, r, key: keyOf(q, r) });
    }
}

const cellCenter = (q, r) => ({
    x: BOARD_CENTER.x + HEX_SIZE * Math.sqrt(3) * (q + r / 2),
    y: BOARD_CENTER.y + HEX_SIZE * 1.5 * r,
});

const pointAt = (angle, radius) => ({
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
});

const HEX_POINTS = Array.from({ length: 6 }, (_, index) => {
    const point = pointAt(-Math.PI / 2 + (index * Math.PI) / 3, HEX_SIZE);
    return `${point.x},${point.y}`;
}).join(' ');

const edgePoint = (side, size = HEX_SIZE) =>
    pointAt(-Math.PI / 3 + (side * Math.PI) / 3, (size * Math.sqrt(3)) / 2);

const pathForPair = (firstSide, secondSide, size = HEX_SIZE) => {
    const start = edgePoint(firstSide, size);
    const end = edgePoint(secondSide, size);
    let difference = (secondSide - firstSide + 6) % 6;
    if (difference > 3) difference -= 6;

    if (Math.abs(difference) === 3) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    const startAngle = -Math.PI / 3 + (firstSide * Math.PI) / 3;
    const middleAngle = startAngle + (difference * Math.PI) / 6;
    const controlRadius = Math.abs(difference) === 1 ? size * 0.98 : size * 0.18;
    const control = pointAt(middleAngle, controlRadius);
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
};

const getColorAtSide = (tile, rotation, side) => tile.edges[(((side - rotation) % 6) + 6) % 6];

const getTilePaths = tile =>
    Object.keys(COLORS).map(color => {
        const sides = [...tile.edges].reduce(
            (matches, edgeColor, index) => (edgeColor === color ? [...matches, index] : matches),
            []
        );
        return { color, path: pathForPair(sides[0], sides[1]) };
    });

const formatTime = seconds => {
    const minutes = Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0');
    const remainder = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
};

const formatReferenceTime = seconds => (seconds < 60 ? `${seconds}s` : `${seconds / 60}m`);

const validateBoard = (activeTiles, placements, rotations, targetColor) => {
    if (Object.keys(placements).length !== activeTiles.length) {
        return {
            valid: false,
            reason: 'incomplete',
            remaining: activeTiles.length - Object.keys(placements).length,
        };
    }

    const idAtPosition = Object.entries(placements).reduce(
        (result, [id, key]) => ({ ...result, [key]: Number(id) }),
        {}
    );
    const firstId = activeTiles[0].id;
    const connected = new Set([firstId]);
    const queue = [firstId];

    while (queue.length) {
        const currentId = queue.shift();
        const [q, r] = parseKey(placements[currentId]);
        NEIGHBORS.forEach(([dq, dr]) => {
            const neighborId = idAtPosition[keyOf(q + dq, r + dr)];
            if (neighborId && !connected.has(neighborId)) {
                connected.add(neighborId);
                queue.push(neighborId);
            }
        });
    }

    if (connected.size !== activeTiles.length) return { valid: false, reason: 'disconnected' };

    let mismatches = 0;
    activeTiles.forEach(tile => {
        const [q, r] = parseKey(placements[tile.id]);
        NEIGHBORS.forEach(([dq, dr], side) => {
            const neighborId = idAtPosition[keyOf(q + dq, r + dr)];
            if (!neighborId || tile.id > neighborId) return;
            const neighbor = tileById(neighborId);
            const ownColor = getColorAtSide(tile, rotations[tile.id] ?? 0, side);
            const neighborColor = getColorAtSide(
                neighbor,
                rotations[neighborId] ?? 0,
                OPPOSITE_SIDE[side]
            );
            if (ownColor !== neighborColor) mismatches += 1;
        });
    });

    if (mismatches) return { valid: false, reason: 'mismatch', count: mismatches };

    const loopVisited = new Set([firstId]);
    const loopQueue = [firstId];
    let openEnds = 0;

    activeTiles.forEach(tile => {
        const [q, r] = parseKey(placements[tile.id]);
        for (let side = 0; side < 6; side += 1) {
            if (getColorAtSide(tile, rotations[tile.id] ?? 0, side) !== targetColor) continue;
            const [dq, dr] = NEIGHBORS[side];
            const neighborId = idAtPosition[keyOf(q + dq, r + dr)];
            if (!neighborId) openEnds += 1;
        }
    });

    if (openEnds) return { valid: false, reason: 'openLoop' };

    while (loopQueue.length) {
        const currentId = loopQueue.shift();
        const currentTile = tileById(currentId);
        const [q, r] = parseKey(placements[currentId]);
        for (let side = 0; side < 6; side += 1) {
            if (getColorAtSide(currentTile, rotations[currentId] ?? 0, side) !== targetColor)
                continue;
            const [dq, dr] = NEIGHBORS[side];
            const neighborId = idAtPosition[keyOf(q + dq, r + dr)];
            if (neighborId && !loopVisited.has(neighborId)) {
                loopVisited.add(neighborId);
                loopQueue.push(neighborId);
            }
        }
    }

    if (loopVisited.size !== activeTiles.length) return { valid: false, reason: 'multipleLoops' };
    return { valid: true, reason: 'success' };
};

const TileArtwork = ({ tile, rotation = 0, selected = false, dragging = false }) => (
    <g
        className={`tantrix-tile-art ${selected ? 'is-selected' : ''} ${dragging ? 'is-dragging' : ''}`}
    >
        {selected && <polygon className="tantrix-selection-ring" points={HEX_POINTS} />}
        <g className="tantrix-tile-rotation" style={{ transform: `rotate(${rotation * 60}deg)` }}>
            <polygon className="tantrix-tile-face" points={HEX_POINTS} />
            {getTilePaths(tile).map(({ color, path }) => (
                <g key={color}>
                    <path className="tantrix-path-outline" d={path} />
                    <path className="tantrix-color-path" d={path} stroke={COLORS[color]} />
                </g>
            ))}
        </g>
        <circle className="tantrix-tile-number-bg" cx="0" cy="0" r="10" />
        <text className="tantrix-tile-number" x="0" y="4">
            {tile.id}
        </text>
    </g>
);

const MiniTile = ({
    tile,
    rotation,
    selected,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeyboardActivate,
}) => (
    <button
        type="button"
        className={`tantrix-tray-tile ${selected ? 'is-selected' : ''}`}
        aria-label={`${tile.id}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') onKeyboardActivate();
        }}
    >
        <svg viewBox="-54 -54 108 108" aria-hidden="true">
            <TileArtwork tile={tile} rotation={rotation} selected={selected} />
        </svg>
    </button>
);

const TantrixGame = () => {
    const { t } = useTranslation();
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [interactionMode, setInteractionMode] = useState('drag');
    const [placements, setPlacements] = useState({});
    const [rotations, setRotations] = useState({});
    const [selectedTile, setSelectedTile] = useState(null);
    const [moves, setMoves] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [started, setStarted] = useState(false);
    const [status, setStatus] = useState('playing');
    const [notice, setNotice] = useState('');
    const [dragGhost, setDragGhost] = useState(null);
    const dragState = useRef(null);
    const challenge = CHALLENGES[challengeIndex];
    const activeTiles = useMemo(() => TILES.slice(0, challenge.count), [challenge.count]);
    const placedAt = useMemo(
        () =>
            Object.entries(placements).reduce(
                (result, [id, key]) => ({
                    ...result,
                    [key]: Number(id),
                }),
                {}
            ),
        [placements]
    );

    const resetChallenge = useCallback(
        (nextChallengeIndex = challengeIndex) => {
            const nextRotations = TILES.reduce((result, tile) => ({ ...result, [tile.id]: 0 }), {});
            setChallengeIndex(nextChallengeIndex);
            setPlacements({});
            setRotations(nextRotations);
            setSelectedTile(null);
            setMoves(0);
            setElapsed(0);
            setStarted(false);
            setStatus('playing');
            setNotice('');
            setDragGhost(null);
            dragState.current = null;
        },
        [challengeIndex]
    );

    useEffect(() => {
        if (!started || status !== 'playing') return undefined;
        const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, [started, status]);

    useEffect(() => {
        if (status !== 'playing' || Object.keys(placements).length !== activeTiles.length) return;
        const result = validateBoard(activeTiles, placements, rotations, challenge.color);
        if (result.valid) {
            setStatus('won');
            setSelectedTile(null);
            setNotice('');
        }
    }, [activeTiles, challenge.color, placements, rotations, status]);

    const beginPlay = () => {
        if (!started) setStarted(true);
    };

    const rotateTile = tileId => {
        if (status !== 'playing') return;
        beginPlay();
        setRotations(current => ({ ...current, [tileId]: (current[tileId] ?? 0) + 1 }));
        setMoves(value => value + 1);
        setNotice('');
    };

    const placeTile = (tileId, targetKey) => {
        if (status !== 'playing') return;
        const occupant = placedAt[targetKey];
        if (occupant && occupant !== tileId) {
            setNotice(t('tantrix.notices.occupied'));
            return;
        }
        if (placements[tileId] === targetKey) return;
        beginPlay();
        setPlacements(current => ({ ...current, [tileId]: targetKey }));
        setSelectedTile(null);
        setMoves(value => value + 1);
        setNotice('');
    };

    const returnToTray = tileId => {
        if (!placements[tileId] || status !== 'playing') return;
        beginPlay();
        setPlacements(current => {
            const next = { ...current };
            delete next[tileId];
            return next;
        });
        setSelectedTile(null);
        setMoves(value => value + 1);
        setNotice('');
    };

    const handleTileTap = tileId => {
        if (interactionMode === 'drag') {
            rotateTile(tileId);
            return;
        }
        if (selectedTile === tileId) {
            rotateTile(tileId);
        } else {
            setSelectedTile(tileId);
            setNotice(t('tantrix.notices.selected', { number: tileId }));
        }
    };

    const handlePointerDown = (event, tileId) => {
        if (status !== 'playing') return;
        event.stopPropagation();
        dragState.current = {
            tileId,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = event => {
        const drag = dragState.current;
        if (!drag || drag.pointerId !== event.pointerId || interactionMode !== 'drag') return;
        const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (distance > 7) drag.moved = true;
        if (drag.moved) {
            setDragGhost({ tileId: drag.tileId, x: event.clientX, y: event.clientY });
        }
    };

    const finishPointer = (event, cancelled = false) => {
        const drag = dragState.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.stopPropagation();
        const wasMoved = drag.moved;
        dragState.current = null;
        setDragGhost(null);

        if (cancelled) return;
        if (interactionMode === 'drag' && wasMoved) {
            const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
            const cell = dropTarget?.closest?.('[data-cell-key]');
            const tray = dropTarget?.closest?.('[data-tray-drop]');
            if (cell) placeTile(drag.tileId, cell.dataset.cellKey);
            else if (tray) returnToTray(drag.tileId);
            return;
        }
        handleTileTap(drag.tileId);
    };

    const handleEmptyCell = key => {
        if (interactionMode === 'select' && selectedTile) placeTile(selectedTile, key);
    };

    const handleTrayClick = () => {
        if (interactionMode === 'select' && selectedTile && placements[selectedTile]) {
            returnToTray(selectedTile);
        }
    };

    const checkSolution = () => {
        const result = validateBoard(activeTiles, placements, rotations, challenge.color);
        if (result.valid) {
            setStatus('won');
            setNotice('');
            return;
        }
        setNotice(
            t(`tantrix.notices.${result.reason}`, {
                count: result.count,
                remaining: result.remaining,
            })
        );
    };

    const changeMode = mode => {
        setInteractionMode(mode);
        setSelectedTile(null);
        setNotice(t(`tantrix.notices.${mode}Mode`));
    };

    const goToNextChallenge = () => resetChallenge((challengeIndex + 1) % CHALLENGES.length);
    const targetName = t(`tantrix.colors.${COLOR_NAMES[challenge.color]}`);
    const remainingTiles = activeTiles.filter(tile => !placements[tile.id]);

    return (
        <section className="tantrix-game" aria-label={t('tantrix.gameLabel')}>
            <div className="tantrix-topbar">
                <div className="tantrix-challenge-summary">
                    <span>{t('tantrix.challenge')}</span>
                    <strong>
                        {challenge.count} {t('tantrix.tiles')}
                    </strong>
                    <span
                        className="tantrix-target"
                        style={{ '--target-color': COLORS[challenge.color] }}
                    >
                        <i />
                        {targetName}
                    </span>
                </div>
                <div className="tantrix-stats">
                    <div>
                        <span>{t('tantrix.time')}</span>
                        <strong>{formatTime(elapsed)}</strong>
                    </div>
                    <div>
                        <span>{t('tantrix.moves')}</span>
                        <strong>{moves}</strong>
                    </div>
                    <div>
                        <span>{t('tantrix.reference')}</span>
                        <strong>{formatReferenceTime(challenge.referenceSeconds)}</strong>
                    </div>
                </div>
            </div>

            <div className="tantrix-challenge-picker" aria-label={t('tantrix.chooseChallenge')}>
                {CHALLENGES.map((item, index) => (
                    <button
                        type="button"
                        key={item.id}
                        className={challengeIndex === index ? 'is-active' : ''}
                        onClick={() => resetChallenge(index)}
                        aria-label={`${item.count} ${t('tantrix.tiles')}, ${t(`tantrix.colors.${COLOR_NAMES[item.color]}`)}`}
                    >
                        <span>{item.count}</span>
                        <i style={{ '--challenge-color': COLORS[item.color] }} />
                    </button>
                ))}
            </div>

            <div className="tantrix-mode-row">
                <div
                    className="tantrix-mode-switch"
                    role="group"
                    aria-label={t('tantrix.interactionMode')}
                >
                    <button
                        type="button"
                        className={interactionMode === 'drag' ? 'is-active' : ''}
                        onClick={() => changeMode('drag')}
                    >
                        <HandRaisedIcon />
                        {t('tantrix.dragMode')}
                    </button>
                    <button
                        type="button"
                        className={interactionMode === 'select' ? 'is-active' : ''}
                        onClick={() => changeMode('select')}
                    >
                        <CursorArrowRaysIcon />
                        {t('tantrix.selectMode')}
                    </button>
                </div>
                <p>{t(`tantrix.${interactionMode}Instruction`)}</p>
            </div>

            <div className="tantrix-play-area">
                <div className="tantrix-board-wrap">
                    <svg
                        className="tantrix-board"
                        viewBox="0 0 820 660"
                        role="application"
                        aria-label={t('tantrix.boardLabel')}
                    >
                        {BOARD_CELLS.map(cell => {
                            const center = cellCenter(cell.q, cell.r);
                            const tileId = placedAt[cell.key];
                            const tile = tileId ? tileById(tileId) : null;
                            return (
                                <g
                                    key={cell.key}
                                    transform={`translate(${center.x} ${center.y})`}
                                    data-cell-key={cell.key}
                                    className={`tantrix-cell ${interactionMode === 'select' && selectedTile && !tile ? 'can-place' : ''}`}
                                    onClick={() => !tile && handleEmptyCell(cell.key)}
                                >
                                    <polygon className="tantrix-cell-shape" points={HEX_POINTS} />
                                    {tile && (
                                        <g
                                            className="tantrix-board-tile"
                                            role="button"
                                            tabIndex="0"
                                            aria-label={t('tantrix.tileLabel', {
                                                number: tile.id,
                                                rotation: (rotations[tile.id] ?? 0) % 6,
                                            })}
                                            onPointerDown={event =>
                                                handlePointerDown(event, tile.id)
                                            }
                                            onPointerMove={handlePointerMove}
                                            onPointerUp={event => finishPointer(event)}
                                            onPointerCancel={event => finishPointer(event, true)}
                                            onKeyDown={event => {
                                                if (event.key === 'Enter' || event.key === ' ')
                                                    handleTileTap(tile.id);
                                            }}
                                        >
                                            <TileArtwork
                                                tile={tile}
                                                rotation={rotations[tile.id] ?? 0}
                                                selected={selectedTile === tile.id}
                                                dragging={dragGhost?.tileId === tile.id}
                                            />
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {status === 'won' && (
                        <div
                            className="tantrix-complete"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="tantrix-complete-title"
                        >
                            <SparklesIcon />
                            <p>{t('tantrix.completeEyebrow')}</p>
                            <h2 id="tantrix-complete-title">{t('tantrix.completeTitle')}</h2>
                            <span>
                                {t('tantrix.completeDescription', {
                                    count: challenge.count,
                                    color: targetName,
                                })}
                            </span>
                            <div className="tantrix-complete-stats">
                                <div>
                                    <strong>{formatTime(elapsed)}</strong>
                                    <span>{t('tantrix.time')}</span>
                                </div>
                                <div>
                                    <strong>{moves}</strong>
                                    <span>{t('tantrix.moves')}</span>
                                </div>
                            </div>
                            <button type="button" onClick={goToNextChallenge}>
                                <PlayIcon />
                                {t('tantrix.nextChallenge')}
                            </button>
                        </div>
                    )}
                </div>

                <aside
                    className={`tantrix-tray ${interactionMode === 'select' && selectedTile && placements[selectedTile] ? 'can-return' : ''}`}
                    data-tray-drop
                    onClick={handleTrayClick}
                >
                    <div className="tantrix-tray-heading">
                        <div>
                            <span>{t('tantrix.tray')}</span>
                            <strong>
                                {remainingTiles.length} {t('tantrix.remaining')}
                            </strong>
                        </div>
                        <small>{t('tantrix.trayHint')}</small>
                    </div>
                    <div className="tantrix-tray-grid">
                        {remainingTiles.map(tile => (
                            <MiniTile
                                key={tile.id}
                                tile={tile}
                                rotation={rotations[tile.id] ?? 0}
                                selected={selectedTile === tile.id}
                                onPointerDown={event => handlePointerDown(event, tile.id)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={event => finishPointer(event)}
                                onPointerCancel={event => finishPointer(event, true)}
                                onKeyboardActivate={() => handleTileTap(tile.id)}
                            />
                        ))}
                    </div>
                    {!remainingTiles.length && (
                        <p className="tantrix-empty-tray">{t('tantrix.allPlaced')}</p>
                    )}
                </aside>
            </div>

            <div className="tantrix-footer-row">
                <div className={`tantrix-notice ${notice ? 'is-visible' : ''}`} aria-live="polite">
                    {notice}
                </div>
                <div className="tantrix-actions">
                    <button
                        type="button"
                        className="tantrix-reset"
                        onClick={() => resetChallenge()}
                    >
                        <ArrowPathIcon />
                        {t('tantrix.restart')}
                    </button>
                    <button type="button" className="tantrix-check" onClick={checkSolution}>
                        <CheckCircleIcon />
                        {t('tantrix.check')}
                    </button>
                </div>
            </div>

            {dragGhost && (
                <div
                    className="tantrix-drag-ghost"
                    style={{ left: dragGhost.x, top: dragGhost.y }}
                    aria-hidden="true"
                >
                    <svg viewBox="-54 -54 108 108">
                        <TileArtwork
                            tile={tileById(dragGhost.tileId)}
                            rotation={rotations[dragGhost.tileId] ?? 0}
                            dragging
                        />
                    </svg>
                </div>
            )}
        </section>
    );
};

export default TantrixGame;
