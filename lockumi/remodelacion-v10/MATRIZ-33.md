# Matriz 33 — evidencia vigente

Las capturas de esta matriz están solo en el artifact `v10-vigente`, a 390×844 y 1440×900, tomadas del mismo árbol que este archivo. El SHA queda en `v10-vigente/MANIFIESTO.md`, escrito después del commit. No se recapturó 1280: las reglas de escritorio aplican desde 960 px y la evidencia de escritorio de esta pasada es 1440. Los PNG `*-1280.png` de `3891b3d` se apartaron a `v10-3891b3d-1280` para no mezclarlos con esta corrida. `v10-barra`, `v10-cierre`, `v10-cuenta`, `v10-inicio`, `v10-preview`, `v10-qa` y `v10-resto` son historial. No dicen que la pantalla ya coincida.

Demo local `http://127.0.0.1:4174` (`npm run dev`), sin `VITE_CAVOS_APP_ID` y sin `VITE_PRUEBA_COMPLETA`. Correo de ejemplo. Los estados 11, 14 y 18–23 se abrieron escribiendo un alquiler solo en el `localStorage` de ese navegador y recargando. No se tocó la semilla de `src/store.ts`, no se cobró, no se firmó, no se abrió la cámara y no se encendió ningún flag. El anillo de la 16 sale de `diasQueQuedan`. En esta corrida, con el día de Costa Rica en 2026-11-07, dio **358 días** hasta el 31 oct 2027. No es 212 y no se escribió a mano.

`npm test`: 1552 pasaron, 1 omitida. Eso no equivale a fidelidad visual.

`https://app.lockumi.com` sigue con `last-modified: Thu, 05 Nov 2026 23:12:51 GMT`. No se publicó ni se hizo merge.

## Fidelidad revisada en esta pasada

| # | Qué se ve ahora | Evidencia | Qué no se cambió, a propósito |
|---|---|---|---|
| 01 | Bajada corta, chips Dueño e Inquilino que no son botones ni enlaces, las dos casillas y Entrar. En 1440 la escena queda a la izquierda y Entrar se ve. En 390 el texto de privacidad sigue y Entrar queda justo debajo. | `01-bienvenida-390.png`, `01-bienvenida-1440.png` | La bajada es visual. Siguen `NOTA_TITULO` y «Ni el dueño ni el inquilino pueden liberarlo solos.» No hay Empezar ni Ya tengo cuenta. |
| 02 | Hoja «Continuar con tu correo», botones rellenos. A 1440 la hoja llega a 680 px. | `02-correo-390.png`, `02-correo-1440.png` | El código sigue en un solo campo. |
| 03 | Lista real: Heredia grande, paso 2, Dueño; Escazú compacta. Sin el aviso de ingreso encima. | `03-inicio-390.png`, `03-inicio-1440.png` | La semilla no copia el dibujo. El aviso se cerró con su propio toque antes de la foto. |
| 04 | Lugar, fechas, depósito, y siguen reglas, correo y «Crear alquiler e invitar». En 390 el botón queda en y=671 y la barra en y=791: no se solapan. | `04-crear-390.png`, `04-crear-1440.png`, `mediciones-qa.json` | No se quitaron los campos que la app ya pide. |
| 08 | Los 8 pasos caben en la primera pantalla del móvil (8 de 8 visibles). En 1440 la lista es la columna principal y el contrato real queda a la derecha. | `08-pasos-390.png`, `08-pasos-1440.png` | No se reemplazó el contrato por «Abrir contrato». |
| 09 | Contrato real, sin el aviso de ingreso. | `09-contrato-390.png`, `09-contrato-1440.png` | No es la tarjeta «USD 800 / Firmar» del dibujo. No se firmó. |
| 10 | «Firmas del contrato» y la casilla, sin aviso encima. | `10-firmas-390.png`, `10-firmas-1440.png` | Nadie ha firmado. No se firmó en esta pasada. |
| 11 | El monto y «Pagar USD 800,00» están en la primera pantalla (y≈286 a 390). «Te toca» va debajo. No se pulsó. | `11-pagar-390.png`, `11-pagar-1440.png` | No hay comisión ni un total 812. |
| 14 | Un espacio: «Tomar foto» relleno, Bien / Con detalle. | `14-checklist-390.png`, `14-checklist-1440.png` | No es la lista de cinco espacios. No se abrió la cámara. |
| 16 | El anillo va en una tarjeta, con el nombre del inmueble debajo: «Apartamento ejemplo · Escazú» y «Sale el 31 oct 2027». El botón sigue siendo «Empezar fotos de salida». | `16-encurso-390.png`, `16-encurso-1440.png` | 358 días es la cuenta de las fechas, no 212. |
| 18 | Sala, «Así estaba al entrar» y «Así está hoy» en la primera pantalla. Fixture local con el primer punto sin marcar. No se confirmó. | `18-salida-390.png`, `18-salida-1440.png` | Las fotos son SVG de ejemplo. No se usó la cámara. |
| 19 | «5 días 23 horas» y «Reclamar un daño» en la primera pantalla. «Te toca» debajo. | `19-plazo-390.png`, `19-plazo-1440.png` | El plazo parte de la hora del fixture. No se inventó una fila D1–D7. |
| 20 | Montos primero (inquilino USD 800,00, dueño USD 0,00), luego el rótulo de ilustración. | `20-devuelto-390.png`, `20-devuelto-1440.png` | Vía `automatico` del fixture local, no un cierre real. |
| 21 | Formulario abierto: monto, motivo y «Tomar foto del daño». No se envió. | `21-reclamo-390.png`, `21-reclamo-1440.png` | «Enviar reclamo» queda más abajo en 390. No se inventaron fotos del daño. |
| 22 | «Aceptar reclamo» y «No estoy de acuerdo» se ven en la primera pantalla (y≈581 a 390). El párrafo legal sigue debajo. No se pulsó. | `22-respuesta-390.png`, `22-respuesta-1440.png` | El texto del reparto no se reescribió. |
| 23 | La mediación que ya existe sin el flag: ilustración, «Con una persona mediadora» y el reclamo. No se pulsó «Demo: registrar el acuerdo». | `23-mediacion-390.png`, `23-mediacion-1440.png` | «Pedir mediación» no está en esta pantalla. Ver bloqueos. |
| 24 | «Datos» es una fila cerrada. Al abrirla siguen nombre, correo y acceso. | `24-perfil-390.png`, `24-perfil-datos-390.png` y las de 1440 | No hay cédula, cuenta de pago, Editar perfil ni Llave. |
| 26 | «Todavía no hay avisos.» | `26-avisos-390.png`, `26-avisos-1440.png` | No se copiaron avisos de ejemplo. |
| 27 | Ayuda, «Ver el recorrido» relleno y los temas. | `27-ayuda-390.png`, `27-ayuda-1440.png` | Textos ya publicados. Sigue la nota de revisión legal. |
| 28 | Columna de lectura. El texto legal no se tocó. | `28-terminos-390.png`, `28-terminos-1440.png` | Versión 1.6-demo, pendiente de revisión por abogado. |
| 29 | En 1440 la ilustración queda a la izquierda y, a la derecha, «Todavía no hay alquileres.» con «Nuevo alquiler». La nota de demo y Reiniciar siguen, debajo. | `29-vacio-390.png`, `29-vacio-1440.png` | El título de la página sigue «Tus alquileres». No se puso «Aún sin alquileres». |
| 30 | «No encontramos ese alquiler» y volver, botón relleno. | `30-error-390.png`, `30-error-1440.png` | No es un error de red. |
| 32 | Globo opaco (`rgb(255, 254, 250)`, opacidad 1), paso 1 de 6, título «Te damos la bienvenida a Lockumi», cero avisos encima. | `32-recorrido-390.png`, `32-recorrido-1440.png`, `mediciones-qa.json` | No se cambió ningún texto ni se agregó el paso 33. El aviso de ingreso sigue en la app: la foto espera a que se cierre. |

