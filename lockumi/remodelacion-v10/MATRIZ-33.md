# Matriz 33 — evidencia vigente

Las capturas de la interfaz siguen en el artifact `v10-vigente`, a 390×844 y 1440×900. `08-pasos` es de `8bebcd0` (`8bebcd026b8320f66153c977cffa20a7c81916a9`). `04-crear`, `09-contrato`, `09-contrato-abierto`, `10-firmas`, `13-protegido`, `14-checklist`, `16-encurso` y `32-foco-fotos` son de `e39dc79` (`e39dc7992ae287298b7fec3d09cccb556e3ff794`). `14-espacio` y `23-mediacion` siguen de `db92b55` (`db92b55103c54e0b6baf6524869c939838e42d51`). `18-salida-390.png` y `18-salida-1440.png` son de `6144e0b` (`6144e0b754d7fc932e236564a0cc39016ecfe8e0`). El resto, entre ellos `32-recorrido`, sigue de `6338f4e` (`6338f4e4064000f7eefc9d1494646146de38969b`). `32-recorrido` es el paso 1 de esa corrida, no el foco de fotos. El manifiesto está en `v10-vigente/MANIFIESTO.md`. La corrida anterior (`2540eb7`) está archivada en `v10-2540eb7` y no es la evidencia vigente. No se recapturó 1280: las reglas de escritorio aplican desde 960 px y la evidencia de escritorio de esta pasada es 1440. Los PNG `*-1280.png` de `3891b3d` se apartaron a `v10-3891b3d-1280` para no mezclarlos con esta corrida. `v10-barra`, `v10-cierre`, `v10-cuenta`, `v10-inicio`, `v10-preview`, `v10-qa` y `v10-resto` son historial. No dicen que la pantalla ya coincida.

Demo local `http://127.0.0.1:4174` (`npm run dev`), sin `VITE_CAVOS_APP_ID` y sin `VITE_PRUEBA_COMPLETA`. Correo de ejemplo. Los estados 11, 14 y 18–23 se abrieron escribiendo un alquiler solo en el `localStorage` de ese navegador y recargando. No se tocó la semilla de `src/store.ts`, no se cobró, no se firmó, no se abrió la cámara y no se encendió ningún flag. El anillo de la 16 sale de `diasQueQuedan`. En esta corrida, con el día de Costa Rica en 2026-11-07, dio **358 días** hasta el 31 oct 2027. No es 212 y no se escribió a mano.

El botón «Volver» es `95adc07` (`95adc074dc813073592d9ce0a67b4a74ebccedaa`). Sobre `8bebcd0`, `npm test` dio 1566 pasadas y 1 omitida (184 archivos) y `npm run build` compiló en esta máquina. No se publicó. Eso no equivale a fidelidad visual ni a un cierre. No se capturó 05 ni 12: esas esperas solo están en pantalla mientras el envío sigue abierto, y no se agregó una pausa. Su comportamiento está en `cierre-presentacion.test.tsx` y `espera-pago.test.tsx`. Siguen sin captura 06, 07, 15, 17, 25 y 31, detrás de servidor, cámara, flag o regreso de OAuth. No se encendió ningún flag y no se creó una ruta ni un servicio. La 18 de `6144e0b` quedó como está. Esta matriz no certifica 33 de 33 ni el funcionamiento en remoto.

`https://app.lockumi.com` sigue con `last-modified: Thu, 05 Nov 2026 23:12:51 GMT`. No se publicó ni se hizo merge.

## Fidelidad revisada en esta pasada

