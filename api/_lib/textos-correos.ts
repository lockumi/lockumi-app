// TODOS los textos de los correos de Lockumi (escenario C: COR-C-00 a COR-C-09, más los pies y notas comunes que también usa B).
// Lista y disparadores: docs/correos-c.md. Fuente de los textos: legal/correos-escenario-c.md (borrador de Legal, 25/10/2026 4:12 p. m.).
//
// REGLA DURA: ningún texto marcado «LEGAL: revisar» sale en un correo real. Cada plantilla lleva su marca en `legal` Y en el
// comentario de la línea anterior (un test exige que coincidan). Con alguna marca:
//   * enviar falla (revisarTextos en api/_lib/correos-c.ts), salvo la excepción local LOCKUMI_CORREOS_BORRADOR=1 fuera de Vercel,
//     y entonces solo al buzón de prueba;
//   * el build de producción falla (guardaCorreos en vite.config.ts, VERCEL_ENV=production).
// Para aprobar un texto: Legal lo confirma, se cambia `legal: 'revisar'` por `legal: 'revisado'` y el comentario por «LEGAL: revisado (fecha)».
import { fechaHoraCR, fechaCR, horaCR } from './plazos.js'
import { repartoCentimos } from './centimos.js'

// LEGAL: revisado (25/10, lista de Legal) · nota de demo arriba del texto
export const DEMO = 'Demo en la red de prueba: sin dinero real.'
// LEGAL: revisado (24/10) · pie común (LEGAL-correos-2104.md, punto 3)
export const PIE = 'Lockumi · Demo en la red de prueba de Stellar, sin dinero real. Nada de lo que pasa en esta demo tiene efecto legal. Este es un aviso del servicio, no publicidad. Lockumi nunca te pedirá por correo tu contraseña, tu frase secreta ni tus claves. Esta dirección no recibe respuestas; para consultas: business.applockumi@gmail.com.'
// LEGAL: revisado (24/10, 11:29 p. m.) · pie solo de los avisos (no de la invitación)
export const PIE_BAJA = 'Para dejar de recibir estos avisos, desmarca la casilla en la app; seguirás viéndolos dentro de la app.'
// LEGAL: revisado (24/10, 11:51 p. m.) · la nota de «Todo bien, devolver» solo va en el correo que tiene ese botón
export const NOTA_CONFIRMAR = 'Los botones abren la app. «Todo bien, devolver» abre la confirmación: nunca devuelve el depósito con un solo toque.'
// LEGAL: revisado (24/10, 11:51 p. m.)
export const NOTA_UN_BOTON = 'El botón abre la app. Desde el correo no se acepta ni se devuelve nada.'
// LEGAL: revisado (24/10, 11:29 p. m.) · correo del reclamo de B, según lo registrado al firmar (regla aceptada o no)
export const RECLAMO_CON_REGLA = 'Si no respondes a tiempo y abriste al menos un aviso, se aplicará la propuesta automática (máximo el 30 % del depósito de prueba, solo con pruebas completas).'
// LEGAL: revisado (24/10, 11:29 p. m.)
export const RECLAMO_SIN_REGLA = 'Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo).'
// LEGAL: revisado (25/10, lista de Legal) · COR-C-00 asunto de la invitación
export const ASUNTO_INVITACION = 'Te invitaron a un alquiler de ejemplo en la demo de Lockumi'
/** Nombre por defecto de quien invita (sin nombre visible). En minúscula: va a mitad de la frase (Legal 25/10, 5:01 p. m., punto 3). */
export const NOMBRE_INVITACION = 'el dueño'
// LEGAL: revisado (24/10) · COR-C-00 invitación, arriba del botón
export const textoInvitacion = (nombre: string, rol: 'dueno' | 'inquilino') =>
  `Recibes este correo porque ${nombre} escribió tu correo para invitarte como ${rol === 'dueno' ? 'dueño' : 'inquilino'} a un alquiler de ejemplo en la demo de Lockumi. Usamos tu correo solo para esta invitación y para los avisos de ese alquiler. Si no quieres participar, ignora este correo: el enlace vence en 7 días. Puedes pedir que borremos tu correo cuando quieras.`
