// PR #22 · decisión de Katherine (25/10): en C (VITE_DOS_PERSONAS) la pantalla 02 «Tus alquileres» no muestra ningún aviso de
// «Términos actualizados». Solo Katherine tiene cuenta: nadie tiene que volver a aceptar. Una cuenta nueva acepta la 1.9-demo en
// «Entrar», como siempre, sin aviso ni pantalla de volver a aceptar (la misma decisión que con la 1.6-demo).
// La casilla de los Términos dentro de cada alquiler (unirse y crear) sigue igual.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import inicioFuente from '../Inicio.tsx?raw'
import versionesFuente from '../../legal/versiones.ts?raw'

vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1'); vi.stubEnv('VITE_CORREOS', '1')
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa')
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0 })
vi.stubGlobal('location', { origin: 'http://127.0.0.1:4620', hostname: '127.0.0.1', hash: '#/', pathname: '/', search: '', href: 'http://127.0.0.1:4620/' })
// El almacén usa useSyncExternalStore sin instantánea de servidor: aquí basta una lista vacía.
vi.mock('../../store', async orig => ({ ...(await orig<typeof import('../../store')>()), useAlquileres: () => [] }))
const { Inicio } = await import('../Inicio')
const { casillaDeFuncion } = await import('../../legal/versiones')

describe('C · 02 «Tus alquileres» sin aviso de «Términos actualizados»', () => {
  it.each(['1.7-demo', '1.8-demo', '1.6-demo'])('con la %s aceptada, en C no aparece ningún aviso de versión', v => {
    const u = { email: 'dueno.prueba@lockumi.com', nombre: 'Dueño', metodo: 'correo' as const, terminos: { version: v, fecha: '2026-10-25T06:00:00Z' } }
    const h = renderToStaticMarkup(<Inicio u={u} />)
    expect(h).toContain('Tus alquileres')
    expect(h).not.toMatch(/Términos actualizados|Actualizamos los Términos|aviso-version/)
    expect(h).not.toContain('role="status"')
  })
  it('el aviso y su lógica ya no existen (Inicio no lo usa; versiones.ts no tiene avisoNuevaVersion)', () => {
    expect(inicioFuente).not.toMatch(/AvisoVersion/)
    expect(versionesFuente).not.toMatch(/avisoNuevaVersion|Actualizamos los Términos/)
    expect(Object.keys(import.meta.glob('../../legal/AvisoVersion.tsx'))).toEqual([])
  })
  it('la casilla 1.9-demo dentro del alquiler (unirse y crear) sigue', () => {
    expect(casillaDeFuncion('dos-personas')).toMatchObject({ version: '1.9-demo' })
  })
})