| # | Qué se ve ahora | Evidencia | Qué no se cambió, a propósito |
|---|---|---|---|
| 01 | Bajada corta, chips Dueño e Inquilino que no son botones ni enlaces, las dos casillas y Entrar. En 1440 la escena queda a la izquierda y Entrar se ve. En 390 el texto de privacidad sigue y Entrar queda justo debajo. | `01-bienvenida-390.png`, `01-bienvenida-1440.png` | La bajada es visual. Siguen `NOTA_TITULO` y «Ni el dueño ni el inquilino pueden liberarlo solos.» No hay Empezar ni Ya tengo cuenta. |
| 02 | Hoja «Continuar con tu correo», botones rellenos. A 1440 la hoja llega a 680 px. | `02-correo-390.png`, `02-correo-1440.png` | El código sigue en un solo campo. |
| 03 | Lista real: Heredia grande, paso 2, Dueño; Escazú compacta. Sin el aviso de ingreso encima. | `03-inicio-390.png`, `03-inicio-1440.png` | La semilla no copia el dibujo. El aviso se cerró con su propio toque antes de la foto. |
| 04 | Lugar, fechas y depósito van primero. Reglas es un pliegue cerrado (`details.open` medido en falso) con la cuenta y una flecha dentro de la misma fila menta. La nota queda dentro de la tarjeta blanca. El correo y «Crear alquiler e invitar» siguen a la vista. | `04-crear-390.png`, `04-crear-1440.png`, `mediciones-qa-correccion.json` | La regla por defecto sigue en el envío. No se quitó el correo. No hay franja beige fuera de la tarjeta. |
| 08 | La lista de 8 pasos sigue en la misma pantalla de firmas. En 390 queda debajo de la tarjeta: con la lista a la vista, la tarjeta mide y=-774. En 1440 es la columna izquierda, al lado de la tarjeta, y el documento sigue oculto. | `08-pasos-390.png`, `08-pasos-1440.png`, `mediciones-08.json` | No se borró la lista ni se reemplazó el contrato por «Abrir contrato». El ancho de esa columna no se volvió a tocar. |
| 09 | Tarjeta primero: lugar, USD 600,00, fechas, «7 días», «No decide por ustedes.», «0 de 2» y el estado de cada firma. El documento no se dibuja hasta tocar «Ver contrato completo»: `#ct-firma` lleva `hidden`. En 390 «Firma como dueño» termina en y=750, por encima de la barra, con la casilla «Leí el contrato y estoy de acuerdo.» a la vista. Al abrir se leen la regla y las cláusulas. Paso 2 de 8. | `09-contrato-390.png`, `09-contrato-1440.png`, `09-contrato-abierto-390.png`, `09-contrato-abierto-1440.png`, `mediciones-qa-correccion.json` | El botón de dentro del documento sigue diciendo «Contrato de alquiler». No se reescribió el clausulado. No se firmó. |
| 10 | El mismo alquiler con la firma del inquilino ya guardada: «1 de 2», dueño Pendiente, inquilino Firmó. El documento sigue oculto y «Firma como dueño» está en la primera pantalla (y=750 a 390). | `10-firmas-390.png`, `10-firmas-1440.png`, `mediciones-qa-correccion.json` | Fixture solo en el navegador de la captura. No se pulsó Firmar. El documento sigue «Pendiente de firmas» hasta que firmen los dos. |
| 11 | El monto y «Pagar USD 800,00» están en la primera pantalla (y≈286 a 390). «Te toca» va debajo. No se pulsó. | `11-pagar-390.png`, `11-pagar-1440.png` | No hay comisión ni un total 812. |
| 13 | Confirmación después de un pago que ya existe (`a.pago`) y antes de las fotos. «Depósito protegido», USD 450,00 del fixture, «Ahora: fotos de entrada» y «Paso 4 de 8». Continuar guarda `lockumi.confirmacion-deposito.<id>` y muestra la lista. Cero anillos y cero títulos «Alquiler en curso». El rótulo sigue «Ilustración pendiente de aprobación». | `13-protegido-390.png`, `13-protegido-1440.png`, `mediciones-qa-correccion.json` | No llama a `pagar` ni cambia el estado. Recargar antes de Continuar vuelve a mostrar la confirmación. No se fingió el pago: el fixture ya trae `pago`. |
| 14 | Lista de los 4 espacios del acta: «2 de 4 espacios listos». Sala y Cocina en Listo, Dormitorio y Baño en Pendiente. «Revisar y confirmar» medido desactivado. Al abrir Baño sigue «Tomar foto», Bien y Con detalle. | `14-checklist-390.png`, `14-checklist-1440.png`, `14-espacio-390.png`, `14-espacio-1440.png` | El total sale de los cuartos, no de un 5 fijo. No se abrió la cámara: no hay visor. Volver a la lista no marca el espacio. |
| 16 | El anillo sigue solo aquí: 358 días, el nombre y la fecha. El título es «Alquiler en curso». No hay un título «Depósito protegido». En 1440 la tarjeta ocupa el ancho del contenido y queda encima de las dos columnas. | `16-encurso-390.png`, `16-encurso-1440.png`, `mediciones-qa-correccion.json` | 358 días es la cuenta de las fechas, no 212. «Empezar fotos de salida» sigue llamando a `iniciarSalida`. |
| 18 | Los dos rótulos reservan la misma altura (31 px) y las fotos arrancan en la misma línea. «Así estaba al entrar» se lee entero, en dos líneas si no cabe. No se confirmó. | `18-salida-390.png`, `18-salida-1440.png` | No se usó la cámara. El ancho del contrato de la 08 no se volvió a tocar. |
| 19 | Contador, fila D1–D7 y «Reclamar un daño». Con el fixture (un día transcurrido de 7) D1 va hecho y D2 es el día actual. El párrafo legal y la fecha de fin no se reescribieron. | `19-plazo-390.png`, `19-plazo-1440.png` | La fila sale de `plazoMs` (7 días enteros). Un plazo de horas o minutos no dibuja D1–D7. |
| 20 | «¡Depósito devuelto!» y el monto del inquilino grande, en su propia línea, sin cortarse. El dueño sigue en la fila de abajo. Luego el rótulo de ilustración ya existente. | `20-devuelto-390.png`, `20-devuelto-1440.png` | No se agregó un botón «Listo» ni una ilustración nueva. Vía `automatico` del fixture. |
| 21 | Formulario abierto: monto, motivo y «Tomar foto del daño». No se envió. | `21-reclamo-390.png`, `21-reclamo-1440.png` | «Enviar reclamo» queda más abajo en 390. No se inventaron fotos del daño. |
| 22 | Acciones en la primera pantalla. La foto de ejemplo se ve entera, con «Daño · sala». No se pulsó. | `22-respuesta-390.png`, `22-respuesta-1440.png` | El texto del reparto no se reescribió. |
| 23 | Resumen del reclamo real del fixture (USD 120,00) y la frase «No hay un costo configurado en este alquiler.» Siguen la ilustración, la espera y «Demo: registrar el acuerdo». No se pulsó. | `23-mediacion-390.png`, `23-mediacion-1440.png` | «Pedir mediación» sigue en `MediacionPC`, detrás del flag. No se escribió USD XX ni una comisión. |
| 24 | «Datos» es una fila cerrada. Al abrirla siguen nombre, correo y acceso. | `24-perfil-390.png`, `24-perfil-datos-390.png` y las de 1440 | No hay cédula, cuenta de pago, Editar perfil ni Llave. |
| 26 | «Todavía no hay avisos.» | `26-avisos-390.png`, `26-avisos-1440.png` | No se copiaron avisos de ejemplo. |
| 27 | Ayuda, «Ver el recorrido» relleno y los temas. | `27-ayuda-390.png`, `27-ayuda-1440.png` | Textos ya publicados. Sigue la nota de revisión legal. |
| 28 | Columna de lectura. El texto legal no se tocó. | `28-terminos-390.png`, `28-terminos-1440.png` | Versión 1.6-demo, pendiente de revisión por abogado. |
| 29 | El título de la página sigue «Tus alquileres». El vacío dice «Aún sin alquileres» y «Crea el primero o acepta una invitación.», con «Nuevo alquiler». En 1440 la ilustración queda a la izquierda. | `29-vacio-390.png`, `29-vacio-1440.png` | El botón no cambió. Siguen la nota de demo y Reiniciar. |
| 30 | «No encontramos ese alquiler» y volver, botón relleno. | `30-error-390.png`, `30-error-1440.png` | No es un error de red. |
| 32 | Paso 4 de 6, título «Fotos y lista de entrada», enfocado en la lista (`data-recorrido="fotos"`). En 390 el globo queda encima de la barra (termina en y=772 y la barra empieza en y=791), sin tapar «Revisar y confirmar» ni las cuatro filas. Saltar, Atrás y Siguiente miden 44 px de alto y se leen enteros. En 1440 el globo queda a la derecha de la lista y no tapa el botón. Siguen los 6 puntos. | `32-foco-fotos-390.png`, `32-foco-fotos-1440.png`, `mediciones-qa-correccion.json` | Los textos de los pasos 5 y 6 no se reescribieron. El paso 1 de `6338f4e` sigue en `32-recorrido-*` y no es esta toma. |

