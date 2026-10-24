# Términos y condiciones de app.lockumi.com

> Versión demo en red de prueba. Este texto puede actualizarse; te avisaremos de los cambios importantes.

**Versión 1.6-demo · 24 de octubre de 2026**

Estos términos aplican a la app app.lockumi.com y están publicados en https://app.lockumi.com/terminos.

---

## 1. Quién es responsable
1.1 Lockumi es un proyecto de **Quantz**, una iniciativa que **todavía no está constituida como sociedad**. Mientras tanto, la responsable de la app y de estos términos es **Katherine María Moreira Solano**, persona física, con domicilio en Torres de Heredia, Barreal de Heredia, Costa Rica ("Lockumi", "nosotros").
1.2 Contacto: **business.applockumi@gmail.com**.

## 2. Qué es esta app: una demo en la red de prueba
2.1 app.lockumi.com es una **demostración** de cómo funcionaría un depósito de garantía de alquiler protegido. Funciona en la **testnet (red de prueba)** de **Stellar (una red digital abierta)**, con un **escrow (contrato digital de garantía)** de Trustless Work. **En la red de prueba no hay dinero real.**
2.2 En la demo:
a) Los tokens que se usan, incluidos el XLM y el USDC de prueba, **no son dinero real, no tienen valor económico y no se pueden canjear** por dinero ni por ningún otro bien.
<!-- LEGAL: revisado (24/10) · ronda 9b (2.2 b) -->
b) El depósito, la aprobación, la liberación, el reclamo y el reparto del reclamo **sí se registran en la red de prueba**. Las reglas de retención y de devolución y la persona mediadora son **simulados** y aparecen rotulados como "Demo". En la demo, el reparto de un reclamo se elige con un botón (cláusula 6.7). Nada de esto tiene efecto legal.
c) **No hay rendimiento ni intereses** de ningún tipo.
d) **Monto del depósito de prueba:** si usas tu propio USDC de prueba, eliges libremente el monto, hasta un **máximo técnico de 50 000 USDC de prueba** por contrato. Si usas el USDC de prueba que te da Lockumi, sin valor, el máximo es de **20 USDC de prueba** (cláusula 5.5).
2.3 **Fase 1 (disponible):** tú haces el papel de **inquilino** (con tu billetera o, si usas el USDC de prueba que te da Lockumi, con una cuenta de inquilino de prueba de Lockumi; cláusula 4.1), y el **dueño** es una **cuenta de prueba** que genera Lockumi, rotulada como tal. **El lugar y las fotos del inventario se quedan en tu navegador**; a la red solo va una **huella digital SHA-256 de las fotos**, que no permite ver su contenido.
2.4 **Fase 2 (cuando esté disponible):** dos personas reales, cada una con su cuenta, podrán simular juntas un alquiler. Cada una verá lo que la otra registre en ese alquiler simulado: su correo, sus firmas, el inventario con las fotos, el reclamo y su respuesta, y el historial. No verá tu llave privada ni tus otros alquileres. En esa fase, el alquiler simulado y las fotos reducidas **sí se guardarán en Supabase**, en un almacenamiento privado en Estados Unidos. **Fase 2, cuando se active: esto todavía no está disponible.** Cuando se active, si invitas a otra persona, declararás que ella sabe que la invitas y que acepta recibir el correo de invitación de Lockumi (ver el Aviso de privacidad).
2.5 **No uses la app para depositar garantías reales de alquiler.** Lo que hagas en la demo no crea, modifica ni extingue obligaciones reales entre un dueño y un inquilino.
2.6 La app **no sustituye el contrato de arrendamiento ni la asesoría legal**. Para un alquiler real, rigen el contrato que firmen las partes y la Ley 7527, Ley General de Arrendamientos Urbanos y Suburbanos. Si tienes dudas sobre un alquiler real, te recomendamos buscar asesoría legal propia.

## 3. Cuentas y acceso
<!-- LEGAL: revisado (24/10) · 5.3 ronda 9 (3.1) -->
3.1 Para entrar, usas el servicio de inicio de sesión de **Cavos** (cláusula 5) con Google, Apple o tu correo y un código. Con Cavos se crea tu billetera en la red de prueba. Si usas tu propia billetera, con ella firmas el depósito como inquilino; en el modo por defecto, lo firma Lockumi con tu cuenta de inquilino de prueba (ver 5.3). Debes ser mayor de 18 años.
3.2 Eres responsable de lo que hagas con tu cuenta y de proteger el acceso a ella. Si sospechas que alguien entró sin autorización, escríbenos.

