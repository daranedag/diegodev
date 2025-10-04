import { useState, useEffect } from 'react';

export const useTheme = () => {
    const [isDark, setIsDark] = useState(() => {
        // Verificar si ya hay una preferencia guardada en localStorage
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved) {
                return saved === 'dark';
            }
            // Si no hay preferencia guardada, usar la del sistema
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        // Pequeño delay para evitar conflictos con StrictMode
        const timeoutId = setTimeout(() => {
            const root = document.documentElement;

            // Forzar la eliminación/agregación de la clase
            root.classList.remove('dark');
            if (isDark) {
                root.classList.add('dark');
            }

            // Guardar la preferencia en localStorage
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [isDark]);

    const toggleTheme = () => {
        setIsDark(prevIsDark => !prevIsDark);
    };

    return { isDark, toggleTheme };
};
