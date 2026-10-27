# Matriz de caminos (27/10/2026)

Solo pruebas y arnés local: sin escrituras en producción y sin códigos reales. Las migraciones y el código de la app **no cambian** en esta entrega.

Pruebas nuevas:
- `src/servidor/__tests__/ciclo-dos-personas-sql.test.ts` (14): PGlite con las migraciones reales y el servidor real (`atender` de `api/_lib/tw.ts`) con Horizon y Supabase REST falsos.
- `src/screens/__tests__/acta-reconfirmar.test.tsx` (3): lo que ve cada persona en `Firma` y `CuartoEditor` tras un cambio del acta.
- `scripts/paso21-invitacion/e2e-enlace.mjs`: se arregló el selector `.plegable .cp-abrir`, que desde que existe el plegable «Plazo de devolución» coincidía con dos botones. Solo el script; la app no cambia. `npm run e2e:invitacion` pasa de nuevo (local, sin red de producción).

## (a) Quién fondea el escrow

En producción pagó la cuenta de la plataforma (tesorería), no el inquilino. **Es intencional** (anticipo de testnet, opción A del 26/10/2026, equivalente al `mockRampFund` de Meteorito):
1. `pagar`: el inquilino solo demuestra su billetera con una prueba firmada con Cavos; Lockumi despliega el escrow con approver = Lockumi (`docs/fondeo-testnet.md`, pasos 1-3; `docs/firma-cavos.md`, líneas 79-84).
2. `rampActivo.fondear` (`api/_lib/rampSimulado.ts`, líneas 1-6) llama a `fondearDesdeTesoreria`, que usa `fund-escrow` de Trustless Work con `signer = platform`.
3. Si a la tesorería le falta USDC, lo compra con su XLM de prueba en el DEX (`asegurarUsdcTesoreria`).
4. No corre fuera de testnet (`exigirRampTestnet`). Con una rampa real solo cambia `rampActivo`.

Prueba real del 27/10: tx `84fe7917df147251c5071c8dffcddca31dfb9293b7463c62a0b8d86e16cd4fdd` (ledger 5418849, 10:18:05 hora de Costa Rica): 10 USDC de la tesorería al contrato del escrow.
Pruebas: `trustless-proxy.test.ts` («pagar … fondea desde la tesorería»), `recarga-prueba.test.ts`, `firma-cavos.test.ts`.

## (b) Cambiar el acta de entrada borra la confirmación de la otra persona

Por diseño: `lk_editar_item` y `lk_registrar_foto` (salvo la etapa `reclamo`) borran las firmas de esa etapa (`20261017000000_lockumi_e2e.sql`). Las del contrato no se tocan. Se probó con una foto, con volver a marcar el mismo ítem, con la nota, y con la etapa de salida.

Nadie queda trabado:
- A quien se le borró la firma le vuelve «Te toca firmar» y el botón «Confirmar como …» (`estadoFirma` en `src/flujo.ts`).
- A quien sigue firmado le queda «Firmaste ✓ · Esperando la firma del …» y ningún botón.
- Quien edita ve en `CuartoEditor`: «Si cambias algo, los dos tienen que volver a confirmar.»
- Al volver a confirmar los dos, el alquiler pasa a `en_curso` (o `ventana_reclamo` en la salida).

Observación, sin cambio de texto (hace falta imagen, Legal y visto bueno de Katherine): ningún texto dice que la confirmación «se borró», y el historial no guarda el evento del borrado.

## (c) #62: aceptar sin sesión de Cavos y luego pagar

El arnés local prueba la parte del servidor y de la base: sin el arreglo, `cuenta()` contesta 409 «Falta la cuenta Stellar del inquilino.»; con `lk_actualizar_direccion` (la cuenta de la billetera conectada) el servidor sigue. La cuenta no se cambia con el escrow creado (55000) y una persona ajena no puede guardar ninguna.
La parte del cliente (`activarCuenta` llamando a `actualizarCuenta`) queda solo en pruebas (`deposito-trustline.test.ts`): el arnés de navegador completo no era viable (la vista previa de Vercel pide autenticación y Supabase es solo de producción). La corrida real de producción del 27/10 tenía sesión viva del inquilino al aceptar, así que no prueba sola el camino «sin sesión».

