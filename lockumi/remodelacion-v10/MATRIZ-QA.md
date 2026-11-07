# Matriz QA — diseño estático v10

Capturas en el navegador local (`npm run preview`, sin `VITE_CAVOS_APP_ID`). No hubo pagos, correos ni identidad reales. Donde el estado no está en la semilla de la demo, el alquiler se armó solo en ese navegador con la forma de `Alquiler` y la leyenda «Ejemplo de captura». No se guardó en el repositorio.

Las pruebas de `npm test` no son esta matriz. El baseline de la base `cef6c70` fue 1538 pasadas y 1 omitida. Después de estas correcciones visuales el conteo es el mismo; eso no certifica el diseño.

## Cómo probar sin red real

En esta rama, sin definir `VITE_CAVOS_APP_ID`:

```
npm ci && npm run dev
```

La franja amarilla dice que es demo y que no hay dinero real. «Entrar» abre la hoja. «Continuar con tu correo» no envía correo: el proveedor simulado acepta cualquier código de 6 dígitos. Google y Apple, en ese modo, tampoco salen a la red. No uses una dirección de correo real.

La URL de Vercel de la rama responde 302 a SSO de Vercel (`vercel.com/sso-api`). No es una página pública. Quien tenga acceso al equipo puede abrirla; desde aquí no se desactivó esa protección.

## Alertas 34–36

Hoy el aviso es un toast (`Aviso.tsx`): no es un diálogo, no quita el foco, se cierra al tocarlo, se esconde solo (5 s, u 8 s si trae acción; el error no) y, si trae acción, el botón ejecuta la que ya existía (ir al paso). No se agregó «Continuar» ni «Cancelar» vacíos.

Solo presentación, ya en el CSS: tarjeta blanca, botón de la acción relleno, paso en lavanda `#6B5E8A`, error en coral `#C45C5C`, logro en sage. Sin contorno.

Requiere aprobación funcional, y no se hizo: velo que bloquee la pantalla, `role="dialog"`, foco atrapado, pareja Continuar/Cancelar como en las muestras, o apagar el cierre automático. Las muestras 34–36 enseñan el aspecto, no un flujo nuevo.

## Equivalencia de la bienvenida

El mock 01 tiene «Empezar» y el enlace «Ya tengo cuenta». La app no tiene ese enlace. El botón real sigue diciendo «Entrar» y abre la misma hoja para cuenta nueva o existente. No se inventó un segundo botón.

## Matriz

