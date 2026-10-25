import { pruebaCompleta } from './prueba/interruptor'
import { terminosActual } from './legal/documentos'
import { modoServidor, modoSolo, modoPrueba, escrowReal } from './servidor/config'
import { repositorio } from './servidor/repositorio'
import { useSyncExternalStore } from 'react'
import type { Acta, Alquiler, Rol } from './types'
import { fotoEjemplo } from './demoFotos'
// v3: flujo nuevo (contrato y firmas antes del depósito). Fase 1 en testnet: almacén aparte y sin ejemplos ficticios.
// Cada modo guarda aparte: los alquileres de la fase 1 mínima (5 pasos) no se mezclan con los del flujo completo.
const K = modoSolo ? 'lockumi.alquileres.testnet.v1' : modoPrueba ? 'lockumi.alquileres.prueba.v2' : 'lockumi.alquileres.v3'
export const DIA = 86_400_000
const CUARTOS: [string, string[]][] = [
  ['Sala', ['Paredes y pintura', 'Piso', 'Ventanas y cortinas']],
  ['Cocina', ['Cocina y horno', 'Fregadero y grifería', 'Muebles']],
  ['Dormitorio', ['Paredes y pintura', 'Clóset', 'Puerta y llavín']],
  ['Baño', ['Ducha', 'Inodoro y lavamanos', 'Azulejos']],
]
export const actaVacia = (): Acta => ({ firmas: {}, cuartos: CUARTOS.map(([nombre, items]) => ({ nombre, nota: '', fotos: [], items: items.map(texto => ({ texto, estado: null })) })) })
const actaLista = (fecha: string): Acta => ({ firmas: { dueno: fecha, inquilino: fecha }, cuartos: CUARTOS.map(([nombre, items], i) => ({ nombre, nota: '',
  fotos: [{ src: fotoEjemplo(nombre, 'entrada', i), por: i % 2 ? 'inquilino' : 'dueno', fecha, origen: 'ejemplo' as const }], items: items.map(texto => ({ texto, estado: 'bien' as const })) })) })
// Datos de ejemplo (ficticios) para la demo.
const semilla = (): Alquiler[] => modoPrueba ? [] : [
  { id:'a1', direccion:'Apartamento ejemplo · Escazú', monto:800, moneda:'USD', inicio:'2026-11-01', fin:'2027-10-31',
    reglas:['No se permiten mascotas','Pintura de paredes a cargo del dueño'], duenoEmail:'katherine@ejemplo.cr', inquilinoEmail:'inquilino@ejemplo.cr',
    estado:'en_curso', rendimiento:false, escrowId:'sim-a1', contrato:{ firmas:{ dueno:'2026-10-11T15:00:00Z', inquilino:'2026-10-11T18:00:00Z' } }, entrada: actaLista('2026-10-13T15:00:00Z'), pago:'2026-10-12T15:00:00Z', diasSimulados:0,
    historial:[{fecha:'2026-10-10T15:00:00Z',texto:'Alquiler creado'},{fecha:'2026-10-11T18:00:00Z',texto:'Contrato firmado por los dos'},{fecha:'2026-10-12T15:00:00Z',texto:'Depósito pagado y guardado'},{fecha:'2026-10-13T15:00:00Z',texto:'Fotos de entrada confirmadas por los dos'}] },
  { id:'a2', direccion:'Casa ejemplo · Heredia centro', monto:600, moneda:'USD', inicio:'2026-12-01', fin:'2027-05-31',
    reglas:['Jardín a cargo del inquilino'], duenoEmail:'katherine@ejemplo.cr', inquilinoEmail:'otra@ejemplo.cr',
    estado:'firmas', rendimiento:false, escrowId:'sim-a2', contrato:{ firmas:{} }, entrada: actaVacia(), diasSimulados:0, historial:[{fecha:'2026-10-15T15:00:00Z',texto:'Alquiler creado'}] },
]
const leer = (): Alquiler[] => { try { const s = localStorage.getItem(K); return s ? JSON.parse(s) : semilla() } catch { return semilla() } }
let datos: Alquiler[] = leer()
const subs = new Set<() => void>()
let avisoEspacio = false
/** Varias pestañas: antes de cada cambio se vuelve a leer lo guardado (no se pisa lo que hizo otra pestaña) y,
 *  cuando otra pestaña guarda, esta se actualiza sola. Si no hay espacio para guardar, se sigue con lo que hay en memoria. */
