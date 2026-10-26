# Textos legales de la app

Cada documento es **un solo archivo Markdown** en esta carpeta. La app lo carga en el build
(`import.meta.glob('./*.md', { query: '?raw' })` en `documentos.ts`), lo convierte a HTML y crea
su ruta (`terminos.md` → `/terminos`) y su enlace en el pie.

| Archivo         | Ruta          | Origen |
|-----------------|---------------|--------|
| `terminos.md`   | `/terminos`   | `/workspace/lockumi-landing/terminos-app-1.5-borrador.md`, copia exacta (1.5-demo), con la cláusula 6.7 cambiada por Legal el 24/10/2026 (ronda 2) → **1.6-demo · 24 de octubre de 2026**. El borrador de `lockumi-landing` no tiene ese cambio. |
| `privacidad.md` | `/privacidad` | `/workspace/lockumi-landing/privacidad-app-1.5-borrador.md`, copia exacta (1.5-demo, sin nota interna), con el párrafo de Freighter cambiado por Legal el 24/10/2026 (ronda 7) → **1.6-demo · 24 de octubre de 2026** |

## Reemplazar un texto
Sustituir el archivo `.md` (sin editar su contenido; en privacidad, quitar la "Nota interna" si viene).
- **Versión y fecha:** se leen de la línea `**Versión 1.5-demo · 20 de octubre de 2026**` (o `**Versión:** … · **Fecha:** …`)
  del propio texto, o de un bloque de metadatos `---\nversion: …\nfecha: …\n---` al inicio. Si el texto ya las muestra,
  la página no las repite; si no, las muestra una vez arriba.
- **Casilla de consentimiento de privacidad:** su texto es fijo en el código (`CONSENTIMIENTO_PRIVACIDAD` en `documentos.ts`).
- **Marca de revisión por abogado:** si el texto no dice "revisión por abogado", la página muestra arriba el aviso
  discreto "Pendiente de revisión por abogado" (`PaginaLegal.tsx`, `legal__revision`).
- Si cambia la versión, la aceptación anterior deja de contar y la casilla vuelve a salir sin marcar.

Las aceptaciones se guardan en `localStorage` (`lockumi.terminos.aceptacion`, `lockumi.privacidad.consentimiento`)
como `{ version, fecha }` y en el usuario (`lockumi.usuario` → `terminos`, `privacidad`). Este LEEME no es una página.

## Cambios de Legal dentro del texto

- **1.6-demo (24 oct 2026, rama `contrato-compacto`, sin publicar):** solo la cláusula 6.7 «Desacuerdo», con el texto exacto de Legal
  (la mediación es simulada y el reparto se elige con «Resolver el reclamo (simulación)»; en un servicio real, una persona mediadora
  neutral ayuda sin decidir y, sin acuerdo, se puede acudir a los tribunales de Costa Rica). Marcado con una nota interna
  `<!-- LEGAL: revisado (24/10) … -->`, que no se publica. Como cambió la versión, quien aceptó la 1.5-demo vuelve a ver la casilla de
  Términos sin marcar la próxima vez que pase por «Entrar». El Aviso de privacidad sigue en 1.5-demo y su consentimiento sigue valiendo.
  Publicar necesita el OK de Katherine.
- **1.6-demo, ronda 3 (24 oct 2026, misma versión y fecha, sin publicar):** 4.1 a) cambia «Lockumi no custodia tus tokens de prueba»
  por el texto de Legal («Lockumi no guarda tus tokens de prueba en una cuenta propia: quedan en un contrato de escrow en la red de
  prueba. Si hay un reclamo, la cuenta de Lockumi puede ejecutar el reparto.»). 5.3 (Cavos) y 5.4 no cambian; el porqué está en
  `docs/alertas.md`, «Legal, ronda 3». Como la versión no cambió, quien ya aceptó la 1.6-demo no vuelve a ver la casilla.
- **1.6-demo, ronda 4 (24 oct 2026, misma versión y fecha, sin publicar):** 5.3 (Cavos) pasa al texto exacto de Legal («Tu billetera
  la protege Cavos con tus aparatos, y Lockumi no tiene tus llaves. … Si eso cambia, actualizaremos estos Términos antes de usarla.»).
  Ya no nombra a Cavos, LLC ni enlaza sus términos. Prueba que lo respalda: `src/__tests__/cavos-sin-firma-silenciosa.test.ts`.
- **1.6-demo, ronda 5 (24 oct 2026, misma versión y fecha, sin publicar):** 6.5 dice «Si no reclama, después de ese plazo se libera todo al
  inquilino.». 5.3 no cambia en la rama, pero **no se publica** hasta que Katherine decida la variante (a) o (b): ver PLAN.md y
  `docs/alertas.md`, «Legal, ronda 5».
