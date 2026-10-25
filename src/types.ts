export type Rol = 'dueno' | 'inquilino'
export type Estado = 'firmas'|'pendiente_pago'|'fotos_entrada'|'en_curso'|'salida'|'ventana_reclamo'|'reclamo'|'mediacion'|'cerrado'
/** Aceptación de un texto legal: versión aceptada y fecha (ISO 8601). */
export interface AceptacionLegal { version: string; fecha: string; /** paso16-unido: «1.7-demo · 25 de octubre de 2026» (fecha única) */ edicion?: string }
export interface Usuario { email: string; nombre: string; metodo: 'correo'|'google'|'apple'; terminos?: AceptacionLegal; privacidad?: AceptacionLegal }
export interface Evento { fecha: string; texto: string; tx?: string }
/** Foto con su origen. `tomadaEn`: hora en que se tomó o eligió en la app. `fechaArchivo`: la que trae la imagen (si trae).
 *  `huella`: SHA-256 del archivo original, para detectar cambios. `origen`: cámara dentro de la app o archivo. */
export interface Foto { id?: string; ruta?: string; huellaGuardada?: string; src: string; por: Rol; fecha: string; tomadaEn?: number; fechaArchivo?: number; huella?: string; origen?: 'camara' | 'archivo' | 'ejemplo'; posibleGaleria?: boolean }
export type EstadoItem = 'bien' | 'detalle' | null
export interface Cuarto { nombre: string; items: { texto: string; estado: EstadoItem }[]; fotos: Foto[]; nota: string }
export interface Acta { cuartos: Cuarto[]; firmas: Partial<Record<Rol, string>> }
/** Rubro de un reclamo (Términos 1.7-demo, 6.4): un daño o faltante con su motivo, fotos y factura o precio de referencia. */
export interface Rubro {
  id: string
  /** Índice en la tabla de precios de referencia (src/prueba/precios.ts) o -1 si no hay precio de referencia. */
  ref: number; cantidad: number
  /** Motivo de la lista cerrada de la 6.2 (a–f). */
  motivo: 'dano' | 'faltante' | 'limpieza' | 'reparacion' | 'alquiler' | 'servicios'
  descripcion: string
  /** Espacio del acta de entrada con la foto de antes. */
  cuarto: number
  fotos: Foto[]
  /** Factura del dueño (USDC de prueba), opcional si hay precio de referencia. */
  factura?: { monto: number; foto?: Foto }
}
/** Respuesta del inquilino a un rubro: acepta, o lo rechaza con una factura o una cotización (6.4.4). */
export interface RespuestaRubro { acepta: boolean; soporte?: { tipo: 'factura' | 'cotizacion'; monto: number; comercio: string; foto?: Foto } }
/** Aceptación de un reparto (propuesta automática o acuerdo de la Mediación Lockumi (demo)). */
export interface AceptacionReparto { alDueno: number; dueno?: 'si' | 'no'; inquilino?: 'si' | 'no'; fecha: string }
export interface Reclamo {
  monto: number; motivo: string; fotos: Foto[]; fecha: string; respuesta?: 'aceptado' | 'rechazado'
  /** Prueba completa: reclamo por rubros. */
  rubros?: Rubro[]
  /** Cuándo el aviso del reclamo se entregó al inquilino en la app (empieza su plazo de 7 días, 6.5 b). */
  entregado?: string
  /** Primera vez que el inquilino abrió la pantalla del reclamo (cuenta como apertura, B.2 v4). */
  pantallaAbierta?: string
  respuestas?: Record<string, RespuestaRubro>
  /** Propuesta automática (simulación) cuando el inquilino rechaza todo o una parte. */
  propuesta?: AceptacionReparto
  /** Mediación Lockumi (demo): pedida, rechazada o sin cupo; y el acuerdo propuesto con el botón de simulación. */
  mediacion?: { estado: 'pedida' | 'no-usar' | 'sin-cupo'; fecha: string; acuerdo?: AceptacionReparto
    /** Paso 16: cuándo se borraron los datos de la mediación (30 días después del cierre) y si una parte pidió guardarlos. */
    borrado?: string; guardar?: { por: Rol; fecha: string } }
  /** paso16-unido: borrado a los 30 días y pedido de guardar, para todo caso cerrado en la Mediación Lockumi (demo) (en un solo
   *  aparato ya no se «pide»: es la simulación). Los de `mediacion` quedan por compatibilidad. */
  datosMediacion?: { borrado?: string; guardar?: { por: Rol; fecha: string } }
}
/** Aviso en la app (días 1, 4 y 6) con su registro de entrega y de apertura; y el correo, si se escribió una dirección. */
export interface Aviso {
  id: string; para: Rol; dia: number | 'reparacion'
  asunto: string; texto: string
  /** Hora de la app (con los días simulados) en que se entregó, y hora real del aparato. */
  entregado: string; entregadoReal: string
  /** Apertura por canal: en la app y por el enlace del correo (fecha y hora de la app, ISO). */
  abierto?: string; abiertoCorreo?: string
  correo?: 'enviado' | 'error' | 'sin-correo'
}
/** Regla de propuesta automática (6.5.1, B.1): registro de la decisión del inquilino al firmar. */
export interface RegistroRegla { cuenta: string; alquiler: string; version: string; acepta: boolean; fecha: string; edicion?: string }
/** Consentimiento en el momento de usar una función (paso 16). */
export interface Consentimiento { tipo: 'mediacion' | 'correo'; cuenta: string; rol: Rol; alquiler: string; version: string; texto: string; fecha: string; edicion?: string }
export interface Resultado { inquilino: number; dueno: number; via: 'automatico' | 'acuerdo' | 'mediacion' | 'propuesta' | 'devuelto' | 'simulacion'; fecha: string }
export interface Alquiler {
  id: string; direccion: string; monto: number; moneda: 'USD' | 'USDC'
  /** Solo con servidor: mi rol según la sesión, si el inquilino ya aceptó y las cuentas G… declaradas. */
  miRol?: Rol; inquilinoUnido?: boolean; cuentas?: Partial<Record<Rol, string>>; ventanaSegundos?: number; liquidacionTx?: string; invitacion?: string
  inicio: string; fin: string; reglas: string[]
  duenoEmail: string; inquilinoEmail: string
  estado: Estado; rendimiento: boolean; historial: Evento[]
  escrowId?: string; contrato: { firmas: Partial<Record<Rol, string>> }; entrada: Acta; salida?: Acta; pago?: string
  ventanaInicio?: string; diasSimulados: number
  reclamo?: Reclamo; resultado?: Resultado
  /** Fase 1 (testnet real, una sola persona): cuenta segura (C…), cuentas G… y hashes de cada paso en la red de prueba. */
  red?: RedPrueba
  /** Prueba completa (Términos 1.7-demo). */
  regla?: RegistroRegla
  anexo?: { acepta: string; reparaciones: string[] }
  /** Entrega registrada (fotos de salida confirmadas) y «Recibí la casa» del dueño. */
  entrega?: string; recibido?: string
  avisos?: Aviso[]
  /** Paso 16: consentimientos dados al usar una función (mediación; correos en el paso 11). */
  consentimientos?: Consentimiento[]
  /** Paso 16: versión de los Términos del alquiler (sin dato: 1.6-demo) y aceptación de cada parte para pasar a la 1.7-demo. */
  terminos?: { version: string; acepta?: Partial<Record<Rol, string>>; desde?: string; /** paso16-unido: versión con su fecha (fecha única) */ edicion?: string }
  /** Correos que escribió quien prueba para recibir los avisos (opcional). */
  correos?: Partial<Record<Rol, string>>
  /** Paso 11: avisos ya enviados por correo a cada papel (ids), para no repetirlos. */
  correosEnviados?: Partial<Record<Rol, string[]>>
  /** Paso 7: alquiler del modo de dos personas (lo marca el servidor compartido). */
  dosPersonas?: boolean
}
export type PasoRed = 'trustline' | 'compra' | 'escrow' | 'deposito' | 'evidencia' | 'aprobacion' | 'liberacion' | 'duenoTrustline' | 'disputa' | 'resolucion'
export interface RedPrueba { escrow?: string; /** Permiso del navegador que creó el depósito (lo devuelve /api/solo «desplegar»). */ permiso?: string; dueno?: string; inquilino?: string; inquilinoPrueba?: boolean; firma?: 'cavos' | 'freighter'; usdcListo?: boolean; txs: Partial<Record<PasoRed, string>> }
export const ETIQUETA_ESTADO: Record<Estado,string> = {
  firmas:'Firmas', pendiente_pago:'Esperando depósito', fotos_entrada:'Fotos de entrada',
  en_curso:'Alquiler en curso', salida:'Fotos de salida', ventana_reclamo:'7 días para reclamos',
  reclamo:'Reclamo abierto', mediacion:'Con mediador', cerrado:'Terminado',
}
export const NOMBRE_ROL: Record<Rol,string> = { dueno: 'Dueño', inquilino: 'Inquilino' }