## 4. Cómo se manejan los tokens de prueba
4.1 **Quién custodia los tokens de prueba depende de la opción que elijas** (cláusula 5.5):
<!-- LEGAL: revisado (24/10) · 4.1 a), ronda 3 -->
a) **Si eliges «Usar mi propio USDC de prueba»** (con tu billetera de Cavos o con Freighter): tú firmas el depósito con tu billetera. Lockumi no guarda tus tokens de prueba en una cuenta propia: quedan en un contrato de escrow en la red de prueba. Si hay un reclamo, la cuenta de Lockumi puede ejecutar el reparto.
b) **Si eliges el USDC de prueba que te da Lockumi, sin valor:** ese USDC de prueba **no llega a tu billetera**. Lockumi lo pone en una **cuenta de inquilino de prueba rotulada**, cuya llave guarda Lockumi en su servidor, y **Lockumi firma el depósito por esa cuenta**. Tú no recibes ni controlas esos tokens y no los puedes retirar: solo pasan a los contratos digitales de la demo de Lockumi.
c) En ambos casos, el depósito queda bloqueado en el contrato digital de garantía en la red de prueba. Lockumi también genera y guarda en su servidor la llave del **dueño de prueba**, y firma por esa cuenta, por ejemplo la aprobación del dueño. Si eliges tu propio USDC y falla la firma de tu billetera, Lockumi puede usar una cuenta de inquilino de prueba de respaldo, también rotulada y con llave en su servidor. Todas esas cuentas solo manejan tokens de prueba sin valor.
4.1.1 Lockumi, como plataforma, crea el contrato digital, registra la evidencia (solo la huella digital SHA-256 de las fotos, no las fotos ni el lugar) y libera el depósito al inquilino cuando la aprobación está lista.
4.2 **Qué puede hacer cada parte en la red de prueba.** Según los roles de Trustless Work (https://docs.trustlesswork.com/trustless-work/introduction/technology-overview/roles-in-trustless-work):
a) **El dueño** aprueba que el depósito se libere y puede abrir una disputa. En la fase 1, el dueño es la cuenta de prueba de Lockumi, así que **Lockumi firma esa aprobación**.
b) **El inquilino** es quien recibe el depósito cuando se libera. La persona o cuenta que libera los fondos no puede cambiar a quién se entregan.
c) **Lockumi** puede: cambiar el estado del contrato digital y agregar evidencia; liberar los fondos al inquilino, solo cuando todo está aprobado; cobrar una comisión de plataforma, que hoy es 0; y cambiar las condiciones o los roles del contrato digital solo antes de que tenga fondos. Después de que tiene fondos, solo puede agregar etapas. Mientras Lockumi tenga el rol de resolver disputas, su cuenta no puede abrir una disputa en el contrato digital.
d) **Desacuerdos:** por defecto, la cuenta de Lockumi tiene también el rol de resolver disputas. Con ese rol puede **repartir de forma definitiva** el saldo en disputa. En la demo, ese reparto es simulado y no tiene efecto legal. Nuestro objetivo es que ese rol lo tenga una persona mediadora neutral, con su propia llave, distinta de la cuenta de Lockumi.
e) **Importante:** mientras Lockumi tenga el rol de resolver disputas, técnicamente puede repartir el saldo en disputa a cualquier cuenta. Nos comprometemos a repartirlo solo entre las cuentas del dueño y del inquilino, según las reglas de la cláusula 6, y a dejar constancia de cada reparto.

