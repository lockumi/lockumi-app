import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { dosPersonas as modoTrustless } from '../servidor/config'
import { Dibujo } from './dibujos'
import { abrirTrustlineUsdc, consultarUsdc, mensajeFirma, olvidarBilletera, abreviar, conectarBilletera, detalleError, consultarSaldo, enlaceExplorer, fondear, formatoXlm, cuentaLista, type UsdcLeido, type SaldoCuenta, type Billetera as B } from '../services/billetera'

type Saldo = SaldoCuenta
/** Tarjeta «Tu cuenta para el depósito»: «Lista ✓» o el estado de espera de siempre («Preparando tu cuenta…»); el cuerpo (Detalles) va debajo. */
export function TarjetaCuenta({ lista, lenta = false, children }: { lista: boolean; lenta?: boolean; children?: ReactNode }) {
  return <section className={'glass tarjeta billetera ta-cuenta ' + (lista ? 'estado--curso' : 'estado--pendiente')} aria-label="Tu cuenta para el depósito" aria-busy={lista ? undefined : true}>
    <span className="ta-sello"><Dibujo n={lista ? 'escudo' : 'reloj'} /></span><div className="ta-cuenta__cuerpo">
    <p className="etiqueta">Tu cuenta para el depósito</p>
    {lista
      ? <p className="ta-cuenta__lista"><strong>Lista ✓</strong> <span className="nota">Aquí se guarda y se devuelve el depósito.</span></p>
      : <p className="nota" role="status">Preparando tu cuenta…</p>}
    {!lista && lenta && <p className="nota">Esto está tardando más de lo normal. Puedes seguir usando la app; si en unos minutos sigue igual, cierra sesión y vuelve a entrar.</p>}
    {children}
  </div></section>
}

