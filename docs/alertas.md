# Avisos después de cada paso

**Publicado el 23 oct 2026** en app.lockumi.com (el aviso al inicio del orden de Tab y el aviso v2 · toast se publicaron el 24 oct 2026; ver abajo): rama `contrato-plegable` unida a `master` por avance rápido desde `ad1578f` en `abdfd9b` (código `afe15ae` y `abdfd9b`, docs `2312401`); deploy de producción `dpl_ARoWYrXEBftUcz1L4NoRiQNA9N6v`. Pruebas antes de publicar: 163/163 unitarias y 855/855 del recorrido en navegador.

## Aviso v2 · toast (publicado el 24 oct 2026; rama `ux-guiada` unida a `master` con merge `--no-ff` en `1ab36ae` (master anterior `76373f8`); deploy de producción `dpl_EkFHfSn82SwL2JGvD7GmwXUGo38K`)

Aprobado por Katherine (maquetas `diseno/aviso-compacto/` y `diseno/recorrido-formulario/`). Reemplaza la tarjeta de los avisos v2 en **todos** los logros, pasos y errores:

- **Pastilla compacta de vidrio:** fondo crema al 92 % con desenfoque de 18 px (fondo sólido si el navegador no lo admite), casita completa de 32 px, título y **una línea** («Ahora: …», «Sigue: …», «Al entregar: …»). Teléfono: abajo al centro, 358 px, sobre la zona segura; si taparía la cabecera, el título, el paso o un botón principal, sube por encima del botón. Computadora: abajo a la derecha, 360 px, a 24 px del borde.
- **Botón de acción** (44 px o más) que lleva al paso: «Pagar →», «Tomar fotos →», «Ver alquiler →», «Ver detalle →». Tocar el resto del aviso lo cierra. Sin X ni «Entendido».
- **Tiempo:** 8 s con acción, 5 s sin acción, línea de 2 px; se pausa con el ratón, el dedo o el foco. **Errores:** `role="alert"`, no se esconden solos, sin línea de tiempo; el error de la red de prueba usa el texto A12 sin cambios («No se pudo completar» + «La red de prueba está lenta o no respondió. Espera un minuto y vuelve a tocar el botón.») y se quita al volver a intentar. El texto sigue escrito en la pantalla, sin `role="alert"` para no anunciarlo dos veces.
- **Logros:** zona `role="status"`, `aria-live="polite"`.
- **Pila de hasta 3** (como Sonner): el más nuevo adelante; los de atrás asoman sin texto; con el ratón, el foco o el dedo encima, la pila se abre.
- **Deslizar** de lado (un tercio del ancho o rápido) o hacia abajo (40 px) para cerrar; si no llega, vuelve a su lugar.
- **Movimiento:** entra en 320 ms (desde abajo), sale en 200 ms; con «reducir movimiento», solo un fundido de 160 ms.
- **Teclado:** el aviso sigue siendo la 2.ª parada de Tab; Enter, Espacio o Esc lo cierran; Tab pasa al botón de acción.
- Montos siempre con `usd(r.inquilino)` y `usd(r.dueno)`. Sin dependencias nuevas. No cambia el ingreso ni la lógica del escrow.

Código: `src/alertas.ts` (`linea`, `accion`, pila, `alertaErrorRed`, `quitarAvisos`), `src/Aviso.tsx` (`Tostada`, `irA`), `src/Alertas.tsx` (zonas, lugar libre, pausa), `src/index.css`, `src/screens/Detalle.tsx`. Pruebas: `src/__tests__/alertas.test.tsx`; en el navegador `scripts/aviso-v2/capturar.mjs` (nuevo), `scripts/espera-pagar/capturar.mjs` y `scripts/alertas/capturar.mjs` (adaptados a la pila).

**Líneas cortas de los demás pasos (Legal, 24 oct, 12:22 a. m.; marcadas `// LEGAL: revisado (24/10)` en `src/alertas.ts`):**

| Paso | Título | Línea |
|---|---|---|
| `crear` | Alquiler creado | **Ahora:** leer y firmar el contrato |
| `contrato-firma-inquilino` | Firmaste el contrato | **Sigue:** la firma del dueño de prueba *(sin dueño de prueba: «la firma de la otra persona»)* |
| `contrato-firma-dueno` (falta tu firma) | El dueño firmó el contrato | **Ahora:** tu firma |
| `entrada-firma-*` / `salida-firma-*` (confirmaste tú) | Confirmaste las fotos de entrada / de salida | **Sigue:** la otra persona confirma las fotos |
| `salida-inicio` | Empezaron las fotos de salida | **Ahora:** una foto de cada espacio |
| `salida-confirmada` | Fotos de salida confirmadas | **Sigue:** {textoPlazo} para hacer un reclamo (sale del alquiler, p. ej. «7 días») |
| `reclamo` | Reclamo enviado | **Sigue:** el inquilino acepta o no el reclamo |
| `mediacion` | Pasa a una persona mediadora | Demo: **En esta prueba:** decides tú el reparto (simulación). Dos personas: **Sigue:** una persona mediadora les ayuda a buscar un acuerdo |
| `reparto` | **Reparto del depósito** (antes «Reparto decidido») | {usd(r.dueno)} al dueño y {usd(r.inquilino)} al inquilino · botón «Ver detalle →» |
| `adelantar` | Plazo adelantado | **Solo en la prueba:** terminó el plazo para reclamos |

Textos largos nuevos: mediación «Una persona mediadora revisa las fotos y les ayuda a buscar un acuerdo sobre el reparto del depósito.» (en la demo, más «En esta prueba, decides tú el reparto con «Resolver el reclamo (simulación)».»); reparto «Se repartió el depósito en la red de prueba: {usd(r.dueno)} al dueño y {usd(r.inquilino)} al inquilino.»

Si la otra persona confirma las fotos antes que tú, el aviso sigue con su texto «sigue» de siempre (Legal no dio línea corta para ese caso).

## Avisos v2 (23 oct 2026)

Aprobado por Katherine (23 oct, 8:06 a. m.). Misma rama. Reemplaza el estilo del aviso. **Textos cortos aprobados por Legal el 23 oct 2026** (revisión de Legal del 23 oct 2026): «¡Depósito guardado!» y «El ingreso no terminó» (ver la tabla de abajo) y el botón «Decidir como persona mediadora» renombrado a «Resolver el reclamo (simulación)»; los demás textos no cambian.

**Decisiones confirmadas por Katherine (23 oct, 11:24 a. m.):** 1) sin botón «Continuar» / «Entendido» (desde las 11:25 a. m., tampoco X: ver «Cierre» abajo); 2) los 6 logros con llave y color verde son `ingreso`, `contrato-firmado`, `pago`, `entrada-confirmada`, `devolucion` y `acuerdo`; 3) en el teléfono, si el título queda abajo en la pantalla, la tarjeta pasa abajo para no taparlo. Publicar en producción (avisos v2 y contrato plegable) queda aprobado **solo después del OK de Legal** a los 2 textos acortados; hasta entonces no hay merge a `master`.

- **Tarjeta crema pequeña** (`src/Aviso.tsx`, CSS `.aviso-capa` / `.aviso-pop` en `src/index.css`):
  - esquinas de 26 px;
  - sin fondo borroso, no bloquea la pantalla;
  - en computadora (720 px o más): abajo a la derecha, 320 px de ancho;
  - en el teléfono: arriba, hasta 366 px. `lugarEnCelular()` la ubica **debajo del encabezado, del logo y del título** de la pantalla (primer `h1`, su `.cab` o `.entrada-app__titulo` en la entrada), así no los tapa. Si quedaría por debajo de la mitad de la pantalla, va al pie. Se recalcula al cambiar de pantalla, de tamaño y al desplazar la página (acompaña al título sin taparlo). Revisado en 375 y 390 px.
- **Ícono: la casita oficial completa** (`src/LogoAviso.tsx`). Se toma del markup literal del logo de lockumi.com (`src/logoLandingMarkup.ts`):
  - mismo `viewBox` (`419.5 65.25 420.25 408.25`), con planta, techo verde, puerta, cerradura y llave;
  - `overflow: visible` en el SVG y en la esquina, sin recortes;
  - ids propios (`aviso-casa-*`) para no chocar con el logo de la pantalla.
- **Esquina de color según el tono** (`tonoDe(alerta)` en `src/alertas.ts`):
  - **paso**: miel (colores de «pendiente»);
  - **logro**: verde (`LOGROS`: `ingreso`, `contrato-firmado`, `pago`, `entrada-confirmada`, `devolucion`, `acuerdo`);
  - **error**: terracota oscuro.