| Mock | Captura | Estado | Diferencias que siguen | Motivo |
|---|---|---|---|---|
| 01 bienvenida | `v10-qa/01-bienvenida-390.png`, `01-bienvenida-1280.png` | Corregido en lo visual | Siguen las casillas legales, los tres beneficios y el texto real. No hay tarjetas Dueño/Inquilino ni «Ya tengo cuenta». El título no es «Tu depósito, protegido». | Esas tarjetas y ese enlace no existen. El copy legal se conserva. La escena es el PNG aprobado, quieto. |
| 02 login | `02-entrar-390.png`, `02-codigo-390.png` | Hoja real, no la pantalla de seis casillas del mock | Google, Apple y correo en botones menta sin contorno. El código simulado es un solo campo, no seis cajas. «Reenviar código» sigue subrayado. | Partir el código en seis cajas cambia el control, no solo el color. No se hizo. |
| 03 inicio | `03-inicio-390.png`, `03-inicio-1280.png` | Semilla de la demo (Escazú en curso, Heredia en firmas) | No hay barra inferior ni campana. La tarjeta no dice «Paso 3 de 8» ni «USD 800» como en el mock: el monto sale de los datos («800,00 USDC de prueba» / «600,00»). Hay bloque «cómo funciona» y «¿Primera vez?». | Barra y campana son perfil/avisos/ayuda, sin implementar. El paso 8 vive en el detalle, no como dato inventado en la tarjeta. |
| 04 crear | `04-crear-390.png`, `04-crear-1280.png` | Formulario real | Sin el hero terracota. Reglas en menta. El depósito empieza en 0, no en 800. | 800 es ejemplo del mock. |
| 05 fechas | `05-calendario-390.png` | Hoja del calendario al tocar Entrada | El mock es un resumen de fechas ya elegidas. Aquí se abre el calendario vacío. | No se precargaron fechas de ejemplo. |
| 06 reglas | Dentro de `04-crear-390.png` | La lista de reglas está en el mismo formulario | No es una pantalla aparte. | El producto no tiene esa ruta. |
| 07 aceptar | Sin captura | La ruta `#/i/:id/:token` existe (`Invitacion.tsx`) | No se generó un enlace. | Hace falta un token de invitación. No se fabricó uno para la foto. |
| 08 firmas | `08-firmas-390.png`, `08-firmas-1280.png` | Semilla `a2`, Casa ejemplo · Heredia | Muestra el contrato y «Paso 2 de 8». No es la invitación con ilustración. | La ilustración de invitación no está aprobada como asset suelto. |
| 09 contrato | Dentro de `08-firmas-390.png` | Contrato compacto en la misma pantalla | El documento completo se abre con «Ver contrato». | No es una ruta distinta. |
| 10 firmar | Mismo flujo que 08 | El botón de firmar está en esa pantalla | La captura muestra el inicio del paso, no el instante posterior a firmar. | Firmar sí es local en la demo; no se avanzó el estado para no mezclar la semilla con la captura. |
| 11 depósito | `11-pago-390.png`, `11-pago-1280.png` | Ejemplo de captura, estado `pendiente_pago`, visto como dueño | El dueño ve la espera. El botón «Pagar» es del inquilino. Badge «Pago simulado». Monto del ejemplo, 800 USDC de prueba, no una comisión de 12. | No se cambió de rol en esa foto. Pagar en esta demo no cobra. |
| 12 pagando | Sin captura estable | `EsperaPago` existe | Solo se ve mientras `pagar()` corre. | No se disparó el pago para la foto. |
| 13 protegido | Sin ilustración de hito | El estado `en_curso` es `16-encurso-*.png` | El mock trae una escena de hito. | Esa escena no está aprobada. No se inventó otra casa. |
| 14 fotos entrada | `14-fotos-390.png`, `14-fotos-1280.png` | Ejemplo `fotos_entrada` | Checklist y cámara reales, más abajo de lo que entra en la foto. Sin la ilustración del mock. | La ilustración de hito no se sustituyó. |
| 15 comparar fotos | Sin pantalla propia | Las fotos viven en el acta | El mock es una comparación lado a lado que el flujo simple no tiene como vista. | No se agregó una vista nueva. |
| 16 en curso | `16-encurso-390.png`, `16-encurso-1280.png` | Semilla `a1` | Textos reales del turno. Sin escena de hito. | Asset de hito no aprobado. |
| 17 activo / rendimiento | Dentro de 16 | El rendimiento sigue «próximamente» donde ya estaba | El mock puede mostrar un rendimiento. | No se afirma un rendimiento. |
| 18 salida | `18-salida-390.png` | Ejemplo `salida` | Misma pieza de fotos, ahora de salida. | Sin ilustración nueva. |
| 19 plazo 7 días | `19-plazo-390.png` | Ejemplo `ventana_reclamo` | Contador y «Reclamar un daño» reales. El secundario es menta, sin contorno. | El mock dibuja otra jerarquía; el texto legal del plazo no se tocó. |
| 20 devuelto | `20-cerrado-390.png`, `20-cerrado-1280.png` | Ejemplo `cerrado`, vía acuerdo | Chip «Terminado» y «Depósito devuelto». Se quitó el hero terracota. No hay casa nueva. | La ilustración de hito queda pendiente de un asset aprobado. |
| 21 reclamo | `21-reclamo-390.png` | Formulario al tocar «Reclamar un daño» en el ejemplo | Campos reales. «Cancelar» menta, «Enviar reclamo» sage. | No se envió el reclamo. |
| 22 respuesta | `22-respuesta-390.png` | Ejemplo `reclamo`, visto como inquilino | «Aceptar reclamo» y «No estoy de acuerdo». Motivo marcado como ejemplo de captura. | No se aceptó ni se rechazó. |
| 23 mediación | `23-mediacion-390.png` | Ejemplo `mediacion` | Texto legal existente. Enlace «Demo: registrar el acuerdo». | No se registró un acuerdo. |
| 24 perfil | Sin captura | No hay ruta | Plan abajo. No implementado. | Esperando revisión de Katherine. |
| 25 puntaje | Sin captura | Solo con `VITE_REPUTACION=1` | Este build lo tiene apagado. Sigue la paleta anterior de ese módulo. | No se enciende el flag ni se inventa un puntaje. |
| 26 avisos | Sin captura | No hay centro de avisos | Los toasts y los avisos del plazo dentro del alquiler siguen. | Plan abajo. No implementado. |
| 27 ayuda | Sin captura de FAQ | El recorrido sí existe (`33-recorrido-*.png`) | No hay lista de preguntas. | Plan abajo. No implementado. |
| 28 términos | `28-terminos-390.png`, `28b-privacidad-390.png` | Textos legales vigentes | Cabecera 2D. El cuerpo legal no se reescribió. | El mock es un extracto visual. |
| 29 vacío | `29-vacio-390.png`, `29-vacio-1280.png` | Lista vacía solo en el navegador de la captura | Texto real «Todavía no hay alquileres» y la escena aprobada. Sigue el bloque «cómo funciona». | No se borró la semilla del repositorio. |
| 30 error | `30-no-encontrado-390.png` | `#/alquiler/no-existe` | Tarjeta «No encontramos ese alquiler». No es el error de red del mock 30. | El error de red aparece cuando falla una llamada. No se forzó. |
| 31 cargando | Sin captura estable | `Entrando` («Entrando a tu cuenta…») con la misma escena de bienvenida | Dura lo que tarda el proveedor simulado. | No se dejó un temporizador artificial. |
| 32 recorrido | `32-ejemplo-390.png`, `33-recorrido-390.png` | Recorrido real de 6 pasos | El globo usa sage y «Saltar» menta, sin contorno. | No se creó un tour nuevo. |
| 33 saltar | `33-recorrido-390.png`, `33-recorrido-1280.png` | El botón Saltar cierra el recorrido | Sigue siendo el driver.js ya existente. | — |
| 34 éxito | Sin foto de un toast en vivo | Presentación descrita arriba | No es un modal bloqueante. | Hacerlo modal cambia la semántica. |
| 35 aviso | Igual | El paso usaría el botón lavanda si el aviso trae acción | No hay «Cancelar» en el toast. | Agregarlo sería un callback nuevo. |
| 36 error | Igual | El botón de acción de un error iría en coral | El error no se esconde solo. | Igual que 34. |

## Correcciones de este bloque

- Bienvenida: la palabra Lockumi pasa a Plus Jakarta. La escena aprobada se mantiene.
- Google, Apple y correo: relleno menta, sin contorno.
- Restos terracota de reglas, focos, firmas y avisos de campo pasan a menta, sage o al color de estado.
- Firmante: la escena anterior se reemplazó por el PNG aprobado de bienvenida (misma entrada a la cuenta).
- Alquiler cerrado: se quitó el hero terracota. No se puso otra ilustración.
- Lista vacía: el PNG aprobado, junto al texto que ya existía.

## Pendiente que no se adivinó

- Hitos 13, 15, 17 y la ilustración de 20: no hay asset aprobado suelto. No se dibujó una casa.
- Seis casillas de código, modal bloqueante y barra inferior: cambian comportamiento o son las tres pantallas nuevas.
- Invitación 07: falta un token real de la demo para fotografiarla sin inventarlo.
