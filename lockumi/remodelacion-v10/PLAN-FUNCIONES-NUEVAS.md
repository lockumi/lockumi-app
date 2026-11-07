# Plan mínimo — perfil, avisos y ayuda

> No implementado. Katherine autorizó agregar estas tres funciones (06/11/2026, 19:48–19:56 CR) solo después de revisar este comportamiento. La adaptación visual del resto sigue aparte.
> Rama `cursor/diseno-estatico-v10-c688`. No borra ni reemplaza lo que ya existe.

Los mocks 24, 26 y 27 muestran además una barra inferior (Inicio, Avisos, Ayuda, Perfil) y una campana en la cabecera. Esas entradas solo se conectarían cuando cada destino exista de verdad. Hasta entonces no se agregan botones que no lleven a ningún lado.

## 1. Perfil (mock 24)

**Qué hay hoy.** No hay ruta de perfil. La sesión es `Usuario`: `email`, `nombre`, `metodo` (`correo` | `google` | `apple`) y las aceptaciones de Términos y privacidad. Se guarda en `localStorage` (`lockumi.usuario`). El nombre, si el proveedor no lo manda, es la parte local del correo (`src/services/auth.ts`). La cabecera muestra el correo y «Salir». La reputación (Llave Lockumi) solo entra al build con `VITE_REPUTACION=1` y ya tiene sus pantallas.

**Mínimo propuesto**

- Ruta nueva `#/perfil`, solo con sesión.
- Muestra datos reales de esa sesión: iniciales derivadas de `nombre`, `nombre`, `email`, método de acceso.
- Chips de rol solo si esa cuenta es dueña y/o inquilina en alquileres que ya están en la lista. Si no hay alquileres, no se inventa «Dueña» ni «Inquilina».
- Enlaces a las pantallas legales que ya existen (`/terminos`, `/privacidad`). No se reescribe el texto legal.
- «Salir» llama a la misma función que el botón de la cabecera.
- «Mi Llave Lockumi» solo aparece como enlace a la reputación cuando `VITE_REPUTACION=1`. Apagado, esa fila no se dibuja.

**Qué no entra en el mínimo**

- Cédula, edición de nombre, cuenta de pago y «Editar perfil» del mock. No hay campo ni API de cédula. La cuenta de pago es la billetera Stellar, que ya vive en Inicio cuando hay login real. Abrir un formulario vacío o con datos de ejemplo sería presentar datos inventados.

**Persistencia y seguridad.** Solo lectura de la sesión y de los alquileres que esa sesión ya puede ver. Sin tabla nueva. Sin endpoint nuevo.

**Backend.** No hace falta para este mínimo. Cédula o editar el nombre sí lo exigirían (hoy el nombre llega de Cavos o del correo y no hay perfil en Supabase).

## 2. Centro de avisos (mock 26)

**Qué hay hoy.** Dos cosas distintas:

1. Toasts en memoria (`src/alertas.ts` + `Alertas.tsx`). Se pierden al recargar. Siguen como avisos compactos encima del flujo. Esta pantalla no los sustituye ni los bloquea.
2. Avisos del plazo guardados en cada alquiler (`Alquiler.avisos`: días 1, 4 y 6, y el de 5 días antes de la salida). Tienen asunto, texto, entrega y apertura. Se ven dentro del alquiler (`AvisosApp`, `AvisoSalida`) cuando la prueba completa está encendida. En dos personas, el correo de avisos ya sale por el servidor si la persona marcó la casilla; eso no cambia.

**Mínimo propuesto**

- Ruta `#/avisos`.
- Lista los `avisos` ya guardados en alquileres de esta sesión, solo los dirigidos al rol de esa persona en ese alquiler.
- Cada fila usa el `asunto` real, la dirección del alquiler y la fecha `entregado` ya guardada. Si no hay avisos, la lista va vacía con una frase de vacío. No se rellenan «Quedan 5 días», «Firmas listas» ni «Depósito protegido» de ejemplo.
- Abrir una fila marca `abierto` con la misma escritura que ya usa el detalle y lleva a `#/alquiler/:id`.
- No envía correos ni crea avisos nuevos.

**Persistencia.** El mismo `store` / repositorio del alquiler. En demo local, `localStorage`. Con servidor, el aviso ya viaja dentro del alquiler sincronizado; no se propone una tabla de notificaciones nueva en este mínimo.

**Backend.** No para listar y marcar apertura si el aviso ya está en el alquiler. Un buzón push, leído entre dispositivos fuera del alquiler, o avisos que hoy solo existen como toast, sí pedirían persistencia nueva.

## 3. Ayuda (mock 27)

**Qué hay hoy.** «¿Cómo funciona?» y «Ver el recorrido» abren el recorrido guiado real (`src/recorrido.ts`, seis pasos). No hay FAQ.

**Mínimo propuesto**

- Ruta `#/ayuda`.
- Un botón que abre el recorrido existente (mismo `abrirRecorrido`).
- Preguntas solo con respuestas que ya están en textos de la app o en los Términos vigentes, enlazando al documento legal en vez de resumir de nuevo una cláusula. Borrador de temas, sujeto a OK de Legal antes de publicar la frase:
  - ¿Lockumi es un seguro? La nota ya visible en Entrar dice que no es un seguro ni una garantía de devolución.
  - ¿Quién guarda el depósito? El texto de custodia ya usado en el flujo (nadie lo saca solo; en la prueba, red de Stellar / Trustless Work).
  - ¿El rendimiento está garantizado? La app ya dice «próximamente · variable, no garantizado» donde corresponde. No afirmar un rendimiento.
  - ¿Qué pasa si no hay acuerdo? Remitir a la cláusula de mediación ya publicada, sin reescribirla.
- Filtros Depósito / Fotos / Reclamos / Mediación solo muestran u ocultan esas preguntas. No son pantallas nuevas.

**Persistencia y backend.** Ninguno. Contenido estático en el cliente, revisión legal previa.

## Impacto común

- Tres rutas en el `if` de `App.tsx`. El resto de rutas, pagos, firmas y auth no se mueven.
- La barra inferior del mock se evaluaría en un cambio posterior, con las tres rutas ya hechas, para no dejar iconos mudos.
- Los montos y nombres de los PNG siguen siendo ejemplo de diseño, no datos de la app.
