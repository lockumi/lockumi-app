import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
vi.mock('../../services/auth', async o => ({ ...(await o() as object), auth: { actual: () => ({ email: 'ana.prueba@ejemplo.cr', nombre: 'Ana', metodo: 'google' }), salir() {}, olvidarUsuarioLocal() {} } }))
const { PuertaFirmante, PedirEntrar, ErrorPago } = await import('../Firmante')
const { TEXTOS_FIRMANTE: T, SIN_SESION } = await import('../../services/firmante')
const { NO_FIRMANTE } = await import('../../services/billetera')
const x = { email: 'ana.prueba@ejemplo.cr', nombre: 'Ana', metodo: 'google' as const }
const ver = (e: Parameters<typeof PuertaFirmante>[0]['estado']) => renderToStaticMarkup(<PuertaFirmante x={x} estado={e} reintentar={() => {}} otraCuenta={() => {}} />)

describe('pantalla al entrar cuando este dispositivo no puede firmar', () => {
  it('mientras se prueba: solo «Entrando a tu cuenta…», sin mensaje', () => {
    const h = ver('probando'); expect(h).toContain('Entrando a tu cuenta…'); expect(h).not.toContain(T.titulo); expect(h).not.toContain('<button')
  })
  it('sin la llave en este dispositivo: abrir Lockumi en el dispositivo de origen (sin llave de acceso)', () => {
    const h = ver('no-firmante'); expect(h).toContain(T.titulo); expect(h).toContain(T.sinLlave); expect(h).not.toMatch(/llave de acceso|passkey/i)
  })
  it('el mensaje del dispositivo solo aparece cuando hace falta', () => {
    for (const e of ['error', 'sin-sesion', 'probando'] as const) expect(ver(e)).not.toContain(T.titulo)
    expect(ver('error')).toContain(T.reintentar); expect(ver('sin-sesion')).toContain(T.entrar)
  })
  it('textos cortos, sin voseo ni palabras técnicas', () => {
    for (const t of [...Object.values(T), SIN_SESION]) { expect(t).not.toMatch(/token|Cavos|wallet|firmante|signer|kit|sesión de/i); expect(t).not.toMatch(/\b(tenés|podés|abrí|tocá|volvé|entrá)\b/i); expect(t.length).toBeLessThan(90) }
  })
})

describe('errores de pago con su arreglo', () => {
  it('sesión perdida: «Entrar de nuevo»; dispositivo sin la llave: solo el mensaje corto', () => {
    expect(renderToStaticMarkup(<ErrorPago m={SIN_SESION} />)).toContain(T.entrar)
    const h = renderToStaticMarkup(<ErrorPago m={NO_FIRMANTE} />); expect(h).toContain(NO_FIRMANTE); expect(h).not.toContain('<button')
    expect(renderToStaticMarkup(<ErrorPago m="Otro error." />)).not.toContain('<button')
  })
  it('antes de pagar sin sesión: «Vuelve a entrar para seguir»', () => {
    const h = renderToStaticMarkup(<PedirEntrar u={x} alVolver={() => {}} />); expect(h).toContain(T.sesionTitulo); expect(h).toContain(T.entrar)
  })
})

describe('App y pago usan la puerta', () => {
  const leer = async (f: string) => (await import(/* @vite-ignore */ f + '?raw')).default as string
  it('al entrar se prueba la firma y sin firma no se entra', async () => {
    const app = await leer('../../App.tsx')
    expect(app).toContain('const e = await probarFirma()'); expect(app).toContain("if (e === 'puede') return pasar(x)")
    expect(app).toContain('auth.olvidarUsuarioLocal(); setU(null); setPuerta({ x, e })')
  })
  it('pagar y firmar el contrato (C) piden entrar de nuevo si se perdió la sesión', async () => {
    const d = await leer('../Detalle.tsx')
    expect(d).toMatch(/<ConSesion activo=\{modoDe\(a\)\.trustless && etapa === 0\}>\s*<EsperaPago/)
    expect(d).toMatch(/<ConSesion activo=\{esDosPersonas\(a\) && rol === 'inquilino'[^}]*\}>\s*<Firma/)
    expect(d).toContain('esTextoNoFirmante(p.err) || esTextoSinSesion(p.err) ? <ErrorPago m={p.err} /> : p.error')
  })
})
