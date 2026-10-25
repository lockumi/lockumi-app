# Correos del escenario C (COR-C-00 a COR-C-09)

PR #22, rama `paso17-escenario-c`. Todos los correos de C los envía **el servidor**: el navegador no elige textos, destinatarios ni momentos. Los textos son de Legal (`legal/correos-escenario-c.md`, borrador del 25/10/2026, 4:12 p. m.) y siguen marcados **«LEGAL: revisar»** hasta que Legal los confirme. **Nada se enciende con este PR.**

## Regla dura: ningún «LEGAL: revisar» sale en un correo real

| Dónde | Qué pasa con alguna marca pendiente | Prueba |
|---|---|---|
| Envío (`revisarTextos` en `api/_lib/correos-c.ts`) | 503 y no se llama a Resend: ni `procesarCorreos` (avisos, corrida diaria, `/api/tw`) ni `enviarCorreoCuenta` | `correos-c-envio.test.ts`, `correos-c-api.test.ts` |
| Build de producción (`guardaCorreos` en `vite.config.ts`) | Con `VERCEL_ENV=production`, `vite build` falla y lista las plantillas pendientes **y cualquier otra marca «LEGAL: revisar» visible** en `src/`, `api/` y `supabase/migrations/` (comentarios `//`, `{/* */}`, `<!-- -->`, `--`; Legal 25/10, 5:09 p. m., punto 10). Preview y local sí construyen | `correos-c-envio.test.ts`, `guarda-marcas.test.ts` |
| Excepción local para el E2E | `LOCKUMI_CORREOS_BORRADOR=1` **solo** fuera de Vercel (`VERCEL` vacío) y nunca con `VERCEL_ENV=production`; además solo envía a `lockumi(+etiqueta)@mail.grokbot.com` | `borradorPermitido` en los tests |

Para aprobar un texto: en `api/_lib/textos-correos.ts` se cambia `legal: 'revisar'` por `legal: 'revisado'` y el comentario de arriba por «LEGAL: revisado (fecha)». Un test exige que comentario y campo coincidan.

**Ojo al publicar:** mientras quede una marca, el build de producción de Vercel falla a propósito. Antes de llevar esto a master, Legal tiene que confirmar lo que queda (25/10, 5:09 p. m.): COR-C-02/d4, COR-C-02/d6, COR-C-04/d6, COR-C-06/partes, la página del enlace de COR-C-03, la Privacidad 1.9-demo (`privacidad.md:71`) y las marcas de las migraciones 20261025010000 y 20261025020000. `node scripts/textos-correos-doc.mjs` regenera la sección «Textos» de este archivo.

## Diseño

- **Un solo archivo de textos:** `api/_lib/textos-correos.ts` (C y los pies y notas comunes; `api/_lib/correo.ts` los reexporta para B).
- **Mismo diseño que la invitación (COR-C-00):** barra con el degradado #E8531F → #FFB08A, logo (`https://app.lockumi.com/icon-192.png`) y «Lockumi», fondo crema #FFF5EE, texto café #3D2A22, botones naranja #FF6B35. Sin ilustraciones ni contenido comercial. Remitente `Lockumi <invitaciones@lockumi.com>`.
- **Consentimiento en el servidor:** la casilla «Acepto que Lockumi me envíe avisos por correo» (AvisosCorreo, alquileres con otra persona) llama a `lk_guardar_consentimiento_correo`: guarda quién (sesión), papel (sale del servidor), correo, texto y hora. Desmarcarla borra la fila y el servidor deja de enviar. COR-C-08 y COR-C-09 son correos de servicio: salen sin casilla.
- **Una vez por evento:** cada correo tiene una clave (`COR-C-0x:<alquiler>:<papel>[:variante]`). `lk_correo_reservar` la reserva antes de llamar a Resend (que además recibe la misma clave como `Idempotency-Key`), y `lk_correo_marcar` la deja `enviado` o `fallido`. Un fallo se reintenta en la próxima pasada; una reserva `enviando` de más de 15 minutos también.
- **Registro:** `lk_correos_enviados` (clave, correo, papel, destinatario, estado, id de Resend, horas). Solo la clave de servicio la lee.
- **Sin disparadores en la base:** el servidor calcula lo pendiente con `lk_correos_pendientes(alquiler, ahora)` en tres momentos:
  1. después de cada paso en la app (`POST /api/correo { tipo: 'avisos', alquiler }`, solo una persona del alquiler);
  2. después de pagar en `/api/tw` (enviar, liberar, devolver-automatico, repartir);
  3. en la corrida diaria `/api/borrados` (cron de `vercel.json`, 09:00 UTC = 3:00 a. m. de Costa Rica, con `CRON_SECRET`): recordatorios y vencimiento de la mediación.
