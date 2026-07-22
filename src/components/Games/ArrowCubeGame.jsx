import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowPathIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    LightBulbIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import './ArrowCubeGame.css';

const FACE_SIZE = 1;
const SURFACE_LIFT = 0;
const ARROW_FACE_VISIBILITY = 0.075;
const FACE_DEFINITIONS = [
    { id: 'front', n: [0, 0, 1], u: [1, 0, 0], v: [0, -1, 0], hue: 266 },
    { id: 'right', n: [1, 0, 0], u: [0, 0, -1], v: [0, -1, 0], hue: 224 },
    { id: 'back', n: [0, 0, -1], u: [-1, 0, 0], v: [0, -1, 0], hue: 194 },
    { id: 'left', n: [-1, 0, 0], u: [0, 0, 1], v: [0, -1, 0], hue: 324 },
    { id: 'top', n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], hue: 284 },
    { id: 'bottom', n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], hue: 178 },
];

const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const scale = (vector, amount) => vector.map((value) => value * amount);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const length = (vector) => Math.hypot(...vector);
const normalize = (vector) => scale(vector, 1 / (length(vector) || 1));
const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
];
const mix = (...vectors) => vectors.reduce((result, vector) => add(result, vector), [0, 0, 0]);
const midpoint = (a, b) => scale(add(a, b), 0.5);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

const mulberry32 = (seed) => () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
};

const pointOnFace = (face, x, y, lift = 0) => mix(
    scale(face.n, FACE_SIZE + lift),
    scale(face.u, x),
    scale(face.v, y),
);

const advanceAcrossSurface = (initialState, distance) => {
    let state = {
        point: [...initialState.point],
        normal: [...initialState.normal],
        direction: [...initialState.direction],
    };
    let remaining = distance;
    const segments = [];

    while (remaining > 0.0001) {
        const distanceToEdge = Math.max(0, 1 - dot(state.point, state.direction));
        if (distanceToEdge <= 0.0001) {
            const previousNormal = state.normal;
            state.normal = state.direction;
            state.direction = scale(previousNormal, -1);
            continue;
        }

        const travel = Math.min(remaining, distanceToEdge);
        const nextPoint = add(state.point, scale(state.direction, travel));

        if (travel > 0.0001) {
            segments.push({
                from: state.point,
                to: nextPoint,
                normal: state.normal,
            });
        }

        state.point = nextPoint;
        remaining -= travel;

        if (remaining > 0.0001 && distanceToEdge <= travel + 0.0001) {
            const previousNormal = state.normal;
            state.normal = state.direction;
            state.direction = scale(previousNormal, -1);
        }
    }

    return { state, segments };
};

const getSegmentsLength = (segments) => segments.reduce(
    (total, segment) => total + length(subtract(segment.to, segment.from)),
    0,
);

const reverseSegments = (segments) => [...segments].reverse().map((segment) => ({
    from: segment.to,
    to: segment.from,
    normal: segment.normal,
}));

const buildBodyFromHead = (random, headState, level) => {
    let backwardState = {
        point: headState.point,
        normal: headState.normal,
        direction: scale(headState.direction, -1),
    };
    const backwardSegments = [];
    const legs = 2 + Math.floor(random() * Math.min(3 + Math.floor(level / 4), 5));

    for (let leg = 0; leg < legs; leg += 1) {
        const distance = 0.52 + random() * (leg === 0 ? 1.22 : 1.02);
        const advance = advanceAcrossSurface(backwardState, distance);
        backwardSegments.push(...advance.segments);
        backwardState = advance.state;

        if (leg < legs - 1) {
            const turn = cross(backwardState.normal, backwardState.direction);
            backwardState.direction = random() > 0.5 ? turn : scale(turn, -1);
        }
    }

    return reverseSegments(backwardSegments);
};

const createFreeHead = (random) => {
    const face = FACE_DEFINITIONS[Math.floor(random() * FACE_DEFINITIONS.length)];
    const directions = [face.u, scale(face.u, -1), face.v, scale(face.v, -1)];
    const direction = directions[Math.floor(random() * directions.length)];
    const perpendicular = normalize(cross(face.n, direction));
    const edgeDistance = 0.32 + random() * 0.72;
    const crossPosition = (random() - 0.5) * 1.4;

    return {
        point: mix(scale(face.n, 1), scale(direction, 1 - edgeDistance), scale(perpendicular, crossPosition)),
        normal: face.n,
        direction,
    };
};

