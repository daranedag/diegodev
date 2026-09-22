# React + Vite

## Política de privacidad de Instagram

La app **Diegui Dev Profile Display** dispone de páginas HTML públicas, sin autenticación ni dependencia de JavaScript, copiadas por Vite al build de GitHub Pages:

- Política de privacidad: `https://diegui.dev/privacidad/`
- Instrucciones de eliminación: `https://diegui.dev/eliminacion-de-datos/`

Los archivos fuente están en `public/privacidad/index.html` y `public/eliminacion-de-datos/index.html`; comparten `public/legal.css`. El pie del sitio enlaza a ambas páginas mediante navegación completa para servir su HTML directamente.

En desarrollo y en la vista previa, `vite.config.js` sirve estas dos rutas (con o sin barra final) desde sus archivos HTML antes del fallback de React. Esto reproduce el comportamiento de los índices de directorio de GitHub Pages y evita la página 404 de la aplicación.

Antes de enviar las URLs a Meta, desplegar el sitio y comprobar que ambas devuelven HTTP 200 sin iniciar sesión. La segunda URL corresponde al campo de **instrucciones de eliminación**, no a un callback automatizado. Las solicitudes se atienden manualmente en `daranedag@gmail.com`.

La política refleja el alcance indicado por el responsable: consulta de publicaciones sin almacenarlas y tokens configurados por cliente como variables de entorno. Los tokens deben permanecer en el servidor: una variable incluida en el bundle del navegador (por ejemplo, mediante el prefijo `VITE_`) no es secreta. Confirmar la configuración real de cada integración y sus proveedores antes de publicar. No se implementa aquí la integración ni la eliminación automatizada de credenciales. Mantener el texto actualizado si cambian los datos tratados, la conservación o las funciones del servicio.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
