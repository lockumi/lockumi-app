# Reputación (paso 19)

Estado: **borrador, no publicado**. Rama `paso19-reputacion`. Todo va detrás de `VITE_REPUTACION` (apagado por defecto y en producción).
Nada se aplicó a producción: la migración está escrita y **no aplicada** (proyecto `sddgjnuvxzkrhhuczuly`).

Fuente única de textos y reglas: `legal/reputacion-textos-para-producto.md` (aprobado por Legal, versión del 25/10/2026, 2:24 p. m., hora de Costa Rica).
Reemplaza a `legal/reputacion-textos.md`. Los textos REP-01 a REP-15 están copiados al pie de la letra en `src/reputacion/textos.ts`
(REP-14 y REP-15 en `src/legal/v17/*.md`, en bloques `<!-- si: reputacion -->`).

## El interruptor

| `VITE_REPUTACION` | Qué pasa |
|---|---|
| sin definir (producción) | La app se ve igual. Las pantallas (`src/reputacion/Pantallas.tsx` y `reputacion.css`) no entran en el build. Los textos de REP-14 y REP-15 viajan en los `.md` de la 1.7-demo, pero no se muestran. La prueba `apagado.test.tsx` compara las pantallas con sus instantáneas. |
| `1` | REP-01 antes de crear la cuenta, perfil, puntaje, vitrinas, revisión, avisos, eliminación de la cuenta y REP-14/REP-15 en `/privacidad` y `/terminos` (con la prueba completa). |

Comprobar el build apagado: `npx vite build --outDir /tmp/off` y buscar «Ver y aceptar» o «Pantallas» en `/tmp/off/assets` (no debe aparecer). La única
frase de reputación que existe hoy en producción es la del Aviso 1.6/1.7 («no calculamos ningún puntaje de reputación»).

## Flujo

1. **Antes de crear la cuenta (REP-01, regla 5):** pantalla aparte, separada de los Términos, con la casilla de REP-01 y la de REP-01b (mayoría de
   edad), las dos sin marcar. [Continuar] está desactivado hasta marcar las dos. Enlaces: «Ver un ejemplo de perfil» (REP-02), «Cómo se calcula el
   puntaje» (REP-04) y «Aviso de privacidad». [No crear mi cuenta] lleva a una pantalla breve («No creaste tu cuenta…», redacción nuestra).
   - Se guarda en el navegador (`lockumi.reputacion.previa.v1`): versión, fecha (ISO), hora de Costa Rica y el texto aceptado (Ley 8968).
   - No se toca el login ni Cavos: `App.tsx` envuelve a `<Login/>` con `Previa`. Al entrar, `vincularPrevia` pasa la aceptación a la cuenta
     (`lockumi.reputacion.v1.<correo>`, campo `rep01`) y la borra del navegador.
   - Después falta un último paso: nombre visible (nombre e inicial del apellido) y cantón.
2. **Cuentas 1.7-demo sin REP-01 (regla provisional, Katherine 2:33 p. m.):** al entrar ven REP-13 con [Ver cambios] (abre REP-01 en
   `#/perfil/aceptar`), «Ahora no», «Salir» y «Eliminar mi cuenta». Con «Ahora no» (guardado en la sesión del navegador) sus alquileres abiertos siguen
   igual, pero `#/crear` y los enlaces de invitación muestran la tarjeta:
   «Para crear o unirte a un alquiler nuevo, primero acepta tu perfil de reputación. Tus alquileres abiertos siguen funcionando igual.» [Ver y aceptar].
3. **Con la reputación aceptada:** la app se usa igual que siempre. «Tu perfil en Lockumi» en Inicio lleva a `#/perfil`.

## Reglas del puntaje (`src/reputacion/puntaje.ts`)

- Cada alquiler cerrado vale 5,0; el puntaje es el promedio, con un decimal. Solo alquileres cerrados en la app; las simulaciones no cuentan.
- **Inquilino:** baja solo si el reclamo terminó con un descuento del depósito (aceptado, acuerdo o mediación), en proporción a lo descontado.
- **Dueño:** baja solo si, en un acuerdo o en la mediación, se devolvió al inquilino el **90 % o más** de lo reclamado (`UMBRAL_CASI_TODO`), calculado
  sobre el monto reclamado y **antes** del 0,3 % de Trustless Work; baja en proporción a lo devuelto sobre el depósito (800 / 300 → 3,1).