## Cobertura, no fidelidad al dibujo

Estas pantallas se ven y conservan su función. No se declara que copien la maqueta.

- 03 y 16 usan los datos reales de la semilla y de las fechas. Heredia no se convirtió en el Escazú del dibujo, y 358 no se cambió por 212.
- 09 y 10 ya son la tarjeta con los datos del alquiler. El documento íntegro no se dibuja hasta «Ver contrato completo» y la casilla de firma sigue en la primera pantalla. No se firmó.
- 11 no calcula comisión.
- 14 es la lista de los espacios de ese alquiler. Entrar a uno conserva la captura. No se abrió la cámara.
- 18 compara el espacio actual, no una grilla de toda la casa.
- 23, sin el flag, resume el reclamo que ya existe y dice que no hay un costo configurado. No es «Solicitar mediación / Costo USD XX».

## Bloqueo funcional y estilo, por separado

No tener captura no cierra la pantalla. El 7 de noviembre, 00:44, Katherine recordó que la optimización cambia la presentación y no elimina la función. No existe una ruta aparte no es motivo para descartar el contrato resumido, los pasos, las fotos ni las esperas. Lo dudoso no se implementa hasta tener la fuente. Lo que sí se tocó en esta pasada, porque no depende de esa fuente, es el «Volver» de la invitación sin servidor: pasa a botón sólido y sigue yendo a `#/`.

