# Fondeo en testnet «estilo Meteorito» (26 de octubre de 2026 · decisión de Katherine, 9:13 p. m. CR)

Va **dentro del PR #57** (rama `cavos-firma`, borrador, sin publicar). Sustituye al PR #58 (`fondeo-testnet`), que se cerró: no se
usa Friendbot (nunca más, ver abajo), no se fondea a cuentas viejas y no hay «cuenta nueva».
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

## Friendbot: fuera de todo el PR (26/10, 9:38 p. m., aprobado por Katherine)
Ya no hay Friendbot en ningún archivo de código, script ni texto vigente. Quien lo usaba ahora lo hace la **tesorería (la cuenta de la plataforma)**,
solo testnet, con `crearCuentaDesdeTesoreria` (`api/_lib/activacion.ts`): `createAccount` con **5 XLM de prueba** (`XLM_CUENTA_PRUEBA`; idempotente: si la cuenta
ya existe no hace nada y reintenta si el número de secuencia de la plataforma choca). No se usa la reserva patrocinada aquí porque estas cuentas **firman
su propia transacción y pagan su fee**, así que necesitan XLM; las de dos personas siguen con reserva patrocinada y 0 XLM (arriba).
- **Demo de una persona** (`api/_lib/solo.ts`, `src/services/solo.ts`): `crear-cuenta {cuenta}` crea la cuenta de la persona (Cavos, Freighter o la de prueba del servidor);
  `usdc-cuenta {cuenta, monto}` (tope `TOPE_USDC` = 20) manda desde la tesorería el USDC que falte a una cuenta que ya tiene la línea de USDC (503 con
  «recarga» si la tesorería no lo tiene). **Ya no se compra USDC en el DEX por la persona** (`cotizar`/`maximoAGastar` se quitaron); la tesorería sí puede comprarlo
  para sí misma (`asegurarUsdcTesoreria`, no visible para la persona). `completarPrueba` = cuenta + línea + USDC de la tesorería.