- **Animación de la llave en los logros:** la misma del logo (entra, se inserta y gira 90°, la cerradura se cierra, pulso verde), **una sola vez**, en 2 s; al final queda el logo completo y quieto. En los pasos y errores el logo está quieto y completo. Con «reducir movimiento» solo hay un fundido de 160 ms y la llave no se mueve.
- **Qué sigue** en una línea aparte: «**Lo que sigue:** …» (o «**Cómo seguir:** …» en errores), con el color del tono.
- **Cierre (aprobado por Katherine, 23 oct, 11:25 a. m.): sin X.** El aviso **se esconde solo a los 5 s** (`DURACION_AVISO`), también los errores. Se cierra antes al tocarlo o hacer clic, con Enter, Espacio o Esc. Si el dedo o el mouse está encima, o tiene el foco, el conteo se pausa y sigue donde quedó al salir. Una línea fina abajo (`.aviso-pop__tiempo`) marca el tiempo y se detiene en la pausa. Los avisos en cola salen uno tras otro. Sin botón «Continuar» / «Entendido».
- **Accesibilidad:**
  - **ya no es un diálogo**: `<Alertas />` deja siempre en la página dos zonas, `role="status"` con `aria-live="polite"` (pasos y logros) y `role="alert"` (errores), y el aviso aparece dentro de la que corresponde, así el lector de pantalla lo anuncia sin mover el foco;
  - **no roba el foco**. La tarjeta se puede enfocar con Tab (`tabindex="0"`, nombre «Aviso. Toca para cerrar», título y texto con `aria-describedby`): enfocada se pausa y Enter, Espacio o Esc la cierran; al cerrarla el foco vuelve a donde estaba (o a `#contenido`);
  - con «reducir movimiento»: solo un fundido al aparecer, sin animación de salida ni de la llave, y la línea del tiempo queda quieta;
  - **se llega con Tab antes de 5 s** *(publicado el 24 oct 2026)*: `<Alertas />` va justo después de «Saltar al contenido», así que desde el inicio de la página el aviso es la **2.ª parada de Tab** (1.º «Saltar al contenido», 2.º el aviso, antes del encabezado). Sigue sin robar el foco. Con el foco se pausa; Enter, Espacio o Esc lo cierran y el foco vuelve a donde estaba. Si el foco ya está más abajo (por ejemplo en el botón del paso), Tab sigue hacia adelante y no llega al aviso; se llega con Mayús+Tab hasta el inicio o desde «Saltar al contenido». Antes iba al final de la página; casi todo lo que dice también queda en la pantalla (líneas del paso e historial), y el error del ingreso queda escrito en Entrar (ver «Error del ingreso en Entrar»). Moverlo al inicio del DOM **no cambia cómo se ve**: `.aviso-capa` es `position:fixed`, así que el aviso sigue flotando con el mismo tamaño y lugar que en `master` (390 px: 366 px de ancho, debajo del título o abajo si el título está bajo; escritorio: 320 px abajo a la derecha) y no empuja nada. Lo verifica `scripts/espera-pagar/capturar.mjs` (capa fija, sin X ni «Entendido», casita completa, tamaño y lugar como en `master`, nada se mueve al cerrarse) y una prueba unitaria en `src/__tests__/espera-pago.test.tsx`. Con el foco de Tab el aviso muestra el anillo de foco (borde rojo); eso no es la tarjeta vieja;
  - contraste AA en todos los textos (el más justo, verde `#2E7347` sobre `#E3F2E8`, 4,95:1).
- **«Tomar foto»** (`src/Camara.tsx`): el emoji 📷 se cambió por el ícono de cámara de la app (`i-camara`).

Capturas reales (localhost, sesión simulada): `capturas/alertas-v2-*.png`. Imágenes livianas y GIF de la llave: `diseno/envio/alertas-v2-implementado/`. GIF del cierre solo (celular y computadora): `diseno/envio/alertas-v2-autocierre/aviso-se-esconde-solo.gif`.

**Decisiones pendientes (Katherine):** 1) ~~el error del ingreso solo se ve en el aviso~~ **resuelto el 23 oct** (queda escrito en Entrar, ver abajo); 2) el enlace «Entrar con mi correo» de la maqueta no se agregó (tocar el aviso lo cierra; un enlace dentro chocaría con eso); 3) se quitó «en esta misma pestaña» del texto (decisión de Producto según Legal); 4) ~~llegar con Tab antes de 5 s~~ **propuesto en la rama `aviso-tab`** (pendiente del OK de Katherine para publicar). Siguen sin agregarse «Entrar con mi correo» ni «en esta misma pestaña».

### Error del ingreso en Entrar (aprobado por Katherine, 23 oct, 11:49 a. m.)

Si el regreso de Google o Apple no termina, además del aviso de 5 s (igual que antes), la pantalla **Entrar** muestra el mismo texto escrito, arriba del botón «Entrar»: **«El ingreso no terminó» · «Toca Entrar y elige tu cuenta.»** (textos de Legal). **No se va solo:** se borra cuando la persona vuelve a tocar «Entrar» o cuando entra bien. Accesible: el recuadro (`#error-ingreso`) está enlazado al botón con `aria-describedby`, así el lector lo lee al llegar al botón; no lleva `role="alert"` propio porque el aviso ya se anuncia desde la zona `role="alert"` (se evita leerlo dos veces). Código: `src/screens/Login.tsx` (`error`, `onReintento`), `src/App.tsx` (estado `regreso`), `.entrada-app__error` en `src/index.css`. Pruebas: `alertas.test.tsx` («error del ingreso escrito en Entrar») y el recorrido `capturar.mjs` (el texto sigue después de que el aviso se va, y desaparece al tocar Entrar).

### Ingreso más rápido: pantalla «Entrando a tu cuenta…» (23 oct)

Katherine notó que la pantalla Entrar tardaba en irse y «¡Ingresaste correctamente!» salía tarde. **Causa (medida):** al volver de Google o Apple, la app mostraba **Entrar** (con sus botones) mientras cargaba el módulo de ingreso de Cavos (unos 620 KB) y luego confirmaba la sesión con Cavos (`/api/oauth/callback/exchange`, 0,34–0,54 s reales). Recién entonces cambiaba de pantalla y salía el aviso (los dos a la vez). El saldo y la recarga de la cuenta **no frenan** el cambio: se cargan después, ya en Inicio. **Arreglo (sin tocar la lógica de cuentas ni del servidor):** si la dirección trae la vuelta de Google o Apple (`hayRegreso()` en `src/services/auth.ts`), desde el primer cuadro se ve **«Entrando a tu cuenta…»** con la casita y la llave (`Entrando` en `Login.tsx`, `aria-busy="true"`, texto en `role="status"`; con «reducir movimiento» la llave queda quieta). El aviso sigue saliendo apenas se confirma la sesión, junto con Inicio. Si falla, vuelve a Entrar con el error escrito.

Medido con Playwright y `performance` (build de producción, intercambio simulado de 5 ms; «lento» = CPU ×4 y red 3G rápida; promedio de 3), en ms desde que empieza la carga:

| Paso | Antes, rápido | Después, rápido | Antes, lento | Después, lento |
|---|---|---|---|---|
| Primera pantalla | Entrar ~200 | «Entrando…» ~75 | Entrar ~700 | «Entrando…» ~635 |
| Módulo de Cavos cargado | ~300 | ~130 | ~1295 | ~1190 |
| Empieza la confirmación de la sesión | ~350 | ~210 | ~1560 | ~1440 |
| Sesión confirmada → Inicio y aviso | ~380 | ~240 | ~1585 | ~1520 |
| Tiempo con **Entrar** a la vista | ~180 (+0,34–0,54 s reales) | **0** | ~885 (+0,4–0,5 s reales) | **0** |

Con la confirmación real se suman 0,34–0,54 s a las dos últimas filas. Lo que queda (cargar el módulo de Cavos y confirmar con Cavos) no se acorta sin tocar la lógica del ingreso; está fuera de este cambio. Scripts: `diseno/ingreso-tiempos/` (fuera del repo).

## Por qué no se veían

