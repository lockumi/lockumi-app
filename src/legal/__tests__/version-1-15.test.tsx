// Legal (26/10/2026, 10:05 p. m.) · 1.15-demo (revisión de 89779b8): Términos 5.3 (firma al entrar y, en los alquileres con otra persona, en cada
// acción), 5.5 b) (USDC de prueba de Lockumi para Cavos), 9.3 y Privacidad sin el exchange; la hoja ⓘ de «Crear» dice la unidad en las dos cifras.
// Regla de archivo: la 1.14-demo (master 4736c0f) queda congelada en src/legal/archivo/4736c0f/ y en /terminos-1-14 y /privacidad-1-14, byte a
// byte (archivo-versiones.test.tsx); la 1.13-demo sigue en /terminos-1-13. La 1.9-demo no cambia. Sin volver a aceptar.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('location', { origin: 'http://127.0.0.1', hostname: '127.0.0.1', hash: '' })
const C = (rep = true) => { vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1'); vi.stubEnv('VITE_CORREOS', '1')
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa'); if (rep) vi.stubEnv('VITE_REPUTACION', '1') }
beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs(); mem.clear() })
const fs = async () => await import(['node', 'fs'].join(':')) as { readFileSync: (u: URL, e?: string) => Uint8Array & string }
const plano = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

const T53 = 'Lockumi no tiene las llaves de tu billetera Cavos. Sí guarda en su servidor las llaves de las cuentas de prueba rotuladas (cláusula 4.1). Al entrar, tu billetera firma con tu llave de acceso un mensaje de prueba. En los alquileres con otra persona, también lo firma en cada acción que mueve el depósito (pagar, «Todo bien, devolver», repartir, liberar o reclamar). Ese mensaje no mueve fondos: solo confirma que fuiste tú. Con esa prueba, Lockumi ejecuta la acción en la red de prueba con sus propias cuentas:'
const T53A = 'a) Activar tu cuenta: Lockumi paga la reserva de tu cuenta en la red de prueba, y tú firmas con Cavos la línea de USDC de prueba. Esto no mueve fondos.'
const T53B = 'b) Depósito: en los alquileres con otra persona, Lockumi llena el contrato de garantía con USDC de prueba de su propia cuenta. Es una simulación del pago: no sale de tu billetera y no tiene valor. En un alquiler de una sola persona, si usas tu propio USDC de prueba lo firmas tú; si no, Lockumi lo firma con tu cuenta de inquilino de prueba (4.1 b).'
const T53C = 'c) Aprobación y liberación: las firma una cuenta de Lockumi, solo después de la prueba de la persona que corresponde o cuando vence el plazo sin reclamo (6.5 a), y siempre según la cláusula 6. La liberación es solo a favor del inquilino, salvo el reparto de un reclamo.'
const T53_FIN = 'Los alquileres creados antes de la versión 1.14-demo siguen la versión que se aceptó hasta que cierren.'
const T54 = '5.4 Llave de acceso. Para usar Lockumi debes crear una llave de acceso (passkey). Con ella entras a tu cuenta desde otros aparatos. Según Cavos, tu llave se guarda cifrada y Cavos no puede abrirla. Lockumi solo recuerda que ya la creaste. La app no configura otro método de recuperación: si pierdes tu llave de acceso y todos tus aparatos, no podrás recuperar tu billetera, y Lockumi tampoco podrá hacerlo por ti (https://docs.cavos.xyz/docs/recovery). En la demo no pierdes dinero, pero sí el acceso a tus alquileres simulados.'
const T41C = 'En la fase 2 no hay dueño de prueba: el dueño confirma cada paso con una firma de prueba de su billetera, Lockumi ejecuta la acción con sus cuentas y no guarda la llave del dueño.'
const T41D = 'd) En los alquileres con otra persona, el depósito lo pone Lockumi desde su propia cuenta con USDC de prueba (5.3 b). Ni el inquilino ni el dueño custodian esos tokens antes de que se liberen.'
const T55B = 'b) Usar mi propio USDC de prueba: con tu billetera de Cavos, Lockumi te envía hasta 20 USDC de prueba de su propia cuenta, sin valor. Con Freighter, usas el que ya tengas, hasta 50 000 USDC de prueba (cláusula 5.5.1). Si tu cuenta de Cavos no está activa en la red de prueba, Lockumi paga su reserva y tú firmas la habilitación del USDC de prueba (trustline). Firmas tú el depósito.'
const T93 = 'Lockumi no responde por el funcionamiento ni por los reinicios de la red de prueba, ni por los servicios de terceros de la cláusula 5, salvo en la medida en que el daño se deba a su propia falta.'
const T551B = '(el depósito y la habilitación del USDC de prueba)'
const PRIV = 'Firmas de prueba: para confirmar cada acción guardamos un código de un solo uso de tu firma de prueba, nunca tu llave.'

