# Lockumi · Demo de la app web — Plan

> **Documento histórico (fases 1 y 2, 16 oct 2026).** No describe lo que hace hoy app.lockumi.com. Hoy la app corre en la red de prueba de Stellar (testnet) con escrow real de Trustless Work y USDC de prueba en cada paso, login real con Cavos, una sola persona (tú eres el inquilino y el dueño es un dueño de prueba de Lockumi) y sin selector «Ver la demo como». Las fechas se escriben dd/mm/aa (también dd/mm/aaaa). El rendimiento con Blend **no está activo** y nunca sería garantizado. Las invitaciones por correo o link y el modo de dos personas son **próximamente**. El estado actual está en el [README](README.md).


## Cierre sin pago del reparto aceptado (27/10/2026, rama `cierre-pago-reintento`)
- Prod `b10557f9`: «Aceptar reclamo» cerró el caso y el pago dio 401 (pestaña sin token de Cavos → «repartir» sin prueba). Mediación: la persona mediadora recibía 403. Ninguno se reintentaba.
- Arreglo sin cambios visibles: prueba firmada antes de cerrar; `pagarReparto` idempotente (bloqueo del paso 22); mediadora validada en `lk_mediadores`; corrida de cada hora y `/api/borrados?reparto=<id>` para los casos por pagar.
  Migración `20261027120000` antes del código. Detalle: `docs/fondeo-testnet.md` § «Reparto por pagar»; matriz: filas 16, 18 y 21, nota F.

## Depósito de dos personas: trustline del inquilino (26/10/2026)
Trustless Work rechazaba el deploy (400, role receiver) porque la cuenta Cavos del inquilino no existía en testnet. Ahora (opción A, 26/10, 9:13 p. m.) la plataforma crea la cuenta con reservas patrocinadas y la persona firma con Cavos la trustline, como Meteorito, sin Friendbot (docs/fondeo-testnet.md); el USDC del depósito lo pone el ramp simulado, el servidor la revisa antes de llamar a TW y el error técnico ya no se ve («No pudimos preparar el depósito. Intenta de nuevo en un momento.»). Detalle: [docs/prueba-completa.md](docs/prueba-completa.md#depósito-de-dos-personas-la-cuenta-del-inquilino-sin-trustline-26102026).

## Invitación abierta con otra cuenta: código al correo invitado (26 oct 2026, aprobado por Katherine)

- **Síntoma:** Katherine entró con Apple (correo distinto o `@privaterelay.appleid.com`) para aceptar una invitación enviada a su Hotmail y vio «Esta invitación es para otro correo…», sin forma de seguir.
- **Cambio (sin diseño nuevo):** donde salía ese mensaje ahora sale «Esta invitación se envió a k•••@hotmail.com» (primera letra, ••• y @dominio), la casilla de siempre de los Términos y el botón «Enviarme un código a ese correo». El botón manda el código de 6 números de siempre (`api/_lib/codigo-correo.ts`, acción nueva `'invitacion'`: solo la huella HMAC, 10 min, 5 intentos, un solo uso, 1 por minuto y 5 por hora) al correo INVITADO. La pantalla del código es la del segundo factor (`CodigoCorreo`): «Te enviamos un código de 6 números a k•••@hotmail.com. Escríbelo aquí para aceptar la invitación.» y «Aceptar invitación». Correo: «Escribe este código en Lockumi para aceptar la invitación. …». Con el código correcto el servidor acepta la invitación con la cuenta de la sesión y registra el correo invitado verificado (`lk_invitaciones_verificadas`). Sin la reputación encendida se ve el texto de antes.
- **Servidor:** migración `20261026040000_invitacion_codigo.sql` (volver atrás: `supabase/revert/20261026040000_invitacion_codigo_revert.sql`). Sin código válido para el correo invitado de ESE alquiler, `lk_aceptar_invitacion` sigue rechazando a otro correo. El correo invitado no pasa a ser el correo de la cuenta. Detalle: [`docs/invitacion-enlace.md`](docs/invitacion-enlace.md).
**Arreglo (26/10/2026, 20261026050000_invitacion_codigo_cuenta):** la prueba en producción devolvió 409 al aceptar después del código: con la reputación encendida, el disparador `lk_participante_correo_verificado` exige que `lk_participantes.email_cavos` sea un correo verificado de la cuenta, y se guardaba el correo invitado. Ahora, al aceptar por el código, `email_cavos` es el correo verificado activo de la cuenta que acepta (`lk_correo_activo`); el correo invitado queda en `lk_invitaciones_verificadas`. Sin cambios en el camino de siempre. Revert: `supabase/revert/20261026050000_invitacion_codigo_cuenta_revert.sql` (después, si hace falta, el de 040000). La prueba de vitest ahora enciende la reputación como en producción.
- Pruebas: `src/servidor/__tests__/invitacion-codigo.test.ts` (PGlite con todas las migraciones, la revert incluida).
- **Pendiente (después):** los correos de código de Lockumi a direcciones ocultas de Apple (`@privaterelay.appleid.com`) no se entregan (ej.: el código de «Eliminar mi cuenta» de las 8:40 a. m. CR del 26/10 quedó «sent» en Resend). Causa: el login con Apple usa la app de Apple de Cavos (`com.cavosx.auth`), así que el equipo de Apple Developer de Cavos tiene que registrar `lockumi.com` e `invitaciones@lockumi.com` en «Sign in with Apple for Email Communication». La alternativa (mandar el código a un correo real) es un cambio visible y necesita el OK de Katherine. Katherine lo dejó para después («Ok pero no ahora»). Sin cambios de código por esto.

## Arreglo: «Enviar código» sin respuesta (26 oct 2026), sin cambios visibles

- **Síntoma:** 26/10, 8:18 a. m. (CR, UTC-6). En iPhone Safari, Katherine escribió un correo de Hotmail en «Continuar con tu correo» y tocó «Enviar código». No salió ningún mensaje y no llegó ningún código.
- **Causa:** `auth.sendOtp` espera a Cavos (`POST https://cavos.xyz/api/oauth/email/code`) sin límite de tiempo. Si esa petición no responde, la hoja queda en «Enviando…» para siempre y sin error. Se reprodujo en WebKit y Chromium (iPhone 14) contra producción con la petición colgada: «Enviando…» seguía a los 25 s. Si Cavos responde 422 o la red falla, el error ya salía bien. Además, «Reenviar código» no atrapaba los errores.
- **Arreglo:** `conLimite` (20 s) en `auth.sendOtp`. Pasado ese tiempo sale el texto que ya existe, «No pudimos enviar el código. Inténtalo de nuevo.». «Reenviar código» muestra el mismo error si falla. No cambia el flujo de Cavos, ni los textos, ni el diseño. Prueba: `src/services/__tests__/envio-codigo.test.ts`.

## Arreglo: invitación por correo que no salió (26 oct 2026), sin cambios visibles

- **Síntoma:** 26/10, 7:41 a. m. (CR, UTC-6), Katherine invitó por correo al crear un alquiler y el correo nunca llegó. `POST /api/correo` respondió 502 y en Resend no se creó ningún correo.
- **Causa (cuenta de Resend):** la cuota diaria se agotó a las 2:53 a. m. CR (08:53 UTC) con la corrida E2E (201 correos entregados el 26/10 UTC). Después, todo envío falla (`last_event: failed`, sin `message_id`) o Resend lo rechaza. La cuota diaria se reinicia a las 00:00 UTC (6:00 p. m. CR).
- **Error del código:** `lk_correos_invitacion` se registraba ANTES de enviar y no se borraba si Resend fallaba, así que la invitación de ese alquiler quedaba como «ya enviada» (409) para siempre.
- **Arreglo:** si Resend no acepta la invitación, `atenderCorreo` borra el registro (`DELETE lk_correos_invitacion?contrato_id=eq.<id>`, o lo quita de la memoria) y anota en el log solo el estado y el nombre del error de Resend (sin llave ni correo). Los textos y la pantalla no cambian. Prueba: `src/servidor/__tests__/borrados-api.test.ts`.
- **Pendiente (con cambio visible, sin hacer):** la app envía la invitación sin esperar la respuesta (`void enviarInvitacionUnaVez` en `Crear.tsx`) y no muestra el error ni ofrece reenviar el correo.

## Arreglo: «Confirmar el reparto» con depósitos de antes de C (26 oct 2026), sin cambios visibles
- **Síntoma (7:17–7:20 a. m. CR):** en un alquiler de una persona creado el 22/10 (escrow `CANJOOE5…VDFU`, 1,00 USDC de prueba, reparto 0,50 / 0,50), «Confirmar el reparto» daba siempre el error de la red de prueba (A12). Vercel: 4 POST `/api/solo` con 502 (13:17:43–13:20:02 UTC). Horizon y Trustless Work funcionaban (la disputa del mismo escrow entró a las 7:17:02 a. m. CR).
- **Causa:** desde que se encendió `LOCKUMI_DOS_PERSONAS=1` (25/10, 7:03 p. m. CR), «resolver» firmaba con la persona mediadora, pero los escrows creados antes nombran a la plataforma como `disputeResolver`. El contrato respondía `Error(Contract, #12)` (OnlyDisputeResolverCanExecuteThisFunction), Trustless Work devolvía error y la app lo mostraba como red lenta. Reintentar no lo arreglaba.
- **Arreglo:** `api/_lib/solo.ts` · `resolvedorDe`: firma la cuenta que el escrow nombra como `disputeResolver` (mediadora o plataforma); si no es ninguna de las dos, 403. Sin cambios en textos ni pantallas. Pruebas: `src/services/__tests__/solo-proxy.test.ts` (depósito de antes del interruptor y resolver ajeno).
- **Pendiente (no tocado):** `api/_lib/tw.ts` (alquileres de dos personas en Supabase) sigue resolviendo con `LOCKUMI_TW_MEDIADOR_*`; los alquileres de C nacen con la mediadora como resolver, así que no les afecta.

## Paso 21 (25 oct 2026, publicado sobre la reputación): el link del correo de invitación abre la invitación
- [x] Publicación (OK de Katherine 10:40 p. m. CR; Legal aprobó 96eb146): rama `paso21-sobre-reputacion` (cherry-pick sobre master con la reputación), `asegurarCorreo(u.email)` antes de aceptar, migración `20261025230000` en producción después del deploy. Hecho: merge `76d2680` (PR #30), deploy `dpl_Gn2cYXamihaW9nY4re2T3NVrcwEF` (11:03 p. m. CR), migración 11:03 p. m., prueba en app.lockumi.com todo OK (11:10 p. m.). Volver atrás: docs/invitacion-enlace.md. Pendiente: prueba con dos cuentas reales (no hay una segunda cuenta real; Cavos rechaza mail.grokbot.com) y adaptar `e2e-c.mjs --real` a la reputación encendida (verificar el correo del dueño y REP-01).
- Causa: el botón del correo de invitación llevaba a la raíz de la app (`api/_lib/correo.ts:81` en f6e3254) y la app no mandaba el token; la persona invitada caía en Inicio después de entrar.
- Arreglo: botón a `#/invitacion/<alquiler>/<token>` (token comprobado contra el link vigente antes de enviar), regreso guardado también en localStorage 30 min, título de Legal en Entrar sin sesión y mensaje de Legal en la tarjeta del dueño con «Compartir por WhatsApp». Sin migraciones en la v1.
- E2E nuevo `npm run e2e:invitacion`: abre el link REAL del correo en un navegador sin sesión. Detalle en [`docs/invitacion-enlace.md`](docs/invitacion-enlace.md).
- **v2 (Legal y Katherine, 25/10 10:10–10:15 p. m.):** migración nueva `20261025230000_invitacion_correo_verificado.sql` (no aplicada): solo acepta el correo invitado VERIFICADO de esa sesión (`lk_correos_verificados`); otro correo → «Esta invitación es para otro correo. Sal de Lockumi y vuelve a entrar con el correo al que te llegaron el enlace.». **Depende de la reputación** (paso 19): publicar primero la reputación, rebasar, publicar la app y después aplicar 230000. Mensaje del dueño nuevo, Entrar sin sesión corta («Te invitaron a un alquiler» / «Inicia sesión para verlo»), más aire bajo el título y plegables cerrados «Reglas del alquiler» y «Contrato de alquiler (Ejemplo)». E2E local sin red (Supabase de prueba con PGlite).
- **v3 (Legal 25/10, 10:30 p. m.):** «Trustless Work cobra una comisión del 0,3 % de cada monto que se libera.» justo debajo del aviso de la red, en la invitación y en la vista del alquiler. La línea del plazo de 7 días **no** se agregó: el código no coincide (empieza con «Recibí la casa» o 2 días después de la entrega, 7 días naturales con domingos y feriados, cierre por el cron diario o al abrir el alquiler, pago en la red solo al abrir el alquiler). Detalle en [`docs/invitacion-enlace.md`](docs/invitacion-enlace.md).
- **Segunda vuelta (pendiente):** botón para **rechazar** la invitación (con texto de Legal); una línea corta del plazo para reclamar que diga lo que hace el código (texto nuevo de Legal); que el cron diario también pague en la red la devolución automática (hoy solo la app al abrir el alquiler).

## Franja: texto nuevo (publicado con el OK de Katherine)
- Franja de la red de prueba (pedido de Legal, 24/10 11:25 p. m.): el texto pasa de «Red de prueba: depósitos reales en testnet, sin valor» a «Red de prueba de Stellar: sin dinero real.». CAMBIO VISIBLE en producción, publicado con el OK de Katherine (24/10, 11:39 p. m.).

## Ajustes de Legal 11:25 p. m. (24 oct 2026), sin cambios visibles
- Con `VITE_PRUEBA_COMPLETA`: `usd()` da «N USDC de prueba» y `Fondo` siempre muestra la franja de la red de prueba.

## PR 8 · paso 15 (24 oct 2026): B.8 suscripción y B.13 rendimiento «función en estudio», sin cambios visibles
- Detrás de `VITE_PRUEBA_COMPLETA`. `src/prueba/SuscripcionPC.tsx`, montado en Crear antes del Anexo 6-A.

## Sin marcadores visibles (24 oct 2026, 11:08 p. m.), sin cambios visibles
- B.6 con el texto final de Legal sobre el país (sin región); fuera los [PENDIENTE] de la B.1 y la B.7. Prueba `sin-marcadores.test.tsx`.

## PR 7 · pasos 12 y 13 (24 oct 2026): aviso de 5 días (B.3) y fecha y hora en las fotos (6.4.2), sin cambios visibles
- Detrás de `VITE_PRUEBA_COMPLETA`. `src/prueba/AvisoSalida.tsx` (aviso «reparacion-5» de `sincronizar`, fotos de entrada, enlace a las reglas, simulador hasta el aviso) y `src/prueba/fotosFecha.ts` (pie y sello de `FotoLista`). El PDF B.11, la B.8 y la B.13 quedan para el paso 14 (requiere Legal y Katherine).

## PR 6 · paso 10 (24 oct 2026): Mediación Lockumi (demo), B.12, B.14 y 6.3 f, sin cambios visibles
- Detrás de `VITE_PRUEBA_COMPLETA`. Lógica en `src/prueba/mediacion.ts`, acción `resolverSimulacion` (`via: 'simulacion'`), pantalla `src/prueba/MediacionPC.tsx`. La mediación con una persona real queda fuera (condición de Legal: texto de Privacidad). El borrado a los 30 días pasa al PR 10 (va con el texto de Privacidad).

## PR 5 · paso 9 (24 oct 2026): reclamo por rubros, propuesta automática simulada y regla del silencio, sin cambios visibles
- Detrás de `VITE_PRUEBA_COMPLETA`. Lógica pura en `src/prueba/reclamos.ts`, acciones `reclamarRubros`, `responderRubros`, `votarPropuesta` y `aplicarSilencio`, pantallas en `src/prueba/ReclamoPC.tsx`. Ver docs/prueba-completa.md.

## PR 4 (24 oct 2026): flujo del dueño, avisos 1/4/6, contador B.9 y simulador de días, sin cambios visibles
- Detrás de `VITE_PRUEBA_COMPLETA`. Ver docs/prueba-completa.md.

## Sin pantalla de volver a aceptar (24 oct 2026, pedido de Katherine, 10:03 p. m.) — publicado con el OK de Katherine (10:27 p. m.)
- Con la sesión abierta se entra directo, aunque la versión aceptada sea anterior. `src/legal/Reaceptacion.tsx` queda sin uso (se conserva con sus pruebas). Entrar sigue pidiendo la casilla y guarda 1.6-demo.
- Propuesta de Legal (10:05 p. m.), **solo imágenes, sin programar** (`capturas/sin-reaceptacion/aviso.jpg` y `linea-boton.jpg`): a) aviso que se puede cerrar la primera vez que entra quien aceptó 1.5; b) línea «Al continuar, aceptas los Términos 1.6-demo y el Aviso de privacidad.» sobre el botón de crear o firmar un alquiler.