1. **Había un solo aviso emergente**, «¡Ingresaste correctamente!» (`src/Aviso.tsx`, desde `000cb43`, 16 oct). `App.tsx` lo muestra solo dentro de `entro()`, es decir, **justo después de entrar** (login con correo, o el regreso de Google o Apple que procesa `auth.completarRegreso()`). La sesión queda guardada en el navegador (`lockumi.usuario`), así que al volver a la app no se entra de nuevo y el aviso no aparece. Está publicado: el texto está en el paquete de producción (`index-BVqVWzj6.js`).
2. **El aviso de error «Tu cuenta no está lista»** de `Billetera.tsx` se quitó el 17 oct en `19290e1` («Inicio: la tarjeta de la cuenta nunca muestra un error»).
3. **Nunca hubo avisos después de cada paso.** Los pasos solo mostraban líneas dentro de la pantalla (`.ahora`, «✓ El dueño de prueba firmó…», el historial).
4. **Si el regreso de Google o Apple fallaba, no se veía nada:** `completarRegreso().catch(() => {})` tragaba el error.

## Qué cambia

- `src/alertas.ts`: cola de avisos (`avisar`, `cerrarAlerta`) y textos. `alertaPorCambio(antes, ahora, rol)` compara el alquiler antes y después de cada cambio y devuelve el aviso del paso. Así también avisa cuando el dueño de prueba firma o confirma solo.
- `src/Alertas.tsx`: muestra el primer aviso de la cola (en `App.tsx`, con y sin sesión).
- `src/Aviso.tsx` (22 oct; **reemplazado por los avisos v2**, ver arriba):
  - `role="dialog"`, o `alertdialog` para los errores, con `aria-modal`, `aria-labelledby` y `aria-describedby` (ids únicos con `useId`; antes eran fijos);
  - el foco va al botón principal, Tab y Shift+Tab quedan dentro (X y botón; antes Tab solo volvía al botón), Esc o la X cierran y el foco vuelve a donde estaba o, si ese botón ya no existe, al contenido;
  - el efecto ya no se repite en cada render;
  - ícono del sprite de la app dentro del aro animado;
  - con «reducir movimiento» no hay animaciones;
  - entra desde abajo en celular y centrado en escritorio.
- Disparadores:
  - `Crear.tsx`: después de crear;
  - `Detalle.tsx`: efecto con `instantanea()`;
  - `App.tsx`: al entrar y si falla el regreso de Google o Apple.
- Los errores de cada paso **siguen en la pantalla** con cómo arreglarlos (no cambian).
- **Arreglo:** `.turno[hidden]{display:none}`. La caja «Te toca / Al dueño / Qué sigue» tiene `hidden={modoVideo}`, pero `.turno{display:grid}` le ganaba y se veía en el modo de una persona.
- Sin dependencias nuevas. Solo variables de color existentes. También se quitó un `i-chevron` repetido en el sprite de `index.html`.

## Textos (modo de una persona en la red de prueba, como app.lockumi.com)

Los marcados `// LEGAL: revisar` en `src/alertas.ts` son los del depósito guardado, el plazo para reclamos, el plazo adelantado, el reclamo, la mediación, la devolución, el reparto y el reclamo aceptado.

| Paso | Clave | Título | Qué pasó | Qué sigue |
|---|---|---|---|---|
| Crear alquiler | `crear` | Alquiler creado | Guardamos el alquiler de Apartamento en Barreal de Heredia con un depósito de 20 USDC. | Lo que sigue: Leer el contrato y firmarlo. Después lo firma el dueño de prueba. |
| Firma del inquilino | `firma-inquilino` | Firmaste el contrato | La firma quedó guardada con la fecha y la hora. | Lo que sigue: El dueño de prueba lo firma solo, en unos segundos. |
| Firma del dueño de prueba (contrato firmado por los dos) | `firma-dueno` | Contrato firmado por los dos | El dueño de prueba también firmó. El contrato ya tiene las dos firmas. | Lo que sigue: Pagar el depósito de 20 USDC. |
| Pagar el depósito | `pago` | ¡Depósito guardado! | 20 USDC guardados en una cuenta segura de la red de prueba. Ni el dueño ni el inquilino pueden sacarlos solos. *(Legal, 23 oct; cambiado por Legal el 24 oct, ronda 3)* | Lo que sigue: Tomar las fotos de entrada de cada espacio y marcar la lista. |
| Fotos y lista de entrada: confirma el inquilino | `entrada-inquilino` | Confirmaste las fotos de entrada | Las fotos y la lista quedaron guardadas con la fecha y la hora. | Lo que sigue: El dueño de prueba las revisa y las confirma solo, en unos segundos. |
| Fotos de entrada: confirma el dueño de prueba | `entrada-dueno` | Empezó el alquiler | Los dos confirmaron las fotos de entrada. El depósito sigue guardado. | Lo que sigue: Cuando entregues el lugar, toca «Empezar fotos de salida». |
| Empezar fotos de salida | `salida-inicio` | Empezaron las fotos de salida | Ya pueden registrar cómo quedó el lugar. | Lo que sigue: Tomar una foto de cada espacio, marcar la lista y confirmar. |
| Fotos de salida: confirma el inquilino | `salida-inquilino` | Confirmaste las fotos de salida | Las fotos y la lista quedaron guardadas con la fecha y la hora. | Lo que sigue: El dueño de prueba las revisa y las confirma solo, en unos segundos. |
| Fotos de salida: confirma el dueño de prueba | `salida-dueno` | Fotos de salida confirmadas | Los dos confirmaron las fotos de salida. Empiezan los 7 días para reclamos. | Lo que sigue: Si el dueño de prueba no reclama, después de 7 días el depósito se devuelve al inquilino. En esta prueba puedes adelantar el plazo o hacer un reclamo en nombre del dueño de prueba. |
| Solo red de prueba: adelantar el plazo | `adelantar` | Plazo adelantado | Solo en la red de prueba: terminamos ahora los 7 días para reclamos. | Lo que sigue: El dueño de prueba aprueba y Lockumi devuelve el depósito al inquilino en la red de prueba. Tarda entre 20 y 60 segundos. |
| Devolución después de 7 días sin reclamos | `devolucion` | Depósito devuelto | No hubo reclamos en 7 días. El dueño de prueba aprobó y Lockumi devolvió 19,94 USDC al inquilino en la red de prueba. | Lo que sigue: El alquiler terminó. No tienes nada pendiente. |
| Reclamo del dueño de prueba | `reclamo` | Reclamo enviado | El dueño de prueba reclamó 5 USDC del depósito. | Lo que sigue: El inquilino acepta o no el reclamo. Si no lo acepta, pasa a una persona mediadora (simulación). |
| No estoy de acuerdo → mediación | `mediacion` | Pasa a una persona mediadora | No hubo acuerdo con el reclamo. En esta prueba la persona mediadora es una simulación. | Lo que sigue: Una persona mediadora revisa las fotos y les ayuda a buscar un acuerdo sobre el reparto del depósito. En esta prueba, decides tú el reparto con «Resolver el reclamo (simulación)». *(Legal, 24 oct)* |
| Reparto de la persona mediadora (simulación) | `reparto` | Reparto del depósito | Se repartió el depósito en la red de prueba: 2,4925 USDC al dueño y 17,4475 USDC al inquilino. *(Legal, 24 oct)* | Lo que sigue: El alquiler terminó. No tienes nada pendiente. |
| Aceptar reclamo | `acuerdo` | Reclamo aceptado | Se repartió el depósito en la red de prueba: 4,985 USDC al dueño y 14,955 USDC al inquilino. | Lo que sigue: El alquiler terminó. No tienes nada pendiente. |
| Entrar (el regreso de Google o Apple no terminó) | `ingreso-fallo` | El ingreso no terminó | Toca Entrar y elige tu cuenta. *(Legal, 23 oct)* | — |
| Entrar (correcto) | `ingreso` | ¡Ingresaste correctamente! | Te damos la bienvenida a la demo. Desde aquí puedes ver tus alquileres y crear un depósito protegido. | — |

En el modo real (app.lockumi.com) el aviso de ingreso dice «Estamos preparando tu billetera.» en lugar de «Te damos la bienvenida a la demo.». El texto no cambió.

Montos: los de devolución y reparto ya vienen con la comisión de la red de prueba (0,3 %), igual que la pantalla «Depósito devuelto».

## Pruebas

- `src/__tests__/alertas.test.tsx` (21 pruebas; v2: sin diálogo ni X, zonas `status` / `alert`, cierre solo a los 5 s con pausa, toque, Enter, Espacio y Esc, textos de Legal, casita completa con el `viewBox` del logo, CSS de 26 px / 320 / 366 px, llave una sola vez, movimiento reducido, tonos e ícono de «Tomar foto»):
  - el componente (zonas, nombre, ids, sin X, pausa, ícono, movimiento reducido);
  - la cola;
  - cada paso con las acciones reales de la demo;
  - textos sin emojis, sin «liberado» y sin palabras técnicas;
  - marcas `LEGAL`;
  - CSS de `.turno[hidden]`.