const createBlockedHead = (random, blocker) => {
    const candidates = blocker.bodySegments.filter((segment) => length(subtract(segment.to, segment.from)) > 0.22);
    if (!candidates.length) return createFreeHead(random);

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const blockerSegment = candidates[Math.floor(random() * candidates.length)];
        const blockerDirection = normalize(subtract(blockerSegment.to, blockerSegment.from));
        const possibleDirection = normalize(cross(blockerSegment.normal, blockerDirection));
        const direction = random() > 0.5 ? possibleDirection : scale(possibleDirection, -1);
        const collisionPoint = midpoint(blockerSegment.from, blockerSegment.to);
        const gap = 0.28 + random() * 0.38;
        const point = add(collisionPoint, scale(direction, -gap));
        const distanceToExit = 1 - dot(point, direction);

        if (distanceToExit > gap + 0.12 && point.every((coordinate) => Math.abs(coordinate) <= 1.001)) {
            return { point, normal: blockerSegment.normal, direction };
        }
    }

    return createFreeHead(random);
};

const createPiece = (random, level, seed, index, blocker = null) => {
    const headState = blocker ? createBlockedHead(random, blocker) : createFreeHead(random);
    const bodySegments = buildBodyFromHead(random, headState, level);
    const bodyLength = getSegmentsLength(bodySegments);
    const distanceToExit = Math.max(0.08, 1 - dot(headState.point, headState.direction));
    const edgePoint = add(headState.point, scale(headState.direction, distanceToExit));
    const outsidePoint = add(edgePoint, scale(headState.direction, bodyLength + 1.35));
    const escapeSegment = { from: headState.point, to: edgePoint, normal: headState.normal };
    const motionSegments = [
        ...bodySegments,
        escapeSegment,
        { from: edgePoint, to: outsidePoint, normal: headState.normal, outside: true },
    ];

    return {
        id: `arrow-${seed}-${index}`,
        bodySegments,
        bodySamples: sampleBody(bodySegments),
        escapeSegment,
        escapeSamples: sampleBody([escapeSegment], 0.045),
        motionSegments,
        bodyLength,
        travelDistance: distanceToExit + bodyLength + 1.1,
        headPoint: headState.point,
        headDirection: headState.direction,
        headNormal: headState.normal,
        order: index,
    };
};

const sampleBody = (segments, step = 0.075) => segments.flatMap((segment) => {
    const segmentLength = length(subtract(segment.to, segment.from));
    const sampleCount = Math.max(2, Math.ceil(segmentLength / step));
    return Array.from({ length: sampleCount + 1 }, (_, index) => (
        add(segment.from, scale(subtract(segment.to, segment.from), index / sampleCount))
    ));
});

const hasSelfOverlap = (segments, minimumDistance = 0.13) => {
    const samplesBySegment = segments.map((segment) => sampleBody([segment]));

    for (let firstIndex = 0; firstIndex < samplesBySegment.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 3; secondIndex < samplesBySegment.length; secondIndex += 1) {
            const firstSamples = samplesBySegment[firstIndex];
            const secondSamples = samplesBySegment[secondIndex];
            if (firstSamples.some((firstPoint) => (
                secondSamples.some((secondPoint) => length(subtract(firstPoint, secondPoint)) < minimumDistance)
            ))) return true;
        }
    }

    return false;
};

const overlapsExistingBodies = (candidate, pieces, minimumDistance = 0.14) => {
    if (hasSelfOverlap(candidate.bodySegments)) return true;

    return pieces.some((piece) => {
        return candidate.bodySamples.some((candidatePoint) => (
            piece.bodySamples.some((occupiedPoint) => (
                length(subtract(candidatePoint, occupiedPoint)) < minimumDistance
            ))
        ));
    });
};

const getBlockingDistance = (piece, possibleBlocker, minimumDistance = 0.13) => {
    let closestDistance = Number.POSITIVE_INFINITY;

    possibleBlocker.bodySamples.forEach((bodyPoint) => {
        const distanceFromHead = dot(subtract(bodyPoint, piece.headPoint), piece.headDirection);
        if (distanceFromHead <= 0.02) return;

        const touchesEscape = piece.escapeSamples.some((escapePoint) => (
            length(subtract(bodyPoint, escapePoint)) < minimumDistance
        ));
        if (touchesEscape) closestDistance = Math.min(closestDistance, distanceFromHead);
    });

    return closestDistance;
};

