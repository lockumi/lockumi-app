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

describe('pantalla de inicio', () => {
  it('muestra la firma, el enlace al contrato y no el listado', () => {
    bolsa.estado = 'listo'; bolsa.lista = [curso, firma]
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('Inicio')
    expect(h).toContain(usd(1400))
    expect(h).toContain(usd(800))
    expect(h).toContain(usd(600))
    expect(h).not.toContain('USD 1,400.00')
    expect(h).toContain('Importe previsto')
    expect(h).toContain('En custodia')
    expect(h).toContain('Por depositar')
    expect(h).toContain('Lo pendiente aún no está en custodia.')
    expect(h).toContain('Tu firma está pendiente')
    expect(h).toContain('Heredia centro')
    expect(h).toContain('href="#/alquiler/a2"')
    expect(h).toContain('Ver contrato y firmar')
    expect(h).toContain('href="#/alquileres"')
    expect(h).not.toContain('Tus alquileres')
  })

  it('el inquilino revisa el depósito en la pantalla del alquiler', () => {
    const pago = base({ id: 'p', direccion: 'Apto. Escazú', monto: 800, estado: 'pendiente_pago', duenoEmail: 'dueno@ejemplo.cr', inquilinoEmail: U.email, contrato: { firmas: { dueno: 't', inquilino: 't' } } })
    const guardado = base({ id: 'g', monto: 600, estado: 'en_curso', pago: 't', duenoEmail: 'dueno@ejemplo.cr', inquilinoEmail: U.email, contrato: { firmas: { dueno: 't', inquilino: 't' } } })
    bolsa.estado = 'listo'; bolsa.lista = [pago, guardado]
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('El depósito está pendiente')
    expect(h).toContain('Revisar depósito')
    expect(h).toContain('href="#/alquiler/p"')
    expect(h).toContain(usd(600))
    expect(h).not.toContain('Tu firma está pendiente')
  })

  it('sin tarea propia muestra la espera y no un botón de pago', () => {
    const esperaFirma = base({ id: 'e', contrato: { firmas: { dueno: 't' } } })
    bolsa.estado = 'listo'; bolsa.lista = [esperaFirma, curso]
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('Estás al día')
    expect(h).toContain('Sin tareas')
    expect(h).toContain('A la espera de la firma del inquilino.')
    expect(h).toContain('1 alquiler en curso, sin tarea para ti.')
    expect(h).not.toContain('Revisar depósito')
    expect(h).toContain('href="#/alquileres"')
  })

  it('sin alquileres ofrece crear con el formulario que ya existe', () => {
    bolsa.estado = 'listo'; bolsa.lista = []
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('Todavía sin alquileres')
    expect(h).toContain('href="#/crear"')
    expect(h).toContain('Crear alquiler')
    expect(h).toContain('El listado estará en Alquileres.')
    expect(h).not.toContain('Ver mis alquileres')
  })

  it('si la lista no cargó, no pinta ceros', () => {
    bolsa.estado = 'error'; bolsa.lista = []
    const h = renderToStaticMarkup(<ResumenInicio u={U} />)
    expect(h).toContain('No hay importes para mostrar')
    expect(h).not.toContain('Importe previsto')
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
