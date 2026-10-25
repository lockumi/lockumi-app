// Avisos emergentes de cada paso (src/alertas.ts + src/Aviso.tsx) y arreglo de la caja «Te toca / Al dueño / Qué sigue».
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const { Tostada, duracionDe, DURACION_AVISO, DURACION_CON_ACCION, UMBRAL_LADO, UMBRAL_ABAJO, UMBRAL_VELOCIDAD } = await import('../Aviso')
const { Alertas } = await import('../Alertas')
const { usd } = await import('../ui')
const al = await import('../alertas')
const { acciones } = await import('../acciones')
const { store } = await import('../store')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')
const css = leer('../index.css')

const VIDEO = { prueba: true, video: true, red: true }
const LOCAL = { prueba: false, video: false, red: false }
const EMOJI = /\p{Extended_Pictographic}/u

describe('caja «Qué toca ahora» (.turno) con hidden', () => {
  it('el CSS respeta el atributo hidden (display:grid ya no le gana)', () => {
    expect(css).toMatch(/\.turno\{display:grid;/)
    expect(css).toMatch(/\.turno\[hidden\]\{display:none\}/)
    expect(css.indexOf('.turno[hidden]')).toBeGreaterThan(css.indexOf('.turno{display:grid'))
  })
  it('Detalle sigue ocultándola en el modo video', () => {
    expect(leer('../screens/Detalle.tsx')).toContain('<section className="turno" aria-label="Qué toca ahora" hidden={modoVideo}>')
  })
})

describe('Aviso v2: toast (componente)', () => {
  const html = (a: Partial<import('../alertas').AlertaEnPila> = {}, indice = 0) => renderToStaticMarkup(<Tostada a={{ id: 1, paso: 'pago', titulo: '¡Depósito guardado!', hecho: '.', ...a }} indice={indice} pausa={false} abierta={false} desplazar={0} onCerrar={() => {}} />)
  const pago = { linea: { et: 'Ahora:', texto: 'fotos de entrada' }, accion: { texto: 'Tomar fotos →', etiqueta: 'Tomar fotos de entrada', ir: 'panel' as const } }
  it('no es un diálogo: pastilla enfocable «Aviso. Toca para cerrar», con título y una línea enlazados', () => {
    const h = html(pago)
    expect(h).not.toContain('role="dialog"'); expect(h).not.toContain('alertdialog'); expect(h).not.toContain('aria-modal')
    expect(h).toContain('tabindex="0"'); expect(h).toContain('aria-label="Aviso. Toca para cerrar"')
    const [t, d] = h.match(/aria-describedby="([^"]+)"/)![1].split(' ')
    expect(h).toMatch(new RegExp(`<h2 id="${t}" class="tostada__t">¡Depósito guardado!</h2>`))
    expect(h).toContain(`<p id="${d}" class="tostada__l"><b>Ahora:</b> fotos de entrada</p>`)
  })
  it('con acción: un solo botón (44 px) con etiqueta completa; sin X ni «Entendido»', () => {
    const h = html(pago)
    expect(h.match(/<button/g)).toHaveLength(1)
    expect(h).toContain('<button type="button" class="tostada__accion" aria-label="Tomar fotos de entrada">Tomar fotos →</button>')
    expect(h).not.toMatch(/Entendido|Cerrar aviso|✕|×/)
    expect(css).toMatch(/\.tostada__accion\{[^}]*min-height:44px/); expect(css).toMatch(/\.tostada\{[^}]*min-height:64px/)
    const sin = html({ linea: { texto: 'x' } }); expect(sin).not.toContain('<button')
  })
  it('tiempos: 5 s sin acción, 8 s con acción, el error no se esconde y no tiene línea de tiempo', () => {
    expect(DURACION_AVISO).toBe(5000); expect(DURACION_CON_ACCION).toBe(8000)
    expect(duracionDe({})).toBe(5000); expect(duracionDe({ accion: pago.accion })).toBe(8000); expect(duracionDe({ tipo: 'error' })).toBeNull()
    expect(html(pago)).toContain('animation-duration:8000ms'); expect(html({})).toContain('animation-duration:5000ms')
    const e = html(al.alertaErrorRed()); expect(e).not.toContain('tostada__tiempo'); expect(e).toContain('tostada--error')
    expect(css).toMatch(/\.tostada__tiempo\{[^}]*height:2px/); expect(css).toContain('.tostada--pausa .tostada__tiempo{animation-play-state:paused}')
  })
  it('cierre con clic (fuera del botón), Enter, Espacio o Esc; la acción navega y cierra; pausa con dedo, mouse o foco', () => {
    const c = leer('../Aviso.tsx'), z = leer('../Alertas.tsx')
    expect(c).toContain("onClick={() => { if (!recienArrastrado.current) cerrar() }}")
    expect(c).toContain("if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')")
    expect(c).toContain('onClick={e => { e.stopPropagation(); cerrar(false); irA(accion.ir) }}')
    for (const x of ['onPointerOver', 'onPointerOut', 'onPointerDown', 'onFocus', 'onBlur', "e.key === 'Escape' && !e.defaultPrevented"]) expect(z).toContain(x)
    expect(z).toContain('pausa={abierta}')
    expect(c).not.toMatch(/autoFocus/)
  })
  it('deslizar para cerrar: un tercio del ancho, 40 px hacia abajo o más de 0,5 px/ms; si no, vuelve con resorte de 200 ms', () => {
    expect(UMBRAL_LADO).toBeCloseTo(1 / 3); expect(UMBRAL_ABAJO).toBe(40); expect(UMBRAL_VELOCIDAD).toBe(0.5)
    expect(css).toMatch(/\.tostada--resorte\{transition:transform 200ms/); expect(css).toMatch(/\.tostada\{[^}]*touch-action:none/)
    expect(css).toMatch(/\.tostada__manija\{[^}]*width:28px;height:4px/)
  })
  it('zonas fijas para lectores de pantalla: status (amable) en pasos y logros, alert en errores', () => {
    const z = leer('../Alertas.tsx')
    expect(z).toContain('<div className="tostadas__zona" role="status" aria-live="polite">{nuevos.filter(a => a.tipo !== \'error\').map(tostada)}</div>')
    expect(z).toContain('<div className="tostadas__zona" role="alert">{nuevos.filter(a => a.tipo === \'error\').map(tostada)}</div>')
    const h = renderToStaticMarkup(<Alertas />); expect(h).toContain('role="status" aria-live="polite"'); expect(h).toContain('role="alert"')
  })
  it('lleva la casita oficial completa (32 px): mismo viewBox del logo, sin recortes, con la llave y sin ids repetidos', () => {
    const h = html({}, 0)
    expect(h).toContain('class="tostada tostada--logro"')
    expect(h).toContain('viewBox="419.5 65.25 420.25 408.25"'); expect(h).toContain('overflow="visible"')
    for (const c of ['aviso-logo__planta', 'aviso-logo__franja', 'aviso-logo__puerta', 'aviso-logo__cerradura', 'aviso-logo__llave']) expect(h).toContain(c)
    expect(h).not.toContain('id="casa-clip"'); expect(h).toContain('url(#aviso-casa-clip)')
    expect(css).toContain('.tostada__casa .aviso-pop__logo{width:32px;height:32px}')
    expect(css).toMatch(/\.aviso-pop__logo svg\{[^}]*overflow:visible/)
    expect(leer('../logoLandingMarkup.ts')).toContain('viewBox=\\"419.5 65.25 420.25 408.25\\"')
  })
  it('CSS: vidrio crema al 92 % con desenfoque de 18 px y fondo sólido sin soporte; 358 px en celular, 360 px en computadora; abajo', () => {
    expect(css).toMatch(/\.tostada\{[^}]*background:rgba\(255,245,238,\.92\);-webkit-backdrop-filter:blur\(18px\) saturate\(1\.5\);backdrop-filter:blur\(18px\)/)
    expect(css).toContain('@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.tostada{background:var(--fondo)}}')
    expect(css).toMatch(/\.tostadas\{position:fixed;[^}]*bottom:calc\(16px \+ env\(safe-area-inset-bottom\)\);width:min\(358px,calc\(100vw - 32px\)\)/)
    expect(css).toContain('@media (min-width:720px){.tostadas{left:auto;right:24px;bottom:24px;width:360px;transform:none}}')
    expect(css).toContain('.tostada--logro .aviso-logo__llave{animation:aviso-llave 2s var(--ease) 250ms both}'); expect(css).not.toMatch(/aviso-llave[^;}]*infinite/)
  })
  it('movimiento: entra deslizando con fundido en 320 ms y sale en 200 ms; pila que asoma 12 y 23 px', () => {
    expect(css).toMatch(/animation:tostada-entra 320ms cubic-bezier\(\.2,\.8,\.2,1\) backwards/); expect(css).toContain('@keyframes tostada-entra{from{opacity:0;transform:translateY(16px)}')
    expect(css).toMatch(/transition:transform 240ms var\(--ease\),opacity 200ms ease/)
    expect(css).toContain('.tostada[data-i="1"]{transform:translateY(-12px) scale(.95);opacity:.9}'); expect(css).toContain('.tostada[data-i="2"]{transform:translateY(-23px) scale(.9);opacity:.7}')
    expect(html({}, 1)).toContain('data-i="1"')
  })
  it('respeta prefers-reduced-motion: solo fundido de 160 ms, sin giro ni llave animada', () => {
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce){\n  .tostada{'))
    expect(rm).toContain('.tostada{animation:aviso-fade 160ms linear backwards!important;transition:opacity 160ms linear!important}')
    expect(rm).toContain('.aviso-logo__llave,.aviso-logo__cerradura{transform:none!important;opacity:1}'); expect(rm).toContain('.tostada__tiempo{animation:none!important')
    expect(leer('../Aviso.tsx')).toContain('giro = reducir() ? 0 : (dx / w) * 4')
  })
  it('tono de cada aviso: logros en verde, errores en terracota, el resto miel', () => {
    expect(al.tonoDe({ paso: 'pago' })).toBe('logro'); expect(al.tonoDe({ paso: 'contrato-firmado' })).toBe('logro'); expect(al.tonoDe({ paso: 'devolucion' })).toBe('logro')
    expect(al.tonoDe({ paso: 'crear' })).toBe('paso'); expect(al.tonoDe(al.alertaIngresoFallo())).toBe('error'); expect(al.tonoDe(al.alertaErrorRed())).toBe('error')
  })
  it('la línea: la aprobada («Ahora: …», «Sigue: …») o, si no hay, lo que sigue', () => {
    expect(al.lineaDe({ paso: 'x', titulo: 'T', hecho: 'Pasó esto.', sigue: 'Hacer aquello.' })).toEqual({ texto: 'Hacer aquello.' })
    expect(al.lineaDe({ paso: 'x', titulo: 'T', hecho: 'Pasó esto.' })).toEqual({ texto: 'Pasó esto.' })
    expect(al.lineaDe(al.alertaIngreso(true))).toEqual({ et: 'Sigue:', texto: 'crear o ver tus alquileres' })
    // LEGAL: revisado (24/10): «depósito de prueba» (antes «depósito protegido»)
    for (const r of [true, false]) { expect(al.alertaIngreso(r).hecho).toMatch(/Desde aquí puedes ver tus alquileres y crear un depósito de prueba\.$/); expect(al.alertaIngreso(r).hecho).not.toMatch(/protegid/i) }
  })
  it('«Tomar foto» usa el ícono de cámara de la app (sin emoji)', () => {
    const c = leer('../Camara.tsx'); expect(c).toContain('<Icono id="i-camara" />'); expect(c).not.toMatch(EMOJI)
  })
})

describe('pila de avisos (estilo Sonner)', () => {
  it('hasta 3, el más nuevo al final de la lista (al frente), sin repetir; con el cuarto sale el más viejo', () => {
    al.vaciarAlertas()
    const x = (p: string) => ({ paso: p, titulo: p.toUpperCase(), hecho: '.' })
    al.avisar(x('a')); al.avisar(x('a')); al.avisar(x('b')); al.avisar(null)
    expect(al.alertasVisibles().map(a => a.paso)).toEqual(['a', 'b']); expect(al.alertaActual()?.paso).toBe('b')
    al.avisar(x('c')); al.avisar(x('d'))
    expect(al.alertasVisibles().map(a => a.paso)).toEqual(['b', 'c', 'd']); expect(al.MAX_AVISOS).toBe(3)
    const r = al.alertasVisibles(); expect(al.alertasVisibles()).toBe(r)   // misma referencia (useSyncExternalStore)
    al.cerrarAlerta(al.alertasVisibles()[1].id); expect(al.alertasVisibles().map(a => a.paso)).toEqual(['b', 'd'])
    al.cerrarAlerta(); expect(al.alertasVisibles().map(a => a.paso)).toEqual(['b'])
    al.vaciarAlertas(); expect(al.alertaActual()).toBeNull()
  })
})

describe('aviso v2: textos aprobados por Legal (23/10) y montos del reparto real', () => {
  const base = { id: 'x', estado: 'firmas', diasSimulados: 0, contrato: { firmas: {} }, entrada: { firmas: {} } } as never
  const alq = (o: Record<string, unknown>) => ({ id: 'x', estado: 'firmas', diasSimulados: 0, monto: 3, contrato: { firmas: {} }, entrada: { firmas: {} }, historial: [], ...o }) as never
  it('contrato firmado: «Ahora: pagar {monto}» y «Pagar →»; pago: «Ahora: fotos de entrada» y «Tomar fotos →»', () => {
    const c = al.alertaPorCambio(base, alq({ estado: 'pendiente_pago', monto: 7 }), 'inquilino', VIDEO)!
    expect(c.linea).toEqual({ et: 'Ahora:', texto: `pagar ${usd(7)} de prueba` }); expect(c.accion).toMatchObject({ texto: 'Pagar →', ir: 'panel' })
    const p = al.alertaPorCambio({ ...(base as object), estado: 'pendiente_pago' } as never, alq({ estado: 'fotos_entrada' }), 'inquilino', VIDEO)!
    expect(p.linea).toEqual({ et: 'Ahora:', texto: 'fotos de entrada' }); expect(p.accion).toEqual({ texto: 'Tomar fotos →', etiqueta: 'Tomar fotos de entrada', ir: 'panel' })
    const e = al.alertaPorCambio({ ...(base as object), estado: 'fotos_entrada' } as never, alq({ estado: 'en_curso' }), 'inquilino', VIDEO)!
    expect(e.linea).toEqual({ et: 'Al entregar:', texto: 'fotos de salida' }); expect(e.accion?.texto).toBe('Ver alquiler')
  })
  it('devolución y acuerdo: los montos salen de r.inquilino y r.dueno (nunca fijos)', () => {
    const antes = { ...(base as object), estado: 'ventana_reclamo' } as never
    for (const [dueno, inquilino] of [[0, 13], [4.5, 8.5], [1, 2]]) {
      const d = al.alertaPorCambio(antes, alq({ estado: 'cerrado', resultado: { via: 'automatico', dueno, inquilino } }), 'inquilino', VIDEO)!
      expect(d.linea).toEqual({ texto: `${usd(inquilino)} volvieron al inquilino` }); expect(d.accion?.texto).toBe('Ver detalle'); expect(d.accion?.ir).toBe('detalles')
      const a = al.alertaPorCambio({ ...(base as object), estado: 'reclamo' } as never, alq({ estado: 'cerrado', resultado: { via: 'acuerdo', dueno, inquilino } }), 'inquilino', VIDEO)!
      expect(a.linea).toEqual({ texto: `${usd(dueno)} al dueño y ${usd(inquilino)} al inquilino` })
    }
    const src = leer('../alertas.ts')
    expect(src).toContain('linea: { texto: `${usd(r.inquilino)} volvieron al inquilino` }'); expect(src).toContain('linea: { texto: `${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` }')
    expect(src).not.toMatch(/linea: \{[^}]*\b\d+ USDC/)
  })
  it('error de red: «No se pudo completar» con el texto A12 sin cambios (el mismo de services/escrow.ts); sin acción', () => {
    const e = al.alertaErrorRed(); expect(e).toMatchObject({ tipo: 'error', titulo: 'No se pudo completar', hecho: al.ERROR_RED }); expect(e.accion).toBeUndefined()
    expect(leer('../services/escrow.ts')).toContain(`'${al.ERROR_RED}'`)
    const d = leer('../screens/Detalle.tsx'); expect(d).toContain('if (m === ERROR_RED) avisar(alertaErrorRed())')
  })
  it('los textos nuevos del aviso v2 están marcados «LEGAL: revisado el 23/10»', () => {
    const src = leer('../alertas.ts').split('\n')
    for (const l of src.filter(l => /^\s+linea: \{/.test(l))) expect(l).toMatch(/LEGAL: revisado (el 23\/10|\(24\/10\))/)
  })
})

describe('cada paso del flujo dispara su aviso', () => {
  it('flujo completo con acciones reales (demo local): crear, firmas, pago, fotos, salida, plazo, devolución', async () => {
    const { id } = await acciones.crear({ direccion: 'Casa en Heredia', monto: 300, inicio: '2026-11-01', fin: '2027-05-01', reglas: [], inquilinoEmail: 'i@x.cr' }, 'd@x.cr')
    const pasos: string[] = []
    const paso = async (f: () => Promise<unknown> | void, rol: 'dueno' | 'inquilino' = 'inquilino') => {
      const antes = al.instantanea(store.fresco(id)!); await f(); const x = al.alertaPorCambio(antes, store.fresco(id)!, rol, LOCAL)
      expect(x, 'sin aviso después de un paso').not.toBeNull(); pasos.push(x!.paso); return x!
    }
    const a = () => store.fresco(id)!
    expect((await paso(() => acciones.firmar(a(), 'contrato', 'inquilino'))).titulo).toBe('Firmaste el contrato')
    await paso(() => acciones.firmar(a(), 'contrato', 'dueno'))
    expect((await paso(() => acciones.pagar(a()))).titulo).toBe('¡Depósito guardado!')
    expect((await paso(() => acciones.firmar(a(), 'entrada', 'dueno'))).titulo).toBe('El dueño confirmó las fotos de entrada')
    await paso(() => acciones.firmar(a(), 'entrada', 'inquilino'))
    await paso(() => acciones.iniciarSalida(a()))
    await paso(() => acciones.firmar(a(), 'salida', 'inquilino'))
    await paso(() => acciones.firmar(a(), 'salida', 'dueno'))
    await paso(() => store.cambiar(id, x => { x.diasSimulados += 7 }))
    const dev = await paso(() => acciones.cerrarSinReclamo(a()))
    expect(dev.hecho).toContain('volvió completo al inquilino')
    expect(pasos).toEqual(['contrato-firma-inquilino', 'contrato-firmado', 'pago', 'entrada-firma-dueno', 'entrada-confirmada', 'salida-inicio',
      'salida-firma-inquilino', 'salida-confirmada', 'adelantar', 'devolucion'])
  })
  it('reclamo, rechazo, mediación y reparto; y reclamo aceptado', async () => {
    const hasta = async () => {
      const { id } = await acciones.crear({ direccion: 'Apto', monto: 100, inicio: '2026-11-01', fin: '2027-05-01', reglas: [], inquilinoEmail: 'i@x.cr' }, 'd@x.cr')
      store.cambiar(id, x => { x.estado = 'ventana_reclamo'; x.ventanaInicio = new Date().toISOString() }); return id
    }
    const paso = async (id: string, f: () => Promise<unknown>) => { const antes = al.instantanea(store.fresco(id)!); await f(); return al.alertaPorCambio(antes, store.fresco(id)!, 'inquilino', VIDEO)! }
    const id = await hasta()
    const r = await paso(id, () => acciones.reclamar(store.fresco(id)!, 40, 'mancha en la pared', []))
    expect(r.paso).toBe('reclamo'); expect(r.sigue).toContain('(simulación)')
    expect((await paso(id, () => acciones.responder(store.fresco(id)!, false))).paso).toBe('mediacion')
    const m = await paso(id, () => acciones.decidir(store.fresco(id)!, 25))
    expect(m.paso).toBe('reparto'); expect(m.titulo).toBe('Reparto del depósito'); expect(m.hecho).toMatch(/^Se repartió el depósito( en la red de prueba)?: .+ al dueño y .+ al inquilino\.$/); expect(m.hecho).not.toMatch(/decid/)
    const id2 = await hasta()
    await paso(id2, () => acciones.reclamar(store.fresco(id2)!, 40, 'mancha en la pared', []))
    expect((await paso(id2, () => acciones.responder(store.fresco(id2)!, true))).paso).toBe('acuerdo')
  })
  it('cambiar de pantalla («Ver como») o cambios sin paso no avisan', () => {
    const a = { id: '1', estado: 'en_curso', diasSimulados: 0, contrato: { firmas: {} }, entrada: { firmas: {} } } as never
    expect(al.alertaPorCambio(a, a as never, 'dueno', VIDEO)).toBeNull()
    expect(al.alertaPorCambio(a, { ...(a as object), id: '2', estado: 'salida' } as never, 'dueno', VIDEO)).toBeNull()
  })
  it('las pantallas llaman a los avisos', () => {
    expect(leer('../screens/Detalle.tsx')).toContain('avisar(alertaPorCambio(x, a, rol))')
    expect(leer('../screens/Crear.tsx')).toContain("avisar(alertaCreado({ direccion: f.direccion.trim(), monto: m }))\n      ir('/alquiler/' + r.id)")
    const app = leer('../App.tsx')
    expect(app).toContain('avisar(alertaIngreso(modoReal))'); expect(app).toContain("setRegreso('fallo'); avisar(alertaIngresoFallo())")
    expect(app.match(/<Alertas \/>/g)).toHaveLength(4)   // Entrar, «Entrando…», volver a aceptar y con sesión
  })
})

describe('textos de los avisos', () => {
  it('textos aprobados por Legal (23 oct): depósito guardado y mediación', () => {
    const base = { id: '1', direccion: 'Casa', monto: 20, ventanaSegundos: 604800, diasSimulados: 0, contrato: { firmas: {} }, entrada: { firmas: {} } }
    const p = al.alertaPorCambio({ ...base, estado: 'pendiente_pago' } as never, { ...base, estado: 'fotos_entrada' } as never, 'inquilino', VIDEO)!
    expect(p.titulo).toBe('¡Depósito guardado!'); expect(p.hecho).toMatch(/^[^a-z]*20[^a-z]* guardados en una cuenta segura de la red de prueba\. Ni el dueño ni el inquilino pueden sacarlos solos\.$/)   // «20 USDC» en la app (formato de usd())
    const m = al.alertaPorCambio({ ...base, estado: 'reclamo' } as never, { ...base, estado: 'mediacion' } as never, 'inquilino', VIDEO)!
    expect(m.sigue).toBe('Una persona mediadora revisa las fotos y les ayuda a buscar un acuerdo sobre el reparto del depósito. En esta prueba, decides tú el reparto con «Resolver el reclamo (simulación)».')
    expect(al.lineaDe(m)).toEqual({ et: 'En esta prueba:', texto: 'decides tú el reparto (simulación)' })
    expect(leer('../screens/Detalle.tsx')).toContain("'Resolver el reclamo (simulación)'"); expect(leer('../screens/Detalle.tsx')).not.toContain('Decidir como persona mediadora')
  })
  const todas = () => {
    const base = { id: '1', direccion: 'Casa', monto: 20, ventanaSegundos: 604800, diasSimulados: 0, contrato: { firmas: {} }, entrada: { firmas: {} }, salida: { firmas: {} } }
    const r = (via: string) => ({ resultado: { via, dueno: 5, inquilino: 15, fecha: '' } })
    const casos: [object, object][] = [
      [{ estado: 'firmas' }, { estado: 'firmas', contrato: { firmas: { inquilino: 'x' } } }], [{ estado: 'firmas' }, { estado: 'pendiente_pago' }],
      [{ estado: 'pendiente_pago' }, { estado: 'fotos_entrada' }], [{ estado: 'fotos_entrada' }, { estado: 'fotos_entrada', entrada: { firmas: { inquilino: 'x' } } }],
      [{ estado: 'fotos_entrada' }, { estado: 'en_curso' }], [{ estado: 'en_curso' }, { estado: 'salida' }],
      [{ estado: 'salida' }, { estado: 'salida', salida: { firmas: { inquilino: 'x' } } }], [{ estado: 'salida' }, { estado: 'ventana_reclamo' }],
      [{ estado: 'ventana_reclamo' }, { estado: 'ventana_reclamo', diasSimulados: 7 }], [{ estado: 'ventana_reclamo' }, { estado: 'reclamo', reclamo: { monto: 5 } }],
      [{ estado: 'reclamo' }, { estado: 'mediacion' }], [{ estado: 'ventana_reclamo' }, { estado: 'cerrado', ...r('automatico') }],
      [{ estado: 'reclamo' }, { estado: 'cerrado', ...r('acuerdo') }], [{ estado: 'mediacion' }, { estado: 'cerrado', ...r('mediacion') }],
    ]
    return [VIDEO, LOCAL].flatMap(c => casos.map(([x, y]) => al.alertaPorCambio({ ...base, ...x } as never, { ...base, ...y } as never, 'inquilino', c)!))
      .concat(al.alertaCreado({ direccion: 'Casa', monto: 20 }), al.alertaIngreso(true), al.alertaIngreso(false), al.alertaIngresoFallo())
  }
  it('hay aviso para cada paso y todos dicen qué pasó (y casi todos qué sigue)', () => {
    const t = todas(); expect(t.every(Boolean)).toBe(true)
    expect(new Set(t.map(x => x.paso)).size).toBe(17)
    for (const x of t) { expect(x.titulo.length).toBeGreaterThan(5); expect(x.hecho.length).toBeGreaterThan(10); if (x.paso !== 'ingreso' && x.paso !== 'ingreso-fallo') expect(x.sigue).toBeTruthy() }
  })
  it('sin emojis, sin «liberado» y sin palabras técnicas', () => {
    for (const x of todas()) {
      const s = [x.titulo, x.hecho, x.sigue ?? ''].join(' ')
      expect(s).not.toMatch(EMOJI); expect(s).not.toMatch(/liberad|liberó|escrow|blockchain|wallet|hash|testnet|USDC de/i)
    }
  })
  it('el error dice cómo seguir (texto corto aprobado por Legal)', () => {
    const e = al.alertaIngresoFallo(); expect(e.tipo).toBe('error'); expect(e.titulo).toBe('El ingreso no terminó'); expect(e.hecho).toBe('Toca Entrar y elige tu cuenta.')
  })
  it('los textos con sentido legal están marcados para Legal', () => {
    expect(leer('../alertas.ts').match(/\/\/ LEGAL: revis(ar|ado)/g)!.length).toBeGreaterThanOrEqual(8)
  })
})

describe('error del ingreso escrito en Entrar', () => {
  it('Login con error: texto de Legal, asociado al botón Entrar; sin error no aparece', async () => {
    const { Login, Entrando } = await import('../screens/Login')
    const con = renderToStaticMarkup(<Login onOk={() => {}} error />), sin = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(con).toContain('<div id="error-ingreso" class="entrada-app__error"><strong>El ingreso no terminó</strong> <span>Toca Entrar y elige tu cuenta.</span></div>')
    expect(con).toMatch(/<button[^>]*aria-describedby="error-ingreso"[^>]*>Entrar<\/button>/)
    expect(sin).not.toContain('error-ingreso')
    const e = renderToStaticMarkup(<Entrando />)
    expect(e).toContain('aria-busy="true"'); expect(e).toContain('role="status"'); expect(e).toContain('Entrando a tu cuenta…'); expect(e).not.toContain('<button')
  })
  it('App: «Entrando…» mientras se confirma el regreso; el error queda hasta volver a intentar o entrar', () => {
    const a = leer('../App.tsx')
    expect(a).toContain("if (!u && regreso === 'esperando') return <Fondo>{skip}<Alertas /><Entrando /></Fondo>")
    expect(a).toContain(".catch(() => { setRegreso('fallo'); avisar(alertaIngresoFallo()) })")
    expect(a).toContain("error={regreso === 'fallo'} onReintento={() => setRegreso(null)}")
    expect(a).toContain('const entro = (x: Usuario) => { setRegreso(null);')
    expect(leer('../screens/Login.tsx')).toContain('onReintento?.(); setAbierta(true)')
  })
})

describe('aviso al inicio del orden de Tab', () => {
  const app = leer('../App.tsx')
  it('<Alertas /> va justo después de «Saltar al contenido» en las cuatro vistas (sin sesión, entrando, volver a aceptar y con sesión)', () => {
    const fondos = app.match(/<Fondo>\{skip\}[\s\S]*?<\/Fondo>/g)!.filter(f => f.includes('<Alertas />'))
    expect(fondos).toHaveLength(4)
    for (const f of fondos) expect(f).toMatch(/^<Fondo>\{skip\}\s*<Alertas \/>/)
    expect(app).not.toMatch(/<Pie \/>\s*<Alertas \/>/)
  })
  it('sigue sin robar el foco: el aviso no se enfoca solo al aparecer', () => {
    const av = leer('../Aviso.tsx')
    expect(av).not.toMatch(/autoFocus/)
    expect(av).toContain('tabIndex={0}')
    expect(av).not.toMatch(/\.focus\(\)[^\n]*tostada/)
  })
})

describe('líneas cortas del aviso v2 (Legal, 24/10)', () => {
  const base = { id: '1', direccion: 'Casa', monto: 20, ventanaSegundos: 604800, diasSimulados: 0, contrato: { firmas: {} }, entrada: { firmas: {} }, salida: { firmas: {} } }
  const de = (x: object, y: object, c = VIDEO, rol: 'inquilino' | 'dueno' = 'inquilino') => al.lineaDe(al.alertaPorCambio({ ...base, ...x } as never, { ...base, ...y } as never, rol, c)!)
  it('las 11 líneas, palabra por palabra', () => {
    expect(al.lineaDe(al.alertaCreado({ direccion: 'Casa', monto: 20 }))).toEqual({ et: 'Ahora:', texto: 'leer y firmar el contrato' })
    expect(de({ estado: 'firmas' }, { estado: 'firmas', contrato: { firmas: { inquilino: 'x' } } })).toEqual({ et: 'Sigue:', texto: 'la firma del dueño de prueba' })
    expect(de({ estado: 'firmas' }, { estado: 'firmas', contrato: { firmas: { inquilino: 'x' } } }, LOCAL)).toEqual({ et: 'Sigue:', texto: 'la firma de la otra persona' })
    expect(de({ estado: 'firmas' }, { estado: 'firmas', contrato: { firmas: { dueno: 'x' } } }, LOCAL)).toEqual({ et: 'Ahora:', texto: 'tu firma' })
    expect(de({ estado: 'fotos_entrada' }, { estado: 'fotos_entrada', entrada: { firmas: { inquilino: 'x' } } })).toEqual({ et: 'Sigue:', texto: 'la otra persona confirma las fotos' })
    expect(de({ estado: 'en_curso' }, { estado: 'salida' })).toEqual({ et: 'Ahora:', texto: 'una foto de cada espacio' })
    expect(de({ estado: 'salida' }, { estado: 'salida', salida: { firmas: { inquilino: 'x' } } })).toEqual({ et: 'Sigue:', texto: 'la otra persona confirma las fotos' })
    expect(de({ estado: 'salida' }, { estado: 'ventana_reclamo' })).toEqual({ et: 'Sigue:', texto: '7 días para hacer un reclamo' })
    expect(de({ estado: 'ventana_reclamo' }, { estado: 'reclamo', reclamo: { monto: 5 } })).toEqual({ et: 'Sigue:', texto: 'el inquilino acepta o no el reclamo' })
    expect(de({ estado: 'reclamo' }, { estado: 'mediacion' })).toEqual({ et: 'En esta prueba:', texto: 'decides tú el reparto (simulación)' })
    expect(de({ estado: 'reclamo' }, { estado: 'mediacion' }, LOCAL)).toEqual({ et: 'Sigue:', texto: 'una persona mediadora les ayuda a buscar un acuerdo' })
    const rep = al.alertaPorCambio({ ...base, estado: 'mediacion' } as never, { ...base, estado: 'cerrado', resultado: { via: 'mediacion', dueno: 5, inquilino: 15, fecha: '' } } as never, 'inquilino', VIDEO)!
    expect(rep.titulo).toBe('Reparto del depósito'); expect(rep.linea!.texto).toMatch(/^\D*5[^ ]* al dueño y \D*15[^ ]* al inquilino$/); expect(rep.accion!.texto).toBe('Ver detalle →')
    expect(rep.hecho).toMatch(/^Se repartió el depósito en la red de prueba: .+ al dueño y .+ al inquilino\.$/)
    expect(de({ estado: 'ventana_reclamo' }, { estado: 'ventana_reclamo', diasSimulados: 7 })).toEqual({ et: 'Solo en la prueba:', texto: 'terminó el plazo para reclamos' })
  })
  it('mediación: ayuda a buscar un acuerdo, no decide; los montos salen de usd()', () => {
    expect(al.MEDIACION_LARGO).toBe('Una persona mediadora revisa las fotos y les ayuda a buscar un acuerdo sobre el reparto del depósito.')
    const m = al.alertaPorCambio({ ...base, estado: 'reclamo' } as never, { ...base, estado: 'mediacion' } as never, 'inquilino', LOCAL)!
    expect(m.sigue).toBe(al.MEDIACION_LARGO); expect([m.sigue, al.lineaDe(m).texto].join(' ')).not.toMatch(/decide/)
    const src = leer('../alertas.ts'); expect(src).not.toContain('Reparto decidido'); expect(src).toContain('${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino')
    expect(src.match(/LEGAL: revisado \(24\/10\)/g)!.length).toBeGreaterThanOrEqual(8)
  })
  it('tarjeta de Inicio: «Pagar el depósito · Luego, fotos de entrada» (sin «Depósito protegido»)', () => {
    const ini = leer('../screens/Inicio.tsx'); expect(ini).toContain("t: 'Pagar el depósito', s: 'Luego, fotos de entrada' },   // LEGAL: revisado (24/10)"); expect(ini).not.toContain('Depósito protegido')
  })
})
