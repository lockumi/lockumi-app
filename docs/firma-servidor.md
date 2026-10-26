# Firma del servidor en testnet y eliminar antes del pago (PR #54 · 26 de octubre de 2026)

Merge `a1dfc6d` en `master`. Aprobado por Katherine (26/10, 2:02 p. m. CR: «Sí, el servidor firma en testnet»).
Vuelta atrás: `git revert -m 1 a1dfc6d` y, para el borrado, `supabase/revert/20261026090000_eliminar_sin_deposito_revert.sql`.

## Solo red de prueba
- Todo esto existe **solo en la red de prueba de Stellar (testnet)**, con USDC de prueba sin valor.
- `firmaServidorActiva` (`api/_lib/tw.ts`) devuelve un error 500 si la red o `HORIZON_URL` no son de testnet: fuera de testnet el
  servidor nunca firma por nadie.
- **En la red principal (mainnet) cada persona firma con su propia billetera de Cavos.** El servidor nunca guarda ni usa llaves de
  personas reales con dinero real.

## Firma del servidor (alquileres nuevos de dos personas)
- Cavos sirve solo para entrar. Para firmar, cada cuenta tiene **su propia cuenta de testnet**, derivada en el servidor
  (HMAC-SHA256 con el id de la cuenta y la etiqueta `ETIQUETA_FIRMA_SERVIDOR`; distinta de las llaves de la demo de una persona).
  Friendbot la fondea y se le agrega la línea de confianza de USDC si falta. La llave **nunca sale del servidor**.
- `/api/tw`: `mi-cuenta` devuelve solo la dirección pública; `preparar-cuenta` (máximo 12 por hora y por cuenta) la deja lista;
  `fondear` (inquilino) y `aprobar` (dueño) firman y envían en el servidor si la cuenta del alquiler es la derivada de la sesión.
  Se exige la sesión y que la persona sea participante con ese rol.
- Solo alquileres **nuevos**: los alquileres de antes (y las cuentas sueltas GAOSHY…, GBWWTI…, GCSMN7…) siguen con Cavos.
  La demo de una persona (`api/_lib/solo.ts`) no cambia.
- **Interruptor:** `FIRMA_SERVIDOR_TESTNET=0` en Vercel (y volver a publicar) lo apaga; sin la variable está encendido.
  Apagado, el pago y la aprobación vuelven a pedir la firma con Cavos.
- Tests: `src/services/__tests__/firma-servidor.test.ts` y `deposito-trustline.test.ts`.

## Eliminar antes del pago
- El dueño puede eliminar un alquiler de dos personas en «firmas» o «pendiente_pago» mientras el depósito no esté pagado,
  aunque la otra persona ya haya aceptado. Mismo botón y misma confirmación; sin textos nuevos.
- El servidor (`/api/tw`, acción `eliminar`) lee la cuenta segura en la red (Trustless Work con `validateOnChain=true`): solo borra
  si no hay cuenta segura o si su saldo es exactamente 0, sin liberar y sin reclamo. Con depósito responde «Este alquiler tiene un
  depósito guardado.». El borrado lo hace `lk_eliminar_sin_deposito` (migración `20261026090000_eliminar_sin_deposito.sql`,
  aplicada en producción el 26/10; solo `service_role` puede usarla), que llama a `lk_borrar_alquiler` (borrado real, ver
  [eliminar-alquiler.md](eliminar-alquiler.md)).
- Test: `src/services/__tests__/eliminar-sin-deposito.test.ts`.

## Límites conocidos
- La firma del servidor solo se usa con el modo de dos personas encendido (`VITE_DOS_PERSONAS=1`).
- Para depósitos de más de 20 USDC, el cambio de XLM a USDC en la red tiene un tope de 9000 XLM.
- El límite de 12 preparaciones por hora se cuenta en cada instancia del servidor, no en total.
- Dos transacciones del servidor a la vez desde la misma cuenta no se ponen en fila.
- Hay una pequeña carrera entre leer el saldo y borrar; la cuenta segura vacía de un alquiler borrado queda en la red.
- La vista previa de «Reiniciar mi demo» puede contar como eliminables alquileres de dos personas que el servidor solo oculta.
