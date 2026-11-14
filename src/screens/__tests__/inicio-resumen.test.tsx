import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler, Usuario } from '../../types'
import { usd } from '../../ui'
import { saldosDe, tareasPropias, esperas, enCursoSinTarea, puedePagar, copiaTarea, textoEspera, textoEnCurso } from '../inicio-resumen'

const bolsa = vi.hoisted(() => ({ lista: [] as Alquiler[], estado: 'listo' as 'listo' | 'cargando' | 'error' }))
vi.mock('../../store', async orig => {
  const m = await orig<typeof import('../../store')>()
  return { ...m, useAlquileres: () => bolsa.lista, useEstadoAlquileres: () => bolsa.estado }
})
const { ResumenInicio } = await import('../ResumenInicio')
const { Navegacion } = await import('../Navegacion')

const U: Usuario = { email: 'katherine@ejemplo.cr', nombre: 'Katherine', metodo: 'correo' }
const base = (p: Partial<Alquiler>): Alquiler => ({
  id: 'x', direccion: 'Casa ejemplo · Heredia centro', monto: 600, moneda: 'USD', inicio: '2026-12-01', fin: '2027-05-31',
  reglas: [], duenoEmail: U.email, inquilinoEmail: 'otra@ejemplo.cr', estado: 'firmas', rendimiento: false, historial: [],
  contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0, ...p,
})
const curso = base({ id: 'a1', direccion: 'Apartamento ejemplo · Escazú', monto: 800, estado: 'en_curso', pago: '2026-10-12T15:00:00Z', contrato: { firmas: { dueno: 't', inquilino: 't' } } })
const firma = base({ id: 'a2', monto: 600, estado: 'firmas' })

describe('saldos del inicio', () => {
  it('la firma del dueño suma previsto 1400, custodia 800 y 600 por depositar', () => {
    const s = saldosDe([curso, firma])
    expect(s).toEqual({ previsto: 1400, custodia: 800, porDepositar: 600, sinImporte: 0 })
    expect(tareasPropias([curso, firma], U.email).map(a => a.id)).toEqual(['a2'])
    expect(enCursoSinTarea([curso, firma], U.email)).toBe(1)
    expect(copiaTarea(firma, U.email).boton).toBe('Ver contrato y firmar')
  })

  it('el pago del inquilino solo aparece cuando las dos firmas ya están', () => {
    const pago = base({ id: 'p', direccion: 'Apto. Escazú', monto: 800, estado: 'pendiente_pago', duenoEmail: 'dueno@ejemplo.cr', inquilinoEmail: U.email, contrato: { firmas: { dueno: 't', inquilino: 't' } } })
    const guardado = base({ id: 'g', monto: 600, estado: 'en_curso', pago: 't', duenoEmail: 'dueno@ejemplo.cr', inquilinoEmail: U.email, contrato: { firmas: { dueno: 't', inquilino: 't' } } })
    expect(puedePagar(pago, U.email)).toBe(true)
    expect(saldosDe([pago, guardado])).toMatchObject({ previsto: 1400, custodia: 600, porDepositar: 800 })
    expect(tareasPropias([pago, guardado], U.email).map(a => a.id)).toEqual(['p'])
    expect(copiaTarea(pago, U.email).boton).toBe('Revisar depósito')
    const sinFirmas = { ...pago, contrato: { firmas: { dueno: 't' } } }
    expect(puedePagar(sinFirmas, U.email)).toBe(false)
    expect(tareasPropias([sinFirmas], U.email)).toEqual([])
  })

  it('sin tarea propia no ofrece pago y deja la espera y el curso aparte', () => {
    const esperaFirma = base({ id: 'e', contrato: { firmas: { dueno: 't' } } })
    expect(tareasPropias([esperaFirma, curso], U.email)).toEqual([])
    expect(textoEspera(esperaFirma, U.email)).toBe('A la espera de la firma del inquilino.')
    expect(esperas([esperaFirma, curso], U.email).map(a => a.id)).toEqual(['e'])
    expect(textoEnCurso(enCursoSinTarea([esperaFirma, curso], U.email))).toBe('1 alquiler en curso, sin tarea para ti.')
  })

  it('sin alquileres los tres importes son cero y un cerrado o repetido no entra', () => {
    expect(saldosDe([])).toEqual({ previsto: 0, custodia: 0, porDepositar: 0, sinImporte: 0 })
    const cerrado = base({ id: 'c', monto: 500, estado: 'cerrado', pago: 't' })
    const repetido = { ...curso, monto: 800 }
    const sinMonto = base({ id: 's', monto: Number.NaN })
    expect(saldosDe([cerrado, curso, repetido, sinMonto])).toEqual({ previsto: 800, custodia: 800, porDepositar: 0, sinImporte: 1 })
  })
})