| # | Bloqueo funcional | Estilo del componente que ya existe |
|---|---|---|
| 05 | `EsperaVista` («Creando…» / «Preparando tu alquiler…») se monta mientras el alta sigue abierta y el formulario queda `hidden`. `cierre-presentacion.test.tsx` lo comprueba con un `acciones.crear` que no termina: aparece la espera, el formulario se oculta y, al fallar, vuelve con el borrador. No hay captura de esa pantalla: el alta local termina en el mismo turno y no se agregó un temporizador. | El botón sigue `boton--primario`. No se inventó un 55 %. El estado de éxito sigue siendo el alquiler creado, no la espera. |
| 06 | El link de invitación solo se monta con `modoServidor`. No hay servidor ni se fabricó un token. | Ya estilizado, sin captura. `Invitacion` en `Detalle.tsx`: «Copiar link» es `boton--primario` y WhatsApp es `boton--secundario`. El fallo sigue en `<p className="error" role="alert">`. «Crear un link nuevo» sigue siendo un enlace de texto: es la acción secundaria. |
| 07 | Aceptar una invitación exige el servidor. Esta pasada no lo capturó. | Sin servidor, `screens/Invitacion.tsx` ya muestra el rótulo y «Las invitaciones funcionan solo con el servidor compartido.» «Volver» ahora es `boton--primario` y sigue yendo a `#/`. Con servidor, «Aceptar invitación» ya era `boton--primario`. El camino con token no se capturó. |
| 12 | `EsperaPago` solo aparece mientras corre el pago. No se pulsó Pagar y no hay captura: mostrarlo en la app exigiría dejar el pago colgado. `espera-pago.test.tsx` ya pinta las etapas 1, 2 y 3 y el reintento. `cierre-presentacion.test.tsx` monta la etapa 1: el botón dice «Guardando tu depósito…», está `aria-busy` y no vuelve a llamar `onPagar`. | El texto legal sigue «Guardando tu depósito…». No se sustituyó por la frase larga del dibujo. No hay temporizador en `PagoSimulado`. |
| 13 | `ConfirmacionDeposito` solo se monta si `a.pago` ya existe y esa visita no pulsó Continuar. No es `en_curso` ni una ruta nueva. Ver la fila 13 de arriba. | El anillo queda solo en la 16. No hay asset nuevo ni animación. Continuar no cobra. |
| 15 | El visor abre la cámara. No se abrió. | Ya estilizado, sin captura del visor. `TomarFoto` es `boton--primario` o `boton--secundario` (se ve en la 14). En `Camara.tsx`, Cancelar es `boton--secundario` y el aviso de fallo es `.aviso-campo`. El disparo es el control de la cámara (anillo blanco, centro coral), no un botón de la interfaz. |
| 17 | `AvisoSalida` solo se monta con `VITE_PRUEBA_COMPLETA`. El flag sigue apagado. No hay captura. | El aviso, cuando el flag lo monta, usa la tarjeta del sistema: al final de `index.css`, `.aviso-app` tiene fondo `var(--tarjeta)`, sin borde. No se cambió cuándo aparece. |
| 23 | «Pedir mediación» vive en `MediacionPC` (B.7, con otra persona) y solo entra con el mismo flag. No se encendió y no se pulsó. La tarjeta del dibujo «Solicitar mediación / Costo USD XX» no está en el código y no se creó. | Ya estilizado. `MediacionPC.tsx`: `boton--pc` es relleno (`prueba.css`, gradiente coral, sin borde) y «Prefiero no usarla» es `boton--secundario`. Siguen la casilla y `IlustracionPendiente`. La captura vigente es la mediación sin flag. |
| 25 | El puntaje solo entra con `VITE_REPUTACION=1`. Sigue apagado. | Ya estilizado, sin captura. `MiPerfil` en `reputacion/Pantallas.tsx` usa la clase `ilustracion-pendiente` y `boton--secundario`. No se redibujó el producto. |
| 31 | `Entrando` solo corre al volver de Google o Apple con `modoReal`. No se inventó ese regreso. | Ya estilizado, sin captura. `Login.tsx` `Entrando`: escena aprobada y «Entrando a tu cuenta…», clase `ingreso-cargando`, sin botón. |
| 33 | Los 3 puntos del dibujo no fijan 3 pasos. El globo pinta un punto por aprendizaje y hoy son 6. No se agregó «Todo en un solo lugar». | Propuesta de mapeo, abajo. Los textos 5 y 6 siguen porque Legal los fijó el 23/10 y `recorrido.test.tsx` prohíbe reescribir esas cláusulas, entre ellas la palabra «decide». |

