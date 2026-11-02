// «Lista ✓» de «Tu cuenta para el depósito» (Billetera.tsx): solo con la cuenta Stellar ya creada y activa en Horizon (no 404) y, con Trustless Work,
// con el USDC habilitado (trustline). Antes se ve el estado de espera de siempre, «Preparando tu cuenta…» (mismo texto que mientras se conecta la llave). Sin textos nuevos.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TarjetaCuenta } from '../Billetera'
import { consultarSaldo, consultarUsdc, cuentaLista } from '../../services/billetera'

const html = (lista: boolean) => renderToStaticMarkup(<TarjetaCuenta lista={lista}><details>Detalles</details></TarjetaCuenta>)
const horizon = (status: number, balances: unknown[] = []) => vi.fn(async () => ({ status, ok: status >= 200 && status < 300, json: async () => ({ balances }) })) as unknown as typeof fetch
const USDC = { asset_code: 'USDC', asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', balance: '0.0000000' }
const XLM = { asset_type: 'native', balance: '5.0000000' }

describe('«Lista ✓» solo con la cuenta activa', () => {
  it('cuenta inexistente (Horizon 404): sin «Lista ✓»; se ve «Preparando tu cuenta…» y los Detalles siguen ahí', async () => {
    const saldo = await consultarSaldo('G'.padEnd(56, 'A'), horizon(404))
    expect(saldo).toBeNull()
    expect(cuentaLista(saldo === null ? { t: 'sin-cuenta' } : { t: 'ok', xlm: saldo }, undefined, true)).toBe(false)
    expect(cuentaLista({ t: 'sin-cuenta' }, undefined, false)).toBe(false)
    const h = html(false)
    expect(h).not.toContain('Lista ✓'); expect(h).toContain('Preparando tu cuenta…'); expect(h).toContain('aria-busy="true"'); expect(h).toContain('estado--pendiente'); expect(h).toContain('Detalles')
  })
  it('mientras se consulta o si falla la consulta: tampoco «Lista ✓»', () => {
    expect(cuentaLista({ t: 'cargando' }, 'cargando', true)).toBe(false)
    expect(cuentaLista({ t: 'cargando' }, 'cargando', false)).toBe(false)
    expect(cuentaLista({ t: 'error' }, 'cargando', false)).toBe(false)
    expect(cuentaLista({ t: 'ok', xlm: '5' }, 'cargando', true)).toBe(false)   // aún no se sabe si tiene USDC
    expect(cuentaLista({ t: 'ok', xlm: '5' }, undefined, true)).toBe(false)    // la lectura de USDC falló
  })
  it('cuenta activa sin la trustline de USDC: con Trustless Work aún no está lista; sin Trustless Work sí', async () => {
    const usdc = await consultarUsdc('G'.padEnd(56, 'A'), horizon(200, [XLM]))
    expect(usdc).toBeNull()
    expect(cuentaLista({ t: 'ok', xlm: '5' }, usdc, true)).toBe(false)
    expect(cuentaLista({ t: 'ok', xlm: '5' }, usdc, false)).toBe(true)
  })
  it('cuenta activa con USDC habilitado: «Lista ✓» con el texto de siempre', async () => {
    const f = horizon(200, [XLM, USDC])
    const saldo = await consultarSaldo('G'.padEnd(56, 'A'), f), usdc = await consultarUsdc('G'.padEnd(56, 'A'), f)
    expect(saldo).toBe('5.0000000'); expect(usdc).toBe('0.0000000')
    expect(cuentaLista({ t: 'ok', xlm: saldo! }, usdc, true)).toBe(true)
    const h = html(true)
    expect(h).toContain('Lista ✓'); expect(h).toContain('Aquí se guarda y se devuelve el depósito.'); expect(h).not.toContain('Preparando tu cuenta…'); expect(h).not.toContain('aria-busy'); expect(h).toContain('estado--curso')
  })
  it('el aviso de «tarda más de lo normal» solo aparece en espera y con el texto existente', () => {
    const e = renderToStaticMarkup(<TarjetaCuenta lista={false} lenta />)
    expect(e).toContain('Esto está tardando más de lo normal.')
    expect(renderToStaticMarkup(<TarjetaCuenta lista lenta />)).not.toContain('tardando')
  })
})