- **Vencimiento de la mediación, con o sin `CORREOS_C`** (Legal 25/10, 5:09 p. m., punto 3): `vencerMediaciones` (`api/_lib/correos-c.ts`) corre aparte de los correos: en la corrida diaria (siempre), después de cada acción con un alquiler en `/api/tw` y en cada aviso de la app (`tipo: 'avisos'`, después de revisar la sesión y que la persona participa). Legal pidió cada hora, pero **Vercel Hobby solo permite un cron diario** (una expresión por hora hace fallar el despliegue: https://vercel.com/docs/cron-jobs/usage-and-pricing), así que queda la corrida diaria más la revisión en cada paso.
- **Reloj de prueba:** `ahora` solo lo pasa el E2E (no es un parámetro HTTP).

### Interruptores (todos apagados hoy)

| Variable | Dónde | Qué hace |
|---|---|---|
| `VITE_CORREOS=1` | build | Muestra la casilla. (El aviso al servidor después de cada paso sale siempre en los alquileres con otra persona, para revisar el plazo de la mediación; sin `CORREOS_C=1` no envía nada) |
| `CORREOS_C=1` | servidor | Sin esto, `procesarCorreos` no hace nada (`{ apagado: true }`). El vencimiento de la mediación corre igual |
| `CORREO_MEDIACION` | servidor | Correo de la persona mediadora (versión separada de COR-C-05 y COR-C-06). Sin él, esa versión se omite |
| `CORREOS_ORIGEN` | servidor | Origen de los enlaces (por defecto `https://app.lockumi.com`; solo orígenes permitidos) |
| `CORREOS_SOLO_BUZON=1` | servidor | Solo envía al buzón de prueba |
| `LOCKUMI_CORREOS_BORRADOR=1` | local | Excepción del E2E (ver arriba). No funciona en Vercel |

## Base de datos: `supabase/migrations/20261025090000_c_correos.sql`

Solo agrega (3 tablas y 9 funciones nuevas, permisos y RLS de esas tablas). No cambia ni borra nada existente; el test `c-correos-sql.test.ts` lo comprueba (huella de las tablas `lk_*` y de `waitlist*` antes y después, nombres nuevos, sin `drop`/`alter`/`truncate` de tablas existentes, sin DML fuera de funciones).

- Tablas: `lk_correos_consentimiento` (RLS: cada persona ve solo su casilla), `lk_correos_enviados`, `lk_mediacion_plazos` (solo servicio).
- Funciones: `lk_sumar_habiles`, `lk_guardar_consentimiento_correo` (authenticated), `lk_mediacion_vencimientos`, `lk_correos_por_estado`, `lk_correos_pendientes`, `lk_correo_reservar`, `lk_correo_marcar`, `lk_correo_abierto`, `lk_correo_cuenta_registrado` (solo service_role).
- Aplicada en producción (sddgjnuvxzkrhhuczuly) el 25/10/2026, 4:25 p. m. (hora de Costa Rica), y vuelta a aplicar a las 4:31 p. m. (corrección del día 4/6). `lk_correos_por_estado` quedó reemplazada por `20261025100000_c_recordatorios_hacia_atras.sql` (abajo). `waitlist` (2 filas) y `waitlist_intentos` (1 fila) quedaron iguales (misma huella md5 antes y después).

## Estado de la ronda de Legal 25/10 (5:00 y 5:09 p. m.)

Prioridad del Coordinador (5:29 p. m.): primero lo que cambia el funcionamiento. Todo quedó en esta misma ronda (commit 0498407 y siguiente):

- **Funcionamiento:** recordatorios hacia atrás (abajo, aplicado en producción); vencimiento de la mediación con `CORREOS_C` apagado (arriba, «Cuándo se envían»); en C no hay «propuesta automática» en ningún correo ni pantalla (prueba en `src/prueba/__tests__/c-textos-legal.test.tsx`).
- **Textos de las 5:00 p. m.:** línea del plazo de la mediación (P-05), «solicitud» en la Privacidad, «el dueño» en COR-C-00.
- **Segunda parte (ya hecha, se puede revisar aparte):** hora en 12 h y montos con 2 decimales; guarda de todas las marcas; Privacidad :51 y :52; `SIGUE_RECLAMO_DOS` literal; historial de `api/_lib/tw.ts` («de prueba» y 2 decimales); COR-C-03 registra la apertura solo con el botón (`POST`); comentario de la línea 1 de la migración 090000.
- **Legal, 5:31 p. m.:** con las tres correcciones de funcionamiento (recordatorios hacia atrás con los textos aprobados de 02/d4, 02/d6 y 04/d6; vencimiento sin `CORREOS_C`; sin «propuesta automática», `SIGUE_RECLAMO_DOS` literal) aprueba las demás marcas de C tal como están. Quitar las marcas, `FECHA_V19`, el merge y las variables de Vercel van en un paso aparte, con el OK explícito de Katherine.
- **Para una ronda después de publicar:** vencimiento de la mediación cada hora (Vercel Hobby solo permite un cron diario; hace falta Pro o un cron externo).
- **Abierto para Legal:** texto de la página del enlace de COR-C-03; «(red de prueba)» en el historial de la disputa (`api/_lib/tw.ts`); con 2 decimales un reparto puede sumar 0,01 de más o de menos en pantalla (4,99 + 14,96 + 0,06 = 20,01 sobre 20,00).

## Recordatorios hacia atrás: `supabase/migrations/20261025100000_c_recordatorios_hacia_atras.sql`

Legal 25/10/2026, 5:09 p. m. (bloqueante): los recordatorios se cuentan **hacia atrás desde el vencimiento real** `{vence}` (con domingos y feriados, `lk_fin_plazo`), no desde el inicio. Solo reemplaza `lk_correos_por_estado` (`create or replace`, misma firma y permisos); no toca tablas ni datos. **Aplicada en producción el 25/10/2026 a las 5:25 p. m. (hora de Costa Rica)**, en una transacción; waitlist (2 filas) y waitlist_intentos (1 fila) con la misma huella antes y después, permisos iguales (postgres y service_role). No se registró en `supabase_migrations.schema_migrations` (igual que 20261025090000), porque solo se autorizó reemplazar la función.

- COR-C-02 «día 4» (quedan 3 días): `ahora ≥ fin − 3·plazo/7`; «día 6» (vence mañana): `ahora ≥ fin − plazo/7`. Con 7 días: 3 días y 1 día antes del fin.
- COR-C-04: igual, con `fin_inq = lk_fin_plazo(entregado_en, plazo)`.
- **Inicio del plazo del inquilino:** `entregado_en` es el momento en que el dueño envía el reclamo (`now()` en `lk_reclamar`). Legal lo acepta (25/10, 5:09 p. m.).
- Prueba: `c-correos-sql.test.ts` (fin del dueño corrido por el 25 de diciembre; fin del inquilino corrido por un domingo).

## P-06: plazo de 3 días hábiles de la mediación

- Al pasar a la mediación (rechazo o silencio), el servidor programa el plazo en `lk_mediacion_plazos`: desde la respuesta (o el paso a la mediación) + 3 días hábiles (lunes a viernes, sin feriados de Costa Rica, `lk_es_feriado`, hora de Costa Rica).
- 1 día antes: **COR-C-05 recordatorio** a las dos partes y a la persona mediadora.
- **Al vencer** (`lk_mediacion_vencimientos`, en cada pasada): se anota la hora en `vencido_en`, se escribe en el historial «Venció el plazo de 3 días hábiles de la Mediación Lockumi (demo) sin el mismo reparto aceptado por las dos partes. No se pagó nada: el monto reclamado sigue retenido y la mediación sigue abierta.» (LEGAL: revisado 25/10) y sale **COR-C-06 «sin acuerdo»** a las dos partes y a la persona mediadora. **No se paga nada ni se aplica ninguna regla** (la 6.5.1 no se ofrece en C); las partes todavía pueden aceptar el mismo reparto en la app.
- Legal tiene que redactar la frase definitiva de qué pasa al vencer: hoy está en el evento de arriba y en `COR-C-06/vencida` y `COR-C-06/vencida-mediacion`.

## Prueba real (25/10/2026)

`NODE_OPTIONS=--experimental-websocket ./correr-c.sh --prod-datos-prueba --otra-vez` (commit c522c2a): 111 pasos, 0 fallas, Stellar testnet, dos cuentas. Los 45 correos (5 invitaciones y 40 del servidor) llegaron entre las 4:43:58 y las 4:46:06 p. m. (hora de Costa Rica), solo a `lockumi+e2ec-…@mail.grokbot.com`. Capturas: `prueba-completa/capturas/paso17-escenario-c/correos/` (fuera del repo). Luego `--limpiar`: todo en 0.

## Lista de correos y disparadores

| Id | Para | Cuándo |
|---|---|---|
| COR-C-00 | inquilino invitado | Al invitar (ya existía; `api/_lib/correo.ts`, un solo correo por alquiler) |
| COR-C-01 | dueño e inquilino | Empieza el plazo del dueño («Recibí la casa» o 2 días después de entregar). La del dueño es su día 1 |
| COR-C-02 | dueño | «Quedan 3 días» y «vence mañana», contados hacia atrás desde el vencimiento real (3/7 y 1/7 del plazo antes del fin), sin reclamo ni aprobación; solo el último que toca |
| COR-C-03 | inquilino | El dueño reclama. El botón «Ver el reclamo» abre `GET /api/correo?abrir=<enlace>`, que **solo muestra una página** con el botón «Ver el reclamo en la app». La apertura (6.5 b) se registra **solo al tocar ese botón** (`POST`, Legal 25/10 punto 4), porque los programas que revisan enlaces también hacen GET. El texto de esta página es nuevo: **LEGAL: revisar** (`api/_lib/correos-c.ts`, `PAGINA_ABRIR`) |
| COR-C-04 | inquilino | «Quedan 3 días» y «vence mañana» de su plazo para responder (hacia atrás desde `fin_inq`), si no respondió |
| COR-C-05 | dueño e inquilino + versión de la persona mediadora | Pasa a la mediación (rechazo o silencio); recordatorio 1 día antes de vencer |
| COR-C-06 | dueño e inquilino | Resultado de la mediación (reparto aceptado por los dos y pagado). Variante «sin acuerdo» al vencer (también a la mediadora) |
| COR-C-07 | dueño e inquilino | Cierre con pago: devuelto (aprobó), automático (venció sin reclamo) o acuerdo; montos menos el 0,3 % |
| COR-C-08 | la persona que pide borrar su cuenta | Recibimos el pedido (variantes A y B). Correo de servicio, sin casilla. `POST /api/correo { tipo: 'cuenta' }` con `CRON_SECRET` |
| COR-C-09 | la persona | Cuenta eliminada. Correo de servicio, sin casilla |

## Textos (generados desde `api/_lib/textos-correos.ts`, con datos de ejemplo)

Datos de ejemplo: depósito 2,00, reclamo 0,50, reparto 0,50 / 1,50, vence el 29 oct 2026, 9:00 a. m. Hora en 12 h y montos con 2 decimales (Legal 25/10, 5:09 p. m., punto 8).

### COR-C-01/dueno · `api/_lib/textos-correos.ts:73` · **LEGAL: revisado (25/10)**

- Asunto: Tienes 7 días naturales para revisar la casa y reclamar
- Botones: «Revisar y reclamar», «Todo bien, devolver» · nota: confirmar · pie de baja: sí

> Empezó tu plazo para revisar la casa y, si hace falta, reclamar del depósito de prueba de 2,00 USDC de prueba. Vence el 29 oct 2026, 9:00 a. m., hora de Costa Rica. Solo se puede reclamar por daños o faltantes con pruebas, nunca por el desgaste normal (Anexo 6-A). Si todo está bien, puedes tocar «Todo bien, devolver». Si el plazo vence sin reclamo, se devuelve todo el depósito de prueba al inquilino. La devolución es automática: el 100 % al inquilino, menos el 0,3 % de comisión de Trustless Work, y puede tardar hasta 24 horas después de que vence el plazo. No la decide una persona ni pasa a la Mediación Lockumi (demo).

### COR-C-01/inquilino · `api/_lib/textos-correos.ts:77` · **LEGAL: revisado (25/10)**

- Asunto: Empezó el plazo del dueño para revisar la casa
- Botones: «Ver el alquiler» · nota: uno · pie de baja: sí

> El dueño confirmó que recibió la casa. Empezó su plazo de 7 días naturales para revisar la casa y, si hace falta, reclamar de tu depósito de prueba de 2,00 USDC de prueba. Vence el 29 oct 2026, 9:00 a. m., hora de Costa Rica. Solo puede reclamar por daños o faltantes con pruebas, nunca por el desgaste normal (Anexo 6-A). Si reclama, verás el reclamo en la app y tendrás 7 días naturales para responder. Si el dueño no aprueba ni reclama antes de que venza su plazo, se te devuelve automáticamente el 100 % del depósito de prueba, menos el 0,3 % de comisión de Trustless Work. Puede tardar hasta 24 horas después de que vence el plazo. No lo decide una persona. Por ahora no tienes que hacer nada.

### COR-C-02/d4 · `api/_lib/textos-correos.ts:81` · **LEGAL: revisar**

- Asunto: Te quedan 3 días para revisar y reclamar
- Botones: «Revisar y reclamar», «Todo bien, devolver» · nota: confirmar · pie de baja: sí

> Te quedan 3 días para revisar y reclamar. Vence el 29 oct 2026, 9:00 a. m., hora de Costa Rica. Después, el depósito de prueba se devuelve completo al inquilino. La devolución es automática, menos el 0,3 % de comisión de Trustless Work, y puede tardar hasta 24 horas después de que vence el plazo.

### COR-C-02/d6 · `api/_lib/textos-correos.ts:85` · **LEGAL: revisar**

- Asunto: Último aviso: tu plazo para reclamar vence mañana
- Botones: «Revisar y reclamar», «Todo bien, devolver» · nota: confirmar · pie de baja: sí

> Último aviso: tu plazo para reclamar vence mañana, 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si no reclamas, el depósito de prueba se devuelve completo al inquilino. La devolución es automática, menos el 0,3 % de comisión de Trustless Work, y puede tardar hasta 24 horas después de que vence el plazo.

### COR-C-03 · `api/_lib/textos-correos.ts:89` · **LEGAL: revisado (25/10)**

- Asunto: Tienes un reclamo sobre tu depósito de prueba: 7 días naturales para responder
- Botones: «Ver el reclamo» · nota: uno · pie de baja: sí

> El dueño reclamó 0,50 USDC de prueba de tu depósito de prueba de 2,00 USDC de prueba. Responde antes del 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo). En la app puedes aceptar el reclamo o no aceptarlo. Si lo aceptas, el dueño recibe 0,50 USDC de prueba y tú el resto, cada monto menos el 0,3 % de comisión de Trustless Work. Si no lo aceptas o no respondes, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. El silencio no significa que aceptes el reclamo. Cuando abres el reclamo, desde este botón o desde la app, la app registra la fecha y la hora de la primera vez que lo abres, y lo anota en el historial del alquiler, que también ve el dueño. En esta versión, ese registro no cambia lo que pasa con el depósito de prueba. Siempre puedes ir a los tribunales.