## Paso 16 (25 oct 2026, rama `paso16-terminos-17`, sin publicar): Términos y Privacidad 1.7-demo
- Textos de Legal (`legal/prueba-completa-textos.md` A.1–A.8 y la frase de 30 días de Privacidad) en `src/legal/v17/`. Con el interruptor encendido, `/terminos` y `/privacidad` muestran la 1.7-demo; la 1.6-demo queda en `/terminos-1-6` y `/privacidad-1-6`.
- **Sin pantalla de volver a aceptar** (no se usa `Reaceptacion.tsx`): el login se ve igual; solo cambia el texto detrás de los enlaces.
- Cada alquiler guarda `terminos.version` (los nuevos, la 1.7-demo) y el contrato la muestra. Los de la 1.6-demo siguen con sus reglas (`reglas17(a)` es falso) salvo que **los dos** acepten pasar a la 1.7-demo (tarjeta «Términos de este alquiler», solo antes de la salida).
- Mediación: casilla sin marcar dentro de la B.7 y registro (`consentimientos`: cuenta, alquiler, versión, texto y fecha). Gancho `consentimientoCorreo` para el paso 11.
- Borrado: los datos de una mediación (fotos, motivos, descripciones y soportes) se borran 30 días después de cerrar el caso, salvo que una parte pida guardarlos (`guardarMediacion`); quedan los montos y el resultado.
- Encendido: commit aparte con `.env.production` (`VITE_PRUEBA_COMPLETA=1`). Volver atrás: revertir ese commit.

