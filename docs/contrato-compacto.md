# Contrato compacto (24 oct 2026, rama `contrato-compacto`)

**Estado: vista previa, sin publicar.** Rama `contrato-compacto` desde `master` en `051c071`. No se une a `master` sin el OK de Katherine (un push a `master` publica en producción).

Maqueta aprobada por Katherine el 24/10/2026 a la 1:33 a. m. (hora de Costa Rica): `diseno/envio/contrato-compacto/` (`resumen.jpg`, `textos.md`, `hoja-celular.gif`).

## Qué cambia

Solo en el **detalle del alquiler** después de firmar (estado distinto de `firmas`). La pantalla **Firma** sigue con el contrato plegable de [`contrato-plegable.md`](contrato-plegable.md).

| Pantalla | Qué se ve | Al tocar «Ver contrato» |
|---|---|---|
| Computadora (960 px o más) | Primera tarjeta de la columna derecha: «Contrato» con **Lugar**, **Depósito**, **Fechas** (entrada → salida), **Estado** (sello) y el botón «Ver contrato». La columna queda fija a 48 px del borde de arriba (debajo de la cinta de la red de prueba) y nunca es más alta que la pantalla: si hace falta, baja por dentro. Orden: Contrato, Comprobantes, Los pasos, Detalles. | Panel lateral derecho (480 px) con el contrato completo, «Descargar o imprimir» y «Cerrar». |
| Teléfono (menos de 960 px) | Barra arriba del detalle: «Contrato», lugar · depósito y «Ver contrato». **Se desplaza con la página** (no queda fija), como en la maqueta. | Hoja que sube desde abajo (hasta el 90 % del alto) con el contrato completo. Se cierra con «Cerrar», con Esc, tocando fuera o **deslizándola hacia abajo**. |

- **Una sola variante** según el ancho de la pantalla (`useEscritorio()` con `matchMedia('(min-width: 960px)')`): no hay ids repetidos ni dos diálogos en la página.
- **Textos legales sin cambios:** el panel muestra el mismo `Documento` de `ContratoDoc.tsx` (incluidas las partes `// LEGAL`), desplegado entero (`ContratoDoc completo`). Textos nuevos, los de `textos.md` de la maqueta: «Ver contrato», «Cerrar» y las etiquetas Lugar, Depósito, Fechas y Estado.
- **Deslizar:** se cierra si la hoja baja más de 120 px, o más de 40 px con un movimiento rápido (más de 0,5 px/ms) (`cierraAlDeslizar`). Si no, vuelve a su lugar. Solo se arrastra desde la cabecera de la hoja; el resto del contrato se desplaza normal.

## Accesibilidad

- Botón nativo con `aria-haspopup="dialog"` y `aria-expanded`. El panel es un `<dialog>` modal (`showModal`), con nombre «Contrato» (título oculto a la vista) y el botón «Cerrar» (44 px).
- Al abrir, el foco entra al panel y Tab se queda dentro. Esc, «Cerrar», tocar fuera o deslizar lo cierran y **el foco vuelve a «Ver contrato»**.
- Letra de 14 px o más. Con «reducir movimiento» no hay animación de entrada.
- Mientras el panel está abierto, la página de atrás no se desplaza.

## Impresión: siempre el contrato completo

- **«Descargar o imprimir»** (dentro del panel) usa la misma versión `ct--impresion` de siempre.
- **Menú del navegador (Ctrl+P / Cmd+P):** la tarjeta y la barra guardan una copia del contrato completo (`.cc-papel`, oculta en pantalla y para lectores de pantalla) que solo se ve al imprimir. El panel nunca se imprime.

## Recorrido guiado

El paso 6 («Los pasos») sigue apuntando bien con la columna reordenada, en computadora y en teléfono. `scripts/recorrido/capturar.mjs` ahora también revisa que el elemento resaltado se vea entero (que la columna con desplazamiento no lo corte). Ver [`recorrido.md`](recorrido.md).

## Pruebas (24/10/2026, madrugada, hora de Costa Rica)

