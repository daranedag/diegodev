import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Match GitHub Pages directory indexes before Vite's SPA fallback handles them.
const serveLegalPages = server => {
    server.middlewares.use((req, _res, next) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
            const [pathname, query] = (req.url || '').split(/\?(.*)/s);
            const page = pathname.match(/^\/(privacidad|eliminacion-de-datos)\/?$/);

            if (page) {
                req.url = `/${page[1]}/index.html${query === undefined ? '' : `?${query}`}`;
            }
        }
        next();
    });
};

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        {
            name: 'legal-page-directory-indexes',
            configureServer: serveLegalPages,
            configurePreviewServer: serveLegalPages,
        },
    ],
    base: '/', // Reemplaza 'diegodev' con el nombre exacto de tu repositorio
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
});