## (d) U4: el dueño firma sin sesión de Cavos y el pago da 409

Prod 27/10 (`d475db0a…`): el dueño entró solo con su llave de acceso, firmó sin token de Cavos y su cuenta quedó vacía; al pagar, 409 «Falta la cuenta Stellar del dueño.». Arreglo: al firmar el contrato se guarda la cuenta de la billetera si falta, y el dueño la vuelve a intentar al abrir el alquiler en «pendiente de pago» (detalle en `docs/fondeo-testnet.md`).
Límite: sin sesión de Cavos del dueño no hay dirección que guardar, y el pago del inquilino no puede guardar la del dueño (`lk_actualizar_direccion` solo cambia la fila propia). Un dueño solo con llave de acceso sigue sin cuenta hasta que entre de nuevo; el arreglo completo (pedir sesión a la firma del dueño) es un cambio de flujo y espera aprobación.

## Tabla de caminos

Alcance: solo pruebas y arnés local. Sin escrituras en producción y sin códigos reales. Rama `matriz-caminos-sql`, base `origin/master` 419395d (#62 ya publicado).
Corrida base (master): 167 archivos, 1435 pruebas, 1434 pasan, 1 omitida. Esta rama agrega 2 archivos nuevos (17 pruebas).

Leyenda de la última columna:
- **Solo pruebas**: cubierto por vitest (PGlite con las 29 migraciones reales, o el servidor real `atender` con Horizon/Supabase falsos).
- **Arnés local + navegador**: Playwright contra Vite local con Supabase de prueba en PGlite (`npm run e2e:invitacion`), sin red de producción.
- **E2E real (prod)**: ya corrió el 27/10 en el alquiler `0070af80…` (testnet, pantalla real). Los códigos que pediría repetirlo van en «códigos».
- **Falta E2E real**: solo hay pruebas; un E2E real necesita producción (escritura) y/o códigos. Número de códigos entre paréntesis.

Códigos por cuenta (medidos en `real3.mjs`): entrar con correo = 1 código de Cavos + 1 de Lockumi (2 por cuenta). Con llave de acceso vigente (`--solo-entrar`) = 0. El link de invitación es 1 correo con link, sin código.

| # | Camino | Entorno | Resultado | Evidencia | Real-E2E o solo pruebas |
|---|---|---|---|---|---|
| 1 | Crear el alquiler como **dueño** (dos personas) | prod 27/10 + PGlite | OK | Prod: alquiler `0070af80…` creado por el dueño (capturas `e2e-pr60/cr-07…cr-11`). Pruebas: `ciclo-dos-personas-sql.test.ts` («el orden del ciclo»), `paso21` en `scripts/paso21-invitacion/e2e-enlace.mjs`, `dos-personas-interruptor.test.tsx` | E2E real hecho (0 códigos si la llave vive; 2 si hay que entrar). Repetirlo = otro alquiler en prod: pedir al Coordinador |
| 2 | Crear el alquiler como **inquilino** | local (modo «Simular con dueño de prueba») | Solo existe en modo de una persona. En dos personas el servidor solo deja crear al dueño (`lk_crear_contrato_invitando`) | `src/screens/Crear.tsx` (modos), `20261017000000_lockumi_e2e.sql`, `crear-pc.test.ts`, `dos-personas-interruptor.test.tsx` | Solo pruebas. No es un fallo: por diseño el inquilino no crea en dos personas (hallazgo para el Coordinador) |
| 3 | Invitar **con correo** | arnés local + navegador, prod 27/10 | OK | Local: `npm run e2e:invitacion` pasa (1 correo atendido, link con token, capturas `matriz-caminos/capturas-invitacion-local/1-…`). Prod: el link llegó y el inquilino aceptó. Pruebas: `paso21-invitacion.test.tsx` | Hecho en local y en prod (1 correo, 0 códigos) |
| 4 | Invitar **sin correo** | arnés local + navegador | En dos personas el correo es obligatorio. «Sin correo» solo existe en la simulación con dueño de prueba (sin servidor) | Local: captura `2-dueno-sin-correo`; `Crear.tsx` modos | Solo local. En prod no existe ese camino |
| 5 | Aceptar la invitación (otro correo / correo invitado) | arnés local + PGlite | OK: con otro correo no deja aceptar (pantalla y servidor); con el correo verificado acepta | `e2e-enlace.mjs` (líneas «otra persona…», «servidor con otro correo…»), `c-correos-sql.test.ts`, `invitacion-ya-aceptada.test.ts` | Hecho en local; prod: aceptó 1 vez |
| 6 | Reglas: aceptar / rechazar | PGlite | Aceptar = casilla de términos al aceptar. «Rechazar» no es una acción: no aceptar deja la invitación pendiente (vence a los 7 días) y el dueño puede crear un link nuevo o eliminar. La regla 6.5.1 no se acepta en dos personas | `lk_aceptar_regla_651` (error 6.5.1 d) en `silencio-dos-personas-sql.test.ts`; `lk_nueva_invitacion` en `paso16-sql.test.ts`; `dos-personas-interruptor.test.tsx` («la invitación vence en 7 días») | Solo pruebas (rechazar no existe como botón) |
| 7 | Firmar el contrato | prod 27/10 + PGlite | OK: cada parte firma una vez; con las 2, pasa a `pendiente_pago` | Prod: capturas `cr-20…`. Pruebas: `ciclo-dos-personas-sql.test.ts` (orden del ciclo) | E2E real hecho |
| 8 | No firmar | PGlite | Con una sola firma el contrato sigue en `firmas` (no avanza). No hay vencimiento automático del contrato sin firmar en las migraciones (revisado, sin prueba propia); el dueño puede eliminar mientras no haya depósito | `ciclo-dos-personas-sql.test.ts` (el contrato no avanza con una firma); `eliminar-sin-deposito.test.ts`; `eliminar-alquiler.test.ts` | Solo pruebas |
| 9 | Aceptar **sin sesión** de Cavos y luego pagar (#62) | PGlite + servidor real `atender` | OK: sin la cuenta, `lk_actualizar_direccion` la guarda y el servidor deja de dar 409; sin el arreglo: 409 «Falta la cuenta Stellar del inquilino» | `ciclo-dos-personas-sql.test.ts` («(c) #62»), `deposito-trustline.test.ts` (parte del cliente `activarCuenta`) | Servidor + base: arnés local. Parte del cliente: solo pruebas. Prod 27/10: pagó bien, pero el inquilino tenía sesión viva al aceptar (no prueba la causa) |
| 9b | El dueño **firma sin sesión** de Cavos y luego se paga (U4) | PGlite + servidor real `atender` + pruebas del cliente | Sin la cuenta del dueño: 409 «Falta la cuenta Stellar del dueño»; con `lk_actualizar_direccion` del dueño el servidor sigue. El cliente guarda la cuenta al firmar si hay billetera | `ciclo-dos-personas-sql.test.ts` («U4»), `cuenta-dueno-firma.test.ts` | Prod 27/10 (`d475db0a`): 409 al pagar (sin dinero movido). Dueño solo con llave: no se resuelve sin cambio de flujo (ver (d)) |
| 10 | Sesión expirada | pruebas + prod | «Entrar de nuevo» / «Vuelve a entrar para seguir»; no se firma ni se paga sin sesión (ConSesion) | `firmante-pantallas.test.tsx`, `firmante.test.ts`, `sesion-sin-correo.test.tsx`, `cavos-sin-firma-silenciosa.test.ts`; prod: caída del 10:03 y `--continuar-completa` | Solo pruebas para el texto; E2E real ya mostró «Entrar de nuevo». Repetirlo: **1 código de Cavos** (más 1 de Lockumi si pide verificar el correo) |
| 11 | Pagar: saldo suficiente, fondeo, error | prod 27/10 + pruebas | OK. Fondeo: la **plataforma** puso los 10 USDC (anticipo de testnet, intencional; ver (a) en `docs/matriz-caminos.md`) | Tx `84fe7917df14…cd4fdd` (ledger 5418849, 10:18:05 CR). Pruebas: `trustless-proxy.test.ts`, `recarga-prueba.test.ts`, `deposito-trustline.test.ts`, `espera-pago.test.tsx`, `firma-cavos.test.ts`; errores: «Volver a intentar el pago», 409 de trustline, tesorería caída | E2E real hecho. Error real en red: no se provoca en prod (solo pruebas) |
| 12 | Fotos de entrada: tomar, confirmar, **cambiar → se borra la confirmación** | prod 27/10 + PGlite + render | OK, por diseño. La parte a la que se le borró ve «Te toca firmar» + botón; la otra ve «Firmaste ✓ · Esperando…»; quien edita ve «Si cambias algo, los dos tienen que volver a confirmar.» | `ciclo-dos-personas-sql.test.ts` («(b)», 5 pruebas), `acta-reconfirmar.test.tsx` (3). Prod: el borrado ocurrió en la corrida del 10:19 y `--continuar-fotos` reconfirmó | E2E real hecho (con 1 re-confirmación). Hueco de texto: ver nota B |
| 13 | Fotos de entrada: **rechazar** | PGlite | No hay «rechazar» como acción: la otra parte edita o agrega foto y se borran las firmas (caso 12) | Mismas pruebas del 12 | Solo pruebas |
| 14 | Fotos de salida: tomar y confirmar | prod 27/10 + PGlite | OK: con las 2 firmas pasa a `ventana_reclamo`; se registra la entrega y el plazo de 7 días espera «Recibí la casa» o 2 días | Prod: `ventana_reclamo`, PASO 7 de 8. Pruebas: `ciclo-dos-personas-sql.test.ts` (salida), `dueno.test.ts`, `dueno-acciones.test.ts`, `c-plazos-textos-sql.test.ts` | E2E real hecho |
| 15 | Fotos de salida: cambiar/rechazar | PGlite | Igual que 12: borra las firmas de salida | `ciclo-dos-personas-sql.test.ts` («salida») | Solo pruebas |
| 16 | Sin reclamo: devolución automática a los 7 días | PGlite + servidor `atender` (plazo corto de prueba; nunca prod) | OK: al vencer sin reclamo cierra y devuelve el 100 % al inquilino, una vez; con caso abierto no corre. Cierra antes del pago, pero la corrida de cada hora lo reintenta (paso 22) | `devolucion-automatica.test.ts`, `devoluciones-sql.test.ts`, `devoluciones-cron.test.ts`, `sin-acuerdo-servidor.test.ts`, `c-plazos-textos-sql.test.ts` | Solo pruebas (prod necesitaría esperar 2+7 días; no se corre) |
| 17 | Reclamo parcial o total | PGlite + app | OK: por rubros, el monto es el total calculado; abre el plazo del inquilino y el aviso del día 1 | `reclamos.test.ts`, `reclamos-acciones.test.ts`, `c-correos-sql.test.ts`, `silencio-dos-personas-sql.test.ts` | Solo pruebas. E2E real: **0 códigos** si la llave vive (4 si hay que entrar con correo); escribe en prod y cambia el alquiler `0070af80…`: pedir permiso |
| 18 | Aceptar el reclamo | PGlite + servidor + prod 27/10 | Acuerdo por el monto reclamado; reparto y cierre. **Prod 27/10 (`b10557f9`): cerró sin pago (401 sin prueba)**; arreglado: firma antes de cerrar y reintento (nota F) | `reclamos.test.ts` («respuesta del inquilino»), `reparto-dos-personas.test.ts` (acuerdo), `reparto-servidor-app.test.ts`, `devoluciones-cron.test.ts` (repartos), `mediacion-dos-aceptan-sql.test.ts` | Prod: falló; arreglo en el PR del cierre sin pago |
| 19 | Rechazar el reclamo / contraoferta | PGlite | La propuesta (punto medio) solo vale si los dos aceptan; si no, mediación | `reclamos.test.ts`, `reclamos-acciones.test.ts`, `silencio-dos-personas-sql.test.ts` | Solo pruebas |
| 20 | Silencio del inquilino (regla 6.5.1) | PGlite | (b) propuesta automática, (c) mediación; domingo/feriado pasa al siguiente día hábil | `silencio-dos-personas-sql.test.ts`, `plazos.test.ts` | Solo pruebas |
| 21 | Mediador | PGlite + servidor | La plataforma abre la disputa y una cuenta mediadora distinta resuelve; sin mediadora no se abre; no paga sin las dos aceptaciones. Antes del 27/10 la persona mediadora recibía 403 al pagar (no es parte); ahora el servidor la valida en `lk_mediadores` (nota F) | `mediacion-dos-aceptan-sql.test.ts`, `reparto-dos-personas.test.ts`, `devolucion-automatica.test.ts` | Solo pruebas |
| 22 | Cancelar / eliminar | PGlite + app | OK: el dueño elimina sin depósito; con fondos no; el inquilino nunca; oculta los cerrados | `eliminar-sin-deposito.test.ts`, `eliminar-alquiler.test.ts`, `eliminar-alquiler-sql.test.ts`, `eliminar-alquiler-revert-sql.test.ts`, `borrados-api.test.ts` | Solo pruebas. E2E real = un alquiler nuevo en prod (pedir al Coordinador) |
| 23 | Cerrar sesión y volver a entrar | pruebas + prod | Con llave de acceso entra sin código y ve «Tus alquileres» | `llave.test.ts`, `firmante-pantallas.test.tsx`, `volver-por-confirmar.test.ts`; prod: `--solo-entrar` (0 códigos) | Hecho en prod con llave. Con correo: **2 códigos por cuenta** |
| 24 | Recargar la página / otro dispositivo | PGlite + pruebas | El estado vive en el servidor; un dispositivo nuevo sin la llave queda «no firmante» con «Entrar con mi llave de acceso»; `lk_vincular_alquileres` trae los alquileres a la sesión nueva | `vincular-alquileres-sql.test.ts`, `firmante-pantallas.test.tsx`, `unido-pantallas.test.tsx`; `scripts/e2e-vincular.mjs` y `e2e-dispositivo.mjs` existen pero escriben en prod: no se corrieron | Solo pruebas. E2E real en otro dispositivo: **2 códigos por cuenta + aprobación del dispositivo** |
| 25 | (a) Quién fondea el escrow | código y docs | La plataforma (tesorería `GCTL…`) paga con `fund-escrow`; intencional (simulación de rampa de testnet, opción A del 26/10) | `docs/fondeo-testnet.md`, `docs/firma-cavos.md`, `api/_lib/rampSimulado.ts` (líneas 1-6), `api/_lib/tw.ts`; ver `docs/matriz-caminos.md` | E2E real hecho (tx del fondeo) |

### Notas

A. Ningún camino mostró un error de la app durante esta pasada, así que no hay PR de arreglo. Hay un solo PR de pruebas y docs (borrador).
B. Observación (no es un fallo, no lleva PR): cuando una persona cambia el acta, el servidor borra las firmas de esa etapa y la pantalla lo resuelve con «Te toca firmar», pero ningún texto dice «tu confirmación se borró porque el acta cambió» y el historial no guarda el evento. Cambiar textos exige imagen, Legal y el visto bueno de Katherine.
C. Arnés local: `npm run e2e:invitacion` estaba roto por un selector viejo (`.plegable .cp-abrir` ahora coincide con dos plegables: «Plazo de devolución» y «Reglas del alquiler»). Es el script, no la app. Está corregido en el PR y pasa.
D. Los scripts `scripts/e2e-*.mjs` y `e2e/pruebas/red.e2e.ts` escriben en producción o en testnet. No se corrieron.
E. Caso #62: la corrida real de producción tenía sesión viva del inquilino al aceptar, así que no prueba por sí sola que el camino «sin sesión» funcione en prod. Eso lo cubre el arnés local (fila 9).
F. **Cierre sin pago (27/10, `b10557f9`):** acuerdo y mediación cerraban en la base antes de que existiera la transacción del reparto y no había reintento. Ahora la prueba se firma antes de cerrar,
   `cerrado` sin `liquidacion_tx` es «por pagar» y lo paga la corrida de cada hora, la app o la persona mediadora por un solo camino idempotente. Detalle en `docs/fondeo-testnet.md` § «Reparto por pagar».
