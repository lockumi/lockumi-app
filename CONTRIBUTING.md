# Cómo contribuir a Lockumi

Gracias por tu interés. Lockumi es una demo en la **red de prueba de Stellar (testnet)**: no uses cuentas ni fondos de la red principal.

## Qué hace la app hoy

Antes de cambiar código o documentación, lee la [guía para jueces del README](README.md#prueba-el-flujo-en-5-minutos-guía-para-jueces): describe lo que hace app.lockumi.com (testnet, una persona, flujo completo de 8 pasos con escrow real de Trustless Work). Si tu cambio modifica ese comportamiento, actualiza también el README en el mismo *pull request*. Lo que todavía no funciona (dos personas reales, invitaciones por correo o link) se escribe como «Próximamente».

## Regla: lo publicado se documenta en el mismo trabajo

Desde el 20 de octubre de 2026, **todo cambio publicado en app.lockumi.com tiene que quedar en `master` con la documentación al día, en el mismo trabajo** (mismo *pull request* o mismo merge). Revisa y actualiza lo que corresponda:

- `README.md`, incluida la [guía para jueces](README.md#prueba-el-flujo-en-5-minutos-guía-para-jueces) y la sección [Cambios publicados](README.md#cambios-publicados) (una línea por cambio, con la fecha).
- `CONTRIBUTING.md` (este archivo), si cambia el proceso.
- `PLAN.md` (sección «Estado actual»).
- `docs/` (por ejemplo, [`docs/correo-resend.md`](docs/correo-resend.md)) y `src/legal/LEEME.md` si cambian los textos legales.

Nunca pongas valores de secretos en la documentación: solo el nombre de la variable y dónde está (por ejemplo, «Vercel, solo Preview, sensible»).

## Cambios en `/api/solo`: piensa en las pestañas abiertas

Cuando se publica, el servidor cambia al instante, pero una pestaña que ya estaba abierta (por ejemplo, desde que la persona entró con Google) sigue corriendo la versión anterior de la app hasta que se recarga. Por eso:

- Un cambio en `/api/solo` tiene que seguir funcionando con lo que manda la versión anterior, o responder un mensaje que diga qué hacer («recarga esta página y vuelve a tocar «Pagar»»).
- Lo importante (por ejemplo, recargar la cuenta de prueba antes de crear la cuenta segura) va también en el servidor, no solo en el navegador.
- Para reproducir con sesión de Cavos sin hacer login real: `scripts/saldo0-login/` (Vite en localhost:5173 con `VITE_CAVOS_APP_ID`, sesión simulada en localStorage tal como la guarda el login y `/api/solo` a una vista previa con `vercel curl`). Ver [`docs/testnet-e2e.md`](docs/testnet-e2e.md#8-saldo-0-con-sesión-de-cavos-20-oct-2026-rama-arreglo-saldo-0-login).

## Contrato plegable (`src/screens/ContratoDoc.tsx`)

El contrato tiene dos partes (publicado el 23 oct 2026):

- **Siempre a la vista:** cabecera (estado y referencia), «El alquiler», «Partes», el botón «Ver contrato completo», el pie y «Descargar o imprimir». La casilla «Leí el contrato y estoy de acuerdo.» y «Firma como inquilino» (`Firma` en `src/screens/Acta.tsx`) no dependen del plegado.
- **Plegado por defecto:** Reglas, El depósito, 7 días para reclamos, Mediación y Firmas. El estado vive en `ContratoDoc` y empieza cerrado cada vez; no lo guardes en localStorage.
- Una sección nueva va dentro de `completo` (plegada) salvo que Producto y Legal pidan que se vea siempre. No cambies textos legales al moverla.
- **La impresión siempre es completa.** «Descargar o imprimir» usa `Documento` con `impresion` (sin botón ni partes ocultas); con el menú del navegador, `@media print` muestra `.cp-completo[hidden]` y oculta el botón, y `beforeprint`/`afterprint` lo abren y lo dejan como estaba. Si tocas esto, corre `src/screens/__tests__/contrato-plegable.test.tsx` y `scripts/contrato-plegable/capturar.mjs` (genera los PDF y los revisa con `pdftotext`).
- **Detalle del alquiler: contrato compacto (rama `contrato-compacto`, sin publicar).** `src/screens/ContratoCompacto.tsx` muestra **una sola variante** según `useEscritorio()` (960 px): tarjeta en la columna (computadora) o barra arriba (teléfono), y un `<dialog>` con `ContratoDoc completo`. No dibujes las dos variantes a la vez (ids repetidos). Si cambias la columna del detalle, corre también `scripts/recorrido/capturar.mjs` (el paso 6 resalta «Los pasos»). Pruebas: `src/screens/__tests__/contrato-compacto.test.tsx` y `scripts/contrato-compacto/capturar.mjs`. Ver [`docs/contrato-compacto.md`](docs/contrato-compacto.md).
- Accesibilidad: `<button type="button">` con `aria-expanded` y `aria-controls`; el bloque es `role="region"` con `hidden`. Letra de 14 px o más, 56 px de alto como mínimo y solo variables de `src/index.css`.

## Estado de espera del pago (`src/espera.ts`, `src/EsperaPago.tsx`)

Publicado el 24 oct 2026. Ver [`docs/estado-espera.md`](docs/estado-espera.md).

- Los pasos (Firmando · Enviando · Guardado) salen del `avance` real de `services/escrow.ts` con `etapaDeAvance()`. **Sin temporizadores.** Si cambias un texto de `avance` del depósito, revisa `etapaDeAvance` y su prueba en `src/__tests__/espera-pago.test.tsx`.
- El terracota (`--accion`) es solo para el botón en reposo. En espera, el botón usa `aria-busy` y `aria-disabled` (no `disabled`) y los tres verdes `--estado-curso-fondo`, `--salvia` y `--exito`, sin colores nuevos.
- Textos nuevos con `// LEGAL: revisar`. No muestres «no se paga dos veces» mientras el código no lo garantice.
- Si lo tocas, corre `scripts/espera-pagar/capturar.mjs` sobre la app construida (`VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173`).

## Avisos después de cada paso (`src/alertas.ts`)

Publicado el 23 oct 2026 (avisos v2). Ver [`docs/alertas.md`](docs/alertas.md).

- **Aviso v2 · toast (publicado el 24 oct 2026):** `avisar()` ya no es una cola: es una **pila de hasta 3** (`MAX_AVISOS`). Cada aviso puede llevar `linea` ({et, texto}, texto de Legal) y `accion` ({texto, etiqueta, ir: 'panel' | 'detalles'}); `irA()` enfoca el botón principal del panel. 8 s con acción, 5 s sin acción; los errores (`tipo: 'error'`) no se esconden solos. Montos solo con `usd()`. Si agregas un título o botón que el aviso no debe tapar, súmalo en `TAPAR_NUNCA` (`src/Alertas.tsx`). Si lo tocas, corre `scripts/aviso-v2/capturar.mjs`, `scripts/espera-pagar/capturar.mjs` y `scripts/alertas/capturar.mjs`. Lo de abajo describe el v2 publicado.
- **No llames a `<Aviso>` directo desde una pantalla.** Usa `avisar(alerta)` (cola: se muestran de a uno). `<Alertas />` va una sola vez en `App.tsx` (con y sin sesión), **justo después de «Saltar al contenido»** para que el aviso sea la 2.ª parada de Tab (ramas `aviso-tab` y `espera-pagar`, pendiente de publicar). No lo muevas al final ni le des foco al aparecer.
- **Los avisos del flujo salen solos:** `Detalle` guarda una `instantanea()` del alquiler y, en cada cambio, `alertaPorCambio(antes, ahora, rol)` decide el aviso (cambio de estado, firma nueva de una parte o plazo adelantado). Así también avisa cuando el dueño de prueba firma solo. Un paso nuevo = un `case` nuevo en `alertaPorCambio` + su prueba en `src/__tests__/alertas.test.tsx` + su captura en `scripts/alertas/capturar.mjs`.
- Cada aviso tiene `titulo`, `hecho` (qué pasó) y `sigue` (qué sigue). El ícono es siempre la casita de Lockumi (`src/LogoAviso.tsx`, tomada del logo oficial); el color sale de `tonoDe(alerta)`: `paso` (miel), `logro` (verde, la llave gira una vez; pasos en `LOGROS`) o `error`. Sin emojis. Los errores usan `tipo: 'error'` (zona `role="alert"`) y siempre dicen cómo seguir; los errores de los pasos siguen en la pantalla (`p.error`).
- **Textos:** español neutro, sin palabras técnicas, sin «liberado» y con «(simulación)» para la persona mediadora. Todo texto con sentido legal lleva `// LEGAL: revisar` y no se cambia sin Legal.
- `Aviso` (`src/Aviso.tsx`, v2): tarjeta pequeña, sin botones ni X. **Se esconde sola a los 5 s** (`DURACION_AVISO`, también en errores); se cierra antes al tocarla, con Enter, Espacio o Esc, y el conteo se pausa con el dedo, el mouse o el foco encima. No es un diálogo y **no roba el foco**: se anuncia desde las zonas fijas de `<Alertas />` (`role="status"` + `aria-live="polite"`, o `role="alert"` en errores). Se enfoca con Tab (nombre «Aviso. Toca para cerrar»; ids con `useId`) y al cerrar el foco vuelve a donde estaba. No pongas enlaces ni botones dentro (tocar la tarjeta la cierra). Un error que solo está en el aviso desaparece a los 5 s: si es importante, muéstralo también en la pantalla (como el error del ingreso en Entrar, `error` en `Login.tsx`, enlazado al botón con `aria-describedby`). Al volver de Google o Apple, `App.tsx` muestra `Entrando` (`aria-busy`) mientras confirma la sesión; no vuelvas a mostrar Entrar en ese momento. En el teléfono se ubica debajo del encabezado, del primer `h1` (o su `.cab`) y de `.entrada-app__titulo`; si quedaría por debajo de la mitad de la pantalla, va al pie. Si agregas un título de pantalla con otra clase, súmala en `lugarEnCelular()`. No uses la clase `.aviso` (ya es la nota amarilla). Si lo tocas, corre `scripts/alertas/capturar.mjs` (revisa zona, que no robe el foco, toque, Esc, pausa + Enter, el cierre solo a los 5 s, que no tape el encabezado ni el título, la casita completa, tamaño y capturas en 390 y 1280 px).
- `[hidden]` y `display`: si una clase pone `display:grid|flex`, agrega `.clase[hidden]{display:none}` (pasó con `.turno`).

## Recorrido guiado (`src/recorrido.ts`, `src/screens/Ejemplo.tsx`)

- Los 6 pasos están en `PASOS_RECORRIDO`: ruta, estado del alquiler de ejemplo, selector y textos. Los textos son los de la maqueta (`diseno/envio/recorrido-formulario/textos.md`); si cambian, cambia también `src/__tests__/recorrido.test.tsx`, que los compara palabra por palabra. Cualquier texto nuevo pasa por Legal: sin promesas, la persona mediadora ayuda y no decide.
- Cada paso apunta a un elemento con `data-recorrido="…"` (`nuevo`, `datos`, `reglas`, `pasos`) o a un selector estable. Si mueves o renombras ese elemento, deja el atributo. Usa un bloque bajo: el globo no debe tapar los botones principales (`elMovil` permite otro selector en el teléfono).
- Los pasos 4 a 6 usan `#/ejemplo`: `Detalle` con `ejemplo`, envuelto en `inert`. No llama a `/api/solo`, no muestra avisos y no guarda nada en «Tus alquileres». No agregues ahí acciones reales.
- «Ya lo vio» se guarda en `localStorage` con la clave `lockumi.recorrido.v1.<huella del correo>` (16 caracteres hex de SHA-256, nunca el correo). Para que todos lo vuelvan a ver, sube `VERSION_RECORRIDO`.
- Los scripts de navegador que pasan por Inicio deben marcarlo como visto en `addInitScript` (ver `scripts/alertas/capturar.mjs`); si no, el recorrido se abre y tapa la pantalla.
- Prueba en navegador: `VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173`, luego `OUT=/tmp/rec/ node scripts/recorrido/capturar.mjs` (teléfono, computadora y movimiento reducido).

## Agregar un estado del alquiler y su color

«Tus alquileres» pinta cada tarjeta según el **grupo** de su estado: `pendiente` (amarillo miel), `curso` (verde salvia), `reclamo` (terracota) o `terminado` (arena). Para agregar un estado:

1. Súmalo a `Estado` y a `ETIQUETA_ESTADO` en `src/types.ts`, y a `turno()` en `src/flujo.ts` (la línea «qué te toca»).
2. Dale su grupo en `GRUPO_ESTADO` y su ícono en `ICONO_ESTADO` (`src/estados.ts`). TypeScript avisa si falta.
3. Agrega el caso a `src/services/__tests__/estados.test.ts`.
4. **No inventes colores.** Los tonos de cada grupo están en las variables `--estado-<grupo>-{fondo,borde,texto,sello}` al final de `src/index.css` y solo reutilizan valores que ya existían más arriba en ese archivo. La prueba falla si aparece un HEX nuevo. Si hace falta un grupo nuevo, usa tonos existentes y revisa el contraste del texto (mínimo 4,5:1).

## Proponer cambios

1. Abre un *issue* con el problema o la idea, o comenta en uno existente.
2. Crea una rama desde `master` con un nombre corto y descriptivo, por ejemplo `fix-login-correo` o `docs-guia`.
3. Haz commits pequeños con mensajes en español que digan qué cambia y por qué.
4. Abre un *pull request* contra `master`. Explica qué cambiaste, cómo lo probaste y, si cambia la interfaz, agrega una captura.
5. El CI (`.github/workflows/ci.yml`) tiene que pasar antes del merge.

## Correr tests y lint

Con Node.js 22:

```bash
npm ci
npm run lint    # Oxlint
npm test        # Vitest (vitest run)
npm run build   # TypeScript + Vite
```

Para probar el flujo de la red de prueba en local hacen falta las variables del servidor (ver la tabla del README); sin ellas, la app corre como demo local con el escrow simulado. `VITE_FLUJO=solo` activa el flujo mínimo anterior de 5 pasos.

Si agregas lógica nueva, agrega su prueba en `src/**/__tests__/`.

## No subas secretos

- Copia `.env.example` a `.env` y pon ahí tus valores. `.env`, `.env.local` y `.env.*.local` están en `.gitignore`.
- Nunca subas llaves de API, claves secretas de Stellar (`S…`) ni claves de servicio de Supabase.
- Las variables con prefijo `VITE_` terminan en el bundle del navegador: solo pueden ser públicas. Las secretas van sin prefijo y solo en el servidor.
- Si subiste un secreto por error, avísanos y rótalo; borrarlo del historial no basta.

## Estilo de código

- TypeScript (el build corre `tsc -b`) y componentes de React con funciones y hooks.
- Nombres, textos de la interfaz y comentarios en español neutro.
- Sigue el estilo de los archivos vecinos: funciones cortas, sin dependencias nuevas si no hacen falta.
- `npm run lint` no debe dar errores.
- Los textos legales de `src/legal/` no se editan a mano: se reemplazan como indica `src/legal/LEEME.md`. Hoy: Términos 1.6-demo (24 oct 2026, rama `contrato-compacto`, sin publicar) y Aviso de privacidad 1.5-demo.
- Todo texto nuevo con implicación legal (fuera de `src/legal/`) lleva el comentario `// LEGAL: revisar` y se lista en el *pull request* para que Legal lo revise.
