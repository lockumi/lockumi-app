// U4 (27/10/2026, prueba real d475db0a): el dueño entró solo con la llave de acceso (pestaña sin token de Cavos), creó el alquiler y firmó;
// el alquiler quedó sin su cuenta y al pagar el inquilino recibió 409 «Falta la cuenta Stellar del dueño.». Arreglo (como el #62 para el
// inquilino): al firmar el contrato, y al abrir el paso del depósito como dueño, se guarda la cuenta de su billetera si falta.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const b = vi.hoisted(() => ({ llamadas: [] as string[], sinSesion: false, guardarFalla: false }))
const G = vi.hoisted(() => 'GDJU2MWJWMC37S3PWUVUABI2NPDMGGTMCMY2O3PFNTWMPFDL7QL3VRBX')
vi.mock('../billetera', () => ({
  conectarBilletera: async () => { b.llamadas.push('conectar'); if (b.sinSesion) throw new Error('La sesión de Cavos no tiene token en esta pestaña'); return { direccion: G, estado: 'ready' } },
  firmarXdr: async (x: string) => x, firmarPrueba: async () => ({}), mensajeFirma: (e: unknown) => String(e), esTextoNoFirmante: () => false,
}))
vi.mock('../../servidor/repositorio', () => ({
  tokenSesion: async () => 't', recargar: async () => {},
  servidor: {
    actualizarCuenta: async (_id: string, g: string) => { if (b.guardarFalla) throw new Error('El depósito ya está creado: la cuenta no se puede cambiar.'); b.llamadas.push('guardar:' + (g === G ? 'billetera' : 'otra')) },
    firmar: async (_id: string, etapa: string) => { b.llamadas.push('firmar:' + etapa) },
  },
}))
vi.mock('../../servidor/config', async orig => ({ ...(await orig<typeof import('../../servidor/config')>()), modoDe: () => ({ servidor: true, trustless: true, dosPersonas: true }) }))

const A = (x: Record<string, unknown>) => ({ id: 'a1', estado: 'firmas', dosPersonas: true, contrato: { firmas: {} }, entrada: { firmas: {} }, ...x }) as never

describe('trustless.guardarCuentaSiFalta', () => {
  beforeEach(() => { b.llamadas.length = 0; b.sinSesion = false; b.guardarFalla = false; vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  it('sin cuenta en el alquiler: guarda la de la billetera conectada', async () => {
    const { trustless } = await import('../trustless')
    expect(await trustless.guardarCuentaSiFalta('a1')).toBe(true)
    expect(b.llamadas).toEqual(['conectar', 'guardar:billetera'])
  })
  it('con la cuenta ya guardada no conecta ni guarda', async () => {
    const { trustless } = await import('../trustless')
    expect(await trustless.guardarCuentaSiFalta('a1', G)).toBe(false); expect(b.llamadas).toEqual([])
  })
  it('sin sesión de Cavos en la pestaña (llave de acceso sola): no guarda y nunca lanza', async () => {
    b.sinSesion = true; const { trustless } = await import('../trustless')
    expect(await trustless.guardarCuentaSiFalta('a1')).toBe(false); expect(b.llamadas).toEqual(['conectar'])
  })
  it('si el servidor no deja (cuenta segura ya creada): no lanza', async () => {
    b.guardarFalla = true; const { trustless } = await import('../trustless')
    expect(await trustless.guardarCuentaSiFalta('a1')).toBe(false)
  })
})

describe('acciones (servidor): firmar el contrato guarda antes la cuenta que falta', () => {
  beforeEach(() => { b.llamadas.length = 0; b.sinSesion = false; b.guardarFalla = false; vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  it('dueño sin cuenta en el alquiler: guarda la de su billetera y después firma', async () => {
    const { accionesServidor } = await import('../../acciones')
    await accionesServidor.firmar(A({ miRol: 'dueno', cuentas: { inquilino: G } }), 'contrato', 'dueno')
    expect(b.llamadas).toEqual(['conectar', 'guardar:billetera', 'firmar:contrato'])
  })
  it('sin sesión de Cavos: la firma sigue igual (no se corta)', async () => {
    b.sinSesion = true; const { accionesServidor } = await import('../../acciones')
    await accionesServidor.firmar(A({ miRol: 'dueno', cuentas: {} }), 'contrato', 'dueno')
    expect(b.llamadas).toEqual(['conectar', 'firmar:contrato'])
  })
  it('con la cuenta ya guardada, o en las fotos, solo firma', async () => {
    const { accionesServidor } = await import('../../acciones')
    await accionesServidor.firmar(A({ miRol: 'dueno', cuentas: { dueno: G } }), 'contrato', 'dueno')
    await accionesServidor.firmar(A({ miRol: 'dueno', cuentas: {} }), 'entrada', 'dueno')
    expect(b.llamadas).toEqual(['firmar:contrato', 'firmar:entrada'])
  })
})

describe('respaldo en el paso del depósito (dueño que ya firmó sin cuenta)', () => {
  it('Detalle/Pago: solo el dueño, con Trustless Work, sin cuenta segura y sin su cuenta; sin textos nuevos', async () => {
    const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
    const d = fs.readFileSync(new URL('../../screens/Detalle.tsx', import.meta.url), 'utf8')
    expect(d).toContain("if (conTw && rol === 'dueno' && a.miRol === 'dueno' && !a.escrowId && !a.cuentas?.dueno) void trustless.guardarCuentaSiFalta(a.id)")
  })
})