### COR-C-04/d4 · `api/_lib/textos-correos.ts:93` · **LEGAL: revisado (25/10)**

- Asunto: Te quedan 3 días para responder el reclamo de 0,50 USDC de prueba
- Botones: «Responder» · nota: uno · pie de baja: sí

> Te quedan 3 días para responder el reclamo de 0,50 USDC de prueba sobre tu depósito de prueba de 2,00 USDC de prueba. Vence el 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. El silencio no significa que aceptes el reclamo.

### COR-C-04/d6 · `api/_lib/textos-correos.ts:97` · **LEGAL: revisar**

- Asunto: Último aviso: tu plazo vence mañana
- Botones: «Responder ahora» · nota: uno · pie de baja: sí

> Último aviso: tu plazo vence mañana, 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. El silencio no significa que aceptes el reclamo. Siempre puedes ir a los tribunales.

### COR-C-05/partes · `api/_lib/textos-correos.ts:101` · **LEGAL: revisado (25/10)**

- Asunto: El inquilino no aceptó el reclamo: el caso pasa a la Mediación Lockumi (demo)
- Botones: «Ver el caso» · nota: uno · pie de baja: sí

> El inquilino no aceptó el reclamo de 0,50 USDC de prueba. El caso pasa a la Mediación Lockumi (demo), sin costo. Una persona del equipo de Lockumi puede ayudarles a buscar un acuerdo. No decide por ustedes. No es mediadora certificada ni neutral: es parte de Lockumi, que no gana nada con el resultado del reclamo. Responde en un plazo de 3 días hábiles: hasta el 29 oct 2026, 9:00 a. m., hora de Costa Rica. En la app, cada parte elige el reparto que acepta. El reparto solo se aplica si las dos partes aceptan el mismo, y cada monto se paga menos el 0,3 % de comisión de Trustless Work. Mientras no haya acuerdo, el monto reclamado sigue retenido, y cualquiera de las dos partes puede acudir a los tribunales de Costa Rica o a otro mecanismo que la ley permita. La Mediación Lockumi (demo) no tiene efecto legal y no es una mediación en el sentido de la Ley 7727.