- **1.6-demo, ronda 6 (24 oct 2026, misma versión y fecha, sin publicar):** 5.3 pasa a «5.3 **Firmas.** …», el texto exacto de Legal
  (quién firma cada acción; Lockumi no usa la firma sin confirmación de Cavos). Ya no depende del cambio en Cavos (ver PLAN.md).
- **Ronda 7 (24 oct 2026, sin publicar):** Términos 1.6-demo (misma versión): 3.1, 5.3 y 5.5.1 b) con el texto de Legal sobre quién
  firma. **Aviso de privacidad → 1.6-demo · 24 de octubre de 2026** (párrafo de Freighter). Como cambió su versión, el consentimiento
  1.5-demo ya no cuenta. En «Entrar», quien venga de producción (las dos en 1.5-demo) marca **las dos casillas otra vez, una sola vez**.
  Quien ya aceptó Términos 1.6-demo en la vista previa solo marca la de privacidad.
- **Ronda 9 (24 oct 2026, sin publicar):** Términos 1.6-demo (misma versión y fecha): 5.3 reemplazada entera por el texto de Legal
  (a–f: depósito, compra, aprobación, liberación, reclamos y Cavos), 3.1 y 5.5.1 b). **5.3 e) no coincide con producción**
  (`modoVideo` abre la disputa en la red): ver `docs/alertas.md`, «Legal, ronda 9».
- **Ronda 9b (24 oct 2026, sin publicar, misma versión 1.6-demo):** opción (a) de Legal, solo texto. 2.2 b) y 5.3 e) dicen que el reclamo
  y el reparto sí van a la red de prueba. 5.3 a) agrega la cuenta de respaldo, b) dice que la línea de USDC puede pedir confirmación o no,
  y d) dice quién firma la aprobación si nadie aprobó. Privacidad (Freighter): «ver la cláusula 5.3 de los Términos». Riesgo de producto
  y bloqueo del modo de dos personas: `docs/alertas.md`, «Legal, ronda 9b».
  6.3 f): la parte no reclamada se devuelve cuando se cierra el reclamo, no «de inmediato» (todo el depósito queda bloqueado).
- **Ronda 9c (24 oct 2026, sin publicar, misma versión 1.6-demo):** Términos 2.1 «guardado con reglas claras» (antes «protegido»).
  El aviso de bienvenida dice «crear un depósito de prueba». `Login.tsx:118` («protegido») espera el OK de Katherine; cuando se aplique,
  «protegid» pasa al test de palabras prohibidas (ver `docs/alertas.md`, «Legal, ronda 9c»).
- **1.7-demo (25 oct 2026, rama `paso16-terminos-17`, sin publicar):** `v17/terminos.md` (bloques A.1–A.8 de `legal/prueba-completa-textos.md`: 2.2 b, 4.2 d, 5.2.1, 5.3 e, cláusula 6 completa con 6.1.1–6.9 y el Anexo 6-A, y la frase nueva de la cláusula 8) y `v17/privacidad.md` (borrado de los datos de una mediación a los 30 días). Solo con `VITE_PRUEBA_COMPLETA=1`; la 1.6-demo queda en `/terminos-1-6` y `/privacidad-1-6`. Cada alquiler guarda la versión que lo rige.

- **Al unir con la rama del paso 11 (`wt-paso11`, todavía no está en origin):** la Privacidad 1.7-demo es del paso 11 (`src/prueba/privacidad-1.7.md`: «fase 2» y correos). El paso 16 solo toca la **versión y la parte de la mediación**: al unir, queda un solo archivo, el del paso 11, con la frase de la mediación («Lo que se usa para una mediación lo borramos o lo anonimizamos 30 días después de cerrar el caso…», de `v17/privacidad.md`, línea 76) y la fecha de la versión que decida Legal (paso 11 dice 24 oct; paso 16, 25 oct). En `documentos.ts`, `privacidadActual()` del paso 16 debe devolver la `privacidadVigente()` del paso 11, y se borra `v17/privacidad.md`. El paso 16 no usa `Reaceptacion.tsx` (el comentario del paso 11 que lo menciona se cambia al unir).
- **Antes de encender el interruptor (Legal, 11:51 p. m.):** el consentimiento de los correos tiene que guardarse en el servidor y quedar permanente en Supabase. Hoy `consentimientoCorreo` lo guarda solo en el alquiler del navegador; falta la tabla `lk_…` y su migración (no se aplicó: el `SUPABASE_ACCESS_TOKEN` de la máquina da 401). Por eso el commit que enciende el interruptor no se publica todavía.

