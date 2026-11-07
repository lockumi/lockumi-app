# Matriz 33/33 — segundo bloque (07/11/2026, madrugada UTC)

Parte desde `0f90950`. Las capturas nuevas están en el demo local `http://127.0.0.1:4174` (`npm run dev`), sin `VITE_CAVOS_APP_ID`, con correo de ejemplo. No hay dinero ni personas reales. No se abrió el JavaScript de Vercel.

No hay captura «antes» de estas pantallas en esta máquina: la comparación es contra los PNG de `pantallas/` y `desktop-revision/png/`. Lo que no se abrió queda marcado.

| # | Referencia | Ruta | Estado | Evidencia | Diferencia que queda |
|---|---|---|---|---|---|
| 01 | Bienvenida | `Login` | Capturado 390, 1280 y 1440 | `01-bienvenida-*.png`. En escritorio la escena queda a la izquierda y las acciones a la derecha. Siguen las dos casillas y el botón «Entrar». | El dibujo dice «Empezar», «Ya tengo cuenta» y dos tarjetas Dueño/Inquilino. Eso no existe: el acceso real pide las casillas legales. No se quitó la nota de la red de prueba ni los tres beneficios. |
| 02 | Login | Hoja de `Login` | Capturado 390 y 1440 | `02-login-390.png`, `02-login-1440.png`. La hoja mide 680 px a 1440. | El código sigue en un solo campo. No se partió en casillas por dígito. |
| 03 | Inicio | `#/` | Hecho en `0f90950` | Capturas de ese bloque. | La semilla no copia el dibujo: grande es Heredia, paso 2, Dueño. |
| 04 | Crear | `#/crear` | Capturado 390, 1280 y 1440 | `04-crear-*.png`. A 1440 el lugar va ancho y fechas/depósito van en dos columnas. El botón ya no ocupa todo el ancho. | Siguen reglas, correo del inquilino y el texto legal. El depósito arranca en 0, no en 800. El botón dice «Crear alquiler e invitar». |
| 05 | Creando | No hay ruta | No verificado | El botón pasa a «Creando…» y sigue a la ficha. | No se inventó una pantalla de espera. |
| 06 | Invitar | Bloque dentro de crear o de la ficha | No verificado como pantalla propia | No hay ruta `#/invitar`. | Copiar y el correo siguen en el componente de invitación del alquiler. No se abrió con un link real. |
| 07 | Aceptar | `#/invitacion/:id/:token` | Capturado el bloqueo, 390 | `07-invitacion-390.png`. Lleva el rótulo «Ilustración pendiente de aprobación». | Sin servidor compartido la pantalla dice que las invitaciones no están disponibles. No se fabricó un token ni el resumen Dueño/Inquilino. |
| 08 | Pasos | `#/alquiler/a2` | Capturado 390, 1280 y 1440 | `08-detalle-*.png`. Barra de 8 segmentos y lista de 8 pasos, derivadas de `etapaDe`. | No es la lista sola del dibujo. Siguen el turno, el contrato y «Ver como inquilino». El paso real es 2, Firmas. |
| 09 | Contrato | Dentro de la ficha | Parcial en la captura 08 | El contrato de la semilla se ve en `08-detalle-1440.png`. | No se comparó campo a campo con el PNG ni se forzó el reparto en dos columnas del dibujo. |
| 10 | Firmas | Dentro de la ficha | Parcial en la captura 08 | La ficha `a2` está en firmas. | No se firmó. La captura de firmas no se aisló. |
| 11 | Pagar | Estado `pendiente_pago` | No verificado | La semilla no está en ese estado. | No se cobró ni se cambió `usd()`. |
| 12 | Guardando | `EsperaPago` | No verificado | Solo aparece mientras corre un pago. | No se disparó. |
| 13 | Protegido | No hay ruta aparte | No verificado | El estado `en_curso` es la pantalla 16. | No se puso el rótulo de ilustración encima del alquiler en curso, para no mezclarlo con 16. |
| 14 | Checklist | `Fotos` | No verificado | Hace falta un alquiler en `fotos_entrada`. | No se inventaron espacios. |
| 15 | Foto | `TomarFoto` | No verificado | La cámara no se abrió. | La foto del PNG no es un archivo del alquiler. |
| 16 | En curso | `#/alquiler/a1` | Capturado 390, 1280 y 1440 | `16-encurso-*.png`. Título real y «Alquiler en curso». | Fechas y monto de la semilla. Sin escena de hito. |
| 17 | Aviso 5 días | `#/avisos` | No verificado contra ese PNG | La semilla no trae ese aviso. | No se escribió «Quedan 5 días». |
| 18 | Fotos de salida | `Fotos` de salida | No verificado | Hace falta el estado `salida`. | Sin ilustración nueva. |
| 19 | Plazo 7 | `Ventana` | No verificado | Hace falta `ventana_reclamo`. | El texto legal del plazo no se tocó. |
| 20 | Devuelto | `Cerrado` | Código con rótulo, sin captura | `IlustracionPendiente` está en `Cerrado`. | Ningún alquiler de la semilla está cerrado. Importes y «Listo» no se vieron. |
| 21 | Reclamo | Formulario | No verificado | No se envió un reclamo. | Sin fotos inventadas. |
| 22 | Respuesta | Vista del inquilino | No verificado | No se aceptó ni se rechazó. | El botón secundario ya es sólido en el CSS común. |
| 23 | Mediación | `Mediacion` y `MediacionPC` | Código con rótulo, sin captura | El rótulo está en las dos variantes. | No hay un alquiler en mediación. El costo y los textos legales no se reescribieron. |
| 24 | Perfil | `#/perfil` | Capturado 390 y 1440 | `24-perfil-*.png`. A 1440 la identidad queda a la izquierda y los datos a la derecha. | No hay cédula, cuenta de pago ni «Editar perfil». El nombre y el rol salen de la sesión y de los alquileres. «Mi Llave» solo con `VITE_REPUTACION=1`. |
| 25 | Puntaje | `#/perfil/dueno` con el flag | No verificado | El dev lo tiene apagado. El rótulo está en `MiPerfil`. | El anillo de puntaje sigue siendo el dato, no una ilustración nueva. No se encendió el flag para la captura. |
| 26 | Avisos | `#/avisos` | Capturado 390 y 1440 | `26-avisos-*.png`. | La lista está vacía. No se copiaron «Firmas listas» ni «Hace 7 meses». |
| 27 | Ayuda | `#/ayuda` | Capturado 390 y 1440 | `27-ayuda-*.png`. Cuatro temas reales. A 1440 las preguntas van en dos columnas. | Las respuestas siguen siendo textos ya publicados. Pendiente de revisión legal antes de producción. |
| 28 | Términos | `/terminos` | No verificado con captura | El CSS limita la columna a 720 px desde 960. | El cuerpo legal no se reescribió. |
| 29 | Vacío | `#/` sin alquileres | Capturado 390 y 1440 | `29-vacio-*.png`. Rótulo «Ilustración pendiente de aprobación» y «Nuevo alquiler». | Se vació `localStorage` solo en esa captura. Siguen la nota de demo y Reiniciar. |
| 30 | Error | `#/alquiler/no-existe` | Capturado 390 y 1440 | `30-error-*.png`. | Es «no encontrado», con el botón real de volver. No se forzó un error de red. |
| 31 | Cargando | `Entrando` | No verificado | Dura lo que tarda el regreso de Google o Apple. | No se congeló ni se agregó una animación. |
| 32 | Recorrido, foco en «+» | Primer paso del recorrido | Capturado 1440 | `32-recorrido-1440.png`. El globo queda debajo del «+» y no lo tapa (`solapa: false`). | El velo oscurece el resto, incluido un borde de la tarjeta compacta. Textos del recorrido intactos. |
| 33 | Recorrido sobre la tarjeta | No hay ese paso | No verificado | El recorrido aprobado tiene 6 pasos y el primero apunta al «+». | No se inventó un paso que enfoque la tarjeta principal. |

Cromo de `0f90950` se mantiene: barra abajo a 390 y en el encabezado desde 960.

`npm test` después de este bloque: 1551 pasaron, 1 omitida, 182 archivos. `npm run build` compiló. El `dist` local no contiene `cav_`.

Sigue sin comprobar: interiores 09–15 y 17–23 con un alquiler en ese estado, 05, 06 como pantalla, 07 con token, 13, 25 con el flag, 28 en captura, 31 y 33. Alertas 34–36 no entraron en este bloque.