### COR-C-05/mediacion · `api/_lib/textos-correos.ts:105` · **LEGAL: revisado (25/10)**

- Asunto: Nuevo caso en la Mediación Lockumi (demo)
- Botones: «Abrir el caso» · nota: uno · pie de baja: no (correo de servicio)

> Un alquiler de ejemplo pasó a la Mediación Lockumi (demo). Motivo: el inquilino no aceptó el reclamo. Reclamado: 0,50 USDC de prueba de un depósito de prueba de 2,00 USDC de prueba. Plazo para responder: 29 oct 2026, 9:00 a. m., hora de Costa Rica (3 días hábiles). Abre el caso en la app para ver el reclamo, la respuesta y las fotos. Recuerda: no decides por las partes. Solo puedes registrar el acuerdo cuando las dos partes aceptaron en la app el mismo reparto. Lo que veas en este caso es confidencial: úsalo solo para este reclamo, no lo compartas con terceros ni lo copies fuera de la app. Aunque la Mediación Lockumi (demo) no es una mediación de la Ley 7727, seguimos el mismo deber de confidencialidad que esa ley pide a quien media.

### COR-C-05/recordatorio · `api/_lib/textos-correos.ts:109` · **LEGAL: revisado (25/10)**

- Asunto: Mañana vence el plazo de la Mediación Lockumi (demo)
- Botones: «Ver el caso» · nota: uno · pie de baja: sí