describe('1.15-demo: los textos de Legal, literales y en su lugar', () => {
  it('/terminos y /privacidad son la 1.15-demo; la 1.14-demo está archivada en /terminos-1-14 y /privacidad-1-14 (y la 1.13-demo en /terminos-1-13); la 1.9-demo no cambia', async () => {
    C(); const { docs, rutaTerminos, rutaPrivacidad } = await import('../documentos'), { EDICION_REPUTACION } = await import('../version17'), d = docs()
    expect(EDICION_REPUTACION).toMatch(/^1\.15-demo · /)
    for (const k of ['terminos', 'privacidad'] as const) { expect(d[k].version).toBe('1.15-demo'); expect(plano(d[k].html)).toContain(`Versión ${EDICION_REPUTACION}`); expect(d[k + '-1-14'].version).toBe('1.14-demo'); expect(d[k + '-1-13'].version).toBe('1.13-demo') }
    expect([rutaTerminos('1.14-demo'), rutaPrivacidad('1.14-demo')]).toEqual(['/terminos-1-14', '/privacidad-1-14'])
    expect([rutaTerminos('1.15-demo'), rutaPrivacidad('1.15-demo')]).toEqual(['/terminos', '/privacidad'])
    expect([rutaTerminos('1.13-demo'), rutaPrivacidad('1.13-demo')]).toEqual(['/terminos-1-13', '/privacidad-1-13'])
    expect(plano(d['terminos-1-9'].html)).not.toContain('Llave de acceso')
  })
  it('Términos 5.3, 5.4, 4.1 c) y d), 5.5 b) y 5.5.1 b) con el texto literal de Legal', async () => {
    C(); const t = plano((await import('../documentos')).docs().terminos.html)
    for (const x of [T53, T53A, T53B, T53C, T53_FIN, T54, T41C, T41D, T55B, T551B, T93]) expect(t).toContain(x)
    expect(t).toContain('d) Reclamos: en la demo, el reclamo abre una disputa'); expect(t).toContain('e) Cavos permite que una app firme pagos pequeños')
    expect(t).toContain('Si el dueño no aprueba ni reclama dentro de su plazo (cláusula 6.5 a), la devolución es automática')
    expect(t).not.toMatch(/f\) Cavos permite|Compra de USDC de prueba:|Recuperación de la cuenta|la app te ayuda a recibir XLM/)
  })
  it('5.5: sin el exchange en la app, la oración final se borró y no se agrega la frase opcional de compra', async () => {
    C(); const t = plano((await import('../documentos')).docs().terminos.html)
    expect(t).toContain('En ambos casos, el USDC de prueba no es dinero real y no tiene valor.')
    expect(t).not.toContain('es un servicio de terceros, que Lockumi no controla'); expect(t).not.toMatch(/exchange/i); expect(t).not.toContain('También puedes comprar USDC de prueba')
  })
  it('la 1.14-demo archivada conserva su texto publicado: 5.3 «para cada acción», 5.5 b) «de tu billetera de Cavos o de Freighter», 9.3 y Privacidad con el exchange', async () => {
    C(); const d = (await import('../documentos')).docs(), t = plano(d['terminos-1-14'].html), p = plano(d['privacidad-1-14'].html)
    expect(t).toContain('Para entrar y para cada acción que mueve el depósito'); expect(t).not.toContain('Al entrar, tu billetera firma')
    expect(t).toContain('Usar mi propio USDC de prueba: el de tu billetera de Cavos o de Freighter'); expect(t).toContain('ni por el exchange descentralizado, ni de los servicios')
    expect(p).toContain('Servicios de la red de prueba'); 
  })
  it('Privacidad: la viñeta «Firmas de prueba» va después de «Billetera» y antes de «Freighter»', async () => {
    C(); const p = plano((await import('../documentos')).docs().privacidad.html)
    expect(p).not.toMatch(/exchange|Servicios de la red de prueba/i)
    expect(p).toContain(PRIV); expect(p.indexOf('Billetera (tu cuenta digital')).toBeLessThan(p.indexOf(PRIV)); expect(p.indexOf(PRIV)).toBeLessThan(p.indexOf('Freighter (opcional)'))
  })
  it('sin «Friendbot» en la 1.15-demo (y la 1.14-demo archivada tampoco) (ni en Términos, ni en Privacidad, ni en los proveedores); la 1.13-demo archivada conserva su texto publicado', async () => {
    // (Con la reputación apagada, /terminos es la 1.9-demo archivada, que no se toca: ahí sigue el texto que se publicó.)
    C(); const d = (await import('../documentos')).docs()
    for (const k of ['terminos', 'privacidad']) expect(plano(d[k].html), k).not.toMatch(/friendbot/i)
    for (const k of ['terminos-1-14', 'privacidad-1-14']) expect(plano(d[k].html), k).not.toMatch(/friendbot/i)
    expect(plano(d['terminos-1-13'].html)).toContain('Friendbot'); expect(plano(d['terminos-1-13'].html)).not.toContain(T54)
    for (const f of ['terminos', 'privacidad']) expect((await fs()).readFileSync(new URL(`../v17/${f}.md`, import.meta.url), 'utf8')).not.toMatch(/friendbot/i)
  })
  it('todo sigue plegado como estaba: los Términos y la Privacidad usan los mismos encabezados y sin pantallas nuevas', async () => {
    const { readFileSync } = await fs(), t = readFileSync(new URL('../v17/terminos.md', import.meta.url), 'utf8')
    expect((t.match(/^## /gm) ?? []).length).toBe(((readFileSync(new URL('../archivo/4736c0f/terminos.md', import.meta.url), 'utf8')).match(/^## /gm) ?? []).length)
    expect(t).toContain('revisado (26/10, 1.15-demo)')
  })
})

describe('1.15-demo sin volver a aceptar', () => {
  it('es edición de la cuenta (no de escenario), va después de la 1.14-demo y nadie ve «pasar a la versión …»', async () => {
    C(); const { VERSIONES, EDICIONES_CUENTA, versionVigente, ordenVersion } = await import('../versiones')
    const { puedeCambiarVersion, puedeCambiarA } = await import('../../prueba/version')
    expect(VERSIONES.map(v => v.version)).toEqual(['1.7-demo', '1.8-demo', '1.9-demo'])
    expect(EDICIONES_CUENTA.map(v => v.version)).toEqual(['1.10-demo', '1.11-demo', '1.12-demo', '1.13-demo', '1.14-demo', '1.15-demo'])
    expect(ordenVersion('1.14-demo')).toBeLessThan(ordenVersion('1.15-demo'))
    expect(versionVigente({ 'dos-personas': true, correos: true, reputacion: true })).toBe('1.9-demo')
    for (const version of ['1.9-demo', '1.13-demo', '1.14-demo', '1.15-demo']) {
      const a = { id: 'a1', estado: 'en_curso', terminos: { version }, historial: [] } as unknown as import('../../types').Alquiler
      expect(puedeCambiarVersion(a)).toBe(false); expect(puedeCambiarA(a, '1.15-demo')).toBe(false)
    }
  })
  it('la guarda del build: producción con la reputación y sin fecha de la 1.15-demo falla; con fecha o en preview, pasa', async () => {
    const { revisarFechaV115 } = await import('../encendido'), { FECHA_V115 } = await import('../fecha-v115')
    expect(FECHA_V115).toBe('26 de octubre de 2026')   // escrita con scripts/fecha-1-15.mjs el día de la publicación
    expect(revisarFechaV115({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '[fecha de publicación]')).toMatch(/fecha-1-15\.mjs/)
    expect(revisarFechaV115({ VITE_REPUTACION: '1', VERCEL_ENV: 'preview' }, '[fecha de publicación]')).toBeNull()
    expect(revisarFechaV115({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '27 de octubre de 2026')).toBeNull()
    expect(revisarFechaV115({ VERCEL_ENV: 'production' }, '[fecha de publicación]')).toBeNull()
  })
})
