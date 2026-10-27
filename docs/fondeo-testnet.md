# Fondeo en testnet «estilo Meteorito» (26 de octubre de 2026 · decisión de Katherine, 9:13 p. m. CR)

Va **dentro del PR #57** (rama `cavos-firma`, borrador, sin publicar). Sustituye al PR #58 (`fondeo-testnet`), que se cerró: no se
usa Friendbot para las personas, no se fondea a cuentas viejas y no hay «cuenta nueva».
Solo red de prueba, USDC de prueba sin valor. Idéntico a Meteorito (`meteorito-mvp`): `api/wallet/activate.ts` + `api/_lib/wallet.ts`
y `mockRampFund` (`api/_lib/escrow.ts`, `api/escrow/pay.ts`).

## Cómo funciona (3 pasos)
1. **Activar la cuenta** (`api/_lib/activacion.ts`, acción `activar-cuenta` de `/api/tw`; cliente `activarCuenta` en `src/services/trustless.ts`).
   Si la dirección Cavos de la persona no existe o no tiene la línea de confianza de USDC, la **plataforma crea la cuenta con 0 XLM propios y
   paga las reservas como patrocinador** (CAP-33: `beginSponsoringFutureReserves` → `createAccount` → `changeTrust` → `endSponsoringFutureReserves`)
   y paga el fee. **La persona firma con Cavos (`signXdr`) la línea de confianza**; la plataforma nunca toca su llave ni sus fondos.
   `estado` (solo lee) → `preparar` (exige la prueba de Cavos `activar-cuenta`, de un solo uso) → `enviar` (el servidor revisa la forma exacta
   de la transacción y la firma de la persona, firma como patrocinador y envía a Horizon).
2. **Pagar** (`pagar`, sin cambios de #57): prueba de Cavos del inquilino → Lockumi crea la cuenta segura de Trustless Work → el **ramp
   simulado** (`api/_lib/rampSimulado.ts`, como `mockRampFund`) la fondea con USDC de prueba **desde la tesorería** (la cuenta de la plataforma;
   compra con XLM el USDC que le falte). El comprador solo firma la prueba de dirección. **La cuenta segura bloquea siempre USDC.**
3. **Al reclamar** el dueño también deja lista su cuenta (mismo `activar-cuenta`), para poder recibir USDC en un reparto.

## Qué se quitó
Friendbot y la compra de USDC con XLM propio **en el flujo de dos personas**; el fondeo al iniciar sesión y el retroactivo de cuentas
viejas (`fondear-cuenta`); el botón «Crear cuenta nueva», el `appSalt` nuevo, la migración `20261026200000_cuenta_nueva` y su revert,
y `lk_cuentas_historial`. Las cuentas viejas se abandonan: nadie tiene una rama especial; la llave de acceso (passkey) es obligatoria
para todos al crear la cuenta (`docs/firma-cavos.md`).

## Qué sigue usando Friendbot (aparte de esto, a decidir)
- El **flujo de una persona** (`src/services/solo.ts`, `api/_lib/solo.ts`, «Usar mi propio USDC de prueba»): la cuenta propia se fondea con Friendbot.
- La **cuenta del servidor de alquileres de antes** (PR #54, `prepararCuentaLegado` en `api/_lib/tw.ts`): hasta que esos alquileres cierren.

## Solo testnet y límites
- `activar-cuenta` se niega fuera de testnet (`soloTestnet` → `exigirRampTestnet`) y la red y los servicios están fijos en `api/_lib/red.ts`.
- Sin variables nuevas: usa `LOCKUMI_TW_PLATAFORMA_SECRET` (ya existe). Límite: 12 preparaciones por hora y cuenta (en memoria, por instancia).
- Cada cuenta patrocinada cuesta a la plataforma ~1,5 XLM de reserva (cuenta + línea) y el fee; con 9 234 XLM sobra.
- La migración `20261026110000_pruebas_cavos.sql` (sin aplicar en producción) ahora acepta también la acción `activar-cuenta`.
- **Sin verificar en vivo:** que `signXdr` de Cavos firme una transacción cuyo origen es la plataforma (así lo hace Meteorito) y la passkey en un
  navegador real. Los tests (`src/services/__tests__/activacion.test.ts`, `deposito-trustline.test.ts`) usan red falsa.

## Falta para la prueba con datos reales (leído el 26/10, 9:20 p. m. CR)
Ver la lista al final de `docs/firma-cavos.md`.
