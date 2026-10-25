import { reglas17 } from './prueba/version'
import { esDosPersonas } from './prueba/dosPersonas'
// Avisos emergentes después de cada paso del flujo: confirman qué pasó y dicen qué sigue.
// Aviso v2 (toast): pila de hasta 3, el más nuevo al frente. Las pantallas llaman a `avisar`; <Alertas /> (en App) los muestra con <Tostada />.
// Los textos con sentido legal están marcados con `// LEGAL: revisar` (pendientes de revisión de Legal).
import type { Alquiler, Rol } from './types'
import { NOMBRE, otro } from './flujo'
import { usd } from './ui'
import { textoPlazo } from './acciones'
import { modoReal } from './services/auth'
import { modoPrueba, modoVideo, escrowReal } from './servidor/config'

export interface Alerta {
  /** Paso del flujo (sirve para pruebas y capturas). */
  paso: string
  tipo?: 'exito' | 'error'
  titulo: string
  /** Qué pasó. */
  hecho: string
  /** Qué sigue. */
  sigue?: string
  /** Aviso v2: la única línea bajo el título («Ahora: …», «Sigue: …»). Si falta, se usa `sigue` (o `hecho`). */
  linea?: Linea
  /** Aviso v2: botón que lleva al paso siguiente (8 s en vez de 5 s). */
  accion?: Accion
}
export interface Linea { et?: string; texto: string }
/** `ir`: «panel» = la tarjeta del paso (enfoca su botón principal); «detalles» = abre «Detalles» (historial y montos). */
export interface Accion { texto: string; etiqueta: string; ir: 'panel' | 'detalles' }
/** Texto aprobado por Legal (A12) del error de red; el mismo de services/escrow.ts. */
export const ERROR_RED = 'La red de prueba está lenta o no respondió. Espera un minuto y vuelve a tocar el botón.' // LEGAL: revisado A12 (24/10)
/** Línea que muestra el aviso v2. */
export const lineaDe = (a: Alerta): Linea => a.linea ?? { texto: a.sigue ?? a.hecho }

/** Logros del flujo: el aviso sale en verde y la llave del logo entra y gira una vez. */
export const LOGROS = new Set(['ingreso', 'contrato-firmado', 'pago', 'entrada-confirmada', 'devolucion', 'acuerdo'])
/** Tono del aviso: paso (miel), logro (verde) o error (terracota). */
export const tonoDe = (a: Pick<Alerta, 'paso' | 'tipo'>): 'paso' | 'logro' | 'error' => a.tipo === 'error' ? 'error' : LOGROS.has(a.paso) ? 'logro' : 'paso'

// ---- Pila (estilo Sonner) ----
/** Hasta 3 visibles; con el cuarto sale el más viejo. */
export const MAX_AVISOS = 3
export type AlertaEnPila = Alerta & { id: number }
let pila: AlertaEnPila[] = [], siguienteId = 1
const oyentes = new Set<() => void>()
const avisarCambio = () => oyentes.forEach(f => f())
export function avisar(a: Alerta | null | undefined) {
  if (!a) return
  if (pila.some(x => x.paso === a.paso && x.titulo === a.titulo)) return   // el mismo aviso no se repite en la pila
  pila = [...pila, { ...a, id: siguienteId++ }].slice(-MAX_AVISOS); avisarCambio()
}
/** Cierra un aviso (por id) o, sin id, el más nuevo. */
export function cerrarAlerta(id?: number) { pila = id == null ? pila.slice(0, -1) : pila.filter(x => x.id !== id); avisarCambio() }
/** Quita los avisos de un paso (por ejemplo, el error de red al volver a intentar). */
export function quitarAvisos(paso: string) { if (pila.some(x => x.paso === paso)) { pila = pila.filter(x => x.paso !== paso); avisarCambio() } }
/** Los avisos visibles, del más viejo al más nuevo (misma referencia mientras no cambien). */
export const alertasVisibles = () => pila
export const alertaActual = () => pila.at(-1) ?? null
export function suscribirAlertas(f: () => void) { oyentes.add(f); return () => { oyentes.delete(f) } }
/** Solo para pruebas. */
export function vaciarAlertas() { pila = []; avisarCambio() }

