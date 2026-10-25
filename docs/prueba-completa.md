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