- `scripts/alertas/capturar.mjs`:
  - recorre los tres caminos (sin reclamos, mediación y reclamo aceptado) en 390 y 1280 px, con la sesión simulada y `/api/solo` respondido en el script; bloquea Stellar y Cavos;
  - revisa cada aviso: título, zona `status` o `alert` (sin diálogo), que no robe el foco, nombre «Aviso. Toca para cerrar» y sin X; lo cierra por turnos tocándolo, con Esc, enfocándolo (pausa: con mouse o foco encima no se esconde) + Enter con el foco de vuelta, o dejándolo esconderse solo (entre 5 y 7 s); que en el teléfono no tape el encabezado ni el título, la casita completa, tamaño y emojis;
  - guarda `capturas/alertas-preview-<paso>-{movil,escritorio}.png`.

  Uso: `VITE_CAVOS_APP_ID=… OUT=…/alertas-preview- CHROME=/usr/bin/google-chrome node scripts/alertas/capturar.mjs`, con Vite en 5173 (con `VITE_TRUSTLESS=1` y `VITE_CAVOS_APP_ID`) y en 5174 (solo `VITE_TRUSTLESS=1`, para el ingreso simulado).

## Textos de mediación revisados por Legal (24 oct 2026, rama `contrato-compacto`, sin publicar)

Regla: la persona mediadora **ayuda** a buscar un acuerdo; **no decide**. Reemplazan los textos de producción que decían que la persona mediadora «decide». Los avisos de esta página ya cumplían la regla y no cambian.

| Dónde | Texto nuevo |
|---|---|
| Contrato, «Mediación» (`src/screens/ContratoDoc.tsx`; también en «Descargar o imprimir» y en el panel del contrato compacto) | «Si no se ponen de acuerdo, una persona mediadora revisa con ustedes las fotos de entrada y de salida y les ayuda a buscar un acuerdo sobre el reparto del depósito. No decide por ustedes.» En la prueba se agrega: «En esta prueba, la mediación es una simulación y el reparto se elige con el botón «Resolver el reclamo (simulación)».» |
| Reclamo del dueño, inquilino (`src/screens/Detalle.tsx`) | «… Si no estás de acuerdo, una persona mediadora revisa las fotos con ustedes y les ayuda a buscar un acuerdo.» |
| Pantalla de mediación (`src/screens/Detalle.tsx`) | «No hubo acuerdo. Una persona mediadora revisa con ustedes las fotos de entrada y salida y les ayuda a buscar un acuerdo sobre el reparto.» |
| «Sigue» del reclamo, inquilino (`src/flujo.ts`) | «Si lo rechazas, una persona mediadora les ayuda a buscar un acuerdo.» |
| «Sigue» del reclamo, dueño (`src/flujo.ts`) | «Si lo rechaza, una persona mediadora les ayuda a buscar un acuerdo.» |
| «Sigue» de la mediación (`src/flujo.ts`) | «La persona mediadora les ayuda a acordar cómo se reparte el depósito.» |
| Línea «Ahora» de la prueba en mediación (`src/flujo.ts`) | «Ahora toca la mediación (simulada). En esta prueba, el reparto lo decides tú con el botón de abajo.» |

Cada uno lleva `// LEGAL: revisado (24/10) · la persona mediadora ayuda, no decide`. Pruebas: `src/services/__tests__/flujo.test.ts` («mediación: la persona mediadora ayuda, no decide»), `src/screens/__tests__/contrato-compacto.test.tsx` («Mediación en el contrato») y `contrato-plegable.test.tsx`; el script `scripts/contrato-plegable/capturar.mjs` revisa el PDF.

## Legal, ronda 2 (24 oct 2026, rama `contrato-compacto`, sin publicar)

Legal revisó `c5d713e` (los 7 textos de arriba quedan aprobados) y pidió quitar los «decide» que quedaban y la promesa «ni Lockumi». Cada cambio lleva `// LEGAL: revisado (24/10)`.

| Dónde | Antes | Ahora |
|---|---|---|
| Contrato, «El depósito» (`src/screens/ContratoDoc.tsx`; también en «Descargar o imprimir» y en el panel del contrato compacto) | «Nadie puede tomarlo solo: ni el dueño, ni el inquilino, ni Lockumi.» | «Ni el dueño ni el inquilino pueden tomarlo solos. En esta prueba, si hay un reclamo, la cuenta de Lockumi es la que ejecuta el reparto que se elige en la simulación.» |
| Botón de la persona mediadora, dos personas con servidor (`src/screens/Detalle.tsx`) | «Decidir como mediador» | «Registrar el acuerdo» |
| Botón de la persona mediadora, demo local sin red (`src/screens/Detalle.tsx`) | «Demo: decidir como mediador» | «Demo: registrar el acuerdo» |
| Botón que confirma el reparto, fuera de la prueba de video (`src/screens/Detalle.tsx`) | «Decidir» | «Registrar el acuerdo» |
| Espera en la mediación (`src/screens/Detalle.tsx`) | «… Te avisaremos cuando haya una decisión.» | «… Te avisaremos cuando haya un acuerdo.» |
| Comprobante del paso `resolucion` (`src/services/comprobantes.ts`) | «Reparto del depósito según la decisión» | «Reparto del depósito» |
| Historial, demo local (`src/acciones.ts`) | «La persona mediadora decidió: … al dueño y … al inquilino» | «Acuerdo registrado: … al dueño y … al inquilino» |
| Términos 6.7 (`src/legal/terminos.md`, versión 1.5-demo → **1.6-demo**, 24 oct 2026) | «… pasa a una persona mediadora **simulada** que decide un reparto simulado …» | texto exacto de Legal (ver `src/legal/LEEME.md`) |

app.lockumi.com (modo de una persona) muestra «Resolver el reclamo (simulación)» y «Confirmar el reparto», que no cambian.

**Sin cambiar (para Legal):**
- `src/screens/Detalle.tsx`, nota del modo de una persona: «La persona mediadora es simulada: su decisión no se registra en la red de prueba ni mueve el depósito de prueba.» Pendiente de un texto de Legal.
- `supabase/migrations/20261017000000_lockumi_e2e.sql` (versión con servidor, no activa en app.lockumi.com): «Solo una persona mediadora puede decidir.» y «La persona mediadora decidió: …». No se editó: el repositorio no deja constancia de si se aplicó al proyecto de Supabase (`scripts/aplicar-supabase-e2e.mjs`). Si se aplicó, hace falta una migración nueva con `create or replace function` para `lk_decidir_mediacion`; si no, se puede editar este archivo. `scripts/probar-esquema.mjs` sigue esperando el texto actual.
- La frase «nadie puede tomarlo/sacarlos solo» de otros textos (avisos, recorrido, Detalle, Real, Login, README) y la página de inicio (`lockumi/landing`): lista para Legal en el informe de la ronda 2; no se tocaron. *(Cambiados en la ronda 3, salvo la página de inicio; ver abajo.)*

Pruebas: `src/screens/__tests__/contrato-compacto.test.tsx` («ronda 2 de Legal…»), `contrato-plegable.test.tsx` y `src/legal/__tests__/casillas.test.tsx` (versión 1.6-demo, 6.7 exacta, la aceptación de Términos 1.5-demo ya no cuenta).

### [Servicio real]

Aprobada por Legal solo para un servicio real o una versión de producción. **No se muestra en la demo.**

> Si después de la mediación no hay acuerdo, el depósito sigue guardado y cualquiera de las dos partes puede acudir a los tribunales de Costa Rica. El depósito se reparte según el acuerdo al que lleguen después o según lo que resuelva la autoridad.

## Legal, ronda 3 (24 oct 2026, rama `contrato-compacto`, sin publicar)

**Nota de la mediación (modo de una persona, `src/screens/Detalle.tsx`).** El reparto que se elige con «Resolver el reclamo (simulación)» **sí se ejecuta en la red de prueba**: `acciones.decidir` → `escrow.resolver` (`src/services/escrow.ts`, `escrowReal ? real : simulado`) → `/api/solo` «resolver» → `resolve-dispute` firmado por la cuenta de plataforma de Lockumi (`api/_lib/solo.ts`, caso `resolver`). Por eso la nota pasa a ser:

> La mediación es simulada: el reparto que elijas se ejecuta con tokens de prueba, sin valor.

