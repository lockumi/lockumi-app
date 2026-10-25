# Prueba completa (Términos 1.7-demo) · cómo está armada

Se publica por bloques (PR 2 a 10). Hasta el PR 10, todo lo visible queda detrás del **interruptor apagado**
`VITE_PRUEBA_COMPLETA` (variable de compilación; en producción no está puesta, así que app.lockumi.com sigue igual y con 1.6-demo).
El PR 10 enciende el interruptor junto con los Términos y la Privacidad 1.7-demo y la pantalla para volver a aceptar.

## Bloques
| PR | Qué agrega | Visible en producción |
|---|---|---|
| 2 | Plazos con feriados de Costa Rica (`api/_lib/plazos.ts`), precios de referencia (`api/_lib/precios.ts`), textos de avisos (`api/_lib/avisos.ts`), propuesta automática simulada (`src/prueba/propuesta.ts`) y cálculo de avisos debidos (`src/prueba/avisos.ts`) | No (solo funciones y tipos) |
| 3 | Interruptor `src/prueba/interruptor.ts` (`pruebaCompleta()`); pantalla B.1 «Regla de propuesta automática (opcional)» antes de que el inquilino firme el contrato (`src/prueba/Regla.tsx`), con registro `a.regla` {cuenta, alquiler, versión, sí/no, fecha ISO}; Anexo 6-A (B.5) al crear el alquiler (`src/prueba/Anexo.tsx`): listas A, B con casillas (y «otra que escriban las partes») y C; «Crear» inactivo hasta marcar «Leímos y aceptamos el Anexo 6-A.»; registro `a.anexo` | No (interruptor apagado) |
| 4 | Flujo del dueño: al confirmar las fotos de salida queda registrada la **entrega** (`a.entrega`) y el plazo no corre; «Recibí la casa» (`a.recibido`) o inicio automático 2 días después; 7 días naturales con domingo/feriado → siguiente día hábil; avisos en la app días 1/4/6 con entrega y apertura (`src/prueba/AvisosApp.tsx`); contador B.9; «Todo bien, devolver» con la confirmación B.4 (`acciones.devolverTodo`); devolución automática al vencer; simulador de días (`src/prueba/PlazoDueno.tsx`, `src/prueba/dueno.ts`, `src/prueba/sincronizar.ts`) | No (interruptor apagado) |

## Plazos
- **Días naturales** (7 días del dueño y 7 del inquilino): cuentan todos los días. Si el día 7 cae **domingo o feriado** de Costa Rica, el plazo pasa al **siguiente día hábil** a la misma hora.
- **Días hábiles** (3 días de la Mediación Lockumi (demo)): lunes a viernes sin feriados de ley.
- Feriados: Código de Trabajo, art. 148 (Ley 10050), y calendario 2026 del MTSS (sin traslados en 2026). Jueves y Viernes Santo se calculan con la fecha de Pascua.
- Costa Rica es UTC-6 todo el año (sin horario de verano).

## Avisos 1, 4 y 6 y el simulador de días
Vercel Hobby solo permite tareas programadas una vez al día, así que **no hay tareas en el servidor**. Los avisos se entregan
**cuando la app está abierta** y llega su hora según el reloj de la demo (hora real + días simulados). Por eso, al adelantar días
con el simulador, salen los avisos de esos días (aprobado). Cada aviso guarda su hora de entrega y la hora de apertura por canal
(en la app y por el enlace del correo).

## Propuesta automática (simulación)
- Por rubro: el menor entre la factura y el precio de referencia + 25 %; con depreciación (hasta 90 %) según años de uso y vida útil simulada.
- Si el inquilino trae una cotización más baja, se usa el punto medio.
- Precios: `precios-referencia.csv` (filas con fuente; «desde» o rango usa el mínimo). Tipo de cambio simulado: 500 colones por USDC de prueba.
- Regla del silencio: solo si el inquilino aceptó la regla, el reclamo es ≤ 30 % del depósito, las pruebas están completas y abrió al menos un aviso del reclamo (en la app, por el enlace del correo o abriendo la pantalla del reclamo).

