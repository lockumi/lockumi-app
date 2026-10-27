// Legal (26/10/2026, 9:43 p. m.) · 1.14-demo: la plataforma activa la cuenta y paga la reserva, llave de acceso obligatoria, el depósito de dos
// personas lo pone Lockumi con USDC de prueba y se quita Friendbot (docs-borrador/legal-1-14-demo.md, texto literal). Regla de archivo: la 1.13-demo
// (master 712d4c6) queda congelada en src/legal/archivo/712d4c6/ y en /terminos-1-13 y /privacidad-1-13, byte a byte (archivo-versiones.test.tsx).
// La 1.9-demo no cambia. Sin volver a aceptar.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('location', { origin: 'http://127.0.0.1', hostname: '127.0.0.1', hash: '' })
const C = (rep = true) => { vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1'); vi.stubEnv('VITE_CORREOS', '1')
  vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa'); if (rep) vi.stubEnv('VITE_REPUTACION', '1') }
beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs(); mem.clear() })
const fs = async () => await import(['node', 'fs'].join(':')) as { readFileSync: (u: URL, e?: string) => Uint8Array & string }
const plano = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

const T53 = 'Lockumi no tiene las llaves de tu billetera Cavos. Sí guarda en su servidor las llaves de las cuentas de prueba rotuladas (cláusula 4.1). Para entrar y para cada acción que mueve el depósito (pagar, «Todo bien, devolver», repartir, liberar o reclamar), tu billetera firma con tu llave de acceso un mensaje de prueba. Ese mensaje no mueve fondos: solo confirma que fuiste tú. Con esa prueba, Lockumi ejecuta la acción en la red de prueba con sus propias cuentas:'
const T53A = 'a) Activar tu cuenta: Lockumi paga la reserva de tu cuenta en la red de prueba, y tú firmas con Cavos la línea de USDC de prueba. Esto no mueve fondos.'
const T53B = 'b) Depósito: en los alquileres con otra persona, Lockumi llena el contrato de garantía con USDC de prueba de su propia cuenta. Es una simulación del pago: no sale de tu billetera y no tiene valor. En un alquiler de una sola persona, si usas tu propio USDC de prueba lo firmas tú; si no, Lockumi lo firma con tu cuenta de inquilino de prueba (4.1 b).'
const T53C = 'c) Aprobación y liberación: las firma una cuenta de Lockumi, solo después de la prueba de la persona que corresponde o cuando vence el plazo sin reclamo (6.5 a), y siempre según la cláusula 6. La liberación es solo a favor del inquilino, salvo el reparto de un reclamo.'
const T53_FIN = 'Los alquileres creados antes de la versión 1.14-demo siguen la versión que se aceptó hasta que cierren.'
const T54 = '5.4 Llave de acceso. Para usar Lockumi debes crear una llave de acceso (passkey). Con ella entras a tu cuenta desde otros aparatos. Según Cavos, tu llave se guarda cifrada y Cavos no puede abrirla. Lockumi solo recuerda que ya la creaste. La app no configura otro método de recuperación: si pierdes tu llave de acceso y todos tus aparatos, no podrás recuperar tu billetera, y Lockumi tampoco podrá hacerlo por ti (https://docs.cavos.xyz/docs/recovery). En la demo no pierdes dinero, pero sí el acceso a tus alquileres simulados.'
const T41C = 'En la fase 2 no hay dueño de prueba: el dueño confirma cada paso con una firma de prueba de su billetera, Lockumi ejecuta la acción con sus cuentas y no guarda la llave del dueño.'
const T41D = 'd) En los alquileres con otra persona, el depósito lo pone Lockumi desde su propia cuenta con USDC de prueba (5.3 b). Ni el inquilino ni el dueño custodian esos tokens antes de que se liberen.'
const T55B = 'Si tu cuenta no está activa en la red de prueba, Lockumi paga su reserva y tú firmas la habilitación del USDC de prueba (trustline). Firmas tú el depósito.'
const T551B = '(el depósito y la habilitación del USDC de prueba)'
const PRIV = 'Firmas de prueba: para confirmar cada acción guardamos un código de un solo uso de tu firma de prueba, nunca tu llave.'

