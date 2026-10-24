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