// LEGAL: revisado (24/10) · COR-C-00 botón
export const BOTON_INVITACION = 'Abrir la demo de Lockumi'

// ── Formatos (iguales a la app: montoPrueba de src/prueba/dosPersonas.ts y fechaHoraCR de plazos.ts) ──
const COMISION = 0.003
// Legal 25/10 5:09 p. m. (punto 8): los montos siempre con 2 decimales («0,50»).
const fmt = (n: number) => n.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const r7 = (n: number) => Math.round(n * 1e7) / 1e7
export const usdc = (n: number) => `${fmt(n)} USDC de prueba`
export const llega = (n: number) => r7(n * (1 - COMISION))
export const fechaHora = (t: number) => `${fechaHoraCR(t)}, hora de Costa Rica`
export { horaCR }

export type IdCorreo = 'COR-C-00' | 'COR-C-01' | 'COR-C-02' | 'COR-C-03' | 'COR-C-04' | 'COR-C-05' | 'COR-C-06' | 'COR-C-07' | 'COR-C-08' | 'COR-C-09'
export interface DatosCorreo {
  deposito?: number; reclamado?: number; vence?: number; auto?: boolean; abierto?: boolean; motivo?: 'rechazo' | 'silencio'
  dueno?: number; inquilino?: number; pedidoEn?: number; eliminadoEn?: number; limite?: number
}
export type Destino = 'alquiler' | 'devolver' | 'reclamo'
export interface Plantilla {
  id: IdCorreo
  /** 'revisar' = borrador: nunca sale en un correo real. */
  legal: 'revisar' | 'revisado'
  asunto: (d: DatosCorreo) => string
  cuerpo: (d: DatosCorreo) => string
  botones: { texto: string; destino: Destino }[]
  nota: 'uno' | 'confirmar' | null
  /** PIE_BAJA: solo en los avisos que dependen de la casilla. */
  baja: boolean
}
const m = (n?: number) => usdc(n ?? 0)
const f = (t?: number) => fechaHora(t ?? 0)
// En céntimos: las partes mostradas suman exactamente el depósito (api/_lib/centimos.ts)
const rc = (d: DatosCorreo) => repartoCentimos(d.dueno ?? 0, d.inquilino ?? 0)
const reparto = (d: DatosCorreo) => `${m(rc(d).dueno)} al dueño y ${m(rc(d).inquilino)} al inquilino`
const llegan = (d: DatosCorreo) => `Llegan ${m(rc(d).llegaDueno)} al dueño y ${m(rc(d).llegaInquilino)} al inquilino`
const comision = (d: DatosCorreo) => m(rc(d).comision)
const REVISAR_Y_RECLAMAR = [{ texto: 'Revisar y reclamar', destino: 'alquiler' as const }, { texto: 'Todo bien, devolver', destino: 'devolver' as const }]

