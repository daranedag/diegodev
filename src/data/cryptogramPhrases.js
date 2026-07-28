const ORIGINAL_SOURCE = {
    es: 'Colección original de diegodev',
    en: 'Original diegodev collection',
};

const cryptogramPhrases = [
    {
        id: 'curiosity-path',
        es: 'La curiosidad convierte cada pregunta en un camino nuevo.',
        en: 'Curiosity turns every question into a new path.',
    },
    {
        id: 'small-decisions',
        es: 'Los grandes cambios comienzan con decisiones pequeñas.',
        en: 'Great changes begin with small decisions.',
    },
    {
        id: 'shared-ideas',
        es: 'Compartir una idea puede encender muchas otras.',
        en: 'Sharing one idea can spark many others.',
    },
    {
        id: 'patient-progress',
        es: 'La paciencia también es una forma de avanzar.',
        en: 'Patience is also a way of moving forward.',
    },
    {
        id: 'new-angle',
        es: 'Todo problema revela algo cuando se mira desde otro ángulo.',
        en: 'Every problem reveals something from a different angle.',
    },
    {
        id: 'learning-observe',
        es: 'Aprender es descubrir nuevas maneras de observar.',
        en: 'Learning means discovering new ways to observe.',
    },
    {
        id: 'conversation-day',
        es: 'Una buena conversación puede cambiar todo un día.',
        en: 'A good conversation can change an entire day.',
    },
    {
        id: 'first-step',
        es: 'El valor aparece cuando damos el primer paso.',
        en: 'Courage appears when we take the first step.',
    },
    {
        id: 'simple-questions',
        es: 'Las mejores soluciones suelen nacer de preguntas simples.',
        en: 'The best solutions often grow from simple questions.',
    },
    {
        id: 'understood-error',
        es: 'Cada error bien entendido se convierte en experiencia.',
        en: 'Every understood mistake becomes experience.',
    },
    {
        id: 'space-to-play',
        es: 'La creatividad crece donde existe espacio para jugar.',
        en: 'Creativity grows wherever there is room to play.',
    },
    {
        id: 'team-listens',
        es: 'Un equipo avanza más lejos cuando escucha con atención.',
        en: 'A team goes farther when it listens carefully.',
    },
    {
        id: 'change-question',
        es: 'A veces la respuesta llega después de cambiar la pregunta.',
        en: 'Sometimes the answer arrives after changing the question.',
    },
    {
        id: 'steady-results',
        es: 'La constancia transforma los intentos en resultados.',
        en: 'Consistency transforms attempts into results.',
    },
    {
        id: 'different-thinking',
        es: 'Pensar distinto abre puertas que antes parecían muros.',
        en: 'Thinking differently opens doors that once looked like walls.',
    },
    {
        id: 'ideas-without-fear',
        es: 'Las ideas mejoran cuando se comparten sin miedo.',
        en: 'Ideas improve when they are shared without fear.',
    },
    {
        id: 'small-victory',
        es: 'Un pequeño avance sigue siendo una victoria.',
        en: 'A small step forward is still a victory.',
    },
    {
        id: 'calm-paths',
        es: 'La calma permite ver caminos que la prisa oculta.',
        en: 'Calm reveals paths that haste keeps hidden.',
    },
    {
        id: 'daily-learning',
        es: 'Cada día ofrece una nueva oportunidad para aprender.',
        en: 'Every day offers a new opportunity to learn.',
    },
    {
        id: 'useful-adventure',
        es: 'Construir algo útil también puede ser una aventura.',
        en: 'Building something useful can also be an adventure.',
    },
].map((phrase) => ({
    ...phrase,
    source: phrase.source ?? ORIGINAL_SOURCE,
}));

export default cryptogramPhrases;