// ---- Textos ----
export interface Contexto { prueba: boolean; video: boolean; red: boolean }
const CTX: Contexto = { prueba: modoPrueba, video: modoVideo, red: escrowReal }
// LEGAL: revisado (24/10) · texto largo de la mediación (2.ª frase solo en la demo de una persona)
export const MEDIACION_LARGO = 'Una persona mediadora revisa las fotos y les ayuda a buscar un acuerdo sobre el reparto del depósito.'
export const MEDIACION_DEMO = 'En esta prueba, decides tú el reparto con «Resolver el reclamo (simulación)».'
const TERMINO = 'El alquiler terminó. No tienes nada pendiente.'
const quien = (r: Rol, c: Contexto) => r === 'dueno' && c.prueba ? 'El dueño de prueba' : r === 'dueno' ? 'El dueño' : 'El inquilino'

export const alertaIngreso = (real = modoReal): Alerta => ({
  paso: 'ingreso', titulo: '¡Ingresaste correctamente!',
  linea: { et: 'Sigue:', texto: 'crear o ver tus alquileres' },   // LEGAL: revisado el 23/10
  hecho: `${real ? 'Estamos preparando tu billetera.' : 'Te damos la bienvenida a la demo.'} Desde aquí puedes ver tus alquileres y crear un depósito de prueba.`,   // LEGAL: revisado (24/10)
})
export const alertaIngresoFallo = (): Alerta => ({
  paso: 'ingreso-fallo', tipo: 'error', titulo: 'El ingreso no terminó',
  hecho: 'Toca Entrar y elige tu cuenta.',   // texto corto aprobado por Legal (23 oct 2026)
})
/** Error de red (A12): «No se pudo completar» con el texto aprobado. Sin acción: se reintenta con el botón de la pantalla. */
export const alertaErrorRed = (): Alerta => ({
  paso: 'error-red', tipo: 'error', titulo: 'No se pudo completar',   // LEGAL: revisado el 23/10
  hecho: ERROR_RED,
})

export const alertaCreado = (a: Pick<Alquiler, 'direccion' | 'monto'>, c = CTX): Alerta => ({
  paso: 'crear', titulo: 'Alquiler creado',
  hecho: `Guardamos el alquiler de ${a.direccion} con un depósito de ${usd(a.monto)}.`,
  sigue: c.prueba ? 'Leer el contrato y firmarlo. Después lo firma el dueño de prueba.' : 'Leer el contrato y firmarlo. Falta también la firma del inquilino.',
  linea: { et: 'Ahora:', texto: 'leer y firmar el contrato' },   // LEGAL: revisado (24/10)
})

const ETAPA = { contrato: 'el contrato', entrada: 'las fotos de entrada', salida: 'las fotos de salida' } as const
function alertaFirma(etapa: keyof typeof ETAPA, quienFirmo: Rol, rol: Rol, c: Contexto): Alerta {
  const yo = quienFirmo === rol, falta = otro(quienFirmo)
  const verbo = etapa === 'contrato' ? 'firm' : 'confirm'
  const titulo = yo ? `${verbo === 'firm' ? 'Firmaste' : 'Confirmaste'} ${ETAPA[etapa]}` : `${quien(quienFirmo, c)} ${verbo}ó ${ETAPA[etapa]}`
  const hecho = etapa === 'contrato' ? 'La firma quedó guardada con la fecha y la hora.' : 'Las fotos y la lista quedaron guardadas con la fecha y la hora.'
  const sigue = c.prueba && falta === 'dueno'
    ? `El dueño de prueba ${etapa === 'contrato' ? 'lo firma' : 'las revisa y las confirma'} solo, en unos segundos.`
    : `Falta que el ${NOMBRE[falta]} ${etapa === 'contrato' ? 'lo firme' : 'las confirme'}.`
  // LEGAL: revisado (24/10) · líneas cortas del aviso v2 de las firmas
  const linea: Linea | undefined = etapa === 'contrato'
    ? (yo ? { et: 'Sigue:', texto: c.prueba && falta === 'dueno' ? 'la firma del dueño de prueba' : 'la firma de la otra persona' } : falta === rol ? { et: 'Ahora:', texto: 'tu firma' } : undefined)
    : (yo ? { et: 'Sigue:', texto: 'la otra persona confirma las fotos' } : undefined)
  return { paso: `${etapa}-firma-${quienFirmo}`, titulo, hecho, sigue, ...(linea && { linea }) }
}

