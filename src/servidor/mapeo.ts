// Convierte las filas de Supabase (tablas lk_*) al tipo Alquiler que usan las pantallas. Puro y con pruebas.
import type { Alquiler, Acta, Foto, Rol, Estado } from '../types'

export interface Filas {
  contrato: { id: string; direccion: string; monto: number | string; inicio: string; fin: string; reglas: string[]; email_inquilino: string; estado: Estado
    ventana_inicio: string | null; ventana_segundos: number; escrow_contract_id: string | null; resultado: { via: 'automatico' | 'acuerdo' | 'mediacion'; dueno: number | string; inquilino: number | string } | null
    liquidacion_tx: string | null; creado_en: string; actualizado_en: string }
  participantes: { rol: Rol; usuario: string; email_cavos: string; direccion_stellar: string | null }[]
  actas: { etapa: 'entrada' | 'salida'; cuartos: { nombre: string; nota: string; items: { texto: string; estado: 'bien' | 'detalle' | null }[] }[] }[]
  firmas: { etapa: 'contrato' | 'entrada' | 'salida'; rol: Rol; firmado_en: string }[]
  fotos: { id: string; etapa: 'entrada' | 'salida' | 'reclamo'; cuarto: number | null; por_rol: Rol; ruta: string; sha256: string; sha256_original: string | null
    tomada_en: string; fecha_archivo: string | null; origen: 'camara' | 'archivo'; posible_galeria: boolean; subido_en: string }[]
  reclamo: { monto: number | string; motivo: string; creado_en: string; respuesta: 'aceptado' | 'rechazado' | null } | null
  eventos: { texto: string; tx_hash: string | null; creado_en: string }[]
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

export function aAlquiler(f: Filas, yo: string, url: (ruta: string) => string): Alquiler {
  const c = f.contrato; const p = (r: Rol) => f.participantes.find(x => x.rol === r)
  const mio = f.participantes.find(x => x.usuario === yo)?.rol
  const pagoEv = f.eventos.find(e => /^Depósito de .* pagado/.test(e.texto))
  return {
    id: c.id, direccion: c.direccion, monto: Number(c.monto), moneda: 'USDC', inicio: c.inicio, fin: c.fin, reglas: c.reglas ?? [],
    duenoEmail: p('dueno')?.email_cavos ?? '', inquilinoEmail: p('inquilino')?.email_cavos ?? c.email_inquilino,
    inquilinoUnido: Boolean(p('inquilino')), miRol: mio, cuentas: { dueno: p('dueno')?.direccion_stellar ?? undefined, inquilino: p('inquilino')?.direccion_stellar ?? undefined },
    estado: c.estado, rendimiento: false, dosPersonas: true, escrowId: c.escrow_contract_id ?? undefined,
    contrato: { firmas: firmasDe(f.firmas, 'contrato') }, entrada: acta(f, 'entrada', url) ?? { firmas: {}, cuartos: [] }, salida: acta(f, 'salida', url),
    pago: pagoEv?.creado_en, ventanaInicio: c.ventana_inicio ?? undefined, ventanaSegundos: c.ventana_segundos, diasSimulados: 0,
    reclamo: f.reclamo ? { monto: Number(f.reclamo.monto), motivo: f.reclamo.motivo, fecha: f.reclamo.creado_en, respuesta: f.reclamo.respuesta ?? undefined,
      fotos: f.fotos.filter(x => x.etapa === 'reclamo').map(x => aFoto(x, url)) } : undefined,
    resultado: c.resultado ? { via: c.resultado.via, dueno: Number(c.resultado.dueno), inquilino: Number(c.resultado.inquilino), fecha: c.actualizado_en } : undefined,
    liquidacionTx: c.liquidacion_tx ?? undefined,
    historial: f.eventos.map(e => ({ fecha: e.creado_en, texto: e.texto, tx: e.tx_hash ?? undefined })),
  }
}

/** Mensaje de un error de Postgres/PostgREST para mostrar al usuario (las funciones ya los escriben en español). */
export function mensajeServidor(e: unknown): string {
  const m = (e as { message?: string })?.message ?? ''
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.'
  if (/JWT|session|Inicia sesión/i.test(m)) return 'Tu sesión venció. Vuelve a entrar.'
  return m && m.length < 200 && !/[{}]|relation|function .*does not exist/.test(m) ? m : 'Algo salió mal en el servidor. Intenta de nuevo.'
}
