// PR #22 · textos de Legal (25/10, 2:53 a. m.) para el escenario C, aprobados sobre 4be7582. Solo con VITE_DOS_PERSONAS
// (alquileres de dos personas): con el interruptor apagado, producción no cambia.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'

vi.stubEnv('VITE_PRUEBA_COMPLETA', '1'); vi.stubEnv('VITE_TRUSTLESS', '1'); vi.stubEnv('VITE_DOS_PERSONAS', '1')
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'falsa')
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('location', { origin: 'http://127.0.0.1:4620', hostname: '127.0.0.1', hash: '' })

const { Contrato, Pago, EnCurso } = await import('../../screens/Detalle')
const { ContratoDoc } = await import('../../screens/ContratoDoc')
const { alertaPorCambio, instantanea } = await import('../../alertas')
const { Expediente } = await import('../Expediente')
const { turno } = await import('../../flujo')
const D = await import('../dosPersonas')
const V = await import('../../legal/versiones')

const INQ = 'inquilino.prueba@lockumi.com', DUENO = 'dueno.prueba@lockumi.com'
const T19 = { version: '1.9-demo', fecha: '2026-10-25T08:00:00Z', edicion: '1.9-demo · 25 de octubre de 2026' }
const base: Alquiler = { id: 'c0000000-0000-4000-8000-000000000019', direccion: 'Casa de prueba (C)', monto: 800, moneda: 'USDC', inicio: '2026-10-01', fin: '2026-11-10', reglas: [],
  duenoEmail: DUENO, inquilinoEmail: INQ, inquilinoUnido: true, estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} },
  entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, dosPersonas: true, terminos: { version: '1.9-demo', acepta: T19 } } as unknown as Alquiler
const A = (x: Partial<Alquiler> = {}) => ({ ...base, ...x }) as Alquiler

const TITULO = 'Si hay un reclamo'
const TEXTO = 'En esta versión, la app no aplica ninguna propuesta por su cuenta. Si el dueño hace un reclamo y no respondes a tiempo (cláusula 6.5), el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan. Si el dueño no hace un reclamo a tiempo, recibes el 100 % del depósito.'
const PAGO = 'Tu cuenta Lockumi te pedirá confirmar el pago en la red de prueba. Son USDC de prueba, sin valor.'

