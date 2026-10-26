// PROTOTIPO eliminar-alquiler: reglas en el aparato (prueba/eliminar.ts) con casos negativos. El servidor está simulado: solo se
// comprueba que se le pide lo correcto (sus reglas se prueban en servidor/__tests__/eliminar-alquiler-sql.test.ts).
import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.hoisted(() => { for (const n of ['localStorage', 'sessionStorage']) { const mem = new Map<string, string>(); (globalThis as Record<string, unknown>)[n] = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() } } })
const srv = vi.hoisted(() => ({ eliminarAlquiler: vi.fn(async () => {}), ocultarAlquiler: vi.fn(async () => {}), reiniciarMiDemo: vi.fn(async () => ({ eliminados: 0, ocultos: 1, quedan: 1 })) }))
const olvidarInvitacion = vi.hoisted(() => vi.fn())
vi.mock('../../servidor/repositorio', () => ({ servidor: srv, olvidarInvitacion, repositorio: { todos: () => [], obtener: () => undefined, subscribe: () => () => {} } }))
import { store, actaVacia } from '../../store'
import type { Alquiler } from '../../types'
import { cuentaParaPuntaje, calcularPuntaje } from '../../reputacion/puntaje'
import { fijarVista } from '../../store'
import { opcionDe, eliminarAlquiler, ocultarAlquiler, reiniciarMiDemo, planReinicio, oculto, NoSePuede } from '../eliminar'

const YO = 'demo@lockumi.com', OTRA = 'otra@ejemplo.com', DUENO = 'Dueño de prueba (cuenta de Lockumi para la demo)'
const base = (id: string, x: Partial<Alquiler> = {}): Alquiler => ({ id, direccion: 'Casa ejemplo ' + id, monto: 20, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-04-30', reglas: [],
  duenoEmail: DUENO, inquilinoEmail: YO, estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: actaVacia(), diasSimulados: 0, ...x })
const ESCROW = 'C' + 'A'.repeat(55)
const sembrar = (xs: Alquiler[]) => { localStorage.setItem('lockumi.alquileres.v3', JSON.stringify(xs)); store.fresco('x') }
const ids = () => store.todos().map(a => a.id).sort()

beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

describe('qué se puede hacer', () => {
  it('sin depósito: eliminar; con depósito abierto: nada (se explica); terminado: ocultar', () => {
    expect(opcionDe(base('a', { estado: 'firmas' }), YO)).toBe('eliminar')
    expect(opcionDe(base('a', { estado: 'pendiente_pago' }), YO)).toBe('eliminar')
    for (const estado of ['fotos_entrada', 'en_curso', 'salida', 'ventana_reclamo', 'reclamo', 'mediacion'] as const) expect(opcionDe(base('a', { estado, pago: '2026-10-20' }), YO)).toBe('esperar')
    expect(opcionDe(base('a', { estado: 'cerrado', pago: '2026-10-20' }), YO)).toBe('ocultar')
  })
  it('con cuenta de garantía creada en la red (aunque sin depósito): no se elimina, solo se oculta', () => {
    expect(opcionDe(base('a', { estado: 'pendiente_pago', red: { escrow: ESCROW, txs: {} } }), YO)).toBe('ocultar')
    expect(opcionDe(base('a', { estado: 'pendiente_pago', red: { escrow: ESCROW, txs: { deposito: 'f'.repeat(64) } } }), YO)).toBe('esperar')
  })
  it('lo de otra persona: ninguna opción', () => { expect(opcionDe(base('a', { inquilinoEmail: OTRA }), YO)).toBeNull() })
  it('con otra persona: el dueño elimina solo antes de que acepte; el inquilino nunca elimina', () => {
    expect(opcionDe(base('a', { dosPersonas: true, miRol: 'dueno', inquilinoUnido: false }), YO)).toBe('eliminar')
    expect(opcionDe(base('a', { dosPersonas: true, miRol: 'dueno', inquilinoUnido: true }), YO)).toBe('ocultar')
    expect(opcionDe(base('a', { dosPersonas: true, miRol: 'inquilino', inquilinoUnido: true }), YO)).toBe('ocultar')
    expect(opcionDe(base('a', { dosPersonas: true, miRol: 'dueno', inquilinoUnido: true, estado: 'en_curso', escrowId: ESCROW }), YO)).toBe('esperar')
    expect(opcionDe(base('a', { dosPersonas: true, miRol: 'dueno', inquilinoUnido: true, estado: 'cerrado', escrowId: ESCROW }), YO)).toBe('esperar')   // falta la devolución
    expect(opcionDe(base('a', { dosPersonas: true, miRol: 'dueno', inquilinoUnido: true, estado: 'cerrado', escrowId: ESCROW, liquidacionTx: 'f'.repeat(64) }), YO)).toBe('ocultar')
  })
})