- No baja por abrir un reclamo, por responderlo, por un reclamo fuera de plazo (5.3 d) ni por ir a los tribunales.
- **Siempre visible desde el 3.er alquiler cerrado** (alto o bajo). Antes: «Nuevo en Lockumi · n alquileres cerrados».
- **«En revisión»** mientras haya un reclamo abierto o una revisión pedida (esos alquileres no cuentan).
- **10 años:** un hecho negativo deja de contar 10 años después de que ocurrió (y se avisa con REP-12).
- Llave Lockumi: 10 o más alquileres, 4,8 o más, fotos completas y sin hechos negativos en 12 meses.
- Sin rankings, números de posición ni filtros por puntaje. Las vitrinas se ordenan por cantón y precio (1 de cada 3 tarjetas es para nuevos) y solo
  muestran el cantón (o la provincia si hay menos de 10 personas).

## Revisión, avisos y protección

- **REP-11** `#/perfil/calculo/corregir` y `#/perfil/revision`: se elige el alquiler, se explica qué está mal y, si se quiere, una nota de hasta 300
  caracteres. Acuse al instante con fecha y hora y fecha límite de respuesta (5 días hábiles de Costa Rica). Lógica en `src/reputacion/revision.ts`.
- **REP-12** `src/reputacion/avisos.ts`: aviso en la app cuando el puntaje cambia o pasa a «En revisión», y cuando un hecho deja de contar por los
  10 años. **El correo queda pendiente** (`VITE_CORREOS` sigue apagado).
- **Regla 6:** `<meta name="robots" content="noindex, nofollow">` en las rutas `#/perfil` (además del `noindex` de `index.html`). Nadie puede
  buscar por nombre. El límite de consultas para los perfiles públicos queda para el servidor (pendiente).

## Eliminar la cuenta (REP-09)

Gratis, desde «Tu perfil en Lockumi › Eliminar mi cuenta» o por correo a business.applockumi@gmail.com. El perfil deja de verse al instante y
todo se borra en un máximo de 5 días hábiles (sin sábados, domingos ni feriados de Costa Rica; `src/reputacion/borrado.ts` y
`lk_fecha_limite_borrado`). **TODO (Legal):** qué pasa con un alquiler abierto al eliminar la cuenta; no hay texto todavía.

## Migración (escrita, NO aplicada)

`supabase/migrations/20261025140000_reputacion.sql`: `lk_reputacion_perfiles`, `lk_reputacion_aceptaciones` (REP-01: versión, texto y
`aceptado_en` con fecha y hora), `lk_reputacion_consentimientos` (solo vitrinas), `lk_reputacion_eventos`, `lk_reputacion_revisiones` (nota ≤ 300),
`lk_solicitudes_borrado`, y las funciones `lk_pedir_borrado_cuenta` y `lk_borrar_cuentas_pedidas` (también borra lo negativo de más de 10 años).
pg_cron opcional. Probada con PGlite (`src/servidor/__tests__/reputacion-sql.test.ts`). Antes de aplicarla: OK de Legal y de Katherine.

## Pruebas

- Unitarias: `src/reputacion/__tests__/` (puntaje, consentimiento, borrado, revisión, avisos, encendido y apagado con instantáneas).
- **Dos cuentas (E2E, solo local):**
  ```
  VITE_PRUEBA_COMPLETA=1 VITE_TRUSTLESS=1 VITE_REPUTACION=1 npx vite build --outDir /tmp/rp-dist
  npx vite preview --outDir /tmp/rp-dist --port 4319 &
  E2E_BASE=http://localhost:4319 E2E_CHROME=/usr/bin/google-chrome npx playwright test -c e2e pruebas/reputacion.e2e.ts --project=dueno
  ```
  Dueño = cuenta nueva (REP-01 antes del login → datos → 4,2). Inquilino = cuenta 1.7-demo (REP-13 → «Ahora no» → tarjeta de bloqueo en
  «Nuevo alquiler» → [Ver y aceptar] → REP-01 → 4,6 → revisión «En revisión» → elimina su cuenta). La prueba se salta sola contra app.lockumi.com.

## Pendientes

**Legal:** alquiler abierto al eliminar la cuenta; fecha de publicación de la 1.8-demo (hoy `/privacidad` sigue diciendo 1.7-demo aunque REP-13
nombra la 1.8-demo); REP-14 y REP-15 dicen «Ajustes › Cuenta › …», pero la app no tiene Ajustes (el camino real es «Tu perfil en Lockumi › Eliminar
mi cuenta»); en REP-04, «{n}» se muestra como «0, 1 o 2»; textos propios marcados `LEGAL: revisar` (pantalla «No creaste tu cuenta», acuse de la
revisión, último paso del nombre y cantón, «Ahora no» de REP-13, tarjeta de Inicio).
**Producto:** correo de los avisos REP-12; límite de consultas y servidor público de perfiles; aplicar la migración; si «Ahora no» en REP-13 se
mantiene; si REP-01 debe volver a verse antes del login a quien ya tiene cuenta (hoy se ve cada vez que no hay sesión, salvo que ya se aceptó en ese
navegador); no se implementan (por ahora): perfil solo para registrados, apagar Destacados/Nuevos, retirar un reclamo, espejo del 10 %.
