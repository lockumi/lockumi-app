import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })

const { Contrato, EnCurso, ConfirmacionDeposito, progresoCuartos, lugarContrato } = await import('../Detalle')
const { EsperaVista } = await import('../EsperaVista')
const { PASOS_RECORRIDO } = await import('../../recorrido')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }

const A = { id: '3f2a9c1b-0000-4000-8000-000000000000', direccion: 'Casa demo', monto: 20, moneda: 'USDC', inicio: '2026-11-01', fin: '2027-05-01', reglas: ['No fumar dentro de la casa'],
  duenoEmail: 'demo@lockumi.com', inquilinoEmail: 'luis.demo@lockumi.com', estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: { inquilino: '2026-11-01T12:00:00.000Z' } },
  entrada: { cuartos: [], firmas: {} }, diasSimulados: 0 } as unknown as Alquiler

describe('tarjeta del contrato', () => {
  const html = renderToStaticMarkup(<Contrato a={A} rol="dueno" />)
  it('muestra monto, plazo y firmas reales, y deja el texto íntegro detrás del botón', () => {
    expect(html).toContain('Casa demo')
    expect(html).toContain('Ver contrato completo')
    expect(html).toContain('7 días')
    expect(html).toContain('1 de 2')
    expect(html).toContain('Firmó')
    expect(html).toContain('Pendiente')
    expect(html).toContain('id="ct-firma" hidden=""')
    expect(html).toContain('class="cp-abrir"')
    expect(html).toContain('Leí el contrato y estoy de acuerdo.')
    expect(html).not.toContain('USD XX')
    expect(html).toContain('/img/casita-inmueble.png')
    expect(html).not.toContain('logo-header')
    expect(html).toMatch(/class="boton boton--primario boton--ancho"[^>]*>.*?Ver contrato completo/)
    const alerta = html.indexOf('Te toca firmar')
    expect(html.lastIndexOf('<p', alerta)).toBeGreaterThan(html.lastIndexOf('<button', alerta))
  })
  it('parte el lugar real y no inventa una ciudad si la dirección no trae separador', () => {
    expect(lugarContrato('Casa ejemplo · Heredia centro')).toEqual({ etiqueta: 'Casa ejemplo', titulo: 'Heredia centro' })
    expect(lugarContrato('Casa demo')).toEqual({ etiqueta: '', titulo: 'Casa demo' })
    const partida = renderToStaticMarkup(<Contrato a={{ ...A, direccion: 'Casa ejemplo · Heredia centro' }} rol="dueno" />)
    expect(partida).toContain('Casa ejemplo')
    expect(partida).toContain('Heredia centro')
    expect(partida).toContain('Pendiente de firmas')
  })
  it('la acción de firmar sigue en el componente de firma, no se dispara sola', () => {
    expect(html).toMatch(/Firma como/)
    expect(html).not.toContain('acciones.firmar')
  })
})

describe('espacios', () => {
  it('el progreso sale de los cuartos y no confirma si falta uno', () => {
    const cuarto = (listo: boolean) => ({ fotos: listo ? [{}] : [], items: [{ estado: listo ? 'bien' : null }] })
    expect(progresoCuartos([cuarto(true), cuarto(true), cuarto(false)])).toEqual({ listos: 2, total: 3, puedeConfirmar: false })
    expect(progresoCuartos([cuarto(true), cuarto(true)])).toEqual({ listos: 2, total: 2, puedeConfirmar: true })
    expect(progresoCuartos([])).toEqual({ listos: 0, total: 0, puedeConfirmar: false })
  })
})

describe('esperas de presentación', () => {
  it('crear muestra la espera y, si falla, el formulario vuelve con el borrador', () => {
    const crear = fs.readFileSync(new URL('../Crear.tsx', import.meta.url), 'utf8')
    expect(crear).toContain('<EsperaVista titulo="Creando…" texto="Preparando tu alquiler…" />')
    expect(crear).toContain('hidden={ocupado}')
    expect(crear).toContain("setOcupado(false)")
    expect(crear).toContain('lockumi.borrador.crear')
    const h = renderToStaticMarkup(<EsperaVista titulo="Creando…" texto="Preparando tu alquiler…" />)
    expect(h).toContain('role="status"')
    expect(h).not.toMatch(/éxito|listo|55 %/)
  })
  it('el depósito protegido es el paso de las fotos, no el anillo del alquiler en curso', () => {
    const pagado = { ...A, estado: 'fotos_entrada' as const, pago: '2026-11-02T12:00:00.000Z' }
    const h = renderToStaticMarkup(<ConfirmacionDeposito a={pagado} onContinuar={() => {}} />)
    expect(h).toContain('Depósito protegido')
    expect(h).toContain('Ahora: fotos de entrada')
    expect(h).toContain('Paso 4 de 8')
    expect(h).toContain('Continuar')
    expect(h).not.toContain('anillo')
    expect(h).not.toContain('USD 12')
    const curso = renderToStaticMarkup(<EnCurso a={{ ...A, estado: 'en_curso' }} rol="inquilino" />)
    expect(curso).toContain('Alquiler en curso')
    expect(curso).toContain('El depósito sigue guardado y ni el dueño ni el inquilino pueden tomarlo solos.')
    expect(curso).toContain('Empezar fotos de salida')
    expect(curso).not.toContain('Depósito protegido')
    const src = fs.readFileSync(new URL('../Detalle.tsx', import.meta.url), 'utf8')
    expect(src).toContain('lockumi.confirmacion-deposito.')
    expect(src).toContain('!p.a.pago || confirmacionVista')
  })
})

describe('recorrido: focos nuevos, aprendizajes iguales', () => {
  it('el paso de fotos apunta a la lista de espacios y los 6 textos de firma y devolución no cambian', () => {
    expect(PASOS_RECORRIDO).toHaveLength(6)
    expect(PASOS_RECORRIDO[3].el).toBe('[data-recorrido="fotos"]')
    expect(fs.readFileSync(new URL('../Detalle.tsx', import.meta.url), 'utf8')).toContain('data-recorrido="fotos"')
    expect(PASOS_RECORRIDO[4].texto).toContain('Ni el dueño ni el inquilino lo pueden sacar solos.')
    expect(PASOS_RECORRIDO.map(p => p.titulo)).toHaveLength(6)
  })
})