Esa nota solo se ve en el modo de una persona (`VITE_FLUJO=solo`). app.lockumi.com muestra la nota de la demo en vivo, que no cambia. Para Legal (sin cambiar): las notas del mismo modo «El reclamo y la mediación no se registran en la red de prueba» y «El reclamo es simulado: no se registra en la red de prueba…» no coinciden con el código, porque `acciones.reclamar` abre la disputa en la red de prueba (`escrow.disputar`).

**Mensajes de la versión con servidor.** No consta en el repositorio si `20261017000000_lockumi_e2e.sql` se aplicó al proyecto de Supabase. Por eso no se editó; la nueva migración `supabase/migrations/20261024120000_lk_mediacion_acuerdo.sql` reemplaza `lk_decidir_mediacion` (misma lógica y permisos) con los mensajes «Solo la persona mediadora puede registrar el acuerdo.» y «Acuerdo registrado: …». No se cruza con `20261024000000_lk_espacios.sql` de la rama `agregar-espacio`: esa migración no redefine `lk_decidir_mediacion` ni `lk_evento`. `scripts/probar-esquema.mjs` comprueba los dos textos.

**«Nadie puede…» → «Ni el dueño ni el inquilino…»** (texto exacto de Legal; la página de inicio no cambia):

| Dónde | Texto nuevo |
|---|---|
| Aviso «¡Depósito guardado!» (`src/alertas.ts`), con red / sin red | «… Ni el dueño ni el inquilino pueden sacarlos solos.» / «… Ni el dueño ni el inquilino pueden tomarlo solos.» |
| Detalle, notas del depósito (cuenta propia y USDC de Lockumi) | «Ni el dueño ni el inquilino pueden sacarlos solos.» |
| Detalle, alquiler en curso | «El depósito sigue guardado y ni el dueño ni el inquilino pueden tomarlo solos.» |
| Pago en la red de prueba (`Real.tsx`) | «Ni el dueño ni el inquilino pueden tomarlos solos.» |
| Entrar, beneficio «Tu depósito queda guardado» (solo el texto) | «Ni el dueño ni el inquilino pueden liberarlo solos.» |
| Recorrido, «Firmas y depósito» | «Ni el dueño ni el inquilino lo pueden sacar solos.» |
| README, «Depósito protegido» | «ni el dueño ni el inquilino pueden liberar el dinero por su cuenta; en la demo, si hay un reclamo, la cuenta de Lockumi ejecuta el reparto» |

**Devolución automática (sin cambiar).** Cuando terminan los 7 días sin reclamo, ninguna persona aprueba, pero firma el servidor de Lockumi: la app abierta llama a `cerrarSinReclamo` (`Detalle.tsx`, efecto al llegar a 0) → `escrow.devolver` → `/api/solo` «aprobar» (firma la cuenta del dueño de prueba, con llave en el servidor de Lockumi) y «liberar» (firma la cuenta de plataforma de Lockumi). No hay tarea programada (`vercel.json` sin crons): si nadie abre la app, no se libera.

**Términos 1.6-demo (misma versión y fecha, 24 oct 2026).** *(5.3 cambió en la ronda 4, ver abajo.)* 4.1 a) cambia «Lockumi no custodia tus tokens de prueba» por el texto de Legal: «Lockumi no guarda tus tokens de prueba en una cuenta propia: quedan en un contrato de escrow en la red de prueba. Si hay un reclamo, la cuenta de Lockumi puede ejecutar el reparto.» **5.3 (Cavos) no cambia:** según la documentación del vault de Cavos, dentro de los límites de la app (por omisión 25 USDC por transacción y 100 por día; 100 XLM y 500 por día) el vault firma pagos **sin preguntar** cuando lo pide el código de la página, así que el código web de Lockumi podría mover fondos de la billetera hasta esos límites sin que la persona lo vea. El servidor de Lockumi no tiene llaves de la billetera de nadie. 5.4 no cambia.

Pruebas: `src/__tests__/alertas.test.tsx`, `recorrido.test.tsx`, `src/legal/__tests__/casillas.test.tsx` (4.1 a) nueva, 5.3 igual, beneficio de Entrar), `contrato-compacto` y `contrato-plegable`; `node scripts/probar-esquema.mjs`.

## Legal, ronda 4 (24 oct 2026, rama `contrato-compacto`, sin publicar)

**Notas del modo de una persona (`src/screens/Detalle.tsx`).** Ahora coinciden con el código (`acciones.reclamar` → `escrow.disputar`):
- Dueño, antes de reclamar: «El reclamo abre una disputa en la red de prueba y bloquea el depósito de prueba. La mediación es simulada.»
- Reclamo abierto: «El reclamo se registra en la red de prueba y bloquea el depósito de prueba hasta que se resuelva. La mediación es simulada.»

**Plazo de reclamos, nota de la red de prueba (la que ve app.lockumi.com):** «Termina el {fecha}. Si no hay reclamo en 7 días, el depósito de prueba se devuelve completo al inquilino la próxima vez que alguien abra el alquiler. Ninguna de las partes tiene que aprobarlo: lo ejecuta la cuenta de Lockumi.» La nota de la demo local sin red («…sin que nadie tenga que aprobarlo») no cambió. Ojo: dice «7 días» fijo; en una vista previa con `VITE_VENTANA_SEGUNDOS=300` el plazo real es de 5 minutos.

**Textos que presentan la devolución como automática a los 7 días (sin cambiar, para Legal):** lista y propuestas en el informe de la ronda 4.