describe('1.14-demo: los textos de Legal, literales y en su lugar', () => {
  it('/terminos y /privacidad son la 1.14-demo; la 1.13-demo está archivada en /terminos-1-13 y /privacidad-1-13; la 1.9-demo no cambia', async () => {
    C(); const { docs, rutaTerminos, rutaPrivacidad } = await import('../documentos'), { EDICION_REPUTACION } = await import('../version17'), d = docs()
    expect(EDICION_REPUTACION).toMatch(/^1\.14-demo · /)
    for (const k of ['terminos', 'privacidad'] as const) { expect(d[k].version).toBe('1.14-demo'); expect(plano(d[k].html)).toContain(`Versión ${EDICION_REPUTACION}`); expect(d[k + '-1-13'].version).toBe('1.13-demo') }
    expect([rutaTerminos('1.13-demo'), rutaPrivacidad('1.13-demo')]).toEqual(['/terminos-1-13', '/privacidad-1-13'])
    expect(plano(d['terminos-1-9'].html)).not.toContain('Llave de acceso')
  })
  it('Términos 5.3, 5.4, 4.1 c) y d), 5.5 b) y 5.5.1 b) con el texto literal de Legal', async () => {
    C(); const t = plano((await import('../documentos')).docs().terminos.html)
    for (const x of [T53, T53A, T53B, T53C, T53_FIN, T54, T41C, T41D, T55B, T551B]) expect(t).toContain(x)
    expect(t).toContain('d) Reclamos: en la demo, el reclamo abre una disputa'); expect(t).toContain('e) Cavos permite que una app firme pagos pequeños')
    expect(t).toContain('Si el dueño no aprueba ni reclama dentro de su plazo (cláusula 6.5 a), la devolución es automática')
    expect(t).not.toMatch(/f\) Cavos permite|Compra de USDC de prueba:|Recuperación de la cuenta|la app te ayuda a recibir XLM/)
  })
  it('5.5: sin el exchange en la app, la oración final se borró y no se agrega la frase opcional de compra', async () => {
    C(); const t = plano((await import('../documentos')).docs().terminos.html)
    expect(t).toContain('En ambos casos, el USDC de prueba no es dinero real y no tiene valor.')
    expect(t).not.toContain('es un servicio de terceros, que Lockumi no controla'); expect(t).not.toContain('También puedes comprar USDC de prueba')
  })
  it('Privacidad: la viñeta «Firmas de prueba» va después de «Billetera» y antes de «Freighter»', async () => {
    C(); const p = plano((await import('../documentos')).docs().privacidad.html)
    expect(p).toContain(PRIV); expect(p.indexOf('Billetera (tu cuenta digital')).toBeLessThan(p.indexOf(PRIV)); expect(p.indexOf(PRIV)).toBeLessThan(p.indexOf('Freighter (opcional)'))
  })
  it('sin «Friendbot» en la 1.14-demo (ni en Términos, ni en Privacidad, ni en los proveedores); la 1.13-demo archivada conserva su texto publicado', async () => {
    // (Con la reputación apagada, /terminos es la 1.9-demo archivada, que no se toca: ahí sigue el texto que se publicó.)
    C(); const d = (await import('../documentos')).docs()
    for (const k of ['terminos', 'privacidad']) expect(plano(d[k].html), k).not.toMatch(/friendbot/i)
    expect(plano(d['terminos-1-13'].html)).toContain('Friendbot'); expect(plano(d['terminos-1-13'].html)).not.toContain(T54)
    for (const f of ['terminos', 'privacidad']) expect((await fs()).readFileSync(new URL(`../v17/${f}.md`, import.meta.url), 'utf8')).not.toMatch(/friendbot/i)
  })
  it('todo sigue plegado como estaba: los Términos y la Privacidad usan los mismos encabezados y sin pantallas nuevas', async () => {
    const { readFileSync } = await fs(), t = readFileSync(new URL('../v17/terminos.md', import.meta.url), 'utf8')
    expect((t.match(/^## /gm) ?? []).length).toBe(((readFileSync(new URL('../archivo/712d4c6/terminos.md', import.meta.url), 'utf8')).match(/^## /gm) ?? []).length)
    expect(t).toContain('revisado (26/10, 1.14-demo)')
  })
})

describe('1.14-demo sin volver a aceptar', () => {
  it('es edición de la cuenta (no de escenario), va después de la 1.13-demo y nadie ve «pasar a la versión …»', async () => {
    C(); const { VERSIONES, EDICIONES_CUENTA, versionVigente, ordenVersion } = await import('../versiones')
    const { puedeCambiarVersion, puedeCambiarA } = await import('../../prueba/version')
    expect(VERSIONES.map(v => v.version)).toEqual(['1.7-demo', '1.8-demo', '1.9-demo'])
    expect(EDICIONES_CUENTA.map(v => v.version)).toEqual(['1.10-demo', '1.11-demo', '1.12-demo', '1.13-demo', '1.14-demo'])
    expect(ordenVersion('1.13-demo')).toBeLessThan(ordenVersion('1.14-demo'))
    expect(versionVigente({ 'dos-personas': true, correos: true, reputacion: true })).toBe('1.9-demo')
    for (const version of ['1.9-demo', '1.13-demo', '1.14-demo']) {
      const a = { id: 'a1', estado: 'en_curso', terminos: { version }, historial: [] } as unknown as import('../../types').Alquiler
      expect(puedeCambiarVersion(a)).toBe(false); expect(puedeCambiarA(a, '1.14-demo')).toBe(false)
    }
  })
  it('la guarda del build: producción con la reputación y sin fecha de la 1.14-demo falla; con fecha o en preview, pasa', async () => {
    const { revisarFechaV114 } = await import('../encendido'), { FECHA_V114 } = await import('../fecha-v114')
    expect(FECHA_V114).toBe('26 de octubre de 2026')   // escrita con scripts/fecha-1-14.mjs el día de la publicación
    expect(revisarFechaV114({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '[fecha de publicación]')).toMatch(/fecha-1-14\.mjs/)
    expect(revisarFechaV114({ VITE_REPUTACION: '1', VERCEL_ENV: 'preview' }, '[fecha de publicación]')).toBeNull()
    expect(revisarFechaV114({ VITE_REPUTACION: '1', VERCEL_ENV: 'production' }, '27 de octubre de 2026')).toBeNull()
    expect(revisarFechaV114({ VERCEL_ENV: 'production' }, '[fecha de publicación]')).toBeNull()
  })
})
