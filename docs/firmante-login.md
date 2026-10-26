# Firmante al entrar y volver a entrar antes de pagar (PR #53, rama `passkey-otro-dispositivo`, sin publicar)

Aprobado por Katherine el 26/10/2026, 1:12 p. m. CR. Red de prueba de Stellar. No cambia el diseño ni la lógica de Cavos fuera de estos 4 puntos.

## Qué hace

1. **Puerta al entrar.** Después del regreso de Cavos (Google, Apple o correo), la app conecta la billetera **una vez** y firma el
   texto fijo `lockumi-login` (`signMessage`, gratis, no es una transacción ni mueve fondos). Si firma, entra. Si no, no entra.
   Solo se recuerda «sí/no puede firmar» por correo (`lockumi.firmante.<correo>`); la firma se descarta y no se guarda ningún token.
2. **Sesión perdida** (pestaña nueva o token vencido). Antes de pagar y antes de firmar el contrato en C, si esta pestaña no tiene
   sesión, en lugar del botón sale «Vuelve a entrar para seguir» con «Entrar de nuevo» (un toque). Al volver, la app regresa al mismo
   alquiler (`/alquiler/<id>`, además de las invitaciones). No hay renovación silenciosa (el kit no la tiene).
3. **Mensaje claro solo si hace falta:** la billetera existe y este dispositivo no puede firmar. Con llave de acceso posible:
   «Aprobar con mi llave de acceso». Sin llave: abrir Lockumi una vez en el dispositivo donde se creó la cuenta. La oferta de la llave
   de #53 sigue igual.
4. **Errores reales del pago corregidos** (ver abajo) y **la llave local nunca se borra por una firma fallida al entrar**: la puerta no
   reintenta ni conecta con la llave de acceso sola (el kit borra la llave local solo dentro de `connect`, cuando no puede abrirla); si
   falla, solo se quita el usuario local (`lockumi.usuario`) y no se monta la tarjeta de la cuenta.

## Textos (neutros, sin palabras técnicas) — `src/services/firmante.ts`

| Pantalla | Texto |
|---|---|
| No puede firmar (título) | Este dispositivo todavía no puede usar tu cuenta |
| … con llave | Apruébalo con tu llave de acceso para entrar. + «Aprobar con mi llave de acceso» |
| … sin llave | Abre Lockumi una vez en el dispositivo donde creaste tu cuenta. |
| Falla de red (título / texto / botón) | No pudimos abrir tu cuenta / Revisa tu conexión y vuelve a intentarlo. / Volver a intentar |
| Sesión cerrada (título / texto / botón) | Vuelve a entrar para seguir / Tu sesión se cerró en esta pestaña. Entra otra vez y vuelves a este paso. / Entrar de nuevo |
| Error de pago por sesión | Tu sesión se cerró en esta pestaña. Toca «Entrar de nuevo» y vuelves a este paso. |
| Botón secundario | Usar otra cuenta |

## Errores corregidos (líneas del commit base `4f2368a`)

- `src/screens/Detalle.tsx` (pago, `{p.error}` de `src/proceso.tsx:18`): el error de firma del pago en C salía sin el botón de la
  llave; ahora usa `ErrorPago` (llave o «Entrar de nuevo»).
- `src/screens/Billetera.tsx:59`: «Lista ✓» solo con conectar; ahora prueba la firma una vez y, si no puede, muestra el bloqueo.
- `src/services/billetera.ts:168-174` (`mensajeFirma`): la sesión perdida mostraba el texto técnico del token; ahora el texto claro.
- `src/services/cuentaPropia.ts:22-24`: con `needs-device-approval` devolvía la dirección y el error salía recién al pagar.
- `src/regreso.ts:5-8,18`: volver después de entrar solo servía para invitaciones; ahora también `/alquiler/<id>`.

## Pruebas

`src/services/__tests__/firmante.test.ts` (puerta con el kit simulado: firma, `needs-device-approval`, falla sin reintento,
sin token, solo «sí/no» guardado, texto de sesión, regreso a `/alquiler/`), `src/screens/__tests__/firmante-pantallas.test.tsx`
(qué mensaje se ve y cuándo, «Entrar de nuevo» antes de pagar y firmar). `cavos-sin-firma-silenciosa.test.ts` (Términos 5.3) ahora
permite `signMessage` **solo** en `services/billetera.ts` y solo con `lockumi-login`: **pendiente de una mirada de Legal**.

## Capturas locales (dev)

`npm run dev` y en `localStorage` (solo en dev): `lockumi.billetera.prueba` = una G de prueba;
`lockumi.billetera.prueba.firma` = `no` | `sin-sesion` | `error`; `lockumi.billetera.prueba.sesion` = `no` (sin sesión antes de pagar);
`lockumi.llave.prueba` = `si`. Hoja: `scripts/firmante-login-hoja.py` (capturas en `/workspace/lockumi/capturas/firmante-login/`).

## Límites

- La llave de acceso es de Cavos (vault.cavos.xyz, ventana en inglés); Safari/Brave pueden no ofrecerla → variante «sin llave».
- Quien ya tenía la sesión abierta no pasa por la puerta; la tarjeta de la cuenta prueba la firma una vez.
- El token vencido se detecta por falta de token en la pestaña o por un 401/403 del registro de Cavos.
