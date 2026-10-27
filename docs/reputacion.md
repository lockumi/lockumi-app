# Reputación (paso 19)

Estado: **borrador, no publicado**. Rama `paso19-reputacion`. Todo va detrás de `VITE_REPUTACION` (apagado por defecto y en producción).
Nada se aplicó a producción: la migración está escrita y **no aplicada** (proyecto `sddgjnuvxzkrhhuczuly`).

Fuente única de textos y reglas: `legal/reputacion-textos-para-producto.md` (aprobado por Legal, versión del 25/10/2026, 2:24 p. m., hora de Costa Rica).
Reemplaza a `legal/reputacion-textos.md`. Además se aplicó entera la revisión de Legal del PR #26 (`legal/revision-pr26-legal.md`; prueba
`src/reputacion/__tests__/revision-legal.test.tsx`). Los textos REP-01 a REP-15 están copiados al pie de la letra en `src/reputacion/textos.ts`
(REP-14 y REP-15 en `src/legal/v17/*.md`, en bloques `<!-- si: reputacion -->`).

## El interruptor

| `VITE_REPUTACION` | Qué pasa |
|---|---|
| sin definir (producción) | La app se ve igual. Las pantallas (`src/reputacion/Pantallas.tsx` y `reputacion.css`) no entran en el build. Los textos de REP-14 y REP-15 viajan en los `.md` de la 1.7-demo, pero no se muestran. La prueba `apagado.test.tsx` compara las pantallas con sus instantáneas. |
| `1` | REP-01 antes de crear la cuenta, perfil, puntaje, vitrinas, revisión, avisos, eliminación de la cuenta y REP-14/REP-15 en `/privacidad` y `/terminos` (con la prueba completa). |

Comprobar el build apagado: `npx vite build --outDir /tmp/off` y buscar «Tu perfil es público y fijo» o «Pantallas» en `/tmp/off/assets` (no debe aparecer). La única
frase de reputación que existe hoy en producción es la del Aviso 1.6/1.7 («no calculamos ningún puntaje de reputación»).

## Versión

Con el interruptor encendido, la edición vigente es **`1.10-demo · [fecha de encendido]`** (`edicionVigente()` en `src/legal/version17.ts`):
la usan REP-01, `/privacidad` y `/terminos`. Apagado, todo sigue en 1.7-demo.

- **Registros (Legal, bloqueo 2):** solo una cuenta NUEVA, creada desde la pantalla previa, guarda la 1.10-demo: al aceptar los Términos en el
  login (`edicionAlAceptar()`, si en esa sesión se aceptó REP-01) y en sus registros por cuenta (`edicionDeCuenta(email)`, si la cuenta tiene
  `rep01`). Las cuentas anteriores, también cuando vuelven a entrar, guardan la 1.7-demo; el cambio de un alquiler 1.6 → 1.7 siempre guarda la 1.7-demo.
