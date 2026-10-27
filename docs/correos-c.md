# Correos del escenario C (COR-C-00 a COR-C-09)

PR #22, rama `paso17-escenario-c`. Todos los correos de C los envía **el servidor**: el navegador no elige textos, destinatarios ni momentos. Los textos son de Legal (`legal/correos-escenario-c.md`, borrador del 25/10/2026, 4:12 p. m.) y siguen marcados **«LEGAL: revisar»** hasta que Legal los confirme. **Nada se enciende con este PR.**

## Regla dura: ningún «LEGAL: revisar» sale en un correo real

| Dónde | Qué pasa con alguna marca pendiente | Prueba |
|---|---|---|
| Envío (`revisarTextos` en `api/_lib/correos-c.ts`) | 503 y no se llama a Resend: ni `procesarCorreos` (avisos, corrida diaria, `/api/tw`) ni `enviarCorreoCuenta` | `correos-c-envio.test.ts`, `correos-c-api.test.ts` |
| Build de producción (`guardaCorreos` en `vite.config.ts`) | Con `VERCEL_ENV=production`, `vite build` falla y lista las plantillas pendientes **y cualquier otra marca «LEGAL: revisar» visible** en `src/`, `api/` y `supabase/migrations/` (comentarios `//`, `{/* */}`, `<!-- -->`, `--`; Legal 25/10, 5:09 p. m., punto 10). Preview y local sí construyen | `correos-c-envio.test.ts`, `guarda-marcas.test.ts` |
| Excepción local para el E2E | `LOCKUMI_CORREOS_BORRADOR=1` **solo** fuera de Vercel (`VERCEL` vacío) y nunca con `VERCEL_ENV=production`; además solo envía a `lockumi(+etiqueta)@mail.grokbot.com` | `borradorPermitido` en los tests |

Para aprobar un texto: en `api/_lib/textos-correos.ts` se cambia `legal: 'revisar'` por `legal: 'revisado'` y el comentario de arriba por «LEGAL: revisado (fecha)». Un test exige que comentario y campo coincidan.

**Ojo al publicar:** mientras quede una marca, el build de producción de Vercel falla a propósito. Antes de llevar esto a master, Legal tiene que confirmar lo que queda (25/10, 5:09 p. m.): COR-C-02/d4, COR-C-02/d6, COR-C-04/d6, COR-C-06/partes, la página del enlace de COR-C-03, la Privacidad 1.9-demo (`privacidad.md:71`) y las marcas de las migraciones 20261025010000 y 20261025020000. `node scripts/textos-correos-doc.mjs` regenera la sección «Textos» de este archivo.

## Diseño

- **Un solo archivo de textos:** `api/_lib/textos-correos.ts` (C y los pies y notas comunes; `api/_lib/correo.ts` los reexporta para B).
- **Mismo diseño que la invitación (COR-C-00):** barra con el degradado #E8531F → #FFB08A, logo (`https://app.lockumi.com/icon-192.png`) y «Lockumi», fondo crema #FFF5EE, texto café #3D2A22, botones naranja #FF6B35. Sin ilustraciones ni contenido comercial. Remitente `Lockumi <invitaciones@lockumi.com>`.
- **Consentimiento en el servidor:** la casilla «Acepto que Lockumi me envíe avisos por correo» (AvisosCorreo, alquileres con otra persona) llama a `lk_guardar_consentimiento_correo`: guarda quién (sesión), papel (sale del servidor), correo, texto y hora. Desmarcarla borra la fila y el servidor deja de enviar. COR-C-08 y COR-C-09 son correos de servicio: salen sin casilla.
- **Una vez por evento:** cada correo tiene una clave (`COR-C-0x:<alquiler>:<papel>[:variante]`). `lk_correo_reservar` la reserva antes de llamar a Resend (que además recibe la misma clave como `Idempotency-Key`), y `lk_correo_marcar` la deja `enviado` o `fallido`. Un fallo se reintenta en la próxima pasada; una reserva `enviando` de más de 15 minutos también.
- **Registro:** `lk_correos_enviados` (clave, correo, papel, destinatario, estado, id de Resend, horas). Solo la clave de servicio la lee.
- **Sin disparadores en la base:** el servidor calcula lo pendiente con `lk_correos_pendientes(alquiler, ahora)` en tres momentos:
  1. después de cada paso en la app (`POST /api/correo { tipo: 'avisos', alquiler }`, solo una persona del alquiler);
  2. después de pagar en `/api/tw` (enviar, liberar, devolver-automatico, repartir);
  3. en la corrida `/api/borrados` (cron de `vercel.json`, con `CRON_SECRET`; **cada hora** desde el paso 22, publicado el 25/10/2026; los recordatorios por día solo en la de las 09:00 UTC = 3:00 a. m. de Costa Rica): recordatorios y vencimiento de la mediación. Desde el paso 22, la corrida **paga primero** las devoluciones sin reclamo y después manda los correos, así que COR-C-07 sale en la misma corrida (ver abajo).
- **Vencimiento de la mediación, con o sin `CORREOS_C`** (Legal 25/10, 5:09 p. m., punto 3): `vencerMediaciones` (`api/_lib/correos-c.ts`) corre aparte de los correos: en la corrida diaria (siempre), después de cada acción con un alquiler en `/api/tw` y en cada aviso de la app (`tipo: 'avisos'`, después de revisar la sesión y que la persona participa). Legal pidió cada hora: ~~Vercel Hobby solo permite un cron diario~~ resuelto con Vercel Pro (paso 22, 25/10/2026): la corrida es **cada hora** (`0 * * * *`), además de la revisión en cada paso.
- **Reloj de prueba:** `ahora` solo lo pasa el E2E (no es un parámetro HTTP).

### Interruptores (encendidos en app.lockumi.com el 25/10/2026, 7:04 p. m. CR)

**C encendido en app.lockumi.com (25/10/2026, 7:04 p. m. CR).** Variables de Vercel Production del proyecto lockumi-app-demo (solo nombres): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DOS_PERSONAS=1`, `VITE_CORREOS=1`, `LOCKUMI_DOS_PERSONAS=1`, `CORREOS_C=1`, `CORREO_MEDIACION` (al encender, el buzón de prueba `lockumi@mail.grokbot.com`; desde el 25/10/2026, Production usa `business.applockumi@gmail.com`, decidido por Katherine el 25/10/2026) y `CRON_SECRET` (rotado a un valor aleatorio nuevo a las 7:03 p. m.; el anterior era «sensible» y no se podía leer). `RESEND_API_KEY` ya existía y no se tocó; ninguna otra variable cambió. Deploy `dpl_FuydsVHksKbrTRNmPcQTFDyDbKjr` (vuelve a desplegar `dpl_7znx5gexZooekP23bt8DvLGVswYY`, commit fb4f178), READY a las 7:04 p. m. CR. Para apagar los correos: quitar `CORREOS_C` y volver a desplegar (el vencimiento de la mediación sigue corriendo).


| Variable | Dónde | Qué hace |
|---|---|---|
| `VITE_CORREOS=1` | build | Muestra la casilla. (El aviso al servidor después de cada paso sale siempre en los alquileres con otra persona, para revisar el plazo de la mediación; sin `CORREOS_C=1` no envía nada) |
| `CORREOS_C=1` | servidor | Sin esto, `procesarCorreos` no hace nada (`{ apagado: true }`). El vencimiento de la mediación corre igual |
| `CORREO_MEDIACION` | servidor | Correo de la persona mediadora (versión separada de COR-C-05 y COR-C-06). Sin él, esa versión se omite. En Production: `business.applockumi@gmail.com` (decidido por Katherine el 25/10/2026); en el E2E local, el buzón de prueba |
| `CORREOS_ORIGEN` | servidor | Origen de los enlaces (por defecto `https://app.lockumi.com`; solo orígenes permitidos) |
| `CORREOS_SOLO_BUZON=1` | servidor | Solo envía al buzón de prueba |
| `LOCKUMI_CORREOS_BORRADOR=1` | local | Excepción del E2E (ver arriba). No funciona en Vercel |