## 1.7-demo única y condicional (paso16-unido)
- Archivos: `v17/terminos.md` y `v17/privacidad.md`. Versión y fecha salen de `version17.ts` con `{{edicion}}` (no se escriben a mano).
- **Bloques:** `<!-- si: dos-personas -->` … `<!-- fin -->` y `<!-- si no: correos -->` … `<!-- fin -->` (se pueden anidar), cada marca en su propia línea.
- **En línea:** `{{correos: y avisos por correo}}` (sale solo si está encendido) y `{{!dos-personas:texto}}` (solo si está apagado). El espacio después de «:» cuenta: si la frase empieza con espacio, se escribe.
- Interruptores: `dos-personas` (modo de dos personas) y `correos` (`VITE_CORREOS=1`). Un nombre desconocido o un bloque sin cerrar hace fallar el build y los tests (`condicional.ts`).
- Las notas `<!-- LEGAL: revisar … -->` en su propia línea no se publican.

## Versiones por escenario (escenario C, preparación; rama `paso17-escenario-c`, sin publicar)
- Un solo archivo por documento (`v17/terminos.md`, `v17/privacidad.md`) y una versión por escenario encendido, en `versiones.ts`:
  A → 1.7-demo · 25 de octubre de 2026; B (correos) → 1.8-demo; C (correos + dos personas) → 1.9-demo. Cada una con su fecha
  (la de la 1.8 y la 1.9 se pone el día en que se enciendan; la 1.9 lleva «25 de octubre de 2026» como fecha provisional, a cambiar por la
  fecha real de encendido). `{{edicion}}` sale de la versión vigente.
- Con dos personas, la versión queda guardada por alquiler en el servidor (`terminos_version`, migración 20261025050000) y la casilla
  «Acepto los Términos 1.9-demo y el Aviso de privacidad» (`CasillaVersion`) se marca al crear invitando y al unirse; quién y cuándo, en
  `lk_aceptaciones_terminos`. `// LEGAL: revisar`.
