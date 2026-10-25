// Convierte las filas de Supabase (tablas lk_*) al tipo Alquiler que usan las pantallas. Puro y con pruebas.
import type { Alquiler, Acta, Foto, Rol, Estado } from '../types'
import { edicionDe } from '../legal/versiones'

export interface Filas {
  contrato: { id: string; direccion: string; monto: number | string; inicio: string; fin: string; reglas: string[]; email_inquilino: string; estado: Estado
    ventana_inicio: string | null; ventana_segundos: number; escrow_contract_id: string | null; resultado: { via: 'automatico' | 'acuerdo' | 'mediacion' | 'devuelto'; cierre?: string; dueno: number | string; inquilino: number | string } | null
    liquidacion_tx: string | null; creado_en: string; actualizado_en: string
    /** 20261025060000 (C): cuándo se entregó la casa; sin «Recibí», el plazo empieza 2 días después (lk_inicio_plazo). */
    entregado_en?: string | null }
  participantes: { rol: Rol; usuario: string; email_cavos: string; direccion_stellar: string | null }[]
  actas: { etapa: 'entrada' | 'salida'; cuartos: { nombre: string; nota: string; items: { texto: string; estado: 'bien' | 'detalle' | null }[] }[] }[]
  firmas: { etapa: 'contrato' | 'entrada' | 'salida'; rol: Rol; firmado_en: string }[]
  fotos: { id: string; etapa: 'entrada' | 'salida' | 'reclamo'; cuarto: number | null; por_rol: Rol; ruta: string; sha256: string; sha256_original: string | null
    tomada_en: string; fecha_archivo: string | null; origen: 'camara' | 'archivo'; posible_galeria: boolean; subido_en: string }[]
  reclamo: { monto: number | string; motivo: string; creado_en: string; respuesta: 'aceptado' | 'rechazado' | null; respondido_en?: string | null } | null
  eventos: { texto: string; tx_hash: string | null; creado_en: string }[]
  /** 20261025050000 (escenario C): versión de los Términos guardada al crear y quién la aceptó y cuándo. Sin la migración, no viene. */
  terminos?: { version: string | null; aceptaciones: { rol: Rol; aceptado_en: string }[] } | null
}

const firmasDe = (f: Filas['firmas'], etapa: string) => Object.fromEntries(f.filter(x => x.etapa === etapa).map(x => [x.rol, x.firmado_en])) as Partial<Record<Rol, string>>

export function aFoto(f: Filas['fotos'][number], url: (ruta: string) => string): Foto {
  const tomadaEn = Date.parse(f.tomada_en)
  return { id: f.id, ruta: f.ruta, src: url(f.ruta), por: f.por_rol, fecha: f.subido_en, tomadaEn, fechaArchivo: f.fecha_archivo ? Date.parse(f.fecha_archivo) : undefined,
    huella: f.sha256_original ?? f.sha256, huellaGuardada: f.sha256, origen: f.origen, posibleGaleria: f.posible_galeria }
}

function acta(f: Filas, etapa: 'entrada' | 'salida', url: (r: string) => string): Acta | undefined {
  const a = f.actas.find(x => x.etapa === etapa); if (!a) return undefined
  return { firmas: firmasDe(f.firmas, etapa), cuartos: a.cuartos.map((c, i) => ({ nombre: c.nombre, nota: c.nota ?? '', items: c.items.map(it => ({ texto: it.texto, estado: it.estado })),
    fotos: f.fotos.filter(x => x.etapa === etapa && x.cuarto === i).map(x => aFoto(x, url)) })) }
}

const INICIO_AUTO_MS = 2 * 86_400_000
/** Igual que lk_inicio_plazo: ventana_inicio («Recibí») o, si no, 2 días después de la entrega (cuando ya pasaron). */
function inicioPlazo(c: Filas['contrato'], ahora: number) {
  if (c.ventana_inicio) return c.ventana_inicio
  if (!c.entregado_en) return undefined
  const t = +new Date(c.entregado_en) + INICIO_AUTO_MS
  return ahora >= t ? new Date(t).toISOString() : undefined
}