## PR 10 (plan, sin programar): 1.7-demo con la regla nueva de Legal (24 oct, 10:05 p. m.)
- **Sin pantalla que bloquee.** En su lugar, el mismo aviso que se puede cerrar y la misma línea sobre el botón de crear o firmar, con 1.7-demo.
- **Consentimiento de privacidad en el momento de usar cada función**, con casilla sin marcar: una para los correos y otra para la mediación. Sin esa casilla, la función no se usa (no se envían correos; no se abre la mediación).
- **No es retroactiva:** los alquileres firmados con 1.6 siguen con las reglas de la 1.6 (sin propuesta automática, sin suscripción y sin avisos de los días 1, 4 y 6), salvo que **las dos partes** acepten la 1.7.
- **La versión se ve en el contrato de cada alquiler** (la que rige ese alquiler).
- Cambia lo planeado antes: el PR 10 suponía volver a aceptar con la pantalla (`Reaceptacion.tsx`); ya no.

## Escenario C (PR #22, 25 oct 2026): 1.9-demo sin aviso de volver a aceptar (decisión de Katherine)
- Katherine aprobó las pantallas del modo de dos personas con un cambio: se quita el aviso de «Términos actualizados» de «Tus alquileres» (`AvisoVersion`). Solo Katherine tiene cuenta, así que nadie tiene que volver a aceptar.
- Una cuenta nueva acepta la 1.9-demo en «Entrar», como siempre, sin aviso ni pantalla de volver a aceptar (la misma decisión que con la 1.6-demo). Sigue la casilla de los Términos dentro de cada alquiler, al crear invitando y al unirse.
- **Servidor en producción (25/10/2026, CR):** migraciones 20261025030000 a 20261025070000 aplicadas entre las 2:12 y las 2:13 p. m., y 20261025080000 (permisos de `service_role` en `lk_*`) a las 2:28 p. m., con el OK de Katherine. C sigue apagado en app.lockumi.com.
- **E2E real** (`correr-c.sh --prod-datos-prueba`, datos `E2E-C`, Stellar testnet, dos cuentas): 41 pasos, 0 fallas (commit f16fc47). Datos de prueba, usuarios anónimos y fotos borrados después; quedan en 0.
- **Correos de C (COR-C-00 a COR-C-09), 25/10/2026:** todos desde el servidor (`api/_lib/correos-c.ts`; textos en un solo archivo, `api/_lib/textos-correos.ts`; diseño y lista en [`docs/correos-c.md`](docs/correos-c.md)). Casilla guardada en el servidor, una vez por evento, registro de cada envío, plazo de 3 días hábiles de la mediación (P-06) y texto P-05 en la pantalla de la mediación. Los 20 textos nuevos siguen con «LEGAL: revisar»: el envío y el build de producción fallan a propósito hasta que Legal los confirme. Migración `20261025090000_c_correos.sql` (solo agrega) aplicada en producción a las 4:25 p. m. y 4:31 p. m. CR; `waitlist` y `waitlist_intentos` sin cambios. E2E real con correos (commit c522c2a): 111 pasos, 0 fallas; los 45 correos llegaron al buzón de prueba; datos de prueba borrados después.
- **Legal, 25/10/2026 5:09 p. m. (fase 3):** recordatorios COR-C-02/04 contados hacia atrás desde el vencimiento real (`20261025100000_c_recordatorios_hacia_atras.sql`, aplicada en producción a las 5:25 p. m., solo la función); vencimiento de la mediación con los correos apagados (diario por Vercel Hobby, más en cada paso); COR-C-03 registra la apertura solo con el botón (POST); hora en 12 h y montos con 2 decimales en toda la app; la guarda cubre todas las marcas «LEGAL: revisar». Quedan por confirmar: COR-C-02/d4, 02/d6, 04/d6, 06/partes, la página del enlace de COR-C-03 y `privacidad.md:71`.
- **Legal, 25/10/2026 6:10 p. m. (bloqueantes antes de `CORREOS_C`):** líneas del reparto con 4 decimales exactos (0,4985 + 1,4955, comisión 0,0060; `api/_lib/centimos.ts`) y recordatorios por día calendario de Costa Rica (`20261025110000_c_recordatorios_dia_cr.sql`, aplicada en producción a las 6:19 p. m., solo funciones); en C sin «rubro por rubro»; `FECHA_V19` se cambia en una línea el día del encendido.
- **Encendido, 25/10/2026 7:04 p. m. CR:** variables de C en Vercel Production (lockumi-app-demo) y deploy `dpl_FuydsVHksKbrTRNmPcQTFDyDbKjr`; `/terminos` y `/privacidad` en 1.9-demo · 25 de octubre de 2026; E2E contra app.lockumi.com 111/0. Correo de la persona mediadora: `CORREO_MEDIACION` en Production = `business.applockumi@gmail.com` (decidido por Katherine el 25/10/2026; antes, el buzón de prueba `lockumi@mail.grokbot.com`).
- **Publicado en master el 25/10/2026, 5:44 p. m.** (merge f9489a6, deploy 6oBvDJqq7MWyQT2Dg8LCLva1XaZV), con el OK de Katherine y de Legal. Pendiente: cargar las variables de C en Vercel Production (el token de la caja no tiene acceso al equipo) y volver a desplegar.

## E2E automática (24 oct 2026)
- Playwright + workflow post-despliegue, cada 6 h y a pedido; E2E.md en la rama e2e-resultados. Ver docs/e2e.md.

## PR 3 (24 oct 2026): interruptor, Regla de propuesta automática (B.1) y Anexo 6-A (B.5), sin cambios visibles
- Todo detrás de `VITE_PRUEBA_COMPLETA` (apagado). Ver docs/prueba-completa.md.

## PR 2 (24 oct 2026): base de la prueba completa, sin cambios visibles
- Ver docs/prueba-completa.md.

## PR 1 (24 oct 2026): contrato compacto + 1.6-demo + volver a aceptar
- Sale a app.lockumi.com con la pantalla para volver a aceptar dentro de la sesión (regla de Legal: toda versión nueva sale con ella). Sin funciones de la 1.7-demo.

## Estado actual (20 oct 2026)

