# Prueba e2e en Stellar testnet: dos personas, dos aparatos, USDC real de testnet en un escrow de Trustless Work

> **Documento histórico de la rama `testnet-e2e` (16 y 17 oct 2026).** Sirve como registro de la prueba con dos personas, Supabase y `api/tw.ts`, que **no** es lo que corre en app.lockumi.com. Hoy la app usa el flujo de una persona por `api/solo.ts`, sin base de datos: tú eres el inquilino, el dueño es un dueño de prueba de Lockumi y el escrow de Trustless Work es real en testnet en cada paso. El modo de dos personas y las invitaciones por correo o link son **próximamente**: todavía no funcionan. Solo testnet, sin dinero real. El estado actual está en el [README](../README.md). El correo de invitación de la Parte 4 usará Resend: ver [`correo-resend.md`](correo-resend.md). La sección [8](#8-saldo-0-con-sesión-de-cavos-20-oct-2026-rama-arreglo-saldo-0-login) sí es del flujo actual: prueba en testnet del arreglo del saldo 0 con sesión de Cavos (publicado el 20 oct 2026).


Rama `testnet-e2e` (sale de 76b66e8). No se publicó nada: sin push, sin deploy, sin tocar app.lockumi.com ni lockumi.com, sin merge a master.

## 1. ¿Puede la billetera de Cavos firmar las XDR de Trustless Work? Sí, probado en testnet

- `@cavos/kit` 0.4.2 tiene `wallet.signXdr(unsignedXdr) → signedXdr` (no envía). La documentación lo describe justo para este caso:
  "When your backend (or a platform's REST API) builds the transaction and hands you an unsigned XDR, use signXdr". También dice "Soroban and Trustless Work still work". Fuente: https://docs.cavos.xyz/docs/stellar
- Lo que hace por dentro: lee la XDR, vuelve a firmar solo las entradas de autorización de Soroban de su propia cuenta y firma el sobre con la clave de control. Esa clave es la llave maestra de la cuenta G.
- **Prueba real** (`scripts/probar-firma-cavos.mjs`). Usé el método real `CavosStellar.prototype.signXdr` con una cuenta desechable y una clave `WebCryptoControlKey`, la misma clase del kit. La XDR la armó otro: una invocación Soroban simulada con `prepareTransaction`.
  - **Origen = cuenta Cavos (el modelo de TW): OK**, tx `211b4c28f8f3715a2e68afbd9326b674df188676e74ba2bba3100c7063e8caaf`, estado SUCCESS.
  - Con otra cuenta como origen y Cavos autorizando solo su entrada, falla (`txBadAuthExtra`; sin la firma de sobre, falla por recursos). **No aplica a Trustless Work.** TW arma cada transacción con el `signer` del rol como origen y auth `sorobanCredentialsSourceAccount`; lo verifiqué con el deploy real de abajo.
- `addTrustline` real del kit (`scripts/probar-trustline-cavos.mjs`), en una cuenta creada por Friendbot y con `{sponsored:false}`: **OK**, tx `4cd86193bde4c14f96166dd12dce744efbe20ae2dab45d21231b27d787bf3a16`.
- **Lo que cambia en los aparatos reales (vault)**: en la web, la llave vive en el iframe `vault.cavos.xyz`. Llamar a contratos o abrir trustlines queda "fuera del límite" sin importar el monto. Con la regla por defecto, "Ask the user", el vault muestra su propio aviso y la persona aprueba. Si en el panel de Cavos la regla es "Block it", la firma falla con `kit/vault: this app's policy does not allow this transaction`. Fuente: https://docs.cavos.xyz/docs/vault
  - **Revisar antes del sábado:** panel de Cavos → app → Approvals → "Over the limit" = *Ask the user*. Además, el origen de la vista previa tiene que estar en las "allowed web origins".
- Plan B, solo si el vault falla el sábado: Freighter (extensión) para la demo, firmando la misma XDR con `signTransaction`. El proxy no cambia, porque solo exige que la transacción salga de la cuenta registrada del participante.

## 2. Trustless Work: lo que encontré (con fuentes)

- **API v1 REST** (la que usa el proxy). Testnet `https://dev.api.trustlesswork.com`, mainnet `https://api.trustlesswork.com`, encabezado `x-api-key`, 50 solicitudes por 60 s.
  - Cada operación devuelve la XDR sin firmar (`unsignedTransaction`). Se firma y se envía con `POST /helper/send-transaction {signedXdr}`.
  - Fuentes: https://docs.trustlesswork.com/trustless-work/api-rest/introduction · https://docs.trustlesswork.com/trustless-work/api-rest/helpers/send-transaction · Swagger: https://dev.api.trustlesswork.com/docs
- **v2 "Core API" (beta)**: `https://beta.api.trustlesswork.com`. Mismo flujo armar → firmar → `POST /stellar/send-transaction`; agrega roles en plural y un rol admin. Las credenciales no sirven entre v1 y v2. Fuente: https://docs.trustlesswork.com/trustless-work/v2-en/api-rest/introduction
- **SDK de React** `@trustless-work/escrow`: pone la llave en el cliente, por eso **no** lo usamos; vamos por el proxy. Fuente: https://docs.trustlesswork.com/trustless-work/escrow-react-sdk/getting-started
- **Cómo se pide la llave**: dApp https://dapp.trustlesswork.com → conectar billetera y firmar → Settings (perfil) → API Keys → Testnet. Se muestra una sola vez. Fuente: https://docs.trustlesswork.com/trustless-work/introduction/developer-resources/request-api-key
  - **Ya está**: verificada con `GET /helper/get-escrows-by-signer` (200 con la llave, 401 sin ella). Está en Vercel como `TRUSTLESS_WORK_API_KEY` (sensitive, solo Preview).
- **Roles**: approver, serviceProvider, releaseSigner, disputeResolver, receiver y platformAddress. Cualquiera puede depositar. Fuente: https://docs.trustlesswork.com/trustless-work/introduction/technology-overview/roles-in-trustless-work
- **Single vs multi-release**: single libera todo de una vez; multi libera por hito. Para un depósito de garantía usamos **single-release**. Fuente: https://docs.trustlesswork.com/trustless-work/api-rest/deploy/initialize-escrow
- **Disputa y reparto**:
  - Disputar: `dispute-escrow {contractId, signer}`; solo pueden hacerlo approver o serviceProvider, y el resolver no puede disputar.
  - Resolver: `resolve-dispute {contractId, disputeResolver, distributions:[{address, amount}]}`. La suma tiene que ser igual al saldo del escrow.
  - Fuentes: https://docs.trustlesswork.com/trustless-work/api-rest/deploy/change-dispute-flag · https://docs.trustlesswork.com/trustless-work/api-rest/deploy/resolving-disputes · https://docs.trustlesswork.com/trustless-work/introduction/developer-resources/types/payloads/resolve-dispute
- **Tokens de testnet**: USDC de Circle, emisor `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`; faucet https://faucet.circle.com. Fuente: https://docs.trustlesswork.com/trustless-work/introduction/stellar-and-soroban-the-backbone-of-trustless-work/testnet-tokens
- **Comprobado con la llave real**, solo armando la XDR del deploy, sin firmar ni enviar:
  - `trustline.address` tiene que ser el **emisor G…**. Con el contrato C… del USDC responde "Issuer is invalid".
  - TW valida en la cadena que **approver, receiver y platformAddress existan y tengan trustline de USDC**. La de la plataforma GCTLNUBV…TJ4G ya está abierta: tx `ce818acce78f7d3545c87ace184cceb4b3456ed76ce1bb65de6f8dda512af60b`.
  - Usar la **misma cuenta** como platformAddress, serviceProvider, releaseSigner y disputeResolver es aceptado: 201, XDR con origen = plataforma.

## 2b. Privacidad on-chain (Ley 8968) · rama `privacidad-onchain`

Lo que se envía en el deploy queda público y permanente en Stellar. Desde esta rama, `api/_lib/tw.ts` solo manda:
- `title` y `description`: "Depósito de alquiler Lockumi" (texto fijo).
- `engagementId`: el `id` del contrato (uuid aleatorio de `gen_random_uuid()`, no derivado de datos personales).
- hito y evidencia: textos fijos, sin la dirección, nombres, correos ni teléfonos.
`sinDatosPersonales` bloquea el deploy si algún texto trae la dirección, un correo o un teléfono. Prueba: `src/services/__tests__/privacidad-onchain.test.ts`.
Siguen en la cadena, por cómo funciona el escrow: las cuentas G… de dueño e inquilino, el monto y las fechas de las transacciones.

## 3. Roles en Lockumi (single-release, v1)

| Rol de TW | Quién | Por qué |
|---|---|---|
| receiver | inquilino | el depósito vuelve a su cuenta |
| approver | dueño | aprueba "entrega sin daños" o abre el reclamo (disputa) |
| serviceProvider | plataforma | deja la evidencia del acta de salida (cambia el hito a Completed) |
| releaseSigner | plataforma | libera después del plazo, desde el servidor |
| platformAddress | plataforma | comisión 0 |
| disputeResolver | plataforma (mediación) | reparte en un reclamo; configurable con `LOCKUMI_TW_MEDIADOR_PUBLICA` |
| depósito (fund) | inquilino | lo firma con Cavos |

**Camino feliz del sábado**, sin reclamo:
1. La plataforma despliega (servidor).
2. El inquilino deposita (Cavos, firma 1).
3. Se hace el acta de salida.
4. El dueño toca "Todo está bien: aprobar la devolución": la plataforma deja la evidencia y el dueño aprueba (Cavos, firma 2).
5. Termina el plazo y la plataforma libera el 100 % al inquilino.

Las claves de la plataforma solo viven en el servidor.

## 4. Lo que quedó hecho en el código

- `supabase/migrations/20261017000000_lockumi_e2e.sql`:
  - Tablas `lk_*`: contrato, participantes (correo de Cavos y G…), actas, firmas, fotos con sha256 y hora, reclamos, eventos con tx y referencia del escrow.
  - RLS de solo lectura; toda escritura pasa por RPC `security definer` que deducen el rol de `auth.uid()`.
  - Invitación por link de un solo uso (hash sha256, 14 días), bucket privado `lk-fotos`, Realtime y sondeo cada 8 s.
  - Probado con PGlite: `node scripts/probar-esquema.mjs` → 47 OK.
- `src/servidor/*`, `src/acciones.ts`, `src/screens/Invitacion.tsx`: la app usa Supabase en lugar de localStorage cuando hay `VITE_SUPABASE_*`. Sin esas variables sigue la demo local, sin cambios.
- `api/tw.ts` + `api/_lib/tw.ts`: proxy de Trustless Work (Vercel Function). Detalles:
  - Lee `TRUSTLESS_WORK_API_KEY` y `LOCKUMI_TW_PLATAFORMA_SECRET` de `process.env`.
  - Solo testnet y solo cinco acciones permitidas.
  - Verifica la sesión de Supabase y el rol en la base. La plataforma solo firma llamadas a contratos con origen propio, y `enviar` solo acepta transacciones que salen de la cuenta registrada del participante.
  - Pruebas: `src/services/__tests__/trustless-proxy.test.ts`. Un build con `VITE_TRUSTLESS=1` no contiene la llave (revisado con un valor centinela).
- `src/services/trustless.ts` + `billetera.ts` (`firmarXdr`, `abrirTrustlineUsdc`, `saldoUsdc`): se activa con `VITE_TRUSTLESS=1`.
- `src/screens/Billetera.tsx`: "Habilitar USDC de prueba" (trustline desde Cavos) e instrucciones del faucet de Circle.
- `src/screens/Detalle.tsx`: "Todo está bien: aprobar la devolución" y "Liberar el depósito"; el plazo real se muestra en el texto.
- `scripts/preparar-testnet.mjs`: `--desechable`, `--revisar G…`, `--activar G… --confirmo`. No se corre contra billeteras de personas sin `--confirmo`.

## 5. Preparar a cada persona (dueño e inquilino)

1. Entrar en la app y abrir "Tu cuenta para el depósito" → "Activar cuenta de prueba" (Friendbot, 10 000 XLM de prueba).
2. "Habilitar USDC de prueba" (trustline; el vault de Cavos pide confirmar). **Los dos lo necesitan**, porque TW lo valida.
3. Solo el inquilino: abrir https://faucet.circle.com → Stellar Testnet → pegar su dirección G… (20 USDC cada 2 h).

## 6. Corrida completa del camino feliz (API real de testnet, cuentas desechables)

`node scripts/e2e-testnet-tw.mjs` (16/10/2026, 11:56 p. m. hora de Costa Rica). Participantes:
- Dueño: GD57OCAF…UIEX (Cavos desechable).
- Inquilino: GBMFMIUF…AQBY (Cavos desechable).
- Plataforma: GCTLNUBV…TJ4G.
- Escrow: `CCUVP4XKQCWCQTBUHZGA3PZAIYUGGKE2TNH4CZIXXGEMW6GOQY4RGCUS`.

| # | Paso | Tx |
|---|---|---|
| 1 | Trustline USDC del dueño (Cavos `addTrustline`) | https://stellar.expert/explorer/testnet/tx/1bfd4257920d16ee0d916145c93fa240af28ce11ad6e06f883ef7a30671d1bae |
| 2 | Trustline USDC del inquilino (Cavos `addTrustline`) | https://stellar.expert/explorer/testnet/tx/3f400bb241ae437435f38f3c47b25233eb5d63cdd0f4e354a800d69290517563 |
| 3 | 2 USDC para el inquilino (DEX de testnet, XLM → USDC de Circle) | https://stellar.expert/explorer/testnet/tx/314a636d180599c4b41cfe15fb15a7f949b8f89d7da566cb61d08f3c9876ddef |
| 4 | Deploy del escrow single-release (plataforma) | https://stellar.expert/explorer/testnet/tx/74bf9594875ff40349c8cf1ec69258d6c6bb2a5299cf25ff186e23c786a93228 |
| 5 | Depósito de 2 USDC (inquilino, Cavos `signXdr`) | https://stellar.expert/explorer/testnet/tx/51db520b8df6b1f287f4545fc5b62d62b847b222d85dfab54300151c834da059 |
| 6 | Evidencia: hito "Completed" (plataforma) | https://stellar.expert/explorer/testnet/tx/4a212fea4861cd67da31ffd887cc392fb418c0af755fb82273a1f0957aa9c766 |
| 7 | Aprobación (dueño, Cavos `signXdr`) | https://stellar.expert/explorer/testnet/tx/d98d3d3979faae4079023d7f2fad6801bf71d8c10be40f372ee3d5830ca09c9d |
| 8 | Liberación (plataforma): 1,994 USDC al inquilino y 0,006 a GA6KH5VW…CK7G | https://stellar.expert/explorer/testnet/tx/49fb34d0b510cd0a7b62ca5f9a66a82297ff0a240a1563498934c0b3ff51635c |

Estado final según TW: saldo 0, `released: true`, hito Completed y aprobado.

Hallazgos:
- **Trustless Work cobra 0,3 % también en testnet**, aunque `platformFee` sea 0. El inquilino recibe el 99,7 %.
- **Faucet de Circle**: la API (`api.circle.com/v1/faucet/drips`) exige credenciales de Circle (401). Para scripts se usa el DEX de testnet, que vende USDC real de Circle a ~9,26 XLM por USDC. Para las personas, faucet.circle.com en el navegador.
- **`get-escrow-by-contract-ids`** exige `contractIds[]=` (arreglo); con `contractIds=` responde 400.

## 7. Bloqueos

1. **Supabase**: `SUPABASE_ACCESS_TOKEN` es inválido (401 en la Management API), así que no se pueden crear las tablas ni activar el acceso anónimo. Salidas:
   - Un token nuevo y correr `node scripts/aplicar-supabase-e2e.mjs`.
   - O pegar el SQL de la migración en el SQL Editor y activar Authentication → Sign In / Providers → "Allow anonymous sign-ins".
   - Falta además la clave publishable/anon para `VITE_SUPABASE_ANON_KEY`.
   - *24 oct 2026 (rama `contrato-compacto`):* hay una migración nueva, `20261024120000_lk_mediacion_acuerdo.sql`, que cambia solo los mensajes de `lk_decidir_mediacion` («Solo la persona mediadora puede registrar el acuerdo.», «Acuerdo registrado: …»). `aplicar-supabase-e2e.mjs` la aplica después de la e2e, en orden. Si alguien ya aplicó la e2e a mano, también hay que correr esta. No toca `20261024000000_lk_espacios.sql` (rama `agregar-espacio`).
2. **Variables de Vercel (Preview)**: ya están `TRUSTLESS_WORK_API_KEY`, `LOCKUMI_TW_PLATAFORMA_SECRET` (sensibles), `VITE_TRUSTLESS=1` y `VITE_VENTANA_SEGUNDOS=300`. Faltan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. **Panel de Cavos**: Approvals → "Over the limit" = Ask the user, y el origen de la vista previa en allowed web origins.
4. Sin probar todavía: el flujo por la app (proxy + Supabase) y la firma con el vault de Cavos en dos aparatos reales. El camino feliz contra TW ya está probado por script (sección 6).

## 8. Saldo 0 con sesión de Cavos (20 oct 2026, rama `arreglo-saldo-0-login`)

**Publicado el 20 oct 2026** (commit `1483e31`; `master` en `4e6245a`; deploy de producción `dpl_8Vcp5XCRTfb9nw2pVpafeJrXfBiz`). Con sesión de Google (Cavos), un alquiler de 2 USDC con «USDC de prueba de Lockumi» seguía mostrando «Tu cuenta tiene 0 USDC de prueba y el depósito es de 2…», aunque la recarga automática ya estaba publicada (6d6b5c9).

**Causa.** Los registros de Vercel de app.lockumi.com muestran que la pestaña cargó la app a las 12:13 p. m. (hora de Costa Rica), durante el regreso del login con Google, con la versión anterior a la recarga (ebbec5e). Al tocar «Pagar» a la 1:51 p. m. no volvió a cargar la página: solo hubo dos llamadas a `/api/solo` (`dueno` 200 y `desplegar` 409). La versión con la recarga hace cuatro (`cuenta-prueba`, `dueno`, `desplegar`, `fondear-prueba`). La app vieja no recarga una cuenta de prueba que ya existe, y el servidor nuevo solo revisaba el saldo. La sesión en sí no cambia el camino del pago: la prueba sin sesión funcionó porque cargó la página nueva.

**Arreglo.** En la ruta de Lockumi, la app manda `origen: 'lockumi'` y el identificador de la cuenta de prueba en `desplegar`. El servidor completa la cuenta hasta el monto (tesorería; si no alcanza, el DEX de testnet) **antes** del chequeo de saldo, que se mantiene. Sin `origen` (pestaña vieja), el mensaje pide recargar la página. Con `origen: 'propia'`, el mensaje de siempre.

**Cómo se reprodujo con sesión (sin login real de Google).** Scripts en `scripts/saldo0-login/`:
- La app corre en `http://localhost:5173` (Cavos acepta localhost) con `VITE_TRUSTLESS=1` y el `VITE_CAVOS_APP_ID` real, o sea en modo de login real.
- La sesión se simula como la deja el login: `lockumi.usuario` con `metodo: 'google'` (kattmoresol@gmail.com) y la identidad pública de Cavos en `cavos-kit:identity:<App ID>`.
- `/api/solo` va por `proxy-api.mjs` a una vista previa de Vercel con `vercel curl` (resuelve la protección de la vista previa), con las variables del servidor de Preview.
- «Antes»: la app de ebbec5e (la que tenía abierta la pestaña) contra un servidor con el código de producción (c17e562, vista previa de `contrato-y-recarga`). «Después»: la app de esta rama contra la vista previa de esta rama.

**Resultados** (20/10/2026, entre las 4:47 y las 4:56 p. m., hora de Costa Rica; 2 USDC de prueba; tx en `https://stellar.expert/explorer/testnet/tx/<hash>`):

| Caso | Llamadas a `/api/solo` | Resultado | Tx |
|---|---|---|---|
| Control: app de producción (c17e562) con sesión, cuenta nueva GA3OEOJQ…ZHH6G | cuenta-prueba → dueno → desplegar → fondear-prueba | depósito creado (escrow `CCQZLIZA6PN4QER4B7KLSDVNJ5CPO2OQVTFN4RKOGCTTSR34AVP3GZGW`) | trustline `278856398f47237ce4819442032a3b7839b8d95c64f79e41da1f75cd64311c69`, USDC `6abb2d87a4d7863ac80bc7d39a5ba62a1710fb851d7b4f895c42ebb1f19b6c27`, escrow `36fdaf1be5e1f3884f672c187517d37386621b4b5484bc3eb951fb07d67629a5`, depósito `16af8d78924b256b6f1bec7423eb91b3296264279984b159ae9d203b9497a26a` |
| **Antes**: app vieja (ebbec5e) con sesión, la misma cuenta ya en 0 | dueno 200 → desplegar **409** | «Tu cuenta tiene 0 USDC de prueba y el depósito es de 2…» (igual que Katherine) | dueño `2f03382420b563329f074ef8a20f16bb711abf546aeb9500b8878a19158d4d51` |
| Pestaña vieja contra el servidor arreglado | dueno 200 → desplegar 409 | «…Lockumi se actualizó: recarga esta página y vuelve a tocar «Pagar»…» | dueño `429fdc6fc547ebc3ec7db2c11e56ed6e24f1b7a20a741b0ab6769d333de2bcdf` |
| **Después (a)**: con sesión, cuenta nueva GDLCERBD…ZDO7CU (celular) | cuenta-prueba → dueno → desplegar → fondear-prueba | depósito creado (escrow `CDRYCIOQZI7V67TJKQ5C7ZRI4JDYJGF6TZ7OWIG7RENHS5EDUXQZ4PXL`) | trustline `d06c0b55ef225da830afc9fbdbcebf54020469c23cc73b46f5f1c5f91a838cac`, USDC `eca4473ef053bc5ac4d4d8955cebd89e1ebe7689fc9e3c6dd990e24126f331e0`, dueño `d341a0ffdf066b034bb6515d252a25299e0ffae196aa5fe0ce9d3a49308fdb2f`, escrow `1ac2afd22886ab55ceef9fbb079c3e7adc5e2c78f2aa53cfd016990aacbcec7d`, depósito `c5ad2f5218d4f9e9f2c9789feccb75e1d79d2939cd3a8c1c0601de666310f3c8` |
| **Después (b)**: con sesión, cuenta reutilizada en 0 (GA3OEOJQ…ZHH6G, escritorio) | cuenta-prueba → dueno → desplegar → fondear-prueba | depósito creado (escrow `CDPUEHPAPAQ4O3Y6WNDAWJ6KPKS4O3MX74GAKDIVILHLXB7VWZEKRO7T`) | USDC `084fbccb26754994c5097b37b837db6f89735f50201f991f04cae74e25a6b25b`, dueño `7df43fcbfc37bc98329f8982ab932d37d87991322849f781bae6b55d579ad789`, escrow `8a760a39475fb56db89c1cf4a9b0dc309f01094d45b6471b8a932d256fdc1513`, depósito `0301110f02133ac7a604a5a45dc60f1776b462c6bed82091f5d6fac0e6d23fb8` |
| Sin sesión de Cavos (sin identidad de Cavos guardada), cuenta reutilizada en 0 (GDLCERBD…ZDO7CU) | cuenta-prueba → dueno → desplegar → fondear-prueba | depósito creado (escrow `CCZV2YFZ6P55R2XLOFGYZBYXYR3WRGM4WV43U375COSXHKOMVCGCR4Q5`) | USDC `3fc9b101ffb0c574028e73ed113e4148044174cef802713da376588226bcff71`, dueño `6b2a2bcb6cd12a6e4c1b60a2e88d4fde7318d2bb5237a481cb94420ef6bd32dc`, escrow `cbc0345cd7e9e831cbcc6d00a2db387fd57b13c6f263ad505bb0b0f12191bc73`, depósito `5b516f4fdac5662ad26e642b17974c2dcce0f2cd71dee6f3623772bed25f68a2` |
| Servidor solo: `desplegar` con `origen: 'lockumi'` y la cuenta en 0, **sin** `cuenta-prueba` antes | dueno → desplegar 200 | la tesorería puso 2 USDC (0 → 2) y se creó el escrow `CBFBTMMVR6YRSOLMNSKVGCQRB6QDMZ7UKGU7AQXQ6CY4I7T2JOFVZKQP` (sin depositar; es solo la prueba del servidor) | USDC `3b8c8af98006a701e2db0bfbe3e582200602c74e7a15ee4d0360b9740c38d610`, escrow `ddb0c7ea4eb94f51fbf28f989b78cb162f448ac5324e9c13322ef9d0f3cb091a` |

Capturas: `/workspace/lockumi/capturas/saldo0-login-*.png` (antes, después con cuenta nueva y reutilizada en 0, celular de 390 px y escritorio) y copias JPEG en `/workspace/lockumi/diseno/envio/saldo0/`.

## 9. «Tus alquileres» con un color por estado (20 oct 2026, rama `tus-alquileres-estados`)

**Publicado el 20 oct 2026** (código `d42e91b`; verificación en producción al final de esta sección). Para revisar la pantalla con datos reales se crearon 4 alquileres **reales** en testnet, uno por grupo de color, con el flujo normal de la app: crear, firmar, «Pagar», fotos, «Empezar fotos de salida», «Hacer un reclamo como dueño de prueba» o «Solo red de prueba: adelantar el plazo».

**Cómo.** El login de Cavos no funciona en las vistas previas. Por eso la app de esta rama corrió en `http://localhost:5173` con `VITE_TRUSTLESS=1` (`scripts/saldo0-login/vite.repro.config.ts`) y una sesión simulada por correo en localStorage. `/api/solo` fue a la vista previa de la rama (`dpl_3Nsjh5mgsXjRbYPtXjwjNzMVoMKh`) con `scripts/saldo0-login/proxy-api.mjs` (`vercel curl`). Los pasos se automatizaron con `scripts/tus-alquileres/real.mjs` y las capturas con `scripts/tus-alquileres/capturar.mjs`. La tarjeta «Tu cuenta para el depósito» se mostró con el gancho de desarrollo `lockumi.billetera.prueba`, que solo existe en Vite dev. Se le pasó la cuenta de prueba real del inquilino que pagó los 4 depósitos (`GBJVMMRHLCO4AZBDSOEYAUAUQDXQ3SC3IT5QURZESSUPD7CGB23J7AX6`), y la dirección y el saldo se leen de Horizon testnet. Con login real de Cavos, la tarjeta muestra la billetera de Cavos de la persona. No se usó `VITE_VENTANA_SEGUNDOS`: «adelantar el plazo» basta para llegar a «Terminado».

**Resultados** (20/10/2026, entre las 6:33 y las 6:46 p. m., hora de Costa Rica; tx en `https://stellar.expert/explorer/testnet/tx/<hash>`, todas con `successful: true` en Horizon):

| Alquiler | Estado (grupo) | Escrow | Tx |
|---|---|---|---|
| Apartamento en Barreal de Heredia, 3 USDC | Fotos de entrada (pendiente, miel) | `CCZP57ON3Y4J7SSY32G3X2GQ2KWOHBXVP6MX3KLZJBAZJIWLUV2WP5IA` | escrow `f2dfcdbf2aebd4766115ac8dd46bb784aedcef6b636aec874469442108c040da`, depósito `2ac985609ddc4e49a00409ed9c11da447443b8c194ab3a0fefe622a927d3b3da` |
| Casa en Escazú, 2 USDC | Alquiler en curso (salvia) | `CB2J2S2AXBLQKQ3BI4ZVEZM2ON3INDSU75KN7EIT7ECVE4DKFFWJT2WZ` | escrow `3b957f16e0d01aec57423788440ddfea765eb1993f97835317c2bcb186e83df1`, depósito `1e42b3a7ac5bcdf12a0d1fb19e6360dce21d3766ad3792cf03be1cb3a2d29c29` |
| Casa de playa en Tamarindo, 2,5 USDC | Reclamo abierto (terracota) | `CDJBV6PFRRB6ZC2VWAXD6V4ZRK2OKSZNDFY4MKY7NSHDPU5VKPLMXAPD` | escrow `cf9d4b816a5a5b29bf86f7c61ee6f6218569ba977e6f8ede15e0b9bfcf21456f`, depósito `0776cccbaf1b8cfa1919403b30a45928253e5fa0cea4e48ad8fde9e3dc3802fc`, reclamo (disputa) `82307efd87f889f7b1a29a3a9312b26d713f26f031debb1d1c71e5d4910e173b` |
| Estudio en San Pedro, 1,5 USDC | Terminado (arena) | `CDHPY7XOTEEIJ7H7UUL53YU3M3BYCJLC3V3HKBBLRMCZYCSE7GN3UNGP` | escrow `080d4d2fd2b890e973d1d38967520e17995476ad8b34fe3b30f15638bf400bd7`, depósito `99b9bcc359abb8baa3d6c8dffb3f9e1f063319730139f2be57ccb0b29ac6cbfb`, evidencia `b9343f4e1b477ab2c8e5ae745ebe9c3ae457fbee5c7037ab9927011c088267b1`, aprobación `d175dac0ea6d213169334e71dbabc9fbb25a90a1edf4f50b72867e5605725df6`, devolución `784a1e49eaf6c8643c20043d08bc3d810eebc4f9f9cb580de5e57e07fa4b5eb5` |

Capturas: `/workspace/lockumi/capturas/tus-alquileres-preview-{movil,escritorio}{,-detalles}.png` (390 px y 1280 px; «-detalles» con «Detalles» abierto). Copias JPEG en `/workspace/lockumi/diseno/envio/tus-alquileres-preview/`.

**Verificación en producción** (20/10/2026, 6:54–6:57 p. m., hora de Costa Rica; `master` en `3e044e4`, deploy `dpl_2831CmooXSLZpsH9yKhFTh5quDCe`, app.lockumi.com apunta a ese deploy y la asignación automática del dominio sigue activa):
- «Tus alquileres» en app.lockumi.com a 390 px y 1280 px, con sesión simulada por correo y los 4 alquileres reales de arriba copiados al localStorage del navegador: los 4 colores se ven bien, sin desborde. «Tu cuenta para el depósito» **no aparece**: en producción solo se muestra con login real de Cavos, y la sesión simulada no tiene identidad de Cavos (`sin-identidad`, igual que antes de este cambio).
- Pago de 2 USDC con «USDC de prueba de Lockumi» (cuenta de prueba `GBJVMMRH…GB23J7AX6`): cuenta-prueba → dueno → desplegar → fondear-prueba, todas 200, y la app muestra «Depósito bloqueado en la cuenta segura». Escrow `CCRBME3D5VAIIPGXPVZSJNMBJ643L467SXYC75EJEWLRCMSGKFHUQAB2`. Tx: USDC `3699a599b33175628b3960b75f6482840fb871f608eca9d7c632e940b88896ce`, dueño `e98f8c719109f09b7e62946f6544ec7d94b8da319a5e809544efcbbbcf71de39`, escrow `8ddab47c684c57d36ed3af0dd84372434c224777befbd3d10a442650b11b4fc9`, depósito `3fd9fc93a4f71ef89d2622626ceeef0ca3d86b7f34ffd13d4163f52fdb7cb972`.
- Capturas: `/workspace/lockumi/capturas/prod-tus-alquileres-{movil,escritorio,pago-movil,movil-con-pago}.png`; JPEG en `/workspace/lockumi/diseno/envio/tus-alquileres-prod/`.
