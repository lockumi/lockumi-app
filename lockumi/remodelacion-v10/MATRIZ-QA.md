# Matriz QA — nombres reales de los PNG

La cobertura por archivo está en `COBERTURA-MOCK-COMPONENTES.md`. Esta nota corrige la matriz anterior, que llamó «fechas» a `05-creando.png` y «rendimiento» a `17-aviso5.png`.

Capturas locales anteriores, en `/opt/cursor/artifacts/v10-qa/`, siguen sirviendo para las pantallas cuyo nombre sí coincidía (bienvenida, entrar, inicio, crear, firmas, pago, fotos, en curso, salida, plazo, cerrado, reclamo, respuesta, mediación, términos, vacío, no encontrado, recorrido). No uses `05-calendario-390.png` como prueba de `05-creando.png`: esa foto es el calendario al tocar Entrada, no la espera «Creando…».

## Cómo probar sin red real

Sin `VITE_CAVOS_APP_ID`:

```
npm ci && npm run dev
```

La franja amarilla dice que es demo. «Entrar» abre la hoja. «Continuar con tu correo» no envía correo: cualquier código de 6 dígitos entra. Google y Apple, en ese modo, no salen a la red. No uses un correo real.

Rutas nuevas, con la sesión de esa demo: `#/perfil`, `#/avisos`, `#/ayuda`. La campana y la barra inferior llevan ahí. El correo, «¿Cómo funciona?» y «Salir» siguen en la cabecera.

## `05-creando.png`

El PNG es una espera a pantalla completa: «Creando…» y «Preparando tu alquiler…». La app guarda el alquiler y muestra el aviso compacto de creado. No hay pantalla intermedia. No se agregó un temporizador para imitar el PNG.

## `17-aviso5.png`

El archivo se llama aviso de 5 días. `resumen.md` lo titula «Aviso de 5 días». El PNG muestra la lista de avisos con una tarjeta beige «Quedan 5 días / Prepara las fotos de salida» y otra «Depósito protegido». Esos dos textos son del dibujo.

En la app, el aviso de 5 días que ya existe es `reparacion-5`, con el asunto «Tu alquiler termina pronto: repara lo que haga falta». `#/avisos` lo lista si el alquiler de esta persona ya lo tiene, y lo marca abierto con `abrirAviso`. La semilla de la demo no trae avisos: la pantalla dice «Todavía no hay avisos.» No se copiaron las frases del PNG.

## Alertas `34` a `36`

Siguen siendo toasts. No son diálogos, no quitan el foco y no ganan un «Cancelar» vacío. El de paso puede llevar el botón de la acción que ya existía. El de error no se esconde solo. Comprobarlos en vivo es entrar (aviso de ingreso) o crear un alquiler de ejemplo (aviso de creado). No hay un interruptor público para dispararlos.

## Bienvenida

`01-bienvenida.png` tiene «Empezar» y «Ya tengo cuenta». La app no tiene ese enlace. El botón sigue diciendo «Entrar».

## Pruebas

El baseline de `cef6c70` fue 1538 pasadas y 1 omitida. Las pruebas nuevas de perfil, avisos, ayuda y navegación se suman a esa suite. Que la suite pase no certifica el diseño ni estas pantallas.