const getPhysicalBlockers = (piece, pieces, removedIds) => pieces
    .filter((candidate) => candidate.id !== piece.id && !removedIds.has(candidate.id))
    .map((candidate) => ({
        piece: candidate,
        distance: getBlockingDistance(piece, candidate),
    }))
    .filter((candidate) => Number.isFinite(candidate.distance))
    .sort((first, second) => first.distance - second.distance)
    .map((candidate) => candidate.piece);

const preservesExistingEscapeRoutes = (candidate, existingPieces) => existingPieces.every((piece) => (
    !Number.isFinite(getBlockingDistance(piece, candidate))
));

const generateLevel = (level, seed) => {
    const random = mulberry32(seed);
    const count = Math.min(5 + level * 2, 15);
    const pieces = [];

    while (pieces.length < count) {
        const index = pieces.length;
        let acceptedPiece = null;

        for (let attempt = 0; attempt < 140 && !acceptedPiece; attempt += 1) {
            const blockerPool = index < 2 ? [] : pieces.slice(0, Math.max(2, Math.ceil(index * 0.72)));
            const blocker = blockerPool.length ? blockerPool[Math.floor(random() * blockerPool.length)] : null;
            const candidate = createPiece(random, level, seed, index, blocker);
            const plannedBlockerIsReal = !blocker || Number.isFinite(getBlockingDistance(candidate, blocker));
            const hasClearBody = !overlapsExistingBodies(candidate, pieces);
            const keepsGraphAcyclic = preservesExistingEscapeRoutes(candidate, pieces);
            if (plannedBlockerIsReal && hasClearBody && keepsGraphAcyclic) acceptedPiece = candidate;
        }

        if (!acceptedPiece) break;
        pieces.push(acceptedPiece);
    }

    return pieces;
};

const rotatePoint = (point, yaw, pitch) => {
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const x = point[0] * cosYaw + point[2] * sinYaw;
    const zAfterYaw = -point[0] * sinYaw + point[2] * cosYaw;
    const y = point[1] * cosPitch - zAfterYaw * sinPitch;
    const z = point[1] * sinPitch + zAfterYaw * cosPitch;
    return [x, y, z];
};

const liftPoint = (point, normal, amount = SURFACE_LIFT) => add(point, scale(normal, amount));

const getPointOnSegments = (segments, targetDistance) => {
    let traversed = 0;

    for (const segment of segments) {
        const segmentLength = length(subtract(segment.to, segment.from));
        if (traversed + segmentLength >= targetDistance) {
            const progress = clamp((targetDistance - traversed) / (segmentLength || 1), 0, 1);
            return add(segment.from, scale(subtract(segment.to, segment.from), progress));
        }
        traversed += segmentLength;
    }

    return segments.at(-1)?.to ?? [0, 0, 0];
};

const clipSegmentsToWindow = (segments, startDistance, endDistance) => {
    let traversed = 0;
    const clipped = [];

    segments.forEach((segment) => {
        const vector = subtract(segment.to, segment.from);
        const segmentLength = length(vector);
        const segmentStart = traversed;
        const segmentEnd = traversed + segmentLength;
        const overlapStart = Math.max(segmentStart, startDistance);
        const overlapEnd = Math.min(segmentEnd, endDistance);

        if (overlapEnd > overlapStart + 0.0001) {
            const direction = normalize(vector);
            clipped.push({
                ...segment,
                from: add(segment.from, scale(direction, overlapStart - segmentStart)),
                to: add(segment.from, scale(direction, overlapEnd - segmentStart)),
            });
        }
        traversed = segmentEnd;
    });

    return clipped;
};

const distanceToScreenSegment = (x, y, segment) => {
    const segmentX = segment.bx - segment.ax;
    const segmentY = segment.by - segment.ay;
    const squaredLength = segmentX * segmentX + segmentY * segmentY;
    const progress = squaredLength
        ? clamp(((x - segment.ax) * segmentX + (y - segment.ay) * segmentY) / squaredLength, 0, 1)
        : 0;
    const closestX = segment.ax + progress * segmentX;
    const closestY = segment.ay + progress * segmentY;
    return Math.hypot(x - closestX, y - closestY);
};