describe('1) C, pantalla de firmar: sin la Regla 6.5.1; nota «Si hay un reclamo» sin casilla', () => {
  it('el inquilino ve la nota informativa (estilo de recuadro) y nunca la tarjeta ni su casilla', () => {
    const h = renderToStaticMarkup(<Contrato a={A()} rol="inquilino" />)
    expect(h).not.toContain('Regla de propuesta automática (opcional)'); expect(h).not.toContain('acepto-regla')
    expect(h).toContain(TITULO); expect(h).toContain(TEXTO)
    expect(h).toMatch(/<div class="auto-dos" role="note"[^>]*><p><strong>Si hay un reclamo<\/strong><\/p><p>En esta versión/)
    expect(h).toContain('Firmas del contrato')   // pasa directo a leer y firmar
  })
  it('los textos son los de Legal, palabra por palabra', () => { expect(D.TITULO_RECLAMO_DOS).toBe(TITULO); expect(D.TEXTO_RECLAMO_DOS).toBe(TEXTO) })
  it('sin dos personas, la Regla 6.5.1 sigue igual (A)', () => {
    const h = renderToStaticMarkup(<Contrato a={A({ dosPersonas: false, terminos: { version: '1.7-demo', acepta: { ...T19, version: '1.7-demo' } }, id: 'local-1' } as Partial<Alquiler>)} rol="inquilino" />)
    expect(h).toContain('Regla de propuesta automática (opcional)'); expect(h).not.toContain(TITULO)
  })
  it('Detalle nunca guarda la regla en un alquiler de dos personas', async () => {
    const src = (await import('../../screens/Detalle.tsx?raw')).default as string
    expect(src).toMatch(/if \(reglas17\(a\) && !esDosPersonas\(a\) && rol === 'inquilino' && !a\.regla/)
  })
})

describe('2) «Qué sigue» y otros textos de C: la propuesta solo se aplica si las dos partes la aceptan', () => {
  const r = A({ estado: 'reclamo' })
  it.each(['inquilino', 'dueno'] as const)('reclamo abierto (%s)', rol => {
    // Legal 25/10, 5:09 p. m. (punto 6): texto literal; en C no hay propuesta automática
    const t = turno(r, rol)
    expect(t.sigue).toBe(rol === 'inquilino'
      ? 'Si no aceptas el reclamo o no respondes a tiempo, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan.'
      : 'Si el inquilino no acepta el reclamo o no responde a tiempo, el caso pasa a la Mediación Lockumi (demo), sin costo, y el reparto solo se aplica si las dos partes lo aceptan.')
    expect(t.sigue).not.toMatch(/propuesta automática|se aplica sola|por su cuenta/)
  })
  it('sin dos personas, «Qué sigue» no cambia', () => {
    expect(turno(A({ estado: 'reclamo', dosPersonas: false }), 'inquilino').sigue).toBe('Si no aceptas todo, verás una propuesta automática (simulación). Si no hay acuerdo, pasa a la Mediación Lockumi (demo).')
  })
  it('al vencer el plazo del inquilino, C no dice «Aplicando la regla»', async () => {
    expect(D.TEXTO_SILENCIO_DOS).not.toMatch(/regla/i); expect(D.TEXTO_SILENCIO_DOS).toContain('Mediación Lockumi (demo)')
    const src = (await import('../ReclamoPC.tsx?raw')).default as string
    expect(src).toMatch(/esDosPersonas\(a\) \? TEXTO_SILENCIO_DOS : 'Venció el plazo para responder\. Aplicando la regla…'/)
  })
  it('el expediente de C dice que la regla no se ofrece en esta versión', async () => {
    const { contenidoExpediente } = await import('../expediente')
    const s = contenidoExpediente(A({ estado: 'cerrado' }), Date.parse('2026-11-16T16:00:00Z'), {}).find(x => x.titulo === 'Aceptaciones')!
    expect(s.lineas).toContain('Regla de propuesta automática: no se ofrece en esta versión (cláusula 6.5.1 d)')
  })
  it('el expediente de C descarga datos reales de la prueba: «Descargar el expediente (datos de prueba)»', () => {
    expect(renderToStaticMarkup(<Expediente a={A({ estado: 'cerrado' })} />)).toContain('Descargar el expediente (datos de prueba)')
    expect(renderToStaticMarkup(<Expediente a={A({ estado: 'cerrado', dosPersonas: false })} />)).toContain('Descargar el expediente (demo)')
  })
})

describe('3) pago en C: confirma la cuenta Lockumi (Cavos), la única que firma el depósito de dos personas', () => {
  it('nota del inquilino, palabra por palabra', () => {
    const h = renderToStaticMarkup(<Pago a={A({ estado: 'pendiente_pago', miRol: 'inquilino', cuentas: { inquilino: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV' } })} rol="inquilino" />)
    expect(h).toContain(`<p class="nota">${PAGO} `); expect(h).not.toContain('Freighter')
  })
  it('el depósito de dos personas solo lo firma la billetera Cavos (trustless.depositar → firmarXdr → Cavos)', async () => {
    const t = (await import('../../services/trustless.ts?raw')).default as string, b = (await import('../../services/billetera.ts?raw')).default as string
    expect(t).toMatch(/import \{ firmarXdr, mensajeFirma \} from '\.\/billetera'/)
    expect(b).toMatch(/export async function firmarXdr\(xdr: string\): Promise<string> \{ return \(await miCartera\(\)\)\.signXdr\(xdr\) \}/)
    expect(b).not.toMatch(/freighter/i)
  })
})

describe('4) fecha de la 1.9-demo: una sola constante, provisional hasta el encendido', () => {
  it('FECHA_V19 es la de la 1.9-demo', () => {
    // la fecha real del encendido se cambia en UNA sola línea (versiones.ts); aquí solo se exige el formato «25 de octubre de 2026»
    expect(V.FECHA_V19).toMatch(/^\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de 20\d\d$/)
    expect(V.VERSIONES.find(v => v.version === '1.9-demo')!.fecha).toBe(V.FECHA_V19)
  })
  it('sin VITE_DOS_PERSONAS=1 los Términos y la Privacidad dicen 1.7-demo; al encender C, 1.9-demo con FECHA_V19', () => {
    expect(V.versionVigente({ 'dos-personas': false, correos: false })).toBe('1.7-demo')
    expect(V.versionVigente({ 'dos-personas': true, correos: true })).toBe('1.9-demo')
    expect(V.edicionDe('1.9-demo')).toBe(`1.9-demo · ${V.FECHA_V19}`)
  })
  it('no hay otra copia de la fecha en versiones.ts', async () => {
    const src = (await import('../../legal/versiones.ts?raw')).default as string
    expect(src.match(/'25 de octubre de 2026'/g)).toHaveLength(1)
  })
})

// Legal, 25/10, 3:16 a. m. (sobre 1c8af23): segunda línea del pago, 6.5 c), aviso del silencio y marcas quitadas de lo aprobado.
const ESCROW = 'El depósito queda guardado en una cuenta de garantía (escrow) de Trustless Work en la red de prueba, y se libera según las reglas de los Términos (cláusulas 5 y 6).'
const SOLOS = /(sacar|tomar|liberar)l[oa]s? solos|lo pueden sacar solos|nadie puede (sacar|tomar|mover)l[oa]/i
const NADIE = /nadie puede (sacar|tomar|mover)l[oa]/i
describe('5) Legal 3:16: pago de C con la cuenta de garantía (escrow), sin «nadie puede sacarlo solo»', () => {
  it('la nota del pago es la línea de Legal y, después, la del escrow, palabra por palabra', () => {
    expect(D.TEXTO_ESCROW_DOS).toBe(ESCROW)
    const h = renderToStaticMarkup(<Pago a={A({ estado: 'pendiente_pago', miRol: 'inquilino' })} rol="inquilino" />)
    expect(h).toContain(`<p class="nota">${PAGO} ${ESCROW}</p>`); expect(h).not.toMatch(SOLOS)
  })
  it('ninguna pantalla de C dice que nadie puede sacar el depósito solo (pago, contrato, en curso, aviso del pago)', () => {
    const hs = [renderToStaticMarkup(<Pago a={A({ estado: 'pendiente_pago', miRol: 'inquilino' })} rol="inquilino" />), renderToStaticMarkup(<Pago a={A({ estado: 'pendiente_pago', miRol: 'dueno' })} rol="dueno" />),
      renderToStaticMarkup(<ContratoDoc a={A()} completo />), renderToStaticMarkup(<EnCurso a={A({ estado: 'en_curso' })} rol="inquilino" />)]
    for (const h of hs) expect(h).not.toMatch(NADIE)
    for (const h of hs.slice(0, 2)) expect(h).not.toMatch(SOLOS)   // el pago no lo dice; contrato y en curso: ver 8)
    for (const red of [true, false]) {
      const al = alertaPorCambio(instantanea(A({ estado: 'pendiente_pago' })), A({ estado: 'fotos_entrada' }), 'inquilino', { prueba: false, video: false, red })!
      expect(al.titulo).toBe('¡Depósito guardado!'); expect(al.hecho).toMatch(/^800,00 USDC( de prueba)? guardados en una cuenta segura de la red de prueba\.$/); expect(al.hecho).not.toMatch(SOLOS)
    }
  })
  it('sin dos personas, esas pantallas no cambian', () => {
    const al = alertaPorCambio(instantanea(A({ estado: 'pendiente_pago', dosPersonas: false })), A({ estado: 'fotos_entrada', dosPersonas: false }), 'inquilino', { prueba: false, video: false, red: true })!
    expect(al.hecho).toMatch(/Ni el dueño ni el inquilino pueden sacarlos solos\.$/)
    expect(renderToStaticMarkup(<EnCurso a={A({ estado: 'en_curso', dosPersonas: false })} rol="inquilino" />)).toContain('ni el dueño ni el inquilino pueden tomarlo solos')
  })
  it('los textos de C (dosPersonas.ts) no dicen «nadie puede sacarlo solo»', async () => {
    expect((await import('../dosPersonas.ts?raw')).default as string).not.toMatch(NADIE)
  })
})
describe('6) Legal 3:16: aviso del silencio del inquilino', () => {
  it('palabra por palabra; el de A no cambia', async () => {
    expect(D.TEXTO_SILENCIO_DOS).toBe('Venció el plazo para responder. El caso pasa a la Mediación Lockumi (demo).')
    expect(D.EXPEDIENTE_REGLA_DOS).toBe('Regla de propuesta automática: no se ofrece en esta versión (cláusula 6.5.1 d)')
  })
})
describe('7) Legal 3:16: sin «LEGAL: revisar» en lo que Legal aprobó', () => {
  const antesDe = (src: string, ancla: string) => { const i = src.indexOf(ancla); expect(i).toBeGreaterThan(-1); const l = src.slice(0, i).split('\n'); return l.slice(-2).join('\n') }
  it.each(['TITULO_RECLAMO_DOS', 'TEXTO_RECLAMO_DOS', 'TEXTO_PAGO_DOS', 'TEXTO_ESCROW_DOS', 'SIGUE_RECLAMO_DOS', 'TEXTO_SILENCIO_DOS', 'BOTON_EXPEDIENTE_DOS', 'EXPEDIENTE_REGLA_DOS', 'TEXTO_ACEPTARON_DOS'])('dosPersonas.ts: %s', async n => {
    const src = (await import('../dosPersonas.ts?raw')).default as string
    expect(antesDe(src, `export const ${n} =`)).not.toMatch(/LEGAL: revisar/)
  })
  it('notaComisionReparto (cierre de C)', async () => {
    const src = (await import('../dosPersonas.ts?raw')).default as string
    expect(antesDe(src, 'export const notaComisionReparto')).not.toMatch(/LEGAL: revisar/)
  })
  it('Detalle.tsx: nota de 07, pago de C y cierre de C', async () => {
    const src = (await import('../../screens/Detalle.tsx?raw')).default as string
    for (const a of ['{esDosPersonas(a) && rol === \'inquilino\' && !a.contrato.firmas.inquilino && <div className="auto-dos"', '{dos ? <p className="nota">']) expect(antesDe(src, a)).not.toMatch(/LEGAL: revisar/)
    expect(src).toMatch(/\{dosAceptan && <p className="nota">\{notaComisionReparto\(r\.inquilino, r\.dueno\)\}<\/p>\}\n/)
  })
  it('flujo.ts: «Qué sigue» de C', async () => {
    const src = (await import('../../flujo.ts?raw')).default as string
    expect(src).toMatch(/case 'reclamo': if \(esDosPersonas\(a\)\) return yo === 'inquilino'\n/)
  })
  it('CasillaVersion.tsx: casilla al unirse y al crear', async () => {
    expect((await import('../CasillaVersion.tsx?raw')).default as string).not.toMatch(/LEGAL: revisar/)
  })
  it('terminos.md: 2.2 b), 6.5 c) y 6.5.1 d) de C', async () => {
    const src = (await import('../../legal/v17/terminos.md?raw')).default as string
    expect(antesDe(src, '<!-- si: dos-personas -->\nb) En la fase 2')).not.toMatch(/LEGAL: revisar/)
    expect(antesDe(src, '<!-- si: dos-personas -->\nd) En la versión con dos personas')).not.toMatch(/LEGAL: revisar/)
    expect(antesDe(src, 'c) **Si el inquilino no responde:**')).not.toMatch(/LEGAL: revisar/)
  })
})

// Legal, 25/10, 3:34 a. m. (sobre f0276bd): en C, el contrato y «En curso» vuelven a decirlo, con el texto exacto de Legal.
const SOLOS_C = 'Ni el dueño ni el inquilino pueden tomarlo solos. Lockumi maneja en su servidor la cuenta que libera el depósito y la cuenta mediadora, y el servidor solo reparte cuando las dos partes aceptan el mismo reparto.'
describe('8) Legal 3:34: contrato y «En curso» de C con el texto de Legal; el aviso del pago no cambia', () => {
  it('la constante es la de Legal, palabra por palabra', () => { expect(D.TEXTO_SOLOS_DOS).toBe(SOLOS_C) })
  it('contrato de C: el texto de Legal y, después, quién ejecuta el reparto', () => {
    expect(renderToStaticMarkup(<ContratoDoc a={A()} completo />)).toContain(`El depósito queda guardado hasta el final. ${SOLOS_C} Si hay un reclamo, el reparto que acuerden o que se registre en la mediación lo ejecuta en la red de prueba la cuenta de Lockumi que resuelve disputas.`)
  })
  it('«En curso» de C', () => {
    expect(renderToStaticMarkup(<EnCurso a={A({ estado: 'en_curso' })} rol="inquilino" />)).toContain(`El depósito sigue guardado. ${SOLOS_C}</p>`)
  })
  it('el aviso del pago de C sigue igual', () => {
    const al = alertaPorCambio(instantanea(A({ estado: 'pendiente_pago' })), A({ estado: 'fotos_entrada' }), 'inquilino', { prueba: false, video: false, red: true })!
    expect(al.hecho).toBe('800,00 USDC de prueba guardados en una cuenta segura de la red de prueba.')
  })
  it('sin dos personas, contrato y «En curso» no cambian', () => {
    const k = renderToStaticMarkup(<ContratoDoc a={A({ dosPersonas: false })} completo />), e = renderToStaticMarkup(<EnCurso a={A({ estado: 'en_curso', dosPersonas: false })} rol="inquilino" />)
    expect(k).toContain('Ni el dueño ni el inquilino pueden tomarlo solos. En esta prueba, si hay un reclamo, la cuenta de Lockumi es la que ejecuta el reparto que se elige en la simulación.')
    expect(e).toContain('El depósito sigue guardado y ni el dueño ni el inquilino pueden tomarlo solos.')
    for (const h of [k, e]) expect(h).not.toContain('Lockumi maneja en su servidor')
  })
  it('sin «LEGAL: revisar» en esas dos líneas ni en el aviso del pago de C', async () => {
    const det = (await import('../../screens/Detalle.tsx?raw')).default as string, ct = (await import('../../screens/ContratoDoc.tsx?raw')).default as string
    const al = (await import('../../alertas.ts?raw')).default as string
    const cerca = (src: string, ancla: string, n = 3) => { const i = src.indexOf(ancla); expect(i).toBeGreaterThan(-1); return src.slice(0, i).split('\n').slice(-n).join('\n') + src.slice(i).split('\n')[0] }
    expect(cerca(det, 'TEXTO_SOLOS_DOS}', 2)).not.toMatch(/LEGAL: revisar/)
    expect(cerca(ct, '${TEXTO_SOLOS_DOS}', 4)).not.toMatch(/LEGAL: revisar/)
    expect(cerca(al, 'hecho: esDosPersonas(ahora)', 1)).not.toMatch(/LEGAL: revisar/)
  })
})

describe('C sin «propuesta automática» (Coordinador 25/10, 5:29 p. m.)', () => {
  it('ningún correo de C ni el «Qué sigue» de C la mencionan', async () => {
    const { TEXTOS } = await import('../../../api/_lib/textos-correos')
    const d = { deposito: 2, reclamado: 0.5, vence: Date.parse('2026-10-29T15:00:00Z'), dueno: 0.5, inquilino: 1.5, pedidoEn: 0, eliminadoEn: 0, limite: 0 }
    for (const [k, t] of Object.entries(TEXTOS)) for (const auto of [false, true]) for (const motivo of ['rechazo', 'silencio'] as const)
      expect(`${k} ${t.asunto({ ...d, auto, motivo })} ${t.cuerpo({ ...d, auto, motivo })}`).not.toMatch(/propuesta automática/i)
    const { SIGUE_RECLAMO_DOS } = await import('../dosPersonas')
    expect(Object.values(SIGUE_RECLAMO_DOS).join(' ')).not.toMatch(/propuesta automática/i)
  })
  it('en C el inquilino no ve «rubro por rubro» (responde el reclamo entero; Legal 25/10, 6:10 p. m.)', () => {
    expect(turno(A({ estado: 'reclamo', dosPersonas: true }), 'inquilino').tu).toBe('Responde el reclamo.')
    for (const rol of ['inquilino', 'dueno'] as const) expect(JSON.stringify(turno(A({ estado: 'reclamo', dosPersonas: true }), rol))).not.toMatch(/rubro por rubro/)
  })
})
