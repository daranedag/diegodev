# Restauración de InsForge en Neon

Fecha de ejecución: 10 de noviembre de 2026 (America/Santiago).

## Origen y destino

- Archivo: `20261109_030829.sql.gz`.
- SHA-256 del archivo comprimido: `ec4384e9196ccacade6cd683e93aee8c0d7581ab5f5b1af2fb5a7f6398aa9054`.
- Proyecto de Neon: `diegodev`, ID `nameless-star-87169318`.
- Destino: rama `production`, base `neondb`, PostgreSQL 18, región São Paulo.
- Prueba previa: rama `migration-insforge-20261109`.

## Alcance

Se seleccionaron las tablas que utiliza el código y sus tablas dependientes:

| Grupo | Tablas | Registros |
| --- | ---: | ---: |
| Blog | 5 | 25 |
| Kanban | 4 | 57 |
| Magic | 13 | 396.899 |
| Lugares | 2 | 2 |
| **Aplicación** | **24** | **396.983** |

También se conservaron 4 filas de `auth.users`, correspondientes exclusivamente a los usuarios referenciados por los registros seleccionados. No se importaron proveedores OAuth, sesiones, tokens, configuración ni secretos de InsForge.

Se excluyeron todas las tablas `pdh_*`, `menupro_*`, `reys_*` y los esquemas internos de InsForge. No se importaron extensiones, tareas programadas, despliegues, archivos ni funciones de infraestructura de otros proyectos.

## Adaptaciones de compatibilidad

- Los objetos restaurados pertenecen al propietario de la base Neon; no se replicaron los roles administrativos de InsForge.
- En la restauración se conservaron los roles sin acceso de inicio de sesión `anon` y `authenticated`, las funciones `auth.jwt()`, `auth.uid()` y `auth.role()`, y las políticas originales. En la activación, esos roles se conservaron como `insforge_*` y sus políticas se asignaron a los roles de Neon.
- El disparador compartido `system.update_updated_at()` se trasladó a `public.update_updated_at()` para no importar el esquema de infraestructura `system`.
- `auth.users` no concede acceso a `PUBLIC`, `anonymous` ni `authenticated`.
- Se preservó el esquema `neon_auth` que ya existía en Neon. La migración SQL no lo modifica. Las pruebas crearon cuentas mediante la API oficial y las eliminaron mediante Neon CLI.
- La restauración se ejecuta dentro de una transacción y rechaza un destino que ya contenga tablas de aplicación.

## Verificación

La restauración de prueba incluyó conteos por tabla, validación de restricciones y revisión de inventario:

- 30 claves foráneas.
- 48 índices de aplicación, incluidas las restricciones de unicidad y claves primarias.
- 11 disparadores.
- 22 políticas de acceso; las 24 tablas de aplicación conservan RLS habilitado.

La comparación completa del contenido y las pruebas de aislamiento se registran localmente en `migration/neon-verification-*.json`. El manifiesto de selección se guarda en `migration/neon-manifest.json`. Estos archivos no contienen credenciales y permanecen fuera de Git, junto a las herramientas de la transferencia en `migration/neon-tools/`.

La restauración se completó en `production` y la comparación de contenido confirmó las 396.983 filas de aplicación y las 4 filas de usuarios, sin diferencias. El comprobante sin credenciales está en `docs/neon-backup-verification-20261109.json`.

La comparación utiliza conteos y sumas de hashes SHA-256 por fila del contenido exportado con `COPY`, con zona horaria UTC y lectura UTF-8. No depende del orden físico de las filas.

## Configuración del agente y aplicación