**Términos 5.3 (Cavos), texto exacto de Legal, 1.6-demo sin cambio de versión.** Quitó la mención «Cavos, LLC (Delaware, Estados Unidos)» y el enlace a sus términos (https://cavos.xyz/terms).
- Qué firma el vault de Cavos sin preguntar (`@cavos/kit` 0.4.2, `dist/vault/index.mjs`, `evaluate` y `parseStellarTransaction`; https://docs.cavos.xyz/docs/vault): pagos (`payment`) y `createAccount` dentro de los límites, y **siempre** las operaciones sin gasto `changeTrust`, `manageData`, `bumpSequence` y `endSponsoringFutureReserves`. Las llamadas a contratos y el `pathPaymentStrictReceive` de «Obtener USDC de prueba» siempre pasan por la regla «Over the limit».
- La app no arma pagos para la billetera. Sí abre la trustline de USDC con `addTrustline` (un `changeTrust`), que el vault firma sin preguntar; no mueve fondos.
- Que «el depósito y cada acción en el contrato te piden confirmar» depende del panel: Approvals → «Over the limit» = *Ask the user*. Con «Sign without asking» se firmarían sin preguntar.
- Prueba: `src/__tests__/cavos-sin-firma-silenciosa.test.ts` falla si el código usa `execute`, `signMessage`, `signTransaction` de Cavos, `vault: false`, otro `Cavos.connect` o `signXdr` fuera de `firmarXdr`, o si arma `Operation.payment` / `Operation.createAccount`.
- Desactivar la firma sin confirmación: no se puede desde el código (el vault lee la política de Cavos, no de la página). En el panel, app → Approvals: guardar una política con límite 0 (o sin límites) para XLM y USDC de Stellar. Según `evaluate`, con 0 todo pago pasa a la regla «Over the limit». Mientras no se guarde una política, valen los límites por omisión.

**PLAN.md:** tarea programada para la devolución y la llave del dueño de prueba como custodia con dinero real (lista para el abogado).


## Legal, ronda 5 (24 oct 2026, rama `contrato-compacto`, sin publicar)

**Textos.** En la app, el plazo sale de `textoPlazo(a)` (`{plazo}`, el mismo del encabezado «{plazo} para reclamos»; en la app publicada y en la vista previa son 7 días: ver «Legal, ronda 6»). `plazoMs` y `textoPlazo` pasaron a `src/flujo.ts` (puro) y `src/acciones.ts` los reexporta, así `turno` y `ahoraPrueba` también los usan. «7 días» fijo queda solo en el contrato (`ContratoDoc`), los Términos, la landing y estos documentos. Quedan fijos también, porque no tienen un alquiler a mano: las etapas (`flujo.ts` `ETAPAS`), el nombre del estado (`types.ts`), la tarjeta de Inicio («Con 7 días para reclamos») y el recorrido guiado (`recorrido.ts`, ejemplo). «Termina el {fecha}.» ya no muestra «a. m..» (`conPunto` en `Detalle.tsx`). Prueba: `src/__tests__/plazo-real.test.ts`.

- Encabezado de la pantalla del reclamo: etiqueta «Mediación simulada» (antes «Simulado»). Junto a «El reclamo abre una disputa en la red de prueba»: «Red de prueba». `Simulado` acepta ahora `texto`; los demás usos siguen diciendo «Simulado».
- Demo local: «Si no hay reclamos, después de {plazo} el depósito se devuelve completo al inquilino. En esta demo local no hay red: es solo una simulación.»
- Textos «después de…»: Detalle (regla y espera del inquilino), `flujo.ts` (salida y ventana, con `{plazo}`), `alertas.ts` (aviso de fotos de salida), contrato (con 7 días), Términos 6.5 («Si no reclama, después de ese plazo se libera todo al inquilino.», sigue en 1.6-demo), README y PLAN.

**Landing, sin cambios (publicada; necesita el OK de Katherine).** `landing/index.html:148` dice hoy «Si en 7 días no hay un reclamo con pruebas, tu depósito vuelve a ti.» Texto de Legal para cuando Katherine lo apruebe: **«Si no hay un reclamo con pruebas, después de 7 días se te devuelve tu depósito.»**

**Términos 5.3: no publicar todavía.** El texto actual queda en la rama, pero no se publica hasta que Katherine decida en el panel de Cavos (app → Approvals). Hay dos variantes:

- **(a) Katherine pone los límites en 0 y «Over the limit» = *Ask the user*:** al final de 5.3 se agrega «Abrir la línea de USDC en tu billetera, que no mueve fondos, se firma sin pedirte confirmación.»
- **(b) No hace el cambio:** se reemplaza «Lockumi no usa esa función: el depósito y cada acción en el contrato te piden confirmar.» por «Lockumi no usa esa función a propósito y la app te pide confirmar antes del depósito y de cada acción en el contrato. Los límites de firma sin confirmación de Cavos siguen activos con sus valores por defecto.»

**Revisión en el código: ¿la app (sin contar Cavos) pide confirmar?** «Paso explícito» = el usuario toca un botón que nombra la acción. Ninguna acción tiene una ventana de confirmación aparte (modal o «¿Seguro?»); el único `confirm()` de la app es «Reiniciar demo» (`Inicio.tsx:55`).

| Acción | Dónde | Paso explícito en la app | Quién firma en la red |
|---|---|---|---|
| Depósito (producción y vista previa) | `Detalle.tsx:80` (`EsperaPago`, «Pagar {monto}») → `:63` `pagar` | Sí: botón. Sin modal | Con «cuenta de prueba» (lo normal): el servidor (`escrow.ts` `fondearPrueba`), sin billetera. Con cuenta propia: Cavos o Freighter (`cuentaPropia.ts:43`) |
| Depósito (una persona, `VITE_FLUJO=solo`) | `Real.tsx:117` y `:202` «Depositar {monto}» | Sí: botón. Sin modal | Billetera (`solo.ts:115`, `:126`) o el servidor con cuenta de prueba |
| Comprar USDC de prueba | `solo.ts:84` | Sí: botón de «Obtener USDC de prueba» | Billetera (path payment) |
| Reclamo | `Detalle.tsx:160`/`:152` abren el formulario → `:190` «Enviar reclamo» (con «Cancelar») | Sí: dos pasos (abrir formulario, enviar). Sin modal | Servidor (`solo.disputar`) |
| Aceptar el reclamo | `Detalle.tsx:211` «Aceptar reclamo» | Sí: un botón; ejecuta al tocarlo. Sin modal | Servidor (reparto) |
| Rechazar el reclamo | `Detalle.tsx:212` «No estoy de acuerdo» | Sí: un botón; ejecuta al tocarlo. Sin modal | Nada en la red (pasa a mediación) |
| Resolver (mediación) | `Detalle.tsx:232` «Resolver el reclamo (simulación)» → `:236` «Confirmar el reparto» | Sí: dos pasos (abrir panel, confirmar) | Servidor (`solo.resolver`) |
| Aprobar la devolución (sin reclamo) | `Detalle.tsx:138` (efecto al llegar a 0) → `escrow.ts` `devolver` | **No**: automático al abrir el alquiler | Servidor, por el dueño de prueba (`solo.aprobar`) |
| Aprobar (modo `VITE_TRUSTLESS` con dos personas, sin uso hoy) | `Detalle.tsx:268` «Todo está bien: aprobar la devolución» | Sí: botón | Billetera (`trustless.ts:17`) |
| Liberar el depósito | `Detalle.tsx:138` automático; reintento `:147`; `:272` «Liberar el depósito al inquilino» (modo `VITE_TRUSTLESS`) | **No** en el camino normal (automático); sí en el reintento y en `:272` | Servidor (`solo.liberar`, `trustless.ts:34`) |
| Adelantar el plazo (solo red de prueba) | `Detalle.tsx:151`, `:164` | Sí: un botón, sin modal | Nada (cambia el reloj de la app) |

**Conclusión para la variante (b).** «La app te pide confirmar antes del depósito» es cierto (botón). «… y de cada acción en el contrato» **no es del todo cierto**: aprobar y liberar sin reclamo ocurren solos, sin ningún paso, y los firma el servidor. Aceptar y rechazar se ejecutan con un solo toque. Además, en la app publicada la billetera del usuario solo firma el depósito con cuenta propia y la compra de USDC de prueba; reclamo, reparto, aprobación y liberación no pasan por la billetera (ni por Cavos). Sugerencia para Legal: «la app te pide tocar un botón antes del depósito, del reclamo, de la respuesta y del reparto; sin reclamo, la devolución ocurre sola al terminar el plazo».

## Legal, ronda 6 (24 oct 2026, rama `contrato-compacto`, sin publicar)

- **Nota del plazo en producción** (`Detalle.tsx`, `escrowReal`): «Termina el {fecha}. Si no hay reclamo, después de {plazo} el depósito de prueba se devuelve completo al inquilino la próxima vez que alguien abra el alquiler. Ninguna de las partes tiene que aprobarlo: lo ejecuta la cuenta de Lockumi.»
- **Plazo real de app.lockumi.com: 604800 s (7 días).** `VITE_VENTANA_SEGUNDOS` solo se usa con el servidor compartido (Supabase, `servidor/repositorio.ts:110`). En el modo publicado (`modoPrueba`, sin Supabase) el alquiler se guarda sin `ventanaSegundos` y `plazoMs` usa 604800 (`flujo.ts:5`). El bundle publicado (`/assets/index-DQeLMnM-.js`, revisado el 24 oct a las 2:28 a. m.) solo tiene `ventanaSegundos??604800` y no incluye el código de Supabase. Por eso la tarjeta de Inicio, `ETAPAS`, `types.ts` y `recorrido.ts` siguen con «7 días». La vista previa de Vercel también usa 7 días, aunque tenga `VITE_VENTANA_SEGUNDOS=300`.
- **Términos 5.3 «Firmas.»:** texto exacto de Legal, misma versión 1.6-demo · 24 oct 2026. Las variantes (a) y (b) de la ronda 5 quedan sin efecto. El cambio de límites en Cavos se sigue recomendando, pero ya no bloquea la publicación.
- **Quién firma el depósito en el modo por omisión** («USDC de prueba que te da Lockumi», `Crear.tsx:123`): **el servidor**, con la cuenta de inquilino de prueba. El camino es `escrow.ts:92` (solo va a la billetera si `usaCuentaPropia`) → `escrow.ts:113` `solo.fondearPrueba` → `api/_lib/solo.ts:323-333` `fondear-prueba` (`inquilinoPruebaDe` + `firmarYEnviar`). La billetera no firma nada en ese modo.
- **Textos que dicen que firmas tú con tu billetera** (sin cambios; para Legal):
  - Términos 3.1 (`terminos.md:28`): «Con Cavos se crea tu billetera (tu cuenta digital en la app), con la que firmas el depósito como inquilino.» **No es así en el modo por omisión**, donde firma el servidor.
  - `Crear.tsx:274` (solo `VITE_FLUJO=solo`): «Tú eres el inquilino y depositas con tu billetera.»
  - `Detalle.tsx:267` (solo con dos personas, `VITE_TRUSTLESS` con Supabase, sin uso hoy): «Si todo está bien, aprueba ahora la devolución. Tu billetera te pedirá confirmar la firma.» Choca con 5.3, que dice que la aprobación la firma Lockumi.
  - Términos 5.5.1 b) (`terminos.md:55`): «cada transacción la firmas tú en la extensión de Freighter». Habla de Freighter, pero «cada transacción» se puede leer como todas las acciones del contrato.
  - Privacidad (`privacidad.md:16`): «Las transacciones las firmas tú en la extensión de Freighter». Mismo matiz.
  - Correctos porque dicen la condición: Términos 4.1 a) (`terminos.md:34`, «Si eliges “Usar mi propio USDC de prueba”…: tú firmas el depósito con tu billetera»), `Detalle.tsx:76`, `Real.tsx:70`, `:116`, `Billetera.tsx:85`, README:228.
  - Sin promesas de firma: Login, `alertas.ts`, `recorrido.ts` y la guía del README («firmar» ahí es firmar el contrato o las fotos dentro de la app, no en la red).