- **Cuentas del servidor de los alquileres de antes (PR #54)** (`prepararCuentaLegado`, `api/_lib/tw.ts`): la crea la tesorería. Los alquileres con depósito ya existente no cambian
  (la acción `crear-cuenta` no toca cuentas que ya existen; sus llaves derivadas y sus depósitos siguen igual).
- **Scripts de desarrollo:** `scripts/crear-cuenta-testnet.mjs` (`crearCuenta(g, xlm)`, lee `LOCKUMI_TW_PLATAFORMA_SECRET` del entorno, nunca lo imprime) lo usan
  `e2e-solo`, `e2e-testnet-tw`, `e2e-c`, `preparar-testnet`, `probar-trustline-cavos` y `probar-firma-cavos` (no se corrieron en vivo en esta fase).
- **Costo:** ~5,5 XLM por cuenta; la tesorería tiene 9 234 XLM. USDC: ~43 USDC al 26/10 (el tope por pedido es 20).
- **Textos legales:** Términos y Privacidad 1.14-demo (sin Friendbot); la 1.13-demo y la 1.9-demo archivadas conservan lo que se publicó.

## Solo testnet y límites
- `activar-cuenta` se niega fuera de testnet (`soloTestnet` → `exigirRampTestnet`) y la red y los servicios están fijos en `api/_lib/red.ts`.
- Sin variables nuevas: usa `LOCKUMI_TW_PLATAFORMA_SECRET` (ya existe). Límite: 12 preparaciones por hora y cuenta (en memoria, por instancia).
- Cada cuenta patrocinada cuesta a la plataforma ~1,5 XLM de reserva (cuenta + línea) y el fee; con 9 234 XLM sobra.
- La migración `20261026110000_pruebas_cavos.sql` (**aplicada en producción el 26/10, 9:38 p. m.**, aditiva) acepta también la acción `activar-cuenta`.
- **Sin verificar en vivo:** que `signXdr` de Cavos firme una transacción cuyo origen es la plataforma (así lo hace Meteorito) y la passkey en un
  navegador real. Los tests (`src/services/__tests__/activacion.test.ts`, `deposito-trustline.test.ts`) usan red falsa.

## Falta para la prueba con datos reales (leído el 26/10, 9:20 p. m. CR)
Ver la lista al final de `docs/firma-cavos.md`.

## La cuenta de la persona se guarda al pagar si faltaba (27/10/2026)
- **Qué pasó (prueba real en producción, 27/10, 9:59 a. m. CR):** el inquilino tenía la sesión de Cavos caducada en su navegador (perfil que volvía horas después) y **aceptó la invitación sin billetera conectada**: el
  alquiler quedó con `lk_participantes.direccion_stellar` vacía. Después entró de nuevo, firmó y tocó «Pagar»; `activar-cuenta` (paso `estado`) contestó 409 «Falta la cuenta Stellar del inquilino.» y el pago no avanzó.
  `lk_actualizar_direccion` existía pero ninguna pantalla la llamaba.
- **Arreglo (`src/services/trustless.ts`, `activarCuenta`):** si el alquiler no trae la cuenta de esa persona (`esperada` vacío), antes de preguntar al servidor se guarda la de la billetera conectada con `servidor.actualizarCuenta`
  (RPC `lk_actualizar_direccion`: solo su propia fila y solo mientras no exista la cuenta segura). Si guardar falla, no se corta el pago: sigue y decide el servidor. Alquileres con la cuenta ya guardada o con cuenta del servidor (PR #54): sin cambios.
- **Pruebas:** `src/services/__tests__/deposito-trustline.test.ts` (3 casos nuevos: guarda antes de consultar y paga; si guardar falla sigue; con cuenta ya guardada no vuelve a guardar).
- Sin cambios de diseño, de flujo ni de base de datos.

## La cuenta del dueño se guarda al firmar si faltaba (U4, 27/10/2026)
- **Qué pasó (prueba real en producción, alquiler `d475db0a…`, 27/10, 11:36 a. m. CR):** el dueño entró solo con su llave de acceso (sin token de Cavos en la pestaña), creó el alquiler y firmó el contrato.
  El alquiler quedó con la `direccion_stellar` del dueño vacía (`repositorio.ts`, `p_direccion_stellar: cuenta ?? null`). El inquilino firmó y tocó «Pagar»: `activar-cuenta` dio 200 `listo` para él y
  después el servidor contestó 409 «Falta la cuenta Stellar del dueño.» (`cuenta()` en `api/_lib/tw.ts`). No se movió dinero. La firma del dueño no pasa por `ConSesion` (solo la del inquilino y el pago),
  y el único arreglo posterior (`prepararDueno` → `activarCuenta`) corre al abrir un reclamo, después del pago.
- **Arreglo (`src/services/trustless.ts`, `guardarCuentaSiFalta`; `src/acciones.ts`, `firmar`):** al firmar el contrato con Trustless Work, si el alquiler no trae la cuenta de quien firma,
  antes de firmar se guarda la de la billetera conectada con `servidor.actualizarCuenta` (RPC `lk_actualizar_direccion`, igual que #62). Si no hay billetera o guardar falla, la firma sigue igual (no se corta nada).
- **Respaldo para quien ya firmó (`src/screens/Detalle.tsx`, `Pago`):** cuando el dueño abre el alquiler en «pendiente de pago» y su cuenta falta, la app la guarda en segundo plano (sin textos ni pantallas nuevas).
- **Límite (documentado, no resuelto aquí):** ambos caminos necesitan la sesión de Cavos del dueño. Sin token no hay dirección de billetera, así que un dueño que entra **solo con la llave de acceso** y no vuelve a entrar
  sigue dejando la cuenta vacía. El pago del inquilino **no** puede guardar la cuenta del dueño: la dirección solo vive en `lk_participantes` (por alquiler) y `lk_actualizar_direccion` solo cambia la fila de quien llama.
  El arreglo completo sería pedir sesión (`ConSesion`, componente y textos ya existentes) a la firma del dueño cuando falta su cuenta; es un cambio de flujo y necesita aprobación.
- **Pruebas:** `src/services/__tests__/cuenta-dueno-firma.test.ts` (guarda y luego firma; sin sesión firma igual; con cuenta no guarda; respaldo en `Pago`) y
  `src/servidor/__tests__/ciclo-dos-personas-sql.test.ts` («U4»: sin la cuenta del dueño, 409 «Falta la cuenta Stellar del dueño.»; con `lk_actualizar_direccion` del dueño, sigue).
- Sin cambios de diseño, de textos visibles ni de base de datos.
