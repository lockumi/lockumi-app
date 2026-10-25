# Lockumi · Demo de la app web — Plan

> **Documento histórico (fases 1 y 2, 16 oct 2026).** No describe lo que hace hoy app.lockumi.com. Hoy la app corre en la red de prueba de Stellar (testnet) con escrow real de Trustless Work y USDC de prueba en cada paso, login real con Cavos, una sola persona (tú eres el inquilino y el dueño es un dueño de prueba de Lockumi) y sin selector «Ver la demo como». Las fechas se escriben dd/mm/aa (también dd/mm/aaaa). El rendimiento con Blend **no está activo** y nunca sería garantizado. Las invitaciones por correo o link y el modo de dos personas son **próximamente**. El estado actual está en el [README](README.md).

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

## PR 10 (plan, sin programar): 1.7-demo con la regla nueva de Legal (24 oct, 10:05 p. m.)
- **Sin pantalla que bloquee.** En su lugar, el mismo aviso que se puede cerrar y la misma línea sobre el botón de crear o firmar, con 1.7-demo.
- **Consentimiento de privacidad en el momento de usar cada función**, con casilla sin marcar: una para los correos y otra para la mediación. Sin esa casilla, la función no se usa (no se envían correos; no se abre la mediación).
- **No es retroactiva:** los alquileres firmados con 1.6 siguen con las reglas de la 1.6 (sin propuesta automática, sin suscripción y sin avisos de los días 1, 4 y 6), salvo que **las dos partes** acepten la 1.7.
- **La versión se ve en el contrato de cada alquiler** (la que rige ese alquiler).
- Cambia lo planeado antes: el PR 10 suponía volver a aceptar con la pantalla (`Reaceptacion.tsx`); ya no.

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
- **Antes de producción (técnico, Legal ronda 4, 24 oct 2026):** una **tarea programada** que devuelva el depósito al terminar el plazo sin reclamo, **sin depender de que alguien abra la app**. Hoy la devolución la dispara la app abierta (`src/screens/Detalle.tsx`, efecto que llama a `cerrarSinReclamo`) y `vercel.json` no tiene crons. Además, revisar en el panel de Cavos (app → Approvals) los límites de firma sin confirmación y la regla «Over the limit» = *Ask the user* (ver `docs/alertas.md`, «Legal, ronda 4»).
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
