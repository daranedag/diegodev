import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/', // Reemplaza 'diegodev' con el nombre exacto de tu repositorio
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
});