> El plazo de 3 días hábiles de la Mediación Lockumi (demo) vence mañana, 29 oct 2026, 9:00 a. m., hora de Costa Rica. Si quieren llegar a un acuerdo, cada parte elige en la app el reparto que acepta; el reparto solo se aplica si las dos partes aceptan el mismo. Si vence sin acuerdo, no se paga nada: el monto reclamado de 0,50 USDC de prueba sigue retenido y la mediación sigue abierta.

### COR-C-05/recordatorio-mediacion · `api/_lib/textos-correos.ts:113` · **LEGAL: revisado (25/10)**

- Asunto: Mañana vence el plazo de un caso de la Mediación Lockumi (demo)
- Botones: «Abrir el caso» · nota: uno · pie de baja: no (correo de servicio)

> El plazo de 3 días hábiles de un caso de la Mediación Lockumi (demo) vence mañana, 29 oct 2026, 9:00 a. m., hora de Costa Rica. Reclamado: 0,50 USDC de prueba de un depósito de prueba de 2,00 USDC de prueba. Recuerda: no decides por las partes, y lo que veas en este caso es confidencial.

### COR-C-06/partes · `api/_lib/textos-correos.ts:117` · **LEGAL: revisar**

- Asunto: Se registró el acuerdo de la Mediación Lockumi (demo)
- Botones: «Ver el resultado» · nota: uno · pie de baja: sí

