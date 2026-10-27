// Acciones del flujo. Las pantallas llaman a estas funciones; según la configuración van al servidor compartido
// (Supabase, dos aparatos) o al almacenamiento local de la demo (un aparato, con "Ver como").
import { store, ahoraDe, actaVacia } from './store'
import { escrow, type Guardar, type Avance } from './services/escrow'
import { NOMBRE_PASO, ORDEN, esHash } from './services/comprobantes'
import { unaVez } from './services/pasos'
import { firmar as firmarLocal, ambos, NOMBRE, plazoMs, textoPlazo } from './flujo'
import { usd } from './ui'
import type { Alquiler, Foto, Rol, Rubro, RespuestaRubro } from './types'
import { modoServidor, modoSolo, modoDe, dosPersonas } from './servidor/config'
import { trustless } from './services/trustless'
import { servidor } from './servidor/repositorio'
import { reglas17 } from './prueba/version'
import { pruebaCompleta } from './prueba/interruptor'
import { APROBADO_DUENO } from './prueba/dosPersonas'
import { registrarEntrega, finVentana } from './prueba/dueno'
import { repartoValido } from './prueba/mediacion'
import { nuevoReclamo, responderRubros as responderLocal, votarPropuesta as votarLocal, silencio } from './prueba/reclamos'

type Etapa = 'contrato' | 'entrada' | 'salida'
const iso = (a: Alquiler) => new Date(ahoraDe(a)).toISOString()
export { plazoMs, textoPlazo } from './flujo'   // viven en flujo.ts (puro) para usarlos también en «turno»


