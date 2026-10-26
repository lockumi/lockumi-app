# Paso 21 · El link del correo de invitación (25/10/2026, rama local `paso21-invitacion-fix`, sin publicar)

## Qué pasaba
- La persona invitada abría el botón del correo y la app se abría **sin la invitación**: después de entrar caía en Inicio, sin alquileres.
- Causa: el botón del correo (COR-C-00) apuntaba a la raíz de la app. En master f6e3254, `api/_lib/correo.ts:81`: `botones = [{ texto: BOTON_INVITACION, url: \`${origen}/\` }]`. Además, la app no mandaba el token al pedir el correo (`src/prueba/invitacion.ts`, `enviarInvitacionUnaVez`; `src/screens/Crear.tsx:199`), así que el servidor no podía armar el link.
- Sin `#/invitacion/<alquiler>/<token>` en la dirección, `src/App.tsx:40` no guardaba a dónde volver y `volver()` daba `/`. El resto (la ruta de la invitación, unirse y «Tus alquileres») funcionaba si se abría el link copiado a mano.

## Por qué el E2E-C (111 pasos) no lo vio
`scripts/e2e-c.mjs` no abre un navegador ni el correo: arma el correo con `atenderCorreo` (`:208-211`) y solo revisa que salga y quede registrado. La persona invitada se une llamando directo a `lk_ver_invitacion` y `lk_aceptar_invitacion_con_terminos` con el token que devuelve `lk_crear_contrato_con_terminos` (`:229-235`). La dirección del botón nunca se probó.

## Arreglo
- **Servidor (`api/_lib/correo.ts`)**: el pedido de invitación trae `token` (64 hex) y `alquiler` (UUID); el botón y el texto plano llevan a `enlaceInvitacion(origen, alquiler, token)` = `<origen>/#/invitacion/<alquiler>/<token>`. Con Supabase, `exigirTokenVigente` compara el SHA-256 del token con `lk_contratos.invitacion_hash` **antes** de gastar el único correo (409 «El link de esta invitación ya no sirve…» si no coincide). Sin token (una app vieja en caché) el botón sigue abriendo la app, como antes.
- **App**: `Crear` manda `tokenDeLink(r.link)`; `src/regreso.ts` guarda la ruta de la invitación en sessionStorage y, de respaldo, en localStorage por 30 minutos (por si el regreso de Google o Apple o el correo abren otra pestaña). Solo guarda rutas `/invitacion/<uuid>/<64 hex>` y se borra al usarla.
- **Pantalla Entrar sin sesión** (texto de Legal, sin el nombre del dueño): «Te invitaron a un alquiler en Lockumi. Inicia sesión para ver y aceptar la invitación.» Es el mismo `Login` con los mismos botones (Google, Apple, correo); solo cambia el título (`Login titulo`). No hay servicio que dé el nombre del dueño (Legal lo quitó).
- **Mensaje del dueño** (texto de Legal): con correo enviado, «Te enviamos el enlace a {correo}. Si quieres, también puedes copiarlo y compartirlo por WhatsApp.»; sin correo, solo el link con «Copiar link» y «Compartir por WhatsApp» (texto nuevo del botón, pendiente del OK de Legal). Sale «Tiene que entrar con ese correo.».

## Pruebas
- `src/prueba/__tests__/paso21-invitacion.test.tsx` (15): href del botón con y sin token (HTML y texto), token y alquiler inválidos, token que no es el vigente (409, sin registrar ni llamar a Resend), la app manda el token y guarda el correo solo si salió, regreso (una vez, respaldo de 30 min, solo rutas de invitación), título de Entrar, tarjeta del dueño con y sin correo, reglas del inquilino sin campos.
- `src/servidor/__tests__/reglas-solo-dueno-sql.test.ts` (4, PGlite con todas las migraciones): el inquilino **no puede** cambiar las reglas (`update`/`delete` → permission denied, también como anon y como dueño después de crear); ninguna función `lk_*` las cambia salvo al crear; y deja escrito quién puede aceptar (ver abajo).
- **E2E del link real:** `npm run e2e:invitacion` (`scripts/paso21-invitacion/e2e-enlace.mjs`). Vite local contra el Supabase de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el dueño crea invitando con la app; `/api/correo` lo atiende el `atenderCorreo` real con Resend falso; el href del botón se abre en un **navegador nuevo sin sesión**; la invitada entra con «Continuar con tu correo» (proveedor simulado) y tiene que llegar a la invitación, aceptarla y ver el alquiler en «Tus alquileres». Con `RAIZ=<copia de master> ANTES=1` corre la versión anterior solo para capturas (cae en Inicio). El token nunca se imprime ni queda en las capturas.
- Hoja de capturas: `prueba-completa/capturas/paso21-invitacion/hoja-paso21-invitacion.jpg` (fuera del repo; `scripts/paso21-invitacion/hoja.py`).

## Quién puede aceptar (pregunta de Legal; sin cambios)
- La app solo deja aceptar a quien entró con el correo invitado (`src/screens/Invitacion.tsx:47-48`).
- El servidor compara `p_email_cavos`, que **manda la app**, con el correo invitado (`supabase/migrations/20261017000000_lockumi_e2e.sql:197`). La sesión de Supabase es anónima, así que la base no sabe con qué correo entró la persona: quien tenga el link y escriba ese correo llamando a la API podría unirse.
- Lo que sí ata: el token (solo su hash está guardado), **un solo uso** (`:202`, el primero que acepta gana y el link deja de servir), vence a los 7 días, y el dueño no puede aceptar su propia invitación. Probado en `reglas-solo-dueno-sql.test.ts`.

## Reglas: solo el dueño
- Servidor: `lk_contratos` solo tiene `select` para `authenticated` (`20261017000000_lockumi_e2e.sql:384-395`), y las reglas solo se escriben al crear (`lk_crear_contrato`, `:155-175`, quien crea queda como dueño). El inquilino no tiene cómo cambiarlas.
- App: el inquilino ve las reglas como texto en la invitación (`Invitacion.tsx:46`) y en el contrato (`ContratoDoc.tsx:32-33`). No hay botón de **rechazar** la invitación (solo «Aceptar invitación», `Invitacion.tsx:24`): falta texto de Legal.