- **Repositorio (23 oct 2026):** el repositorio de la app pasó a la organización de GitHub **`lockumi`**: https://github.com/lockumi/lockumi-app (público, rama por defecto `master`). Los enlaces y el `git` de la dirección anterior (`businessapplockumi-crypto/lockumi-app`) redirigen a la nueva. El repositorio de la landing, `lockumi-landing`, **sigue privado en `businessapplockumi-crypto`** y no se mueve. El CI volvió a verde el 23 oct: faltaba en `package-lock.json` la entrada opcional `typescript@5.9.3` que exige `npm ci` con npm 10 (Node 22).
- **Íconos de la app (23 oct 2026, publicado en producción el 23 oct 2026 desde `master` 46199cc, deploy `dpl_83nhyLjh1Ey17RzMjiCEC5LFjFQh`):** `public/` ahora trae el isotipo de Lockumi en `favicon.ico` (16/32/48), `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` (180, fondo crema `#FFF5EE`), `icon-192.png`, `icon.png` (512) y un `manifest.webmanifest` mínimo; `index.html` los enlaza. Antes solo había el `favicon.svg` de ejemplo de Vite.
- **Publicado el 20 oct 2026 (código `d42e91b`, `master` en `3e044e4`; deploy `dpl_2831CmooXSLZpsH9yKhFTh5quDCe`):** «Tus alquileres» con un color por estado (pendiente miel, en curso salvia, reclamo o mediador terracota, terminado arena; solo tonos que ya existían), «qué te toca» en cada tarjeta, los 3 pasos arriba y «Tu cuenta para el depósito» con los mismos colores (misma lógica). Probado con 4 alquileres reales en testnet.
- **Nuevo alquiler** rediseñado: tarjetas de USDC de prueba («USDC de prueba de Lockumi», hasta 20, o «Usar mi propio USDC de prueba», hasta el saldo y como máximo 50 000), depósito con − y +, y **Entrada y Salida lado a lado** (también en celular) con calendarios de react-day-picker 10 en `<dialog>` (hoja inferior en celular, ventanita en escritorio).
- **Términos y Aviso de privacidad 1.5-demo** (20 oct 2026).
- **Depósito con el USDC de Lockumi:** antes de crear la cuenta segura, la cuenta de prueba se recarga siempre hasta el monto (arreglo del error «Tu cuenta tiene 0 USDC de prueba…»).
- **Publicado el 20 oct 2026 (commit `1483e31`, `master` en `4e6245a`; deploy `dpl_8Vcp5XCRTfb9nw2pVpafeJrXfBiz`):** el error «Tu cuenta tiene 0 USDC de prueba…» que seguía saliendo con sesión de Google venía de una pestaña abierta antes de publicar la recarga (versión vieja de la app). Ahora el servidor completa la cuenta de prueba al crear la cuenta segura (`origen: 'lockumi'` + identificador) y, a una pestaña vieja, le pide recargar la página. Probado en testnet con sesión de Cavos simulada: cuenta nueva y cuenta reutilizada en 0 llegan al depósito; sin sesión sigue funcionando.
- **Sección «Contrato»** siempre visible en el detalle, con firmas (fecha y hora) y «Descargar o imprimir».
- **Publicado el 23 oct 2026 (rama `contrato-plegable`, `master` en `abdfd9b`; deploy `dpl_ARoWYrXEBftUcz1L4NoRiQNA9N6v`):** contrato plegable. El resumen (estado, referencia, «El alquiler», «Partes» y pie), «Descargar o imprimir», la casilla y «Firma como inquilino» se ven siempre; Reglas, El depósito, 7 días para reclamos, Mediación y Firmas quedan tras «Ver contrato completo» (empieza cerrado cada vez). Imprimir siempre da el contrato completo. Sin cambios en textos legales. Ver [`docs/contrato-plegable.md`](docs/contrato-plegable.md).
- **Publicado el 23 oct 2026 (rama `contrato-plegable`, `master` en `abdfd9b`; deploy `dpl_ARoWYrXEBftUcz1L4NoRiQNA9N6v`):** avisos después de cada paso (qué pasó y qué sigue), aviso de error si el regreso de Google o Apple no termina, y arreglo de la caja «Qué toca ahora» que se veía en el modo de una persona. **23 oct: avisos v2** (tarjeta pequeña con la casita completa, debajo del encabezado en el teléfono, llave que gira una vez en los logros; «Tomar foto» con el ícono de la app). **23 oct, 11:25 a. m.:** sin X; el aviso se esconde solo a los 5 s (pausa con dedo, mouse o foco; se cierra al tocarlo, Enter, Espacio o Esc), sin diálogo y sin robar el foco. **Legal dio el OK (23 oct)** a «¡Depósito guardado!», «El ingreso no terminó» y al botón «Resolver el reclamo (simulación)». Ver [`docs/alertas.md`](docs/alertas.md). **23 oct, 11:24 a. m.:** Katherine confirmó quitar «Continuar»/«Entendido», los 6 logros con llave y la tarjeta abajo en el teléfono si el título queda abajo; publicar queda aprobado tras el OK de Legal a los 2 textos acortados. 23 oct: el error del ingreso queda escrito en Entrar hasta reintentar o entrar, y al volver de Google o Apple se ve «Entrando a tu cuenta…» en lugar de Entrar.
- **Publicado el 24 oct 2026 (aviso al alcance de Tab; rama `ux-guiada` unida a `master` con merge `--no-ff` en `1ab36ae` (master anterior `76373f8`); deploy de producción `dpl_EkFHfSn82SwL2JGvD7GmwXUGo38K`):** el aviso de 5 s es la 2.ª parada de Tab (justo después de «Saltar al contenido»), sin robar el foco; con el foco se pausa y Enter, Espacio o Esc lo cierran.
- **Publicado el 24 oct 2026 (rama `ux-guiada` unida a `master` con merge `--no-ff` en `1ab36ae` (master anterior `76373f8`); deploy de producción `dpl_EkFHfSn82SwL2JGvD7GmwXUGo38K`):** estado de espera v2 del paso «Pagar»: «Guardando tu depósito…» con la casita, nota «Esto tarda unos segundos. No cierres la app.», pasos reales Firmando · Enviando · Guardado en tres verdes, error que no se esconde con «Volver a intentar el pago». Incluye el aviso al alcance de Tab de `aviso-tab`. Detalle: [`docs/estado-espera.md`](docs/estado-espera.md).
- **Publicado el 24 oct 2026 (rama `ux-guiada` unida a `master` con merge `--no-ff` en `1ab36ae` (master anterior `76373f8`); deploy de producción `dpl_EkFHfSn82SwL2JGvD7GmwXUGo38K`):** aviso v2 · toast (pastilla de vidrio abajo, botón de acción, pila de 3, deslizar para cerrar, error de red A12 sin esconderse). También publicados: el recorrido guiado con driver.js ([`docs/recorrido.md`](docs/recorrido.md)) y los textos cortos aprobados por Legal el 24/10. **Pendiente:** el formulario «Nuevo alquiler» de una pregunta por pantalla (en desarrollo, no publicado). Ver [`docs/alertas.md`](docs/alertas.md).
- **Probado en producción (24 oct 2026, app.lockumi.com, 390 y 1280 px, sesión de demostración demo@lockumi.com sin login real de Cavos; `/api/solo` respondido por el script, sin tocar la red):** recorrido 97 ✓ (sale solo la primera vez con localStorage limpio, no sale al recargar, «¿Cómo funciona?» lo vuelve a abrir), espera del pago 84 ✓ y aviso v2 21 ✓. Imagen: `diseno/envio/ux-guiada/produccion.jpg`.
- ~~**Pendiente de Legal antes de usar dinero real:** cambiar «La persona mediadora (simulación) decidió…» del aviso `reparto`.~~ **Cerrado el 24 oct 2026 (rama `ux-guiada`):** Legal aprobó «Reparto del depósito» y «Se repartió el depósito…: {usd(r.dueno)} al dueño y {usd(r.inquilino)} al inquilino», la línea y el texto largo nuevos de la mediación (ayuda a buscar un acuerdo; no decide) y las líneas cortas de los 11 pasos del aviso v2. Detalle: `docs/alertas.md`.
- **Cerrado el 24 oct 2026 (rama `ux-guiada`):** la tarjeta de Inicio dice «Pagar el depósito · Luego, fotos de entrada» en vez de «Depósito protegido» (Legal). «Depósito guardado» solo se usa cuando ya está pagado.
- ~~**Pendiente de Legal:** todavía dicen que la persona mediadora «decide» `src/flujo.ts` (línea «sigue» de mediación), el texto de la mediación en `src/screens/Detalle.tsx` y el contrato (`src/screens/ContratoDoc.tsx`).~~ **Resuelto el 24 oct 2026 en la rama `contrato-compacto` (vista previa, sin publicar):** Legal aprobó los textos nuevos (la persona mediadora ayuda a buscar un acuerdo; no decide), marcados `// LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide`. Ver [`docs/alertas.md`](docs/alertas.md). Sigue pendiente: el aviso de ingreso dice «crear un depósito protegido»; no se cambia sin el OK de Legal.
- **Vista previa, sin publicar (24 oct 2026, rama `contrato-compacto` desde `051c071`):** contrato compacto en el detalle del alquiler. En la computadora, tarjeta corta (lugar, depósito, fechas, estado y «Ver contrato») arriba de la columna derecha, fija a 48 px y nunca más alta que la pantalla; el contrato completo se abre en un panel lateral. En el teléfono, una barra arriba (lugar · depósito) abre una hoja desde abajo que se cierra deslizando. Imprimir sigue dando el contrato completo; sin cambios en textos legales. La pantalla Firma sigue con el contrato plegable. Ver [`docs/contrato-compacto.md`](docs/contrato-compacto.md).
- **Antes de producción (lista para el abogado, 24 oct 2026):**
  - La resolución de disputas (`disputeResolver` en Trustless Work) tiene que quedar en una **persona neutral distinta de la plataforma**. Hoy es la cuenta de Lockumi (`api/_lib/solo.ts`, `api/_lib/tw.ts`). Trustless Work v2 lo exige: https://docs.trustlesswork.com/trustless-work/v2-en/introduction/technology-overview/roles-in-trustless-work
  - Custodia: quién guarda el depósito y quién puede moverlo en cada rol del escrow.
  - Si Lockumi sería proveedor de servicios de activos virtuales y qué registro o supervisión le tocaría.
  - *(Legal, 25/10/2026, 3:34 a. m., escenario C)* En C, Lockumi maneja en su servidor dos llaves del escrow de Trustless Work: la de la plataforma (serviceProvider, releaseSigner y platformAddress; abre la disputa) y la de la cuenta mediadora (disputeResolver; resuelve la disputa y puede repartir todo el saldo a cualquier dirección). **Juntas pueden mover los fondos**; la regla de las dos aceptaciones la aplica el servidor de Lockumi, no la red. **Con dinero real, esto probablemente es custodia de activos de terceros (SUGEF, Ley 7786)**: pregunta abierta para el abogado. No afecta la demo en la red de prueba (tokens sin valor).
  - *(Legal, 25/10/2026 4:33 a. m., escenario C)* Resuelto en PR #22: la Privacidad dice «que la invitan como inquilino» y «el correo de invitación de Lockumi»; la 2.4 dice «El enlace vence a los 7 días si la persona no se une.»; la 6.5 a) dice «Puede tardar hasta 24 horas después de que vence el plazo.» y el servidor rechaza los reclamos con el plazo vencido aunque el cron no haya pasado (migración `20261025070000_c_reclamo_vencido.sql`, aplicada en producción el 25/10/2026, 2:13 p. m. CR). Errores nuevos del servidor: textos finales de Legal (25/10, 4:56 a. m.), todos revisados; lista en `legal/errores-servidor-c.md` (fuera del repo). Lista completa de Legal para encender C: `prueba-completa/encendido-lista.md`.
  - *(Legal, ronda 4, 24 oct 2026)* Hoy el servidor de Lockumi guarda la llave del **dueño de prueba** (`api/_lib/solo.ts`, `duenoDe`) y firma por esa cuenta, por ejemplo la aprobación que devuelve el depósito. Con dinero real, eso sería **custodia**: el abogado tiene que revisarlo, y el dueño real tiene que firmar con su propia billetera.
  - *(Legal, ronda 6, 24 oct 2026)* **Con dinero real, esto es custodia y tiene que cambiar antes de producción:** hoy el servidor de Lockumi firma por las partes (el reclamo y la aprobación por el dueño de prueba, el depósito por el inquilino de prueba, la liberación y el reparto por la plataforma; `api/_lib/solo.ts` `fondear-prueba`, `aprobar`, `liberar`, `disputar`, `resolver`) y guarda la llave del dueño de prueba (`duenoDe`) y de los inquilinos de prueba. Con dinero real, cada parte tiene que firmar con su propia billetera y Lockumi no puede guardar llaves de las partes.