- `src/screens/__tests__/contrato-compacto.test.tsx` (10 pruebas): la tarjeta muestra lugar, depósito, fechas y estado; botón y diálogo (uno solo, «Cerrar», contrato completo solo al abrir); sin ids repetidos; copia completa para imprimir; barra y hoja; umbrales de deslizar; `Detalle` muestra una sola variante; columna fija a 48 px; letra de 14 px o más, movimiento reducido y panel oculto al imprimir.
- `src/screens/__tests__/contrato-plegable.test.tsx`: sigue igual (la pantalla Firma); correos de ejemplo pasan a demo@lockumi.com.
- Navegador, contra `VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173`, con Chrome del sistema (`CHROME=/usr/bin/google-chrome`) y la sesión de demostración demo@lockumi.com:
  - `OUT=/tmp/cc/ node scripts/contrato-compacto/capturar.mjs` (390 y 1440 px): una sola variante, tarjeta y barra, «Ver contrato» abre, Esc y «Cerrar» cierran con el foco de vuelta, Tab atrapado, tocar fuera, deslizar poco no cierra y deslizar cierra, columna fija a 48 px y no más alta que la pantalla, impresión completa, sin desborde.
  - `BASE=http://localhost:4173/ node scripts/contrato-plegable/capturar.mjs`: Firma igual; en el detalle ya no está el contrato plegable.
  - `node scripts/recorrido/capturar.mjs`: los 6 pasos, incluido «Los pasos».
- `/api/solo` y `/api/tw` los responde el script; no se toca la red de prueba.

**Arreglo encontrado en la prueba:** en Chrome, el segundo arrastre de la hoja se cancelaba (el navegador lo tomaba como selección de texto). La cabecera ahora no selecciona texto y el arrastre evita la acción por defecto.

## Mediación: texto revisado por Legal (24 oct 2026)

En esta misma rama, la sección «Mediación» del contrato (y los demás textos de mediación) dicen que la persona mediadora ayuda a buscar un acuerdo y no decide. Lista completa en [`alertas.md`](alertas.md#textos-de-mediación-revisados-por-legal-24-oct-2026-rama-contrato-compacto-sin-publicar).

## Legal, ronda 4 (24 oct 2026)

Sin cambios en el contrato compacto. Cambian las notas del reclamo y del plazo en el detalle, y Términos 5.3. Ver `docs/alertas.md`, «Legal, ronda 4».

## Legal, ronda 3 (24 oct 2026)

Sin cambios en el contrato compacto. Los textos «Nadie puede…» de avisos, Detalle, pago, Entrar, recorrido y README pasan a «Ni el dueño ni el inquilino…»; la nota de la mediación del modo de una persona y la cláusula 4.1 a) de Términos (1.6-demo) también cambian. Detalle en `docs/alertas.md`, «Legal, ronda 3».

## El depósito: texto de Legal, ronda 2 (24 oct 2026)

La sección «El depósito» del contrato (tarjeta, panel, hoja y «Descargar o imprimir») ya no dice «ni Lockumi». Ahora: «El depósito queda guardado hasta el final. Ni el dueño ni el inquilino pueden tomarlo solos. En esta prueba, si hay un reclamo, la cuenta de Lockumi es la que ejecuta el reparto que se elige en la simulación.» (`// LEGAL: revisado (24/10)`). En el modo con servidor, los botones de la persona mediadora dicen «Registrar el acuerdo» y la cláusula 6.7 de los Términos pasó a 1.6-demo. Detalle en [`alertas.md`](alertas.md#legal-ronda-2-24-oct-2026-rama-contrato-compacto-sin-publicar).

### [Servicio real]

Aprobada por Legal solo para un servicio real o una versión de producción. **No se muestra en la demo.**

> Si después de la mediación no hay acuerdo, el depósito sigue guardado y cualquiera de las dos partes puede acudir a los tribunales de Costa Rica. El depósito se reparte según el acuerdo al que lleguen después o según lo que resuelva la autoridad.

## Legal, ronda 5 (24 oct 2026)

La sección «7 días para reclamos» del contrato dice ahora «Si no reclama, después de 7 días el depósito se devuelve completo al inquilino.» El contrato y los Términos siguen con 7 días fijos; en el resto de la app el plazo es el real del alquiler (`textoPlazo`). Detalle en [`alertas.md`](alertas.md), «Legal, ronda 5».

## Legal, ronda 6 (24 oct 2026)

La nota del plazo en producción pasa a «Si no hay reclamo, después de {plazo}…». El plazo publicado es de 7 días (604800 s), así que el contrato y la app coinciden. Detalle en [`alertas.md`](alertas.md), «Legal, ronda 6».