## 5. Servicios de terceros
5.1 **Trustless Work**, operado por Permissionless Escrows Inc. (Delaware, Estados Unidos), da la infraestructura del contrato digital de garantía. No es parte de tu relación con Lockumi, y sus servicios se rigen por sus propios términos (https://www.trustlesswork.com/privacy-policy).
5.2 **Comisión:** Trustless Work cobra una comisión del **0,3 % sobre cada liberación** de fondos, que se descuenta automáticamente del monto liberado (https://www.trustlesswork.com/pricing). En la demo, esa comisión se aplica **con tokens de prueba sin valor**. Por ejemplo, si se liberan 2 USDC de prueba, quien recibe obtiene 1,994. En un servicio real, antes de firmar se informaría quién paga la comisión y el monto exacto.
<!-- LEGAL: revisado (24/10) · ronda 9b (5.3 a, b, d y e; texto exacto de Legal, opción a) -->
5.3 **Firmas.** Lockumi no tiene las llaves de tu propia billetera (Cavos o Freighter). Sí guarda en su servidor las llaves de las cuentas de prueba rotuladas: la del dueño de prueba y, si usas el USDC de prueba que te da Lockumi, la de tu cuenta de inquilino de prueba (cláusula 4.1). Lockumi firma con ellas cuando alguien toca el botón en la app. Quién firma cada paso en la red de prueba:
a) **Depósito:** si usas tu propio USDC de prueba, lo firmas tú con tu billetera. Si no, Lockumi lo firma con tu cuenta de inquilino de prueba (4.1 b). Si falla la firma de tu billetera, Lockumi puede firmarlo con una cuenta de inquilino de prueba de respaldo (4.1 c).
b) **Compra de USDC de prueba:** la firmas tú con tu billetera. Abrir la línea de USDC en tu billetera no mueve fondos; según la billetera, puede pedirte o no que lo confirmes.
c) **Aprobación de la devolución:** en la fase 1, Lockumi la firma con la cuenta del dueño de prueba (4.2 a). En la fase 2, la firmará la billetera del dueño.
d) **Liberación:** la firma la cuenta de plataforma de Lockumi, solo después de la aprobación y solo a favor del inquilino (4.1.1 y 4.2 b). Si no hay reclamo, después del plazo la devolución se ejecuta la próxima vez que alguien abre el alquiler, sin que nadie más tenga que aprobarla. Si nadie aprobó antes, en ese momento Lockumi firma la aprobación con la cuenta del dueño de prueba.
e) **Reclamos:** en la demo, el reclamo abre una disputa en la red de prueba y bloquea el depósito de prueba. Lockumi la firma con la cuenta del dueño de prueba, que es distinta de la cuenta de Lockumi que resuelve disputas (4.2 c). La persona mediadora es simulada: el reparto se elige con el botón «Resolver el reclamo (simulación)» (cláusula 6.7) y lo ejecuta en la red la cuenta de Lockumi que resuelve disputas. En un servicio real, ni la persona mediadora ni una sugerencia automática decidirán: si no hay acuerdo, el depósito seguirá bloqueado y las partes podrán ir a conciliación, a arbitraje si ambas lo firman o a los tribunales.
f) Cavos permite que una app firme pagos pequeños con tu billetera sin pedirte confirmación, dentro de un límite por transacción y por día. Lockumi no usa esa función.
5.4 **Recuperación de la cuenta:** la app **no configura ningún método de recuperación** en Cavos. **Si pierdes todos tus aparatos, no podrás recuperar el acceso a tu billetera**, ni Lockumi podrá hacerlo por ti (https://docs.cavos.xyz/docs/recovery). En la demo eso no te causa una pérdida económica, porque la billetera no tiene valor, pero perderías el acceso a tus alquileres simulados y a los tokens de prueba de esa billetera.
5.5 **Obtener USDC de prueba.** Tienes dos opciones:
a) **USDC de prueba que te da Lockumi, sin valor:** hasta **20 USDC de prueba**. Esos tokens **no van a tu billetera**: quedan en una cuenta de inquilino de prueba rotulada que controla Lockumi, que firma el depósito por esa cuenta. Solo sirven para los contratos digitales de la demo y no los puedes retirar ni enviar a otra cuenta.
b) **Usar mi propio USDC de prueba:** el de tu billetera de Cavos o de Freighter (cláusula 5.5.1). la app te ayuda a recibir XLM de prueba de **Friendbot** (un servicio público de la red de prueba), a habilitar el USDC de prueba en tu billetera (trustline) y a comprar USDC de prueba en el exchange descentralizado de la red de prueba. Firmas tú cada paso. Con tu propio USDC de prueba, el depósito puede ser de hasta 50 000 USDC de prueba.
En ambos casos, el USDC de prueba **no es dinero real y no tiene valor**. Friendbot y el exchange descentralizado son servicios de terceros, que Lockumi no controla.
<!-- LEGAL: revisado (24/10) · 5.3 ronda 9 (5.5.1 b) -->
5.5.1 **Freighter (opcional).** En «Usar mi propio USDC de prueba» puedes elegir «Usar Freighter», una billetera de un tercero, la Stellar Development Foundation (https://www.freighter.app/terms). Si la usas: a) la app solo recibe la dirección pública de tu billetera; b) cuando usas Freighter, las transacciones que firma tu billetera (el depósito y la compra de USDC de prueba) las confirmas tú en la extensión; las demás las firma Lockumi (ver 5.3), y **Lockumi nunca ve tu clave privada**; c) Freighter se rige por sus propios términos, y **Lockumi no la controla ni responde por ella**; d) **si pierdes tu clave, Lockumi no puede recuperarla**; e) en esta demo, úsala **solo en la red de prueba**, nunca en la red principal ni con activos reales.
5.6 Lockumi elige a estos proveedores con cuidado, pero no controla cómo funcionan. Si un tercero falla, Lockumi te avisará en cuanto lo sepa y hará lo razonable para resolverlo dentro de la demo.

5.7 **Riesgos de la red de prueba.** Los tokens de prueba **pueden perderse**. La red de prueba **se reinicia periódicamente** y, cuando eso pasa, se borran sus cuentas, saldos y contratos. **No envíes dinero ni activos reales a ninguna cuenta de la demo**, porque podrías perderlos y Lockumi no podría devolverlos.

## 6. Reglas de la simulación: retención y devolución
Estas reglas describen cómo funciona la simulación. En la demo no generan derechos ni obligaciones reales. Las reglas, los reclamos y la mediación son simulados, pero **la liberación del depósito en la red de prueba es real**.
6.1 **Inventario.** Al inicio, ambas partes firman en la app el inventario de entrada, con fotos de cada ambiente. Al terminar, se hace el inventario de salida. Si no hay un inventario de entrada firmado por ambas partes, la simulación no permite retener por daños. Si el inquilino no hace el inventario de salida, el dueño puede hacerlo solo y el inquilino puede objetarlo.
6.2 **Motivos de retención (lista cerrada).** Solo se puede retener por: a) daños causados por el inquilino o por quienes viven con él o lo visitan, más allá del desgaste normal, comparando las fotos de entrada y de salida; b) faltantes de elementos del inventario de entrada, a su valor menos la depreciación; c) limpieza para volver al estado documentado al inicio, al costo real y con un tope; d) reparaciones que el contrato de alquiler asigne expresamente al inquilino; e) alquiler pendiente hasta el día de la entrega, con comprobante; f) servicios o cuotas de condominio a cargo del inquilino, con el recibo del proveedor.
<!-- LEGAL: revisado (24/10) · ronda 9b (6.3 f) -->
6.3 **Motivos de devolución.** Se devuelve: a) lo que corresponda al desgaste normal y al paso del tiempo; b) lo que se deba a vicios o defectos del inmueble, caso fortuito o fuerza mayor; c) las reparaciones que le corresponden al dueño; d) todo el depósito, si el dueño no reclama a tiempo; e) cualquier monto que se reclame sin pruebas o que supere el costo justificado; f) la parte no reclamada, cuando se cierre el reclamo. En la demo, mientras hay un reclamo, todo el depósito de prueba queda bloqueado en la cuenta segura, porque la cuenta segura que usa Lockumi no permite liberarlo por partes.
6.4 **Pruebas.** Cada monto reclamado debe indicar su motivo e ir acompañado de las fotos y de una factura o un presupuesto.
<!-- LEGAL: revisado (24/10) · 6.5, ronda 5 -->
6.5 **Plazos.** El dueño tiene **7 días naturales** desde la entrega de las llaves para reclamar. Si no reclama, después de ese plazo se libera todo al inquilino. El inquilino tiene **7 días naturales** para responder. Si no responde, se entiende que **no acepta** el reclamo. La demo permite adelantar el tiempo para mostrar estos plazos.
6.6 **Tope.** Lo retenido nunca supera el depósito.
<!-- LEGAL: revisado (24/10) · 6.7 con el texto de Legal (ronda 2) -->
6.7 **Desacuerdo.** En la demo, si el inquilino no acepta el reclamo, el caso pasa a una mediación simulada y el reparto se elige con el botón «Resolver el reclamo (simulación)». En un servicio real, una persona mediadora neutral les ayudaría a buscar un acuerdo, sin decidir por las partes. Si no hay acuerdo, el depósito seguiría guardado y cualquiera de las partes podría acudir a los tribunales de Costa Rica.