- **Otros textos que chocan con la nueva 5.3** (el reclamo se registra en la red):
  - `Crear.tsx:278` (modo publicado): «Los reclamos y el mediador son simulados: los haces tú con un botón en nombre del dueño.»
  - `Crear.tsx:275` y `Real.tsx:206` (solo `VITE_FLUJO=solo`): «El reclamo y el mediador son simulados y no se registran en la red.»
- **Matices de la 5.3 para Legal:**
  - «la respuesta»: aceptar ejecuta el reparto (lo firma Lockumi). Rechazar no firma nada en la red.
  - «cuando tú o la otra parte tocan el botón»: en la app publicada, el reclamo lo hace el usuario en nombre del dueño de prueba.
  - «se ejecuta después del plazo sin que nadie tenga que tocar nada»: hoy necesita que alguien abra el alquiler (ver la tarea programada en PLAN.md).

## Legal, ronda 7 (24 oct 2026, rama `contrato-compacto`, sin publicar)

- **Términos 1.6-demo** (misma versión y fecha):
  - 5.3 «Firmas.»: texto exacto de Legal.
  - 3.1: «Con Cavos se crea tu billetera en la red de prueba. Si usas tu propia billetera, con ella firmas el depósito como inquilino; en el modo por defecto, lo firma por ti la cuenta de Lockumi (ver 5.3).» Se mantuvo lo demás de 3.1: «Para entrar, usas el servicio de inicio de sesión de **Cavos** (cláusula 5) con Google, Apple o tu correo y un código.» y «Debes ser mayor de 18 años.»
  - 5.5.1 b): el texto de Legal. Se mantuvo el final de la b): «y **Lockumi nunca ve tu clave privada**».
- **Aviso de privacidad → 1.6-demo · 24 de octubre de 2026:** el párrafo de Freighter usa el texto de Legal. Se mantuvo «Lockumi nunca ve tu clave privada.» y el resto del párrafo.
- **Crear, hoja «Red de prueba»:**
  - Modo publicado: «Lockumi firma y confirma por el dueño de prueba. La mediación es simulada. El reclamo lo haces tú con un botón, en nombre del dueño de prueba, y queda registrado en la red de prueba.»
  - Modo de una persona: «Tú eres el inquilino. Si usas tu propia billetera, depositas con ella; si no, la cuenta de Lockumi firma el depósito por ti en la red de prueba.» La hoja sale a todos en ese modo, tengan o no billetera propia (`Crear.tsx:184`, `:271`). Se mantuvo «El dueño es el dueño de prueba: por eso no te pedimos su correo.»
- **Detalle, aprobación (modo de dos personas con Supabase, sin uso hoy):** «Si todo está bien, aprueba ahora la devolución. Tu billetera te pedirá confirmar el depósito. La aprobación y la liberación las firma la cuenta de Lockumi.» **Ojo:** en ese modo, el botón «Todo está bien: aprobar la devolución» firma la aprobación **con la billetera del dueño** (`trustless.ts:28-30`, `firmarXdr`), así que la segunda frase no es cierta ahí. El modo no está activo en ninguna versión publicada.
- **El reclamo en el modo de una persona (`VITE_FLUJO=solo`) no abre ninguna disputa en la red.** Ese modo muestra `DetalleSolo` (`Detalle.tsx:313`, `Real.tsx:173`), que tiene 5 pasos: obtener USDC, depositar, aprobar, devolver y terminado. No tiene botón de reclamo. Las notas de reclamo con `modoSolo` en `Detalle.tsx` (las de las rondas 4 y 5: «El reclamo abre una disputa en la red de prueba…», «El reclamo se registra en la red de prueba…») solo aparecen en el alquiler de ejemplo del recorrido guiado, que es de solo lectura y no usa la red. Por eso no cambié `Crear.tsx:275` ni `Real.tsx:206` («…simulados…: no se registran en la red de prueba»), que en ese modo son correctos. Las dos notas de `Detalle.tsx` quedan para que Legal decida.
- **Aceptación:**
  - Cada documento tiene su casilla y su clave en `localStorage` (`lockumi.terminos.aceptacion`, `lockumi.privacidad.consentimiento`, con `{ version, fecha }`). `Login.tsx:95-96` marca cada casilla solo si la versión guardada es la del texto. La versión se lee de la línea «Versión …» del `.md` (`documentos.ts:23`).
  - Producción tiene hoy las dos en 1.5-demo. Al publicar, el usuario marca **las dos casillas otra vez, una sola vez**, en la misma pantalla «Entrar». Quien ya aceptó Términos 1.6-demo en la vista previa solo marca la de privacidad.
  - No hay otra pantalla que pida aceptar. La consecuencia es que quien ya tiene la sesión abierta (`App.tsx:39` solo muestra «Entrar» sin usuario) **no vuelve a aceptar** hasta que cierre sesión y entre de nuevo.

## Legal, ronda 8 (24 oct 2026, rama `contrato-compacto`, sin publicar)

- `Crear.tsx:276` (modo de una persona): «El reclamo y la persona mediadora son simulados y no se registran en la red de prueba.» Se mantuvo la primera frase del párrafo («Lockumi firma y confirma por el dueño de prueba: tú tocas el botón en su nombre.»).
- `Detalle.tsx:158` (modo de una persona, alquiler de ejemplo): píldora «Simulado» (antes «Red de prueba») y «En este ejemplo, el reclamo y la mediación son simulados: no se registran en la red de prueba ni bloquean ningún depósito.»
- `Detalle.tsx:206` (igual): «En este ejemplo, el reclamo es simulado: no se registra en la red de prueba ni bloquea ningún depósito. La mediación también es simulada.»
- Los comentarios `LEGAL` de `Detalle.tsx:157`, `:205` y `Crear.tsx:274/:279` ahora dicen a qué modo se aplica cada texto: ejemplo de `modoSolo` = sin red; `modoVideo` (producción) = disputa real en la red de prueba.
- `Detalle.tsx:267` (modo de dos personas): «Si todo está bien, aprueba ahora la devolución. Tu billetera te pedirá confirmar esta aprobación. La liberación del depósito la firma la cuenta de Lockumi.»
- **BLOQUEO para activar el modo de dos personas:** antes, Legal reescribe Términos 5.3, que hoy dice que la cuenta de Lockumi firma la aprobación. En ese modo la firma la billetera del dueño (`trustless.ts:28-30`). También está en PLAN.md.
- **Corrección de la ronda 7:** las notas de `Detalle.tsx:158` y `:206` **hoy no se ven en ninguna pantalla**. El alquiler de ejemplo siempre se ve como inquilino (`miRol: 'inquilino'` en `recorrido.ts`; `vistaDe` lo respeta) y no llega al estado «reclamo». Para la imagen `legal-ronda8.jpg` forcé el rol y el estado en una copia aparte, sin subirla.
- Nueva aceptación con la sesión abierta: propuesta en `docs/reaceptacion.md` (solo imagen; no hay código).

## Legal, ronda 9 (24 oct 2026, rama `contrato-compacto`, sin publicar)

- **Términos 5.3 («Firmas.»)**: se reemplazó entera por el texto exacto de Legal, con las letras a) a f) en líneas separadas. Mismo formato que 4.2.
- **3.1:** «en el modo por defecto, lo firma Lockumi con tu cuenta de inquilino de prueba (ver 5.3)».
- **5.5.1 b):** «las demás las firma Lockumi (ver 5.3)».
- **`Crear.tsx:275`** (modo de una persona): «si no, Lockumi firma el depósito por ti con una cuenta de prueba, en la red de prueba».
- Tests: `src/legal/__tests__/casillas.test.tsx` (5.3 línea por línea, 3.1, 5.5.1 b) y `src/__tests__/plazo-real.test.ts` (texto de Crear).

### ~~ALERTA~~ resuelto con 9b: 5.3 e) no coincidía con producción

Resuelto en la ronda 9b (Legal eligió la opción a, solo texto): 2.2 b) y 5.3 e) ahora dicen que el reclamo y el reparto sí van a la red de prueba. Abajo queda el análisis original como referencia.