/** Plantillas de C por clave «COR-C-0x/variante». Cada una con su marca de Legal en el comentario de arriba. */
export const TEXTOS: Record<string, Plantilla> = {
  // LEGAL: revisado (25/10) · COR-C-01 versión del dueño (= su recordatorio del día 1). legal/correos-escenario-c.md §3
  'COR-C-01/dueno': { id: 'COR-C-01', legal: 'revisado', baja: true, nota: 'confirmar', botones: REVISAR_Y_RECLAMAR,
    asunto: () => 'Tienes 7 días naturales para revisar la casa y reclamar',
    cuerpo: d => `${d.auto ? 'Como no confirmaste «Recibí la casa», tu plazo empezó automáticamente 2 días después de la entrega registrada. ' : ''}Empezó tu plazo para revisar la casa y, si hace falta, reclamar del depósito de prueba de ${m(d.deposito)}. Vence el ${f(d.vence)}. Solo se puede reclamar por daños o faltantes con pruebas, nunca por el desgaste normal (Anexo 6-A). Si todo está bien, puedes tocar «Todo bien, devolver». Si el plazo vence sin reclamo, se devuelve todo el depósito de prueba al inquilino. La devolución es automática: el 100 % al inquilino, menos el 0,3 % de comisión de Trustless Work, y puede tardar hasta 24 horas después de que vence el plazo. No la decide una persona ni pasa a la Mediación Lockumi (demo).` },
  // LEGAL: revisado (25/10) · COR-C-01 versión del inquilino
  'COR-C-01/inquilino': { id: 'COR-C-01', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Ver el alquiler', destino: 'alquiler' }],
    asunto: () => 'Empezó el plazo del dueño para revisar la casa',
    cuerpo: d => `${d.auto ? 'Pasaron 2 días desde la entrega registrada.' : 'El dueño confirmó que recibió la casa.'} Empezó su plazo de 7 días naturales para revisar la casa y, si hace falta, reclamar de tu depósito de prueba de ${m(d.deposito)}. Vence el ${f(d.vence)}. Solo puede reclamar por daños o faltantes con pruebas, nunca por el desgaste normal (Anexo 6-A). Si reclama, verás el reclamo en la app y tendrás 7 días naturales para responder. Si el dueño no aprueba ni reclama antes de que venza su plazo, se te devuelve automáticamente el 100 % del depósito de prueba, menos el 0,3 % de comisión de Trustless Work. Puede tardar hasta 24 horas después de que vence el plazo. No lo decide una persona. Por ahora no tienes que hacer nada.` },
  // LEGAL: revisado (25/10, 5:31 p. m., OK para publicar C) · COR-C-02 día 4 (dueño): texto aprobado de dueno-4 (avisos.ts:35) + frase de C; se cuenta hacia atrás desde {vence} (P-03)
  'COR-C-02/d4': { id: 'COR-C-02', legal: 'revisado', baja: true, nota: 'confirmar', botones: REVISAR_Y_RECLAMAR,
    asunto: () => 'Te quedan 3 días para revisar y reclamar',
    cuerpo: d => `Te quedan 3 días para revisar y reclamar. Vence el ${f(d.vence)}. Después, el depósito de prueba se devuelve completo al inquilino. La devolución es automática, menos el 0,3 % de comisión de Trustless Work, y puede tardar hasta 24 horas después de que vence el plazo.` },
  // LEGAL: revisado (25/10, 5:31 p. m., OK para publicar C) · COR-C-02 día 6 (dueño): texto aprobado de dueno-6 (avisos.ts:36) + frase de C; el día antes de {vence} (P-03)
  'COR-C-02/d6': { id: 'COR-C-02', legal: 'revisado', baja: true, nota: 'confirmar', botones: REVISAR_Y_RECLAMAR,
    asunto: () => 'Último aviso: tu plazo para reclamar vence mañana',
    cuerpo: d => `Último aviso: tu plazo para reclamar vence mañana, ${f(d.vence)}. Si no reclamas, el depósito de prueba se devuelve completo al inquilino. La devolución es automática, menos el 0,3 % de comisión de Trustless Work, y puede tardar hasta 24 horas después de que vence el plazo.` },
  // LEGAL: revisado (25/10) · COR-C-03 aviso del reclamo al inquilino. Sin «por: {rubros}»: C guarda un motivo de texto libre, no rubros, y los correos no llevan texto libre.
  'COR-C-03': { id: 'COR-C-03', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Ver el reclamo', destino: 'reclamo' }],
    asunto: () => 'Tienes un reclamo sobre tu depósito de prueba: 7 días naturales para responder',
    cuerpo: d => `El dueño reclamó ${m(d.reclamado)} de tu depósito de prueba de ${m(d.deposito)}. Responde antes del ${f(d.vence)}. Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo). En la app puedes aceptar el reclamo o no aceptarlo. Si lo aceptas, el dueño recibe ${m(d.reclamado)} y tú el resto, cada monto menos el 0,3 % de comisión de Trustless Work. Si no lo aceptas o no respondes, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. El silencio no significa que aceptes el reclamo. Cuando abres el reclamo, desde este botón o desde la app, la app registra la fecha y la hora de la primera vez que lo abres, y lo anota en el historial del alquiler, que también ve el dueño. En esta versión, ese registro no cambia lo que pasa con el depósito de prueba. Siempre puedes ir a los tribunales.` },
  // LEGAL: revisado (25/10) · COR-C-04 día 4 (inquilino)
  'COR-C-04/d4': { id: 'COR-C-04', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Responder', destino: 'reclamo' }],
    asunto: d => `Te quedan 3 días para responder el reclamo de ${m(d.reclamado)}`,
    cuerpo: d => `Te quedan 3 días para responder el reclamo de ${m(d.reclamado)} sobre tu depósito de prueba de ${m(d.deposito)}. Vence el ${f(d.vence)}. Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. El silencio no significa que aceptes el reclamo.` },
  // LEGAL: revisado (25/10, 5:31 p. m., OK para publicar C) · COR-C-04 día 6 (inquilino): texto aprobado de reclamo-6 + frase de C; el día antes de {vence} (P-03)
  'COR-C-04/d6': { id: 'COR-C-04', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Responder ahora', destino: 'reclamo' }],
    asunto: () => 'Último aviso: tu plazo vence mañana',
    cuerpo: d => `Último aviso: tu plazo vence mañana, ${f(d.vence)}. Si no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. El silencio no significa que aceptes el reclamo.${d.abierto ? ' La app registra que abriste el reclamo.' : ''} Siempre puedes ir a los tribunales.` },
  // LEGAL: revisado (25/10) · COR-C-05 paso a la mediación, versión para las partes (la frase del plazo de 3 días hábiles es P-06)
  'COR-C-05/partes': { id: 'COR-C-05', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Ver el caso', destino: 'alquiler' }],
    asunto: d => `${d.motivo === 'rechazo' ? 'El inquilino no aceptó el reclamo' : 'Venció el plazo para responder'}: el caso pasa a la Mediación Lockumi (demo)`,
    cuerpo: d => `${d.motivo === 'rechazo' ? `El inquilino no aceptó el reclamo de ${m(d.reclamado)}.` : `Venció el plazo para responder el reclamo de ${m(d.reclamado)} y el inquilino no respondió. El silencio no significa que acepte el reclamo.`} El caso pasa a la Mediación Lockumi (demo), sin costo. Una persona del equipo de Lockumi puede ayudarles a buscar un acuerdo. No decide por ustedes. No es mediadora certificada ni neutral: es parte de Lockumi, que no gana nada con el resultado del reclamo. Responde en un plazo de 3 días hábiles: hasta el ${f(d.vence)}. En la app, cada parte elige el reparto que acepta. El reparto solo se aplica si las dos partes aceptan el mismo, y cada monto se paga menos el 0,3 % de comisión de Trustless Work. Mientras no haya acuerdo, el monto reclamado sigue retenido, y cualquiera de las dos partes puede acudir a los tribunales de Costa Rica o a otro mecanismo que la ley permita. La Mediación Lockumi (demo) no tiene efecto legal y no es una mediación en el sentido de la Ley 7727.` },
  // LEGAL: revisado (25/10) · COR-C-05 versión mínima para la persona mediadora (sin nombres, correos, dirección ni fotos)
  'COR-C-05/mediacion': { id: 'COR-C-05', legal: 'revisado', baja: false, nota: 'uno', botones: [{ texto: 'Abrir el caso', destino: 'alquiler' }],
    asunto: () => 'Nuevo caso en la Mediación Lockumi (demo)',
    cuerpo: d => `Un alquiler de ejemplo pasó a la Mediación Lockumi (demo). Motivo: ${d.motivo === 'rechazo' ? 'el inquilino no aceptó el reclamo' : 'venció el plazo del inquilino para responder'}. Reclamado: ${m(d.reclamado)} de un depósito de prueba de ${m(d.deposito)}. Plazo para responder: ${f(d.vence)} (3 días hábiles). Abre el caso en la app para ver el reclamo, la respuesta y las fotos. Recuerda: no decides por las partes. Solo puedes registrar el acuerdo cuando las dos partes aceptaron en la app el mismo reparto. Lo que veas en este caso es confidencial: úsalo solo para este reclamo, no lo compartas con terceros ni lo copies fuera de la app. Aunque la Mediación Lockumi (demo) no es una mediación de la Ley 7727, seguimos el mismo deber de confidencialidad que esa ley pide a quien media.` },
  // LEGAL: revisado (25/10) · COR-C-05 «recordatorio» (P-06, texto provisional de Producto): queda 1 día del plazo de la mediación
  'COR-C-05/recordatorio': { id: 'COR-C-05', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Ver el caso', destino: 'alquiler' }],
    asunto: () => 'Mañana vence el plazo de la Mediación Lockumi (demo)',
    cuerpo: d => `El plazo de 3 días hábiles de la Mediación Lockumi (demo) vence mañana, ${f(d.vence)}. Si quieren llegar a un acuerdo, cada parte elige en la app el reparto que acepta; el reparto solo se aplica si las dos partes aceptan el mismo. Si vence sin acuerdo, no se paga nada: el monto reclamado de ${m(d.reclamado)} sigue retenido y la mediación sigue abierta.` },
  // LEGAL: revisado (25/10) · COR-C-05 «recordatorio», versión para la persona mediadora
  'COR-C-05/recordatorio-mediacion': { id: 'COR-C-05', legal: 'revisado', baja: false, nota: 'uno', botones: [{ texto: 'Abrir el caso', destino: 'alquiler' }],
    asunto: () => 'Mañana vence el plazo de un caso de la Mediación Lockumi (demo)',
    cuerpo: d => `El plazo de 3 días hábiles de un caso de la Mediación Lockumi (demo) vence mañana, ${f(d.vence)}. Reclamado: ${m(d.reclamado)} de un depósito de prueba de ${m(d.deposito)}. Recuerda: no decides por las partes, y lo que veas en este caso es confidencial.` },
  // LEGAL: revisado (25/10, 5:31 p. m., OK para publicar C) · COR-C-06 resultado de la mediación (incluye la frase del borrado a los 30 días; P-09: frase completa de la Privacidad, Legal 25/10 5:09 p. m.)
  'COR-C-06/partes': { id: 'COR-C-06', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Ver el resultado', destino: 'alquiler' }],
    asunto: () => 'Se registró el acuerdo de la Mediación Lockumi (demo)',
    cuerpo: d => `Las dos partes aceptaron en la app el mismo reparto del depósito de prueba de ${m(d.deposito)}, y la persona mediadora lo registró. La persona mediadora no decidió el reparto: solo lo registró con las dos aceptaciones. Reparto: ${reparto(d)}, cada monto menos el 0,3 % de comisión de Trustless Work. ${llegan(d)}; Trustless Work descuenta ${comision(d)}, y Lockumi no recibe nada. El reparto se paga en la red de prueba en cuanto la red lo confirme. Esto no es una sentencia ni una decisión de Lockumi, y no tiene efecto legal: es lo que las dos partes aceptaron dentro de la demo, según las reglas de los Términos (cláusulas 2.2 b y 6.8 e). Cualquiera de las dos partes puede acudir a los tribunales de Costa Rica. Borramos los datos de la mediación 30 días después de cerrar el caso, salvo que una de las partes nos pida guardarlos para un reclamo fuera de la app.` },
  // LEGAL: revisado (25/10) · COR-C-06 «sin acuerdo» (P-06, texto provisional de Producto): venció el plazo de la mediación
  'COR-C-06/vencida': { id: 'COR-C-06', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Ver el caso', destino: 'alquiler' }],
    asunto: () => 'Venció el plazo de la Mediación Lockumi (demo) sin acuerdo',
    cuerpo: d => `Venció el plazo de 3 días hábiles de la Mediación Lockumi (demo), el ${f(d.vence)}, sin que las dos partes aceptaran el mismo reparto. No se pagó nada y no se aplicó ninguna regla: el monto reclamado de ${m(d.reclamado)} sigue retenido. La mediación sigue abierta: si las dos partes aceptan en la app el mismo reparto, la persona mediadora lo registra y se paga, cada monto menos el 0,3 % de comisión de Trustless Work. Cualquiera de las dos partes puede acudir a los tribunales de Costa Rica.` },
  // LEGAL: revisado (25/10) · COR-C-06 «sin acuerdo», versión para la persona mediadora
  'COR-C-06/vencida-mediacion': { id: 'COR-C-06', legal: 'revisado', baja: false, nota: 'uno', botones: [{ texto: 'Abrir el caso', destino: 'alquiler' }],
    asunto: () => 'Venció sin acuerdo el plazo de un caso de la Mediación Lockumi (demo)',
    cuerpo: d => `Venció el plazo de 3 días hábiles de un caso de la Mediación Lockumi (demo), el ${f(d.vence)}, sin el mismo reparto aceptado por las dos partes. No se pagó nada: el monto reclamado de ${m(d.reclamado)} sigue retenido y el caso sigue abierto. Recuerda: no decides por las partes, y lo que veas en este caso es confidencial.` },
  // LEGAL: revisado (25/10) · COR-C-07 a) el dueño aprobó
  'COR-C-07/devuelto': { id: 'COR-C-07', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Ver el alquiler', destino: 'alquiler' }],
    asunto: () => 'Se devolvió todo el depósito de prueba al inquilino',
    cuerpo: d => `El dueño tocó «Todo bien, devolver». Se devuelve al inquilino todo el depósito de prueba de ${m(d.deposito)}, menos el 0,3 % de comisión de Trustless Work: llegan ${m(llega(d.deposito ?? 0))}. El dueño y Lockumi no reciben nada. Se entrega en cuanto la red de prueba lo confirme. El dueño ya no puede reclamar en la app.` },
  // LEGAL: revisado (25/10) · COR-C-07 b) el dueño no aprobó ni reclamó
  'COR-C-07/automatico': { id: 'COR-C-07', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Ver el alquiler', destino: 'alquiler' }],
    asunto: () => 'Venció el plazo sin reclamo: se devolvió el 100 % del depósito de prueba al inquilino',
    cuerpo: d => `El dueño no aprobó ni reclamó dentro de su plazo. El sistema de Lockumi abrió una disputa en la red de prueba solo para poder devolver el depósito de prueba, y otra cuenta de Lockumi, la que resuelve disputas, entregó el 100 % al inquilino: ${m(d.deposito)}, menos el 0,3 % de comisión de Trustless Work. Llegan ${m(llega(d.deposito ?? 0))}. El dueño y Lockumi no reciben nada. Ninguna persona decidió este reparto.` },
  // LEGAL: revisado (25/10) · COR-C-07 c) el inquilino aceptó el reclamo (P-07)
  'COR-C-07/acuerdo': { id: 'COR-C-07', legal: 'revisado', baja: true, nota: 'uno', botones: [{ texto: 'Ver el alquiler', destino: 'alquiler' }],
    asunto: () => 'El inquilino aceptó el reclamo: se repartió el depósito de prueba',
    cuerpo: d => `El inquilino aceptó el reclamo de ${m(d.dueno)}. Reparto del depósito de prueba de ${m(d.deposito)}: ${reparto(d)}, cada monto menos el 0,3 % de comisión de Trustless Work. ${llegan(d)}. Lockumi no recibe nada. Se paga en la red de prueba en cuanto la red lo confirme. Es lo que las dos partes aceptaron en la app; no tiene efecto legal, y cualquiera de las dos puede acudir a los tribunales de Costa Rica.` },
  // LEGAL: revisado (25/10) · COR-C-08 variante A (sin alquiler abierto). Correo de servicio: no depende de la casilla.
  'COR-C-08/A': { id: 'COR-C-08', legal: 'revisado', baja: false, nota: null, botones: [],
    asunto: () => 'Recibimos tu pedido para eliminar tu cuenta de Lockumi',
    cuerpo: d => `Recibimos tu pedido para eliminar tu cuenta. Lo pediste el ${fechaCR(d.pedidoEn ?? 0)} a las ${horaCR(d.pedidoEn ?? 0)} (hora de Costa Rica). Tu perfil ya no se muestra, y eliminamos tu cuenta en un máximo de 5 días hábiles. Fecha límite: ${fechaCR(d.limite ?? 0)}. Borramos tus datos de reputación (puntaje, insignias, perfil y el historial que alimenta el puntaje), y no se pueden recuperar. Los datos del contrato y del depósito de prueba siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar. Esta solicitud no se puede deshacer. Si no hiciste este pedido, escríbenos a business.applockumi@gmail.com.` },
  // LEGAL: revisado (25/10) · COR-C-08 variante B (con un alquiler abierto)
  'COR-C-08/B': { id: 'COR-C-08', legal: 'revisado', baja: false, nota: null, botones: [],
    asunto: () => 'Recibimos tu pedido para eliminar tu cuenta de Lockumi',
    cuerpo: d => `Recibimos tu pedido para eliminar tu cuenta. Lo pediste el ${fechaCR(d.pedidoEn ?? 0)} a las ${horaCR(d.pedidoEn ?? 0)} (hora de Costa Rica). Tienes un alquiler abierto. Tu perfil ya no se muestra, y tu cuenta se eliminará cuando el alquiler se cierre, en un máximo de 5 días hábiles después del cierre. Mientras tanto, solo usamos tus datos para cerrar el alquiler; puedes usar Lockumi para cerrarlo, y la otra parte sigue viendo el contrato y el historial. Los datos del contrato y del depósito de prueba siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar. Esta solicitud no se puede deshacer. Si no hiciste este pedido, escríbenos a business.applockumi@gmail.com.` },
  // LEGAL: revisado (25/10) · COR-C-09 cuenta eliminada. Correo de servicio: no depende de la casilla.
  'COR-C-09': { id: 'COR-C-09', legal: 'revisado', baja: false, nota: null, botones: [],
    asunto: () => 'Eliminamos tu cuenta de Lockumi',
    cuerpo: d => `Eliminamos tu cuenta de Lockumi el ${fechaCR(d.eliminadoEn ?? 0)}, como lo pediste el ${fechaCR(d.pedidoEn ?? 0)}. Borramos tu perfil y tus datos de reputación (puntaje, insignias, perfil y el historial que alimenta el puntaje), y no se pueden recuperar. Los datos del contrato y del depósito de prueba siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar, y no podemos borrar las capturas ni las imágenes que otras personas ya hayan guardado. Este es el último correo sobre tu cuenta. Si tienes una consulta, escríbenos a business.applockumi@gmail.com.` },
}

/** Claves de las plantillas que todavía tienen la marca «LEGAL: revisar». */
export const textosPorRevisar = (claves: string[] = Object.keys(TEXTOS)) => claves.filter(k => TEXTOS[k]?.legal !== 'revisado')
