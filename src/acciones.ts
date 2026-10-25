// Acciones del flujo. Las pantallas llaman a estas funciones; según la configuración van al servidor compartido
// (Supabase, dos aparatos) o al almacenamiento local de la demo (un aparato, con "Ver como").
import { store, ahoraDe, actaVacia } from './store'
import { escrow, type Guardar, type Avance } from './services/escrow'
import { NOMBRE_PASO, ORDEN, esHash } from './services/comprobantes'
import { unaVez } from './services/pasos'
import { firmar as firmarLocal, ambos, NOMBRE, plazoMs, textoPlazo } from './flujo'
import { usd } from './ui'
import type { Alquiler, Foto, Rol } from './types'
import { modoServidor, modoTrustless, modoSolo } from './servidor/config'
import { trustless } from './services/trustless'
import { servidor } from './servidor/repositorio'

type Etapa = 'contrato' | 'entrada' | 'salida'
const iso = (a: Alquiler) => new Date(ahoraDe(a)).toISOString()
export { plazoMs, textoPlazo } from './flujo'   // viven en flujo.ts (puro) para usarlos también en «turno»


export interface Acciones {
  crear(d: { direccion: string; monto: number; inicio: string; fin: string; reglas: string[]; inquilinoEmail: string; propia?: { g: string; firma: 'cavos' | 'freighter' } }, email: string, cuenta?: string): Promise<{ id: string; link?: string }>
  firmar(a: Alquiler, etapa: Etapa, rol: Rol): Promise<void>
  marcar(a: Alquiler, etapa: 'entrada' | 'salida', cuarto: number, item: number, estado: 'bien' | 'detalle'): Promise<void>
  nota(a: Alquiler, etapa: 'entrada' | 'salida', cuarto: number, nota: string): Promise<void>
  agregarFoto(a: Alquiler, etapa: 'entrada' | 'salida', cuarto: number, f: Foto): Promise<void>
  // `avance` recibe textos cortos mientras un paso trabaja en la red de prueba (para mostrarlos en el botón).
  pagar(a: Alquiler, avance?: Avance): Promise<void>
  iniciarSalida(a: Alquiler): Promise<void>
  reclamar(a: Alquiler, monto: number, motivo: string, fotos: Foto[], avance?: Avance): Promise<void>
  responder(a: Alquiler, acepta: boolean, avance?: Avance): Promise<void>
  cerrarSinReclamo(a: Alquiler, avance?: Avance): Promise<void>
  decidir(a: Alquiler, montoDueno: number, motivo?: string, avance?: Avance): Promise<void>
  /** Solo con Trustless Work real: el dueño aprueba en la cadena devolver el depósito. */
  aprobarDevolucion?(a: Alquiler): Promise<void>
  /** Red de prueba (un solo aparato): el dueño de prueba firma o confirma solo, apenas el inquilino lo hizo. Devuelve qué hizo. */
  duenoPruebaAuto?(a: Alquiler): Promise<string | null>
}

const nada: Avance = () => {}
/** Anota en el alquiler cada transacción de la red de prueba apenas termina (con su entrada en el historial). */
const guardarEn = (id: string): Guardar => (txs, red) => store.cambiar(id, x => {
  x.red ??= { txs: {} }; Object.assign(x.red, red ?? {}); if (red?.escrow) x.escrowId = red.escrow
  for (const k of ORDEN) { const h = txs[k]; if (h && !x.red.txs[k]) { x.red.txs[k] = h; if (esHash(h)) x.historial.push({ fecha: new Date().toISOString(), texto: NOMBRE_PASO[k], tx: h }) } }
})
/** Paso idempotente: una sola vez a la vez (pestaña y navegador) y siempre sobre el alquiler recién leído. */
const paso = (a: Alquiler, nombre: string, f: (x: Alquiler) => Promise<void>) => unaVez(a.id + ':' + nombre, async () => { const x = store.fresco(a.id); if (x) await f(x) })

