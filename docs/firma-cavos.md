# Firma con Cavos y ramp simulado en testnet (opción A · 26 de octubre de 2026)

Decisión de Katherine (26/10, 5:42 p. m. CR). Opción A **en rama, pendiente de su OK final**. Textos nuevos **pendientes de Legal**.

## Qué cambia
- **Entrar:** Cavos (`@cavos/kit` 0.4.2); al entrar se revisa que el aparato tenga la llave (`signMessage`).
- **Cada acción que mueve la cuenta segura** (pagar, «Todo bien, devolver», repartir, liberar, devolución automática) lleva una
  **prueba de Cavos**: la billetera firma `lockumi:<acción>:<alquiler>:<dirección>:<nonce>:<ts>` (`api/_lib/prueba-mensaje.ts`).
  El único `signMessage` está en `src/services/billetera.ts` (`firmarMensaje`).
- **El servidor revisa la prueba** (`api/_lib/prueba-cavos.ts`): dirección Cavos del participante, firma ed25519 (con o sin el prefijo
  `Cavos Signed Message`), clave = la cuenta o una firmante suya en Horizon con peso ≥ umbral medio, ±5 min, y nonce de un solo uso
  (`lk_pruebas_cavos`). Sin prueba válida: 401 «No pudimos confirmar tu firma. Vuelve a tocar el botón.».
- Con la prueba, **ejecuta Lockumi con sus llaves de rol** (plataforma = approver/serviceProvider/releaseSigner; mediador = disputeResolver).
  Sesión vencida: se repone del espejo (`src/services/sesionCavos.ts`) o se vuelve a entrar y se regresa al mismo alquiler.
- **Llave de acceso (passkey) obligatoria** (decisión de Katherine, 26/10, 8:53 p. m.): opción A **con** passkey, para que la misma
  cuenta firme desde cualquier dispositivo. Equivale a `secureStep: 'required'` de Cavos (como `meteorito-mvp/lib/config.ts:8-16`; aquí
  el kit se usa sin el modal, así que el paso lo hace la puerta de `Firmante.tsx`). Código reutilizable en `src/services/llave.ts`.
- El servidor **ya no firma por las personas** (se quitó la cuenta derivada de PR #54 para alquileres nuevos: `mi-cuenta`,
  `desplegar`, `fondear`, `FIRMA_SERVIDOR_TESTNET`).

## Llave de acceso (passkey) · `src/services/llave.ts`
- **Al crear la cuenta** (o al entrar con una que no la tiene): si la conexión dice que la cuenta no tiene llave (`passkeyRestore`
  falso), la llave se **crea sola** (`LlaveAutomatica` en `src/screens/Firmante.tsx` → `asegurarLlave` → `crearLlave` =
  `VaultClient.enrollPasskey`, lo mismo que `enrollPasskeyDefault` del `CavosProvider` de Meteorito con `secureStep: 'required'`).
  No hay pantalla ni botón «Crea tu llave de acceso»: solo «Entrando a tu cuenta…» y la línea «Confirma con Face ID o tu huella
  para proteger tu cuenta». Cavos guarda la llave envuelta con el PRF de la passkey y no puede abrirla.
- **Gesto en iOS/Safari:** `navigator.credentials.create` lo exige. Lockumi no lo llama: lo hace el vault de Cavos (origen
  `vault.cavos.xyz`, iframe con `allow="publickey-credentials-create"`), que abre su propia ventana «Add a passkey» con el botón
  «Create passkey»; ese toque dentro del vault es el gesto (`host.js` del vault, `showPasskey`; si el navegador no deja, ofrece
  «Continue in a Cavos window»). Si no se completa (cancelada o bloqueada), la misma línea muestra el error y «Intentar de nuevo»
  (un toque en la página de Lockumi, otro gesto válido).