5.3 e) dice: «en la fase 1 no hay reclamos en la red: el reclamo y la mediación son simulados (2.2 b y 6.7)». Eso **no es cierto en el modo que usa app.lockumi.com**. Producción corre `modoVideo`: `VITE_TRUSTLESS=1`, sin servidor compartido y sin `VITE_FLUJO=solo` (`src/servidor/config.ts:12-21`; `escrowReal = modoPrueba`).

En ese modo el reclamo **sí va a la red de prueba**:

1. `acciones.ts:89-91`: `reclamar` llama a `escrow.disputar`.
2. `services/escrow.ts:135-139`: llama a `solo.disputar`.
3. `api/_lib/solo.ts:364-370`: `dispute_escrow`, firmado con la llave del dueño de prueba, que guarda el servidor.

El depósito queda bloqueado en la red. El reparto **también se ejecuta en la red**:

1. `acciones.ts:94-96` (aceptar) y la mediación de `Detalle.tsx` llaman a `escrow.resolver`.
2. `services/escrow.ts:141-146`: llama a `solo.resolver`.
3. `api/_lib/solo.ts:372-381`: `resolve_dispute`, firmado por la cuenta de plataforma de Lockumi como `disputeResolver` (`solo.ts:291`).

Lo único simulado es la persona mediadora. El reparto lo elige el inquilino con «Resolver el reclamo (simulación)».

- **Solo en `modoSolo`** (`VITE_FLUJO=solo`, el alquiler de ejemplo) el reclamo y la mediación no van a la red: `DetalleSolo` no tiene reclamo. Ahí e) sí es cierto.
- **«Fase 1» no está en 2.2 b ni en 6.7.** Se define en **2.3**: tú haces de inquilino y el dueño es una cuenta de prueba. Esa es justamente la producción actual.
- **2.2 b** dice que «los reclamos y la persona mediadora son simulados». En `modoVideo` es parcialmente falso: el reclamo y el reparto quedan en la red.
- **6.7** dice «el reparto se elige con el botón…» y es correcto, pero no dice que ese reparto se ejecuta en la red.
- **Primera frase de e).** Hoy el reclamo ya lo abre la cuenta del dueño (de prueba), no la cuenta de Lockumi que resuelve disputas. Eso coincide con la frase «Cuando haya reclamos en la red…».
- **«solo según el acuerdo de las partes o lo que decida un árbitro o un juez» y «si no hay acuerdo, el depósito sigue bloqueado»** no coinciden con producción: en la mediación simulada el inquilino elige y se ejecuta (`Detalle.tsx:216-224`).
- **Textos visibles que contradicen e)** (no se cambiaron):
  - `Crear.tsx:280` (`modoVideo`): «El reclamo lo haces tú con un botón, en nombre del dueño de prueba, y queda registrado en la red de prueba.»
  - `Detalle.tsx:207` (`modoVideo`): «Su reclamo quedó registrado en la cuenta segura de la red de prueba: el depósito no se mueve hasta que se resuelva.»
- **Para que Legal decida:**
  - (a) cambiar e) a «En la fase 1, el reclamo del dueño de prueba sí queda registrado en la red de prueba y bloquea el depósito; la persona mediadora es simulada y el reparto lo elige el inquilino con un botón y lo ejecuta la cuenta de Lockumi que resuelve disputas»;
  - (b) pedir un cambio técnico para que `modoVideo` no abra la disputa en la red. Eso es lógica del escrow y necesita el OK de Katherine.

### Lo demás de 5.3, verificado en `modoVideo`

- **a) Depósito: cierto.**
  - Cuenta propia: `escrow.ts:66-72`. El XDR lo firma tu billetera con `propia.firmar`, y el servidor solo lo reenvía (`solo.ts:314`).
  - USDC de Lockumi: `escrow.ts:93-112`, `fondear-prueba`, que firma el servidor con la cuenta de inquilino de prueba (`solo.ts:323-333`).
  - Ojo: 4.1 c) dice que, si falla tu billetera, Lockumi puede usar una cuenta de inquilino de prueba de respaldo. a) no lo menciona.
- **b) Compra y línea de USDC: coincide con el código** (`cuentaPropia.ts:43`, `billetera.ts:95-100`, `addTrustline`).
  - Para revisar: el comentario de `billetera.ts:82-83` dice que con el vault las trustlines quedan «fuera del límite» y que el vault muestra su propio aviso. Si es así, abrir la línea **sí** pide confirmación. No lo probé con una cuenta real.
- **c) Aprobación: cierto.** La firma la llave del dueño de prueba en el servidor (`solo.ts:335-351`, `approve_milestone`). En el modo de dos personas la firma la billetera del dueño (`trustless.ts:28-30`), que coincide con «fase 2». Legal confirma si esto levanta el BLOQUEO de la ronda 8.
- **d) Liberación: cierto.** La firma la plataforma (`release_funds`, `solo.ts:354-362`), solo con `approved` y hacia `receiver`, que es el inquilino (`solo.ts:291`). La devolución al abrir: `Detalle.tsx:138` (`!modoSolo && resta === 0 && !a.reclamo`).
  - Matiz: «sin que nadie más tenga que aprobarla» es cierto para la persona, pero la aprobación existe en la red: la firma Lockumi con el dueño de prueba en ese momento (`escrow.ts:117-125`).
- **f) Cavos: cierto.** La app no usa la firma sin confirmación; lo cubre `src/__tests__/cavos-sin-firma-silenciosa.test.ts`.
- **Otros textos que todavía dicen que la cuenta de Lockumi firma** (no se cambiaron):
  - `Real.tsx:43`, `:142`, `:201`, `:204` (`modoSolo`);
  - `Detalle.tsx:267` (dos personas, «La liberación del depósito la firma la cuenta de Lockumi»: correcto);
  - `ContratoDoc.tsx:34` («la cuenta de Lockumi es la que ejecuta» el reparto: correcto);
  - `privacidad.md:16` (Freighter: «Las demás acciones del contrato las firma la cuenta de Lockumi»).

## Legal, ronda 9b (24 oct 2026, rama `contrato-compacto`, sin publicar)

Legal eligió la opción (a), solo texto. Sigue siendo la versión 1.6-demo de los Términos y de Privacidad, con fecha 24 oct 2026. No cambió ningún texto de la app.

- **Términos 2.2 b):** el depósito, la aprobación, la liberación, el reclamo y el reparto del reclamo sí se registran en la red de prueba. La persona mediadora es simulada y el reparto se elige con un botón (6.7).
- **5.3 a):** se agregó la cuenta de inquilino de prueba de respaldo (4.1 c), por si falla la firma de tu billetera.
- **5.3 b):** «Abrir la línea de USDC en tu billetera no mueve fondos; según la billetera, puede pedirte o no que lo confirmes.» Así queda cubierta la duda sobre `billetera.ts:82-83`.
- **5.3 d):** «Si nadie aprobó antes, en ese momento Lockumi firma la aprobación con la cuenta del dueño de prueba.» Así lo hace el código (`escrow.ts:117-125`).
- **5.3 e):** el reclamo abre una disputa en la red de prueba. La firma Lockumi con la cuenta del dueño de prueba. El reparto se elige con «Resolver el reclamo (simulación)» y lo ejecuta la cuenta que resuelve disputas.
  - Se verificó la etiqueta del botón: es literal en `Detalle.tsx:232` (`modoVideo`). También aparece en `Detalle.tsx:226`, `alertas.ts:66` y Términos 6.7.
- **Privacidad (Freighter):** «Las demás acciones del contrato las firma Lockumi (ver la cláusula 5.3 de los Términos) en la red de prueba.»
- **BLOQUEO del modo de dos personas, con un alcance más chico.** 5.3 c) ya cubre la aprobación con la billetera del dueño (fase 2). Pero antes de activar ese modo, Legal tiene que reescribir 5.3 e) y 2.2 b) para la fase 2: ahí la disputa la abriría la billetera del dueño real, no la cuenta del dueño de prueba.
- **RIESGO DE PRODUCTO:** hoy, en producción (`modoVideo`), el inquilino elige el reparto con un botón y Lockumi lo ejecuta en la red de prueba (`Detalle.tsx:216-232`, `solo.ts:372-381`). Está informado en 6.7, 2.2 b) y 5.3 e), pero **no puede llegar a dinero real**. En un servicio real, sin acuerdo de las partes, el depósito queda bloqueado (criterio 4 de Legal).