## Botón de la invitación (COR-C-00), paso 21
El botón lleva a `<origen>/#/invitacion/<alquiler>/<token>` (`enlaceInvitacion` en `api/_lib/correo.ts`); antes llevaba a la raíz de la app y la persona invitada no veía la invitación. El servidor solo envía si el token es el link vigente del alquiler. Ver [`invitacion-enlace.md`](invitacion-enlace.md).

## Paso 22 · La corrida (cada hora) paga la devolución sin reclamo (publicado el 25/10/2026, 11:31 p. m. CR; ver «Publicación del paso 22»)

Términos 5.3 d): si el dueño no reclama en su plazo, el 100 % vuelve al inquilino **aunque nadie abra el alquiler**. Antes la corrida solo cerraba el caso (`lk_vencimientos`) y el pago lo disparaba la app al abrirlo (`src/acciones.ts:216-227`). Ahora `/api/borrados` (`api/_lib/borrados.ts`) llama a `pagarDevoluciones` (`api/_lib/devoluciones.ts`) **después** de `lk_vencimientos` y del vencimiento de la mediación y **antes** de los correos:

- **Qué paga:** `lk_devoluciones_pendientes` (migración `20261026000000_devolucion_automatica.sql`): `cerrado` con `via` `automatico` (venció el plazo) o `devuelto` (el dueño aprobó y la liberación no llegó a la red), con escrow, sin `liquidacion_tx`, sin reclamo, sin marca de revisión y sin nadie pagándolo. Los más viejos primero. Nunca acuerdo, mediación ni casos abiertos.
- **Cómo paga:** igual que la app (`modoDevolucion`): con la aprobación del dueño en la cadena → `release-funds` (firma la plataforma); sin ella → `dispute-escrow` (plataforma) + `resolve-dispute` con el 100 % al inquilino (mediadora). Un solo camino para la app y la corrida: `devolverAlInquilino` (`api/_lib/tw.ts`).
- **Nunca dos veces:** `lk_tomar_pago` (bloqueo atómico de 5 min con un token por pedido; la función de Vercel dura 60 s como máximo). Antes de pagar se lee el escrow en Trustless Work (`get-escrow-by-contract-ids`, validado en la cadena): cuentas (inquilino, plataforma, mediadora), saldo = depósito y banderas. El hash firmado se guarda **antes** de enviarlo (`lk_anotar_pago_pendiente`): si la red lo acepta y el servidor se corta, el próximo intento lo confirma en Horizon y solo lo anota. Si la disputa ya estaba abierta (reintento), solo se resuelve. Si el escrow ya está pagado sin que tengamos el hash, o no cuadra, **no se paga**: queda `pago_revisar` y lo mira una persona.
- **La app durante la corrida:** si la corrida tiene el caso tomado, `/api/tw` responde `{ enCurso: true }` sin error (la app ya ignora una respuesta sin `tx`); al volver a abrirlo ve el pago hecho. Nada cambia en pantalla.
- **Fallas:** un caso que falla no frena a los demás. El error queda en `pago_error` (300 caracteres, sin llaves: `sinSecretos`) y en el registro de Vercel como `[devoluciones] <alquiler> …`. Si no se envió nada, se reintenta en la próxima corrida; si ya se envió algo, espera a que venza el bloqueo (5 min).
- **Por corrida:** de a uno (las transacciones salen de la misma cuenta de la plataforma), hasta `DEVOLUCIONES_POR_CORRIDA` casos (5; tope 20) y sin empezar uno nuevo después de `DEVOLUCIONES_SEGUNDOS` (30 s desde el inicio de la corrida; `maxDuration` es 60 s). Lo que no entra queda para la próxima corrida (`sinTiempo` lo cuenta). Una devolución automática son dos transacciones con confirmación en testnet (unos segundos cada una), así que en 30 s pueden entrar menos de 5 casos.
- **Apagar:** `DEVOLUCION_CRON=0` (los vencimientos, borrados y correos siguen).
- **Texto nuevo (Legal: OK tal cual, 25/10/2026 11:15 p. m. CR; marca quitada):** `TEXTO_REVISAR_PAGO` en `api/_lib/tw.ts` («No pudimos confirmar el estado del depósito en la red de prueba, así que no se pagó nada. Escríbenos a business.applockumi@gmail.com y lo revisamos.»). Solo se ve si el escrow no cuadra o ya se pagó sin el hash (no debería pasar). Ya no queda ninguna marca «LEGAL: revisar» en el repositorio (`guarda-marcas.test.ts`, `c-lista-marcas.test.tsx`) y el build de producción pasa. Términos 6.5 a), 5.3 d) y `ContratoDoc.tsx:49` no cambian. El historial usa los textos ya aprobados («Devolución automática: …» y «Se liberó el depósito al inquilino …»). La respuesta 503 «Falta configurar en el servidor: … (migración 20261026000000).» sigue el patrón ya aprobado.

| Variable | Dónde | Qué hace |
|---|---|---|
| `DEVOLUCION_CRON=0` | servidor | Apaga el pago en la corrida. Sin definir: encendido |
| `DEVOLUCIONES_POR_CORRIDA` | servidor | Casos por corrida (5 por defecto, 1 a 20) |
| `DEVOLUCIONES_SEGUNDOS` | servidor | No empieza un caso nuevo después de estos segundos desde el inicio de la corrida (30 por defecto) |

**Orden para publicar:** 1) aplicar `20261026000000_devolucion_automatica.sql` (sin ella, «liberar» y «devolver-automatico» responden 503 y la corrida no paga nada); 2) **antes del primer despliegue**, revisar `select c.id, c.creado_en, c.resultado from lk_contratos c where c.id in (select lk_devoluciones_pendientes(50));` en el SQL Editor: la primera corrida pagaría **todos** esos casos (incluidos alquileres viejos de prueba sin pagar). Si hay casos que no se deben pagar, desplegar con `DEVOLUCION_CRON=0` y decidir antes; 3) ~~quitar la marca «LEGAL: revisar»~~ (hecho: OK de Legal 25/10, 11:15 p. m.); 4) desplegar. Volver atrás: `supabase/revert/20261026000000_devolucion_automatica_revert.sql` (después de apagar o revertir el código; ver «Publicación»).

**Cada hora (Vercel Pro, 25/10/2026):** `vercel.json` → `"schedule": "0 * * * *"`. La devolución llega ≤1 h después del vencimiento (Vercel no garantiza el minuto dentro de la hora), un fallo se reintenta en una hora y la mediación vence a tiempo (Legal pidió cada hora). `maxDuration` sigue en 60 s; el bloqueo (300 s, `SEGUNDOS_BLOQUEO_PAGO`) tiene que seguir siendo mayor (lo revisan `devoluciones-cron.test.ts` y `borrados-api.test.ts`). **Los recordatorios por día** (COR-C-02 y COR-C-04 «d6»/«d4», COR-C-05 «recordatorio») siguen saliendo solo en la corrida de las 09:00 UTC (3:00 a. m. CR, `HORA_RECORDATORIOS_UTC`), como con la corrida diaria; los avisos de un hecho (COR-C-05/06/07…) salen en la primera corrida (`esRecordatorio`, `correos-c-api.test.ts`).

**Pruebas:** `src/servidor/__tests__/devoluciones-cron.test.ts` (12: no paga dos veces con dos corridas y la app a la vez, reintento, corte después de la disputa, pago que entró sin respuesta, un caso que falla no frena a los demás, solo vencidos sin reclamo, revisar, tope y tiempo, apagado, sin secretos, bloqueo > maxDuration), `devoluciones-sql.test.ts` (5, PGlite: la migración) `devoluciones-revert-sql.test.ts` (el revert quita solo lo que agrega la migración) y `scripts/e2e-c.mjs` (casos `cron-auto`, `cron-liberar`, `cron-doble`; con `--simulado` y con `--red`; con `--real --app <app>` y `CRON_SECRET`, `cron-auto` y `cron-doble` contra la corrida de la app publicada). Con la reputación encendida (producción y `--simulado`), cada sesión de prueba verifica su correo y acepta REP-01 antes de crear o unirse.