- **Igual que Meteorito (27/10), una sola conexión:** el `CavosProvider` de Meteorito (`lib/cavosBridge.tsx:84-88`, `@cavos/kit/react`)
  hace un único `Cavos.connect` por entrada y, con vault y sin recuperación social, pasa `passkeyPrf` desde esa primera conexión
  (`appDeviceApproval === 'passkey'`; kit `react/index.mjs:1572-1575, 1623`). Lockumi (#57) conectaba SIN llave (`probarFirma`) y justo
  después otra vez CON llave (`consultarLlave`), sola y sin toque: en una cuenta nueva (iPhone Safari) fallaba o dejaba la cuenta
  registrada sin copia local y se veía «No pudimos abrir tu cuenta. Revisa tu conexión» (`consultarLlave` se tragaba el error). Ahora
  `conectarBilletera` siempre pasa `passkeyPrf` (`billetera.ts`), `probarCuenta` usa esa misma conexión (en caché) y su `llave`, y
  `consultarLlave` se quitó. El kit sigue en 0.4.2 (el provider de 0.4.2 hace lo mismo; bajar a 0.3.0 no es necesario).
- **Detalle técnico del error:** la pantalla «No pudimos abrir tu cuenta» muestra en texto pequeño `paso · tipo: mensaje`
  (`anotarFallo` / `detalleFallo` en `src/services/firmante.ts`; sin URL, correos ni textos largos; solo en memoria) para saber la causa.
- **Dispositivo nuevo sin la llave de la cuenta** (`needs-device-approval`): el botón «Entrar con mi llave de acceso» recupera la llave
  con la passkey (`aprobarConLlave`, `passkeyPrf`; el vault pide la passkey). Si falla, un texto corto dice cómo resolverlo.
- Solo se recuerda `lockumi.llave.<correo> = creada` (para no preguntar en cada entrada). Nunca la llave ni la passkey.
- **Para otros flujos que creen cuentas** (p. ej. `fondeo-testnet`): `asegurarLlave(email)` (crear) y `recuperarConLlave(email)`
  (dispositivo nuevo); devuelven `{ ok }` o `{ ok: false, mensaje }` (ya en español) y se llaman desde un toque de la persona (el
  navegador lo exige). `BotonLlave` (`src/screens/Firmante.tsx`) los envuelve con los botones y estilos existentes.
- Si algún día se activa la recuperación social de Cavos, Meteorito pasa a `secureStep: 'optional'`; aquí queda `'required'` (`SECURE_STEP`)
  hasta que Katherine decida otra cosa.
- Origen: solo la parte de passkey del PR #53 (commit d08526d); no se trajo la oferta con «Ahora no».

## Activar la cuenta como Meteorito (sin Friendbot) · `api/_lib/activacion.ts`
Decisión de Katherine (26/10, 9:13 p. m.): idéntico a Meteorito. Antes de pagar (y el dueño, al reclamar), la **plataforma crea la cuenta con
0 XLM y paga las reservas como patrocinador; la persona firma con Cavos la línea de confianza de USDC** (acción `activar-cuenta` de `/api/tw`,
prueba de Cavos incluida). Ya no hay Friendbot en ninguna parte del repo ni compra de USDC con XLM propio por la persona. Detalle: [fondeo-testnet.md](fondeo-testnet.md).
Las cuentas viejas con llave perdida se **abandonan** (sin «cuenta nueva» ni `appSalt` nuevo): la passkey obligatoria vale para todos.

## SIMULACIÓN TESTNET: el ramp
- `pagar` crea la cuenta segura y la **fondea Lockumi desde su tesorería** (plataforma) con USDC de prueba, como el `mockRampFund`
  de Meteorito. La tesorería compra el USDC que falte con XLM (path payment en testnet). Queda en el historial como fondeo simulado.
- `api/_lib/rampSimulado.ts` se niega fuera de testnet (passphrase, `RED_ACTIVA`, `HORIZON_URL`, `TRUSTLESS_WORK_BASE_URL`).
- **Cómo cambiarlo por un ramp real:** implementar la interfaz `Ramp` (`fondear(pedido)`) y cambiar **solo** la línea
  `export const rampActivo: Ramp = rampSimulado`. Nada más llama al ramp.

## Alquileres de antes (hasta que cierren)
- Con cuenta derivada de PR #54 (la dirección guardada es la derivada de esa cuenta): el servidor sigue firmando con ella, sin prueba.
- Con aprobador = billetera Cavos del dueño: «Todo bien, devolver» sigue pidiendo `signXdr` a Cavos (`enviar`, paso `aprobar`).
- Repartir, liberar y devolución automática piden la prueba a las cuentas Cavos. La corrida diaria (cron) no cambia.

## Migración (NO aplicada)
- `supabase/migrations/20261026110000_pruebas_cavos.sql` (tabla de nonces usados, solo `service_role`; acepta las acciones de prueba, incluida `activar-cuenta`).
  Vuelta atrás: `supabase/revert/20261026110000_pruebas_cavos_revert.sql`. Sin ella el servidor responde 503 en las acciones con prueba.

## Textos nuevos (pendientes de Legal)
Cuenta sin llave: «Crea tu llave de acceso» · «Es un solo paso. Con ella entras a tu cuenta desde cualquier dispositivo.» · «Crear llave de acceso».
Dispositivo nuevo: «Usa tu llave de acceso para entrar desde este dispositivo.» · «Entrar con mi llave de acceso».
Errores: ver `TEXTOS_LLAVE` (navegador sin llaves, cancelado, sin llave en la cuenta, no se abrió, sesión cerrada, conexión). A mitad de una acción: `NO_FIRMANTE`.

## Pruebas
- `src/services/__tests__/firma-cavos.test.ts`: rechazos sin prueba válida (falta, otra llave, otra cuenta, otra acción o alquiler,
  vencida, alterada, nonce repetido, sin tabla), ramp, idempotencia, negativa fuera de testnet y alquileres de antes.
- `src/services/__tests__/llave.test.ts`: paso obligatorio al crear, recuperar en dispositivo nuevo y cada error con su texto.
- `src/__tests__/cavos-sin-firma-silenciosa.test.ts`: `signMessage` solo en `billetera.ts` (pendiente OK de Legal).
- `scripts/e2e-c.mjs --simulado`: el recorrido de dos cuentas con pruebas.

## Falta para la prueba real con dos cuentas Cavos (leído en solo lectura el 26/10, 9:20 p. m. CR)
1. **Migración:** producción llega a `20261026100000`; falta `20261026110000_pruebas_cavos` (no existe `lk_pruebas_cavos`). Sin ella el servidor responde 503 en las acciones con prueba. Aplicarla solo con OK de Katherine.
2. **Tesorería** (`GCTLNUBV…TJ4G`, la misma que la variable de producción): 9 234,09 XLM y 42,985 USDC. Alcanza para varias pruebas; cada cuenta patrocinada cuesta ~1,5 XLM.
   **Variables de Vercel:** las que usa el código ya están en producción (`LOCKUMI_TW_PLATAFORMA_SECRET`, `LOCKUMI_TW_MEDIADOR_SECRET` y `_PUBLICA`, `TRUSTLESS_WORK_API_KEY`, `SUPABASE_*`, `VITE_CAVOS_APP_ID`, `VITE_TRUSTLESS`, `VITE_DOS_PERSONAS`/`LOCKUMI_DOS_PERSONAS`); este PR no pide ninguna nueva.
3. **Orígenes de Cavos:** el servidor de Cavos responde CORS abierto (no revela la lista); la lista real está en el panel de Cavos. app.lockumi.com ya inicia sesión con Cavos en producción, pero la **passkey** (WebAuthn) y las URL de vista previa de Vercel hay que confirmarlas en el panel o probando en app.lockumi.com.
4. Confirmar en testnet que Trustless Work acepta approver = plataforma (misma cuenta que serviceProvider/releaseSigner).
5. Dos cuentas Cavos en sus aparatos originales, y la llave de acceso probada en un segundo dispositivo real (el vault pide la passkey en su ventana; no se puede simular). 6. OK de Katherine y de Legal (textos y `signMessage`).