const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
};

const ArrowCubeCanvas = ({ pieces, removedIds, flyingId, hintId, blockedId, blockingId, isDark, onArrowTap, onFlightComplete, viewCommand }) => {
    const { t } = useTranslation();
    const canvasRef = useRef(null);
    const frameRef = useRef(null);
    const viewRef = useRef({ yaw: -0.64, pitch: -0.46 });
    const pointerRef = useRef({ active: false, dragged: false, x: 0, y: 0 });
    const hitAreasRef = useRef([]);
    const flightStartRef = useRef(null);
    const completedFlightRef = useRef(null);
    const [hoveredId, setHoveredId] = useState(null);

    const activePieces = useMemo(
        () => pieces.filter((piece) => !removedIds.has(piece.id)),
        [pieces, removedIds],
    );

    const draw = useCallback((timestamp = performance.now()) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);

        if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
            canvas.width = Math.round(rect.width * ratio);
            canvas.height = Math.round(rect.height * ratio);
        }

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, rect.width, rect.height);

        const centerX = rect.width / 2;
        const centerY = rect.height / 2 + Math.min(18, rect.height * 0.03);
        const cubeScale = Math.min(rect.width, rect.height) * 0.285;
        const { yaw, pitch } = viewRef.current;
        const project = (point) => {
            const rotated = rotatePoint(point, yaw, pitch);
            const perspective = 4.6 / (4.6 - rotated[2]);
            return {
                x: centerX + rotated[0] * cubeScale * perspective,
                y: centerY - rotated[1] * cubeScale * perspective,
                z: rotated[2],
                perspective,
            };
        };
        const isNormalVisible = (normal) => rotatePoint(normal, yaw, pitch)[2] > ARROW_FACE_VISIBILITY;

        const faceRenderData = FACE_DEFINITIONS.map((face) => {
            const normal = rotatePoint(face.n, yaw, pitch);
            const corners = [
                pointOnFace(face, -1, -1),
                pointOnFace(face, 1, -1),
                pointOnFace(face, 1, 1),
                pointOnFace(face, -1, 1),
            ].map(project);
            return { face, normal, corners, depth: corners.reduce((sum, point) => sum + point.z, 0) / 4 };
        }).filter((face) => face.normal[2] > 0.015).sort((a, b) => a.depth - b.depth);

        context.save();
        context.shadowColor = isDark ? 'rgba(72, 31, 148, .55)' : 'rgba(76, 29, 149, .22)';
        context.shadowBlur = 36;
        context.shadowOffsetY = 22;
        faceRenderData.forEach(({ face, corners, normal }) => {
            const lightness = isDark ? 16 + normal[2] * 6 : 91 - normal[2] * 5;
            context.beginPath();
            corners.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
            context.closePath();
            context.fillStyle = `hsla(${face.hue}, ${isDark ? 40 : 58}%, ${lightness}%, .96)`;
            context.fill();
            context.shadowColor = 'transparent';
            context.strokeStyle = isDark ? `hsla(${face.hue}, 70%, 70%, .5)` : `hsla(${face.hue}, 48%, 56%, .38)`;
            context.lineWidth = 1.35;
            context.stroke();
        });
        context.restore();

        const newHitAreas = [];
        const drawPiece = (piece, segments, headPoint, headDirection, alpha = 1) => {
            const isHinted = piece.id === hintId;
            const isBlocked = piece.id === blockedId;
            const isBlocking = piece.id === blockingId;
            const isHovered = piece.id === hoveredId;
            const pulse = isHinted || isBlocking ? 1 + Math.sin(timestamp / 145) * 0.08 : 1;
            const strokeColor = isBlocked
                ? '#fb7185'
                : isBlocking
                    ? '#facc15'
                    : isHinted
                        ? '#34d399'
                        : isDark
                            ? '#f5f3ff'
                            : '#35126f';

            context.save();
            context.globalAlpha = alpha;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.strokeStyle = strokeColor;
            context.fillStyle = strokeColor;
            context.lineWidth = Math.max(5.5, cubeScale * 0.038) * pulse;
            context.shadowColor = isHinted
                ? 'rgba(52, 211, 153, .95)'
                : isBlocked
                    ? 'rgba(248, 113, 113, .9)'
                    : isBlocking
                        ? 'rgba(250, 204, 21, .98)'
                        : isHovered
                            ? 'rgba(167, 139, 250, .95)'
                            : isDark
                                ? 'rgba(7, 4, 18, .7)'
                                : 'rgba(46, 16, 101, .28)';
            context.shadowBlur = isBlocking ? 24 : isHinted || isBlocked || isHovered ? 17 : 7;

            let hasOpenPath = false;
            let lastProjectedEnd = null;
            const finishPath = () => {
                if (hasOpenPath) context.stroke();
                hasOpenPath = false;
                lastProjectedEnd = null;
            };

            segments.forEach((segment) => {
                if (!isNormalVisible(segment.normal)) {
                    finishPath();
                    return;
                }
                const projectedStart = project(liftPoint(segment.from, segment.normal));
                const projectedEnd = project(liftPoint(segment.to, segment.normal));
                const shake = isBlocked ? Math.sin(timestamp / 28) * 3.5 : 0;
                const startX = projectedStart.x + shake;
                const endX = projectedEnd.x + shake;
                const continuesPreviousPath = lastProjectedEnd
                    && Math.hypot(lastProjectedEnd.x - startX, lastProjectedEnd.y - projectedStart.y) < 1.5;

                if (!continuesPreviousPath) {
                    finishPath();
                    context.beginPath();
                    context.moveTo(startX, projectedStart.y);
                    hasOpenPath = true;
                }
                context.lineTo(endX, projectedEnd.y);
                lastProjectedEnd = { x: endX, y: projectedEnd.y };

                if (!segment.outside) {
                    newHitAreas.push({
                        id: piece.id,
                        ax: startX,
                        ay: projectedStart.y,
                        bx: endX,
                        by: projectedEnd.y,
                        width: Math.max(16, context.lineWidth * 2.4),
                        depth: (projectedStart.z + projectedEnd.z) / 2,
                    });
                }
            });
            finishPath();

            const headNormal = segments.at(-1)?.normal ?? piece.headNormal;
            if (headPoint && headDirection && isNormalVisible(headNormal)) {
                const lastSegment = segments.at(-1);
                const isOutside = Boolean(lastSegment?.outside);
                const availableSurface = Math.max(0, 1 - dot(headPoint, headDirection));
                const maximumHeadLength = 0.16 * pulse;
                const headLength = isOutside
                    ? maximumHeadLength
                    : Math.min(maximumHeadLength, Math.max(0.018, availableSurface * 0.72));
                const perpendicular = normalize(cross(headNormal, headDirection));
                const basePoint = add(headPoint, scale(headDirection, -headLength * 0.52));
                const headPoints = [
                    add(headPoint, scale(headDirection, headLength)),
                    add(basePoint, scale(perpendicular, headLength * 0.62)),
                    add(headPoint, scale(headDirection, -headLength * 0.12)),
                    add(basePoint, scale(perpendicular, -headLength * 0.62)),
                ].map((point) => project(liftPoint(point, headNormal)));
                const shake = isBlocked ? Math.sin(timestamp / 28) * 3.5 : 0;
                context.beginPath();
                headPoints.forEach((point, index) => {
                    if (index === 0) context.moveTo(point.x + shake, point.y);
                    else context.lineTo(point.x + shake, point.y);
                });
                context.closePath();
                context.fill();
            }
            context.restore();
        };

        activePieces.forEach((piece) => {
            if (piece.id === flyingId) return;
            drawPiece(piece, piece.bodySegments, piece.headPoint, piece.headDirection);
        });

        if (flyingId) {
            const flyingPiece = pieces.find((piece) => piece.id === flyingId);
            if (flyingPiece) {
                if (flightStartRef.current === null) flightStartRef.current = timestamp;
                const rawProgress = Math.min((timestamp - flightStartRef.current) / 1250, 1);
                const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
                const offset = easedProgress * flyingPiece.travelDistance;
                const movingSegments = clipSegmentsToWindow(
                    flyingPiece.motionSegments,
                    offset,
                    offset + flyingPiece.bodyLength,
                );
                const headDistance = Math.min(
                    flyingPiece.bodyLength + offset,
                    getSegmentsLength(flyingPiece.motionSegments),
                );
                const headPoint = getPointOnSegments(flyingPiece.motionSegments, headDistance);
                const lastSegment = movingSegments.at(-1);
                const headDirection = lastSegment
                    ? normalize(subtract(lastSegment.to, lastSegment.from))
                    : flyingPiece.headDirection;
                const alpha = rawProgress > 0.88 ? (1 - rawProgress) / 0.12 : 1;
                drawPiece(flyingPiece, movingSegments, headPoint, headDirection, Math.max(0, alpha));

                if (rawProgress >= 1 && completedFlightRef.current !== flyingId) {
                    completedFlightRef.current = flyingId;
                    window.setTimeout(() => onFlightComplete(flyingId), 0);
                }
            }
        } else {
            flightStartRef.current = null;
            completedFlightRef.current = null;
        }

        hitAreasRef.current = newHitAreas.sort((a, b) => b.depth - a.depth);
        frameRef.current = requestAnimationFrame(draw);
    }, [activePieces, blockedId, blockingId, flyingId, hoveredId, hintId, isDark, onFlightComplete, pieces]);

    useEffect(() => {
        frameRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frameRef.current);
    }, [draw]);

    useEffect(() => {
        if (!viewCommand) return;
        if (viewCommand.type === 'left') viewRef.current.yaw -= Math.PI / 3;
        if (viewCommand.type === 'right') viewRef.current.yaw += Math.PI / 3;
        if (viewCommand.type === 'reset') viewRef.current = { yaw: -0.64, pitch: -0.46 };
    }, [viewCommand]);

    const getHit = (clientX, clientY) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return hitAreasRef.current.find((area) => distanceToScreenSegment(x, y, area) <= area.width);
    };

    const handlePointerDown = (event) => {
        canvasRef.current.setPointerCapture(event.pointerId);
        pointerRef.current = { active: true, dragged: false, x: event.clientX, y: event.clientY };
    };

    const handlePointerMove = (event) => {
        const pointer = pointerRef.current;
        if (!pointer.active) {
            setHoveredId(getHit(event.clientX, event.clientY)?.id ?? null);
            return;
        }

        const deltaX = event.clientX - pointer.x;
        const deltaY = event.clientY - pointer.y;
        if (Math.abs(deltaX) + Math.abs(deltaY) > 3) pointer.dragged = true;
        if (pointer.dragged) {
            viewRef.current.yaw += deltaX * 0.009;
            viewRef.current.pitch = clamp(viewRef.current.pitch - deltaY * 0.008, -1.18, 1.18);
            pointer.x = event.clientX;
            pointer.y = event.clientY;
        }
    };

    const handlePointerUp = (event) => {
        const pointer = pointerRef.current;
        if (pointer.active && !pointer.dragged) {
            const hit = getHit(event.clientX, event.clientY);
            const piece = hit ? pieces.find((candidate) => candidate.id === hit.id) : null;
            if (piece) onArrowTap(piece);
        }
        pointerRef.current.active = false;
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowLeft') viewRef.current.yaw -= 0.25;
        if (event.key === 'ArrowRight') viewRef.current.yaw += 0.25;
        if (event.key === 'ArrowUp') viewRef.current.pitch = Math.min(1.18, viewRef.current.pitch + 0.2);
        if (event.key === 'ArrowDown') viewRef.current.pitch = Math.max(-1.18, viewRef.current.pitch - 0.2);
    };

    return (
        <canvas
            ref={canvasRef}
            className="arrow-cube-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => setHoveredId(null)}
            onKeyDown={handleKeyDown}
            tabIndex="0"
            role="application"
            aria-label={t('arrowCube.canvasLabel')}
        />
    );
};