const local: Acciones = {
  async crear({ propia, ...d }, email) {
    const a = store.crear({ ...d, duenoEmail: email })
    // Depósito con USDC de prueba de la propia cuenta del inquilino: queda anotada desde ya (no hay tope de 20, el límite es su saldo).
    if (propia) store.cambiar(a.id, x => { x.red = { ...(x.red ?? { txs: {} }), inquilino: propia.g, inquilinoPrueba: false, firma: propia.firma } })
    // Fase 1 (testnet real): la cuenta segura se crea en la red al depositar (Real.tsx → /api/solo).
    if (modoSolo) { store.cambiar(a.id, x => { x.red = { txs: {} }; x.estado = 'pendiente_pago' }); return { id: a.id } }
    return { id: a.id }
  },
  async firmar(a, etapa, rol) {
    const titulo = { contrato: 'Contrato', entrada: 'Fotos de entrada', salida: 'Fotos de salida' }[etapa]
    store.cambiar(a.id, x => {
      const obj = etapa === 'contrato' ? x.contrato : x[etapa]!; const cuando = iso(x)
      obj.firmas = firmarLocal(obj.firmas, rol, rol, cuando)
      x.historial.push({ fecha: cuando, texto: `${titulo}: firmó el ${NOMBRE[rol]}` })
      if (!ambos(obj.firmas)) return
      if (etapa === 'contrato') { x.estado = 'pendiente_pago'; x.historial.push({ fecha: cuando, texto: 'Contrato firmado por los dos' }) }
      else if (etapa === 'entrada') { x.estado = 'en_curso'; x.historial.push({ fecha: cuando, texto: 'Fotos de entrada confirmadas por los dos' }) }
      else { x.estado = 'ventana_reclamo'; x.ventanaInicio = cuando; x.historial.push({ fecha: cuando, texto: `Fotos de salida confirmadas. Empiezan los ${textoPlazo(x)} para reclamos` }) }   // LEGAL: revisado (24/10) · {plazo} real
    })
  },
  async duenoPruebaAuto(a) {
    const x = store.fresco(a.id); if (!x) return null
    const [etapa, texto] = x.estado === 'firmas' && x.contrato.firmas.inquilino && !x.contrato.firmas.dueno ? ['contrato', 'El dueño de prueba firmó el contrato automáticamente'] as const
      : x.estado === 'fotos_entrada' && x.entrada.firmas.inquilino && !x.entrada.firmas.dueno ? ['entrada', 'El dueño de prueba revisó y confirmó las fotos de entrada automáticamente'] as const
      : x.estado === 'salida' && x.salida?.firmas.inquilino && !x.salida.firmas.dueno ? ['salida', 'El dueño de prueba revisó y confirmó las fotos de salida automáticamente'] as const
      : [null, null]
    if (!etapa) return null
    store.cambiar(a.id, y => { y.historial.push({ fecha: iso(y), texto }) })
    await local.firmar(store.fresco(a.id)!, etapa, 'dueno')
    return texto
  },
  async marcar(a, etapa, cuarto, item, estado) { store.cambiar(a.id, x => { const ac = x[etapa]!; ac.cuartos[cuarto].items[item].estado = estado; ac.firmas = {} }) },
  async nota(a, etapa, cuarto, nota) { store.cambiar(a.id, x => { const ac = x[etapa]!; ac.cuartos[cuarto].nota = nota; ac.firmas = {} }) },
  async agregarFoto(a, etapa, cuarto, f) { store.cambiar(a.id, x => { const ac = x[etapa]!; ac.cuartos[cuarto].fotos.push(f); ac.firmas = {} }) },
  pagar: (a, avance = nada) => paso(a, 'pago', async x => {
    if (x.estado !== 'pendiente_pago') return
    await escrow.depositar(x, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'pendiente_pago') return; y.estado = 'fotos_entrada'; y.pago = iso(y); y.historial.push({ fecha: iso(y), texto: `Depósito de ${usd(y.monto)} pagado y guardado` }) })
  }),
  async iniciarSalida(a) { store.cambiar(a.id, x => { x.estado = 'salida'; x.salida = actaVacia() }, 'Empezaron las fotos de salida') },
  // Reclamo del dueño: primero se registra en la cuenta segura (disputa) y después cambia la pantalla.
  reclamar: (a, monto, motivo, fotos, avance = nada) => paso(a, 'reclamo', async x => {
    if (x.estado !== 'ventana_reclamo' || x.reclamo) return
    await escrow.disputar(x, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'ventana_reclamo') return; y.estado = 'reclamo'; y.reclamo = { monto, motivo, fotos, fecha: iso(y) }; y.historial.push({ fecha: iso(y), texto: `El dueño reclamó ${usd(monto)}` }) })
  }),
  responder: (a, acepta, avance = nada) => acepta
    ? paso(a, 'reparto', async x => {     // acuerdo: el reparto se hace en la cuenta segura con lo que pidió el dueño
      if (x.estado !== 'reclamo' || !x.reclamo) return
      const r = await escrow.resolver(x, x.reclamo.monto, guardarEn(a.id), avance)
      store.cambiar(a.id, y => { if (y.estado !== 'reclamo') return; y.reclamo!.respuesta = 'aceptado'; y.estado = 'cerrado'; y.resultado = { dueno: r.dueno, inquilino: r.inquilino, via: 'acuerdo', fecha: iso(y) }
        y.historial.push({ fecha: iso(y), texto: `El inquilino aceptó el reclamo: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` }) })
    })
    : paso(a, 'rechazo', async x => {
      if (x.estado !== 'reclamo') return
      store.cambiar(a.id, y => { if (y.estado !== 'reclamo') return; y.reclamo!.respuesta = 'rechazado'; y.estado = 'mediacion' }, 'El inquilino no aceptó el reclamo. Pasa a una persona mediadora')
    }),
  // Sin reclamos al terminar el plazo: el dueño (de prueba) aprueba y Lockumi devuelve el depósito al inquilino.
  cerrarSinReclamo: (a, avance = nada) => modoSolo ? Promise.resolve() : paso(a, 'devolucion', async x => {
    if (x.estado !== 'ventana_reclamo' || x.reclamo || ahoraDe(x) < +new Date(x.ventanaInicio!) + plazoMs(x)) return
    const r = await escrow.devolver(x, guardarEn(a.id), avance)
    store.cambiar(a.id, y => {
      if (y.estado !== 'ventana_reclamo' || y.reclamo) return
      y.estado = 'cerrado'; y.resultado = { inquilino: r.inquilino, dueno: 0, via: 'automatico', fecha: iso(y) }
      y.historial.push({ fecha: iso(y), texto: `Sin reclamos en ${textoPlazo(y)}: ${usd(r.inquilino)} devueltos al inquilino` })
    })
  }),
  decidir: (a, aDueno, _motivo, avance = nada) => paso(a, 'reparto', async x => {
    if (x.estado !== 'mediacion') return
    const r = await escrow.resolver(x, aDueno, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'mediacion') return; y.estado = 'cerrado'; y.resultado = { dueno: r.dueno, inquilino: r.inquilino, via: 'mediacion', fecha: iso(y) }
      // LEGAL: revisado (24/10) · mismo texto que el evento del servidor, sin «decidió»
      y.historial.push({ fecha: iso(y), texto: `Acuerdo registrado: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` }) })
  }),
}

