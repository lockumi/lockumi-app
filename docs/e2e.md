# E2E automática (Playwright)

- Suite: `e2e/` (`npm run e2e`). URL: `E2E_BASE` (por defecto https://app.lockumi.com). Workers: `E2E_WORKERS` (4).
- Dos papeles en paralelo (proyectos `inquilino` y `dueno`), cada uno en su navegador, con la sesión de demo@lockumi.com inyectada en `localStorage` (`lockumi.usuario`) y la pantalla de cada papel (`lockumi.vista`).
- Pruebas:
  - `paginas.e2e.ts`: entrada, Términos y Privacidad (versión 1.7-demo · 25 de octubre de 2026 desde el encendido del paso 16; si se revierte el encendido, se revierte también este cambio), sin errores de página.
  - `estados.e2e.ts`: inicio y cada estado del alquiler (firmas, en curso, plazo de reclamos, reclamo, mediación, cerrado) para los dos papeles.
  - `crear.e2e.ts`: crear un alquiler de prueba desde el formulario (marca «Leímos y aceptamos el Anexo 6-A.» si aparece) y cambiar de pantalla.
  - `red.e2e.ts` (una vez por corrida): cuenta de prueba → dueño de prueba → escrow → depósito → aprobación → liberación en la red de prueba, por `/api/solo`; rechazos (monto sobre el tope, liberar dos veces, acción no permitida); y la **comprobación del disputeResolver** del escrow nuevo:
    - fase 1 (hoy, `E2E_RESOLVER=plataforma`): debe ser la plataforma (`api/_lib/solo.ts:291`);
    - modo de dos personas (PR 9, `E2E_RESOLVER=mediador`): debe ser la clave pública del mediador (`E2E_MEDIADOR_PUBLICA`).
    El resumen dice siempre si el resolver es el mediador.
- Capturas con nombre: `capturas/<bloque>/<papel>-<nombre>.png`. Reporte HTML, capturas de cada prueba, videos y trazas de fallos: artefactos del job.
- Workflow `.github/workflows/e2e.yml`: al terminar un despliegue a Production (estado de commit «Vercel» = success en master, evento `status`; Vercel no crea GitHub Deployments en este repo, `deployment_status` queda por si se activa), a pedido (`workflow_dispatch`, con URL y resolver) y cada 6 horas. **No bloquea despliegues** (corre después).
- `E2E.md` se arma con `e2e/resumen.mjs`, va al resumen del job y se sube a la rama `e2e-resultados` (nunca a master). Esa rama no despliega (`vercel.json` → `git.deploymentEnabled`) y el commit lleva `[skip ci]`, así no hay ciclo de despliegues.
- Secretos de GitHub: `LOCKUMI_TW_MEDIADOR_PUBLICA` (clave pública del mediador; solo para comparar). No usa otros secretos ni imprime ninguno. Los correos de prueba (cuando el PR 8 esté publicado) van solo a buzones del equipo.
- Local: `E2E_CHROME=/usr/bin/google-chrome npm run e2e` usa el Chrome del sistema.
- Build local de producción: `VITE_TRUSTLESS=1 npm run build` y `vite preview` con un proxy de `/api` a https://app.lockumi.com (las funciones no corren en `vite preview`); luego `E2E_BASE=http://localhost:<puerto>`.

## Link del correo de invitación (paso 21)
- `npm run e2e:invitacion` (`scripts/paso21-invitacion/e2e-enlace.mjs`, opcional una carpeta para capturas): Vite local contra Supabase, `/api/correo` con el `atenderCorreo` real y Resend falso, y el href del botón del correo abierto en un navegador nuevo sin sesión. Falla si después de entrar no llega a la invitación o si el alquiler no queda en «Tus alquileres». Necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (públicas) y `CHROME=/usr/bin/google-chrome` en la caja. Ver [`invitacion-enlace.md`](invitacion-enlace.md).