## Verificación de comportamiento, `8bebcd0`

`src/screens/__tests__/cierre-presentacion.test.tsx` monta los componentes en happy-dom. `fetch` rechaza cualquier llamada. No hay red, cámara, correo ni firmador externo.

- Contrato: `#ct-firma` empieza con `hidden`. «Ver contrato completo» muestra la regla y «7 días para reclamos». «Ocultar contrato completo» lo oculta otra vez. La tarjeta, la casilla y «Firma como dueño» siguen.
- Firma: sin la casilla, el botón avisa y no llama `acciones.firmar`. Con la casilla, lo llama una vez con el alquiler, `contrato` y `dueno`. La firma queda en el almacén local y el estado sigue `firmas`. Dos toques seguidos cuentan una sola llamada.
- Confirmación: sin `pago`, la pantalla es la lista. Con `pago` ya guardado, se ve «Depósito protegido», «Ahora: fotos de entrada» y «Paso 4 de 8», sin anillo. Continuar muestra la lista, escribe `lockumi.confirmacion-deposito.<id>` y no llama `acciones.pagar`. El estado sigue `fotos_entrada` y `pago` no cambia. Al remontar, la lista sigue. Si se borra esa clave, la confirmación vuelve.
- Reglas: el `details` nace cerrado y la regla por defecto sigue en el envío. Un formulario vacío no llama `acciones.crear` y muestra el error de dirección. Con datos válidos, dos envíos seguidos llaman una vez. Mientras la promesa sigue abierta se ve «Creando…» y el formulario queda `hidden`. Al fallar, el formulario vuelve y el borrador de `sessionStorage` trae la regla agregada. Remontar restaura lugar y las dos reglas.
- Pago: `EsperaPago` en reposo llama `onPagar` una vez. En la etapa 1 el botón dice «Guardando tu depósito…» y un toque no vuelve a llamar. Las etapas 1, 2, 3 y el reintento siguen en `espera-pago.test.tsx`.
- Recorrido: la primera visita a Inicio abre el globo. Siguiente pasa al paso 2, Atrás vuelve al 1 y Saltar lo marca visto. Una segunda visita no lo abre sola. «¿Cómo funciona?» lo vuelve a abrir. `fetch` no se llama.

## Decisiones tomadas por «no función nueva»

La orden del 7 de noviembre, 00:47, pidió corregir la presentación. `e39dc79` cierra lo que `db92b55` dejó mal medido: la firma a la vista, el documento oculto por defecto y la confirmación separada del anillo. Lo que sigue en esta tabla no se hizo porque la fuente no autoriza el cambio, no porque falte una ruta.