Se verificó Neon CLI 9.2.0, se reutilizó la sesión autenticada y se instaló el plugin oficial de Neon para Codex siguiendo [las instrucciones oficiales](https://neon.com/prompts/agent-setup.md). Una sesión nueva de Codex carga el MCP y las habilidades del plugin.

`.neon` apunta al proyecto y a `production`. `.env.neon.local` contiene sus conexiones agrupada y directa; `.env.neon-migration.local` contiene las de la rama de prueba. Ambos archivos, el contexto y los respaldos comprimidos están excluidos de Git.

## Cambio de conexiones y acceso con Google

El usuario amplió el alcance para mover también las conexiones y el inicio de sesión a Neon. El código preparado reemplaza el cliente de InsForge por `@neon/neon-js` en blog, Kanban, lugares e historial de Magic. Neon Auth restaura la sesión y gestiona el acceso con Google. Las URLs públicas están en `.env.local` y en el flujo de compilación de GitHub Pages.

Las migraciones revisables son:

1. `migration/20261110-neon-roles.sql`: conserva los roles importados con nombres `insforge_*`, porque el aprovisionamiento de la API de Neon exige crear sus propios roles `anonymous` y `authenticated`.
2. `migration/20261110-neon-auth.sql`: conserva los predicados de las políticas al cambiar sus roles, concede únicamente lectura de tablas públicas y operaciones sobre las tablas privadas concretas, y vincula usuarios históricos por correo verificado. Los roles de la API no pueden consultar `auth.users` ni las tablas internas de importaciones y cuotas.

La función `auth.uid()` devuelve el UUID anterior únicamente cuando el correo de la identidad de Neon está verificado. `ensure_app_user()` devuelve solo ID, correo, nombre y avatar, y registra la referencia de usuarios nuevos en la tabla de compatibilidad. No se escriben tablas administradas de Neon Auth.

El usuario autorizó explícitamente aplicar y verificar la migración en prueba y producción. Ambas ramas tienen la API de datos, las políticas nuevas y los dominios registrados. Las tres RPC privadas de la aplicación tienen permisos de ejecución explícitos para `authenticated`. No se concedieron membresías al propietario para simular usuarios: se verificó el acceso mediante cuentas desechables y peticiones HTTP normales.

La aplicación alojada en GitHub Pages permanece sin cambios mientras el código del sitio no se publique. El nuevo servicio de análisis ya está desplegado en Vercel, conectado a Neon:

- Proyecto `diegodev-api`, ID `prj_n5wgEX0iLyIlWAW7pHUNCQhrVmDV`.
- Equipo Diego Araneda's projects, ID `team_H9dRefsL7wFLUIZMoOnT2vkQ`.
- Endpoint público: `https://diegodev-api.vercel.app/api/analyze-deck`.
- Región `gru1`, Node.js 24. Código y dependencias independientes en `backend/`.
- Despliegue verificado: `dpl_6ieyZMncagpDZdSCv9LeQd9FD2SN`.

El alojamiento anterior de InsForge devolvía 503 y la consulta del proyecto devolvió `Project not found`. El proyecto Neon está en São Paulo, donde Neon Functions no está disponible según la guía consultada, por lo que el servicio usa Vercel en la misma región geográfica. No se modificó el alojamiento del frontend ni el DNS.

La URL principal de producción responde públicamente y exige JWT de Neon para analizar. Las URLs individuales de despliegue mantienen su protección de Vercel. No se creó un enlace compartido ni se modificó esa protección.

## Comprobaciones del código y pasos pendientes

- La compilación de producción con las variables públicas de Neon pasó.
- Las consultas de lectura y paginación de los importadores se probaron contra la rama de Neon. Se comprobó que rechazan tablas fuera de alcance y escrituras sin filtro.
- Se verificó que Neon Auth emite tokens públicos y permite iniciar el flujo de Google, sin iniciar sesión en ninguna cuenta.
- El backend pasó `npm run check` y se desplegó correctamente. La prueba contra el endpoint real analizó un mazo con datos de Neon y rechazó tokens ausentes e inválidos.
- En ambas ramas se verificaron registro de cuentas desechables, persistencia de sesión, JWT, creación/lectura/eliminación del tablero propio, bloqueo de lectura y modificación de tableros ajenos, rechazo de inserciones con propietario falsificado, RPC de lugares y cuotas, y cierre de sesión.
- Se comprobaron las cabeceras CORS de Auth, Data API y análisis para `https://diegui.dev`.
- Se eliminaron las 14 cuentas desechables creadas durante las comprobaciones: 12 en la rama de prueba y 2 en producción. También se eliminaron sus perfiles y datos dependientes; ningún perfil de prueba permanece en las bases.
- La comprobación de ESLint de los archivos nuevos del cliente y servicio pasó. El contexto de autenticación conserva el aviso previo de Fast Refresh por exportar un componente y el hook desde el mismo archivo.

Los comprobantes de acceso y limpieza están en `docs/neon-access-verification-production.json` y `docs/neon-test-cleanup.json`. No contienen contraseñas, cookies ni tokens. La comprobación de Google se limitó a iniciar el flujo OAuth; no se inició sesión en una cuenta personal de Google.

Los importadores programados leen `secrets.NEON_DATABASE_URL` en GitHub Actions. El secreto se configuró y verificó en `daranedag/diegodev` el 10 de noviembre de 2026, con autorización explícita del usuario. Contiene la conexión agrupada de Neon, cifrada con la clave pública del repositorio antes de enviarla. Su valor no se incluyó en Git ni en los registros. El flujo ya no utiliza las credenciales anteriores.

El servicio de análisis ya tiene configuradas `NEON_DATA_API_URL`, `NEON_AUTH_BASE_URL` y `NEON_AUTH_JWKS_URL`. El análisis estructural, la legalidad, la comparación con el meta y las recomendaciones están operativos. El enriquecimiento opcional con LLM no tiene credencial configurada; se conserva el comportamiento de respaldo basado en reglas y datos. Las claves compartidas de Google permiten iniciar el flujo; Neon recomienda una aplicación OAuth propia para la identidad visual de producción, con retorno `{NEON_AUTH_BASE_URL}/callback/google`.

La copia de los datos no incluye archivos de almacenamiento; las URLs de imágenes conservan sus destinos originales.
