# Nueva aceptación con la sesión abierta

Estado (24/10/2026, 9:20 p. m. CR): **programada en el PR 1** (`src/legal/Reaceptacion.tsx`, conexión en `App.tsx`, pruebas en `src/legal/__tests__/reaceptacion.test.tsx`). En vez de la casita animada se usa solo el logo estático (`/img/logo-lockumi.svg`), por la decisión de Katherine de no usar ilustraciones. Antes: **solo imagen v2** (con los 3 ajustes de Legal del 24/10), esperando el OK de Katherine
(`/workspace/lockumi/diseno/envio/contrato-compacto/reaceptacion.jpg`; la v1 quedó en `reaceptacion-v1.jpg`). Legal aprobó la idea. Debe salir **junto con 1.6-demo**: sin esto,
quien ya tiene la sesión abierta nunca vuelve a ver «Entrar» (`App.tsx:39`) y no acepta la nueva versión.

## Cuándo sale
- Al cargar `App.tsx` **con sesión** (`auth.actual()` devuelve un usuario), si la aceptación guardada de los Términos **o** del
  Aviso de privacidad no es la versión actual (`!aceptoVersion('terminos', TERMINOS.version) || !aceptoVersion('privacidad', PRIVACIDAD.version)`).
  Se compara igual que en «Entrar» (la misma versión exacta, no «mayor o menor»): 1.5-demo o nada guardado → sale; 1.6-demo → no sale.
- Va después de las páginas legales (`/terminos` y `/privacidad` se siguen viendo, para poder leerlas) y antes de cualquier otra pantalla.
- Bloquea: sin la barra de arriba, sin «Salir» y sin otro camino. No cambia la ruta: al aceptar, sigue a la pantalla que se estaba
  abriendo (también un link de invitación).

## Qué muestra (un paso, sin palabras técnicas)
- Casita animada de Lockumi.
- Título: «Actualizamos los Términos y el Aviso de privacidad (versión 1.6-demo, 24 oct 2026).» Texto: «Para seguir usando Lockumi,
  revísalos y acéptalos.» Debajo, en letra más chica: «Qué cambió: ahora explicamos con más detalle quién firma cada paso en
  la red de prueba (tú, tu billetera o la cuenta de Lockumi).» (ajuste 1 de Legal). La versión y la fecha se pueden armar desde `TERMINOS.version` y la fecha del documento, para no tener que
  cambiarlas a mano.
- Las mismas dos casillas de «Entrar» (`CasillaLegal` + `CONSENTIMIENTO_PRIVACIDAD`), **sin marcar**.
- **Enlaces a los documentos (ajuste 2 de Legal):** un toque abre el documento en una **hoja** sobre la pantalla (la misma hoja
  `<dialog>` de Crear), con «**Versión 1.6-demo** · 24 de octubre de 2026» arriba y el texto completo. Las casillas no cambian al
  abrir ni al cerrar la hoja, y la página no cambia. Con Ctrl/Cmd o clic medio se abre en otra pestaña (`href` a `/terminos` y
  `/privacidad`), como en «Entrar».
- **Texto de la casilla de privacidad (ajuste 3 de Legal):** «la dirección de mi billetera» → «la dirección de mi billetera **o de mi
  cuenta de prueba**». Es el mismo texto (`CONSENTIMIENTO_PRIVACIDAD.despues` en `documentos.ts`), así que cambia también en
  «Entrar». En «Entrar» solo cambia el texto; la lógica de inicio de sesión no se toca.
- El recorrido guiado de la primera vez espera a que la persona acepte (si no, se abre encima de esta pantalla).
- Botón «Aceptar y seguir», **desactivado hasta que estén las dos marcadas**. (En «Entrar» el botón está activo y muestra los errores
  al tocarlo; aquí se pidió desactivado.)

## Qué guarda
- Igual que «Entrar»: `guardarAceptacion(c, version)` para cada documento → `{ version, fecha }` con fecha y hora ISO 8601 en
  `lockumi.terminos.aceptacion` y `lockumi.privacidad.consentimiento`. Después se copia al usuario con
  `guardarUsuario(conAceptacion(u))` (`lockumi.usuario` → `terminos`, `privacidad`).

## Pruebas
- Al tocar cada enlace se abre la hoja con «Versión 1.6-demo»; al cerrarla, las casillas siguen como estaban y la ruta no cambió.
- La casilla de privacidad (aquí y en «Entrar») dice «la dirección de mi billetera o de mi cuenta de prueba». Hay que actualizar la
  prueba del texto exacto en `src/legal/__tests__/casillas.test.tsx`.
- Con la pantalla abierta y sin haber visto el recorrido, el recorrido no se abre; se abre después de aceptar.
- Sesión con 1.5-demo guardado en los dos documentos (y en `lockumi.usuario`): sale la pantalla, no hay «Salir», las dos casillas
  están sin marcar y el botón desactivado. Con una sola marcada, el botón sigue desactivado. Con las dos, se activa. Al tocarlo se
  guarda 1.6-demo con fecha y hora en los dos documentos y en el usuario, y se ve la pantalla de antes.
- Sesión con Términos 1.6-demo y Privacidad 1.5-demo: sale igual (falta una).
- Sesión con las dos en 1.6-demo: no sale.
- Sin sesión: no sale (está «Entrar»). `/terminos` y `/privacidad` se ven aunque falte aceptar.

En un borrador aparte (`/workspace/lockumi/tmp/reacept`, no subido), con el build real (`VITE_TRUSTLESS=1`) y una sesión con
1.5-demo: el botón estuvo desactivado con 0 o 1 casillas y activo con 2; no apareció «Salir»; las dos hojas mostraron
«Versión 1.6-demo · 24 de octubre de 2026»; tras abrir y cerrar las dos hojas, las casillas seguían marcadas; y al aceptar se guardó
1.6-demo con fecha y hora en los dos documentos y en el usuario. «Entrar» mostró la casilla con el texto nuevo.

## Estimación para construirla (v2)
- Mi tiempo real: **unos 35 a 45 minutos**, con pruebas, CI y vista previa. Incluye la pantalla y la conexión en `App.tsx`, la hoja con
  el documento, el texto nuevo de la casilla, que el recorrido espere, y unas 7 pruebas.
- Una persona: **unas 6 a 8 horas** de trabajo, con la hoja accesible (foco, Esc, lector de pantalla), revisión en teléfono y
  computadora, y revisión del código.