/** Lo mínimo del alquiler para comparar antes y después (sin copiar las fotos). */
export type Instantanea = Pick<Alquiler, 'id' | 'estado' | 'diasSimulados'> & { contrato: Pick<Alquiler['contrato'], 'firmas'>; entrada: Pick<Alquiler['entrada'], 'firmas'>; salida?: { firmas: NonNullable<Alquiler['salida']>['firmas'] } }
export const instantanea = (a: Alquiler): Instantanea => ({
  id: a.id, estado: a.estado, diasSimulados: a.diasSimulados, contrato: { firmas: { ...a.contrato.firmas } }, entrada: { firmas: { ...a.entrada.firmas } },
  ...(a.salida ? { salida: { firmas: { ...a.salida.firmas } } } : {}),
})

/** Compara el alquiler antes y después de un cambio y devuelve el aviso del paso que acaba de pasar (o null). */
export function alertaPorCambio(antes: Instantanea, ahora: Alquiler, rol: Rol, c: Contexto = CTX): Alerta | null {
  if (antes.id !== ahora.id) return null
  const r = ahora.resultado
  if (antes.estado !== ahora.estado) switch (ahora.estado) {
    case 'pendiente_pago': return antes.estado !== 'firmas' ? null : {
      paso: 'contrato-firmado', titulo: 'Contrato firmado por los dos',
      hecho: c.prueba ? 'El dueño de prueba también firmó. El contrato ya tiene las dos firmas.' : 'El contrato ya tiene las dos firmas.',
      sigue: `Pagar el depósito de ${usd(ahora.monto)}.`,
      linea: { et: 'Ahora:', texto: `pagar ${usd(ahora.monto)}${c.red ? ' de prueba' : ''}` },   // LEGAL: revisado el 23/10
      accion: { texto: 'Pagar →', etiqueta: 'Pagar el depósito', ir: 'panel' },
    }
    case 'fotos_entrada': return {
      paso: 'pago', titulo: '¡Depósito guardado!',
      // LEGAL: revisar · texto corto de la red de prueba aprobado por Legal (23 oct 2026)
      // LEGAL: revisado (24/10)
      // C: aprobado por Legal (25/10, 3:34 a. m.), sin «Ni el dueño ni el inquilino pueden sacarlos solos»
      hecho: esDosPersonas(ahora) ? `${usd(ahora.monto)} guardados en una cuenta segura de la red de prueba.` : c.red ? `${usd(ahora.monto)} guardados en una cuenta segura de la red de prueba. Ni el dueño ni el inquilino pueden sacarlos solos.` : `El depósito de ${usd(ahora.monto)} quedó guardado. Ni el dueño ni el inquilino pueden tomarlo solos.`,
      sigue: 'Tomar las fotos de entrada de cada espacio y marcar la lista.',
      linea: { et: 'Ahora:', texto: 'fotos de entrada' },   // LEGAL: revisado el 23/10
      accion: { texto: 'Tomar fotos →', etiqueta: 'Tomar fotos de entrada', ir: 'panel' },
    }
    case 'en_curso': return {
      paso: 'entrada-confirmada', titulo: 'Empezó el alquiler',
      hecho: 'Los dos confirmaron las fotos de entrada. El depósito sigue guardado.',
      sigue: rol === 'inquilino' ? 'Cuando entregues el lugar, toca «Empezar fotos de salida».' : 'Cuando el inquilino entregue el lugar, cualquiera de los dos puede empezar las fotos de salida.',
      linea: { et: 'Al entregar:', texto: 'fotos de salida' },   // LEGAL: revisado el 23/10
      accion: { texto: 'Ver alquiler', etiqueta: 'Ver el alquiler', ir: 'panel' },
    }
    case 'salida': return {
      paso: 'salida-inicio', titulo: 'Empezaron las fotos de salida',
      hecho: 'Ya pueden registrar cómo quedó el lugar.',
      sigue: 'Tomar una foto de cada espacio, marcar la lista y confirmar.',
      linea: { et: 'Ahora:', texto: 'una foto de cada espacio' },   // LEGAL: revisado (24/10)
    }
    case 'ventana_reclamo': if (reglas17(ahora)) return {   // LEGAL: revisar · prueba completa (B.4)
      paso: 'salida-confirmada', titulo: 'Fotos de salida confirmadas',
      hecho: 'Los dos confirmaron las fotos de salida. Quedó registrada la entrega de la casa.',
      sigue: 'El plazo de 7 días naturales del dueño para reclamar empieza cuando toque «Recibí la casa» o, si no lo toca, 2 días después de la entrega.',
      linea: { et: 'Sigue:', texto: '«Recibí la casa» o 2 días' },   // LEGAL: revisar · prueba completa
    }
      return {
      paso: 'salida-confirmada', titulo: 'Fotos de salida confirmadas',
      hecho: `Los dos confirmaron las fotos de salida. Empiezan los ${textoPlazo(ahora)} para reclamos.`,
      // LEGAL: revisar
      sigue: c.video ? `Si el dueño de prueba no reclama, después de ${textoPlazo(ahora)} el depósito se devuelve al inquilino. En esta prueba puedes adelantar el plazo o hacer un reclamo en nombre del dueño de prueba.`
        : `Si el dueño no reclama, después de ${textoPlazo(ahora)} el depósito se devuelve al inquilino.`,   // LEGAL: revisado (24/10)
      linea: { et: 'Sigue:', texto: `${textoPlazo(ahora)} para hacer un reclamo` },   // LEGAL: revisado (24/10) · {textoPlazo} sale del alquiler
    }
    case 'reclamo': return !ahora.reclamo ? null : {
      paso: 'reclamo', titulo: 'Reclamo enviado',
      hecho: `${quien('dueno', c)} reclamó ${usd(ahora.reclamo.monto)} del depósito.`,
      // LEGAL: revisar
      sigue: `El inquilino acepta o no el reclamo. Si no lo acepta, pasa a una persona mediadora${c.prueba ? ' (simulación)' : ''}.`,
      linea: { et: 'Sigue:', texto: 'el inquilino acepta o no el reclamo' },   // LEGAL: revisado (24/10)
    }
    case 'mediacion': return {
      paso: 'mediacion', titulo: 'Pasa a una persona mediadora',
      hecho: `No hubo acuerdo con el reclamo.${c.prueba ? ' En esta prueba la persona mediadora es una simulación.' : ''}`,
      // LEGAL: revisado (24/10) · la persona mediadora ayuda a buscar un acuerdo; no decide. En la demo, decides tú (simulación).
      sigue: MEDIACION_LARGO + (c.video ? ` ${MEDIACION_DEMO}` : ''),
      linea: c.video ? { et: 'En esta prueba:', texto: 'decides tú el reparto (simulación)' } : { et: 'Sigue:', texto: 'una persona mediadora les ayuda a buscar un acuerdo' },   // LEGAL: revisado (24/10)
    }
    case 'cerrado': {
      if (!r) return null
      const red = c.red ? ' en la red de prueba' : ''
      // LEGAL: revisar
      if (r.via === 'automatico') return {
        paso: 'devolucion', titulo: 'Depósito devuelto',
        hecho: c.red ? `No hubo reclamos en ${textoPlazo(ahora)}. El dueño de prueba aprobó y Lockumi devolvió ${usd(r.inquilino)} al inquilino en la red de prueba.`
          : `No hubo reclamos en ${textoPlazo(ahora)}. El depósito volvió completo al inquilino: ${usd(r.inquilino)}.`,
        sigue: TERMINO,
        linea: { texto: `${usd(r.inquilino)} volvieron al inquilino` },   // LEGAL: revisado el 23/10 (monto del reparto real)
        accion: { texto: 'Ver detalle', etiqueta: 'Ver el detalle del depósito devuelto', ir: 'detalles' },
      }
      // LEGAL: revisar
      if (r.via === 'acuerdo') return {
        paso: 'acuerdo', titulo: 'Reclamo aceptado',
        hecho: `Se repartió el depósito${red}: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino.`,
        sigue: TERMINO,
        linea: { texto: `${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` },   // LEGAL: revisado el 23/10 (montos del reparto real)
        accion: { texto: 'Ver detalle', etiqueta: 'Ver el detalle del reparto', ir: 'detalles' },
      }
      // LEGAL: revisado (24/10) · título «Reparto del depósito», línea y texto largo con los montos reales de usd(...)
      return {
        paso: 'reparto', titulo: 'Reparto del depósito',
        hecho: `Se repartió el depósito${red}: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino.`,
        sigue: TERMINO,
        linea: { texto: `${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` },   // LEGAL: revisado (24/10)
        accion: { texto: 'Ver detalle →', etiqueta: 'Ver el detalle del reparto', ir: 'detalles' },
      }
    }
    default: return null
  }
  // Mismo estado: una firma nueva de una de las partes (sin que hayan firmado los dos todavía).
  const firmas = { firmas: ['contrato', antes.contrato.firmas, ahora.contrato.firmas], fotos_entrada: ['entrada', antes.entrada.firmas, ahora.entrada.firmas], salida: ['salida', antes.salida?.firmas ?? {}, ahora.salida?.firmas ?? {}] } as const
  const f = firmas[ahora.estado as keyof typeof firmas]
  if (f) for (const p of ['inquilino', 'dueno'] as const) if (!f[1][p] && f[2][p]) return alertaFirma(f[0], p, rol, c)
  // Solo red de prueba: se adelantó el plazo para reclamos.
  if (reglas17(ahora) && ahora.estado === 'ventana_reclamo' && ahora.diasSimulados > antes.diasSimulados) return {   // LEGAL: revisar · simulador de días
    paso: 'adelantar', titulo: 'Reloj de la demo adelantado',
    hecho: `Solo en la red de prueba: el reloj de la demo avanzó ${ahora.diasSimulados - antes.diasSimulados === 1 ? '1 día' : `${ahora.diasSimulados - antes.diasSimulados} días`}.`,
    linea: { et: 'Solo en la prueba:', texto: 'reloj de la demo adelantado' },   // LEGAL: revisar · prueba completa
    sigue: 'Los avisos de esos días ya están en la app.',
  }
  if (ahora.estado === 'ventana_reclamo' && ahora.diasSimulados > antes.diasSimulados) return {
    paso: 'adelantar', titulo: 'Plazo adelantado',
    hecho: `Solo en la red de prueba: terminamos ahora los ${textoPlazo(ahora)} para reclamos.`,
    linea: { et: 'Solo en la prueba:', texto: 'terminó el plazo para reclamos' },   // LEGAL: revisado (24/10)
    // LEGAL: revisar
    sigue: c.red ? 'El dueño de prueba aprueba y Lockumi devuelve el depósito al inquilino en la red de prueba. Tarda entre 20 y 60 segundos.' : 'El depósito vuelve completo al inquilino.',
  }
  return null
}