export function aAlquiler(f: Filas, yo: string, url: (ruta: string) => string, ahora = Date.now()): Alquiler {
  const c = f.contrato; const p = (r: Rol) => f.participantes.find(x => x.rol === r)
  const mio = f.participantes.find(x => x.usuario === yo)?.rol
  const pagoEv = f.eventos.find(e => /^Depósito de .* pagado/.test(e.texto))
  return {
    id: c.id, direccion: c.direccion, monto: Number(c.monto), moneda: 'USDC', inicio: c.inicio, fin: c.fin, reglas: c.reglas ?? [],
    duenoEmail: p('dueno')?.email_cavos ?? '', inquilinoEmail: p('inquilino')?.email_cavos ?? c.email_inquilino,
    inquilinoUnido: Boolean(p('inquilino')), miRol: mio, cuentas: { dueno: p('dueno')?.direccion_stellar ?? undefined, inquilino: p('inquilino')?.direccion_stellar ?? undefined },
    estado: c.estado, rendimiento: false, dosPersonas: true, escrowId: c.escrow_contract_id ?? undefined,
    contrato: { firmas: firmasDe(f.firmas, 'contrato') }, entrada: acta(f, 'entrada', url) ?? { firmas: {}, cuartos: [] }, salida: acta(f, 'salida', url),
    pago: pagoEv?.creado_en, ventanaInicio: inicioPlazo(c, ahora), ...(c.entregado_en ? { entrega: c.entregado_en } : {}), ventanaSegundos: c.ventana_segundos, diasSimulados: 0,
    reclamo: f.reclamo ? { monto: Number(f.reclamo.monto), motivo: f.reclamo.motivo, fecha: f.reclamo.creado_en, respuesta: f.reclamo.respuesta ?? undefined,
      ...(f.reclamo.respondido_en ? { respondido: f.reclamo.respondido_en } : {}),
      fotos: f.fotos.filter(x => x.etapa === 'reclamo').map(x => aFoto(x, url)) } : undefined,
    resultado: c.resultado ? { via: c.resultado.via, ...(c.resultado.cierre ? { cierre: c.resultado.cierre } : {}), dueno: Number(c.resultado.dueno), inquilino: Number(c.resultado.inquilino), fecha: c.actualizado_en } : undefined,
    liquidacionTx: comprobanteLiquidacion(c.liquidacion_tx),
    ...terminosDe(f.terminos),
    historial: f.eventos.map(e => ({ fecha: e.creado_en, texto: e.texto, tx: e.tx_hash ?? undefined })),
  }
}

/** Escenario C: el alquiler sigue la versión guardada en el servidor; sin versión (los de antes), conserva la suya (1.6-demo). */
function terminosDe(t: Filas['terminos']): Pick<Alquiler, 'terminos'> {
  if (!t?.version) return {}
  const acepta = Object.fromEntries(t.aceptaciones.map(x => [x.rol, x.aceptado_en])) as Partial<Record<Rol, string>>
  const edicion = edicionDe(t.version)
  return { terminos: { version: t.version, acepta, ...(edicion ? { edicion } : {}) } }
}

/** Mensaje de un error de Postgres/PostgREST para mostrar al usuario (las funciones ya los escriben en español). */
export function mensajeServidor(e: unknown): string {
  const m = (e as { message?: string })?.message ?? ''
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.'
  if (/JWT|session|Inicia sesión/i.test(m)) return 'Tu sesión venció. Vuelve a entrar.'
  return m && m.length < 200 && !/[{}]|relation|function .*does not exist/.test(m) ? m : 'Algo salió mal en el servidor. Intenta de nuevo.'
}

/** PR #22: liquidacion_tx = 'en-curso' es el bloqueo de «repartir» en /api/tw, no un comprobante. */
export const comprobanteLiquidacion = (x: string | null | undefined) => x && /^[0-9a-f]{64}$/.test(x) ? x : undefined