> Las dos partes aceptaron en la app el mismo reparto del depósito de prueba de 2,00 USDC de prueba, y la persona mediadora lo registró. La persona mediadora no decidió el reparto: solo lo registró con las dos aceptaciones. Reparto: 0,50 USDC de prueba al dueño y 1,50 USDC de prueba al inquilino, cada monto menos el 0,3 % de comisión de Trustless Work. Llegan 0,50 USDC de prueba al dueño y 1,50 USDC de prueba al inquilino; Trustless Work descuenta 0,01 USDC de prueba, y Lockumi no recibe nada. El reparto se paga en la red de prueba en cuanto la red lo confirme. Esto no es una sentencia ni una decisión de Lockumi, y no tiene efecto legal: es lo que las dos partes aceptaron dentro de la demo, según las reglas de los Términos (cláusulas 2.2 b y 6.8 e). Cualquiera de las dos partes puede acudir a los tribunales de Costa Rica. Borramos los datos de la mediación 30 días después de cerrar el caso, salvo que una de las partes nos pida guardarlos para un reclamo fuera de la app.

### COR-C-06/vencida · `api/_lib/textos-correos.ts:121` · **LEGAL: revisado (25/10)**

- Asunto: Venció el plazo de la Mediación Lockumi (demo) sin acuerdo
- Botones: «Ver el caso» · nota: uno · pie de baja: sí