- **Antes de publicar los Términos 1.6-demo (Legal, rondas 5 a 8, 24 oct 2026):** desde la ronda 6, la cláusula 5.3 («Firmas.») tiene el texto final de Legal y **ya no depende del cambio en Cavos**: dice que Lockumi no usa la firma sin confirmación de Cavos y que abrir la línea de USDC se firma sin confirmación. Las variantes (a) y (b) de la ronda 5 quedan sin efecto (ver [`docs/alertas.md`](docs/alertas.md), «Legal, ronda 6»).
  - [ ] Términos 1.6-demo, ronda 7: 3.1, 5.3 y 5.5.1 b) con el texto de Legal sobre quién firma (misma versión y fecha).
  - [ ] Términos 1.6-demo, ronda 9 y 9b: 5.3 entera (a–f), 2.2 b), 3.1 y 5.5.1 b) con el texto de Legal (opción a: el reclamo y el reparto sí van a la red de prueba); Privacidad 1.6-demo (Freighter, «ver la cláusula 5.3»). Ya no hay discrepancia con producción (ver `docs/alertas.md`, «Legal, ronda 9b»).
  - [ ] **Aviso de privacidad 1.6-demo · 24 de octubre de 2026** (ronda 7: párrafo de Freighter y quién firma) **necesita el OK de Katherine** antes de publicarse. Al publicarlo, quien aceptó 1.5-demo en producción vuelve a marcar las dos casillas en «Entrar» (una sola vez). Quien ya tiene la sesión abierta no ve «Entrar» y no se le vuelve a pedir: la app no tiene otra pantalla que pida aceptar de nuevo.
  - [ ] *(recomendado, no bloquea)* Katherine pone en el panel de Cavos (app → Approvals) límites de **0** para XLM y USDC y «Over the limit» = *Ask the user*, para que ningún pago de la billetera se firme sin preguntar.
  - [ ] Legal revisa los textos que todavía dicen que el usuario firma con su billetera sin decir «si usas tu propia billetera» (lista en `docs/alertas.md`, «Legal, ronda 6»), por ejemplo Términos 3.1.
  - [ ] La landing (`index.html:148`) sigue sin cambios hasta el OK de Katherine. Texto de Legal: «Si no hay un reclamo con pruebas, después de 7 días se te devuelve tu depósito.»
  - [x] ~~**Nueva aceptación con la sesión abierta**~~: salió en el PR 1 y se **desactiva** a pedido de Katherine (24/10, ver `docs/reaceptacion.md`).