## 7. Uso aceptable
No está permitido: a) intentar usar la app con la red principal de Stellar o con activos reales, o enviar fondos reales a las cuentas de la demo; b) usar la app para alquileres o depósitos reales, ni para hacerle creer a otra persona que la demo tiene valor; c) subir fotos de personas, documentos de identidad, datos sensibles o contenido ilegal u ofensivo; d) intentar vulnerar la seguridad de la app, de sus proveedores o de la red; e) automatizar el uso de la app de forma abusiva; f) hacerse pasar por otra persona. Si alguien incumple estas reglas, Lockumi puede suspender su acceso a la demo y le informará el motivo.

## 8. Propiedad intelectual
La marca Lockumi, el logo, los textos, el diseño y el código de la app pertenecen a sus titulares. Puedes usar la app para probarla, pero no puedes copiar, modificar ni distribuir esos elementos sin permiso por escrito. Las fotos que subas siguen siendo tuyas. Nos das permiso para guardarlas y mostrarlas a la otra parte del alquiler simulado y a la persona mediadora simulada, solo para que la demo funcione.

## 9. Responsabilidad
9.1 La app se ofrece como demostración, de forma gratuita, y puede tener errores o interrupciones. Como en la demo no se usa dinero real, no deberías sufrir pérdidas económicas por usarla.
9.2 Lockumi responde por los daños que cause, conforme a la ley costarricense. Nada en estos términos limita los derechos que te da la Ley 7472, de Promoción de la Competencia y Defensa Efectiva del Consumidor, ni la responsabilidad que la ley no permite excluir.
9.3 Lockumi no responde por el funcionamiento ni por los reinicios de la red de prueba, ni por Friendbot ni el exchange descentralizado, ni de los servicios de terceros de la cláusula 5, salvo en la medida en que el daño se deba a su propia falta.