> Venció el plazo de 3 días hábiles de la Mediación Lockumi (demo), el 29 oct 2026, 9:00 a. m., hora de Costa Rica, sin que las dos partes aceptaran el mismo reparto. No se pagó nada y no se aplicó ninguna regla: el monto reclamado de 0,50 USDC de prueba sigue retenido. La mediación sigue abierta: si las dos partes aceptan en la app el mismo reparto, la persona mediadora lo registra y se paga, cada monto menos el 0,3 % de comisión de Trustless Work. Cualquiera de las dos partes puede acudir a los tribunales de Costa Rica.

### COR-C-06/vencida-mediacion · `api/_lib/textos-correos.ts:125` · **LEGAL: revisado (25/10)**

- Asunto: Venció sin acuerdo el plazo de un caso de la Mediación Lockumi (demo)
- Botones: «Abrir el caso» · nota: uno · pie de baja: no (correo de servicio)

> Venció el plazo de 3 días hábiles de un caso de la Mediación Lockumi (demo), el 29 oct 2026, 9:00 a. m., hora de Costa Rica, sin el mismo reparto aceptado por las dos partes. No se pagó nada: el monto reclamado de 0,50 USDC de prueba sigue retenido y el caso sigue abierto. Recuerda: no decides por las partes, y lo que veas en este caso es confidencial.

### COR-C-07/devuelto · `api/_lib/textos-correos.ts:129` · **LEGAL: revisado (25/10)**

- Asunto: Se devolvió todo el depósito de prueba al inquilino
- Botones: «Ver el alquiler» · nota: uno · pie de baja: sí

> El dueño tocó «Todo bien, devolver». Se devuelve al inquilino todo el depósito de prueba de 2,00 USDC de prueba, menos el 0,3 % de comisión de Trustless Work: llegan 1,99 USDC de prueba. El dueño y Lockumi no reciben nada. Se entrega en cuanto la red de prueba lo confirme. El dueño ya no puede reclamar en la app.

### COR-C-07/automatico · `api/_lib/textos-correos.ts:133` · **LEGAL: revisado (25/10)**