const segmentShape = PropTypes.shape({
    from: PropTypes.arrayOf(PropTypes.number).isRequired,
    to: PropTypes.arrayOf(PropTypes.number).isRequired,
    normal: PropTypes.arrayOf(PropTypes.number).isRequired,
    outside: PropTypes.bool,
});

ArrowCubeCanvas.propTypes = {
    pieces: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        bodySegments: PropTypes.arrayOf(segmentShape).isRequired,
        motionSegments: PropTypes.arrayOf(segmentShape).isRequired,
        bodyLength: PropTypes.number.isRequired,
        travelDistance: PropTypes.number.isRequired,
        headPoint: PropTypes.arrayOf(PropTypes.number).isRequired,
        headDirection: PropTypes.arrayOf(PropTypes.number).isRequired,
        headNormal: PropTypes.arrayOf(PropTypes.number).isRequired,
    })).isRequired,
    removedIds: PropTypes.instanceOf(Set).isRequired,
    flyingId: PropTypes.string,
    hintId: PropTypes.string,
    blockedId: PropTypes.string,
    blockingId: PropTypes.string,
    isDark: PropTypes.bool.isRequired,
    onArrowTap: PropTypes.func.isRequired,
    onFlightComplete: PropTypes.func.isRequired,
    viewCommand: PropTypes.shape({ type: PropTypes.string, id: PropTypes.number }),
};