export interface Acciones {
  crear(d: { direccion: string; monto: number; inicio: string; fin: string; reglas: string[]; inquilinoEmail: string; propia?: { g: string; firma: 'cavos' | 'freighter' }; /** paso16-unido: declaración de quien invita (solo al invitar) */ declaracion?: string; /** PR #22 (b): versión de los Términos que acepta el dueño (solo al invitar) */ terminosVersion?: string }, email: string, cuenta?: string): Promise<{ id: string; link?: string }>
  firmar(a: Alquiler, etapa: Etapa, rol: Rol): Promise<void>
  /** Prueba completa (B.4): devolver todo el depósito ahora, después de la confirmación. */
  devolverTodo?(a: Alquiler, avance?: Avance): Promise<void>
  /** Prueba completa (6.4): reclamo por rubros; respuesta del inquilino por rubro; propuesta automática (6.7); regla del silencio (6.5 c). */
  reclamarRubros?(a: Alquiler, rubros: Rubro[], avance?: Avance): Promise<void>
  responderRubros?(a: Alquiler, resp: Record<string, RespuestaRubro>, avance?: Avance): Promise<void>
  votarPropuesta?(a: Alquiler, rol: Rol, si: boolean, avance?: Avance): Promise<void>
  aplicarSilencio?(a: Alquiler, avance?: Avance): Promise<void>
  /** Prueba completa (6.8 b, B.14): el reparto se elige con «Resolver el reclamo (simulación)». */
  resolverSimulacion?(a: Alquiler, alDueno: number, avance?: Avance): Promise<void>
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
  /** Dos personas (servidor): esta parte acepta el reparto `montoDueno` (lk_aceptar_acuerdo_mediacion). */
  aceptarAcuerdo?(a: Alquiler, montoDueno: number): Promise<void>
  /** Dos personas (servidor): el inquilino abrió el aviso del reclamo (6.5 b). */
  abrirAvisoReclamo?(a: Alquiler): Promise<void>
  /** Dos personas (servidor): el dueño toca «Recibí la casa» y empieza su plazo (lk_recibi_casa). */
  recibirCasa?(a: Alquiler): Promise<void>
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
      else if (reglas17(x)) registrarEntrega(x, cuando)   // prueba completa: el plazo del dueño empieza con «Recibí la casa» o a los 2 días
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
    if (x.estado !== 'ventana_reclamo' || x.reclamo || !x.ventanaInicio || ahoraDe(x) < (reglas17(x) ? finVentana(x) ?? Infinity : +new Date(x.ventanaInicio) + plazoMs(x))) return
    const r = await escrow.devolver(x, guardarEn(a.id), avance)
    store.cambiar(a.id, y => {
      if (y.estado !== 'ventana_reclamo' || y.reclamo) return
      y.estado = 'cerrado'; y.resultado = { inquilino: r.inquilino, dueno: 0, via: 'automatico', fecha: iso(y) }
      y.historial.push({ fecha: iso(y), texto: `Sin reclamos en ${textoPlazo(y)}: ${usd(r.inquilino)} devueltos al inquilino` })
    })
  }),
  // Prueba completa (B.4): «Todo bien, devolver» después de la confirmación. Devuelve todo ya; después no se puede reclamar en la app.
  devolverTodo: (a, avance = nada) => paso(a, 'devolucion', async x => {
    if (x.estado !== 'ventana_reclamo' || x.reclamo) return
    const r = await escrow.devolver(x, guardarEn(a.id), avance)
    store.cambiar(a.id, y => {
      if (y.estado !== 'ventana_reclamo' || y.reclamo) return
      y.estado = 'cerrado'; y.resultado = { inquilino: r.inquilino, dueno: 0, via: 'devuelto', fecha: iso(y) }
      // LEGAL: revisado (25/10, lista de Legal) · historial
      y.historial.push({ fecha: iso(y), texto: `El dueño tocó «Todo bien, devolver»: ${usd(r.inquilino)} devueltos al inquilino` })
    })
  }),
  // Prueba completa · reclamo por rubros: primero la disputa en la cuenta segura, después cambia la pantalla.
  reclamarRubros: (a, rubros, avance = nada) => paso(a, 'reclamo', async x => {
    if (x.estado !== 'ventana_reclamo' || x.reclamo) return
    await escrow.disputar(x, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado === 'ventana_reclamo' && !y.reclamo) nuevoReclamo(y, rubros, ahoraDe(y)) })
  }),
  responderRubros: (a, resp, avance = nada) => paso(a, 'reparto', async x => {
    if (x.estado !== 'reclamo' || !x.reclamo || x.reclamo.respuestas) return
    const prueba = structuredClone(x)
    if (responderLocal(prueba, resp, ahoraDe(x)) === 'propuesta') { store.cambiar(a.id, y => { if (y.estado === 'reclamo' && !y.reclamo!.respuestas) responderLocal(y, resp, ahoraDe(y)) }); return }
    const r = await escrow.resolver(x, x.reclamo.monto, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'reclamo') return; responderLocal(y, resp, ahoraDe(y)); y.estado = 'cerrado'; y.resultado = { dueno: r.dueno, inquilino: r.inquilino, via: 'acuerdo', fecha: iso(y) }
      y.historial.push({ fecha: iso(y), texto: `El inquilino aceptó el reclamo: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` }) })
  }),
  votarPropuesta: (a, rol, si, avance = nada) => paso(a, 'reparto', async x => {
    if (x.estado !== 'reclamo' || !x.reclamo?.propuesta || x.reclamo.propuesta[rol]) return
    const que = votarLocal(structuredClone(x), rol, si, ahoraDe(x))
    if (que !== 'aplicar') {
      // LEGAL: revisado (25/10, lista de Legal) · historial
      store.cambiar(a.id, y => { if (y.estado !== 'reclamo' || y.reclamo!.propuesta![rol]) return; if (votarLocal(y, rol, si, ahoraDe(y)) === 'mediacion') { y.estado = 'mediacion'; y.historial.push({ fecha: iso(y), texto: 'No hubo acuerdo con la propuesta automática. Pasa a la Mediación Lockumi (demo)' }) } })
      return
    }
    const r = await escrow.resolver(x, x.reclamo.propuesta.alDueno, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'reclamo') return; votarLocal(y, rol, si, ahoraDe(y)); y.estado = 'cerrado'; y.resultado = { dueno: r.dueno, inquilino: r.inquilino, via: 'acuerdo', fecha: iso(y) }
      // LEGAL: revisado (25/10, lista de Legal) · historial
      y.historial.push({ fecha: iso(y), texto: `Los dos aceptaron la propuesta automática: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` }) })
  }),
  aplicarSilencio: (a, avance = nada) => paso(a, 'reparto', async x => {
    const s = silencio(x, ahoraDe(x)); if (!s) return
    if (s.tipo === 'mediacion') {
      // LEGAL: revisado (25/10, lista de Legal) · historial (6.5 c: el silencio no es aceptación)
      store.cambiar(a.id, y => { if (y.estado !== 'reclamo') return; y.estado = 'mediacion'; y.historial.push({ fecha: iso(y), texto: dosPersonas ? `El inquilino no respondió a tiempo. El silencio no es aceptación. ${s.motivo} Pasa a la Mediación Lockumi (demo)` : `El inquilino no respondió en 7 días naturales. ${s.motivo} Pasa a la Mediación Lockumi (demo)` }) })
      return
    }
    const r = await escrow.resolver(x, s.alDueno, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'reclamo') return; y.estado = 'cerrado'; y.resultado = { dueno: r.dueno, inquilino: r.inquilino, via: 'propuesta', fecha: iso(y) }
      // LEGAL: revisado (25/10, lista de Legal) · historial
      y.historial.push({ fecha: iso(y), texto: `Se aplicó la propuesta automática (Regla 6.5.1): ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` }) })
  }),
  resolverSimulacion: (a, alDueno, avance = nada) => paso(a, 'reparto', async x => {
    if (x.estado !== 'mediacion') return
    if (!repartoValido(x, alDueno)) throw new Error('El dueño no puede recibir más de lo que reclamó.')   // LEGAL: revisado (25/10, lista de Legal)
    const r = await escrow.resolver(x, alDueno, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'mediacion') return; y.estado = 'cerrado'; y.resultado = { dueno: r.dueno, inquilino: r.inquilino, via: 'simulacion', fecha: iso(y) }
      // LEGAL: revisado (24/10, v4) · B.14 (título del aviso del resultado)
      y.historial.push({ fecha: iso(y), texto: `Reclamo resuelto (simulación): ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` }) })
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
  // U4 (27/10/2026): al firmar el contrato, si el alquiler no trae la cuenta de quien firma (el dueño lo creó sin sesión de Cavos), se guarda
  // antes la de su billetera; sin sesión no hace nada y la firma sigue igual.
  firmar: async (a, etapa) => {
    if (etapa === 'contrato' && modoDe(a).trustless && a.miRol && !a.cuentas?.[a.miRol]) await trustless.guardarCuentaSiFalta(a.id)
    await servidor.firmar(a.id, etapa)        // el servidor deduce el rol de la sesión
  },
  marcar: (a, etapa, c, i, e) => servidor.marcar(a.id, etapa, c, i, e).then(() => {}),
  nota: (a, etapa, c, n) => servidor.nota(a.id, etapa, c, n).then(() => {}),
  agregarFoto: (a, etapa, c, f) => servidor.agregarFoto(a.id, etapa, c, f).then(() => {}),
  // Sin Trustless Work el pago queda registrado sin transacción (tx null). Con TW: escrow real en testnet y su hash.
  pagar: async (a, avance = nada) => { await servidor.registrarPago(a.id, modoDe(a).trustless ? await trustless.depositar(a.id, a.monto, avance, a.cuentas?.inquilino) : null) },
  iniciarSalida: a => servidor.iniciarSalida(a.id).then(() => {}),
  // 26/10/2026: el dueño puede recibir USDC en el reparto; al reclamar deja lista su cuenta (sin bloquear el reclamo si falla).
  reclamar: async (a, m, mot, fotos) => {
    if (modoDe(a).trustless) await trustless.prepararDueno(a.cuentas?.dueno, a.id).catch(e => console.warn('[Lockumi] cuenta del dueño:', e instanceof Error ? e.message : e))
    await servidor.reclamar(a.id, m, mot, fotos)
  },
  // PR #22: si el inquilino acepta, el servidor cierra por acuerdo y /api/tw paga el reparto en la red («repartir»).
  // 27/10/2026 (b10557f9): la prueba de billetera se firma ANTES de cerrar (si falta la sesión de Cavos, el reclamo queda abierto).
  // Si el pago falla después, el caso queda «cerrado» sin liquidacion_tx = por pagar, y se reintenta por el servidor (pagarReparto).
  async responder(a, acepta) {
    const pagar = acepta && modoDe(a).trustless && !!a.escrowId
    const prueba = pagar ? await trustless.pruebaReparto(a.id) : undefined
    await servidor.responder(a.id, acepta)
    if (pagar) await trustless.repartir(a.id, prueba)
  },
  async cerrarSinReclamo(a) {
    const cerro = await servidor.cerrarSinReclamo(a.id)
    // PR #22: un caso ya cerrado por acuerdo o por la mediación con las dos aceptaciones y sin pagar → «repartir» (el servidor lo valida).
    if (a.estado === 'cerrado' && (a.resultado?.via === 'acuerdo' || a.resultado?.via === 'mediacion')) {
      if (modoDe(a).trustless && a.escrowId && !a.liquidacionTx) await trustless.repartir(a.id)
      return
    }
    // Con TW: la plataforma libera el 100 % al inquilino (necesita la aprobación del dueño en la cadena).
    if (modoDe(a).trustless && a.escrowId && (cerro || (a.estado === 'cerrado' && !a.liquidacionTx)))
      // Paso 7 (interruptor encendido): sin la aprobación del dueño, devolución automática del 100 % al inquilino.
      await (pruebaCompleta() && !a.historial.some(e => e.texto === APROBADO_DUENO) ? trustless.devolverAutomatico(a.id) : trustless.liberar(a.id))
  },
  aprobarDevolucion: async (a: Alquiler) => { if (!modoDe(a).trustless) throw new Error('Esta aprobación solo existe con la red de prueba.'); await trustless.aprobarDevolucion(a.id) },
  async decidir(a, m, mot) { await servidor.decidir(a.id, m, mot); if (modoDe(a).trustless && a.escrowId) await trustless.repartir(a.id) },
  async aceptarAcuerdo(a, m) {
    const tope = a.reclamo?.monto ?? 0
    if (!(m >= 0 && m <= tope)) throw new Error('El monto para el dueño debe estar entre 0 y lo reclamado.')
    await servidor.aceptarAcuerdo(a.id, Math.round(m * 100) / 100)
  },
  abrirAvisoReclamo: a => servidor.abrirAvisoReclamo(a.id).then(() => {}),
  recibirCasa: a => servidor.recibirCasa(a.id).then(() => {}),
  aplicarSilencio: a => servidor.aplicarSilencio(a.id).then(() => {}),
}

/** Acciones de los alquileres con otra persona (servidor compartido). `crear` e invitar usan estas directamente. */
export const accionesServidor = remoto
/** Cada alquiler usa sus acciones: el de dos personas va al servidor; el de una persona sigue en este navegador como hoy. */
const de = (a?: Alquiler): Acciones => modoServidor || modoDe(a).servidor ? remoto : local
export const acciones: Acciones = new Proxy(local, {
  get(_, k: keyof Acciones) {
    if (k === 'crear') return modoServidor ? remoto.crear : local.crear
    if (!(k in local) && !(k in remoto)) return undefined
    return (a: Alquiler, ...resto: unknown[]) => {
      const f = de(a)[k] as ((...x: unknown[]) => unknown) | undefined
      if (!f) return Promise.reject(new Error('Este paso no está disponible en este alquiler. Vuelve a abrirlo desde «Tus alquileres».'))
      return f(a, ...resto)
    }
  },
})
