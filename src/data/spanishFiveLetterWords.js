// Palabras comunes en español, sin tildes para facilitar su escritura en el juego.
const dictionaryCandidates = [
    'abajo', 'abeja', 'abono', 'abrir', 'acero', 'acido', 'actor', 'adios', 'agudo',
    'alamo', 'album', 'aldea', 'aleta', 'altar', 'amado', 'amiga', 'amigo', 'ancho',
    'andar', 'angel', 'antes', 'apoyo', 'arbol', 'ardor', 'arena', 'armar', 'aroma',
    'asado', 'atras', 'avion', 'ayuda', 'azote', 'bajar', 'banda', 'barco', 'barro',
    'beber', 'besar', 'bicho', 'blusa', 'borde', 'boton', 'brazo', 'breve', 'brisa',
    'bueno', 'burro', 'caber', 'cable', 'calle', 'calor', 'campo', 'canal', 'carne',
    'carta', 'causa', 'cerca', 'cerdo', 'cielo', 'cinta', 'claro', 'clave', 'clavo',
    'coche', 'color', 'comer', 'copia', 'costa', 'crear', 'creer', 'cuero', 'culpa',
    'curso', 'danza', 'datos', 'deber', 'decir', 'dedos', 'dejar', 'denso', 'desde',
    'dieta', 'digno', 'doble', 'dulce', 'dueño', 'echar', 'enero', 'enojo', 'error',
    'estar', 'etapa', 'falso', 'falta', 'feliz', 'feria', 'fibra', 'ficha', 'final',
    'firme', 'fondo', 'forma', 'fuego', 'fuera', 'ganar', 'gasto', 'girar', 'golpe',
    'gordo', 'grado', 'grano', 'grave', 'grito', 'grupo', 'haber', 'hacia', 'hacer',
    'hasta', 'heroe', 'hielo', 'hogar', 'honor', 'hotel', 'huevo', 'ideal', 'igual',
    'islas', 'joven', 'jugar', 'junto', 'labio', 'lados', 'largo', 'lento', 'libre',
    'libro', 'limon', 'lindo', 'lista', 'llave', 'luego', 'lugar', 'madre', 'magia',
    'manos', 'marca', 'marzo', 'mayor', 'medio', 'mejor', 'mente', 'mesas', 'metal',
    'metro', 'miedo', 'mismo', 'mitad', 'monte', 'motor', 'mover', 'mucho', 'mujer',
    'mundo', 'nacer', 'nadar', 'nariz', 'negro', 'nieve', 'niños', 'noche', 'norte',
    'nubes', 'nuevo', 'nunca', 'oeste', 'orden', 'padre', 'pagar', 'papel', 'pared',
    'parque', 'parte', 'paseo', 'pasos', 'pasto', 'patio', 'pedir', 'pelea', 'perro',
    'pesar', 'piano', 'piedra', 'pieza', 'pista', 'plano', 'plaza', 'pluma', 'pobre',
    'poder', 'poner', 'precio', 'prima', 'primo', 'punto', 'queso', 'radio', 'razon',
    'regla', 'reina', 'reloj', 'resto', 'saber', 'sabor', 'sacar', 'salir', 'salto',
    'santo', 'señal', 'serie', 'silla', 'sobre', 'solar', 'subir', 'suelo', 'sueño',
    'tarde', 'techo', 'tener', 'texto', 'tigre', 'tocar', 'tomar', 'torre', 'total',
    'traer', 'traje', 'union', 'valor', 'vapor', 'vello', 'venir', 'verde', 'viaje',
    'viejo', 'vital', 'vivir', 'volar', 'votos', 'vuelta', 'yogur', 'zorro',
];

const spanishFiveLetterWords = dictionaryCandidates.filter((word) => [...word].length === 5);

export default spanishFiveLetterWords;
