# Matriz 33 — evidencia vigente

Las capturas de esta matriz están en el artifact `v10-vigente`. Las carpetas `v10-barra`, `v10-cierre`, `v10-cuenta`, `v10-inicio`, `v10-preview`, `v10-qa` y `v10-resto` son pasadas anteriores. No se usan para decir que la pantalla ya coincide.

Demo local `http://127.0.0.1:4174` (`npm run dev`), sin `VITE_CAVOS_APP_ID`. Correo de ejemplo. Los estados 11, 14 y 18–23 se abrieron escribiendo un alquiler solo en el `localStorage` de ese navegador y recargando. No se tocó `src/store.ts`, no se cobró y no se encendió ningún flag. El anillo de la 16 sale de `diasQueQuedan` (entrada, salida y el día en Costa Rica). En esta corrida dio **359 días** hasta el 31 oct 2027, no 212.

`npm test` de este código: 1552 pasaron, 1 omitida. Eso no equivale a fidelidad visual.

| # | Qué se ve ahora | Evidencia vigente | Diferencia que queda |
|---|---|---|---|
| 01 | Escena aprobada, título real, nota legal, la frase «Ni el dueño ni el inquilino pueden liberarlo solos.», dos casillas y «Entrar». Sin las tres tarjetas de beneficios. | `01-bienvenida-390.png`, `01-bienvenida-1280.png`, `01-bienvenida-1440.png` | No hay «Empezar» ni «Ya tengo cuenta». Esas acciones no existen. |
| 02 | Hoja de correo, 680 px a 1440. | Pasada `v10-resto` (no se rehizo el formulario). | El código sigue en un solo campo. No se volvió a capturar en `v10-vigente`. |
| 03 | Inicio con tarjeta grande y compacta. | Pasada `v10-inicio`. El recorrido de esta pasada (`32-recorrido-390.png`) muestra el mismo Inicio. | La semilla no copia el dibujo: grande es Heredia, paso 2, Dueño. |
| 04 | Orden: lugar, fechas, depósito. En escritorio fechas y depósito van en la misma fila. Siguen reglas, correo y «Crear alquiler e invitar». | `04-crear-390.png`, `04-crear-1280.png`, `04-crear-1440.png`. A 390 fechasY 243 y montoY 371. | No es el formulario de tres campos. Esos campos extra son los que la app ya pide. |
| 05 | El botón pasa a «Creando…» y abre la ficha. | No hay pantalla aparte. | No se inventó una espera. |
| 06 | La invitación con link solo se monta con servidor (`modoServidor`). | No se capturó. | Bloqueo: no hay servidor en este demo y no se fabricó un token. |
| 07 | Rótulo «Ilustración pendiente de aprobación» y el texto de que hace falta el servidor. | Pasada `v10-resto/07-invitacion-390.png`. | Sigue sin token. No es la pantalla de aceptar. |
| 08 | En el móvil la lista de 8 pasos queda antes del contrato. El paso actual enlaza a `#accion-actual`. Los pasos de adelante no son enlaces. En escritorio la lista sigue en la columna derecha. | `08-pasos-390.png`, `08-pasos-1280.png`, `08-pasos-1440.png`. A 390 la lista está en y=361 y el panel en y=1177. | En 390 se ven 6 de los 8 sin bajar: arriba está el cambio de persona de la demo. No se reemplazó el contrato por un botón «Abrir contrato». |
| 09 | El contrato real, debajo de la lista en firmas. | `09-contrato-390.png`, `09-contrato-1280.png`, `09-contrato-1440.png` | No es la tarjeta resumen «USD 800 / Firmar» del dibujo. Quitar el documento habría borrado el contrato. |
| 10 | «Firmas del contrato» dentro del mismo panel, con la casilla de leerlo. | `10-firmas-390.png`, `10-firmas-1280.png`, `10-firmas-1440.png` | No hay «Firmado por los dos» ni «Ir al depósito»: en la semilla nadie ha firmado. No se firmó en esta pasada. |
| 11 | Depósito del inquilino, monto de la ficha, «Pagar USD 800,00». No se pulsó. | `11-pagar-390.png`, `11-pagar-1440.png`. Fixture local. | No se agregó comisión ni un total 812. El dibujo trae un ejemplo de comisión que esta pantalla no calcula. |
| 12 | La espera de tres pasos solo aparece mientras corre el pago. | No se capturó. | Bloqueo: mostrarla exige pulsar Pagar. No se hizo. |
| 13 | No hay una ruta distinta del alquiler en curso. | La 16 es ese estado. | Bloqueo: no existe la pantalla de celebración aparte. No se le puso el rótulo encima del anillo. |
| 14 | Un espacio a la vez: foto, «Bien» / «Con detalle» y «Tomar foto». Paso 4 de 8. | `14-checklist-390.png`, `14-checklist-1440.png`. Fixture local. | No es la lista de cinco espacios del dibujo. Esa lista saltaría el recorrido de cada espacio. |
| 15 | El botón «Tomar foto» abre la cámara. | Se ve en la 14. | Bloqueo: no se abrió la cámara. No hay foto de un archivo real. |
| 16 | Anillo con los días que faltan y «Sale el 31 oct 2027». El botón «Empezar fotos de salida» sigue. | `16-encurso-390.png`, `16-encurso-1280.png`, `16-encurso-1440.png`. Medido: «359 días», no 212. | El cambio de persona y «Te toca» siguen arriba del botón. |
| 17 | El aviso de 5 días lo arma la prueba completa. | No se capturó. | Bloqueo: `VITE_PRUEBA_COMPLETA` sigue apagado en `npm run dev`. No se escribió un aviso falso. |
| 18 | Fotos de salida, espacio 1, comparando con la entrada. | `18-salida-390.png`, `18-salida-1440.png`. Fixture local. | Sin fotos cargadas. No se usó la cámara. |
| 19 | Contador del plazo y «Reclamar un daño». El texto legal del plazo no se reescribió. | `19-plazo-390.png`, `19-plazo-1440.png`. Fixture local. | El plazo parte de la hora en que se armó el fixture, no de un «quedan 7» dibujado. |
| 20 | «Depósito devuelto» y el rótulo de ilustración. | `20-devuelto-390.png`, `20-devuelto-1440.png`. Fixture local, vía `automatico`. | Los montos salen de ese objeto local, no de un cierre real. |
| 21 | Formulario abierto: monto, motivo, foto y «Enviar reclamo». No se envió. | `21-reclamo-390.png`, `21-reclamo-1440.png` | No se inventaron fotos del daño. |
| 22 | Vista del inquilino: «Aceptar reclamo» y «No estoy de acuerdo». No se pulsó. | `22-respuesta-390.png`, `22-respuesta-1440.png` | Los botones quedan debajo de «Te toca» en 390. |
| 23 | «Con una persona mediadora» y el rótulo de ilustración. | `23-mediacion-390.png`, `23-mediacion-1440.png` | El costo y los textos legales no se reescribieron. |
| 24 | Identidad a la izquierda en escritorio. Lista: Datos, Avisos, Términos, Privacidad y Salir. | `24-perfil-390.png`, `24-perfil-1280.png`, `24-perfil-1440.png` | No hay cédula, cuenta de pago, «Editar perfil» ni Llave. Esas pantallas no existen con el flag apagado. |
| 25 | Puntaje solo con `VITE_REPUTACION=1`. El rótulo está en el código de `MiPerfil`. | No se capturó. | Bloqueo: el flag sigue apagado. |
| 26 | Avisos vacío. | Pasada `v10-resto/26-avisos-*.png`. | No se copiaron avisos de ejemplo. |
| 27 | Ayuda con cuatro temas. | Pasada `v10-resto/27-ayuda-*.png`. | Textos ya publicados. Pendiente de revisión legal antes de producción. |
| 28 | Columna de lectura. A 1440 el documento mide 680 px. El texto legal no se tocó. | `28-terminos-390.png`, `28-terminos-1440.png` | No hay captura a 1280. El ancho lo fija la misma regla desde 960 px. |
| 29 | Rótulo dentro de la tarjeta. «Nuevo alquiler» queda fuera, debajo. | `29-vacio-390.png`, `29-vacio-1280.png`, `29-vacio-1440.png`. El botón no está dentro de `.vacio`. | El título de la página sigue siendo «Tus alquileres». Siguen la nota de demo y Reiniciar. |
| 30 | «No encontramos ese alquiler» y volver. | Pasada `v10-resto/30-error-*.png`. | No es un error de red. |
| 31 | «Entrando a tu cuenta…» solo en el regreso de Google o Apple con Cavos. | No se capturó. | Bloqueo: hace falta `modoReal`. No se dibujó un spinner nuevo. |
| 32 | Primer paso del recorrido aprobado, con Saltar, debajo del «+» y sin taparlo. | `32-recorrido-390.png` (título «Te damos la bienvenida a Lockumi», solapa false). El de 1440 está en `v10-resto` y es el mismo paso. | El velo oscurece el resto de Inicio. |
| 33 | El dibujo enfoca la tarjeta y dice «Todo en un solo lugar». | No existe ese paso. | Bloqueo: el recorrido aprobado tiene 6 pasos y textos fijos. No se agregó una copia nueva. Saltar sí está en el paso 1 (captura 32). |

## Bloqueos, juntos

- Servidor o token: 06 y 07.
- Pulsar Pagar: 12.
- No hay pantalla distinta: 05 y 13.
- Cámara: 15.
- Flag apagado a propósito: 17 y 25.
- Regreso real de Google o Apple: 31.
- Texto que no está en el recorrido aprobado: 33.
