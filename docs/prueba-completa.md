# Prueba completa (Términos 1.7-demo) · cómo está armada

Se publica por bloques (PR 2 a 10). Hasta el PR 10, todo lo visible queda detrás del **interruptor apagado**
`VITE_PRUEBA_COMPLETA` (variable de compilación; en producción no está puesta, así que app.lockumi.com sigue igual y con 1.6-demo).
El PR 10 enciende el interruptor junto con los Términos y la Privacidad 1.7-demo y la pantalla para volver a aceptar.

## Bloques
| PR | Qué agrega | Visible en producción |
|---|---|---|
| 2 | Plazos con feriados de Costa Rica (`api/_lib/plazos.ts`), precios de referencia (`api/_lib/precios.ts`), textos de avisos (`api/_lib/avisos.ts`), propuesta automática simulada (`src/prueba/propuesta.ts`) y cálculo de avisos debidos (`src/prueba/avisos.ts`) | No (solo funciones y tipos) |

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