## Cobertura, no fidelidad al dibujo

Estas pantallas se ven y conservan su función. No se declara que copien la maqueta.

- 03 y 16 usan los datos reales de la semilla y de las fechas. Heredia no se convirtió en el Escazú del dibujo, y 358 no se cambió por 212.
- 09 y 10 siguen siendo el contrato y la casilla de firma, no una tarjeta resumen.
- 11 no calcula comisión.
- 14 sigue un espacio a la vez.
- 18 compara el espacio actual, no una grilla de toda la casa.
- 23, sin el flag, no es la tarjeta «Solicitar mediación / Costo USD XX» del dibujo.

## Bloqueo funcional y estilo, por separado

No tener captura no significa que el estilo del componente que ya existe esté pendiente. Tampoco autoriza a crear una ruta ni a encender un flag.

| # | Bloqueo funcional | Estilo del componente que ya existe |
|---|---|---|
| 05 | No hay pantalla de espera. El único estado es el texto «Creando…» en el botón de crear. No se inventó una ruta. | Pendiente: no hay un componente de pantalla completa al que aplicarle estilo. |
| 06 | El link de invitación solo se monta con `modoServidor`. No hay servidor ni se fabricó un token. | El componente `Invitacion` existe y no se capturó. |
| 07 | Aceptar una invitación exige el servidor. Esta pasada no lo capturó. | La pantalla sin servidor ya tiene el rótulo «Ilustración pendiente de aprobación» y «Las invitaciones funcionan solo con el servidor compartido.» |
| 12 | `EsperaPago` solo aparece mientras corre el pago. Mostrarlo exige pulsar Pagar. No se pulsó. | Implementado: botón relleno, barra y tres pasos. Captura pendiente por el bloqueo. |
| 13 | No hay una ruta distinta del alquiler en curso. La 16 es ese estado. No se inventó una celebración. | Pendiente: no hay un componente de celebración. |
| 15 | El visor abre la cámara. No se abrió. | El botón «Tomar foto» relleno se ve en la 14. El visor (Cancelar y disparo) está en `Camara.tsx` y su CSS. Captura del visor pendiente. |
| 17 | `AvisoSalida` solo se monta con `VITE_PRUEBA_COMPLETA`. El flag sigue apagado. | El panel `<details>` y las fotos de entrada están en el código. Captura pendiente. |
| 23 | «Pedir mediación» vive en `MediacionPC` (B.7, con otra persona) y solo entra con el mismo flag. No se encendió y no se pulsó. La tarjeta del dibujo «Solicitar mediación / Costo USD XX» no está en el código y no se creó. | La B.7 ya tiene botón relleno, casilla e ilustración. La captura de esta pasada es la mediación sin flag, sin enviar el acuerdo. |
| 25 | El puntaje solo entra con `VITE_REPUTACION=1`. Sigue apagado. | `MiPerfil` ya lleva el rótulo de ilustración. No se redibujó el producto de reputación. |
| 31 | `Entrando` solo corre al volver de Google o Apple con `modoReal`. No se inventó ese regreso. | Implementado: la escena aprobada y «Entrando a tu cuenta…», sin botón. Captura pendiente. |
| 33 | El paso «Todo en un solo lugar» no está en los 6 textos aprobados. No se agregó. | El globo es el mismo de la 32: opaco, con Saltar. El contenido queda pendiente de conciliar las fuentes. |
