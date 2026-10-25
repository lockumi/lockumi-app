# Aviso de privacidad de app.lockumi.com

> Versión demo en red de prueba. Este texto puede actualizarse; te avisaremos de los cambios importantes.

**Versión 1.7-demo · 24 de octubre de 2026**

## Responsable
Katherine María Moreira Solano, persona física, con domicilio en Torres de Heredia, Barreal de Heredia, Costa Rica. Lockumi es un proyecto de Quantz, una iniciativa que todavía no está constituida como sociedad. Contacto: business.applockumi@gmail.com.

## Qué es esta base de datos
Cuando usas la demo de app.lockumi.com, tratamos la información necesaria para simular un depósito de garantía de alquiler. La demo funciona en la **testnet (red de prueba)** de **Stellar (una red digital abierta)**, con tokens de prueba que **no son dinero real**. Esta base es distinta de la lista de espera de lockumi.com.

## Qué datos recogemos
- **Datos de acceso:** tu correo electrónico y, si entras con Google o Apple, el nombre asociado a ese servicio. El inicio de sesión lo gestiona Cavos.
- **Billetera (tu cuenta digital en la app):** la dirección pública de tu billetera, que crea Cavos. Si eliges el USDC de prueba que te da Lockumi, el depósito no sale de tu billetera, sino de una cuenta de inquilino de prueba de Lockumi. Lockumi no recibe ni guarda tu llave privada. Como Lockumi puede vincular esa dirección con tu correo, **la tratamos como un dato personal**.
<!-- LEGAL: revisado (24/10) · ronda 9b (quién firma: ver Términos 5.3) -->
- **Freighter (opcional):** si en «Usar mi propio USDC de prueba» eliges «Usar Freighter», Lockumi **solo recibe la dirección pública** de esa billetera, y la tratamos igual que la de las otras billeteras. Si usas Freighter, las transacciones de tu billetera las confirmas tú en la extensión. Las demás acciones del contrato las firma Lockumi (ver la cláusula 5.3 de los Términos) en la red de prueba. Lockumi nunca ve tu clave privada. Freighter es una billetera de un tercero, la Stellar Development Foundation (https://www.freighter.app/privacy), que trata tus datos según su propia política. **No es un encargado de Lockumi**: Lockumi no le envía tus datos.
- **Alquiler simulado:** el lugar (la dirección del inmueble) que escribes, el monto, las fechas, las reglas, las firmas con fecha y hora, el inventario de entrada y de salida, el reclamo simulado y el historial de eventos.
- **Fotos del inventario:** cada foto se reduce a 720 píxeles y se vuelve a guardar **sin sus metadatos**, es decir, sin ubicación, GPS ni otros datos internos del archivo. Guardamos también su **hash (una huella digital que no permite ver el contenido)** y la fecha original. Si simulas el alquiler en un solo aparato, **el lugar y las fotos se quedan solo en el navegador de tu aparato**; a la red solo va la huella digital SHA-256 de las fotos. Si simulas un alquiler con otra persona, las fotos reducidas se guardan en Supabase (ver abajo).
- **Aceptaciones:** la versión y la fecha en que aceptaste estos textos, guardadas en tu navegador y en tu perfil.
- **Datos técnicos:** datos que se guardan en tu navegador para mantener la sesión y, si simulas un alquiler con otra persona, un identificador de sesión anónima.
- **Invitaciones y avisos por correo:** el correo de la persona que invitas y su papel en el alquiler simulado.
- **USDC de prueba que te da Lockumi, sin valor:** si eliges esa opción, registramos qué cuenta de inquilino de prueba de Lockumi se asignó a tu alquiler simulado, el monto y la fecha. Esos tokens no se envían a tu billetera.
No pedimos datos sensibles. **No subas fotos de personas ni de documentos.**

## Alquiler simulado con otra persona
Dos personas pueden simular juntas un alquiler, cada una con su cuenta. En ese caso:
- Usamos **Supabase** con una sesión anónima. El alquiler simulado y las fotos reducidas **sí se guardan allí**, las fotos en un **almacenamiento privado en Estados Unidos**, al que se accede con enlaces temporales.
- **La otra parte del alquiler simulado ve** tu correo, tus firmas, el inventario con las fotos, el reclamo con su respuesta y el historial de ese alquiler. No ve tu llave privada ni tus otros alquileres.
- Si se rechaza un reclamo, también puede verlo la persona mediadora de la demo.

## Invitar a otra persona y avisos por correo
Esto aplica cuando simulas un alquiler con otra persona y cada una tiene su cuenta. Los avisos por correo son opcionales: sin la casilla, llegan solo dentro de la app.
- Puedes invitar a otra persona a un alquiler simulado escribiendo su correo. **Al invitarla, declaras que esa persona sabe que la invitas y que acepta recibir el correo de Lockumi.** No invites a nadie sin avisarle antes.
- El correo lo envía **Resend** desde invitaciones@lockumi.com. **Esa dirección es solo para enviar y no recibe respuestas**; para cualquier consulta, escribe a business.applockumi@gmail.com.
- Es un **correo transaccional, sin publicidad**. Solo contiene quién invita, el papel de la persona invitada (dueño o inquilino), un resumen del alquiler simulado (monto y fechas) y el enlace para unirse. **No incluye la dirección ni el nombre del lugar, ni fotos.** Los avisos de plazos y de reclamos tampoco incluirán la dirección ni el nombre del lugar, ni fotos: solo montos de prueba, fechas y un enlace a la app.
- Usaremos ese correo solo para la invitación y para los avisos de ese alquiler simulado (plazos, reclamo y respuesta). No lo agregaremos a ninguna lista ni le enviaremos novedades. Los avisos por correo solo se envían si marcas la casilla «Acepto que Lockumi me envíe avisos por correo». Puedes desmarcarla cuando quieras.
- **El enlace de invitación vence a los 7 días.** El correo de la persona invitada se guarda mientras exista el alquiler simulado de la demo. La persona invitada puede pedir que lo borremos en cualquier momento escribiendo a business.applockumi@gmail.com.
- Resend guarda un registro de cada correo enviado (destinatario, asunto, contenido y estado de entrega). Según Resend, en sus planes estándar conserva esos datos durante 30 días (https://resend.com/security/gdpr).

## Para qué los usamos
1. Permitirte entrar a la demo y usarla.
2. Crear en la red de prueba el **escrow (contrato digital de garantía)**, registrar el depósito, la aprobación y la liberación, y dejar como evidencia solo la huella digital de las fotos.
3. Mostrar a la otra parte lo necesario para la simulación y enviar por correo la invitación y los avisos del alquiler simulado.
4. Si eliges el USDC de prueba que te da Lockumi, sin valor, asignar a tu alquiler simulado una cuenta de inquilino de prueba de Lockumi.
5. Dejar constancia de tus aceptaciones.
6. Mejorar la demo con datos agregados.
No usamos tus datos para publicidad, no los vendemos y no calculamos ningún puntaje de reputación.

## Si es obligatorio darlos
Darnos tus datos es voluntario, pero sin el correo, la billetera y el inventario la demo no funciona. Si no los das, la única consecuencia es que no podrás usar la demo.

## Lo que queda en la red de prueba: público y permanente
- En la red de prueba quedan registradas **las direcciones de las cuentas** (la tuya y las cuentas de prueba), **los montos, las fechas**, el título fijo "Depósito de alquiler Lockumi" y un identificador interno sin significado.
- **No se registran en la red tu nombre, tu correo, tus fotos ni la dirección del inmueble.**
- **Qué cuenta aparece como inquilino depende de tu opción.** Si usas tu propio USDC de prueba, aparece la dirección de tu billetera. Si usas el USDC de prueba que te da Lockumi, aparece la cuenta de inquilino de prueba de Lockumi, no tu billetera, salvo que uses tu billetera para otra operación en la red.
- La dirección de tu billetera es un **dato personal**. En la red es **pública y permanente**: cualquiera puede consultarla y no podemos modificarla ni borrarla.
- Si pides que borremos tus datos, borraremos de nuestros sistemas el vínculo entre tu correo y tu billetera. Lo que ya está en la red pública permanece, salvo que la red de prueba se reinicie. Aun así, la dirección de tu billetera podría vincularse contigo por otros medios.

## Cuentas de prueba de Lockumi
Lockumi genera y guarda en su servidor la llave de las **cuentas de prueba rotuladas**: la del dueño de prueba y, si falla la firma de tu billetera, una cuenta de inquilino de prueba de respaldo. Si eliges el USDC de prueba que te da Lockumi, sin valor, Lockumi también guarda la llave de la cuenta de inquilino de prueba que usa tu alquiler simulado y firma el depósito por ella; tú no recibes ni controlas esos tokens. Esas llaves **no son datos personales tuyos**, porque pertenecen a cuentas de Lockumi que solo manejan tokens de prueba. Si usas tu propio USDC de prueba, Lockumi no custodia los tokens de tu billetera. Si usas una cuenta de inquilino de prueba de Lockumi, sus movimientos quedan vinculados a tu alquiler simulado.

## Quién puede ver tus datos
- El personal autorizado de Lockumi y, si simulas un alquiler con otra persona, la otra parte del alquiler simulado y, si aceptas la mediación con una persona, la persona mediadora de la demo.
- Los proveedores que actúan por nuestra cuenta, **todos en Estados Unidos**:
  - **Vercel** (alojamiento de la app y funciones del servidor).
  - **Supabase** (base de datos del perfil y, en los alquileres simulados con otra persona, de los alquileres y las fotos).
  - **Cavos, LLC** (Delaware): inicio de sesión y billetera. Recibe tu correo o tu identidad de Google o Apple y actúa como encargado del tratamiento. Política de privacidad: https://cavos.xyz/privacy
  - **Permissionless Escrows Inc.** (Delaware), que opera **Trustless Work**: recibe las direcciones de las cuentas, el monto y las fechas para crear el contrato digital. Política de privacidad: https://www.trustlesswork.com/privacy-policy
  - **Plus Five Five, Inc.**, que opera **Resend** (Estados Unidos). Envía los correos de invitación y de avisos desde invitaciones@lockumi.com, una dirección que solo envía y no recibe respuestas. Recibirá el correo de la persona invitada, su papel, un resumen del alquiler simulado (sin el lugar ni fotos) y el enlace para unirse. Actuará como encargado del tratamiento. Política de privacidad: https://resend.com/legal/privacy-policy
- **Servicios de la red de prueba:** **Friendbot** (que entrega XLM de prueba) y el **exchange descentralizado** de la red de prueba (donde compras USDC de prueba) son servicios públicos de la red. No les enviamos datos personales; solo reciben la dirección pública de tu billetera cuando la usas.
- Al aceptar este aviso, **autorizas de forma expresa** que tus datos se transfieran a estos proveedores (Vercel, Supabase, Cavos, Trustless Work y Resend), fuera de Costa Rica, solo para los fines descritos (Ley 8968, art. 14).
- Solo compartiremos tus datos con una autoridad cuando lo exijan una orden judicial fundamentada o la ley.

## Cuánto tiempo los guardamos
Mientras la demo esté activa y hasta 6 meses después de que termine, o antes si pides que los eliminemos. El correo de una persona invitada se guardará mientras exista el alquiler simulado, salvo que pida antes que lo borremos. Luego los eliminamos o los anonimizamos. Los datos que quedan solo en tu navegador los puedes borrar cuando limpies los datos del sitio. Lo registrado en la red pública no se puede borrar.

## Tus derechos
Puedes pedir en cualquier momento y sin costo el **acceso**, la **rectificación** o la **supresión** de tus datos, y **revocar tu consentimiento**, escribiendo a business.applockumi@gmail.com desde tu correo registrado. Respondemos en un plazo de cinco días hábiles (Ley 8968, art. 7). Si no estás de acuerdo con nuestra respuesta, puedes presentar una denuncia ante la Agencia de Protección de Datos de los Habitantes (PRODHAB): www.prodhab.go.cr, info@prodhab.go.cr, (506) 2234-0189, San Pedro de Montes de Oca, Mall San Pedro, Ofimall Centro Ejecutivo, 6.º piso.

## Cómo das tu consentimiento
Antes de usar la demo, la app te muestra una casilla sin marcar para aceptar este aviso. Al marcarla, aceptas que tratemos tus datos para los fines descritos, que los transfiramos a los proveedores indicados (Supabase, Vercel, Cavos, Trustless Work y Resend) en Estados Unidos y que las direcciones de las cuentas (la de tu billetera, si usas tu propio USDC de prueba), los montos y las fechas queden registrados en la red de prueba, que es pública y permanente. Guardamos la versión y la fecha de cada aceptación, en tu navegador y en tu perfil. Puedes retirar tu consentimiento en cualquier momento escribiendo a business.applockumi@gmail.com. Retirarlo no afecta lo que hicimos antes con tus datos. Desde ese momento dejamos de usarlos y los eliminamos, salvo lo que ya esté en la red pública.

## Seguridad
Aplicamos medidas técnicas razonables para proteger tus datos y las llaves de las cuentas de prueba. Ninguna medida de seguridad es infalible. Si hay una brecha que te afecte, te avisaremos.

## Menores de edad
La app es solo para personas mayores de 18 años.

## Cambios
Publicaremos cada nueva versión con su fecha en https://app.lockumi.com/privacidad. Si cambian los fines o los destinatarios, te pediremos de nuevo tu consentimiento.
