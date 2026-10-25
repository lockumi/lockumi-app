# Recorrido guiado

Estado: **publicado el 24 oct 2026** en app.lockumi.com (rama `ux-guiada` unida a `master` con merge `--no-ff` en `1ab36ae` (master anterior `76373f8`); deploy de producción `dpl_EkFHfSn82SwL2JGvD7GmwXUGo38K`).

## Qué es

Un recorrido de 6 pasos hecho con [driver.js](https://driverjs.com) 1.x que explica Lockumi sobre las pantallas reales. Los textos son los de la maqueta `diseno/envio/recorrido-formulario/textos.md`, sin cambios.

| Paso | Pantalla | Qué resalta |
|---|---|---|
| 1 | Inicio | «+ Nuevo alquiler» |
| 2 | Nuevo alquiler | Datos del alquiler (lugar) |
| 3 | Nuevo alquiler | Reglas |
| 4 | Alquiler de ejemplo (fotos de entrada) | «Tomar foto» |
| 5 | Alquiler de ejemplo (pendiente de pago) | «Firmas y depósito» |
| 6 | Alquiler de ejemplo (7 días para reclamos) | «Los pasos» (en el teléfono, su título); mediación como simulación |

## Cuándo se abre

- **Solo, la primera vez** que una cuenta entra a Inicio en ese navegador (a los 0,7 s). Al terminar («¡Listo!»), al tocar «Saltar» o con Esc, queda como visto.
- **Cuando quieras**: botón «¿Cómo funciona?» del encabezado (en el teléfono, solo el «?», con su nombre accesible) y botón «Ver el recorrido» de la tarjeta «¿Primera vez?» en Inicio.

«Visto» se guarda en `localStorage` como `lockumi.recorrido.v1.<huella>`, donde la huella son 16 caracteres hex del SHA-256 del correo en minúsculas. El correo no se guarda en la clave.

## Alquiler de ejemplo

Los pasos 4 a 6 abren `#/ejemplo`: un alquiler inventado («Apartamento en Barreal de Heredia», 3 USDC de prueba) que se muestra con la pantalla de detalle, de solo lectura (`inert`) y con la cinta «Alquiler de ejemplo · solo para ver». No llama al servidor ni a la red, no muestra avisos y no aparece en «Tus alquileres». Al cerrar el recorrido vuelves a la pantalla donde estabas.

## Accesibilidad

- El globo es un `dialog` con `aria-modal`, título y descripción enlazados.
- El foco va a «Siguiente»; Tab se queda dentro del globo; Esc lo cierra y el foco vuelve al botón que lo abrió.
- Botones de 44 px como mínimo. «Paso N de 6» y 6 puntos de avance.
- Con «reducir movimiento» no hay desplazamiento suave ni animación (solo un fundido de 120 ms).
- El globo no tapa el elemento resaltado ni los botones principales (lo revisa el script de navegador).

## Pruebas

- Unitarias: `src/__tests__/recorrido.test.tsx` (textos exactos, rutas, clave, botones, accesibilidad, CSS sin colores nuevos).
- Navegador: `scripts/recorrido/capturar.mjs` contra `vite preview` (390 px, 1280 px y movimiento reducido).

## Columna del detalle reordenada (24 oct 2026, rama `contrato-compacto`)

Con el [contrato compacto](contrato-compacto.md), la columna derecha del detalle queda: Contrato (tarjeta corta), Comprobantes, **Los pasos** y Detalles, fija a 48 px y con desplazamiento propio. El paso 6 sigue resaltando «Los pasos» (`[data-recorrido="pasos"]`; en el teléfono su título). `scripts/recorrido/capturar.mjs` revisa además que el elemento resaltado se vea entero en cada paso. Resultado: todo bien en 390 y 1280 px y con movimiento reducido. En el teléfono la barra del contrato queda arriba del detalle, dentro del alquiler de ejemplo de solo lectura (`inert`).

## Falta

- La maqueta también pone el recorrido en el menú de la cuenta (avatar). La app todavía no tiene ese menú; por ahora están el botón del encabezado y la tarjeta de Inicio.