const ArrowCubeGame = ({ isDark }) => {
    const { t } = useTranslation();
    const [level, setLevel] = useState(1);
    const [seed, setSeed] = useState(() => Date.now() >>> 0);
    const [removedIds, setRemovedIds] = useState(() => new Set());
    const [flyingId, setFlyingId] = useState(null);
    const [hintId, setHintId] = useState(null);
    const [blockedId, setBlockedId] = useState(null);
    const [blockingId, setBlockingId] = useState(null);
    const [moves, setMoves] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [viewCommand, setViewCommand] = useState(null);
    const startedAtRef = useRef(Date.now());
    const feedbackTimerRef = useRef(null);
    const hintTimerRef = useRef(null);

    const pieces = useMemo(() => generateLevel(level, seed), [level, seed]);
    const remaining = pieces.length - removedIds.size;
    const bestKey = `arrow-cube-best-${level}`;
    const [bestTime, setBestTime] = useState(() => Number(localStorage.getItem(bestKey)) || null);

    useEffect(() => {
        if (isComplete) return undefined;
        const timer = window.setInterval(() => {
            setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 500);
        return () => window.clearInterval(timer);
    }, [isComplete, seed]);

    useEffect(() => {
        setBestTime(Number(localStorage.getItem(bestKey)) || null);
    }, [bestKey]);

    useEffect(() => () => {
        window.clearTimeout(feedbackTimerRef.current);
        window.clearTimeout(hintTimerRef.current);
    }, []);

    const resetRound = useCallback((nextLevel = level, nextSeed = seed) => {
        setLevel(nextLevel);
        setSeed(nextSeed);
        setRemovedIds(new Set());
        setFlyingId(null);
        setHintId(null);
        setBlockedId(null);
        setBlockingId(null);
        setMoves(0);
        setMistakes(0);
        setElapsed(0);
        setIsComplete(false);
        startedAtRef.current = Date.now();
    }, [level, seed]);

    const handleArrowTap = useCallback((piece) => {
        if (flyingId || isComplete) return;
        const physicalBlockers = getPhysicalBlockers(piece, pieces, removedIds);
        if (physicalBlockers.length) {
            setBlockedId(piece.id);
            setBlockingId(physicalBlockers[0].id);
            setMistakes((current) => current + 1);
            window.clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = window.setTimeout(() => {
                setBlockedId(null);
                setBlockingId(null);
            }, 2200);
            return;
        }
        setFlyingId(piece.id);
    }, [flyingId, isComplete, pieces, removedIds]);

    const handleFlightComplete = useCallback((pieceId) => {
        setRemovedIds((current) => {
            const next = new Set(current);
            next.add(pieceId);
            if (next.size === pieces.length) {
                const finalTime = Math.floor((Date.now() - startedAtRef.current) / 1000);
                setElapsed(finalTime);
                setIsComplete(true);
                const storedBest = Number(localStorage.getItem(bestKey)) || null;
                if (!storedBest || finalTime < storedBest) {
                    localStorage.setItem(bestKey, String(finalTime));
                    setBestTime(finalTime);
                }
            }
            return next;
        });
        setMoves((current) => current + 1);
        setFlyingId(null);
    }, [bestKey, pieces.length]);

    const showHint = () => {
        const available = pieces.find((piece) => (
            !removedIds.has(piece.id)
            && getPhysicalBlockers(piece, pieces, removedIds).length === 0
            && piece.id !== flyingId
        ));
        if (!available) return;
        setHintId(available.id);
        window.clearTimeout(hintTimerRef.current);
        hintTimerRef.current = window.setTimeout(() => setHintId(null), 1800);
    };

    const createFreshLevel = () => resetRound(level, (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    const goToNextLevel = () => resetRound(level + 1, (Date.now() ^ (level * 2654435761)) >>> 0);
    const sendViewCommand = (type) => setViewCommand({ type, id: Date.now() });

    return (
        <section className="arrow-cube-game" aria-label={t('arrowCube.gameLabel')}>
            <div className="arrow-cube-hud">
                <div className="arrow-cube-level">
                    <span>{t('arrowCube.level')}</span>
                    <strong>{level.toString().padStart(2, '0')}</strong>
                </div>
                <div className="arrow-cube-stats">
                    <div><span>{t('arrowCube.remaining')}</span><strong>{remaining}</strong></div>
                    <div><span>{t('arrowCube.moves')}</span><strong>{moves}</strong></div>
                    <div><span>{t('arrowCube.time')}</span><strong>{formatTime(elapsed)}</strong></div>
                </div>
                <button type="button" className="arrow-cube-icon-button" onClick={showHint} title={t('arrowCube.hint')} aria-label={t('arrowCube.hint')}>
                    <LightBulbIcon />
                </button>
            </div>

            <div className="arrow-cube-stage">
                <div className="arrow-cube-orbit arrow-cube-orbit-one" />
                <div className="arrow-cube-orbit arrow-cube-orbit-two" />
                <ArrowCubeCanvas
                    pieces={pieces}
                    removedIds={removedIds}
                    flyingId={flyingId}
                    hintId={hintId}
                    blockedId={blockedId}
                    blockingId={blockingId}
                    isDark={isDark}
                    onArrowTap={handleArrowTap}
                    onFlightComplete={handleFlightComplete}
                    viewCommand={viewCommand}
                />

                <div className="arrow-cube-instruction">
                    <span className="arrow-cube-drag-mark"><span /><span /><span /></span>
                    <span>{t('arrowCube.dragInstruction')}</span>
                </div>

                <div className="arrow-cube-view-controls" aria-label={t('arrowCube.viewControls')}>
                    <button type="button" onClick={() => sendViewCommand('left')} aria-label={t('arrowCube.rotateLeft')}><ArrowUturnLeftIcon /></button>
                    <button type="button" onClick={() => sendViewCommand('reset')} aria-label={t('arrowCube.resetView')}><ArrowPathIcon /></button>
                    <button type="button" onClick={() => sendViewCommand('right')} aria-label={t('arrowCube.rotateRight')}><ArrowUturnRightIcon /></button>
                </div>
            </div>

            <div className="arrow-cube-footerbar">
                <div className="arrow-cube-seed">
                    <span className="arrow-cube-seed-dot" />
                    <span>{t('arrowCube.procedural')}</span>
                    <code>#{seed.toString(16).slice(-6).toUpperCase()}</code>
                </div>
                <div className="arrow-cube-footer-actions">
                    {mistakes > 0 && <span className="arrow-cube-mistakes">{t('arrowCube.blockedAttempts', { count: mistakes })}</span>}
                    <button type="button" onClick={() => resetRound()}>{t('arrowCube.restart')}</button>
                    <button type="button" className="arrow-cube-new-button" onClick={createFreshLevel}>
                        <SparklesIcon />{t('arrowCube.newPuzzle')}
                    </button>
                </div>
            </div>

            {isComplete && (
                <div className="arrow-cube-complete" role="dialog" aria-modal="true" aria-labelledby="arrow-cube-complete-title">
                    <div className="arrow-cube-complete-card">
                        <div className="arrow-cube-complete-icon"><SparklesIcon /></div>
                        <p>{t('arrowCube.completeEyebrow')}</p>
                        <h2 id="arrow-cube-complete-title">{t('arrowCube.completeTitle')}</h2>
                        <span>{t('arrowCube.completeDescription')}</span>
                        <div className="arrow-cube-result-grid">
                            <div><strong>{formatTime(elapsed)}</strong><span>{t('arrowCube.time')}</span></div>
                            <div><strong>{moves}</strong><span>{t('arrowCube.moves')}</span></div>
                            <div><strong>{bestTime ? formatTime(bestTime) : '—'}</strong><span>{t('arrowCube.best')}</span></div>
                        </div>
                        <button type="button" onClick={goToNextLevel}>{t('arrowCube.nextLevel')}</button>
                    </div>
                </div>
            )}
        </section>
    );
};

ArrowCubeGame.propTypes = {
    isDark: PropTypes.bool.isRequired,
};

export default ArrowCubeGame;