const remoto: Acciones = {
  crear: (d, email, cuenta) => servidor.crear(d, email, cuenta),
  firmar: async (a, etapa) => { await servidor.firmar(a.id, etapa) },        // el servidor deduce el rol de la sesión
  marcar: (a, etapa, c, i, e) => servidor.marcar(a.id, etapa, c, i, e).then(() => {}),
  nota: (a, etapa, c, n) => servidor.nota(a.id, etapa, c, n).then(() => {}),
  agregarFoto: (a, etapa, c, f) => servidor.agregarFoto(a.id, etapa, c, f).then(() => {}),
  // Sin Trustless Work el pago queda registrado sin transacción (tx null). Con TW: escrow real en testnet y su hash.
  pagar: async a => { await servidor.registrarPago(a.id, modoTrustless ? await trustless.depositar(a.id) : null) },
  iniciarSalida: a => servidor.iniciarSalida(a.id).then(() => {}),
  reclamar: (a, m, mot, fotos) => servidor.reclamar(a.id, m, mot, fotos).then(() => {}),
  responder: (a, acepta) => servidor.responder(a.id, acepta).then(() => {}),
  async cerrarSinReclamo(a) {
    const cerro = await servidor.cerrarSinReclamo(a.id)
    // Con TW: la plataforma libera el 100 % al inquilino (necesita la aprobación del dueño en la cadena).
    if (modoTrustless && a.escrowId && (cerro || (a.estado === 'cerrado' && !a.liquidacionTx))) await trustless.liberar(a.id)
  },
  ...(modoTrustless ? { aprobarDevolucion: (a: Alquiler) => trustless.aprobarDevolucion(a.id).then(() => {}) } : {}),
  decidir: (a, m, mot) => servidor.decidir(a.id, m, mot).then(() => {}),
}

export const acciones: Acciones = modoServidor ? remoto : local
