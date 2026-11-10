# Servicio de análisis de mazos

Servicio independiente en Vercel, región `gru1`, con consultas a Neon Data API y autenticación mediante los JWT de Neon Auth.

- Proyecto: `diegodev-api` (`prj_n5wgEX0iLyIlWAW7pHUNCQhrVmDV`).
- Equipo: Diego Araneda's projects (`team_H9dRefsL7wFLUIZMoOnT2vkQ`).
- Producción: `https://diegodev-api.vercel.app/api/analyze-deck`.
- Entorno: Node.js 24.

Configurar `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` y `NEON_DATA_API_URL` para la rama de destino. Son URLs públicas; el servicio no utiliza una conexión administrativa de PostgreSQL. Las consultas privadas llevan el token del usuario, y las lecturas públicas llevan un token anónimo emitido por Neon.

El análisis estructural, la legalidad, la comparación con el meta y las recomendaciones funcionan con los datos migrados. El enriquecimiento opcional con un modelo de lenguaje conserva la integración anterior (`INSFORGE_URL` y `INSFORGE_AI_KEY`) y no está configurado en el nuevo servicio, porque el proyecto anterior no está disponible. Si falta esa configuración, se usa el análisis basado en reglas y datos, como en la implementación original.

Desde este directorio, ejecutar `npm ci` y `npm run check` antes de desplegar. `package-lock.json` mantiene las dependencias del servicio independientes del sitio Vite. Al desplegar, enviar únicamente el contenido de `backend/`; no incluir archivos `.env`, respaldos ni el código del sitio.

Las URLs individuales de despliegue conservan la protección de Vercel. La aplicación consume la URL principal de producción, con su propia validación de JWT y cuotas de análisis. No necesita enlaces compartidos ni credenciales de Vercel en el navegador.