- **Cada link abre la versión guardada (Legal, ronda 1.10, 25/10, 11:16 p. m., y PR #33, 11:33 p. m.):** la casilla, la línea de versión
  del contrato, «Ver los Términos …», «ver las reglas» y «Ver las condiciones (cláusula 6.5.1)» usan `rutaTerminos(v)` / `rutaPrivacidad(v)`
  (`src/legal/documentos.ts`) con la versión del alquiler. Rutas (escenario C, dos personas):

  | Versión | Qué es | Ruta | Texto |
  |---|---|---|---|
  | 1.9-demo | la de cada alquiler de dos personas (`versiones.ts`, migración 20261025050000) | `/terminos-1-9`, `/privacidad-1-9` (sin la reputación, también `/terminos`) | `archivo/8790b52/`, sin la reputación |
  | 1.10-demo | edición de la cuenta publicada el 25/10/2026 con la reputación | `/terminos-1-10`, `/privacidad-1-10` | `archivo/8790b52/`, con la reputación y su fecha (`EDICION_V110`) |
  | 1.11-demo | edición de la cuenta vigente con la reputación | `/terminos`, `/privacidad` (y `/terminos-1-11`) | `v17/*.md` |

- **Regla de archivo:** una versión publicada no cambia nunca. Las 1.7-demo a 1.10-demo se arman desde `src/legal/archivo/8790b52/`
  (copia exacta de `src/legal/v17/` en master 8790b52, mismo blob de git); `src/legal/v17/*.md` es solo la 1.11-demo. La prueba
  `src/legal/__tests__/archivo-versiones.test.tsx` compara el HTML de cada ruta archivada con el SHA-256 del que publicaba master 8790b52
  y revisa que cada link (1.9, 1.10, 1.11) abra su texto y muestre su número de versión. Para una versión nueva, ver `CONTRIBUTING.md`.
- **1.11-demo (sin volver a aceptar):** `V_REPUTACION = '1.11-demo'` (`version17.ts`), en `EDICIONES_CUENTA` (`versiones.ts`), ordenada
  después de la 1.9-demo y la 1.10-demo, así que ningún alquiler en la 1.10-demo ve «pasar a la versión …». No es versión de escenario:
  `versionVigente` sigue en la 1.9-demo (dos personas) y el servidor sigue exigiendo la versión guardada en cada alquiler. Los alquileres
  nuevos de una persona (`store.ts`, `Regla.tsx`) y las aceptaciones nuevas guardan la 1.11-demo; REP-01 guarda `1.11-demo · {fecha}` y
  no compara versiones (`lk_necesita_rep01` depende solo de si la cuenta aceptó). Al volver a entrar, la casilla del login aparece sin
  marcar para quien aceptó la 1.10-demo (la lógica del login no cambió; ya pasaba de la 1.9-demo a la 1.10-demo).
- **Fecha de la 1.11-demo:** `src/legal/fecha-v111.ts` (`FECHA_V111`). El día de la publicación, justo antes del merge:
  `node scripts/fecha-1-11.mjs` (fecha de hoy en Costa Rica) y se sube en el PR. Si sigue «[fecha de publicación]», el build de
  producción de Vercel con `VITE_REPUTACION=1` falla (`revisarFechaV111`, `src/legal/encendido.ts`); los previews la muestran tal cual.
- **Privacidad, ronda 1.10 (solo en la 1.11-demo):** «tu nombre visible (tu nombre y la inicial de tu apellido)» (igual que `nombreVisible`,
  `src/reputacion/consentimiento.ts`), «Para descargar tus datos o eliminar tu cuenta, te pedimos un código de 6 números que te enviamos
  por correo.» y «(plazos, reclamo, respuesta, mediación y cierre del alquiler)».
- **Marcas (lista de Legal del 25/10, `legal/revision-marcas-pr22.md`):** lo que Legal dio por bueno lleva `// LEGAL: revisado (25/10, lista de Legal)`; las 19 correcciones van literales. Los errores nuevos del servidor (migraciones 030000–070000 y `api/_lib/tw.ts`) tienen el texto final de Legal del 25/10, 4:56 a. m., y la marca `LEGAL: revisado (25/10, 4:56 a. m., Legal)` (lista en `legal/errores-servidor-c.md`). En `src` y `api` solo queda `src/alertas.ts:5`. «Todo bien, devolver» y el texto de después de aprobar («en cuanto la red de prueba lo confirme») quedaron revisados por Legal el 25/10, 4:33 a. m. `src/prueba/__tests__/c-lista-marcas.test.tsx` las cuenta.
- Al subir de versión no se vuelve a pedir nada al entrar con la sesión abierta: sin aviso de «Términos actualizados» en «Tus alquileres»
  ni pantalla de volver a aceptar (decisión de Katherine, 25/10). Una cuenta nueva acepta la 1.9-demo en «Entrar» y cada función nueva tiene su casilla. Un alquiler firmado sigue con su versión salvo que los dos acepten.
- **2.2 b) con dos personas** (texto exacto de Legal, 25/10): es un bloque `<!-- si: dos-personas -->` que reemplaza toda la b): primero el párrafo exacto de Legal y, después, sin cambios, la b) de antes (registro en la red de prueba, «simulados», «Nada de esto tiene efecto legal»; Legal, 25/10, 1:24 a. m.)
  (fase 2, la mediación no decide, excepciones 5.3 d y 6.5.1). Sin dos personas (A y B), la b) no cambia. Prueba: `escenario-c.test.ts`.

- **Regla 6.5.1 en dos personas (C), opción 1 de Legal (25/10, 1:50 a. m.):** en los alquileres de dos personas la regla no se ofrece al firmar (6.5.1 d y 2.2 b, textos de Legal del 25/10, 2:53 a. m., solo en el bloque de dos personas; la pantalla de firmar muestra la nota «Si hay un reclamo», sin casilla) y nunca se aplica sola: si el inquilino no responde, el servidor pasa el caso a la mediación con el motivo «regla no disponible en esta versión (6.5.1 d)», sin tope ni recorte del 30 % y sin pago parcial. Solo pagan el acuerdo, la mediación con las dos aceptaciones y la devolución del 100 % si el dueño no reclama (`20261025040000_silencio_dos_personas.sql`, `/api/tw` «repartir»).
- **Legal 25/10, 3:16 a. m. (C):** la 6.5 c) termina, solo con dos personas, con «En la versión con dos personas, la regla no se ofrece (6.5.1 d).» (`{{dos-personas: …}}`). Se quitaron las marcas `LEGAL: revisar` de lo aprobado (2.2 b, 6.5.1 d, 6.5 c y los textos de C en `src/prueba/dosPersonas.ts`). Prueba: `escenario-c.test.ts`.

- **Fecha de la 1.9-demo:** `FECHA_V19` en `versiones.ts` es provisional («25 de octubre de 2026»). Al encender C hay que poner la fecha real del encendido (paso obligatorio de `encendido-lista.md`).
- **Legal 25/10, 3:34 a. m.:** `TEXTO_SOLOS_DOS` en contrato y «En curso» de C; 2.2 b) de C termina con quién maneja las cuentas y quién aplica la regla de las dos aceptaciones.