/** Tarjeta breve de la billetera Stellar testnet (solo con login real de Cavos). */
export function Billetera() {
  const [b, setB] = useState<B | null>(null)
  // 'oculta': no hay sesión real de Cavos en esta pestaña (p. ej. sesión de demo); 'reintentando': falló y se reintenta sola.
  const [fase, setFase] = useState<'cargando' | 'reintentando' | 'lenta' | 'oculta'>('cargando')
  const [saldo, setSaldo] = useState<Saldo>({ t: 'cargando' })
  const [usdc, setUsdc] = useState<UsdcLeido>('cargando')
  const [copiado, setCopiado] = useState(false); const [fondeando, setFondeando] = useState(false)

  // Nunca mostramos un error aquí: sin sesión real no hay tarjeta; si falla, se reintenta sola en segundo plano.
  useEffect(() => {
    let vivo = true; let t = 0
    const intentar = (n: number) => conectarBilletera().then(x => { if (vivo) setB(x) }).catch(e => {
      const d = detalleError(e); console.warn('[Lockumi] Cavos.connect falló:', d.codigo, e)
      if (!vivo) return
      if (d.codigo === 'sin-identidad' || d.codigo === 'sin-token' || d.codigo === 'simulado') { setFase('oculta'); return }
      setFase(n >= 3 ? 'lenta' : 'reintentando')
      t = window.setTimeout(() => void intentar(n + 1), Math.min(60_000, 5_000 * 2 ** n))
    })
    void intentar(0)
    return () => { vivo = false; clearTimeout(t) }
  }, [])
  const leer = useCallback(async (g: string) => {
    setSaldo({ t: 'cargando' }); setUsdc('cargando')
    try { const x = await consultarSaldo(g); setSaldo(x === null ? { t: 'sin-cuenta' } : { t: 'ok', xlm: x }) } catch { setSaldo({ t: 'error' }) }
  }, [])
  useEffect(() => { if (b) void leer(b.direccion) }, [b, leer])
  // El USDC (trustline) solo se lee con Trustless Work y cuando la cuenta ya existe; alimenta «Lista ✓» y la sección de USDC de los Detalles.
  const leerUsdc = useCallback(() => { if (b) consultarUsdc(b.direccion).then(setUsdc).catch(() => setUsdc(undefined)) }, [b])
  const hayCuenta = saldo.t === 'ok'
  useEffect(() => { if (modoTrustless && hayCuenta) leerUsdc() }, [hayCuenta, leerUsdc])

  if (fase === 'oculta') return null
  if (!b) return <TarjetaCuenta lista={false} lenta={fase === 'lenta'} />

  const copiar = async () => { try { await navigator.clipboard.writeText(b.direccion); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { /* sin permiso de portapapeles */ } }
  const pedirFondos = async () => {
    setFondeando(true)
    try { await fondear(b.direccion); olvidarBilletera(); await leer(b.direccion) } catch { setSaldo({ t: 'error' }) } finally { setFondeando(false) }
  }
  return <TarjetaCuenta lista={cuentaLista(saldo, usdc, modoTrustless)}>
    <details className="billetera__detalle"><summary><Dibujo n="der" />Detalles</summary>
      <p className="nota">Cuenta de prueba (sin dinero real).</p>
      <p className="billetera__dir"><code title={b.direccion}>{abreviar(b.direccion)}</code>
        <button type="button" className="boton boton--secundario boton--chico" onClick={copiar} aria-label="Copiar dirección completa">{copiado ? 'Copiada' : 'Copiar'}</button>
        <a className="enlace" href={enlaceExplorer(b.direccion)} target="_blank" rel="noopener noreferrer">Ver en el explorador</a></p>
      <p className="billetera__saldo" role="status">
        {saldo.t === 'cargando' && <span className="nota">Consultando saldo…</span>}
        {saldo.t === 'ok' && <strong>Saldo de prueba: {formatoXlm(saldo.xlm)}</strong>}
        {saldo.t === 'error' && <span className="nota">No pudimos consultar el saldo.</span>}
      </p>
      {saldo.t === 'sin-cuenta' && <div className="billetera__fondeo">
        <p className="nota">La cuenta de prueba se activa cuando recibe su primer saldo de prueba (gratis, sin valor real).</p>
        <button type="button" className="boton boton--secundario boton--chico" disabled={fondeando} onClick={pedirFondos}>{fondeando ? 'Activando…' : 'Activar cuenta de prueba'}</button>
      </div>}
      {modoTrustless && saldo.t === 'ok' && <Usdc usdc={usdc} leer={leerUsdc} />}
    </details>
  </TarjetaCuenta>
}

/** Prueba con Trustless Work: habilitar USDC de testnet (trustline) y cargarlo desde el faucet de Circle.
 *  Fuentes: https://docs.trustlesswork.com/trustless-work/introduction/stellar-and-soroban-the-backbone-of-trustless-work/testnet-tokens
 *           https://faucet.circle.com */
function Usdc({ usdc, leer }: { usdc: UsdcLeido; leer: () => void }) {
  const [ocupado, setOcupado] = useState(false); const [error, setError] = useState('')
  const habilitar = async () => {
    setOcupado(true); setError('')
    try { await abrirTrustlineUsdc(); leer() } catch (e) { setError(mensajeFirma(e)) } finally { setOcupado(false) }
  }
  if (usdc === 'cargando' || usdc === undefined) return null
  return <div className="billetera__fondeo">
    {usdc === null ? <>
      <p className="nota">Para pagar el depósito en USDC de prueba, primero habilita USDC en tu cuenta. Tu billetera te pedirá confirmar.</p>
      <button type="button" className="boton boton--secundario boton--chico" disabled={ocupado} onClick={() => void habilitar()}>{ocupado ? 'Habilitando…' : 'Habilitar USDC de prueba'}</button>
    </> : <>
      <p><strong>USDC de prueba: {Number(usdc).toLocaleString('es', { maximumFractionDigits: 2 })}</strong></p>
      <p className="nota">Para cargar USDC de prueba: copia tu dirección, abre <a className="enlace" href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">faucet.circle.com</a>, elige Stellar Testnet y pega la dirección (20 USDC cada 2 horas).</p>
      <button type="button" className="boton boton--secundario boton--chico" onClick={leer}>Actualizar saldo</button>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>
}
