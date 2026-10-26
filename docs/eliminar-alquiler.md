# Eliminar, ocultar y «Reiniciar mi demo» (PR #35, 1.12-demo · 26 de octubre de 2026)

Estado: Legal revisó c97585b y dio su OK a PR #35 (26/10/2026); Katherine aprobó la hoja (12:21 a. m. CR). Al publicar se aplica
`supabase/migrations/20261026010000_eliminar_ocultar_reiniciar.sql` (con su fila en `supabase_migrations.schema_migrations`).
Vuelta atrás: revertir el merge y correr `supabase/revert/20261026010000_eliminar_ocultar_reiniciar_revert.sql`.

## Reglas
- **Eliminar** (solo antes del depósito; con otra persona, solo el dueño): borra el alquiler. Desde el 26/10 (PR #54) el dueño también puede eliminar después de que la otra persona acepte, mientras el depósito no esté pagado; el servidor lo comprueba en la red ([firma-servidor.md](firma-servidor.md)).
- **Ocultar** (después): lo quita solo de MI lista. No borra nada; la otra persona lo sigue viendo.
- **Con un depósito guardado:** ni eliminar ni ocultar; se explica por qué.
- **«Reiniciar mi demo»:** solo lo propio. Elimina los alquileres sin depósito, oculta los terminados y deja los que tienen depósito.
  No toca a otras personas ni ningún fondo.

## «Se borra» es un borrado real (Legal, condición 1)
- **Servidor:** `lk_borrar_alquiler` (migración 20261026010000, líneas 44-50) hace `DELETE` de la fila de `lk_contratos`. Esa fila guarda
  `email_inquilino` (el correo de la persona invitada; `20261017000000_lockumi_e2e.sql:20`) y el hash del link.
  - Todas las tablas con `contrato_id` tienen FK `on delete cascade`: e2e.sql:36, 49, 57, 67, 84, 94; paso16_unido.sql:19, 26, 112;
    mediacion_solo_dos_aceptan.sql:10; regla_651.sql:8; terminos_por_alquiler.sql:13; c_correos.sql:17, 30, 45; lk_ocultos (esta migración).
  - Las dos tablas de la reputación sin FK (`lk_reputacion_eventos` y `lk_reputacion_revisiones`, `20261025140000_reputacion.sql:52-73`)
    se borran a mano en las líneas 47-48. Un alquiler sin depósito nunca tiene filas ahí: `lk_rep_evento_cuenta` (reputacion.sql:399-403)
    descarta el evento si no hay dos participantes.
- **Prueba:** `src/servidor/__tests__/eliminar-alquiler-sql.test.ts`, «borrado real (Legal)», busca el id y el correo de la persona
  invitada en TODAS las tablas de `public`, fila entera como texto. Antes aparecen en 7 tablas; después, en ninguna. Lo mismo vale para
  «Reiniciar mi demo».
- **Este aparato:** `olvidarEnEsteAparato` (`src/prueba/eliminar.ts:21`) borra también:
  - «Ver como» (`lockumi.vista`, `store.ts:103`);
  - el link de la invitación (`lockumi.invitaciones`, `repositorio.ts:44`);
  - la marca de envío y el correo al que salió la invitación (`lk:invitacion-enviada:`/`lk:invitacion-correo:`, `prueba/invitacion.ts:23`).

  «Reiniciar mi demo» recibe del servidor los `ids` borrados para hacer lo mismo.

### Lo que NO se puede borrar desde la app
- Registros de los proveedores: logs de Supabase/Postgres, logs de Vercel y el envío del correo de invitación en Resend (quién, a quién y cuándo).
  El Aviso de privacidad (1.12-demo, «Cuánto tiempo los guardamos») lo dice: «Los registros técnicos que guardan nuestros proveedores
  (Supabase, Vercel y Resend) se borran según sus propios plazos.» Antes no tenía una frase equivalente.
- **Riesgo residual (Storage):** la política `lk_fotos_subir` (`e2e.sql:414-415`) deja que un participante suba un archivo a
  `lk-fotos/<contrato>/` en cualquier estado. La app nunca sube fotos antes del depósito, y `lk_registrar_foto` exige un estado de fotos
  (`e2e.sql:274`). Pero un archivo subido a mano antes del depósito no se borraría con el alquiler.
  - Propuesta (no hecha): exigir en esa política un estado de fotos.

## Nada en la red (Legal, condición 3)
- **Servidor:** `lk_se_puede_eliminar` exige `estado = 'firmas'` y `escrow_contract_id is null` (migración, líneas 34-36). Desplegar la
  cuenta de garantía exige `pendiente_pago` (`api/_lib/tw.ts:365`), así que un alquiler que se puede eliminar nunca tuvo cuenta de
  garantía, depósito ni fondos.
- **Un solo aparato:** `tieneGarantia` (`src/prueba/eliminar.ts:18`) bloquea eliminar (solo se oculta) si hay cuenta de garantía, cualquier
  paso registrado en la red de prueba (`red.txs`: línea de USDC, compra…) o un `escrowId` real. Además, `tieneDeposito` (línea 15).

## Reputación (15.7)
- Solo cuenta un alquiler cerrado con resultado que no sea simulación (`src/reputacion/puntaje.ts:28`, usado en :39, :52, :75, :100,
  :113). Uno que se puede eliminar está en `firmas` o `pendiente_pago`, así que nunca cuenta.
- En el servidor, `lk_rep_evento_cuenta` descarta los eventos sin dos participantes.
- Ocultar no lo lee ninguna parte de la reputación (ni `ocultoPor` en la app ni `lk_ocultos` en las migraciones).
- **Nota, no es un efecto en el puntaje:** una cuenta sin REP-01 que elimina su único alquiler puede volver a ver la pantalla previa de
  REP-01 (`lk_sin_perfil_ni_alquileres`, `src/reputacion/consentimiento.ts:67-89`).

## Textos
- Confirmación: «Se borra de tu lista, con su contrato y sus datos.» (`src/prueba/eliminar-textos.ts`). Con dos personas:
  «La invitación deja de funcionar. Si la otra persona abre el enlace, verá que ya no está disponible.»
- Invitación eliminada, usada, vencida o que no corresponde: «Esta invitación ya no está disponible. Si todavía la necesitas, pídele
  al dueño que te envíe una nueva.» (`lk_ver_invitacion`, migración línea 102). Es el mismo texto en todos los casos: no revela si el
  alquiler existió ni nada del dueño.
- Legal: Términos y Aviso de privacidad 1.12-demo (`src/legal/LEEME.md`). La 1.11-demo queda archivada en `/terminos-1-11` y `/privacidad-1-11`.

## Pruebas
- `src/servidor/__tests__/eliminar-alquiler-sql.test.ts`
- `eliminar-alquiler-revert-sql.test.ts`
- `invitacion-correo-verificado-sql.test.ts`
- `olvidar-invitacion.test.ts`
- `src/prueba/__tests__/eliminar-alquiler.test.ts`
- `src/legal/__tests__/version-1-12.test.tsx`

## Publicado (PR #35, 26/10/2026, hora de Costa Rica)
- Fecha de la 1.12-demo con `node scripts/fecha-1-12.mjs` («26 de octubre de 2026», commit `6641b4c`). PR #35 en verde (Lint, tests y build; Vercel) →
  merge `eefd0572834827a902d459026dbc5bcaee4b768d` (Lockumi, 12:45 a. m.) → deploy de producción `dpl_6seNq357tgANnCJfrvxtDuEmXWfB`
  (READY 12:45 a. m., app.lockumi.com).
- Migración `20261026010000_eliminar_ocultar_reiniciar` aplicada a las 12:45 a. m. (Management API, una transacción con su fila en
  `supabase_migrations.schema_migrations`). Verificado: fila registrada, `lk_borrar_alquiler` y `lk_se_puede_eliminar` sin permisos para
  `anon` ni `authenticated`, `lk_eliminar_alquiler`/`lk_reiniciar_mi_demo`/`lk_ver_invitacion` solo para `authenticated`, `lk_ocultos` en 0,
  `lk_contratos` igual (7). El encabezado del archivo de la migración todavía dice «no se aplicó»: es del momento en que se escribió.
- `prueba-completa/scripts/prod-eliminar-35.mjs` (12:47–12:48 a. m.) **todo OK**:
  - `/terminos` y `/privacidad` = «Versión 1.12-demo · 26 de octubre de 2026», con el mismo HTML que el build de eefd057, la frase de los
    registros de proveedores y la 15.7;
  - `/terminos-1-11` y `/privacidad-1-11` tienen el mismo HTML que `/terminos` y `/privacidad` de 7582483 (1.11-demo);
  - `/terminos-1-9` y `/privacidad-1-9` no cambian;
  - la pantalla de eliminar usó datos «Ejemplo» guardados solo en el navegador de prueba, que se borraron.
- Waitlist igual antes y después (12:49 a. m.): `waitlist` 2 filas `3b7472599f6777f360aa2f9dd7832386`, `waitlist_intentos` 1 fila
  `8a0f91b5d81476b2f6ed8554b32449ac`.
- Hoja: `prueba-completa/capturas/eliminar-alquiler/produccion/hoja-eliminar-alquiler-produccion.jpg` (en la caja).
- **Para deshacer:**
  1. `git revert -m 1 eefd057` y deploy. La guarda de fechas no bloquea, porque la 1.11-demo ya tiene fecha.
  2. Correr `supabase/revert/20261026010000_eliminar_ocultar_reiniciar_revert.sql` (una transacción; quita las 7 funciones y `lk_ocultos`,
     restaura `lk_ver_invitacion` y borra su fila de `schema_migrations`), por el SQL Editor o la Management API.
  3. Los alquileres ya eliminados no vuelven.
