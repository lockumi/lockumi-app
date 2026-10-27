# Fondeo automático en testnet y cuenta nueva (rama `fondeo-testnet` · 26 de octubre de 2026)

**Estado: PR en borrador, sin publicar y sin migración aplicada en producción.** Pedido de Katherine (26/10, 8:48 p. m. y 8:52 p. m. CR).
Vuelta atrás: cerrar el PR; para la base, `supabase/revert/20261026200000_cuenta_nueva_revert.sql`. Apagado inmediato: quitar
`LOCKUMI_FONDEO_TESTNET` y `LOCKUMI_CUENTA_NUEVA` en Vercel.

## Para qué
Poder probar **todo** el flujo en testnet: que cada cuenta Cavos tenga XLM, la línea de confianza de USDC y USDC de prueba para pagar el
depósito y congelarlo en el escrow de Trustless Work. Solo red de prueba, sin valor.

## Cómo funciona
1. **Al iniciar sesión** (`src/services/billetera.ts`, después de `Cavos.connect`) la app pide el fondeo en segundo plano
   (`src/services/fondeoTestnet.ts` → `/api/tw`, acción `fondear-cuenta`). Si falla, no pasa nada: no bloquea el acceso.
2. **El servidor** (`api/_lib/fondeo.ts`) crea la cuenta con Friendbot (XLM) y, si la cuenta ya tiene la línea de confianza de USDC,
   le envía los USDC de prueba desde la **cuenta de la plataforma** (`LOCKUMI_TW_PLATAFORMA_SECRET`, la misma que ya usa Trustless Work).
   Sin tokens nuevos: el USDC de Circle de testnet que ya usa el repo.
3. **Al pagar** (`prepararCuentaCavos` en `src/services/solo.ts`) la app pide el fondeo otra vez: la persona firma la línea de confianza
   con su Cavos (`addTrustline`) —no se puede hacer desde el servidor— y el servidor envía el USDC. Si el fondeo sigue pendiente, el pago
   dice: «Estamos preparando tu cuenta de prueba. Espera un minuto y vuelve a tocar el botón.» (`MENSAJE_FONDEO_PENDIENTE`).

## Una sola vez (idempotente) y retroactivo
- No hay tabla nueva: la marca de «ya fondeada» es la red. Se fondea solo si la cuenta tiene menos USDC que el monto **y** la
  plataforma nunca le envió USDC (lectura de pagos en Horizon). Cuentas con saldo suficiente no reciben nada.
- Sirve igual para cuentas creadas antes: al iniciar sesión o al pagar, si no tienen saldo, se fondean una vez.
- Dos pedidos a la vez pagan una sola vez por instancia. Límite conocido: entre instancias distintas de Vercel el cierre es en memoria;
  lo que cubre ese hueco es la lectura de pagos en la red (puede tardar unos segundos en verse).
- Límite de 12 pedidos por hora y por cuenta (el mismo `limitarPreparar` de `api/_lib/tw.ts`, en memoria por instancia).

## Solo testnet
`exigirTestnet` (`api/_lib/red.ts`) rechaza cualquier red, Horizon o Friendbot que no sea de testnet. Sin `LOCKUMI_FONDEO_TESTNET=1` la
acción responde `apagado` y no toca la red. El monto (`LOCKUMI_FONDEO_USDC`, por defecto y como máximo 20, el `TOPE_USDC`) no pasa del tope.

## Cuentas con llave de Cavos perdida: cuenta nueva con passkey
Sin la llave no se puede firmar la línea de confianza (GCSMN7… y GBWWTI… existen en testnet con 10 000 XLM, un solo firmante y sin línea
de USDC; GAOSHY… no está en la base). Solución aprobada:
- Si el pago falla porque la billetera no puede firmar, aparece un texto corto y el botón **«Crear cuenta nueva»**
  (`src/screens/CuentaNueva.tsx`): «Si no puedes entrar a tu cuenta anterior, crea una cuenta nueva. Tus alquileres sin depósito pasan a ella.»
- La cuenta Lockumi (mismo correo) recibe una wallet Cavos **nueva**: otro `appSalt` (`lockumi-2`, `lockumi-3`…, según el número de
  cuenta guardado en la base). Las cuentas de antes siguen con `lockumi`: la dirección de nadie cambia. Se crea con **passkey obligatoria**
  (`VaultClient.enrollPasskey` de `@cavos/kit` 0.4.2; `secureStep` es solo una propiedad del modal React de Cavos) y se fondea completa.
- **La cuenta vieja no se borra:** queda en `lk_cuentas_historial` (migración `20261026200000_cuenta_nueva.sql`, con revert).
- Alquileres de la cuenta vieja: **(a) sin cuenta segura o sin depósito:** pasan a la nueva (en la base y, si ya existe la cuenta segura con saldo 0,
  con `update-escrow` de Trustless Work firmado por la plataforma). **(b) Con depósito:** no se tocan; terminan con las llaves que ya
  tienen. Si alguno necesitara firmar con la cuenta vieja de Cavos, solo se reporta (propuesta: que lo firme el servidor con su cuenta derivada
  de testnet, ver [firma-servidor.md](firma-servidor.md), o liberar/devolver con la plataforma, que ya firma esos pasos).
- Lectura de la base de producción (solo lectura, 26/10): 9 alquileres de esas cuentas; **(a) 8** (7 en «firmas» sin cuenta segura, 1 en «pendiente_pago» sin cuenta segura) y
  **(b) 1** (cerrado, con depósito, ya liquidado por la plataforma: no necesita firma de Cavos). 0 necesitan `update-escrow` hoy.
- Interruptor: `LOCKUMI_CUENTA_NUEVA=1` (apagado por defecto: «Esta opción no está disponible ahora.»), solo testnet, mismo límite por hora.

## Variables (Vercel)
| Variable | Dónde | Qué hace |
|---|---|---|
| `LOCKUMI_FONDEO_TESTNET` | Servidor | `1` enciende el fondeo. Sin ella, apagado. |
| `LOCKUMI_FONDEO_USDC` | Servidor | USDC de prueba por cuenta (por defecto y máximo 20). |
| `LOCKUMI_CUENTA_NUEVA` | Servidor | `1` permite crear la cuenta nueva (requiere aplicar la migración). |

Hace falta que la cuenta de la plataforma tenga USDC de prueba (≥ 20 por persona a fondear). Si no alcanza, el servidor responde
`tesoreria-sin-saldo` y el pago pide esperar. Para recargarla hay que enviarle USDC de prueba a esa cuenta (faucet de Circle para testnet).

## Qué NO se pudo verificar en vivo
Los tests usan una red falsa. Sin probar con Cavos real en el navegador: la wallet nueva con otro `appSalt`, el enrolamiento de passkey
y que el origen de la app esté permitido en Cavos; y sin probar en vivo el payload de `update-escrow` de Trustless Work (hoy no hay
alquileres que lo necesiten). Antes de usarlo con personas: aplicar la migración (con aprobación) y probar con una cuenta de prueba.

## Tests
`src/services/__tests__/fondeo-testnet.test.ts` (fondeo, idempotencia, mainnet rechazada, faucet caído, tesorería sin saldo, cuenta nueva)
y `src/servidor/__tests__/cuenta-nueva-sql.test.ts` (migración y revert en PGlite).