| Decisión | Qué se conservó | Qué cambió | Qué queda fuera |
|---|---|---|---|
| Contrato en firmas (08, 09, 10) | `ContratoDoc`, la casilla y `Firma`. El botón interno sigue «Contrato de alquiler». | La tarjeta es la vista inicial. «Ver contrato completo» muestra el documento, que empieza oculto. La firma queda en esa misma vista. | No se resume el clausulado. `ContratoCompacto` sigue fuera de `firmas`. |
| Pasos (08) | La lista de 8 pasos. | En el móvil queda debajo de la tarea. En 1440 sigue a la izquierda. | La lista no se borró ni reemplaza al contrato. |
| Espera al crear (05) | El mismo `acciones.crear`. Si falla, el formulario vuelve. | `EsperaVista` mientras `ocupado`. Borrador en la sesión de esa pestaña. | Sin captura y sin temporizador. El éxito sigue siendo abrir el alquiler. |
| Espera al pagar (12) | `EsperaPago` y «Guardando tu depósito…». | El rótulo de ilustración aparece solo con `etapa > 0`. Un fallo devuelve el formulario. | No se pulsó Pagar. No se cambió la frase legal por la del dibujo. |
| Fotos (14, 15, 18) | `TomarFoto`, `onFoto` y las marcas Bien / Con detalle. La 18 no se tocó. | La primera vista es la lista de los cuartos reales. Confirmar sigue desactivado hasta que cada uno tiene foto y lista. | El visor abre la cámara. No se abrió. No hay un 5 fijo. |
| Depósito protegido (13) | El monto, la frase legal y el paso real (`fotos_entrada`, paso 4). El anillo y «Empezar fotos de salida» siguen en `en_curso`. | `ConfirmacionDeposito` si `a.pago` ya existe. Continuar solo recuerda la visita y abre la lista. | No hay asset nuevo, ni cobro, ni éxito fingido. |
| Recorrido (32, 33) | Primera vez, repetir, Saltar, teclado y movimiento reducido. Los 6 textos. | El paso 4 enfoca `[data-recorrido="fotos"]`. En el móvil el globo se sienta sobre la barra y la lista sube para verse entera. | Ver el mapeo. No se escribió «Todo en un solo lugar». |
| Entrar (01) | Las dos casillas, Entrar y la frase legal. | No hay «Empezar», «Ya tengo cuenta» ni tarjetas que elijan el papel. Los chips no eligen. | Quitar el consentimiento sería borrar la función, no cambiarla. |
| Pagar (11) | `Pagar` con `usd(monto)`. | No se dibujó comisión ni un total 812. | Un monto que la app no calcula sería un importe inventado. |
| Devuelto (20) | El estado `cerrado` y el reparto. | No se agregó «Listo». | Un botón nuevo sin destino acordado no se inventa. |
| Perfil (24) y reputación (25) | Sesión, roles visibles, Términos, privacidad y Salir. | No hay cédula, «Editar perfil», cuenta de pago ni Llave con el flag apagado. | No hay campo ni API. El plan del 6/11 los deja fuera. No es solo presentación. |
| Mediación (23) | Los botones que ya había, sin pulsarlos. | El resumen muestra `usd(reclamo.monto)` y dice que no hay un costo configurado. | «Pedir mediación» y un monto de comisión siguen fuera: la acción está detrás del flag y no hay un costo en el alquiler. |

## Mapeo del recorrido (32 y 33)

Los 3 puntos dibujados en el PDF son el motivo del globo, no un conteo de pasos. El código pinta un punto por aprendizaje. Hoy son 6, y la captura `32-foco-fotos` los muestra junto a «Paso 4 de 6».

Correspondencia, sin quitar aprendizajes:

1. Bienvenida y crear el alquiler. Foco: `[data-recorrido="nuevo"]`.
2. Lugar, fechas y depósito. Foco: `[data-recorrido="datos"]`.
3. Reglas, ahora un pliegue. El foco sigue en `[data-recorrido="reglas"]`, que pasó al `details`.
4. Fotos y lista. El foco dejó el botón de un solo cuarto (`.tomar`) y apunta a la lista nueva.
5. Firmas y depósito guardado. El texto sigue «Ni el dueño ni el inquilino lo pueden sacar solos.»
6. Devolución o mediación. El texto de la simulación sigue igual.

Contradicción que no bloquea el contrato, la lista ni las esperas: los pasos 5 y 6 no se reescribieron. Legal los fijó el 23/10 y la prueba `recorrido.test.tsx` exige esas frases y prohíbe, en todo el recorrido, la palabra «decide». Un texto nuevo que dijera que la mediación «no decide» chocaría con esa prueba. La propuesta es dejar esas dos frases y mover solo los focos cuando la interfaz cambie. Si Producto trae un texto no legal con fuente, se puede cambiar los pasos 1 a 4. Los pasos 5 y 6 necesitan una fuente de Legal.

La matriz no autoriza una comisión, un monto ni encender flags, servicios o producción.
