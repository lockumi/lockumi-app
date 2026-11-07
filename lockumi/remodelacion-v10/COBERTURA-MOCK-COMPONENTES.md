# Cobertura por nombre de archivo

Los nombres salen de `pantallas/`. La tabla de `resumen.md` usa el mismo archivo. La matriz anterior se corrige aquí: `05-creando.png` no es el calendario, y `17-aviso5.png` no es una pantalla de rendimiento.

| Archivo | Qué muestra el PNG | Dónde está en la app | Diferencia que sigue |
|---|---|---|---|
| `01-bienvenida.png` | Bienvenida | `Login` | Siguen las casillas y los beneficios reales. El botón dice «Entrar». No hay «Ya tengo cuenta». |
| `02-login.png` | Entrar con correo | Hoja de `Login` | El código simulado es un solo campo. |
| `03-inicio.png` | Inicio con barra | `Inicio` + `Navegacion` | La barra ya lleva a Inicio, Avisos, Ayuda y Perfil. El monto sale de los datos, no del 800 del dibujo. |
| `04-crear.png` | Crear alquiler | `Crear` | El depósito empieza en 0. |
| `05-creando.png` | «Creando…» / «Preparando tu alquiler…» | No hay esa espera | Crear guarda y sigue. No se agregó una pausa artificial. |
| `06-invitar.png` | Invitar | Sección de `Crear` | No es una ruta aparte. |
| `07-aceptar.png` | Aceptar invitación | `Invitacion` | Hace falta un token de `#/invitacion/:id/:token`. No se fabricó. |
| `08-pasos.png` | Pasos con avance | `Detalle` / `LineaTiempo` | La semilla `a2` muestra el paso de firmas. |
| `09-contrato.png` | Contrato visual | `ContratoCompacto` / `ContratoDoc` | Se abre desde el detalle. |
| `10-firmas.png` | Firmas de ambos | Firmas en `Detalle` | La captura de firmas no avanza la semilla. |
| `11-pagar.png` | Pagar depósito | Pago en `Detalle` | En la demo no se cobra. |
| `12-guardando.png` | Guardando | `EsperaPago` | Solo se ve mientras corre el pago. No se disparó. |
| `13-protegido.png` | Depósito protegido, con escena | Estado `en_curso` | La escena de hito no está aprobada como asset. No se dibujó otra casa. |
| `14-checklist.png` | Checklist de entrada | `Fotos` + `Acta` | Sin la ilustración del mock. |
| `15-foto.png` | Subir foto | `TomarFoto` | La foto del mock es un recurso de diseño, no del alquiler. |
| `16-encurso.png` | En curso | `EnCurso` | Sin escena de hito. |
| `17-aviso5.png` | Aviso de 5 días | `#/avisos` y, con la prueba completa, `AvisoSalida` | El PNG dice «Quedan 5 días» y «Depósito protegido». Esos textos no se inventan. Si el alquiler ya tiene el aviso `reparacion-5`, se muestra su asunto real. La semilla no trae ese aviso. |
| `18-fotosalida.png` | Fotos de salida | `Fotos` cual salida | Sin ilustración nueva. |
| `19-plazo7.png` | Plazo de 7 días | `Ventana` | El texto del plazo no se reescribió. |
| `20-devuelto.png` | Devolución | Estado `cerrado` | Se quitó el hero terracota. La escena de hito sigue sin asset aprobado. |
| `21-reclamo.png` | Reclamo con pruebas | Formulario de reclamo | No se envió. |
| `22-respuesta.png` | Responder | Vista del inquilino | No se aceptó ni se rechazó. |
| `23-mediacion.png` | Mediación | `MediacionPC` | No se registró un acuerdo. La escena de hito no se sustituyó. |
| `24-perfil.png` | Perfil | `#/perfil` | Muestra la sesión y los roles reales. No hay cédula, cuenta de pago ni «Editar perfil». |
| `25-puntaje.png` | Llave Lockumi | Solo con `VITE_REPUTACION=1` | Este build lo tiene apagado. Desde perfil, esa fila no se dibuja. |
| `26-notif.png` | Notificaciones | `#/avisos` | Lista vacía si no hay avisos guardados. No se copian «Firmas listas» ni «Hace 7 meses». |
| `27-ayuda.png` | Ayuda | `#/ayuda` | Preguntas con textos ya publicados. El conjunto queda pendiente de revisión legal antes de producción. |
| `28-terminos.png` | Términos | `/terminos` y `/privacidad` | El cuerpo legal no se reescribió. |
| `29-vacio.png` | Vacío | Lista sin alquileres | Texto real y la escena aprobada de bienvenida. |
| `30-error.png` | Error | `#/alquiler/no-existe` | Es «no encontrado». El error de red no se forzó. |
| `31-cargando.png` | Cargando | `Entrando` | Dura lo que tarda el acceso simulado. |
| `32-recorrido-paso1.png` | Primer paso del recorrido | Recorrido real | Globo sage y «Saltar» menta. |
| `33-recorrido-saltar.png` | Saltar | El mismo recorrido | El botón cierra el recorrido. |
| `34-alerta-exito.png` | Aviso compacto de éxito | Toast `logro` | No es un diálogo. El botón, si existe, es la acción que ya tenía el aviso. |
| `35-alerta-aviso.png` | Aviso compacto con dos botones | Toast `paso` | No se agregó «Cancelar». |
| `36-alerta-error.png` | Aviso compacto de error | Toast `error` | No se esconde solo. No se cambió a un modal. |
