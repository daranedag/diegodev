# Proyecto diegodev

## Neon

- Proyecto existente: `diegodev` (`nameless-star-87169318`), organización `org-snowy-haze-69666506`.
- La rama principal es `production`; la base es `neondb`. El contexto local está en `.neon`, excluido de Git.
- Usar la CLI autenticada de Neon. El plugin oficial `neon-postgres` está instalado para Codex; una sesión nueva carga sus herramientas y habilidades.
- Antes de cambiar el esquema, crear una rama de Neon y probar la migración allí. Revisar el resultado antes de aplicar el cambio autorizado a `production`.
- Consultar las instrucciones actuales de Neon antes de usar sus servicios. Para diagnóstico de lectura, preferir `neon inspect db`.
- Usar conexiones directas para migraciones y restauraciones; conexiones agrupadas para tráfico de aplicación.
- Las conexiones locales están en `.env.neon.local`. Nunca incluirlas en Git, registros ni variables con prefijo `VITE_`.
- El respaldo importado es `20261109_030829.sql.gz`. Solo pertenecen a este proyecto las tablas `blog_*`, `kanban_*`, `mtg_*`, `places` y `place_items`. Excluir `pdh_*`, `menupro_*`, `reys_*` y los esquemas internos de InsForge.
- `auth.users` conserva únicamente los usuarios referenciados por esas tablas. La migración `20261110-neon-auth.sql` vincula sus UUID históricos a identidades de Neon Auth únicamente por correo verificado; nunca escribe en `neon_auth`.
- El código usa `@neon/neon-js` para las consultas y Google OAuth. `.env.local` contiene las URLs públicas y `.env.neon.local` las conexiones privadas de administración. No exponer PostgreSQL en React.
- La copia del respaldo, la API de datos y `20261110-neon-auth.sql` están aplicadas y verificadas en `production`, con autorización explícita del usuario. GitHub Pages se publica automáticamente al subir cambios a `main`.
- El análisis se aloja en Vercel: proyecto `diegodev-api` (`prj_n5wgEX0iLyIlWAW7pHUNCQhrVmDV`), equipo `team_H9dRefsL7wFLUIZMoOnT2vkQ`, región `gru1`. Su código está en `backend/` y su URL pública es `https://diegodev-api.vercel.app/api/analyze-deck`.
- El servicio valida firmas con las claves de la rama de Neon y acepta sus dos emisores observados: URL completa de Auth y origen de esa URL. No tomar emisores ni URLs de claves de entradas del cliente.
- Se probaron sesiones, cierre de sesión, CRUD, aislamiento entre usuarios y análisis contra el servicio real. Las cuentas desechables se eliminan mediante Neon CLI y sus perfiles mediante ID y correo exactos.
- El análisis basado en reglas y datos está operativo. El enriquecimiento opcional con LLM no tiene credencial configurada; el proyecto anterior de InsForge devuelve 503 y su consulta administrativa indica que no existe.
- Los importadores usan `secrets.NEON_DATABASE_URL` en GitHub Actions. El secreto del repositorio se configuró y verificó el 10 de noviembre de 2026 con autorización explícita del usuario, usando la conexión agrupada de Neon.
- Consultar el informe en `docs/neon-migration-20261109.md` para el alcance y las verificaciones de la restauración.