## Interruptor y cómo probar con él encendido (PR 3)
- `pruebaCompleta()` lee `import.meta.env.VITE_PRUEBA_COMPLETA === '1'`. En producción la variable no está puesta: las pantallas nuevas no se montan.
- Local: `VITE_TRUSTLESS=1 VITE_PRUEBA_COMPLETA=1 npm run build && npx vite preview` (o `npm run dev` con las mismas variables).
- En las pruebas: `vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')`.
- Estilos nuevos en `src/prueba/prueba.css` (botón `boton--pc`: texto café sobre el degradado #FFB08A → #FF6B35; nunca texto blanco sobre naranja).

## Regla de propuesta automática (B.1)
- Sale **solo al inquilino**, una vez, antes de la firma del contrato. La casilla empieza sin marcar y «Continuar» funciona con o sin marcarla.
- Se guarda en el alquiler: `regla = { cuenta, alquiler, version, acepta, fecha }` y una línea en el historial («El inquilino aceptó / no aceptó la Regla…»).

## Anexo 6-A al crear (B.5)
- Debajo del formulario de «Crear». El botón de crear queda inactivo hasta marcar «Leímos y aceptamos el Anexo 6-A.».
- Se guarda `anexo = { acepta: fecha ISO, reparaciones: [...] }` (las reparaciones de uso marcadas en la parte B y la que escriban).

## Flujo del dueño (PR 4)
1. Los dos confirman las fotos de salida → `registrarEntrega`: estado `ventana_reclamo`, `entrega` = fecha y hora, sin `ventanaInicio`.
2. El dueño toca «Recibí la casa» (en la fase 1, «Simular: el dueño recibe la casa») → `ventanaInicio` = ahora. Si no lo toca, `sincronizar` lo pone en `entrega + 2 días` (y el aviso del día 1 lo dice).
3. Fin del plazo: `vencimiento(inicio, 7 días)`; si el día 7 cae domingo o feriado, pasa al siguiente día hábil (misma hora). El contador B.9 lo explica.
4. Avisos: día 1 al empezar; días 4 y 6 contados hacia atrás desde el vencimiento (el 6 es la víspera del último día, así «vence mañana» es cierto también si el plazo se movió). Cada aviso guarda `entregado` (reloj de la demo), `entregadoReal` (reloj del aparato) y la primera apertura (`abierto` en la app, `abiertoCorreo` por el enlace). Se ven en el alquiler («Avisos en la app: días 1, 4 y 6»).
5. «Todo bien, devolver» (en el aviso o en la pantalla) **abre la confirmación** B.4; «Sí, devolver todo» devuelve todo ya (`via: 'devuelto'`). Al vencer sin reclamo se devuelve todo (`via: 'automatico'`).
6. **Simulador de días** (solo red de prueba): «Avanzar 1 día» e «Ir al final del plazo». Adelanta el reloj de la demo del alquiler (`diasSimulados`); los avisos de esos días salen en ese momento. La app los entrega cada 30 s y cada vez que cambia algo, mientras está abierta (`useSincronizarPrueba` en `App.tsx`).
- `useProceso` (botones de red con avance y error) se movió sin cambios a `src/proceso.tsx`.

## Reclamo por rubros, propuesta y silencio (PR 5, paso 9)
1. En el plazo, «Reclamar» abre el **formulario por rubros** (`FormRubros`): rubro de la tabla de precios (u «Otro rubro»), cantidad, motivo de la lista cerrada (6.2), espacio del acta de entrada, descripción, fotos de salida (o una de ejemplo en la demo) y factura opcional. Muestra el cálculo de cada rubro, si faltan pruebas (6.4.1) y el total (nunca más que el depósito).
2. «Enviar reclamo» → `acciones.reclamarRubros`: primero la disputa en la cuenta segura, después `nuevoReclamo` (estado `reclamo`, `entregado` = ahora). El aviso del día 1 sale en ese momento y empieza el plazo de 7 días naturales del inquilino (con domingos y feriados).
3. El inquilino ve el contador B.9, los rubros con fotos de antes y después, y responde **rubro por rubro** (acepta, o no acepta con una factura o cotización opcional de un comercio inscrito). Abrir la pantalla cuenta como apertura (`pantallaAbierta`).
4. Si acepta todo → reparto por lo reclamado (`via: 'acuerdo'`). Si no → **propuesta automática simulada** (B.6, sin inteligencia artificial; con cotización más baja usa el punto medio). Se aplica solo si **los dos** la aceptan; si uno no, pasa a la Mediación Lockumi (demo).
5. **Silencio** (6.5 c): al vencer sin respuesta, si aceptó la regla, las pruebas están completas, el total es ≤ 30 % del depósito y abrió al menos un aviso, se aplica la propuesta (`via: 'propuesta'`, texto B.10 en «Terminado»). Si no, pasa a la mediación. El silencio nunca es aceptación.
6. El simulador de días del reclamo adelanta el reloj de la demo para ver los avisos 4 y 6 y el silencio.

## Aviso de 5 días antes de la salida (B.3) y fecha y hora en las fotos (PR 7, pasos 12 y 13)
1. **B.3 (6.1.1):** con el alquiler en curso, 5 días antes del fin (a las 12:00, hora de Costa Rica) `sincronizar` entrega al inquilino el aviso «reparacion-5». Debajo de «Alquiler en curso» se ve `AvisoSalida`: el texto de la B.3, el enlace «Ver las reglas (Anexo 6-A)», las fotos de entrada de cada espacio para comparar y el registro de entrega y apertura. Antes del aviso, en la red de prueba, «Ir al aviso de 5 días» adelanta el reloj de la demo (no la hora real).
2. **6.4.2:** cada foto muestra «Tomada en la app el …, hora de Costa Rica» (o «Agregada…» si llegó como archivo) y un sello dd/mm/aa hh:mm sobre la foto. Se usa `tomadaEn` (o `fecha`). La app no registra la ubicación.

## Mediación Lockumi (demo) y «Resolver el reclamo (simulación)» (PR 6, paso 10)
1. Al no haber acuerdo (propuesta rechazada o silencio sin la regla), el alquiler queda en `mediacion` y se ve `MediacionPC`.
2. **B.7:** texto, recuadro [SERVICIO REAL] y casilla «Entiendo esto…». «Pedir mediación» guarda `reclamo.mediacion = { estado: 'pedida', fecha }` y muestra el plazo de 3 días hábiles (`sumarHabiles`). Si ya hay 10 casos pedidos en mediación, queda `sin-cupo` y se ve la **B.12**. «Prefiero no usarla» guarda `no-usar`. En la demo nadie del equipo atiende el caso (6.8 b).
3. **B.14:** el reparto se elige con «Resolver el reclamo (simulación)»: dueño entre 0 y lo reclamado, el inquilino recibe el resto (la suma es el depósito). Confirmación «¿Resolver el reclamo así?» → `acciones.resolverSimulacion` (una sola vez) → `cerrado`, `via: 'simulacion'` y el aviso «Reclamo resuelto (simulación)» con el comprobante.
4. **6.3 f:** se muestra cuánto es la parte no reclamada y que se libera al cerrar el reclamo (la cuenta segura no permite liberar por partes).
5. «Otras vías (fuera de la app)»: conciliación o mediación en un centro autorizado, arbitraje si los dos lo firman, tribunales.