**Corrida en la red de prueba de verdad** (`e2e-c.mjs --red`, 25/10/2026, 11:07 p. m. CR; base en memoria con la migración, Trustless Work testnet real, plataforma y mediadora desechables):

| Caso | Qué pasó | Pago (stellar.expert, testnet) |
|---|---|---|
| cron-auto | Vence el plazo del dueño y nadie abre el alquiler: la corrida cierra (`lk_vencimientos`), abre la disputa (plataforma) y la resuelve (mediadora) con el 100 % al inquilino | https://stellar.expert/explorer/testnet/tx/adef36fc6ccbd23823d2468ab6a3228cf45771b53d35911730da80142f7f8fdd |
| cron-liberar | El dueño aprueba ([tx](https://stellar.expert/explorer/testnet/tx/b6e20ff0cae5cac326a7daf102cf24dab7f149289fdbc941cee8d89f5ccdd70f)), la liberación falla (falla inyectada), queda «devuelto» sin pagar; la corrida libera con `release-funds` | https://stellar.expert/explorer/testnet/tx/90e46cba064cbdafcbc611e53b381ccb39b63782f8631be8aae2bbb74ee7e757 |
| cron-doble | La app pide «devolver-automatico» mientras la corrida tiene el caso tomado: la app ve «en curso» y se paga una sola vez (1 disputa, 1 resolución) | https://stellar.expert/explorer/testnet/tx/dde2efdfb18b28503b1183283cac10f6e59061b15eca2d8d2c56a45730b0e323 |

Después: otra corrida no pide nada a Trustless Work (`pendientes: 0`); la app ve el pago hecho (mismo hash); `get-escrow-by-contract-ids` (validateOnChain) muestra los tres escrows resueltos/liberados y con saldo 0; Horizon, las tres transacciones `successful`; COR-C-07 a las dos partes de cada caso, enviado por la misma corrida (Resend simulado, solo al buzón de prueba). 160 pasos, 0 fallas, 227 s. Ninguna llave en el registro ni en el informe (revisado).

## «Plazo de devolución» plegado en la invitación y en el alquiler (OK de Katherine a la hoja `linea-plazo-v2`, 26/10/2026 12:44 a. m. CR) · respaldo con el 0,3 % (Legal, 26/10 12:58 a. m.)

Debajo de la línea del 0,3 % (franja del aviso de la red, solo en la invitación y en la vista del alquiler) hay un plegable chico **cerrado al entrar**, «Plazo de devolución», con el mismo componente que «Reglas del alquiler» (`src/screens/Plegable.tsx`, clases `.cp-abrir`, en chico con `.plegable--plazo` en `src/index.css`). Texto de Legal (`src/ui.tsx`, `TEXTO_PLAZO_DEVOLUCION`):

> El dueño tiene 7 días para revisar la casa y reclamar, desde que toca «Recibí la casa» o, si no lo toca, desde 2 días después de la entrega. Si el último día cae en domingo o feriado, el plazo pasa al siguiente día hábil. Si no reclama a tiempo, el depósito se devuelve solo al inquilino, menos el 0,3 % de comisión de Trustless Work.

Respaldo de Legal: «solo» se muestra **únicamente** si la corrida paga (`DEVOLUCION_CRON` distinto de `0`). Con `DEVOLUCION_CRON=0` la línea termina «…Si no reclama a tiempo, el inquilino recibe su depósito de vuelta, menos el 0,3 % de comisión de Trustless Work, cuando cualquiera de los dos abre el alquiler.» (`TEXTO_PLAZO_DEVOLUCION_SIN_CORRIDA`).

Cómo lo sabe el navegador sin secretos: `GET /api/config` (`api/config.ts` → `api/_lib/config-publica.ts`) responde solo `{ "devolucionAutomatica": true | false }`, calculado con la **misma** función que usa la corrida (`devolucionAutomaticaEncendida`, `api/_lib/devoluciones.ts`), así que no hay una variable `VITE_` que se pueda desincronizar. Caché de 60 s (cambiar la variable en Vercel exige redesplegar igual). Si la llamada falla o todavía no respondió, se muestra el texto **sin** «solo». Pruebas: `src/prueba/__tests__/paso21-invitacion.test.tsx` («plazo de devolución plegado»).

## Publicación del paso 22 (25/10/2026, hora de Costa Rica)

Con el OK de Katherine (10:39 p. m.) y el de Legal a `TEXTO_REVISAR_PAGO` (11:15 p. m., sin cambios; la marca se quitó). Los Términos 6.5 a, 5.3 d y `ContratoDoc.tsx:49` no cambiaron.

| Qué | Resultado |
|---|---|
| Migración `20261026000000_devolucion_automatica.sql` | Aplicada a las **11:28 p. m.** (Management API, una transacción con su fila en `supabase_migrations.schema_migrations`). Verificado: 6 columnas nuevas en `lk_contratos`, 4 funciones `security definer` solo para `service_role` |
| Revisión antes de unir | `lk_devoluciones_pendientes(50)` → **0 casos** (los 7 alquileres reales están en «firmas», sin cuenta segura): `DEVOLUCION_CRON` sin definir (encendido) |
| PR #32 | CI en verde; merge `1f5c6e500958ee37ab645c1213e60e6c1bd4f69d` (Lockumi) |
| Deploy | `dpl_9jMgfF88ThA3uoB3PBwqHmntksnR`, READY **11:31 p. m.** en app.lockumi.com; Vercel muestra `/api/borrados` con `0 * * * *` |
| Corrida manual (11:31 p. m.) | `GET /api/borrados` con `CRON_SECRET` → 200, `devoluciones: pendientes 0, pagados []`, sin fallas ni «revisar»; sin la clave → 401 |
| E2E-C de producción (11:38–11:43 p. m.) | **151 pasos, 0 fallas, 1 omitido** (`cron-liberar`: con `--app` no se puede forzar la falla; cubierto en `--simulado` y `--red`) |
| App | `/`, `/terminos`, `/privacidad`, `/reputacion`, `/unirse` → 200; `paso21-produccion.mjs` todo OK (invitación v3 y REP-01 intactos) |
| Waitlist | Igual antes y después: 2 filas `3b7472599f6777f360aa2f9dd7832386`; `waitlist_intentos` 1 fila `8a0f91b5d81476b2f6ed8554b32449ac` |

Pagos de la corrida publicada en el E2E-C (testnet, 2 USDC cada uno, 100 % al inquilino):

| Caso | Qué pasó | Pago |
|---|---|---|
| cron-auto | Vence el plazo del dueño y nadie abre el alquiler: `GET https://app.lockumi.com/api/borrados` cierra y paga | https://stellar.expert/explorer/testnet/tx/c70ec52db2ac9c8bfcd1d27f25835695e127b0445894d022ddd84b3c093f8f4c |
| cron-doble | La corrida y la app (`POST /api/tw devolver-automatico`, 800 ms después) a la vez: pagó la corrida, la app vio «en curso»; un solo evento con el hash | https://stellar.expert/explorer/testnet/tx/00c9d9b6834883b1692c9415810fcddb92f46cda86cfdadce8c601cd447dfcf8 |

Después: otra corrida no paga nada (`pendientes: 0`); la app ve el pago hecho con el mismo hash; Trustless Work muestra las dos cuentas seguras resueltas y con saldo 0; Horizon, `successful`; COR-C-07 a las dos partes (solo al buzón `lockumi+e2ec-…@mail.grokbot.com`). Una primera corrida (11:33–11:37 p. m.) tuvo 4 fallas que no eran del código: dos «timeout» de Stellar al desplegar en testnet y dos del propio script (contaba otra vez los COR-C-07 ya revisados); arreglado en `scripts/e2e-c.mjs`. Sus dos pagos de la corrida publicada también salieron bien ([dd63f0c9…](https://stellar.expert/explorer/testnet/tx/dd63f0c91d77aa4197ad698913f1272d6f28b8ecaa9467956005819d7711c30a), [72d47f0a…](https://stellar.expert/explorer/testnet/tx/72d47f0a0cdbe377972a0b67a309b01ffe811bbf45fdbe5b3b83e535dc3f9e41)).

**Cómo correrlo** (llaves como en `prueba-completa/correr-c.sh` más `CRON_SECRET`; con Node 20, `NODE_OPTIONS=--experimental-websocket`): `node scripts/e2e-c.mjs --real --correos --app https://app.lockumi.com`, después `node scripts/e2e-c.mjs --real --limpiar` (alquileres «E2E-C …», mediadora y correos de prueba). Las tablas de correo verificado y REP-01 no dan permisos a `service_role` por la API: `--limpiar` lo avisa y se borran con SQL junto con las cuentas anónimas de prueba (`delete from public.<tabla> where usuario in (…)` en las 17 tablas `lk_*` con `usuario` y `delete from auth.users where id in (…)`, solo los ids creados por la corrida). El 25/10 se borraron 14 alquileres y 9 cuentas de prueba.

**Volver atrás (en este orden):**
1. Código: `git revert -m 1 1f5c6e500958ee37ab645c1213e60e6c1bd4f69d` en `master` y push (Vercel redespliega), o solo apagar el pago con `DEVOLUCION_CRON=0` en Vercel Production y redesplegar.
2. Base, después del paso 1: `supabase/revert/20261026000000_devolucion_automatica_revert.sql` (una transacción: quita las 4 funciones, las 6 columnas y su fila de `schema_migrations`), por el SQL Editor o la Management API.

## Base de datos: `supabase/migrations/20261025090000_c_correos.sql`

Solo agrega (3 tablas y 9 funciones nuevas, permisos y RLS de esas tablas). No cambia ni borra nada existente; el test `c-correos-sql.test.ts` lo comprueba (huella de las tablas `lk_*` y de `waitlist*` antes y después, nombres nuevos, sin `drop`/`alter`/`truncate` de tablas existentes, sin DML fuera de funciones).

- Tablas: `lk_correos_consentimiento` (RLS: cada persona ve solo su casilla), `lk_correos_enviados`, `lk_mediacion_plazos` (solo servicio).
- Funciones: `lk_sumar_habiles`, `lk_guardar_consentimiento_correo` (authenticated), `lk_mediacion_vencimientos`, `lk_correos_por_estado`, `lk_correos_pendientes`, `lk_correo_reservar`, `lk_correo_marcar`, `lk_correo_abierto`, `lk_correo_cuenta_registrado` (solo service_role).
- Aplicada en producción (sddgjnuvxzkrhhuczuly) el 25/10/2026, 4:25 p. m. (hora de Costa Rica), y vuelta a aplicar a las 4:31 p. m. (corrección del día 4/6). `lk_correos_por_estado` quedó reemplazada por `20261025100000_c_recordatorios_hacia_atras.sql` (abajo). `waitlist` (2 filas) y `waitlist_intentos` (1 fila) quedaron iguales (misma huella md5 antes y después).

## Estado de la ronda de Legal 25/10 (5:00 y 5:09 p. m.)

Prioridad del Coordinador (5:29 p. m.): primero lo que cambia el funcionamiento. Todo quedó en esta misma ronda (commit 0498407 y siguiente):

- **Funcionamiento:** recordatorios hacia atrás (abajo, aplicado en producción); vencimiento de la mediación con `CORREOS_C` apagado (arriba, «Cuándo se envían»); en C no hay «propuesta automática» en ningún correo ni pantalla (prueba en `src/prueba/__tests__/c-textos-legal.test.tsx`).
- **Textos de las 5:00 p. m.:** línea del plazo de la mediación (P-05), «solicitud» en la Privacidad, «el dueño» en COR-C-00.
- **Segunda parte (ya hecha, se puede revisar aparte):** hora en 12 h y montos con 2 decimales; guarda de todas las marcas; Privacidad :51 y :52; `SIGUE_RECLAMO_DOS` literal; historial de `api/_lib/tw.ts` («de prueba» y 2 decimales); COR-C-03 registra la apertura solo con el botón (`POST`); comentario de la línea 1 de la migración 090000.
- **Legal, 5:31 p. m.:** con las tres correcciones de funcionamiento (recordatorios hacia atrás con los textos aprobados de 02/d4, 02/d6 y 04/d6; vencimiento sin `CORREOS_C`; sin «propuesta automática», `SIGUE_RECLAMO_DOS` literal) aprueba las demás marcas de C tal como están. Con el OK de Katherine se quitaron las marcas, `FECHA_V19` quedó con la fecha real y PR #22 se unió a master (f9489a6). Las variables de Vercel Production siguen pendientes (ver `docs/prueba-completa.md`, «Publicación de C»).
- **Para una ronda después de publicar:** ~~con un reparto pequeño la comisión redondeada puede mostrarse como 0,00~~ resuelto (4 decimales en las líneas del reparto, Legal 6:10 p. m., abajo); ~~vencimiento de la mediación cada hora (Vercel Hobby solo permite un cron diario; hace falta Pro o un cron externo)~~ hecho: corrida cada hora con Vercel Pro (paso 22).
- **Repartos en céntimos (Coordinador 5:39 p. m.):** `api/_lib/centimos.ts` (`repartoCentimos`): el dueño se redondea y el inquilino recibe el residuo; la comisión se queda con el residuo de lo que llega. Las partes mostradas suman exactamente el depósito. Desde la ronda de Legal de las 6:10 p. m., lo que llega y la comisión van con 4 decimales exactos (4,9850 + 14,9550 + 0,0600 = 20,00). **Desde el 27/10/2026 (Katherine, 1:05 p. m. CR) van exactos, sin redondear ni ceros de más** (4,985 + 14,955 + 0,06 = 20), con `netoTrustless` (ver «Montos exactos», abajo). Prueba: `src/__tests__/reparto-centimos.test.ts`.
- **Marcas quitadas (Legal 5:31 p. m.):** con las tres correcciones, Legal aprobó todas las marcas de C tal como estaban; ya no queda ninguna «LEGAL: revisar» y el build de producción pasa. La guarda sigue: cualquier marca nueva lo vuelve a bloquear.
- **Para una ronda después de publicar (antes «abierto para Legal»):** texto de la página del enlace de COR-C-03; «(red de prueba)» en el historial de la disputa (`api/_lib/tw.ts`); ~~descuadre de 0,01~~ resuelto con céntimos.

## Bloqueantes de Legal 25/10/2026, 6:10 p. m. (antes de encender `CORREOS_C`)

Legal revisó C en master f9489a6: todo bien, pero **`CORREOS_C` no se enciende hasta corregir estos dos puntos**. Corregidos en la rama `paso20-c-bloqueantes` (PR #27); con CI en verde Legal da el OK sin otra revisión.

1. **Comisión que desaparecía con 2 decimales.** `api/_lib/centimos.ts`: las partes del reparto siguen con 2 decimales y suman el depósito (el céntimo que sobra va al inquilino); **solo en las líneas del reparto** (lo que llega a cada parte y la comisión) se muestran **4 decimales con el cálculo exacto** (`cuatroDecimales`). Ejemplo: 0,50 + 1,50 sobre 2,00 → llegan **0,4985** y **1,4955**, Trustless Work descuenta **0,0060** (antes «0,50 + 1,50, descuenta 0,00»). Se aplica en los correos (`textos-correos.ts`, `llegan` y `comision`), en las notas de la app (`dosPersonas.ts`, `notaComisionAuto` y `notaComisionReparto`, con `llegaPrueba`), en el cierre (`Detalle.tsx`, listas de «Lo aceptaron las dos partes» y de la devolución automática) y en el aviso de la devolución automática (`alertas.ts`). Pruebas: `src/__tests__/reparto-centimos.test.ts` (comisión > 0 con (1, 1) y (0,50, 1,50); llegadas + comisión = depósito en diezmilésimos).
2. **«Vence mañana» el mismo día del vencimiento.** Con el cron diario de las 3:00 a. m. y un fin a las 5:54 p. m., `fin − 1 día` ya se cumplía a las 3:00 a. m. del día del fin. Nueva migración `20261025110000_c_recordatorios_dia_cr.sql` (abajo): se cuenta por **día calendario de Costa Rica** (`lk_dia_cr`).
3. **Cosmético:** en C el inquilino ve «Responde el reclamo.» (sin «rubro por rubro», `src/flujo.ts`); la hoja `resumen-correos.jpg` ya no dice «borrador LEGAL: revisar» en el título (`scripts/capturas-correos.mjs`).
4. **Fecha de la 1.9-demo:** hoy `/terminos` y `/privacidad` muestran la 1.7-demo porque falta `VITE_DOS_PERSONAS=1`. Al encender C deben decir 1.9-demo con la fecha de ese día: se cambia **una sola línea**, `FECHA_V19` en `src/legal/versiones.ts`, el mismo día y en el mismo cambio que enciende C (ver «Encender C» en `docs/prueba-completa.md`).

## Recordatorios por día calendario: `supabase/migrations/20261025110000_c_recordatorios_dia_cr.sql`

Reemplaza la regla de 20261025100000 (Legal 25/10, 6:10 p. m.). Solo `create or replace` de `lk_dia_cr` (misma definición de 20261025060000, por si no existe) y de `lk_correos_por_estado` (misma firma y permisos); no toca tablas ni datos.

- COR-C-02 «día 6» (vence mañana) cuando `lk_dia_cr(ahora) = lk_dia_cr(fin) − 1`; «día 4» (quedan 3 días) cuando `= lk_dia_cr(fin) − 3`. Nunca el mismo día del fin.
- COR-C-04: igual con `fin_inq`. Recordatorio de COR-C-05: `lk_dia_cr(ahora) = lk_dia_cr(m.vence) − 1`.
- Con el cron de las 3:00 a. m. (`0 9 * * *` UTC) cada aviso sale una vez, ese día. Desde el paso 22 la corrida es cada hora, pero los recordatorios por día solo salen en la de las 09:00 UTC (`HORA_RECORDATORIOS_UTC`): misma regla. Si el cron no corre un día, ese aviso no se manda más tarde (no saldría con un texto equivocado).
- Prueba: `c-correos-sql.test.ts` («vencimiento a las 5:54 p. m. y cron a las 3:00 a. m.», también con el feriado del 25 de diciembre y un domingo); `scripts/e2e-c.mjs` usa el cron de las 3:00 a. m. del día que toca.
- **Aplicada en producción el 25/10/2026 a las 6:19 p. m. (hora de Costa Rica)**, en una transacción (`begin; … commit;`): `lk_correos_por_estado` md5 245ed84f… → 9bdfa4b3…; `lk_dia_cr` sin cambios (3d6be287…); permisos iguales; `waitlist` 2 filas (3b7472…) y `waitlist_intentos` 1 fila (8a0f91…), iguales antes y después; `lk_contratos` y `lk_eventos` en 0. No se registró en `schema_migrations` (igual que 090000 y 100000).

## Recordatorios hacia atrás: `supabase/migrations/20261025100000_c_recordatorios_hacia_atras.sql` (reemplazada por 110000)

Legal 25/10/2026, 5:09 p. m. (bloqueante): los recordatorios se cuentan **hacia atrás desde el vencimiento real** `{vence}` (con domingos y feriados, `lk_fin_plazo`), no desde el inicio. Solo reemplaza `lk_correos_por_estado` (`create or replace`, misma firma y permisos); no toca tablas ni datos. **Aplicada en producción el 25/10/2026 a las 5:25 p. m. (hora de Costa Rica)**, en una transacción; waitlist (2 filas) y waitlist_intentos (1 fila) con la misma huella antes y después, permisos iguales (postgres y service_role). No se registró en `supabase_migrations.schema_migrations` (igual que 20261025090000), porque solo se autorizó reemplazar la función.

- COR-C-02 «día 4» (quedan 3 días): `ahora ≥ fin − 3·plazo/7`; «día 6» (vence mañana): `ahora ≥ fin − plazo/7`. Con 7 días: 3 días y 1 día antes del fin.
- COR-C-04: igual, con `fin_inq = lk_fin_plazo(entregado_en, plazo)`.
- **Inicio del plazo del inquilino:** `entregado_en` es el momento en que el dueño envía el reclamo (`now()` en `lk_reclamar`). Legal lo acepta (25/10, 5:09 p. m.).
- Prueba: `c-correos-sql.test.ts` (fin del dueño corrido por el 25 de diciembre; fin del inquilino corrido por un domingo).

## P-06: plazo de 3 días hábiles de la mediación

- Al pasar a la mediación (rechazo o silencio), el servidor programa el plazo en `lk_mediacion_plazos`: desde la respuesta (o el paso a la mediación) + 3 días hábiles (lunes a viernes, sin feriados de Costa Rica, `lk_es_feriado`, hora de Costa Rica).
- 1 día antes: **COR-C-05 recordatorio** a las dos partes y a la persona mediadora.
- **Al vencer** (`lk_mediacion_vencimientos`, en cada pasada): se anota la hora en `vencido_en`, se escribe en el historial «Venció el plazo de 3 días hábiles de la Mediación Lockumi (demo) sin el mismo reparto aceptado por las dos partes. No se pagó nada: el monto reclamado sigue retenido y la mediación sigue abierta.» (LEGAL: revisado 25/10) y sale **COR-C-06 «sin acuerdo»** a las dos partes y a la persona mediadora. **No se paga nada ni se aplica ninguna regla** (la 6.5.1 no se ofrece en C); las partes todavía pueden aceptar el mismo reparto en la app.
- Legal tiene que redactar la frase definitiva de qué pasa al vencer: hoy está en el evento de arriba y en `COR-C-06/vencida` y `COR-C-06/vencida-mediacion`.

## Prueba contra app.lockumi.com (25/10/2026, 7:12 p. m. CR)

`e2e-c.mjs --real --correos --app https://app.lockumi.com`, corrida `E2E-C 20261026T0112-f5e1`: 111 pasos, 0 fallas. Los COR-C-06 y COR-C-07 los mandó el servidor de producción (al pagar o repartir) y el script los contó desde `lk_correos_enviados`; los recordatorios (reloj de prueba) se mandaron desde el script. Todo al buzón `lockumi+e2ec-…@mail.grokbot.com`. Detalle en `docs/prueba-completa.md`, «C encendido».

## Prueba real (25/10/2026)

`NODE_OPTIONS=--experimental-websocket ./correr-c.sh --prod-datos-prueba --otra-vez` (commit c522c2a): 111 pasos, 0 fallas, Stellar testnet, dos cuentas. Los 45 correos (5 invitaciones y 40 del servidor) llegaron entre las 4:43:58 y las 4:46:06 p. m. (hora de Costa Rica), solo a `lockumi+e2ec-…@mail.grokbot.com`. Capturas: `prueba-completa/capturas/paso17-escenario-c/correos/` (fuera del repo). Luego `--limpiar`: todo en 0.

## Lista de correos y disparadores

| Id | Para | Cuándo |
|---|---|---|
| COR-C-00 | inquilino invitado | Al invitar (ya existía; `api/_lib/correo.ts`, un solo correo por alquiler) |
| COR-C-01 | dueño e inquilino | Empieza el plazo del dueño («Recibí la casa» o 2 días después de entregar). La del dueño es su día 1 |
| COR-C-02 | dueño | «Quedan 3 días» y «vence mañana», contados hacia atrás desde el vencimiento real por día calendario de Costa Rica (el día fin − 3 y el día fin − 1; migración 110000), sin reclamo ni aprobación; solo el último que toca |
| COR-C-03 | inquilino | El dueño reclama. El botón «Ver el reclamo» abre `GET /api/correo?abrir=<enlace>`, que **solo muestra una página** con el botón «Ver el reclamo en la app». La apertura (6.5 b) se registra **solo al tocar ese botón** (`POST`, Legal 25/10 punto 4), porque los programas que revisan enlaces también hacen GET. El texto de esta página es nuevo: **LEGAL: revisar** (`api/_lib/correos-c.ts`, `PAGINA_ABRIR`) |
| COR-C-04 | inquilino | «Quedan 3 días» y «vence mañana» de su plazo para responder (el día `fin_inq` − 3 y el día `fin_inq` − 1, hora de Costa Rica), si no respondió |
| COR-C-05 | dueño e inquilino + versión de la persona mediadora | Pasa a la mediación (rechazo o silencio); recordatorio 1 día antes de vencer |
| COR-C-06 | dueño e inquilino | Resultado de la mediación (reparto aceptado por los dos y pagado). Variante «sin acuerdo» al vencer (también a la mediadora) |
| COR-C-07 | dueño e inquilino | Cierre con pago: devuelto (aprobó), automático (venció sin reclamo) o acuerdo; montos menos el 0,3 % |
| COR-C-08 | la persona que pide borrar su cuenta | Recibimos el pedido (variantes A y B). Correo de servicio, sin casilla. `POST /api/correo { tipo: 'cuenta' }` con `CRON_SECRET` |
| COR-C-09 | la persona | Cuenta eliminada. Correo de servicio, sin casilla |

## Montos exactos (27/10/2026, Katherine 1:05 p. m. CR)

Pedido: «mejor no redondear el monto que es devuelto: réstale la comisión real de Trustless Work». Todo lo que **llega** (devolución, reparto, liberación) se muestra exacto, ya descontada la comisión real, con coma decimal, al menos 2 decimales y sin ceros de más: 1 → **0,997**, 2 → **1,994**, 0,50 + 1,50 → **0,4985 + 1,4955** (comisión **0,006**).

- **Comisión real:** 0,3 % (30 bps) de Trustless Work sobre cada monto que se libera; la paga quien recibe (se descuenta de lo que llega). Plataforma de Lockumi: 0 (`platformFee: 0`, `api/_lib/tw.ts`, `api/_lib/solo.ts`). Fuentes: contrato `Trustless-Work-Smart-Escrow` (`contracts/escrow/src/modules/fee/calculator.rs`, `distribution.rs`, commit f0b706e), docs.trustlesswork.com («Release phase», «Escrow Properties»), y en testnet las tx `49fb34d0…635c` (2 → 1,994 + 0,006), `cd92c786…5021` (26,32 + 3,68 → 26,24104 + 3,66896 + 0,09), `eeca5f43…f84` y el reparto real de b10557f9, `54b8a02d…9385` (27/10/2026, 1:20 p. m. CR): 4 + 6 acordados → **3,988** al dueño y **5,982** al inquilino, y **0,03** a `GA6KH5VW…CK7G`. Ese destino es el `trustless_work_address` del contrato (`fee/distribution.rs:49`, `token_client.transfer(contract_address, trustless_work_address, …)`), no una cuenta de Lockumi; no hay transferencia de comisión de plataforma (`platformFee: 0`).
- **Cálculo (una sola función):** `api/_lib/centimos.ts` → `netoTrustless(...partes)`, en stroops (BigInt) como el contrato: comisión = piso(total × 30 / 10000); a cada parte le toca piso(parte × comisión / total). `netoTW(monto)` para un solo monto; `exacto(n)` para el texto (2 a 7 decimales); en la app `usdExacto` (`src/ui.tsx`).
- **Dónde:** correos COR-C-06/partes y COR-C-07 (`textos-correos.ts`), historial (`api/_lib/tw.ts`, `src/acciones.ts`), avisos (`src/alertas.ts`), cierre y «Si aceptas, recibes…» (`src/screens/Detalle.tsx`), modo real (`src/screens/Real.tsx`), expediente (`src/prueba/expediente.ts`), notas de dos personas (`src/prueba/dosPersonas.ts`) y el resultado del escrow (`src/services/escrow.ts`). El reparto **acordado** (deslizadores, aceptaciones, línea «Reparto: …» del correo) sigue en bruto con 2 decimales.
- **Pruebas:** `src/__tests__/reparto-centimos.test.ts` (tx reales, piso como el contrato, llegadas + comisión = depósito en stroops) y `src/__tests__/usd-exacto.test.ts`.
- **Sin redacción nueva (Katherine 27/10/2026, 1:46 p. m. CR: «Publica ya solo los números, sin tocar textos legales»):** las frases son las mismas, palabra por palabra, que antes del cambio; solo cambia la cifra que va dentro (1,00 → 0,997; 0,70 + 0,30 → 0,6979 + 0,2991). Por ejemplo, el historial sigue diciendo «Se pagó el reparto aceptado desde Trustless Work: 3,988 USDC de prueba al dueño y 5,982 USDC de prueba al inquilino (cada monto menos el 0,3 % de comisión de Trustless Work).», el aviso de dos personas sigue con «A cada monto se le descuenta el 0,3 %…» y «Si aceptas, recibes…» sigue con «(menos 0,3 % de comisión de la red de prueba)». Una redacción que diga que esas cifras ya vienen descontadas queda para una ronda de Legal.
- **Textos legales no tocados** (`src/legal/**`, `src/screens/ContratoDoc.tsx`; Términos 5.2 ya da el ejemplo 1,994).
- **Publicado:** PR #67 (ver `PLAN.md`).

## Textos de la comisión (27/10/2026, Katherine 4:00 p. m. CR: «Ok dele con la a»)

PR #71, solo textos. Cambian 3 frases; las cifras siguen saliendo de `netoTrustless` (`api/_lib/centimos.ts`) y se escriben con `exacto`, sin redondear.

| Dónde | Antes | Ahora |
|---|---|---|
| Historial, `api/_lib/tw.ts` (`textoReparto`) | «Se pagó el reparto aceptado desde Trustless Work: 3,988 USDC de prueba al dueño y 5,982 USDC de prueba al inquilino (cada monto menos el 0,3 % de comisión de Trustless Work).» | «Se pagó el reparto aceptado desde Trustless Work. Llegaron 3,988 USDC de prueba al dueño y 5,982 USDC de prueba al inquilino. Esos montos ya tienen descontado el 0,3 % de comisión de Trustless Work. Lockumi no cobra nada.» |
| COR-C-06/partes (`repartoAcordado`) | «Reparto: 4,00 … al dueño y 6,00 … al inquilino, cada monto menos el 0,3 % de comisión de Trustless Work. Llegan 3,988 … al dueño y 5,982 … al inquilino; Trustless Work descuenta 0,03 USDC de prueba, y Lockumi no recibe nada.» | «Reparto acordado: 4,00 USDC de prueba al dueño y 6,00 USDC de prueba al inquilino. Trustless Work descuenta el 0,3 % de cada monto (0,03 USDC de prueba en total), así que llegan 3,988 USDC de prueba al dueño y 5,982 USDC de prueba al inquilino. Lockumi no recibe nada.» |
| COR-C-07/acuerdo (`repartoAcordado`) | «Reparto del depósito de prueba de 10,00 …: 4,00 … al dueño y 6,00 … al inquilino, cada monto menos el 0,3 % de comisión de Trustless Work. Llegan 3,988 … y 5,982 …. Lockumi no recibe nada.» | La misma frase que COR-C-06/partes. |

Ejemplo real: reparto 4/6 del alquiler b10557f9 (depósito 10). Los montos brutos se escriben como antes (`usdc`, 2 decimales). No cambian el diseño, `src/legal/**`, `src/screens/ContratoDoc.tsx`, las notas de `Detalle.tsx` ni los textos previos al pago. Los eventos que ya están en el historial no se reescriben: `asegurarEventoMediador` busca por hash de la transacción. Pruebas: `reparto-centimos.test.ts`, `correos-c-envio.test.ts`, `llaves-mediador.test.ts`, `devoluciones-cron.test.ts`.

## Textos (generados desde `api/_lib/textos-correos.ts`, con datos de ejemplo)

Datos de ejemplo: depósito 2,00, reclamo 0,50, reparto 0,50 / 1,50, vence el 29 oct 2026, 9:00 a. m. Hora en 12 h y montos con 2 decimales (Legal 25/10, 5:09 p. m., punto 8).

### COR-C-01/dueno · `api/_lib/textos-correos.ts:77` · **LEGAL: revisado (25/10)**

- Asunto: Tienes 7 días naturales para revisar la casa y reclamar
- Botones: «Revisar y reclamar», «Todo bien, devolver» · nota: confirmar · pie de baja: sí

> Empezó tu plazo para revisar la casa y, si hace falta, reclamar del depósito de prueba de 2,00 USDC de prueba. Vence el 29 oct 2026, 9:00 a. m., hora de Costa Rica. Solo se puede reclamar por daños o faltantes con pruebas, nunca por el desgaste normal (Anexo 6-A). Si todo está bien, puedes tocar «Todo bien, devolver». Si el plazo vence sin reclamo, se devuelve todo el depósito de prueba al inquilino. La devolución es automática: el 100 % al inquilino, menos el 0,3 % de comisión de Trustless Work, y puede tardar hasta 24 horas después de que vence el plazo. No la decide una persona ni pasa a la Mediación Lockumi (demo).

### COR-C-01/inquilino · `api/_lib/textos-correos.ts:81` · **LEGAL: revisado (25/10)**

- Asunto: Empezó el plazo del dueño para revisar la casa
- Botones: «Ver el alquiler» · nota: uno · pie de baja: sí

> El dueño confirmó que recibió la casa. Empezó su plazo de 7 días naturales para revisar la casa y, si hace falta, reclamar de tu depósito de prueba de 2,00 USDC de prueba. Vence el 29 oct 2026, 9:00 a. m., hora de Costa Rica. Solo puede reclamar por daños o faltantes con pruebas, nunca por el desgaste normal (Anexo 6-A). Si reclama, verás el reclamo en la app y tendrás 7 días naturales para responder. Si el dueño no aprueba ni reclama antes de que venza su plazo, se te devuelve automáticamente el 100 % del depósito de prueba, menos el 0,3 % de comisión de Trustless Work. Puede tardar hasta 24 horas después de que vence el plazo. No lo decide una persona. Por ahora no tienes que hacer nada.

### COR-C-02/d4 · `api/_lib/textos-correos.ts:85` · **LEGAL: revisado (25/10)**

- Asunto: Te quedan 3 días para revisar y reclamar
- Botones: «Revisar y reclamar», «Todo bien, devolver» · nota: confirmar · pie de baja: sí

> Te quedan 3 días para revisar y reclamar. Vence el 29 oct 2026, 9:00 a. m., hora de Costa Rica. Después, el depósito de prueba se devuelve completo al inquilino. La devolución es automática, menos el 0,3 % de comisión de Trustless Work, y puede tardar hasta 24 horas después de que vence el plazo.

### COR-C-02/d6 · `api/_lib/textos-correos.ts:89` · **LEGAL: revisado (25/10)**

- Asunto: Último aviso: tu plazo para reclamar vence mañana
- Botones: «Revisar y reclamar», «Todo bien, devolver» · nota: confirmar · pie de baja: sí

> Último aviso: tu plazo para reclamar vence mañana, 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si no reclamas, el depósito de prueba se devuelve completo al inquilino. La devolución es automática, menos el 0,3 % de comisión de Trustless Work, y puede tardar hasta 24 horas después de que vence el plazo.

### COR-C-03 · `api/_lib/textos-correos.ts:93` · **LEGAL: revisado (25/10)**

- Asunto: Tienes un reclamo sobre tu depósito de prueba: 7 días naturales para responder
- Botones: «Ver el reclamo» · nota: uno · pie de baja: sí

> El dueño reclamó 0,50 USDC de prueba de tu depósito de prueba de 2,00 USDC de prueba. Responde antes del 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo). En la app puedes aceptar el reclamo o no aceptarlo. Si lo aceptas, el dueño recibe 0,50 USDC de prueba y tú el resto, cada monto menos el 0,3 % de comisión de Trustless Work. Si no lo aceptas o no respondes, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. El silencio no significa que aceptes el reclamo. Cuando abres el reclamo, desde este botón o desde la app, la app registra la fecha y la hora de la primera vez que lo abres, y lo anota en el historial del alquiler, que también ve el dueño. En esta versión, ese registro no cambia lo que pasa con el depósito de prueba. Siempre puedes ir a los tribunales.

### COR-C-04/d4 · `api/_lib/textos-correos.ts:97` · **LEGAL: revisado (25/10)**

- Asunto: Te quedan 3 días para responder el reclamo de 0,50 USDC de prueba
- Botones: «Responder» · nota: uno · pie de baja: sí

> Te quedan 3 días para responder el reclamo de 0,50 USDC de prueba sobre tu depósito de prueba de 2,00 USDC de prueba. Vence el 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. El silencio no significa que aceptes el reclamo.

### COR-C-04/d6 · `api/_lib/textos-correos.ts:101` · **LEGAL: revisado (25/10)**

- Asunto: Último aviso: tu plazo vence mañana
- Botones: «Responder ahora» · nota: uno · pie de baja: sí

> Último aviso: tu plazo vence mañana, 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. El silencio no significa que aceptes el reclamo. Siempre puedes ir a los tribunales.

### COR-C-05/partes · `api/_lib/textos-correos.ts:105` · **LEGAL: revisado (25/10)**

- Asunto: El inquilino no aceptó el reclamo: el caso pasa a la Mediación Lockumi (demo)
- Botones: «Ver el caso» · nota: uno · pie de baja: sí

> El inquilino no aceptó el reclamo de 0,50 USDC de prueba. El caso pasa a la Mediación Lockumi (demo), sin costo. Una persona del equipo de Lockumi puede ayudarles a buscar un acuerdo. No decide por ustedes. No es mediadora certificada ni neutral: es parte de Lockumi, que no gana nada con el resultado del reclamo. Responde en un plazo de 3 días hábiles: hasta el 29 oct 2026, 9:00 a. m., hora de Costa Rica. En la app, cada parte elige el reparto que acepta. El reparto solo se aplica si las dos partes aceptan el mismo, y cada monto se paga menos el 0,3 % de comisión de Trustless Work. Mientras no haya acuerdo, el monto reclamado sigue retenido, y cualquiera de las dos partes puede acudir a los tribunales de Costa Rica o a otro mecanismo que la ley permita. La Mediación Lockumi (demo) no tiene efecto legal y no es una mediación en el sentido de la Ley 7727.

### COR-C-05/mediacion · `api/_lib/textos-correos.ts:109` · **LEGAL: revisado (25/10)**

- Asunto: Nuevo caso en la Mediación Lockumi (demo)
- Botones: «Abrir el caso» · nota: uno · pie de baja: no (correo de servicio)

> Un alquiler de ejemplo pasó a la Mediación Lockumi (demo). Motivo: el inquilino no aceptó el reclamo. Reclamado: 0,50 USDC de prueba de un depósito de prueba de 2,00 USDC de prueba. Plazo para responder: 29 oct 2026, 9:00 a. m., hora de Costa Rica (3 días hábiles). Abre el caso en la app para ver el reclamo, la respuesta y las fotos. Recuerda: no decides por las partes. Solo puedes registrar el acuerdo cuando las dos partes aceptaron en la app el mismo reparto. Lo que veas en este caso es confidencial: úsalo solo para este reclamo, no lo compartas con terceros ni lo copies fuera de la app. Aunque la Mediación Lockumi (demo) no es una mediación de la Ley 7727, seguimos el mismo deber de confidencialidad que esa ley pide a quien media.

### COR-C-05/recordatorio · `api/_lib/textos-correos.ts:113` · **LEGAL: revisado (25/10)**

- Asunto: Mañana vence el plazo de la Mediación Lockumi (demo)
- Botones: «Ver el caso» · nota: uno · pie de baja: sí

> El plazo de 3 días hábiles de la Mediación Lockumi (demo) vence mañana, 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si quieren llegar a un acuerdo, cada parte elige en la app el reparto que acepta; el reparto solo se aplica si las dos partes aceptan el mismo. Si vence sin acuerdo, no se paga nada: el monto reclamado de 0,50 USDC de prueba sigue retenido y la mediación sigue abierta.

### COR-C-05/recordatorio-mediacion · `api/_lib/textos-correos.ts:117` · **LEGAL: revisado (25/10)**

- Asunto: Mañana vence el plazo de un caso de la Mediación Lockumi (demo)
- Botones: «Abrir el caso» · nota: uno · pie de baja: no (correo de servicio)

> El plazo de 3 días hábiles de un caso de la Mediación Lockumi (demo) vence mañana, 29 oct 2026, 9:00 a. m., hora de Costa Rica. Reclamado: 0,50 USDC de prueba de un depósito de prueba de 2,00 USDC de prueba. Recuerda: no decides por las partes, y lo que veas en este caso es confidencial.

### COR-C-06/partes · `api/_lib/textos-correos.ts:121` · **LEGAL: revisado (25/10)**

- Asunto: Se registró el acuerdo de la Mediación Lockumi (demo)
- Botones: «Ver el resultado» · nota: uno · pie de baja: sí

> Las dos partes aceptaron en la app el mismo reparto del depósito de prueba de 2,00 USDC de prueba, y la persona mediadora lo registró. La persona mediadora no decidió el reparto: solo lo registró con las dos aceptaciones. Reparto acordado: 0,50 USDC de prueba al dueño y 1,50 USDC de prueba al inquilino. Trustless Work descuenta el 0,3 % de cada monto (0,006 USDC de prueba en total), así que llegan 0,4985 USDC de prueba al dueño y 1,4955 USDC de prueba al inquilino. Lockumi no recibe nada. El reparto se paga en la red de prueba en cuanto la red lo confirme. Esto no es una sentencia ni una decisión de Lockumi, y no tiene efecto legal: es lo que las dos partes aceptaron dentro de la demo, según las reglas de los Términos (cláusulas 2.2 b y 6.8 e). Cualquiera de las dos partes puede acudir a los tribunales de Costa Rica. Borramos los datos de la mediación 30 días después de cerrar el caso, salvo que una de las partes nos pida guardarlos para un reclamo fuera de la app.

### COR-C-06/vencida · `api/_lib/textos-correos.ts:125` · **LEGAL: revisado (25/10)**

- Asunto: Venció el plazo de la Mediación Lockumi (demo) sin acuerdo
- Botones: «Ver el caso» · nota: uno · pie de baja: sí

> Venció el plazo de 3 días hábiles de la Mediación Lockumi (demo), el 29 oct 2026, 9:00 a. m., hora de Costa Rica, sin que las dos partes aceptaran el mismo reparto. No se pagó nada y no se aplicó ninguna regla: el monto reclamado de 0,50 USDC de prueba sigue retenido. La mediación sigue abierta: si las dos partes aceptan en la app el mismo reparto, la persona mediadora lo registra y se paga, cada monto menos el 0,3 % de comisión de Trustless Work. Cualquiera de las dos partes puede acudir a los tribunales de Costa Rica.

### COR-C-06/vencida-mediacion · `api/_lib/textos-correos.ts:129` · **LEGAL: revisado (25/10)**

- Asunto: Venció sin acuerdo el plazo de un caso de la Mediación Lockumi (demo)
- Botones: «Abrir el caso» · nota: uno · pie de baja: no (correo de servicio)

> Venció el plazo de 3 días hábiles de un caso de la Mediación Lockumi (demo), el 29 oct 2026, 9:00 a. m., hora de Costa Rica, sin el mismo reparto aceptado por las dos partes. No se pagó nada: el monto reclamado de 0,50 USDC de prueba sigue retenido y el caso sigue abierto. Recuerda: no decides por las partes, y lo que veas en este caso es confidencial.

### COR-C-07/devuelto · `api/_lib/textos-correos.ts:133` · **LEGAL: revisado (25/10)**

- Asunto: Se devolvió todo el depósito de prueba al inquilino
- Botones: «Ver el alquiler» · nota: uno · pie de baja: sí

> El dueño tocó «Todo bien, devolver». Se devuelve al inquilino todo el depósito de prueba de 2,00 USDC de prueba, menos el 0,3 % de comisión de Trustless Work: llegan 1,994 USDC de prueba. El dueño y Lockumi no reciben nada. Se entrega en cuanto la red de prueba lo confirme. El dueño ya no puede reclamar en la app.

### COR-C-07/automatico · `api/_lib/textos-correos.ts:137` · **LEGAL: revisado (25/10)**

- Asunto: Venció el plazo sin reclamo: se devolvió el 100 % del depósito de prueba al inquilino
- Botones: «Ver el alquiler» · nota: uno · pie de baja: sí

> El dueño no aprobó ni reclamó dentro de su plazo. El sistema de Lockumi abrió una disputa en la red de prueba solo para poder devolver el depósito de prueba, y otra cuenta de Lockumi, la que resuelve disputas, entregó el 100 % al inquilino: 2,00 USDC de prueba, menos el 0,3 % de comisión de Trustless Work. Llegan 1,994 USDC de prueba. El dueño y Lockumi no reciben nada. Ninguna persona decidió este reparto.

### COR-C-07/acuerdo · `api/_lib/textos-correos.ts:141` · **LEGAL: revisado (25/10)**

- Asunto: El inquilino aceptó el reclamo: se repartió el depósito de prueba
- Botones: «Ver el alquiler» · nota: uno · pie de baja: sí

> El inquilino aceptó el reclamo de 0,50 USDC de prueba. Reparto acordado: 0,50 USDC de prueba al dueño y 1,50 USDC de prueba al inquilino. Trustless Work descuenta el 0,3 % de cada monto (0,006 USDC de prueba en total), así que llegan 0,4985 USDC de prueba al dueño y 1,4955 USDC de prueba al inquilino. Lockumi no recibe nada. Se paga en la red de prueba en cuanto la red lo confirme. Es lo que las dos partes aceptaron en la app; no tiene efecto legal, y cualquiera de las dos puede acudir a los tribunales de Costa Rica.

### COR-C-08/A · `api/_lib/textos-correos.ts:145` · **LEGAL: revisado (25/10)**

- Asunto: Recibimos tu pedido para eliminar tu cuenta de Lockumi
- Botones: ninguno · nota: ninguna · pie de baja: no (correo de servicio)

> Recibimos tu pedido para eliminar tu cuenta. Lo pediste el 26 oct 2026 a las 9:00 a. m. (hora de Costa Rica). Tu perfil ya no se muestra, y eliminamos tu cuenta en un máximo de 5 días hábiles. Fecha límite: 2 nov 2026. Borramos tus datos de reputación (puntaje, insignias, perfil y el historial que alimenta el puntaje), y no se pueden recuperar. Los datos del contrato y del depósito de prueba siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar. Esta solicitud no se puede deshacer. Si no hiciste este pedido, escríbenos a business.applockumi@gmail.com.

### COR-C-08/B · `api/_lib/textos-correos.ts:149` · **LEGAL: revisado (25/10)**

- Asunto: Recibimos tu pedido para eliminar tu cuenta de Lockumi
- Botones: ninguno · nota: ninguna · pie de baja: no (correo de servicio)

> Recibimos tu pedido para eliminar tu cuenta. Lo pediste el 26 oct 2026 a las 9:00 a. m. (hora de Costa Rica). Tienes un alquiler abierto. Tu perfil ya no se muestra, y tu cuenta se eliminará cuando el alquiler se cierre, en un máximo de 5 días hábiles después del cierre. Mientras tanto, solo usamos tus datos para cerrar el alquiler; puedes usar Lockumi para cerrarlo, y la otra parte sigue viendo el contrato y el historial. Los datos del contrato y del depósito de prueba siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar. Esta solicitud no se puede deshacer. Si no hiciste este pedido, escríbenos a business.applockumi@gmail.com.

### COR-C-09 · `api/_lib/textos-correos.ts:153` · **LEGAL: revisado (25/10)**

- Asunto: Eliminamos tu cuenta de Lockumi
- Botones: ninguno · nota: ninguna · pie de baja: no (correo de servicio)

> Eliminamos tu cuenta de Lockumi el 28 oct 2026, como lo pediste el 26 oct 2026. Borramos tu perfil y tus datos de reputación (puntaje, insignias, perfil y el historial que alimenta el puntaje), y no se pueden recuperar. Los datos del contrato y del depósito de prueba siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar, y no podemos borrar las capturas ni las imágenes que otras personas ya hayan guardado. Este es el último correo sobre tu cuenta. Si tienes una consulta, escríbenos a business.applockumi@gmail.com.