const recargar = () => { if (!avisoEspacio) datos = leer() }
if (typeof window !== 'undefined') window.addEventListener('storage', e => { if (e.key === K) { datos = leer(); subs.forEach(f => f()) } })
const guardar = () => {
  try { localStorage.setItem(K, JSON.stringify(datos)); avisoEspacio = false } catch { avisoEspacio = true }
  subs.forEach(f => f())
}
export const ahoraReal = () => new Date().toISOString()
/** Reloj de la demo: hora real + días simulados de ese alquiler. */
export const ahoraDe = (a: Alquiler) => Date.now() + a.diasSimulados * DIA
export const store = {
  todos: () => datos,
  obtener: (id: string) => datos.find(a => a.id === id),
  /** El alquiler tal como está guardado ahora (incluye cambios de otras pestañas). */
  fresco: (id: string) => { recargar(); return datos.find(a => a.id === id) },
  sinEspacio: () => avisoEspacio,
  crear(a: Pick<Alquiler,'direccion'|'monto'|'inicio'|'fin'|'reglas'|'duenoEmail'|'inquilinoEmail'>) {
    const n: Alquiler = { ...a, moneda: escrowReal ? 'USDC' : 'USD', id: escrowReal ? crypto.randomUUID() : 'a' + Date.now().toString(36), estado:'firmas', rendimiento:false, contrato:{ firmas:{} }, entrada: actaVacia(), diasSimulados: 0, ...(pruebaCompleta() ? { terminos: { version: terminosActual().version } } : {}),
      historial:[{fecha:ahoraReal(),texto:'Alquiler creado'}] }
    recargar(); datos = [n, ...datos]; guardar(); return n
  },
  /** Aplica un cambio inmutable y, si se indica, agrega un evento al historial. */
  cambiar(id: string, fn: (a: Alquiler) => void, evento?: string) {
    recargar()
    datos = datos.map(a => {
      if (a.id !== id) return a
      const c: Alquiler = structuredClone(a); fn(c)
      if (evento) c.historial.push({ fecha: new Date(ahoraDe(c)).toISOString(), texto: evento })
      return c
    }); guardar()
  },
  reiniciar() { datos = semilla(); localStorage.removeItem('lockumi.vista'); guardar() },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
}
export const useAlquileres = () => useSyncExternalStore(modoServidor ? repositorio.subscribe : store.subscribe, modoServidor ? repositorio.todos : store.todos)
/** Alquiler por id desde el origen activo (servidor compartido o demo local). */
export const obtener = (id: string) => modoServidor ? repositorio.obtener(id) : store.obtener(id)
const KV = 'lockumi.vista'
/** Rol real según el alquiler: quien lo creó es dueño; quien fue invitado, inquilino. */
export const rolDe = (a: Alquiler, email?: string): Rol => a.miRol ?? (email && email.toLowerCase() === a.inquilinoEmail.toLowerCase() ? 'inquilino' : 'dueno')
/** Demo en un solo dispositivo: vista elegida con «Ver como…» para un alquiler (si no hay, el rol real). */
export const vistaDe = (a: Alquiler, email?: string): Rol => { if (a.miRol) return a.miRol; try { const v = JSON.parse(localStorage.getItem(KV) || '{}')[a.id]; return v ?? rolDe(a, email) } catch { return rolDe(a, email) } }
export const fijarVista = (id: string, r: Rol) => { let m: Record<string, Rol> = {}; try { m = JSON.parse(localStorage.getItem(KV) || '{}') } catch { /* vacío */ } m[id] = r; localStorage.setItem(KV, JSON.stringify(m)); datos = [...datos]; subs.forEach(f => f()) }
export const actaCompleta = (a: Acta) => a.cuartos.every(c => c.fotos.length > 0 && c.items.every(i => i.estado))
export const firmo = (a: Acta, r: Rol) => Boolean(a.firmas[r])