- Asunto: Venció el plazo sin reclamo: se devolvió el 100 % del depósito de prueba al inquilino
- Botones: «Ver el alquiler» · nota: uno · pie de baja: sí

> El dueño no aprobó ni reclamó dentro de su plazo. El sistema de Lockumi abrió una disputa en la red de prueba solo para poder devolver el depósito de prueba, y otra cuenta de Lockumi, la que resuelve disputas, entregó el 100 % al inquilino: 2,00 USDC de prueba, menos el 0,3 % de comisión de Trustless Work. Llegan 1,99 USDC de prueba. El dueño y Lockumi no reciben nada. Ninguna persona decidió este reparto.

### COR-C-07/acuerdo · `api/_lib/textos-correos.ts:137` · **LEGAL: revisado (25/10)**

- Asunto: El inquilino aceptó el reclamo: se repartió el depósito de prueba
- Botones: «Ver el alquiler» · nota: uno · pie de baja: sí

> El inquilino aceptó el reclamo de 0,50 USDC de prueba. Reparto del depósito de prueba de 2,00 USDC de prueba: 0,50 USDC de prueba al dueño y 1,50 USDC de prueba al inquilino, cada monto menos el 0,3 % de comisión de Trustless Work. Llegan 0,50 USDC de prueba al dueño y 1,50 USDC de prueba al inquilino. Lockumi no recibe nada. Se paga en la red de prueba en cuanto la red lo confirme. Es lo que las dos partes aceptaron en la app; no tiene efecto legal, y cualquiera de las dos puede acudir a los tribunales de Costa Rica.

### COR-C-08/A · `api/_lib/textos-correos.ts:141` · **LEGAL: revisado (25/10)**

- Asunto: Recibimos tu pedido para eliminar tu cuenta de Lockumi
- Botones: ninguno · nota: ninguna · pie de baja: no (correo de servicio)

> Recibimos tu pedido para eliminar tu cuenta. Lo pediste el 26 oct 2026 a las 9:00 a. m. (hora de Costa Rica). Tu perfil ya no se muestra, y eliminamos tu cuenta en un máximo de 5 días hábiles. Fecha límite: 2 nov 2026. Borramos tus datos de reputación (puntaje, insignias, perfil y el historial que alimenta el puntaje), y no se pueden recuperar. Los datos del contrato y del depósito de prueba siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar. Esta solicitud no se puede deshacer. Si no hiciste este pedido, escríbenos a business.applockumi@gmail.com.

### COR-C-08/B · `api/_lib/textos-correos.ts:145` · **LEGAL: revisado (25/10)**

- Asunto: Recibimos tu pedido para eliminar tu cuenta de Lockumi
- Botones: ninguno · nota: ninguna · pie de baja: no (correo de servicio)

> Recibimos tu pedido para eliminar tu cuenta. Lo pediste el 26 oct 2026 a las 9:00 a. m. (hora de Costa Rica). Tienes un alquiler abierto. Tu perfil ya no se muestra, y tu cuenta se eliminará cuando el alquiler se cierre, en un máximo de 5 días hábiles después del cierre. Mientras tanto, solo usamos tus datos para cerrar el alquiler; puedes usar Lockumi para cerrarlo, y la otra parte sigue viendo el contrato y el historial. Los datos del contrato y del depósito de prueba siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar. Esta solicitud no se puede deshacer. Si no hiciste este pedido, escríbenos a business.applockumi@gmail.com.

### COR-C-09 · `api/_lib/textos-correos.ts:149` · **LEGAL: revisado (25/10)**

- Asunto: Eliminamos tu cuenta de Lockumi
- Botones: ninguno · nota: ninguna · pie de baja: no (correo de servicio)

> Eliminamos tu cuenta de Lockumi el 28 oct 2026, como lo pediste el 26 oct 2026. Borramos tu perfil y tus datos de reputación (puntaje, insignias, perfil y el historial que alimenta el puntaje), y no se pueden recuperar. Los datos del contrato y del depósito de prueba siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar, y no podemos borrar las capturas ni las imágenes que otras personas ya hayan guardado. Este es el último correo sobre tu cuenta. Si tienes una consulta, escríbenos a business.applockumi@gmail.com.
