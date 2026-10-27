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
  No hay passkey ni paso visible nuevo. Sin llave en el aparato: el mensaje corto de siempre (NO_FIRMANTE). Sesión vencida: se repone
  del espejo (`src/services/sesionCavos.ts`) o se vuelve a entrar y se regresa al mismo alquiler.
- El servidor **ya no firma por las personas** (se quitó la cuenta derivada de PR #54 para alquileres nuevos: `mi-cuenta`,
  `desplegar`, `fondear`, `FIRMA_SERVIDOR_TESTNET`).

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

## Pruebas
- `src/services/__tests__/firma-cavos.test.ts`: rechazos sin prueba válida (falta, otra llave, otra cuenta, otra acción o alquiler,
  vencida, alterada, nonce repetido, sin tabla), ramp, idempotencia, negativa fuera de testnet y alquileres de antes.
- `src/__tests__/cavos-sin-firma-silenciosa.test.ts`: `signMessage` solo en `billetera.ts` (pendiente OK de Legal).
- `scripts/e2e-c.mjs --simulado`: el recorrido de dos cuentas con pruebas.

## Falta para la prueba real con dos cuentas Cavos
1. Aplicar la migración en la base de prueba (no en producción sin OK).
2. Tesorería (plataforma) con XLM/USDC en testnet.
3. Confirmar en testnet que Trustless Work acepta approver = plataforma (misma cuenta que serviceProvider/releaseSigner).
4. Dos cuentas Cavos en sus aparatos originales. 5. OK de Katherine y de Legal (textos y `signMessage`).