const montoDe = (h: string) => h.match(/class="casa-monto">([^<]*)</)?.[1]

describe('pantalla de inicio', () => {
  it('muestra el alquiler que toca continuar, con sus datos y sus enlaces', () => {
    bolsa.estado = 'listo'; bolsa.lista = [curso, firma]
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('Hola, Katherine')
    expect(h).toContain('Casa ejemplo · Heredia centro')
    expect(h).toContain('Dueño')
    expect(h).toContain('Firmas')
    expect(h).toContain('Paso 2 de 8')
    expect(montoDe(h)).toBe(usd(600))
    expect(montoDe(h)).not.toContain('\n')
    expect(h).not.toContain(usd(1400))
    expect(h).not.toContain('USD 1,400.00')
    expect(h).toContain('href="#/alquiler/a2"')
    expect(h).toContain('Continuar proceso')
    expect(h).toContain('href="#/alquileres"')
    expect(h).toContain('Ver todos')
    expect(h).toContain('href="#/crear"')
    expect(h).toContain('Nuevo alquiler')
    expect(h).toContain('data-recorrido="nuevo"')
    expect(h).toContain('href="#/ayuda"')
    expect(h).toContain('Cómo funciona')
    expect(h).toContain('class="casa-campana"')
    expect(h).toContain('href="#/avisos"')
    expect(h).toContain('aria-label="Avisos"')
    expect(h).not.toContain('Tus alquileres')
    expect(h).toContain('/img/katherine/02-edificio-moderno.png')
  })

  it('el inquilino sigue en la pantalla del alquiler cuyo depósito toca revisar', () => {
    const pago = base({ id: 'p', direccion: 'Apto. Escazú', monto: 800, estado: 'pendiente_pago', duenoEmail: 'dueno@ejemplo.cr', inquilinoEmail: U.email, contrato: { firmas: { dueno: 't', inquilino: 't' } }, inicio: '2026-11-01', fin: '2027-10-31' })
    const guardado = base({ id: 'g', monto: 600, estado: 'en_curso', pago: 't', duenoEmail: 'dueno@ejemplo.cr', inquilinoEmail: U.email, contrato: { firmas: { dueno: 't', inquilino: 't' } } })
    bolsa.estado = 'listo'; bolsa.lista = [pago, guardado]
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('Apto. Escazú')
    expect(h).toContain('Inquilino')
    expect(h).toContain('Paso 3 de 8')
    expect(h).toContain('Depósito')
    expect(montoDe(h)).toBe(usd(800))
    expect(h).toContain('href="#/alquiler/p"')
    expect(h).toContain('Continuar proceso')
    expect(h).not.toContain('href="#/pagar')
    expect(h).not.toContain('Tu firma está pendiente')
  })

  it('sin tarea propia abre el alquiler activo y no un pago', () => {
    const esperaFirma = base({ id: 'e', direccion: 'Casa en espera', contrato: { firmas: { dueno: 't' } } })
    bolsa.estado = 'listo'; bolsa.lista = [esperaFirma, curso]
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('Casa en espera')
    expect(h).toContain('href="#/alquiler/e"')
    expect(h).toContain('Continuar proceso')
    expect(h).not.toContain('Revisar depósito')
    expect(h).toContain('href="#/alquileres"')
    expect(h).toContain('href="#/crear"')
  })

  it('sin alquileres ofrece crear y cómo funciona, sin montos', () => {
    bolsa.estado = 'listo'; bolsa.lista = []
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('Sin alquileres aún')
    expect(h).toContain('Inicia tu primer alquiler y gestiona todo de forma segura.')
    expect(h).toContain('href="#/crear"')
    expect(h).toContain('Nuevo alquiler')
    expect(h).toContain('data-recorrido="nuevo"')
    expect(h).toContain('href="#/ayuda"')
    expect(h).toContain('Cómo funciona')
    expect(h).toContain('href="#/avisos"')
    expect(h).not.toContain('casa-monto')
    expect(h).not.toContain('Ver todos')
    expect(h).not.toContain('Ver mis alquileres')
  })

  it('la campana marca el aviso que todavía no se abrió', () => {
    const conAviso = base({ id: 'av', avisos: [{ id: '1', para: 'dueno', dia: 1, asunto: 'Plazo', texto: 't', entregado: '2026-10-01T00:00:00Z', entregadoReal: '2026-10-01T00:00:00Z' }] })
    bolsa.estado = 'listo'; bolsa.lista = [conAviso]
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('casa-campana__punto')
    expect(h).toContain('Hay avisos sin leer.')
    const leido = base({ id: 'av2', avisos: [{ id: '2', para: 'dueno', dia: 1, asunto: 'Plazo', texto: 't', entregado: '2026-10-02T00:00:00Z', entregadoReal: '2026-10-02T00:00:00Z', abierto: '2026-10-03T00:00:00Z' }] })
    bolsa.lista = [leido]
    expect(renderToStaticMarkup(<ResumenInicio u={U} />)).not.toContain('casa-campana__punto')
  })

  it('usa la foto real del lugar cuando no es de ejemplo', () => {
    const conFoto = base({ id: 'f', estado: 'en_curso', pago: 't', contrato: { firmas: { dueno: 't', inquilino: 't' } }, entrada: { cuartos: [{ nombre: 'Sala', nota: '', items: [], fotos: [{ src: 'foto-real.jpg', por: 'dueno', fecha: '2026-10-01', origen: 'camara' }] }], firmas: {} } })
    bolsa.estado = 'listo'; bolsa.lista = [conFoto]
    expect(renderToStaticMarkup(<ResumenInicio u={U} />)).toContain('src="foto-real.jpg"')
  })

  it('si la lista no cargó, no pinta ceros', () => {
    bolsa.estado = 'error'; bolsa.lista = []
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('No hay importes para mostrar')
    expect(h).toContain('Hola, Katherine')
    expect(h).not.toContain('casa-monto')
    expect(h).not.toContain('Importe previsto')
  })

  it('mientras carga no inventa un alquiler', () => {
    bolsa.estado = 'cargando'; bolsa.lista = []
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('Cargando tus alquileres…')
    expect(h).not.toContain('casa-monto')
    expect(h).not.toContain('Sin alquileres aún')
  })

  it('la barra marca Inicio en / y Alquileres en el listado y en un alquiler', () => {
    const inicio = renderToStaticMarkup(<Navegacion r="/" />)
    expect(inicio).toContain('href="#/" aria-current="page"')
    expect(inicio).toContain('href="#/alquileres"')
    expect(inicio).not.toContain('href="#/alquileres" aria-current="page"')
    const lista = renderToStaticMarkup(<Navegacion r="/alquileres" />)
    expect(lista).toContain('href="#/alquileres" aria-current="page"')
    const ficha = renderToStaticMarkup(<Navegacion r="/alquiler/a2" />)
    expect(ficha).toContain('href="#/alquileres" aria-current="page"')
    expect(ficha).not.toContain('href="#/" aria-current="page"')
  })
})