## 10. Rendimiento, intereses e inversión
10.1 **Lockumi no ofrece rendimiento, intereses ni inversión de los depósitos.** Nada en estos términos ni en la app es una oferta, una recomendación ni una invitación a invertir.
10.2 **Función futura, NO disponible.** Lockumi está evaluando, sin fecha, una función opcional que destinaría el depósito a un protocolo de préstamos en USDC (Blend) mientras dure el alquiler. Se describe aquí solo para informar. **Hoy no está activa en la demo ni en ningún otro lugar, y no se puede contratar.**
a) **Reparto que se está evaluando:** si algún día hubiera rendimiento, se repartiría así: 40 % para el inquilino, 40 % para el dueño y 20 % para Lockumi. El rendimiento sería **variable y no garantizado**, podría ser cero y **podría haber pérdida** de parte del depósito o de todo.
b) **Riesgos:** fallas o ataques al protocolo o al contrato digital; riesgo del emisor del USDC y de las demás contrapartes; falta de liquidez, que podría retrasar la devolución del depósito al terminar el alquiler. El USDC **no es moneda de curso legal** en Costa Rica, según el Banco Central de Costa Rica. No es un depósito bancario y **no tiene garantía de depósitos**.
c) **Aceptación por separado:** solo se activaría si el dueño y el inquilino la aceptan **cada uno por separado y de forma expresa**, con términos propios. Cualquiera de los dos podría retirarse según esos términos.
d) **Condición regulatoria:** **no se activará sin una revisión legal profesional ni sin un análisis regulatorio.** Ese análisis incluiría, entre otros temas, la regulación de la intermediación financiera (Ley 7558), del mercado de valores (Ley 7732) y de los proveedores de servicios de activos virtuales (Ley 7786), y, si corresponde, la autorización de la autoridad competente.

## 11. Datos personales
El tratamiento de tus datos se explica en el **Aviso de privacidad de la app**: https://app.lockumi.com/privacidad. En la fase 1, el lugar y las fotos se quedan en tu navegador. En la red de prueba quedan registrados, de forma pública y permanente, las direcciones de las cuentas, los montos, las fechas, un título fijo y un identificador interno. No se registran tu nombre, tu correo, tus fotos ni la dirección del inmueble: de las fotos solo va su huella digital SHA-256.

## 12. Cambios
Podemos cambiar estos términos para reflejar cambios en la demo o en la ley. Publicaremos cada nueva versión con su fecha en https://app.lockumi.com/terminos y te avisaremos en la app antes de que entre a regir. Si el cambio te afecta de forma importante, te pediremos que lo aceptes de nuevo. Si no estás de acuerdo, puedes dejar de usar la app y pedir que borremos tus datos.

## 13. Ley aplicable y tribunales
Estos términos se rigen por las leyes de la República de Costa Rica. Cualquier controversia se someterá a los tribunales de Costa Rica, sin perjuicio de los derechos que la ley te dé como consumidor ni de la posibilidad de acudir a la Comisión Nacional del Consumidor o a un mecanismo de resolución alterna de conflictos, si ambas partes lo aceptan.

## 14. Contacto
Para dudas, reclamos o para ejercer tus derechos: **business.applockumi@gmail.com**.
