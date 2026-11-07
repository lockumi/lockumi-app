# Matriz 33/33 — bloque Inicio (06/11/2026, noche CR)

Este bloque rehízo la estructura de Inicio (`03`) y el cromo de navegación (barra abajo en móvil, en el encabezado desde 960 px). No declara el resto de pantallas. Las capturas son del demo local `npm run dev` en `127.0.0.1:4174`, sin `VITE_CAVOS_APP_ID`, sesión `katherine@ejemplo.cr`, código simulado. No hay dinero ni personas reales. El bundle de preview y el de Vercel no se usaron para afirmar que el dibujo coincide.

La semilla no es el dibujo. Con ese correo, `ordenarInicio` deja grande el alquiler donde `turno` pide una acción (`a2`, firmas, paso 2) y compacto el que ya está en curso (`a1`). Los dos roles salen de `rolDe` (Dueño). Los montos salen de `usd()`.

| # | Referencia | Ruta | Estado | Evidencia de este bloque | Diferencia que queda |
|---|---|---|---|---|---|
| 01 | `01-bienvenida.png` | `Login` | No verificado | Sin captura nueva | Siguen las casillas y «Entrar». No se recompuso la escena. |
| 02 | `02-login.png` | Hoja de `Login` | No verificado | Sin captura nueva | El código sigue en un solo campo. No se midió el formulario a 680 px. |
| 03 | `03-inicio.png` / `03-inicio-desktop.png` | `#/` `Inicio` | Implementado y capturado | `inicio-390.png`, `inicio-1280.png`, `inicio-1440.png`. Medición a 960 px sin solapes (sin captura). «Continuar paso 2» abre `#/alquiler/a2`; la compacta abre `#/alquiler/a1`. | No es el dibujo: grande es Heredia, paso 2, Firmas, USD 600,00, Dueño; compacta es Escazú, USD 800,00 · Alquiler en curso, Dueño. Fechas de la semilla (1 dic 2026 → 31 may 2027). El botón no va pegado a la barra: debajo quedan la nota de demo, Reiniciar y el pie legal. El encabezado móvil también tiene «¿Cómo funciona?» y Salir. |
| 04 | `04-crear.png` | `#/crear` | No verificado | Sin captura nueva | El formulario real no se reacomodó a dos columnas. |
| 05 | `05-creando.png` | No hay esa espera | No verificado | Sin captura nueva | Crear guarda y sigue. No se inventó una pausa. |
| 06 | `06-invitar.png` | Sección de `Crear` | No verificado | Sin captura nueva | No es una ruta aparte. |
| 07 | `07-aceptar.png` | `#/invitacion/:id/:token` | No verificado | Sin captura nueva | Hace falta un token real. El rótulo «Ilustración pendiente de aprobación» no está puesto. |
| 08 | `08-pasos.png` | `Detalle` / línea de tiempo | No verificado | Sin captura nueva | La vista que abre Continuar sigue con su composición anterior. |
| 09 | `09-contrato.png` | Contrato dentro de `Detalle` | No verificado | Sin captura nueva | No se partió en dos columnas. |
| 10 | `10-firmas.png` | Firmas en `Detalle` | No verificado | Sin captura nueva | No se recompuso la tarjeta de lectura. |
| 11 | `11-pagar.png` | Pago en `Detalle` | No verificado | Sin captura nueva | En la demo no se cobra. Montos siguen en `usd()`. |
| 12 | `12-guardando.png` | `EsperaPago` | No verificado | Sin captura nueva | Solo aparece mientras corre un pago. No se disparó. |
| 13 | `13-protegido.png` | Estado `en_curso` | No verificado | Sin captura nueva | El rótulo «Ilustración pendiente de aprobación» no está puesto. |
| 14 | `14-checklist.png` | `Fotos` / `Acta` | No verificado | Sin captura nueva | Sin pasada visual. |
| 15 | `15-foto.png` | `TomarFoto` | No verificado | Sin captura nueva | La foto del PNG no es un archivo del alquiler. |
| 16 | `16-encurso.png` | `EnCurso` | No verificado | Sin captura nueva | Sin pasada visual. |
| 17 | `17-aviso5.png` | `#/avisos` y `AvisoSalida` | No verificado | Sin captura nueva | La semilla no trae «Quedan 5 días». No se inventó. |
| 18 | `18-fotosalida.png` | `Fotos` de salida | No verificado | Sin captura nueva | Sin pasada visual. |
| 19 | `19-plazo7.png` | `Ventana` | No verificado | Sin captura nueva | El texto legal del plazo no se tocó. |
| 20 | `20-devuelto.png` | Estado `cerrado` | No verificado | Sin captura nueva | El rótulo «Ilustración pendiente de aprobación» no está puesto. |
| 21 | `21-reclamo.png` | Formulario de reclamo | No verificado | Sin captura nueva | No se envió un reclamo. |
| 22 | `22-respuesta.png` | Vista del inquilino | No verificado | Sin captura nueva | No se aceptó ni se rechazó. |
| 23 | `23-mediacion.png` | `MediacionPC` | No verificado | Sin captura nueva | El rótulo «Ilustración pendiente de aprobación» no está puesto. |
| 24 | `24-perfil.png` | `#/perfil` | Implementación previa, sin captura nueva | La ruta respondió «katherine» y el correo de la sesión en un recorrido de regresión, sin comparar el PNG. | No está en dos columnas. No hay cédula, cuenta ni «Editar perfil». |
| 25 | `25-puntaje.png` | Solo con `VITE_REPUTACION=1` | No verificado | Este dev lo tiene apagado. | El rótulo «Ilustración pendiente de aprobación» no está puesto. La fila no se dibuja. |
| 26 | `26-notif.png` | `#/avisos` | Implementación previa, sin captura nueva | La ruta respondió «Avisos». No se comparó el PNG. | Lista real de `Alquiler.avisos`. Vacía si no hay. No se copiaron «Firmas listas» ni «Hace 7 meses». |
| 27 | `27-ayuda.png` | `#/ayuda` | Implementación previa, sin captura nueva | La ruta respondió y el botón «Ver el recorrido» sigue. No se comparó el PNG. | Textos ya publicados. Pendiente de revisión legal antes de producción. |
| 28 | `28-terminos.png` | `/terminos` y `/privacidad` | No verificado | Sin captura nueva | El cuerpo legal publicado no se reescribió. |
| 29 | `29-vacio.png` | `Inicio` sin alquileres | No verificado | Sin captura nueva | El rótulo «Ilustración pendiente de aprobación» no está puesto. Sigue la escena de bienvenida ya usada en el vacío. |
| 30 | `30-error.png` | `#/alquiler/no-existe` | No verificado | Sin captura nueva | Es «no encontrado». No se forzó un error de red. |
| 31 | `31-cargando.png` | `Entrando` | No verificado | Sin captura nueva | Dura lo que tarda el acceso simulado. No se congeló. |
| 32 | `32-recorrido-paso1.png` | Recorrido, foco en «+» | No verificado | `data-recorrido="nuevo"` sigue en el «+». Sin captura del globo. | El globo no se reancló al Inicio nuevo. |
| 33 | `33-recorrido-saltar.png` | El mismo recorrido | No verificado | Sin captura del globo sobre la tarjeta. | No se comprobó que el globo deje libre la tarjeta principal. |

Cromo compartido, comprobado solo en Inicio: a 390 px la barra inferior está visible y la del encabezado no; desde 960 px es al revés. En 390, 960, 1280 y 1440 el encabezado no se solapa con la campana, la ayuda, el avatar ni Salir, y «Continuar» no tapa la barra. El encabezado queda fijo al desplazar el cuerpo.

El build local de producción (`vite preview` en `127.0.0.1:4173`, `VITE_PRUEBA_COMPLETA=1`, sin `cav_` en `dist`) también muestra Inicio: aviso «Red de prueba: sin dinero real, depósito simulado», monto «600,00 USDC de prueba» y el mismo paso 2. Capturas `inicio-prev-390.png` y `inicio-prev-1440.png`. «Continuar» queda entero. En 390 el aviso amarillo deja «Reiniciar demo» unos 14 px por debajo del pliegue; se ve completo al desplazar, y la barra no lo cubre al llegar al final. Ese build no es el de Vercel: el remoto puede tener otras variables y no se abrió.

No comprobado en este bloque: alertas 34–36, hitos 07/13/20/23/25/29, interiores 01–02 y 04–33, y cualquier URL de Vercel.