describe('eliminar y ocultar en este aparato', () => {
  it('elimina el que no tiene depósito y nada más', async () => {
    sembrar([base('a'), base('b', { estado: 'en_curso', pago: '2026-10-20' })])
    expect(await eliminarAlquiler('a', YO)).toBe('Casa ejemplo a'); expect(ids()).toEqual(['b'])
  })
  it('NO elimina con depósito, aunque la pantalla estuviera abierta de antes (vuelve a leer lo guardado)', async () => {
    sembrar([base('a', { estado: 'fotos_entrada', pago: '2026-10-20' })])
    await expect(eliminarAlquiler('a', YO)).rejects.toThrow(NoSePuede); expect(ids()).toEqual(['a'])
  })
  it('NO elimina ni oculta el de otra persona', async () => {
    sembrar([base('a', { inquilinoEmail: OTRA }), base('b', { inquilinoEmail: OTRA, estado: 'cerrado', pago: 'x' })])
    await expect(eliminarAlquiler('a', YO)).rejects.toThrow(NoSePuede)
    await expect(ocultarAlquiler('b', YO)).rejects.toThrow(NoSePuede); expect(ids()).toEqual(['a', 'b'])
    expect(oculto(store.obtener('b')!, YO)).toBe(false)
  })
  it('ocultar solo me lo esconde a mí y no borra el historial; se puede volver a mostrar', async () => {
    sembrar([base('a', { estado: 'cerrado', pago: 'x', historial: [{ fecha: '2026-10-01', texto: 'Alquiler creado' }] })])
    await ocultarAlquiler('a', YO)
    const a = store.obtener('a')!; expect(oculto(a, YO)).toBe(true); expect(oculto(a, OTRA)).toBe(false); expect(a.historial).toHaveLength(1)
    await ocultarAlquiler('a', YO, false); expect(oculto(store.obtener('a')!, YO)).toBe(false)
  })
  it('NO oculta con un depósito guardado', async () => {
    sembrar([base('a', { estado: 'en_curso', pago: 'x' })]); await expect(ocultarAlquiler('a', YO)).rejects.toThrow(NoSePuede)
  })
  it('con otra persona va al servidor solo si la regla lo permite', async () => {
    const dos = base('s', { dosPersonas: true, miRol: 'dueno', inquilinoUnido: false })
    await eliminarAlquiler('s', YO, dos); expect(srv.eliminarAlquiler).toHaveBeenCalledWith('s')
    await expect(eliminarAlquiler('s', YO, { ...dos, inquilinoUnido: true })).rejects.toThrow(NoSePuede); expect(srv.eliminarAlquiler).toHaveBeenCalledTimes(1)
  })
})

describe('Reiniciar mi demo', () => {
  it('solo mis alquileres: elimina sin depósito, oculta los terminados, deja los que tienen depósito y no toca los de otras personas', async () => {
    const otros = [base('o1', { inquilinoEmail: OTRA }), base('o2', { inquilinoEmail: OTRA, estado: 'cerrado', pago: 'x' })]
    const conDep = base('d', { estado: 'en_curso', pago: '2026-10-20', red: { escrow: ESCROW, txs: { deposito: 'f'.repeat(64) } } })
    sembrar([base('a'), base('b', { estado: 'pendiente_pago' }), base('c', { estado: 'cerrado', pago: 'x' }), conDep, ...otros])
    const antes = JSON.stringify(store.obtener('d')), otrosAntes = JSON.stringify(otros.map(o => store.obtener(o.id)))
    expect(planReinicio(store.todos(), YO)).toMatchObject({ eliminar: [{ id: 'a' }, { id: 'b' }], ocultar: [{ id: 'c' }], quedan: [{ id: 'd' }] })
    expect(await reiniciarMiDemo(YO, store.todos())).toEqual({ eliminados: 2, ocultos: 1, quedan: 1 })
    expect(ids()).toEqual(['c', 'd', 'o1', 'o2'])
    expect(JSON.stringify(store.obtener('d'))).toBe(antes)                                   // el del depósito, intacto (cuenta de garantía incluida)
    expect(JSON.stringify(otros.map(o => store.obtener(o.id)))).toBe(otrosAntes)              // los de otra persona, intactos
    expect(srv.reiniciarMiDemo).not.toHaveBeenCalled()                                       // sin alquileres con otra persona, no llama al servidor
  })
  it('con alquileres con otra persona, una sola llamada al servidor (que solo ve los de mi sesión) y suma el resultado', async () => {
    sembrar([base('a')])
    const r = await reiniciarMiDemo(YO, [...store.todos(), base('s', { dosPersonas: true, miRol: 'inquilino', inquilinoUnido: true, estado: 'cerrado' })])
    expect(srv.reiniciarMiDemo).toHaveBeenCalledTimes(1); expect(r).toEqual({ eliminados: 1, ocultos: 1, quedan: 1 })
  })
})

