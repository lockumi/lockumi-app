// Paso 19 · Reputación APAGADA (VITE_REPUTACION sin definir, como en producción): «Tus alquileres» se ve igual que en master.
// La foto de referencia (__snapshots__/inicio-master*.html) se generó con el código de master (fb7cafc) ANTES de agregar la reputación;
// si esta prueba falla, algo de la reputación se coló en la app con el interruptor apagado.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Usuario } from '../../types'

// localStorage mínimo en memoria (las pruebas corren sin navegador).
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) }, clear: () => mem.clear() })
// Sin navegador: «useAlquileres» lee directo del almacén (los datos de ejemplo de la demo).
const sinNavegador = () => vi.doMock('../../store', async (o) => { const m = await o<typeof import('../../store')>(); return { ...m, useAlquileres: () => m.store.todos() } })
const U: Usuario = { email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'correo' }

describe('reputación apagada: la app no cambia', () => {
  it('«Tus alquileres» (demo) es idéntica a master', async () => {
    vi.resetModules(); vi.unstubAllEnvs(); mem.clear(); sinNavegador()
    const { Inicio } = await import('../../screens/Inicio')
    await expect(renderToStaticMarkup(<Inicio u={U} />)).toMatchFileSnapshot('./__snapshots__/inicio-master.html')
  })
  it('«Tus alquileres» con la prueba completa y la red de prueba (como producción) es idéntica a master', async () => {
    vi.resetModules(); vi.unstubAllEnvs(); mem.clear(); vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); sinNavegador()
    const { Inicio } = await import('../../screens/Inicio')
    await expect(renderToStaticMarkup(<Inicio u={U} />)).toMatchFileSnapshot('./__snapshots__/inicio-master-produccion.html')
    vi.unstubAllEnvs()
  })
})
