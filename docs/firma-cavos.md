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
- **Al crear la cuenta** (o al entrar con una que no la tiene): después de la firma de prueba, la puerta consulta si la cuenta tiene
  llave (`consultarLlave`, `Cavos.connect` con `PasskeyPrf`; en un dispositivo que ya firma no pide nada). Sin llave: no se entra
  hasta crearla (`crearLlave` = `VaultClient.enrollPasskey`; Cavos guarda la llave envuelta con el PRF de la passkey y no puede abrirla).
- **Dispositivo nuevo sin la llave de la cuenta** (`needs-device-approval`): el botón «Entrar con mi llave de acceso» recupera la llave
  con la passkey (`aprobarConLlave`, `passkeyPrf`; el vault pide la passkey). Si falla, un texto corto dice cómo resolverlo.
- Solo se recuerda `lockumi.llave.<correo> = creada` (para no preguntar en cada entrada). Nunca la llave ni la passkey.
- **Para otros flujos que creen cuentas** (p. ej. `fondeo-testnet`): `asegurarLlave(email)` (crear) y `recuperarConLlave(email)`
  (dispositivo nuevo); devuelven `{ ok }` o `{ ok: false, mensaje }` (ya en español) y se llaman desde un toque de la persona (el
  navegador lo exige). `BotonLlave` (`src/screens/Firmante.tsx`) los envuelve con los botones y estilos existentes.
- Si algún día se activa la recuperación social de Cavos, Meteorito pasa a `secureStep: 'optional'`; aquí queda `'required'` (`SECURE_STEP`)
  hasta que Katherine decida otra cosa.
- Origen: solo la parte de passkey del PR #53 (commit d08526d); no se trajo la oferta con «Ahora no».

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
- `supabase/migrations/20261026110000_pruebas_cavos.sql` (tabla de nonces usados, solo `service_role`).
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

## Falta para la prueba real con dos cuentas Cavos
1. Aplicar la migración en la base de prueba (no en producción sin OK).
2. Tesorería (plataforma) con XLM/USDC en testnet.
3. Confirmar en testnet que Trustless Work acepta approver = plataforma (misma cuenta que serviceProvider/releaseSigner).
4. Dos cuentas Cavos en sus aparatos originales, y la llave de acceso probada en un segundo dispositivo real (el vault pide la passkey en su ventana; no se puede simular). 5. OK de Katherine y de Legal (textos y `signMessage`).