- **Guarda de encendido (Legal, bloqueo 1):** la fecha vive sola en `src/legal/fecha-reputacion.ts`. `vite.config.ts` usa `guardaEncendido`
  (`src/legal/encendido.ts`): el build falla si `VITE_REPUTACION=1` y la fecha todavía lleva «[». **Al encender**, escribir ahí la fecha real
  con el formato «2 de noviembre de 2026»; con el interruptor encendido, la prueba `ronda-cuentas-anteriores.test.tsx` exige ese formato.
  Para los builds locales de borrador (capturas y E2E) existe `LOCKUMI_REPUTACION_BORRADOR=1`, que **nunca vale en Vercel** (con `VERCEL` definida: ni producción ni preview;
  `encendido.ts:10`, 25/10 3:47 p. m.).

## Flujo

> **Desde la 1.13-demo (Legal, 26/10/2026; la casilla hoy nombra la 1.14-demo) — reemplaza lo de abajo sobre la pantalla previa:** ya no hay pantalla REP-01 (ni REP-01b) antes
> del login. La pantalla de inicio de siempre lleva la casilla «Acepto los Términos 1.13-demo, incluido mi perfil de reputación público.» con la
> línea de Legal debajo; la del Aviso no cambia. Al entrar con la 1.13-demo, `Pantallas.tsx` guarda versión, fecha, hora y texto
> (`aceptarRep01` → `subirAceptacion`) y va a Inicio; nombre visible y cantón se piden al crear o unirse al primer alquiler (o en `#/perfil`).
> **Cuentas sin perfil (Katherine 2:26 a. m. y Legal 2:27 a. m., 26/10; Ley 8968 art. 5):** sin bloqueo, aviso, casilla extra ni volver a
> aceptar. Usan Lockumi normal, sin perfil público; sus alquileres no se publican ni cuentan. Si más adelante aceptan los Términos en la pantalla
> de inicio, reciben su perfil desde ese momento y lo cerrado antes no cuenta (`perfilDesde`, Términos 15.1, Aviso :104). «Nuevo alquiler» y la
> invitación quedan como antes (en la invitación, solo la casilla del alquiler). El servidor sigue sin contar alquileres donde falte un perfil.
> SQL: `20261026030000_sin_bloqueo_perfil.sql` quita el disparador `lk_sin_perfil_tras_encendido` y su mensaje; revertir con
> `supabase/revert/20261026030000_sin_bloqueo_perfil_revert.sql` (lo devuelve con el mensaje de la 20261026020000). Lo de abajo sobre la
> pantalla previa y ese disparador queda solo como historia.
> **Recorrido de primera vez (26/10, 2:32 a. m.):** mientras dura, «Nombre visible y cantón» no tapa `#/crear` (los pasos 2 y 3 señalan el
> formulario); al terminar, vuelve a pedirse al crear. Prueba: `node scripts/recorrido/trabado.mjs`.

1. **Antes de crear la cuenta (REP-01, regla 5):** pantalla aparte, separada de los Términos, con la casilla de REP-01 y la de REP-01b (mayoría de
   edad), las dos sin marcar. [Continuar] está desactivado hasta marcar las dos. Enlaces: «Ver un ejemplo de perfil» (REP-02), «Cómo se calcula el
   puntaje» (REP-04) y «Aviso de privacidad». [No crear mi cuenta] lleva a una pantalla breve («No creaste tu cuenta…», redacción nuestra).
   - Se guarda **solo en la sesión del navegador** (`sessionStorage`, `lockumi.reputacion.previa.v2`): versión, fecha (ISO), hora de Costa Rica
     y el texto aceptado (Ley 8968). Nada queda en `localStorage`.
   - No se toca el login ni Cavos: `App.tsx` envuelve a `<Login/>` con `Previa`. Al entrar, `vincularPrevia` pasa la aceptación a la cuenta
     (`lockumi.reputacion.v1.<correo>`, campo `rep01`) **solo si la cuenta es nueva** (sin `rep01` y sin alquileres con ese correo); en todos los
     casos la borra de la sesión.
   - «Ya tengo cuenta: entrar» lleva al login sin aceptar nada (bandera de sesión `lockumi.reputacion.entrar.v1`, se borra al entrar).
   - Después falta un último paso: nombre visible y cantón. Nombre: hasta **dos palabras** antes de la inicial del apellido, y la inicial
     **lleva punto** («Ana V.», «Ana María V.», «Laura Vargas R.»; no «Ana R» ni tres palabras más la inicial). Debajo del campo, en `nota`,
     la ayuda literal de Legal: «Escribe tu nombre y la inicial de tu apellido, por ejemplo «Ana V.» o «Ana María V.». Así se verá en tu perfil.»
     (LEGAL: revisar).
   - Horas: «3:21 p. m.» con espacios que no se cortan (U+00A0) para que nunca se parta en dos líneas (`horaCR`).
2. **Cuentas anteriores a la 1.10-demo (sin REP-01; Coordinador, 25/10/2026, 3:24 p. m.):** no vuelven a aceptar nada. Siguen usando la app
   igual, sin perfil público, sin bloqueo y sin pantallas ni tarjetas extra (tampoco «Tu perfil en Lockumi» en Inicio). Lo dicen los Términos
   (15.1, última oración) y el Aviso de privacidad (después del primer párrafo de «Perfil de reputación»). Un alquiler entre una cuenta anterior
   y una nueva **no cuenta para ninguna de las dos** (`alquileresDeReputacion` en `puntaje.ts`; en el servidor, `lk_cuenta_para_reputacion` y
   el disparador `lk_rep_evento_cuenta`). Quien tenía perfil y pidió eliminar su cuenta sigue contando para la otra parte (`conPerfil` /
   `con_perfil`). En la demo cada navegador guarda solo lo suyo: el REP-01 de la otra parte se lee de este navegador (las capturas y el E2E lo siembran).
   **Sin REP-01 y sin alquileres (Legal, 25/10 3:47 p. m.):** como las sesiones del servidor son anónimas por aparato y no hay una fecha de
   creación de cuenta confiable, la regla no usa fechas: si la cuenta no tiene REP-01 **ni** alquileres (p. ej. entró por «Ya tengo cuenta:
   entrar» o por un enlace mágico en otra pestaña), antes de «+ Nuevo alquiler» (`/crear`) y de una invitación (`/invitacion`) ve la pantalla
   previa de siempre (dos casillas sin marcar) y, al aceptar, el paso de nombre y cantón. Una cuenta anterior con alquileres sigue sin perfil y sin
   pantallas nuevas. Código: `sinPerfilNiAlquileres` (`consentimiento.ts`) y `Pantallas.tsx`. Servidor: `lk_sin_perfil_ni_alquileres` y el disparador
   `lk_sin_perfil_tras_encendido` en `lk_participantes`, que **solo rigen si existe la fila de `lk_reputacion_encendido`** (se inserta el día del
   encendido; aplicar la migración antes no cambia nada para nadie). La edición de cada alquiler queda como estaba.
3. **Con un pedido de borrado pendiente (Legal, d):** «+ Nuevo alquiler» y los enlaces de invitación muestran, con los estilos de siempre:
   «Pediste eliminar tu cuenta, así que ya no puedes crear ni unirte a alquileres nuevos. Tus alquileres abiertos siguen funcionando igual.»
   En el servidor, el disparador `lk_sin_alquileres_nuevos_si_borra` en `lk_participantes` rechaza crear o aceptar una invitación con ese texto.
4. **Con la reputación aceptada:** la app se usa igual que siempre. «Tu perfil en Lockumi» en Inicio lleva a `#/perfil`.

## Reglas del puntaje (`src/reputacion/puntaje.ts`)

- Cada alquiler cerrado vale 5,0; el puntaje es el promedio, con un decimal. Solo alquileres cerrados en la app; las simulaciones no cuentan.
- **Inquilino:** baja solo si el reclamo terminó con un descuento del depósito (aceptado, acuerdo o mediación), en proporción a lo descontado.
- **Dueño:** baja solo si, en un acuerdo o en la mediación, se devolvió al inquilino el **90 % o más** de lo reclamado (`UMBRAL_CASI_TODO`), calculado
  sobre el monto reclamado y **antes** del 0,3 % de Trustless Work; baja en proporción a lo devuelto sobre el depósito (800 / 300 → 3,1).
- No baja por abrir un reclamo, por responderlo, por un reclamo fuera de plazo (5.3 d) ni por ir a los tribunales.
- **Siempre visible desde el 3.er alquiler cerrado** (alto o bajo). Antes: «Nuevo en Lockumi · n alquileres cerrados».
- **«En revisión»** mientras haya un reclamo abierto o una revisión pedida (esos alquileres no cuentan).
- **10 años:** un hecho negativo deja de contar 10 años después de que ocurrió (y se avisa con REP-12).
- Llave Lockumi: 10 o más alquileres, 4,8 o más, fotos completas y sin hechos negativos en 12 meses.
- Sin rankings, números de posición ni filtros por puntaje. Las vitrinas (opcionales, desde 3 alquileres cerrados) solo muestran el cantón
  (o la provincia si en el cantón hay menos de 10 personas); nunca barrio, dirección ni distancia.

## Revisión, avisos y protección

- **REP-11** `#/perfil/calculo/corregir` y `#/perfil/revision`: se elige el alquiler, se explica qué está mal y, si se quiere, una nota de hasta 300
  caracteres. Acuse al instante con fecha y hora y fecha límite de respuesta (5 días hábiles de Costa Rica). Lógica en `src/reputacion/revision.ts`.
- **REP-12** `src/reputacion/avisos.ts`: aviso en la app cuando el puntaje cambia o pasa a «En revisión», y cuando un hecho deja de contar por los
  10 años. **Correo programado detrás de `VITE_CORREOS`** (apagado): con `VITE_CORREOS=1` se envía por `api/correo` (prueba con el envío
  simulado; nunca se mandó un correo real). Sin la dirección del lugar en el correo.
- **Buscadores:** `<meta name="robots" content="noindex, nofollow">` en las rutas `#/perfil`, `public/robots.txt` (`Disallow: /perfil`,
  `/api/`; solo ASCII) y encabezado `X-Robots-Tag: noindex, nofollow` en `/perfil` y `/perfil/*` (`vercel.json`; el rewrite excluye
  `robots.txt`). Ojo: robots.txt y el encabezado no dependen del interruptor. Nadie puede buscar por nombre.
- **Perfil visible:** toda consulta pública de perfiles debe pasar por `lk_perfil_visible(uuid)` (falso si hay un pedido de borrado).

## Eliminar la cuenta (REP-09)

Gratis, desde «Tu perfil en Lockumi › Eliminar mi cuenta» o por correo a business.applockumi@gmail.com. El perfil deja de verse al instante y
todo se borra en un máximo de 5 días hábiles (sin sábados, domingos ni feriados de Costa Rica; `src/reputacion/borrado.ts` y
`lk_fecha_limite_borrado`). La pantalla y el pedido guardan la fecha y la hora (Costa Rica).

**Con un alquiler abierto (texto final de Legal):** el perfil deja de verse al instante, pero **nada se borra** mientras el alquiler siga
abierto; la cuenta se elimina en un máximo de 5 días hábiles después del último cierre. Mientras tanto la persona puede usar Lockumi solo para
cerrarlo; sus datos se usan solo para eso, el puntaje no se recalcula y la otra parte conserva su copia del contrato. En el servidor,
`lk_pedir_borrado_cuenta` no borra consentimientos, aceptaciones ni perfiles si hay un alquiler abierto. «Descargar mis datos» baja los dos roles.

## Migración (escrita, NO aplicada)

`supabase/migrations/20261025140000_reputacion.sql`: `lk_reputacion_perfiles`, `lk_reputacion_aceptaciones` (REP-01: versión, texto y
`aceptado_en` con fecha y hora), `lk_reputacion_consentimientos` (solo vitrinas), `lk_reputacion_eventos`, `lk_reputacion_revisiones` (nota ≤ 300),
`lk_solicitudes_borrado`, y las funciones `lk_pedir_borrado_cuenta` y `lk_borrar_cuentas_pedidas` (también borra lo negativo de más de 10 años).
Sección 5: `lk_reputacion_encendido` (una fila = reputación encendida), `lk_sin_perfil_ni_alquileres` y el disparador `lk_sin_perfil_tras_encendido`.
No insertar la fila de encendido hasta que la app escriba lk_reputacion_aceptaciones por correo.
(Esta línea se queda hasta verificar esa escritura —`lk_aceptar_reputacion`, que la app llama en modo servidor— en una corrida real en modo servidor.)
**Al encender** (solo después de eso): `insert into public.lk_reputacion_encendido default values;`.
Sección 6 (persona por correo, Legal 25/10 4:01 p. m.): `lk_aceptar_reputacion`, `lk_mis_datos_reputacion` y (4:22 p. m.) `lk_necesita_rep01`;
ver «Persona por correo» y «Correo verificado» abajo. Desde las 4:23 p. m.: `lk_correos_verificados` + `lk_registrar_correo_verificado` (solo
`service_role`) y columna `correo` en perfiles, consentimientos, eventos y revisiones (borrado y descarga por correo).
pg_cron opcional. Probada con PGlite (`src/servidor/__tests__/reputacion-sql.test.ts`, `reputacion-encendido-sql.test.ts`, `reputacion-persona-sql.test.ts`, `reputacion-verificacion-sql.test.ts`, `reputacion-lecturas-sql.test.ts` y `reputacion-ataques-sql.test.ts`). Antes de aplicarla: OK de Legal y de Katherine.

## Pruebas

- Unitarias: `src/reputacion/__tests__/` (puntaje, consentimiento, borrado, revisión, avisos, encendido y apagado con instantáneas).
- **Dos cuentas (E2E, solo local):**
  ```
  VITE_PRUEBA_COMPLETA=1 VITE_TRUSTLESS=1 VITE_REPUTACION=1 npx vite build --outDir /tmp/rp-dist
  npx vite preview --outDir /tmp/rp-dist --port 4319 &
  E2E_BASE=http://localhost:4319 E2E_CHROME=/usr/bin/google-chrome npx playwright test -c e2e pruebas/reputacion.e2e.ts --project=dueno
  ```
  Con la guarda, el build local de borrador lleva `LOCKUMI_REPUTACION_BORRADOR=1`.
  Dueño = cuenta nueva (REP-01 antes del login → datos → 4,2, sin contar su alquiler con la cuenta anterior → al final elimina su cuenta con un
  alquiler abierto y ya no puede crear alquileres nuevos). Inquilino = cuenta nueva («Ana María M.» → 4,6 → revisión «En revisión» → elimina su
  cuenta). Cuenta anterior (con alquileres) = «Ya tengo cuenta: entrar» → la app de siempre, sin pantallas extra. Cuenta sin REP-01 ni
alquileres → en «Nuevo alquiler», la pantalla previa de siempre. La prueba se salta sola contra app.lockumi.com.

## Pendientes

**Legal:** aprobó los textos de 6e9210a y los de la ronda de las 3:27 (marcas cambiadas a «LEGAL: revisado (25/10)»; en Términos 15.1 y el
Aviso, «1.10‑demo» con guion que no se corta, U+2011). El 25/10 a las 4:23 p. m. aprobó los de la ronda de las 4:01 (marcas «revisado»;
SQL «falta el texto» con su texto nuevo) y la línea de Privacidad de la persona por correo (publicada, con «solicitudes»). A las 4:41 p. m.
aprobó `UI.errBorrado` (texto nuevo con «solicitud») y `NO_SE_PUDO_VERIFICAR` (marcas «revisado · ronda 4:41»). Llevan
«LEGAL: revisar · ronda 25/10 4:45» los dos textos nuevos de esta ronda: el error del disparador `lk_participante_correo_verificado` (migración,
solo con la reputación encendida) y `DEMASIADOS_INTENTOS` (`api/_lib/cavos-token.ts`, respuesta 429; la app no lo muestra).

**Persona por correo (Legal, 25/10/2026 4:01 p. m.; implementado en la migración, NO aplicada):** `auth.uid()` es una sesión anónima por
aparato (`repositorio.ts:16-21`). La persona es su correo normalizado (`trim` + minúsculas), tomado SOLO de lo que la app guarda con la
sesión de Cavos: `lk_participantes.email_cavos`, `lk_reputacion_aceptaciones.correo` y `auth.users.email` (nunca un correo escrito a mano,
como `lk_contratos.email_inquilino`). **Desde la revisión de 96e931b (4:45 p. m.) solo cuenta `lk_correos_verificados`** (ver «Ataque con
email_cavos» abajo). Funciones: `lk_correos_de`, `lk_uids_de_correo`, `lk_uids_de_persona`, `lk_correo_de_sesion` (el correo
que manda la app tiene que estar ya vinculado a la sesión). Con eso: el bloqueo por borrado pendiente y la regla «sin REP-01 y sin alquileres»
miran el correo de la fila nueva de `lk_participantes`; `lk_pedir_borrado_cuenta(p_correo)` deja un pedido por cada sesión de la persona y
borra lo de todas (con un alquiler abierto en cualquiera, nada hasta que se cierra); `lk_borrar_cuentas_pedidas` borra lo de reputación de
todas sus sesiones y la cuenta de las que no tienen otro correo, y deja la constancia sin correo; `lk_mis_datos_reputacion(p_correo, p_rol)` da
la descarga de todas sus sesiones (la app la usa en modo servidor: `datosDeDescarga` en `Pantallas.tsx`; en la demo local, igual que antes);
`lk_aceptar_reputacion` guarda REP-01 por correo (la app la llama en modo servidor: `subirAceptacion`).

**Correo verificado (Legal, 25/10/2026 4:23 p. m.: bloqueante; implementado, migración NO aplicada, Vercel sin tocar):** el login no
cambia. El kit de Cavos (`@cavos/kit` 0.4.2, `CavosAuth.getAuthToken()`, `node_modules/@cavos/kit/dist/index.d.ts`) ya guarda el token que
entregó el proveedor al iniciar sesión (en `sessionStorage`, `cavos-kit:token:<appId>`): el id_token de Google (`iss`
`https://accounts.google.com`) o de Apple (`https://appleid.apple.com`), o el JWT del enclave de Cavos para el código por correo
(`https://enclave.cavos.xyz`, llaves en `https://enclave.cavos.xyz/.well-known/jwks.json`; https://docs.cavos.xyz/docs/auth). La app
(`src/reputacion/verificacion.ts`) lo lee con `authCavos()` y lo manda una vez por correo a `POST /api/verificar-correo` con su sesión de
Supabase. `api/_lib/cavos-token.ts` valida con WebCrypto: firma con el JWKS del emisor (RS256 Google/Apple, ES256 enclave; `none`/HS256 nunca),
emisor, audiencia POR EMISOR (`CAVOS_AUD_GOOGLE`, `CAVOS_AUD_APPLE`, `CAVOS_AUD_EMAIL`), `exp`/`nbf` (±60 s), `iat` de 5 minutos o menos,
el prefijo del App ID en el `nonce` (Google/Apple, `CAVOS_APP_ID`), correo (`email_verified` en Google/Apple; `false` se rechaza con cualquier
emisor) y, solo entonces, llama `lk_registrar_correo_verificado(uid, correo, método, huella)` con la clave de servicio (huella = SHA-256 de los
claims firmados `iss|sub|iat|nonce`, NUNCA de la firma; un token se usa UNA vez; Legal 6:04 p. m., abajo). Hasta entonces el servidor RECHAZA (cierre por defecto):
`lk_mis_datos_reputacion`, `lk_pedir_borrado_cuenta`, `lk_aceptar_reputacion` y `lk_necesita_rep01` solo aceptan un correo de
`lk_correos_verificados` para ESA sesión; un `email_cavos` sin verificar no usa la aceptación de otra persona (regla del encendido).
**Antes de usarlo (no lo hacemos nosotros, Vercel sin tocar):** poner `CAVOS_AUD_GOOGLE`, `CAVOS_AUD_APPLE` y `CAVOS_AUD_EMAIL` (cada una,
lista separada por comas) con el `aud` real de cada emisor y `CAVOS_APP_ID` = el id INTERNO de la app en Cavos (un UUID), que NO es la clave
pública `cav_…` de `VITE_CAVOS_APP_ID` (valores encontrados y fuentes: «Valores reales de CAVOS_*», abajo). Sin ninguna audiencia la función
responde 503; sin la de un emisor, ese emisor no se verifica; sin `CAVOS_APP_ID`, o si no es un UUID (p. ej. `cav_…`), Google y Apple no se
verifican (503).
Además `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (ya usadas por `/api/tw`).

### Correo por código con el token de correo de Cavos (Legal, 25/10/2026, 9:00 p. m.; migración NUEVA `20261025210000_verificar_correo_codigo.sql`)

**El hueco:** la sonda en producción (25/10, 8:37 p. m. CR) mostró que el token de correo del enclave (`iss https://enclave.cavos.xyz`, ES256)
trae `aud` = `cavos-email`, la MISMA para todas las apps de Cavos, y el camino del correo no exigía el App ID en el `nonce`. Un token de
correo válido de OTRA app de Cavos habría verificado ese correo en Lockumi.

**Lo que se buscó primero (paso 1, ¿el token de correo está ligado a la app?):**
- Código del kit `@cavos/kit` 0.4.2 (paquete oficial de Cavos en npm; fuente original en el sourcemap):
  - `node_modules/@cavos/kit/dist/chunk-GD4BWPID.mjs:129-133` (`src/auth/CavosAuth.ts:195`): `sendOtp` → `/api/oauth/email/code` con `app_id` y `email`.
  - `chunk-GD4BWPID.mjs:143` (`CavosAuth.ts:210`): `/api/oauth/email/session` con `app_id`.
  - `chunk-GD4BWPID.mjs:155-162` (`CavosAuth.ts:227`): trabajo del enclave `{ action: "verify_email", email, code, client_nonce: loginNonce(secret) }` por `/api/oauth/email/verify`.
  - `chunk-GD4BWPID.mjs:170` (`CavosAuth.ts:237`) y `:247` (`CavosAuth.ts:336`): `identityFromAuthData(result.id_token, "email", …)` y `assertLoginBinding(claims.nonce, secreto)`.
  - `chunk-7PFB7IVG.mjs:423-436` (`src/auth/loginBinding.ts`): `requiresLoginBinding` incluye `ENCLAVE_EMAIL_ISSUER`; `assertLoginBinding` exige
    `nonce.endsWith('.' + loginNonce(secreto))`. Comentario de `loginBinding.ts:7-17`: «Google, Apple and the enclave's email token sign one value
    the client chooses: the `nonce`. The kit sends the hash of a secret it keeps; the Cavos backend prefixes the app, so the token carries
    `<app_id>.<base64url(SHA-256(secret))>`» (y `:30`: «Google, Apple and enclave email tokens all carry a nonce this login chose»).
- Documentación oficial (docs.cavos.xyz): «What the enclave verifies» (`/docs/hardware-isolated-recovery`) documenta el `nonce`
  `<app>.<BASE64URL(SHA-256(login secret))>` SOLO para Google y Apple; del correo dice que es «the enclave's own signed token … bound to the same
  login secret», y `/docs/auth`: «bound to a login secret the SDK keeps, the same binding Google and Apple tokens have». **No dice de forma
  explícita que el `nonce` del correo lleve el prefijo de la app**, ni si es el UUID interno o la clave `cav_…`.
- Conclusión: hay una fuente del propio Cavos (el código y el comentario del kit) que dice que el `nonce` del correo SÍ lleva el App ID. Queda
  como **alternativa para Legal** (exigir `nonce` con el prefijo de `CAVOS_APP_ID` también para el correo); **NO se implementó** (decisión de
  Legal, 9:00 p. m.), y falta confirmarla con un token real (UUID o `cav_…`).

**Lo que se implementó (decisión de Legal):** con `iss https://enclave.cavos.xyz` y `aud` «cavos-email» (`AUD_EMAIL_COMPARTIDA` en
`api/_lib/cavos-token.ts`), `/api/verificar-correo` ya NO registra el correo en `lk_correos_verificados`:
1. valida el token como siempre (firma, emisor, audiencia, `iat` de 5 minutos, correo) y lo gasta (un solo uso, `lk_tokens_usados`) dejando
   el correo «por confirmar» para ESA sesión (`lk_correo_por_confirmar` → tabla `lk_correos_por_confirmar`, 1 por sesión, vale 1 hora);
2. manda el código de 6 números de Lockumi a ESE correo (`mandarCodigo`, acción `'verificar_correo'`: el mismo código del segundo factor,
   solo HMAC-SHA256 con `LOCKUMI_CODIGO_PEPPER` y sal, 10 minutos, 5 intentos, un solo uso, reenvío 1 por minuto y 5 por hora por correo) y
   responde **403** con `{ codigo: true, correo }`;
3. la app muestra «Revisa tu correo» (`ConfirmarCorreo` en `src/reputacion/Pantallas.tsx`, el mismo estilo y la misma pantalla del segundo
   factor) y manda el código a `POST /api/codigo-correo` `{ paso: 'confirmar', accion: 'verificar_correo' }`; con el código correcto,
   `lk_confirmar_correo_pendiente` usa el código (`lk_usar_codigo(usuario, correo, 'verificar_correo')`) y SOLO entonces registra el correo
   (método `email`). «Reenviar código» = `{ paso: 'pedir', accion: 'verificar_correo' }`. Al recargar (token ya usado, misma sesión y mismo
   correo) responde otra vez 403 `codigo: true` sin mandar otro código.
**Volver con la llave de acceso sin haber escrito el código (27/10/2026, prueba real del PR #60):** el token que la app manda a
`/api/verificar-correo` es el que el kit de Cavos guardó en el login (espejo de `src/services/sesionCavos.ts` en `localStorage`; el kit no
renueva el token en silencio). El JWT del enclave dura 1 hora (`exp - iat` = 3600, medido el 27/10/2026 en un login real; `aud` «cavos-email»),
pero el servidor solo lo acepta en sus primeros 5 minutos y una vez. Quien dejaba «Revisa tu correo» sin escribir el código (cerró la pestaña,
el código llegó tarde) y volvía con su llave de acceso mandaba un token de hace 20 minutos o más: 403 «No pudimos confirmar el correo de tu
cuenta. Sal de Lockumi…» (la app no lo muestra), el correo seguía sin confirmar, `lk_aceptar_reputacion` y el disparador
`lk_participante_correo_verificado` (crear alquiler) respondían 403 y la app no volvía a pedir el código. Arreglo solo en la app (el servidor
y el login no cambian, ni el diseño ni el flujo): (1) no se manda un token que el servidor va a rechazar (`tokenYaNoSirve`: `iat` de hace más de
6 minutos —5 del servidor más 60 s de reloj— o vencido; un token que no es JWT sí se manda); (2) cuando el servidor deja el correo por
confirmar, la app guarda en `localStorage` (`lockumi.correo-por-confirmar`) SOLO la cuenta, el correo y una vigencia de 55 minutos (el
servidor lo guarda 1 hora: `lk_correo_pendiente`), nunca el token ni el código; (3) sin token que sirva (token viejo, ya enviado o pestaña nueva)
y con esa marca vigente de la MISMA cuenta, `asegurarCorreo` vuelve a mostrar «Revisa tu correo» (la misma pantalla) sin mandar nada: el código
que ya llegó vale 10 minutos y «Reenviar código» (`/api/codigo-correo`, `verificar_correo`) ya funciona sin token. No verifica nada: el correo
solo queda verificado con el código correcto. La marca se borra al confirmar, si el servidor verifica el correo directo (Google/Apple) y al
salir (`borrarSesion`). Fuera de esa hora, o sin marca (otro aparato), ver «Sesión restaurada sin el correo confirmado» más abajo (PR #61). Si el correo ya estaba confirmado, volver con la llave de
acceso no necesita el token: el servidor decide con lo que esa sesión ya verificó. Pruebas: `src/reputacion/__tests__/volver-por-confirmar.test.ts`.
Recargar la página (27/10/2026, prueba real del inquilino): `enviados` (tokens ya mandados) era solo de memoria, así que cada carga con el mismo token
(menos de 6 minutos) lo volvía a mandar a `/api/verificar-correo`: 403 «Sal de Lockumi…» (ignorado por la app; el correo seguía confirmado en
`lk_correos_verificados` por la sesión de Supabase, y el pago no depende de esa llamada), pero con 1 de los 5 intentos por sesión y 10 minutos menos, y
si faltaba el código no volvía «Revisa tu correo». Ahora `sesionCavos.ts` guarda en `localStorage` (`lockumi.cavos.token-enviado`) la huella SHA-256
(24 caracteres) de cada token que el servidor ya recibió o rechazó (7 minutos; máximo 5; se borra en `borrarSesion`; un fallo de red no cuenta) y
`asegurarCorreo` no lo manda otra vez (con marca de por confirmar, vuelve la pantalla). Mismo test.
**Sesión restaurada sin el correo confirmado (27/10/2026, PR #61; jurado, prueba real):** la marca local de 55 minutos solo existe en el aparato que
mostró «Revisa tu correo» y vence; pasada esa hora (o en otro aparato) quien volvía con su llave de acceso entraba con «Tus alquileres» vacío y sin
pedir el código, y `lk_aceptar_reputacion` respondía 403 sin avisar (la sesión de Supabase no tenía fila en `lk_correos_verificados`, así que los
alquileres tampoco se vinculaban: `lk_vincular_alquileres` solo corre al confirmar el código). Detección (mecanismo que ya existía, sin migración ni
endpoint nuevo): la app no puede leer `lk_correos_verificados` (RLS: `revoke all` a `authenticated`), así que, cuando no hay token que sirva y no hay
marca vigente, `asegurarCorreo` llama a `lk_necesita_rep01(correo)` (stable, sin efectos; ya la usa la pantalla previa de REP-01), que responde
**28000 (HTTP 403)** si el correo no es el verificado ACTIVO de ESTA sesión. `ErrorServidor.codigo` (repositorio.ts) ahora conserva el SQLSTATE del
rechazo; solo `28000` cuenta como «sin confirmar» y muestra la MISMA pantalla «Revisa tu correo» (mismo flujo, «Reenviar código» sin token, sin
textos nuevos). Una falla de red, `PGRST301` (sesión vencida) u otro error NO muestran nada (no hay falso aviso) y se vuelve a preguntar la próxima
vez; con el correo confirmado no cambia nada y no se pregunta dos veces en la misma carga. No se guarda marca local (el servidor es la fuente).
Al confirmar el código, `Reputacion` reintenta `subirAceptacion` (antes quedaba esperando la próxima carga) y los alquileres se vinculan
(`vinculados` → recarga). No cambia: entrada normal con token reciente (`/api/verificar-correo`), recarga con la huella (412a806), «Reenviar código»
sin token (56c20ba), invitaciones (`InvitacionCodigo`) ni el servidor. Límite conocido: si el servidor ya olvidó el correo por confirmar (más de 1 hora,
`lk_correo_pendiente`), «Reenviar código» responde con el texto de siempre «Sal de Lockumi, vuelve a entrar con tu correo…» (hace falta un token nuevo de
Cavos). Pruebas: `src/reputacion/__tests__/sesion-sin-correo.test.tsx` (sin confirmar → «Revisa tu correo»; confirmado → la lista; error de red → sin
falso aviso).
Un token de otra app de Cavos ya no basta: el código llega al buzón de la persona dueña del correo. Google y Apple no cambian (siguen con su
`aud` y el `nonce` con `CAVOS_APP_ID`). Si algún día `CAVOS_AUD_EMAIL` es un `aud` propio de Lockumi, el correo se registra como antes.
Textos literales de Legal: título «Revisa tu correo»; «Te enviamos un código de 6 números a {correo}. Escríbelo aquí para confirmar tu
correo.»; asunto «Tu código de Lockumi: {código}»; correo con la variante «para confirmar tu correo». El campo, la nota de 10 minutos y los
errores son los ya aprobados; el botón es «Continuar» (el ya aprobado de la app). Capturas: `prueba-completa/capturas/paso19-reputacion/revisa-tu-correo/`.
Pruebas: `src/servidor/__tests__/verificar-correo-codigo.test.ts` (token «cavos-email» válido sin código → 403 y sin verificar; con el
código correcto → verificado; un solo uso, 5 intentos, 10 minutos, 1/min y 5/hora, otra sesión, permisos) y
`src/reputacion/__tests__/confirmar-correo.test.tsx` (pantalla y flujo en la app).
La migración `20261025210000_verificar_correo_codigo.sql` es NUEVA (la `20261025140000` ya está aplicada en producción): agrega
`'verificar_correo'` al `check` de `lk_codigos_correo`, la tabla `lk_correos_por_confirmar` (RLS, sin permisos para la app) y las funciones
`lk_correo_pendiente`, `lk_correo_por_confirmar`, `lk_correo_para_codigo`, `lk_confirmar_correo_pendiente` (solo `service_role`), y
redefine `lk_codigo_nuevo` y `lk_codigo_intento` (iguales salvo la acción nueva y el correo de cada acción). Idempotente. La aplica
`encender-reputacion.sh` (paso 1) con su fila en `supabase_migrations.schema_migrations`.

**Dos correos en un aparato (Legal, 4:23 p. m.):** cada fila de reputación lleva su `correo`; borrar y descargar filtran por CORREO
(`lk_de_la_persona`), nunca por la sesión compartida. La cuenta (`auth.users`) solo se borra si la sesión no tiene otro correo. El pedido
pendiente de A no bloquea a B, no oculta su perfil y un alquiler abierto de B no frena el borrado de A.

**Límites cerrados:** (1) correo verificado contra el token de Cavos (arriba); (4) la pantalla previa en otro aparato pregunta al servidor
(`lk_necesita_rep01`; mientras tanto «Cargando…»; si falla, se muestra); (5) «Eliminar mi cuenta» manda `lk_pedir_borrado_cuenta` con el correo
de la sesión de Cavos y, si falla, no borra nada en este aparato y muestra `UI.errBorrado`; **(5/g, 4:41 p. m.) lecturas por el correo
verificado ACTIVO:** las políticas RLS de lectura de las seis tablas son `usuario = auth.uid() and lk_fila_de_mi_correo(correo)` y las
funciones (`lk_mis_datos_reputacion`, `lk_necesita_rep01`, `lk_pedir_borrado_cuenta`, `lk_aceptar_reputacion`) solo aceptan
`lk_correo_activo(auth.uid())`, el ÚLTIMO correo que esa sesión verificó. Cambiar de persona en el aparato = volver a entrar = verificar ese
correo (la app vuelve a verificar al cambiar de correo, `verificacion.ts`). Prueba: `reputacion-lecturas-sql.test.ts` (A y B en el mismo
aparato: ninguno ve filas del otro).

**Ataque con email_cavos (Legal, revisión de 96e931b, 4:45 p. m., BLOQUEANTE 1; migración NO aplicada):** una sesión atacante podía crear
un alquiler `en_curso` con `email_cavos` = correo de la víctima: bloqueaba su borrado para siempre (fecha nula) y metía filas en su descarga.
Ahora la persona sale SOLO de `lk_correos_verificados`: `lk_correos_de`, `lk_uids_de_correo`, `lk_persona_tiene_alquiler_abierto`,
`lk_rep_fila_correo` (el correo de la fila) y `lk_rep01_pendiente` ignoran un `email_cavos` que esa sesión no verificó. Además, con la
reputación ENCENDIDA (fila en `lk_reputacion_encendido`), el disparador `lk_participante_correo_verificado` (BEFORE INSERT en
`lk_participantes`) exige que `p_email_cavos` esté verificado para `auth.uid()`; si no: «No pudimos confirmar el correo de tu cuenta. Sal de
Lockumi, vuelve a entrar con tu correo y vuelve a intentarlo.». Prueba: `reputacion-ataques-sql.test.ts` (reproduce el ataque).
**Escenario C (PR #22):** `lk_crear_contrato`, `lk_crear_contrato_invitando` y `lk_aceptar_invitacion` (producción) NO se reescriben: el
disparador las cubre a las tres porque las tres insertan en `lk_participantes` con `usuario = auth.uid()`. Con la reputación apagada no cambia
nada para C (compatibilidad). Encendida, crear o aceptar exige que la sesión haya verificado su correo, cosa que hace la puerta de reputación
justo después del login (`Pantallas.tsx`, `useRep01Servidor` → `asegurarCorreo`). Si PR #22 redefine esas funciones, el disparador sigue
valiendo. Riesgo: si al encender una sesión no verificó en los 5 minutos del login, no puede crear ni aceptar hasta volver a entrar (el texto
lo dice).

**Reuso del token (Legal, 4:45 p. m., BLOQUEANTE 2; huella corregida por Legal 6:04 p. m.):** `iat` de 5 minutos o menos (como exige el
enclave de Cavos); la huella va a `lk_tokens_usados` (sin acceso de la app) y la segunda vez se rechaza (409 → 403), aunque sea otra sesión; la app no reenvía un token que
ya mandó. Audiencias separadas por emisor. Llaves del JWKS solo con `use = "sig"` y el `alg` del emisor (los tres JWKS publican `use` y `alg`).
Un `kid` desconocido vuelve a leer el JWKS como mucho una vez por minuto. Límite de intentos en `/api/verificar-correo`
(`lk_intento_verificacion`, compartido entre instancias): 5 cada 10 minutos por sesión y 30 cada 10 minutos por IP (se guarda la huella de la
IP, nunca la IP); si se pasa: 429 con `DEMASIADOS_INTENTOS` y no se lee el JWKS; si la base no responde, 503 (cierre por defecto).
**Huella de un solo uso (Legal 6:04 p. m., BLOQUEANTE):** antes era SHA-256 del token entero, firma incluida, y la firma es maleable: los
bits de relleno del último carácter base64url no cambian los bytes (RS256: 342 caracteres; ES256: 86; en los dos sobran 4 bits) y en
ES256 la firma `(r, n−s)` también vale. Con otra firma salía otra huella y el token se podía usar otra vez. Ahora
`huellaDeUso` (`api/_lib/cavos-token.ts`) = SHA-256 de `["lockumi-uso-v2", iss, sub, iat, nonce]` (arreglo JSON, sin ambigüedad), calculada
DESPUÉS de verificar la firma; se exige `sub` (texto de 1 a 256 caracteres). Pruebas (`verificar-correo-api.test.ts`): bit de relleno
alterado (Google RS256 y enclave ES256), firma ECDSA reescrita `s → n−s` y reuso tal cual: las tres dan «ya usado» (403) y la base recibe la
misma huella.
`search_path = ''` también en `lk_de_la_persona`, `lk_pascua`, `lk_es_feriado_cr` y `lk_fecha_limite_borrado`.

**Cuánto dura cada token (para el `iat` de 5 minutos):**
- Google (id_token de «Sign in with Google»): 1 hora. «It is one hour for the ID token obtained from Sign In With Google»
  (https://developers.google.com/identity/gsi/web/reference/js-reference, campo `exp`).
- Apple (identity token): Apple solo dice que hay que comprobar que no pasó `exp`
  (https://developer.apple.com/documentation/signinwithapple/verifying-a-user). Observado por terceros: `exp - iat` = 10 minutos
  (https://blog.curtisherbert.com/so-theyve-signed-in-with-apple-now-what/). No es documentación de Apple.
- Cavos, código por correo: el CÓDIGO vence a los 5 minutos y admite 3 intentos (https://docs.cavos.xyz/docs/auth). La duración del JWT del
  enclave NO está documentada; medida el 27/10/2026 en un login real: `exp - iat` = 3600 s (1 hora), `aud` «cavos-email».
Con cualquiera de los tres, Lockumi solo acepta el token en sus primeros 5 minutos (y una sola vez).

**El nonce NO se verifica del todo (riesgo residual aceptado para la demo):** Cavos arma el nonce de Google/Apple como
`<app id>.<BASE64URL(SHA-256(secreto del login))>` (https://docs.cavos.xyz/llms-full.txt; `@cavos/kit` 0.4.2,
`dist/chunk-GD4BWPID.mjs:94-101` y `dist/chunk-7PFB7IVG.mjs:423`). El servidor exige el prefijo `CAVOS_APP_ID.` (el token salió de un login de
Lockumi) pero NO puede comprobar la parte del secreto, que queda en el cliente. En el código por correo el kit manda solo el hash del secreto
(`client_nonce`) y exige que el nonce del token del enclave termine en `.<hash>` (`dist/chunk-7PFB7IVG.mjs:426-437`); el prefijo que pone el
enclave no está documentado, así que en ese emisor el servidor no comprueba nada del nonce. Un token robado en sus primeros 5 minutos y antes de que la app
lo use serviría una vez.

**¿Lockumi tiene un `aud` propio con Cavos? NO (investigado 25/10, 4:45–5:00 p. m.):** con el login alojado de Cavos (el que usa Lockumi:
`oauthUrl` del kit va a `/api/oauth/v2/{google|apple}` de Cavos con `app_id`), el cliente OAuth de Google/Apple es el de Cavos, compartido por
todas sus apps: «Register your OAuth client ID … The enclave then accepts tokens minted for your client instead of only Cavos's»
(https://docs.cavos.xyz/docs/hardware-isolated-recovery), y eso es solo para quien trae su propio login. El código por correo tampoco tiene un
client id por app. Entonces un token de Google/Apple de OTRA app de Cavos tiene el mismo `aud`; lo que lo separa es el App ID del nonce (arriba).
**Por eso borrar y descargar necesitan un segundo factor** (código que el servidor manda a ese correo): PROGRAMADO (abajo).

### Segundo factor: código por correo antes de «Eliminar mi cuenta» y «Descargar mis datos» (programado 25/10/2026)
Diseño aprobado por Legal (5:04 p. m.) y por Katherine (5:29 p. m., hora de Costa Rica); pantallas iguales a
`prueba-completa/capturas/paso19-reputacion/segundo-factor/par-eliminar.png` y `par-descargar.png`. Solo en modo servidor (`conServidor`);
en la demo local sin servidor nada cambia.
- **Flujo:** (1) la pantalla de siempre con su botón; (2) «Revisa tu correo»: el servidor manda un código de 6 números al correo verificado
  ACTIVO de la sesión (`lk_correo_activo`), con «Código del correo», «Reenviar código» y «Cancelar»; (3) con el código correcto, lo de siempre
  (pedido de borrado / archivo). App: `src/reputacion/segundo-factor.ts`, `useSegundoFactor` y `CodigoCorreo` en `src/reputacion/Pantallas.tsx`,
  textos en `SEGUNDO_FACTOR` (`src/reputacion/textos.ts`).
- **Servidor:** `POST /api/codigo-correo` (`api/codigo-correo.ts` → `atenderCodigo` en `api/_lib/codigo-correo.ts`), con la sesión de
  Supabase. `{paso:'pedir', accion}` manda el código; `{paso:'confirmar', accion, codigo}` lo comprueba y hace la acción ahí mismo, con la
  sesión de la persona (`lk_pedir_borrado_cuenta` o `lk_mis_datos_reputacion`).
- **Código:** 6 números al azar sin sesgo (`crypto.getRandomValues`). Nunca se guarda: solo `HMAC-SHA256(LOCKUMI_CODIGO_PEPPER,
  sal|usuario|correo|acción|código)` con una sal al azar por código; el pepper vive solo en Vercel (no en la base). Comparación en tiempo
  constante (`crypto.subtle.verify` de HMAC). Vale 10 minutos, 5 intentos (el intento se cuenta ANTES de comparar), un solo uso, ligado a la
  acción, a la sesión y al correo. Un código nuevo anula el anterior de esa acción. «Reenviar código»: 1 por minuto y 5 por hora por correo.
- **Base (sección 7 de la migración, escrita, NO aplicada):** tabla `lk_codigos_correo` (RLS activo, sin políticas, sin permisos para
  `anon`/`authenticated`: el cliente no lee la huella); `lk_codigo_para`, `lk_codigo_nuevo`, `lk_codigo_borrar`, `lk_codigo_intento`,
  `lk_codigo_confirmar` (solo `service_role`) y `lk_usar_codigo` (sin permisos: solo la llaman las acciones). **La acción exige el código
  en la base, no solo en la pantalla:** `lk_pedir_borrado_cuenta` y `lk_mis_datos_reputacion` llaman a `lk_usar_codigo`, que consume un código
  confirmado en los últimos 2 minutos para esa sesión, correo y acción; sin eso, rechazan aunque se las llame directo con la sesión. Si la
  acción falla, la transacción vuelve atrás y el código sigue sirviendo.
- **Correo:** aviso del servicio (sin casilla ni contenido comercial), asunto «Tu código de Lockumi: {código}», el texto de Legal y el pie de
  siempre (`PIE`, el de REP-12), por Resend (`idempotency-key` por código). Si Resend falla, se borra la fila y la app dice cómo seguir.
- **Errores (sin palabras técnicas):** código incorrecto o vencido y reenvío antes de un minuto: textos literales de Legal (revisado 5:04).
  Más de 5 códigos en una hora («Ya te enviamos 5 códigos en la última hora. Espera una hora y vuelve a tocar «Reenviar código».», OK tal
  como está) y «el correo no salió» («No pudimos enviarte el código. Vuelve a intentarlo en un minuto.», literal): revisados por Legal (6:01 p. m.). Sin `LOCKUMI_CODIGO_PEPPER` (32+ caracteres),
  `RESEND_API_KEY` o `SUPABASE_*`, el servidor responde 503 (cierre por defecto).
- **Pruebas:** `segundo-factor-sql.test.ts` (15, Postgres real: huella, vencimiento, 5 intentos, un solo uso, límites de reenvío, acción y
  persona, permisos/RLS), `codigo-correo-api.test.ts` (18, la API contra la migración real con Supabase y Resend falsos),
  `segundo-factor-pantalla.test.tsx` (5). **Flujo real local** (sin producción): `prueba-completa/scripts/segundo-factor-real.mjs` (Postgres
  real con la migración + el `atenderCodigo` real + Resend de verdad SOLO a lockumi@mail.grokbot.com) y
  `segundo-factor-capturas-real.mjs` (Playwright, 390 px): capturas en `prueba-completa/capturas/paso19-reputacion/segundo-factor/real/`.
  Legal 6:04 p. m. (opcional): el aviso «Ya te enviamos un código. Espera un minuto antes de pedir otro.» se oculta cuando la persona empieza
  a escribir el código (solo ese aviso; un error nuevo se vuelve a ver). Panel 3 rehecho con el flujo real (25/10, 6:17 p. m. CR, código
  real recibido en lockumi@mail.grokbot.com; `segundo-factor-panel3-real.mjs`, `log-panel3.txt`: «avisos visibles después de escribir: 0»).
- **Límites:** el código va al correo que Cavos verificó; quien controla ese correo puede borrar o descargar (es el diseño aprobado). El
  correo lleva el enlace de Privacidad con el origen de la app que lo pidió (solo orígenes permitidos).

**Límites que quedan** (la (g) quedó cerrada a las 4:41 p. m.)**:** (a) el token vive en `sessionStorage`: en una pestaña nueva no hay token y, si esa sesión de Supabase no se verificó
antes, el servidor rechaza hasta volver a entrar. (b) El código por correo: si el JWT del enclave no trae `email`, no se verifica (cierre por
defecto); confirmarlo con un token real. (c) El `aud` no está documentado por Cavos: cada `CAVOS_AUD_*` sale de un token real, y no es
propio de Lockumi (segundo factor, arriba); el de correo («cavos-email») es el mismo para todas las apps de Cavos, por eso con él hace falta
además el código de Lockumi (Legal 9:00 p. m., arriba). (d) El servidor no puede comprobar la parte secreta del `nonce`: un token robado en sus primeros
5 minutos, antes de que la app lo use, serviría UNA vez. (e) El login simulado (`modoReal` apagado) no tiene token: en modo servidor sin Cavos real todo se rechaza. (f) Filas
sin correo (anteriores a esta ronda) en una sesión con dos correos no se borran con ninguno de los dos. (g) Cerrada (lecturas por el correo
activo). (h) Con un token ya usado (p. ej. al recargar), la app no vuelve a verificar: el servidor usa lo que esa sesión ya verificó. (2) Una sesión sin
alquileres ni aceptación no tiene correo conocido hasta que se verifica.
**JWKS reales (revisión previa al encendido, Legal 6:04 p. m.; leídos el 25/10/2026 a las 6:05 p. m. CR, copia en
`prueba-completa/evidencias/jwks-2026-10-25/`):** las tres URL que usa el código responden 200 y TODAS sus llaves publican `use` y `alg`:
- Enclave `https://enclave.cavos.xyz/.well-known/jwks.json` (la de la documentación de Cavos y la del código; el enclave NO tiene
  `/.well-known/openid-configuration`: 404): 1 llave, `kid kdAGJcKh_MT-utzXkGqVm2MXWUZh6SulWawbqOlMXUM`, `kty EC`, `crv P-256`, `alg ES256`, `use sig`.
- Google `https://www.googleapis.com/oauth2/v3/certs` (= `jwks_uri` de su configuración OpenID, que publica solo RS256): 2 llaves RSA,
  `alg RS256`, `use sig`.
- Apple `https://appleid.apple.com/auth/keys` (= `jwks_uri` de su configuración OpenID, solo RS256): 3 llaves RSA, `alg RS256`, `use sig`.
Por eso la regla estricta se mantiene (`llaveValida`: `use = "sig"` y `alg` = el fijo del emisor); no hizo falta aceptar `use` ausente. La
prueba «JWKS reales» usa esta copia: las llaves pasan la regla y la del enclave se importa como llave ECDSA P-256 de verificación. Si un emisor
dejara de publicar `use`, todas las entradas de ese emisor darían 403: volver a leer el JWKS antes de encender.

**Valores reales de CAVOS_* (Legal 6:04 p. m., sin pedir secretos; 25/10 6:06 p. m. CR):**
- `VITE_CAVOS_APP_ID` (clave pública del frontend): `cav_c1b1cec42e7b62cd01f377b5a3291b276079` (app vieja), en el bundle publicado de app.lockumi.com
  (`/assets/index-KGYSB8bC.js`). NO es el prefijo del nonce. **27/10/2026:** existe la app nueva «Lockumi v2» (`cav_14f91c44d57f4290070c0f9705f50164564b`, su `CAVOS_APP_ID` interno es `b2f83f81-a07d-4ef5-b8a5-167502aea497`); producción sigue con la vieja hasta que Katherine apruebe el cambio. Ver [firma-cavos.md](firma-cavos.md#app-de-cavos-lockumi-v2-27102026-nuevo-vite_cavos_app_id).
- `CAVOS_APP_ID` = **`514692ec-9202-4015-b53c-4b8824dca4d5`** (confirmado): `GET https://cavos.xyz/api/oauth/v2/google?app_id=cav_…&nonce=<hash>`
  (lo mismo que hace el kit al tocar «Google», `dist/chunk-GD4BWPID.mjs:94-101`, sin completar el login) devuelve la URL de Google con
  `nonce=514692ec-….<hash>` y un `state` con `"app_id":"514692ec-9202-4015-b53c-4b8824dca4d5"`. Igual en Apple. Es el «app id» del nonce que
  documenta Cavos. Con un `app_id` inventado, Cavos responde «Invalid app_id».
- `CAVOS_AUD_GOOGLE` = **`1074035053584-s7i7gv8mbki1gnlgnnhibt6lfknqm3nb.apps.googleusercontent.com`**: es el `client_id` de la URL de Google
  que arma Cavos (`redirect_uri https://cavos.xyz/api/oauth/google/callback`). En OpenID el `aud` del id_token es el `client_id`. Falta verlo
  en un id_token real (login real con Google).
- `CAVOS_AUD_APPLE` = **`com.cavosx.auth`**: `client_id` de la URL de Apple que arma Cavos. Falta verlo en un identity token real (login real
  con Apple).
- `CAVOS_AUD_EMAIL`: se llena al encender (`encender-reputacion.sh <AUD>`). NO se puede saber sin un token real. Ni el kit 0.4.2 ni la documentación lo dicen. Requiere un login real con código por
  correo en la app (con `VITE_CAVOS_APP_ID`) y leer el `aud` de `sessionStorage['cavos-kit:token:<cav_…>']` (lo que devuelve
  `getAuthToken()`), sin copiar el token entero. Ese mismo token confirma `email`, el formato del nonce y `exp - iat`.
Son identificadores públicos (van en URLs del navegador), no secretos. Puestos en Vercel Production el 25/10, salvo `CAVOS_AUD_EMAIL`.

**Estado para el encendido (25/10/2026, 8:15 p. m. CR; Katherine: «haz lo que tengas que hacer para que funcione todo al 100», Legal: OK final al PR #26):**
- [x] En Vercel **Production** (solo nombres; valores de «Valores reales de CAVOS_*»): `CAVOS_APP_ID`, `CAVOS_AUD_GOOGLE`, `CAVOS_AUD_APPLE` y
  `LOCKUMI_CODIGO_PEPPER` (al azar, 32 bytes, sensible; copia fuera del repo). `RESEND_API_KEY` ya estaba (Production y Preview).
- [x] `CAVOS_AUD_EMAIL`: `cavos-email`, puesto al encender (25 de octubre de 2026). Katherine lo lee de un login real con código por correo (el `aud` de su propio token, en su
  navegador; nadie copia el token). Es el único dato que falta; con él el encendido es un solo comando: `encender-reputacion.sh <AUD>`.
- [x] Rama al día con master (escenario C): la 1.10-demo se superpone a la edición vigente (desde C, la 1.9-demo); la guarda «LEGAL: revisar»
  de master y la de la fecha de encendido conviven en `vite.config.ts`.
- [x] Migración `20261025140000_reputacion.sql`: aplicada en producción (antes del encendido; `20261025210000` el 25/10 a las 10:43 p. m. CR, en el encendido). Antes: No solo agrega: redefine `lk_pascua` (solo cambia `search_path` de `public`
  a `''`, mismo cuerpo) y agrega 3 disparadores en `lk_participantes` (tabla que master usa). Probada en producción dentro de una transacción
  que se deshizo (25/10, sin errores; waitlist igual). Se aplica en el paso 1 del encendido, con la fila de `lk_reputacion_encendido`.
- [x] `FECHA_ENCENDIDO_REPUTACION` **no es una variable de entorno**: es la constante de `src/legal/fecha-reputacion.ts` (formato
  «25 de octubre de 2026»). El encendido la escribe y la sube en el mismo commit; la guarda del build impide publicar con «[fecha de encendido]».
- [x] `VITE_REPUTACION=1` en Production: lo pone el encendido (es de build; sin un deploy nuevo no cambia nada).

Encendida: **25 de octubre de 2026, 10:43 p. m. CR** (1.10-demo · 25 de octubre de 2026). `CAVOS_AUD_EMAIL` = `cavos-email` (del token real de un login con código por correo).

**Publicación real (25/10/2026, CR; equipo de Vercel en Pro desde las 10:40 p. m.):** commit de la fecha `429f1ab` (10:43 p. m.), merge del PR #26
`f87c8b86ec727e976191b99729f9cc1f52417795` (10:45 p. m.), deploy de producción `dpl_FjGNMRmKrHjJ15gCbhzPdYaqpiXP` en READY y en app.lockumi.com
(10:45 p. m.; el anterior era `dpl_E3TJaZLMvYh6t6KqoxhcAEJJDQhX`, f6e3254), fila de `lk_reputacion_encendido` a las 10:45:45 p. m.
Una línea anterior decía «8:54 p. m.»: ese intento **nunca quedó encendido** (se pusieron las variables, pero no hubo merge ni deploy).
`encender-reputacion.sh` ahora lee el plan real del equipo en la API de Vercel (Hobby 100 deploys en 24 h, Pro 6000) y escribe siempre la
hora real. E2E de producción (`prueba-completa/e2e-reputacion-produccion.sh`, 10:48–10:51 p. m.): TODO OK (2 cuentas de prueba, REP-01,
descargar y eliminar con el código del correo, limpieza total; waitlist igual: 2 filas `3b7472599f6777f360aa2f9dd7832386`, 1 fila
`8a0f91b5d81476b2f6ed8554b32449ac`). Hoja de capturas: `prueba-completa/capturas/encendido-reputacion-20261025/hoja-encendido-reputacion.jpg` (fuera del repo).
**Ojo:** desde el paso 21 (invitación v3, migración `20261025230000`) aceptar una invitación depende de `lk_correos_verificados`, que llena
la reputación. Volver atrás la reputación obliga a volver atrás también la invitación v3 (docs/invitacion-enlace.md, «Volver atrás»).

**Encendido (un solo comando, `encender-reputacion.sh <AUD>`):** (1) aplica las migraciones `20261025140000` (si falta) y
`20261025210000_verificar_correo_codigo.sql` (si falta), cada una con su fila en `schema_migrations`, registra la fila de encendido y
comprueba la waitlist; (2) pone `CAVOS_AUD_EMAIL` y `VITE_REPUTACION=1` en Production; (3) escribe la fecha real aquí y en `src/legal/fecha-reputacion.ts`,
commit y push; (4) espera el CI, une el PR #26 con merge commit y espera el deploy de producción en READY; (5) comprueba app.lockumi.com (200)
y que /terminos y /privacidad dicen 1.10-demo y «Pendiente de revisión por abogado».
**Volver atrás:** primero la invitación v3 (si ya se publicó: `supabase/revert/20261025230000_invitacion_correo_verificado_revert.sql` y su `git revert -m 1`); después promover `dpl_E3TJaZLMvYh6t6KqoxhcAEJJDQhX` en Vercel (o borrar `VITE_REPUTACION` y volver a publicar), `delete from public.lk_reputacion_encendido;` y `git revert -m 1 f87c8b86ec727e976191b99729f9cc1f52417795`. La
migración se queda (tablas nuevas vacías sin la app; `lk_pascua` igual salvo `search_path`); sin la app encendida nadie escribe en ellas.

**Producto / después de encender:** límite de consultas y servidor
público de perfiles (usando `lk_perfil_visible`); encender `VITE_CORREOS` cuando haya consentimiento para correos. Límite conocido: una cuenta
anterior sin alquileres se trata como nueva (ve la pantalla previa antes de su primer alquiler).
No se implementan (por ahora): perfil solo para registrados, apagar Destacados/Nuevos, retirar un reclamo, espejo del 10 %.

### Legal, ronda 1.10 y 1.11-demo (25/10/2026, 11:16 y 11:33 p. m. CR; PR #33)
- **Casilla y link:** la invitación decía «Acepto los Términos 1.9-demo…» y el link abría `/terminos` (con la reputación, otra edición).
  Ahora cada casilla y línea de versión abre la versión guardada: la 1.9-demo de los alquileres de dos personas en `/terminos-1-9` y
  `/privacidad-1-9` (el servidor exige la versión del alquiler, `20261025050000_terminos_por_alquiler.sql:57-60`), la 1.10-demo en
  `/terminos-1-10` y `/privacidad-1-10`, y la 1.11-demo en `/terminos` y `/privacidad`.
- **Decisión de Legal (11:33 p. m.):** regla de archivo (cada versión publicada, byte a byte, en su ruta; `src/legal/archivo/8790b52/`) y
  **1.11-demo** para la edición de la cuenta con la reputación, fechada el día de la publicación, **sin volver a aceptar** (los fines y
  destinatarios no cambian). La 1.10-demo queda archivada tal como se publicó a las 10:45 p. m.; la 1.9-demo no cambia.
- **Privacidad (solo 1.11-demo):** «tu nombre visible (tu nombre y la inicial de tu apellido)» (coincide con `nombreVisible` y REP-01);
  frase del código de 6 números (coincide con `SEGUNDO_FACTOR` y `/api/codigo-correo`); «cierre del alquiler». Sigue «Pendiente de
  revisión por abogado».
- **Cuentas:** quien aceptó REP-01 en la 1.10-demo sigue con su perfil y sus registros (no se le vuelve a pedir); las aceptaciones nuevas
  guardan `1.11-demo · {fecha}` (`VERSION_TEXTOS`). Los alquileres de una persona ya creados en la 1.10-demo siguen en la 1.10-demo y
  enlazan `/terminos-1-10`; los nuevos nacen en la 1.11-demo. Al volver a entrar, la casilla del login aparece sin marcar (lógica del
  login sin cambios).
- **Publicación:** `node scripts/fecha-1-11.mjs` justo antes del merge (`src/legal/fecha-v111.ts`); sin fecha, el build de producción falla.
- **Publicada (26/10/2026):** fecha `26 de octubre de 2026` (commit `7e624e0`), merge `04e4424cb884af3ea06db6f1239b09409b12d8c0`, deploy
  `dpl_6RWVr6RpmUvXTjtNcLYh2Rxy8bqd` (READY 12:04 a. m. CR). Revisiones de producción y waitlist: `docs/prueba-completa.md`.
- **Para deshacer:** `git revert -m 1 <merge>` y redeploy de producción. `/terminos` vuelve a la 1.10-demo y `/terminos-1-10` deja de
  existir; los registros ya guardados con la 1.11-demo (aceptaciones del login, REP-01, alquileres locales de una persona) se quedan con
  esa etiqueta, pero ninguna ruta mostraría su texto (su link abriría la 1.6-demo, `rutaDe`), así que habría que volver a publicarla o
  guardarla como archivo.
