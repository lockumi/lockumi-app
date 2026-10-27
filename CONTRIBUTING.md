# Cómo contribuir a Lockumi

Gracias por tu interés. Lockumi es una demo en la **red de prueba de Stellar (testnet)**: no uses cuentas ni fondos de la red principal.

## Qué hace la app hoy

Antes de cambiar código o documentación, lee la [guía para jueces del README](README.md#prueba-el-flujo-en-5-minutos-guía-para-jueces): describe lo que hace app.lockumi.com (testnet, una persona, flujo completo de 8 pasos con escrow real de Trustless Work). Si tu cambio modifica ese comportamiento, actualiza también el README en el mismo *pull request*. Lo que todavía no funciona (dos personas reales, invitaciones por correo o link) se escribe como «Próximamente».

## Regla: lo publicado se documenta en el mismo trabajo

Desde el 20 de octubre de 2026, **todo cambio publicado en app.lockumi.com tiene que quedar en `master` con la documentación al día, en el mismo trabajo** (mismo *pull request* o mismo merge). Revisa y actualiza lo que corresponda:

- `README.md`, incluida la [guía para jueces](README.md#prueba-el-flujo-en-5-minutos-guía-para-jueces) y la sección [Cambios publicados](README.md#cambios-publicados) (una línea por cambio, con la fecha).
- `CONTRIBUTING.md` (este archivo), si cambia el proceso.
- `PLAN.md` (sección «Estado actual»).
- `docs/` (por ejemplo, [`docs/correo-resend.md`](docs/correo-resend.md)) y `src/legal/LEEME.md` si cambian los textos legales.

Links a los textos legales: si una pantalla nombra una versión («Términos 1.9-demo») o la guarda (casilla, línea de versión del contrato, «ver las reglas» de un alquiler), el link tiene que abrir **esa** versión: usa `rutaTerminos(v)` / `rutaPrivacidad(v)` de `src/legal/documentos.ts`, nunca `/terminos` fijo (con la reputación, `/terminos` es la edición de la cuenta, hoy la 1.12-demo).

**Regla de archivo (Legal, PR #33, 25/10/2026):** una versión publicada no se vuelve a editar nunca y queda en su propia ruta (`/terminos-1-9`, `/terminos-1-10`, …). Para cambiar un texto visible ya publicado:
1. Crea una versión nueva (p. ej. 1.12-demo) en `src/legal/versiones.ts` (`VERSIONES` si es la de un escenario, `EDICIONES_CUENTA` si es la edición de la cuenta) y en `src/legal/version17.ts`, con su fecha.
2. Antes de tocar `src/legal/v17/*.md`, congela lo publicado: copia los `.md` de master a `src/legal/archivo/<commit>/` (byte a byte, mismo blob de git) y arma desde ahí las versiones ya publicadas (`publicada()` en `documentos.ts`).
3. Agrega una prueba que compare el HTML archivado con el publicado (SHA-256, como `src/legal/__tests__/archivo-versiones.test.tsx`) y que cada link abra su versión.
4. Si la versión nueva lleva la fecha del día de la publicación, déjala en un archivo aparte con una guarda de build (como `src/legal/fecha-v111.ts` + `scripts/fecha-1-11.mjs`).

Textos de correos: todos van en `api/_lib/textos-correos.ts` y en la lista de [`docs/correos-c.md`](docs/correos-c.md). Un texto nuevo se marca `legal: 'revisar'` con el comentario «LEGAL: revisar» encima; mientras quede uno, el servidor no envía y el build de producción falla. Para probarlos solo existe `LOCKUMI_CORREOS_BORRADOR=1` en tu máquina (nunca en Vercel) y solo al buzón de prueba `lockumi@mail.grokbot.com`. La guarda (`api/_lib/guarda-correos.ts`) también busca cualquier comentario «LEGAL: revisar» en `src/`, `api/` y `supabase/migrations/`: el build de producción falla mientras quede uno. Formatos: la hora siempre en 12 h con espacio fijo («9:00 a. m.», `horaCR`/`fechaHoraCR` en `api/_lib/plazos.ts`, `fechaHora` en `src/ui.tsx`) y los montos siempre con 2 decimales. Si cambias un texto, corre `node scripts/textos-correos-doc.mjs` para regenerar la sección «Textos» de `docs/correos-c.md`.

Montos de C (Legal 25/10, 6:10 p. m.): los montos del depósito y del reparto van con 2 decimales y suman el depósito; **solo** lo que llega a cada parte y la comisión de Trustless Work van con 4 decimales exactos (`repartoCentimos` y `cuatroDecimales` de `api/_lib/centimos.ts`, `llegaPrueba` en la app). Recordatorios de C: por día calendario de Costa Rica (`lk_dia_cr`), nunca «faltan menos de 24 h».

Nunca pongas valores de secretos en la documentación: solo el nombre de la variable y dónde está (por ejemplo, «Vercel, solo Preview, sensible»).

## Cambios en `/api/solo`: piensa en las pestañas abiertas

Cuando se publica, el servidor cambia al instante, pero una pestaña que ya estaba abierta (por ejemplo, desde que la persona entró con Google) sigue corriendo la versión anterior de la app hasta que se recarga. Por eso:

- Un cambio en `/api/solo` tiene que seguir funcionando con lo que manda la versión anterior, o responder un mensaje que diga qué hacer («recarga esta página y vuelve a tocar «Pagar»»).
- Lo importante (por ejemplo, recargar la cuenta de prueba antes de crear la cuenta segura) va también en el servidor, no solo en el navegador.
- App de Cavos: `VITE_CAVOS_APP_ID` es el único lugar del App ID (no hay valor de respaldo en el código). La app nueva «Lockumi v2» es `cav_14f91c44d57f4290070c0f9705f50164564b` (desarrollo en `.env.example`); producción cambia solo con el OK de Katherine (ver [`docs/firma-cavos.md`](docs/firma-cavos.md)). No cambies `appSalt`.
- Para reproducir con sesión de Cavos sin hacer login real: `scripts/saldo0-login/` (Vite en localhost:5173 con `VITE_CAVOS_APP_ID`, sesión simulada en localStorage tal como la guarda el login y `/api/solo` a una vista previa con `vercel curl`). Ver [`docs/testnet-e2e.md`](docs/testnet-e2e.md#8-saldo-0-con-sesión-de-cavos-20-oct-2026-rama-arreglo-saldo-0-login).

## Contrato plegable (`src/screens/ContratoDoc.tsx`)

El contrato tiene dos partes (publicado el 23 oct 2026):

- **Siempre a la vista:** cabecera (estado y referencia), «El alquiler», «Partes», el botón «Ver contrato completo», el pie y «Descargar o imprimir». La casilla «Leí el contrato y estoy de acuerdo.» y «Firma como inquilino» (`Firma` en `src/screens/Acta.tsx`) no dependen del plegado.
- **Plegado por defecto:** Reglas, El depósito, 7 días para reclamos, Mediación y Firmas. El estado vive en `ContratoDoc` y empieza cerrado cada vez; no lo guardes en localStorage.
- Una sección nueva va dentro de `completo` (plegada) salvo que Producto y Legal pidan que se vea siempre. No cambies textos legales al moverla.
- **La impresión siempre es completa.** «Descargar o imprimir» usa `Documento` con `impresion` (sin botón ni partes ocultas); con el menú del navegador, `@media print` muestra `.cp-completo[hidden]` y oculta el botón, y `beforeprint`/`afterprint` lo abren y lo dejan como estaba. Si tocas esto, corre `src/screens/__tests__/contrato-plegable.test.tsx` y `scripts/contrato-plegable/capturar.mjs` (genera los PDF y los revisa con `pdftotext`).
- **Detalle del alquiler: contrato compacto (rama `contrato-compacto`, sin publicar).** `src/screens/ContratoCompacto.tsx` muestra **una sola variante** según `useEscritorio()` (960 px): tarjeta en la columna (computadora) o barra arriba (teléfono), y un `<dialog>` con `ContratoDoc completo`. No dibujes las dos variantes a la vez (ids repetidos). Si cambias la columna del detalle, corre también `scripts/recorrido/capturar.mjs` (el paso 6 resalta «Los pasos»). Pruebas: `src/screens/__tests__/contrato-compacto.test.tsx` y `scripts/contrato-compacto/capturar.mjs`. Ver [`docs/contrato-compacto.md`](docs/contrato-compacto.md).
- Accesibilidad: `<button type="button">` con `aria-expanded` y `aria-controls`; el bloque es `role="region"` con `hidden`. Letra de 14 px o más, 56 px de alto como mínimo y solo variables de `src/index.css`.

## Estado de espera del pago (`src/espera.ts`, `src/EsperaPago.tsx`)

Publicado el 24 oct 2026. Ver [`docs/estado-espera.md`](docs/estado-espera.md).

- Los pasos (Firmando · Enviando · Guardado) salen del `avance` real de `services/escrow.ts` con `etapaDeAvance()`. **Sin temporizadores.** Si cambias un texto de `avance` del depósito, revisa `etapaDeAvance` y su prueba en `src/__tests__/espera-pago.test.tsx`.
- El terracota (`--accion`) es solo para el botón en reposo. En espera, el botón usa `aria-busy` y `aria-disabled` (no `disabled`) y los tres verdes `--estado-curso-fondo`, `--salvia` y `--exito`, sin colores nuevos.
- Textos nuevos con `// LEGAL: revisar`. No muestres «no se paga dos veces» mientras el código no lo garantice.
- Si lo tocas, corre `scripts/espera-pagar/capturar.mjs` sobre la app construida (`VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173`).

## Avisos después de cada paso (`src/alertas.ts`)

Publicado el 23 oct 2026 (avisos v2). Ver [`docs/alertas.md`](docs/alertas.md).

- **Aviso v2 · toast (publicado el 24 oct 2026):** `avisar()` ya no es una cola: es una **pila de hasta 3** (`MAX_AVISOS`). Cada aviso puede llevar `linea` ({et, texto}, texto de Legal) y `accion` ({texto, etiqueta, ir: 'panel' | 'detalles'}); `irA()` enfoca el botón principal del panel. 8 s con acción, 5 s sin acción; los errores (`tipo: 'error'`) no se esconden solos. Montos solo con `usd()`. Si agregas un título o botón que el aviso no debe tapar, súmalo en `TAPAR_NUNCA` (`src/Alertas.tsx`). Si lo tocas, corre `scripts/aviso-v2/capturar.mjs`, `scripts/espera-pagar/capturar.mjs` y `scripts/alertas/capturar.mjs`. Lo de abajo describe el v2 publicado.
- **No llames a `<Aviso>` directo desde una pantalla.** Usa `avisar(alerta)` (cola: se muestran de a uno). `<Alertas />` va una sola vez en `App.tsx` (con y sin sesión), **justo después de «Saltar al contenido»** para que el aviso sea la 2.ª parada de Tab (ramas `aviso-tab` y `espera-pagar`, pendiente de publicar). No lo muevas al final ni le des foco al aparecer.
- **Los avisos del flujo salen solos:** `Detalle` guarda una `instantanea()` del alquiler y, en cada cambio, `alertaPorCambio(antes, ahora, rol)` decide el aviso (cambio de estado, firma nueva de una parte o plazo adelantado). Así también avisa cuando el dueño de prueba firma solo. Un paso nuevo = un `case` nuevo en `alertaPorCambio` + su prueba en `src/__tests__/alertas.test.tsx` + su captura en `scripts/alertas/capturar.mjs`.
- Cada aviso tiene `titulo`, `hecho` (qué pasó) y `sigue` (qué sigue). El ícono es siempre la casita de Lockumi (`src/LogoAviso.tsx`, tomada del logo oficial); el color sale de `tonoDe(alerta)`: `paso` (miel), `logro` (verde, la llave gira una vez; pasos en `LOGROS`) o `error`. Sin emojis. Los errores usan `tipo: 'error'` (zona `role="alert"`) y siempre dicen cómo seguir; los errores de los pasos siguen en la pantalla (`p.error`).
- **Textos:** español neutro, sin palabras técnicas, sin «liberado» y con «(simulación)» para la persona mediadora. Todo texto con sentido legal lleva `// LEGAL: revisar` y no se cambia sin Legal.
- `Aviso` (`src/Aviso.tsx`, v2): tarjeta pequeña, sin botones ni X. **Se esconde sola a los 5 s** (`DURACION_AVISO`, también en errores); se cierra antes al tocarla, con Enter, Espacio o Esc, y el conteo se pausa con el dedo, el mouse o el foco encima. No es un diálogo y **no roba el foco**: se anuncia desde las zonas fijas de `<Alertas />` (`role="status"` + `aria-live="polite"`, o `role="alert"` en errores). Se enfoca con Tab (nombre «Aviso. Toca para cerrar»; ids con `useId`) y al cerrar el foco vuelve a donde estaba. No pongas enlaces ni botones dentro (tocar la tarjeta la cierra). Un error que solo está en el aviso desaparece a los 5 s: si es importante, muéstralo también en la pantalla (como el error del ingreso en Entrar, `error` en `Login.tsx`, enlazado al botón con `aria-describedby`). Al volver de Google o Apple, `App.tsx` muestra `Entrando` (`aria-busy`) mientras confirma la sesión; no vuelvas a mostrar Entrar en ese momento. En el teléfono se ubica debajo del encabezado, del primer `h1` (o su `.cab`) y de `.entrada-app__titulo`; si quedaría por debajo de la mitad de la pantalla, va al pie. Si agregas un título de pantalla con otra clase, súmala en `lugarEnCelular()`. No uses la clase `.aviso` (ya es la nota amarilla). Si lo tocas, corre `scripts/alertas/capturar.mjs` (revisa zona, que no robe el foco, toque, Esc, pausa + Enter, el cierre solo a los 5 s, que no tape el encabezado ni el título, la casita completa, tamaño y capturas en 390 y 1280 px).
- `[hidden]` y `display`: si una clase pone `display:grid|flex`, agrega `.clase[hidden]{display:none}` (pasó con `.turno`).

## Recorrido guiado (`src/recorrido.ts`, `src/screens/Ejemplo.tsx`)

- Los 6 pasos están en `PASOS_RECORRIDO`: ruta, estado del alquiler de ejemplo, selector y textos. Los textos son los de la maqueta (`diseno/envio/recorrido-formulario/textos.md`); si cambian, cambia también `src/__tests__/recorrido.test.tsx`, que los compara palabra por palabra. Cualquier texto nuevo pasa por Legal: sin promesas, la persona mediadora ayuda y no decide.
- Cada paso apunta a un elemento con `data-recorrido="…"` (`nuevo`, `datos`, `reglas`, `pasos`) o a un selector estable. Si mueves o renombras ese elemento, deja el atributo. Usa un bloque bajo: el globo no debe tapar los botones principales (`elMovil` permite otro selector en el teléfono).
- Los pasos 4 a 6 usan `#/ejemplo`: `Detalle` con `ejemplo`, envuelto en `inert`. No llama a `/api/solo`, no muestra avisos y no guarda nada en «Tus alquileres». No agregues ahí acciones reales.
- «Ya lo vio» se guarda en `localStorage` con la clave `lockumi.recorrido.v1.<huella del correo>` (16 caracteres hex de SHA-256, nunca el correo). Para que todos lo vuelvan a ver, sube `VERSION_RECORRIDO`.
- Los scripts de navegador que pasan por Inicio deben marcarlo como visto en `addInitScript` (ver `scripts/alertas/capturar.mjs`); si no, el recorrido se abre y tapa la pantalla.
- Prueba en navegador: `VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173`, luego `OUT=/tmp/rec/ node scripts/recorrido/capturar.mjs` (teléfono, computadora y movimiento reducido).

## Agregar un estado del alquiler y su color

«Tus alquileres» pinta cada tarjeta según el **grupo** de su estado: `pendiente` (amarillo miel), `curso` (verde salvia), `reclamo` (terracota) o `terminado` (arena). Para agregar un estado:

1. Súmalo a `Estado` y a `ETIQUETA_ESTADO` en `src/types.ts`, y a `turno()` en `src/flujo.ts` (la línea «qué te toca»).
2. Dale su grupo en `GRUPO_ESTADO` y su ícono en `ICONO_ESTADO` (`src/estados.ts`). TypeScript avisa si falta.
3. Agrega el caso a `src/services/__tests__/estados.test.ts`.
4. **No inventes colores.** Los tonos de cada grupo están en las variables `--estado-<grupo>-{fondo,borde,texto,sello}` al final de `src/index.css` y solo reutilizan valores que ya existían más arriba en ese archivo. La prueba falla si aparece un HEX nuevo. Si hace falta un grupo nuevo, usa tonos existentes y revisa el contraste del texto (mínimo 4,5:1).

## Prueba completa por bloques (`docs/prueba-completa.md`, `docs/despliegue.md`)
- Primero el commit de pruebas (`test: …`) y después el de código (`feat: …`).
- Todo lo visible de la 1.7-demo va detrás de `VITE_PRUEBA_COMPLETA` (apagado en producción) hasta el PR 10.
- Textos de Legal con `// LEGAL: revisado (24/10)`; textos propios con `// LEGAL: revisar`.
- Para ver las pantallas nuevas en local: `VITE_TRUSTLESS=1 VITE_PRUEBA_COMPLETA=1 npm run dev`. En pruebas: `vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')`.
- Colores nuevos solo en `src/prueba/prueba.css` (texto café sobre el degradado #FFB08A → #FF6B35; nunca texto blanco sobre naranja). Sin animaciones ni ilustraciones.
- Botones de red: usa `useProceso` de `src/proceso.tsx` (no se toca dos veces, muestra el avance y el error). Los mensajes de acción no cambian.
- Simulador de días: los avisos salen al adelantar el reloj de la demo (`src/prueba/sincronizar.ts`); no hay tareas en el servidor.
- E2E: `npm run e2e` (Playwright, `e2e/*.e2e.ts`; ver `docs/e2e.md`). Los archivos E2E no terminan en `.spec`/`.test` para que vitest no los tome.
- Corrida programada (paso 22): `/api/borrados` corre **cada hora** (`vercel.json`, Vercel Pro). Lo que dependa del día (recordatorios COR-C-02/04/05) va solo en la corrida de las 09:00 UTC (`esRecordatorio`, `HORA_RECORDATORIOS_UTC`), y el bloqueo de un pago (`SEGUNDOS_BLOQUEO_PAGO`) tiene que seguir siendo mayor que `maxDuration`. Cada migración nueva que se aplique en producción lleva su vuelta atrás en `supabase/revert/` con su prueba en PGlite (como `devoluciones-revert-sql.test.ts`). E2E-C contra producción: `docs/correos-c.md`, «Publicación del paso 22».
- Reclamos (PR 5): la lógica va en `src/prueba/reclamos.ts` (funciones puras que se prueban sin pantalla); las acciones primero llaman a la cuenta segura (`escrow`) y después cambian el estado, y usan `paso()` para que un doble toque no repita nada.
- Franja de la red de prueba: su texto es `AVISO_RED` en `src/ui.tsx`; cambiarlo es un cambio visible y necesita el OK de Katherine.

- Montos: con la prueba completa, usa siempre `usd()` (da «N USDC de prueba»); no formatees montos a mano en pantallas nuevas.
- Suscripción y rendimiento (PR 8): la B.8 no lleva casillas (en la demo no se autoriza nada) y la B.13 nunca lleva tasas, porcentajes, montos, fechas, «gana», «Activar», «Avisarme» ni «Próximamente» (lo revisa `suscripcion-rendimiento.test.tsx`).
- Sin marcadores visibles: ningún texto de la app puede tener «[REGIÓN…]», «[PENDIENTE…]», «[CONFIRMAR]», «ABIERTO» ni «[ALGO: …]» (lo revisa `src/prueba/__tests__/sin-marcadores.test.tsx`). Los pendientes van en comentarios `// LEGAL: revisar`.
- Aviso de 5 días y fotos (PR 7): el aviso B.3 sale de `debidos`/`sincronizar` (no se crea a mano) y la fecha y hora de las fotos siempre se muestran en hora de Costa Rica con `fechaHoraCR`; nunca se guarda ni se muestra la ubicación.
- Mediación (PR 6): en la demo no hay persona mediadora; todo reparto va por `acciones.resolverSimulacion` con confirmación (B.14) y nunca da al dueño más de lo reclamado.
- Términos 1.7-demo (paso 16): las reglas nuevas se piden con `reglas17(a)` de `src/prueba/version.ts` (interruptor encendido **y** alquiler en la 1.7-demo), nunca solo con `pruebaCompleta()`; así un alquiler de la 1.6-demo no cambia de reglas. Los textos legales vigentes salen de `docs()`, `terminosActual()` y `privacidadActual()` (`src/legal/documentos.ts`). No uses `Reaceptacion.tsx`.
- Consentimientos (paso 16): cada función que trata datos nuevos pide su casilla sin marcar en el momento de usarla y la registra con `registrarConsentimiento` (`src/prueba/consentimientos.ts`). Datos de la mediación: se borran a los 30 días del cierre (`src/prueba/borrado.ts`, lo aplica `sincronizarTodos`).
- Versiones nuevas de los Términos (escenario C, 25/10): no agregues avisos de «Términos actualizados» ni pantallas de volver a aceptar. Una cuenta nueva acepta la versión vigente en «Entrar»; lo nuevo de cada función va con su casilla (`casillaDeFuncion`, `CasillaVersion`). Lo revisa `src/screens/__tests__/c-sin-aviso-version.test.tsx`.
- Cómo publicar, revisar y volver atrás: `docs/despliegue.md`.

## Reputación (`src/reputacion/`, paso 19, `docs/reputacion.md`)
- Todo va detrás de `VITE_REPUTACION`, siempre con la comparación en línea `import.meta.env.VITE_REPUTACION === '1'` (así el código apagado no entra en el build). Las pantallas se cargan en diferido desde `App.tsx`.
- La fuente única de los textos es `legal/reputacion-textos-para-producto.md` (REP-01 a REP-15), copiados al pie de la letra en `src/reputacion/textos.ts`. Textos propios con `// LEGAL: revisar`.
- Encender y volver atrás: `docs/reputacion.md` («Encendido»). La fecha de los textos es UNA constante (`src/legal/fecha-reputacion.ts`), no una variable de entorno.
- Volver con la llave de acceso con el correo por confirmar: el token de Cavos que sirve para `/api/verificar-correo` es de 5 minutos y un solo uso; la app no manda uno viejo y recuerda (55 min, sin token ni código) el correo por confirmar para volver a «Revisa tu correo» (`src/services/sesionCavos.ts`, `src/reputacion/verificacion.ts`, `docs/reputacion.md`).
- Recargar la página con el mismo token de Cavos (menos de 6 minutos): `asegurarCorreo` no vuelve a mandar un token que el servidor ya recibió (huella SHA-256 en `localStorage`, `lockumi.cavos.token-enviado`, 7 min; nunca el token; fallo de red = se reintenta). Si cambias esto, mantén `volver-por-confirmar.test.ts`.
- Sesión restaurada sin el correo confirmado (PR #61): sin token que sirva y sin la marca de 55 minutos, `asegurarCorreo` pregunta a `lk_necesita_rep01` (ya existente; la app no puede leer `lk_correos_verificados`). Solo el `28000` (403, `ErrorServidor.codigo`) muestra «Revisa tu correo»; red u otro error no muestran nada. No agregues textos ni una pantalla nueva: es la misma. Prueba: `src/reputacion/__tests__/sesion-sin-correo.test.tsx`.
- «Lista ✓» de «Tu cuenta para el depósito» (`src/screens/Billetera.tsx`): no se muestra por tener dirección; solo con la cuenta ya creada en Horizon (no 404) y, con Trustless Work, con la trustline de USDC (`cuentaLista` en `src/services/billetera.ts`). Antes sale «Preparando tu cuenta…» (texto ya existente; no inventes otro). Si cambias esto, mantén `src/screens/__tests__/billetera-lista.test.tsx`.
- No se toca el login ni Cavos: desde la 1.13-demo solo cambia el texto de la casilla de los Términos (`casillaTerminos()`; hoy nombra la 1.14-demo); al entrar con la edición vigente (1.14-demo), `Pantallas.tsx` registra el perfil (`aceptarRep01` + `subirAceptacion`). Sin pantalla previa.
- Reglas del puntaje solo en `src/reputacion/puntaje.ts` (funciones puras): 90 % antes del 0,3 %, 10 años, siempre visible desde el 3.er alquiler, «En revisión».
- Estilos solo en `src/reputacion/reputacion.css` (clases `.rp-*`), sin casitas ni ilustraciones, nunca texto blanco sobre naranja. La tarjeta de bloqueo usa solo `glass tarjeta` y `boton`.
- Nunca: rankings, números de posición, filtros por puntaje, barrio, distancia, «verificado», «Llave de Oro» (es «Llave Lockumi»), ni un botón para ocultar el perfil.
- Pruebas: `src/reputacion/__tests__/` (apagado = mismas pantallas, con instantáneas), SQL con PGlite y E2E con dos cuentas solo en local (`e2e/pruebas/reputacion.e2e.ts`).
- Pruebas SQL con PGlite que escriben en `lk_correos_verificados`: el preludio crea `auth.users` y la prueba inserta antes la sesión (la tabla la referencia desde `20261025140000`). Código nuevo que llama a la reputación desde fuera de `src/reputacion/` (p. ej. `asegurarCorreo` en `Invitacion.tsx`): import diferido detrás de `import.meta.env.VITE_REPUTACION === '1'`.
- Segundo factor (`src/reputacion/segundo-factor.ts`, `api/_lib/codigo-correo.ts`, sección 7 de la migración): el código NUNCA se guarda ni se registra en la consola; solo su HMAC con `LOCKUMI_CODIGO_PEPPER` y sal. Comparar huellas solo con `mismaHuella` (tiempo constante), nunca con `===`. Una acción nueva que borre o entregue datos de la persona debe llamar a `lk_usar_codigo` en la base, no solo pedir el código en la pantalla. Correos de prueba reales: solo a lockumi@mail.grokbot.com.

## Firma del servidor en testnet (`api/_lib/tw.ts`, `docs/firma-servidor.md`)

- Opción A (`docs/firma-cavos.md`): toda acción que mueve la cuenta segura exige `exigirPrueba` (prueba de Cavos revisada en el servidor, nonce de un solo uso). No agregues acciones nuevas sin ella.
- Activación de cuentas (`api/_lib/activacion.ts`, `docs/fondeo-testnet.md`): como `activate.ts` de Meteorito, la plataforma solo patrocina reservas y la persona firma su trustline con Cavos. **Friendbot no existe en este repo** (ni en dos personas, ni en la demo de una persona, ni en los scripts, ni en las cuentas del servidor del #54): las cuentas de testnet que firman su propia transacción las crea la tesorería con `crearCuentaDesdeTesoreria` (`createAccount`, 5 XLM; en scripts, `scripts/crear-cuenta-testnet.mjs`). No guardes llaves de personas en el flujo de dos personas y no agregues rutas especiales para cuentas viejas. `activar-cuenta` es solo testnet y exige la prueba de Cavos en `preparar`.
- La llave derivada (PR #54) queda solo para alquileres de antes (`llaveLegado`); nunca sale del servidor. No la uses para alquileres nuevos.
- El ramp es una SIMULACIÓN TESTNET: se cambia solo en `rampActivo` (`api/_lib/rampSimulado.ts`) y no quites `exigirRampTestnet`.
- Vite no incluye Buffer; no quitar `src/polyfills.ts` ni dejar que otra importación vaya antes que él en `src/main.tsx`: el kit de Cavos usa el `Buffer` global y sin él la entrada falla con «No pudimos abrir tu cuenta» (`ReferenceError: Buffer is not defined`; `docs/firma-cavos.md`).
- Un solo `signMessage`, en `src/services/billetera.ts` (lo vigila `cavos-sin-firma-silenciosa.test.ts`).
- Toda cuenta nueva lleva llave de acceso (passkey): usa `asegurarLlave` / `recuperarConLlave` de `src/services/llave.ts` (la creación se lanza sola al entrar y el vault de Cavos pone el gesto; el reintento es un toque de la persona); no copies esa lógica ni abras `Cavos.connect` con `passkeyPrf` en otro lado (solo `billetera.ts`). Textos en `TEXTOS_LLAVE`, sin palabras técnicas.
- Eliminar antes del pago: el servidor tiene que leer el saldo en la red, no solo el estado de la base.

## Proponer cambios

1. Abre un *issue* con el problema o la idea, o comenta en uno existente.
2. Crea una rama desde `master` con un nombre corto y descriptivo, por ejemplo `fix-login-correo` o `docs-guia`.
3. Haz commits pequeños con mensajes en español que digan qué cambia y por qué.
4. Abre un *pull request* contra `master`. Explica qué cambiaste, cómo lo probaste y, si cambia la interfaz, agrega una captura.
5. El CI (`.github/workflows/ci.yml`) tiene que pasar antes del merge.

## Correr tests y lint

Con Node.js 22:

```bash
npm ci
npm run lint    # Oxlint
npm test        # Vitest (vitest run)
npm run build   # TypeScript + Vite
```

Para probar el flujo de la red de prueba en local hacen falta las variables del servidor (ver la tabla del README); sin ellas, la app corre como demo local con el escrow simulado. `VITE_FLUJO=solo` activa el flujo mínimo anterior de 5 pasos.

Si agregas lógica nueva, agrega su prueba en `src/**/__tests__/`.

## No subas secretos

- Copia `.env.example` a `.env` y pon ahí tus valores. `.env`, `.env.local` y `.env.*.local` están en `.gitignore`.
- Nunca subas llaves de API, claves secretas de Stellar (`S…`) ni claves de servicio de Supabase.
- Las variables con prefijo `VITE_` terminan en el bundle del navegador: solo pueden ser públicas. Las secretas van sin prefijo y solo en el servidor.
- Si subiste un secreto por error, avísanos y rótalo; borrarlo del historial no basta.

## Estilo de código

- TypeScript (el build corre `tsc -b`) y componentes de React con funciones y hooks.
- Nombres, textos de la interfaz y comentarios en español neutro.
- Sigue el estilo de los archivos vecinos: funciones cortas, sin dependencias nuevas si no hacen falta.
- `npm run lint` no debe dar errores.
- Los textos legales de `src/legal/` no se editan a mano: se reemplazan como indica `src/legal/LEEME.md`. Hoy: Términos 1.6-demo (24 oct 2026, rama `contrato-compacto`, sin publicar) y Aviso de privacidad 1.5-demo.
- Todo texto nuevo con implicación legal (fuera de `src/legal/`) lleva el comentario `// LEGAL: revisar` y se lista en el *pull request* para que Legal lo revise.