describe('Legal (revisión de c97585b)', () => {
  const marcar = (id: string) => { fijarVista(id, 'dueno'); localStorage.setItem('lk:invitacion-enviada:' + id, '1'); localStorage.setItem('lk:invitacion-correo:' + id, 'invitada@correo.com') }
  const rastro = (id: string) => [JSON.parse(localStorage.getItem('lockumi.vista') || '{}')[id], localStorage.getItem('lk:invitacion-enviada:' + id), localStorage.getItem('lk:invitacion-correo:' + id)].filter(x => x != null)
  it('eliminar borra también lo que este aparato guardaba de ese alquiler (incluido el correo de la persona invitada)', async () => {
    sembrar([base('a'), base('b')]); marcar('a'); marcar('b')
    await eliminarAlquiler('a', YO)
    expect(rastro('a')).toEqual([]); expect(olvidarInvitacion).toHaveBeenCalledWith('a')
    expect(rastro('b')).toHaveLength(3)                                     // el otro alquiler no se toca
  })
  it('con otra persona: después de borrar en el servidor, también; y lo que borra «Reiniciar mi demo» en el servidor', async () => {
    marcar('s'); await eliminarAlquiler('s', YO, base('s', { dosPersonas: true, miRol: 'dueno', inquilinoUnido: false }))
    expect(rastro('s')).toEqual([]); expect(olvidarInvitacion).toHaveBeenCalledWith('s')
    marcar('t'); srv.reiniciarMiDemo.mockResolvedValueOnce({ eliminados: 1, ocultos: 0, quedan: 0, ids: ['t'] } as never)
    await reiniciarMiDemo(YO, [base('t', { dosPersonas: true, miRol: 'dueno', inquilinoUnido: false })])
    expect(rastro('t')).toEqual([]); expect(olvidarInvitacion).toHaveBeenCalledWith('t')
  })
  it('si falla en el servidor, no se borra nada de este aparato', async () => {
    marcar('u'); srv.eliminarAlquiler.mockRejectedValueOnce(new Error('x'))
    await expect(eliminarAlquiler('u', YO, base('u', { dosPersonas: true, miRol: 'dueno', inquilinoUnido: false }))).rejects.toThrow()
    expect(rastro('u')).toHaveLength(3); expect(olvidarInvitacion).not.toHaveBeenCalled()
  })
  it('nada en la red: con cualquier paso ya registrado en la red de prueba (aunque sin cuenta de garantía) no se elimina, solo se oculta', async () => {
    for (const txs of [{ trustline: 'a'.repeat(64) }, { compra: 'b'.repeat(64) }]) expect(opcionDe(base('a', { estado: 'pendiente_pago', red: { txs } }), YO)).toBe('ocultar')
    expect(opcionDe(base('a', { estado: 'pendiente_pago', red: { txs: {} } }), YO)).toBe('eliminar')
    sembrar([base('r', { estado: 'pendiente_pago', red: { txs: { trustline: 'a'.repeat(64) } } })])
    await expect(eliminarAlquiler('r', YO)).rejects.toBeInstanceOf(NoSePuede); expect(ids()).toEqual(['r'])
  })
  it('15.7: un alquiler que se puede eliminar nunca cuenta para la reputación; ocultar no cambia el puntaje', () => {
    const todos = (['firmas', 'pendiente_pago', 'fotos_entrada', 'en_curso', 'salida', 'ventana_reclamo', 'reclamo', 'mediacion', 'cerrado'] as const)
      .flatMap(estado => [base('x', { estado }), base('y', { estado, resultado: { via: 'automatico', dueno: 0, inquilino: 20 } as Alquiler['resultado'] }),
        base('z', { estado, dosPersonas: true, miRol: 'dueno', inquilinoUnido: false, resultado: { via: 'automatico', dueno: 0, inquilino: 20 } as Alquiler['resultado'] })])
    const eliminables = todos.filter(a => opcionDe(a, YO) === 'eliminar')
    expect(eliminables.length).toBeGreaterThan(0); expect(eliminables.some(cuentaParaPuntaje)).toBe(false)
    const cerrados = Array.from({ length: 4 }, (_, i) => base('c' + i, { estado: 'cerrado', pago: '2026-01-01', resultado: { via: 'automatico', dueno: 0, inquilino: 20 } as Alquiler['resultado'] }))
    const ocultos = cerrados.map(a => ({ ...a, ocultoPor: { [YO]: '2026-10-26' }, ocultoParaMi: true }))
    for (const rol of ['dueno', 'inquilino'] as const) expect(calcularPuntaje(ocultos, rol)).toEqual(calcularPuntaje(cerrados, rol))
  })
})

describe('Legal (OK de PR #35)', () => {
  it('con dos personas, la invitación eliminada «ya no está disponible» (mismo texto que el servidor)', async () => {
    const { T } = await import('../eliminar-textos')
    expect(T.eliminarPuntos(true)[1]).toBe('La invitación deja de funcionar. Si la otra persona abre el enlace, verá que ya no está disponible.')
    expect(T.eliminarPuntos(true).join(' ')).not.toMatch(/válid/)
  })
})
