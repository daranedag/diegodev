import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar archivos de traducción
import es from './locales/es.json';
import en from './locales/en.json';

i18n
    // Detectar el idioma del navegador automáticamente
    .use(LanguageDetector)
    // Pasar la instancia i18n a react-i18next
    .use(initReactI18next)
    // Inicializar i18next
    .init({
        resources: {
            es: {
                translation: es
            },
            en: {
                translation: en
            }
        },
        fallbackLng: 'es', // Idioma por defecto si no se detecta
        debug: false, // Cambiar a true para ver logs en desarrollo

        interpolation: {
            escapeValue: false // React ya escapa por defecto
        },

        detection: {
            // Orden de detección de idioma
            order: ['localStorage', 'navigator', 'htmlTag'],
            // Guardar la selección del usuario en localStorage
            caches: ['localStorage'],
            // Nombre de la clave en localStorage
            lookupLocalStorage: 'i18nextLng'
        }
    });

export default i18n;