- **BLOQUEO: modo de dos personas (Supabase, `modoTrustless`).** Desde la ronda 9b, 5.3 c) ya cubre la aprobación con la billetera del dueño (`trustless.ts:28-30`). No activarlo hasta que Legal reescriba **5.3 e) y 2.2 b) para la fase 2**: ahí la disputa la abriría la billetera del dueño real, no la cuenta del dueño de prueba. La liberación sí la firma el servidor.
- **Decisión de Katherine (dinero real), Términos 6.3 f):** mientras hay un reclamo, todo el depósito queda bloqueado (escrow *single-release*). Opciones: varias liberaciones (3–5 h de tiempo real / 16–24 h para una persona) o mantener el texto. Antes, preguntarle a Trustless Work si un hito agregado después puede usar el saldo ya depositado (ver `docs/alertas.md`, «Legal, ronda 9b»).
- **RIESGO DE PRODUCTO:** hoy, en producción, el inquilino elige el reparto con un botón y Lockumi lo ejecuta en la red de prueba. Está informado en Términos 6.7, pero **no puede llegar a dinero real**: en un servicio real, sin acuerdo, el depósito queda bloqueado (ver `docs/alertas.md`, «Legal, ronda 9b»).
- **Antes de producción (técnico, Legal ronda 4, 24 oct 2026):** una **tarea programada** que devuelva el depósito al terminar el plazo sin reclamo, **sin depender de que alguien abra la app**. **Hecho y publicado (paso 22, 25/10/2026):** la corrida `/api/borrados` corre **cada hora** (Vercel Pro) y paga en testnet (`api/_lib/devoluciones.ts`); merge `1f5c6e5` (PR #32), deploy `dpl_9jMgfF88ThA3uoB3PBwqHmntksnR` (READY 11:31 p. m. CR), migración `20261026000000` aplicada a las 11:28 p. m. CR; revisión previa: 0 casos pendientes; OK de Legal a `TEXTO_REVISAR_PAGO`; E2E-C de producción 151 pasos, 0 fallas (ver `docs/correos-c.md`, «Paso 22» y «Publicación del paso 22»). **26/10/2026:** la invitación y el alquiler muestran el plazo como plegable «Plazo de devolución» (cerrado); dice «solo» únicamente con la corrida encendida (`GET /api/config`). Lo que sigue abajo es de antes: Hoy la devolución la dispara la app abierta (`src/screens/Detalle.tsx`, efecto que llama a `cerrarSinReclamo`) y `vercel.json` no tiene crons. Además, revisar en el panel de Cavos (app → Approvals) los límites de firma sin confirmación y la regla «Over the limit» = *Ask the user* (ver `docs/alertas.md`, «Legal, ronda 4»).
- **Historial:** «Alquiler creado» (ya no dice que se envió una invitación).
- **Resend:** dominio `lockumi.com` verificado y DNS listos para el correo de invitación de la Parte 4, que **no está activa**. Ver [`docs/correo-resend.md`](docs/correo-resend.md).
- Próximamente: dos personas reales con invitación por correo o link (Parte 4). El rendimiento con Blend no está activo.


Demo navegable (no se publica en lockumi.com). Vite + React + TypeScript, estado en localStorage con datos de ejemplo ficticios, rutas con hash (`#/…`) para desplegar como sitio estático. Estilo y tokens "Terracota viva" copiados de la landing (Inter para texto, Nunito para títulos, glass, chips verdes).

## Pantallas
1. **Entrar** (`#/` sin sesión) — pantalla con logo, 3 beneficios y botón «Entrar»; hoja de acceso con Google, Apple o correo + código de 6 dígitos (simulado, Cavos). Sin billetera ni frase semilla. El rol sale de cada alquiler (quien crea = dueño; invitado = inquilino). ✅ v3
2. **Tus alquileres** (`#/`) — lista de alquileres con estado, monto y fechas; selector de rol en la barra. ✅ Fase 1 · Desde el 20 oct 2026: un color por estado (`src/estados.ts`), «qué te toca», 3 pasos arriba y la tarjeta «Tu cuenta para el depósito» con los mismos colores.
3. **Nuevo alquiler** (`#/crear`) — monto del depósito, fechas de entrada y salida, reglas (lista), correo del inquilino. ✅ Fase 1
4. **Detalle / línea de tiempo** (`#/alquiler/:id`) — datos, reglas e historial. ✅ Fase 2 (línea de tiempo con todos los estados, datos e historial)
5. **Acta de entrada** — fotos + checklist por cuarto, de ambas partes; firmas simuladas con fecha y hora. ✅ Fase 2
6. **Pago del depósito** — el inquilino paga; queda "apartado" en escrow; mensaje: nadie lo libera solo. ✅ Fase 2
7. **Rendimiento opcional** — interruptor USDC (Blend); VARIABLE y NO GARANTIZADO; reparto 40% inquilino / 40% dueño / 20% Lockumi; sin tasa fija (cualquier número va marcado como "ejemplo"). ✅ Fase 2
8. **Acta de salida** — fotos + checklist, comparación lado a lado con la entrada. ✅ Fase 2
9. **Ventana de reclamo** — 7 días con cuenta regresiva; sin reclamo, después de 7 días el depósito se devuelve al inquilino; botón "simular paso de 7 días". ✅ Fase 2
10. **Reclamo** — el dueño presenta fotos y monto; el inquilino acepta o rechaza. ✅ Fase 2
11. **Mediación** — el mediador decide el reparto *(histórico; desde el 24 oct 2026 la persona mediadora ayuda a buscar un acuerdo y no decide)*; mensaje: la mayoría de los casos se resuelve en la app, la mediación es solo para pocos. ✅ Fase 2

## Simulado vs. real
| Pieza | Estado | Archivo |
|---|---|---|
| Login Cavos (correo/social, sin semilla) | Simulado | `src/services/auth.ts` |
| Escrow Trustless Work (liberación multiparte) | Simulado | `src/services/escrow.ts` |
| Rendimiento Blend (USDC) | Simulado, tasa "variable", ninguna cifra | `src/services/yield.ts` |
| Datos de alquileres | Locales (localStorage), ejemplos ficticios | `src/store.ts` |
| Interfaz, rutas y validaciones | Reales | `src/screens/*` |
No se usan llaves ni secretos. Toda integración simulada lleva la insignia "Demo: simulado".

## Checklist de la fase 2
- [x] Máquina de estados completa (`borrador → entrada → pendiente_pago → apartado → salida → ventana_reclamo → reclamo → mediacion → cerrado`) con acciones según el rol
- [x] Acta de entrada: cuartos, checklist, subida de fotos (vista previa local), firmas de ambas partes con fecha y hora
- [x] Pago del depósito + aviso de escrow multiparte
- [x] Interruptor de rendimiento con avisos de "variable / no garantizado" y reparto 40/40/20
- [x] Acta de salida + comparación lado a lado
- [x] Ventana de 7 días: cuenta regresiva, botón "simular paso de 7 días", devolución después de 7 días sin reclamo
- [x] Reclamo (fotos/monto) → aceptar/rechazar → pantalla del mediador (reparto)
- [x] Línea de tiempo visual con todos los estados
- [x] Decoraciones SVG, repaso del texto (español neutro, CR), accesibilidad
- [x] Capturas a 390/1366 de todas las pantallas; despliegue de vista previa (proyecto aparte, NO la landing)

## Estado al cierre de la fase 2 (16 oct 2026)
- Recorrido completo verificado con Playwright (`node e2e.mjs <url> [carpeta] [anchos]`) a 390 y 1366: entrar → crear → acta de entrada → firmas → pago → rendimiento → acta de salida → 7 días → devolución después de 7 días sin reclamo; y reclamo → rechazo → mediación → cierre. Sin desbordes ni errores JS.
- Fechas: campo propio dd/mm/aaaa con la fecha escrita debajo (ej.: "1 nov 2026"), igual en cualquier navegador.
- Fondo: la aurora ahora es `absolute` y cubre todo el documento (antes era `fixed` y se cortaba en capturas de página completa).
- Barra a 390: logo más compacto y "Salir" como ícono.
- `prefers-reduced-motion`: se apagan animaciones y transiciones.
- Vista previa: proyecto Vercel aparte `lockumi-app-demo`, con protección en todos los despliegues; acceso por enlace compartible de 7 días.

## Limitaciones conocidas
- Todo vive en el navegador (localStorage): cada persona ve su propia copia; dueño e inquilino se simulan con el selector de rol en el mismo dispositivo.
- Fotos reales se reducen y guardan localmente; con muchas fotos el almacenamiento del navegador puede llenarse.
- Correo de invitación, firmas, pago, escrow, rendimiento y mediador son simulados.

## v3 (16 oct 2026): acceso nuevo
- `src/services/auth.ts` expone `loginGoogle`, `loginApple`, `sendOtp`, `verifyOtp`, `handleCallback` sobre una interfaz `CavosLike` con la forma de CavosAuth de @cavos/kit (`getGoogleOAuthUrl`, `getAppleOAuthUrl`, `handleCallback`, `sendOtp`, `verifyOtp`). Proveedor actual: simulado; la dependencia no se agregó.
- Sin selector de rol al entrar; dentro de cada alquiler queda el selector «Ver la demo como» (demo en un solo dispositivo).
- Texto en español neutro con tuteo (sin voseo).

## Recorrido guiado (24 oct 2026, rama `ux-guiada`)

- [x] 6 pasos con driver.js sobre las pantallas reales; textos exactos de la maqueta.
- [x] Se abre solo la primera vez (por correo, guardado como huella) y tiene «Saltar».
- [x] Se vuelve a ver desde «¿Cómo funciona?» (encabezado) y la tarjeta «¿Primera vez?» de Inicio.
- [x] Alquiler de ejemplo de solo lectura para fotos, firmas y depósito, y mediación (simulación).
- [x] Accesible: foco en el globo, Tab atrapado, Esc, foco de vuelta, movimiento reducido.
- [ ] Entrada en el menú de la cuenta (avatar) de la maqueta: la app todavía no tiene ese menú.
- [x] Publicado en `master` el 24 oct 2026 (OK de Katherine).

## Paso 19 · Reputación (25 oct 2026; encendida en app.lockumi.com, PR #26, merge `f87c8b8`, deploy `dpl_FjGNMRmKrHjJ15gCbhzPdYaqpiXP`, 10:45 p. m. CR)

- [x] Interruptor `VITE_REPUTACION` (apagado por defecto; apagado, las pantallas no entran en el build y la app se ve igual).
- [x] 26/10/2026 (Legal, 1.13-demo; desde el 26/10 la edición vigente es la 1.14-demo): se quitó la pantalla REP-01 (y REP-01b). El perfil va en la casilla de los Términos de la pantalla de inicio; sin perfil ni alquileres, la misma casilla dentro de «Nuevo alquiler» y de la invitación («Para tu cuenta» / «Para este alquiler»). Ver docs/reputacion.md.
- [x] 26/10/2026 2:26–2:32 a. m. (Katherine + Legal): sin bloqueo ni casilla «Para tu cuenta»; las cuentas sin perfil siguen sin perfil público (Términos 15.1 / Aviso :104, texto de Legal). SQL `20261026030000_sin_bloqueo_perfil.sql` (revert en `supabase/revert/`). Arreglos del alquiler: final del contador según `devolucionAutomatica`, error de la devolución (seguro / en duda) y «Reloj de la demo adelantado». Recorrido de primera vez ya no se traba en `#/crear`.
- [x] ~~REP-01 en una pantalla aparte antes de crear la cuenta~~ (casilla sin marcar + REP-01b, [Continuar] desactivado hasta marcarlas), con versión, fecha, hora y texto. El login no cambia.
- [x] Cuentas anteriores a la 1.10-demo: sin re-aceptación ni pantallas extra; sin perfil, y sus alquileres no cuentan para nadie (Coordinador, 25/10).
- [x] Con un borrado pendiente no se crean ni se aceptan alquileres nuevos (app y SQL). El build falla si se enciende con «[fecha de encendido]».
- [x] Puntaje: inquilino baja solo por descuento del depósito; dueño solo si se devolvió al inquilino el 90 % o más de lo reclamado (antes del 0,3 %); siempre visible desde el 3.er alquiler; 10 años.
- [x] «En revisión» con reclamo abierto o revisión pedida (REP-11), avisos de cambio de puntaje y de los 10 años (REP-12), noindex.
- [x] Eliminar la cuenta gratis en 5 días hábiles; vitrinas opcionales; REP-14 y REP-15 en los textos legales (solo con el interruptor).
- [x] Migración escrita (no aplicada), pruebas unitarias, SQL y E2E con dos cuentas en local.
- [x] Segundo factor (Legal 5:04 p. m., Katherine 5:29 p. m.): código de 6 números por correo antes de «Eliminar mi cuenta» y «Descargar mis datos» (solo en modo servidor). Solo HMAC con pepper y sal, 10 minutos, 5 intentos, un solo uso por acción y persona, reenvío 1/min y 5/hora; la base lo exige (`lk_usar_codigo`). Pruebas SQL, API y pantalla; flujo real local con capturas a 390 px.
- [x] Segundo factor: Legal revisó los 2 textos propios (25/10, 6:01 p. m.: más de 5 por hora tal como está; «No pudimos enviarte el código. Vuelve a intentarlo en un minuto.» literal).
- [x] Segundo factor: el aviso «Ya te enviamos un código…» se oculta al empezar a escribir (Legal 6:04 p. m., opcional).
- [x] Verificación del correo (Legal 6:04 p. m., BLOQUEANTE): la huella de un solo uso es sobre `iss|sub|iat|nonce`, no sobre la firma (maleable). Pruebas: bit de relleno, ECDSA `s → n−s` y reuso → «ya usado».
- [x] JWKS reales del enclave, Google y Apple revisados (25/10 6:05 p. m.): todas las llaves publican `use = sig` y `alg`; la regla estricta se mantiene.
- [x] Valores de CAVOS_* buscados sin secretos: `CAVOS_APP_ID` = UUID interno de Cavos (no el `cav_…`), aud de Google y Apple = `client_id` de Cavos (docs/reputacion.md).
- [x] En Vercel Production (25/10): `CAVOS_APP_ID`, `CAVOS_AUD_GOOGLE`, `CAVOS_AUD_APPLE`, `LOCKUMI_CODIGO_PEPPER`; `RESEND_API_KEY` ya estaba.
- [x] Rama al día con master (escenario C); OK final de Legal al PR #26.
- [x] Encendida el 25 de octubre de 2026 (10:43 p. m. CR): `CAVOS_AUD_EMAIL` puesto al encender (de un login real con código por correo, en el navegador de Katherine) con `encender-reputacion.sh <AUD>`: migración, `VITE_REPUTACION=1`, fecha real en `src/legal/fecha-reputacion.ts`, merge del PR #26 y comprobación (docs/reputacion.md, «Encendido»).
- [x] Correo por código con el token de correo de Cavos (Legal 25/10, 9:00 p. m.): con `aud` «cavos-email» (la misma para todas las apps de Cavos) el correo solo queda verificado con el código de 6 números de Lockumi («Revisa tu correo», acción `verificar_correo` de `lk_usar_codigo`, mismas reglas del segundo factor). Migración NUEVA `20261025210000_verificar_correo_codigo.sql` (la aplica `encender-reputacion.sh`). Pruebas: sin código → 403; con el código → verificado. Alternativa para Legal (no implementada): el código del kit dice que el `nonce` del correo lleva el App ID (docs/reputacion.md).
- [x] Legal, ronda 1.10 (25/10/2026, 11:16 p. m. CR) y decisión de Legal sobre el PR #33 (11:33 p. m.): cada casilla y línea de versión abre la versión guardada (`/terminos-1-9`, `/terminos-1-10`, `/terminos`); regla de archivo (versiones publicadas byte a byte, `src/legal/archivo/8790b52/`); 1.11-demo para la edición de la cuenta con la reputación, fechada al publicar (`scripts/fecha-1-11.mjs`) y sin volver a aceptar; la ronda 1.10 de privacidad solo en la 1.11-demo; «Aceptar invitación» desactivado con el error de otro correo. OK de Katherine (hoja de contacto, 11:41 p. m.) y de Legal para publicar. **Publicado** el 26/10/2026: merge `04e4424`, deploy `dpl_6RWVr6RpmUvXTjtNcLYh2Rxy8bqd` (12:04 a. m. CR), 1.11-demo · 26 de octubre de 2026.
- [ ] Pendiente de Legal: alquiler abierto al eliminar la cuenta; fecha de publicación de la 1.8-demo; «Ajustes ›» en REP-14/REP-15 (la app no tiene Ajustes).
- [ ] Pendiente de producto: correos de aviso (VITE_CORREOS), límite de consultas en el servidor, servidor público de perfiles (la migración se aplica al encender).


## Tus alquileres en cualquier dispositivo (26/10/2026, Katherine; aprobado por el Coordinador)

- [x] Causa: «Tus alquileres» se ve por la sesión anónima de Supabase de cada navegador; al entrar en otro navegador (o después de borrar
  los datos del sitio) la sesión es nueva y no veía los alquileres de la persona.
- [x] Arreglo: después de un login cuyo correo verificó **Cavos** (token de Google o Apple que `/api/verificar-correo` valida en el
  servidor; el correo sale del token, nunca del cliente), el servidor llama a `lk_vincular_alquileres(sesión, correo)` y los lugares de
  esa persona (dueño e inquilino, con sus firmas, aceptaciones y ocultos) pasan a la sesión actual. No vale un correo verificado solo con
  el código de Lockumi (método `email`) ni uno sin verificar. Idempotente; solo clave de servicio; registro en `lk_vinculaciones`
  (sin correos). Sin pantallas ni textos nuevos: la lista se recarga sola.
- [x] Migración `20261026060000_vincular_alquileres.sql`; revert `supabase/revert/20261026060000_vincular_alquileres_revert.sql`
  (devuelve cada lugar movido a su sesión de antes). Código: `git revert -m 1 <merge>`.
- [x] Pruebas: `vincular-alquileres-sql.test.ts` (PGlite) y `verificar-correo-api.test.ts` (servidor). Detalle y prueba en producción:
  `docs/prueba-completa.md`.
- [x] Una sesión por cuenta (Katherine, iPhone Safari: Gmail en una pestaña y Apple en otra mostraban «Eres dueño» con la cuenta de
  Apple): la sesión anónima queda atada al correo de la cuenta (`lockumi.sesion-correo`, `src/servidor/cuenta-sesion.ts`). Al entrar
  con otra cuenta o al «Salir» se termina (signOut, se borra `lockumi.sesion-servidor`) y la lista se vacía; la sesión nueva recibe los
  alquileres del correo verificado por Cavos. Otra pestaña que cambia de cuenta recarga esta. Lista y rol salen de la cuenta actual.
- [x] Misma cuenta dueña e inquilina del mismo alquiler: se trae el lugar de **dueño** (una sesión tiene un solo lugar por alquiler).
- [x] Pie (Katherine, único cambio visible): «Tus alquileres de prueba se guardan en tu cuenta.» en el modo de dos personas.
- [x] E2E sin correos reales: `node scripts/e2e-vincular.mjs [--app URL]` (re-vincular, código de Lockumi no vale, cambio de cuenta,
  rol, «Salir», limpieza y waitlist).
- [x] Login con código por correo de Cavos (Coordinador, 26/10 10:21 a. m.): el token del enclave («cavos-email») se valida en el
  servidor y, con el código a ESE correo, el correo queda con método **«cavos-email»** (antes «email») y trae los alquileres igual que
  Google/Apple. El código de invitación de Lockumi sigue «email» y nunca trae. Migración `20261026070000_vincular_cavos_email.sql`,
  revert `supabase/revert/20261026070000_vincular_cavos_email_revert.sql`; prueba `vincular-cavos-email.test.ts`.
- [x] Pagar desde cualquier dispositivo (Katherine, 26/10 10:29 a. m.): «kit/stellar: this device is not an authorized signer of the
  wallet» salía porque conectábamos con `recovery: "none"`: la llave de la billetera solo vive en el navegador donde se creó y en otro
  queda `needs-device-approval`. Ahora `conectarBilletera` pasa, como el `CavosProvider` oficial, un `SocialRecoveryClient` (enclave
  Nitro, medidas `DEFAULT_SOCIAL_RECOVERY_ATTESTATION`) y la credencial fresca del login, solo si el panel de Cavos tiene la
  recuperación social activa (`/api/recovery/social/config`; si está apagada, todo queda igual). El error se muestra en español
  (`NO_FIRMANTE`). **Pendiente de Katherine:** activar la recuperación social en el panel de Cavos (entorno production) y, para una
  billetera ya creada, entrar una vez desde el navegador de origen para sellarla. Prueba `dispositivo-firmante.test.ts`; E2E
  `scripts/e2e-dispositivo.mjs`.
- [ ] App de Cavos «Lockumi v2» (27/10/2026, PR #60): app nueva en el panel de Cavos (producción `cav_14f91c44d57f4290070c0f9705f50164564b`; mismos orígenes, recuperación
  social/enclave y aprobaciones de Stellar que la vieja `cav_c1b1cec42e7b62cd01f377b5a3291b276079`). Motivo: el registro de la app vieja tiene billeteras quemadas por el error
  de `Buffer`; el registro de Cavos va por userId + appId + cadena + red, así que un App ID nuevo reinicia las billeteras (`appSalt` `'lockumi'`
  sin cambio). **Pendiente de Katherine:** el cambio en producción es poner `VITE_CAVOS_APP_ID` (y `CAVOS_APP_ID` interno
  `b2f83f81-a07d-4ef5-b8a5-167502aea497`) en Vercel, solo con su OK; volver atrás = poner otra vez los valores viejos. No se tocó Vercel. Detalle: `docs/firma-cavos.md`.
- [x] Correo real para avisos con Apple (Katherine por el Coordinador, 26/10 10:18 a. m.): con Apple y un correo
  `@privaterelay.appleid.com` los avisos no llegan. Dentro de «Crear alquiler» y de la invitación, un campo corto («Correo para avisos»)
  pide UNA vez un correo real y lo confirma con el código de 6 números (acción `correo_real`). Se guarda para esa cuenta de Apple en
  `lk_correos_reales` (origen «apple-real», NO en `lk_correos_verificados`: el correo activo, las invitaciones y la reputación no
  cambian). Los avisos (`/api/correo`, correos C) y los códigos de eliminar/descargar van al correo real (`lk_correo_aviso`).
  `lk_vincular_alquileres` trae los alquileres del correo real SOLO si ESTA sesión tiene un token de Apple verificado en el servidor
  (método «apple», < 10 min) de ese correo oculto; el código de invitación («email») nunca trae. Migración
  `20261026080000_correo_real_apple.sql`, revert `supabase/revert/20261026080000_correo_real_apple_revert.sql`; prueba
  `correo-real-apple.test.ts`; E2E `scripts/e2e-vincular.mjs` (paso «apple-real»). Doc: `docs/prueba-completa.md`.
- [x] «Esta invitación ya no está disponible» después de «Reiniciar mi demo» (Katherine, 26/10 11:05 a. m.): el reinicio NO deja nada
  inválido (alquiler nuevo con link vigente, sin ocultos, sin vencer). El correo salió 11:02:36 a. m. CR con el link vigente (el servidor lo
  comprueba) y a las 11:03:34 a. m. la sesión del dueño tocó «Crear un link nuevo (el anterior deja de servir)» (`lk_nueva_invitacion`,
  evento «Se generó un link de invitación nuevo»): el link del correo murió y la tarjeta seguía diciendo «Te enviamos el enlace a…».
  Arreglo sin textos nuevos: con el link nuevo, la tarjeta queda como sin correo (solo el link con «Copiar link» y WhatsApp,
  `linkNuevoSinCorreo`); sigue un solo correo por alquiler. E2E `scripts/e2e-reinicio-invitacion.mjs` (reinicio → alquiler nuevo →
  abrir el link → link nuevo). Doc: `docs/prueba-completa.md`.
- [x] Link de invitación ya usado (Katherine, 26/10 11:17 a. m., dos cuentas): al aceptar, el link sirve una vez; volver a abrirlo
  (otra vez desde el correo, otra pestaña o después de entrar) daba «Esta invitación ya no está disponible». Ahora, si la sesión ya es
  parte del alquiler, va directo al alquiler (`abrirSiYaEsMio`, sin textos nuevos). Test `invitacion-ya-aceptada.test.ts`.

- 26/10/2026 · Firma del servidor en testnet (solo red de prueba): en alquileres nuevos de dos personas, el servidor firma por el dueño y el inquilino con una cuenta de testnet propia de cada cuenta (api/_lib/tw.ts). Cavos queda solo para entrar. Apagar: FIRMA_SERVIDOR_TESTNET=0. En mainnet cada persona firma con su billetera Cavos.
- 26/10/2026 · El dueño puede eliminar un alquiler de dos personas mientras el depósito no esté pagado (el servidor lee el saldo de la cuenta segura en la red; migración 20261026090000).
  Detalle, solo testnet (en mainnet firma cada persona con Cavos) y límites: `docs/firma-servidor.md`.
- 26/10/2026 · Opción A (rama `cavos-firma`, pendiente OK de Katherine y Legal): prueba de Cavos en cada acción con la cuenta segura, Lockumi ejecuta con llaves de rol, depósito por ramp simulado de testnet; la firma del servidor queda solo para alquileres de antes. Migración 20261026110000 (no aplicada). `docs/firma-cavos.md`.
- 26/10/2026 · Opción A **con passkey** (decisión de Katherine, 8:53 p. m.): llave de acceso obligatoria al crear la cuenta (`secureStep: 'required'`) y «Entrar con mi llave de acceso» en un dispositivo nuevo; módulo reutilizable `src/services/llave.ts` (lo usará también `fondeo-testnet`). Solo la parte de passkey del PR #53.
- 26/10/2026 (9:38 p. m.) · Friendbot fuera de TODO el PR #57 (aprobado por Katherine): la tesorería crea las cuentas de la demo de una persona, del #54 y de los scripts (`createAccount`, 5 XLM; acciones `crear-cuenta` y `usdc-cuenta` de `/api/solo`); sin compra de USDC en el DEX por la persona. Migración `20261026110000_pruebas_cavos` aplicada en producción. Términos y Privacidad 1.14-demo (Legal, 26/10, 9:43 p. m.): 5.3, 5.4, 4.1 c) y d), 5.5 b), 5.5.1 b) y «Firmas de prueba»; la 1.13-demo queda en `/terminos-1-13` y `/privacidad-1-13`. Detalle: [docs/fondeo-testnet.md](docs/fondeo-testnet.md).
- 26/10/2026 · Fondeo «estilo Meteorito» (decisión de Katherine, 9:13 p. m.; mismo PR #57, el #58 se cerró): `activar-cuenta` (`api/_lib/activacion.ts`) — la plataforma crea la cuenta con 0 XLM y patrocina reservas, la persona firma la trustline de USDC con Cavos; el depósito lo fondea el ramp simulado desde la tesorería. Sin Friendbot, sin fondeo retroactivo y sin «cuenta nueva» (cuentas viejas abandonadas). Detalle y lo que falta: [docs/fondeo-testnet.md](docs/fondeo-testnet.md).
- 26/10/2026 · El dueño no puede aceptar su propia invitación (misma cuenta o mismo correo, también Apple): aviso «Este link es para la otra persona…» con «Cerrar sesión», y la base lo rechaza (migración 20261026100000). Ver `docs/invitacion-enlace.md`.
- 27/10/2026 · Arreglo de la entrada con cuenta nueva (rama `firmante-detalle-error`, PR en borrador, sin publicar; aprobado por Katherine 10:57 p. m.): se deja una sola conexión con `passkeyPrf` desde el inicio, igual que el `CavosProvider` de Meteorito (se quita `consultarLlave`, la segunda conexión automática) que dejaba «No pudimos abrir tu cuenta. Revisa tu conexión» en iPhone Safari; la llave de acceso se crea sola (como Meteorito; el vault pone el gesto) con la línea «Confirma con Face ID o tu huella para proteger tu cuenta» y «Intentar de nuevo» si no se completa; el error muestra un detalle técnico pequeño. Detalle: [docs/firma-cavos.md](docs/firma-cavos.md).
- 27/10/2026 · Causa real de «No pudimos abrir tu cuenta» (misma rama `firmante-detalle-error`, PR #60 en borrador): `ReferenceError: Buffer is not defined` tras la firma, porque Vite no incluye `Buffer` y el kit de Cavos lo usa como global (Next.js sí lo agrega). Se agrega `src/polyfills.ts` (paquete `buffer`) como primera importación de `src/main.tsx`, con prueba. Sin cambios visuales ni de flujo. Detalle: [docs/firma-cavos.md](docs/firma-cavos.md).
- 27/10/2026 · Volver con la llave de acceso sin haber escrito el código del correo (misma rama `firmante-detalle-error`, PR #60 en borrador; hallado en la prueba real del dueño): el token de Cavos guardado (JWT de 1 hora) ya no le sirve a `/api/verificar-correo` (5 minutos y un solo uso), así que el correo quedaba sin confirmar, aceptar la reputación y crear el alquiler daban 403 y la app no volvía a mostrar «Revisa tu correo». Arreglo solo en la app: no manda tokens viejos y recuerda 55 minutos el correo por confirmar para volver a la misma pantalla. Tests `volver-por-confirmar.test.ts`; detalle en `docs/reputacion.md` y `docs/firma-cavos.md`.
- 27/10/2026 · Recargar la página después de confirmar el correo (misma rama, PR #60; prueba real del inquilino): la app volvía a mandar el token de Cavos ya gastado a `/api/verificar-correo` (403 inofensivo, pero gasta 1 de 5 intentos por sesión/10 min y no mostraba «Revisa tu correo» si faltaba el código). Ahora recuerda 7 minutos una huella del token enviado (`lockumi.cavos.token-enviado`, nunca el token). Solo app; sin cambiar diseño ni flujo.
- 27/10/2026 · «Tu cuenta para el depósito» (misma rama, PR #60; pedido de Katherine): la tarjeta decía «Lista ✓» apenas Cavos daba la dirección, aunque la cuenta Stellar aún no existía (Horizon 404). Ahora «Lista ✓» solo con la cuenta ya activa en Horizon y, con Trustless Work, con el USDC habilitado; antes se ve el texto de espera ya existente «Preparando tu cuenta…». Sin textos nuevos ni cambio de diseño o flujo. Prueba: `src/screens/__tests__/billetera-lista.test.tsx`.
- 27/10/2026 · Sesión restaurada sin el correo confirmado (PR #61, rama `sesion-sin-correo-confirmado`; jurado, prueba real): si la marca local de 55 minutos ya había vencido (o en otro aparato), quien volvía con su llave de acceso veía «Tus alquileres» vacío y sin ninguna pantalla (`lk_aceptar_reputacion` 403 callado; los alquileres solo se vinculan al confirmar el código). Ahora, sin token que sirva ni marca, la app pregunta al servidor con `lk_necesita_rep01` (ya existente): `28000`/403 = correo sin confirmar → la misma pantalla «Revisa tu correo» con su «Reenviar código». Error de red u otro: sin falso aviso. Sin textos nuevos, diseño, flujo, migraciones ni variables. Prueba: `src/reputacion/__tests__/sesion-sin-correo.test.tsx`. Detalle: `docs/reputacion.md`, `docs/firma-cavos.md`.
- 27/10/2026 · U4, la cuenta Stellar del dueño faltaba y el pago daba 409 «Falta la cuenta Stellar del dueño.» (rama `guardar-cuenta-dueno`; prueba real `d475db0a`, dueño solo con llave de acceso): al firmar el contrato, si falta la cuenta de quien firma, se guarda la de la billetera conectada (`lk_actualizar_direccion`, como #62); respaldo: el dueño la reintenta al abrir el alquiler en «pendiente de pago». Límite: sin sesión de Cavos del dueño no hay cuenta que guardar y el pago del inquilino no puede guardarla; el arreglo completo (pedir sesión a la firma del dueño) es cambio de flujo: aprobado y publicado con el PR #65, línea siguiente. Sin textos, diseño ni migraciones. Pruebas: `cuenta-dueno-firma.test.ts`, `ciclo-dos-personas-sql.test.ts` («U4»). Detalle: `docs/fondeo-testnet.md`, `docs/matriz-caminos.md`.
- 27/10/2026 · U4, el dueño solo con llave de acceso (rama `firma-dueno-con-sesion`, PR #65; **aprobado por Katherine el 27/10/2026, 12:54 p. m. CR**, publicado con el PR #65): si al dueño le falta su cuenta Stellar, su firma del contrato pide antes «Entrar de nuevo» (mismo `ConSesion` y textos del inquilino; `src/screens/sesionFirma.ts`). Con la cuenta guardada no cambia nada. Cambio de flujo (un paso más solo para el dueño sin cuenta), con el OK de Katherine. Prueba: `sesion-firma-dueno.test.ts`.
- 27/10/2026 · Bugs de la matriz tras la mediación de `0070af80` (rama `bugs-mediador`): (1) `/api/correo` (avisos) daba 403 a la persona mediadora; ahora acepta a quien está en `lk_mediadores` en un alquiler que está o estuvo en mediación (como #66 en `/api/tw`). (2) La reputación con servidor mostraba «0 alquileres cerrados»: el perfil de la otra parte se buscaba en el localStorage de este navegador; ahora lo dice el servidor (`lk_reputacion_de_mis_alquileres`, migración `20261027140000`). Propuesta sin cambiar: el texto «Depósito devuelto · Lo aceptaron las dos partes» tras una decisión de la mediadora (`docs/matriz-caminos.md`, nota I).
