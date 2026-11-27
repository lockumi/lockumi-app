// @vitest-environment happy-dom
// Comportamiento de la presentación, con el componente montado. No usa red, cámara ni un firmador externo.
import { describe, it, expect, vi, afterEach } from 'vitest'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Alquiler, Usuario } from '../../types'

vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('red'))))
vi.stubGlobal('scrollTo', () => {})
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}

const { Contrato, Detalle } = await import('../Detalle')
const { Crear } = await import('../Crear')
const { EsperaPago } = await import('../../EsperaPago')
const { acciones } = await import('../../acciones')
const { store, actaVacia } = await import('../../store')
const { hoyISO, sumarMeses } = await import('../../validacion')
const { abrirRecorrido, yaLoVio, PASOS_RECORRIDO } = await import('../../recorrido')
const { useRecorridoPrimeraVez } = await import('../Ejemplo')

const U = (email: string): Usuario => ({ email, nombre: 'K', metodo: 'correo' })
const base = (id: string, extra: Partial<Alquiler> = {}): Alquiler => ({
  id, direccion: 'Casa demo', monto: 450, moneda: 'USD', inicio: '2026-11-15', fin: '2027-11-14',
  reglas: ['Jardín a cargo del inquilino'], duenoEmail: 'k@ejemplo.cr', inquilinoEmail: 'i@ejemplo.cr',
  estado: 'firmas', rendimiento: false, historial: [], contrato: { firmas: {} }, entrada: actaVacia(), diasSimulados: 0,
  ...extra,
}) as Alquiler

const raices: Root[] = []
function montar(nodo: ReactNode) {
  const el = document.createElement('div')
  document.body.append(el)
  const root = createRoot(el)
  raices.push(root)
  act(() => { root.render(nodo) })
  return el
}
const click = (el: Element) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
const texto = (s: string) => document.body.textContent?.includes(s) ?? false

afterEach(async () => {
  document.querySelector('.recorrido__saltar')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await act(async () => { for (const r of raices) r.unmount() })
  raices.length = 0
  document.body.replaceChildren()
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('red'))))
})

describe('contrato: oculto, se abre y se vuelve a cerrar', () => {
  const a = base('ct-1', { contrato: { firmas: { inquilino: '2026-11-01T12:00:00.000Z' } } })
  it('empieza cerrado, muestra el texto al abrir y lo vuelve a ocultar sin perder la tarjeta ni la casilla', async () => {
    montar(<Contrato a={a} rol="dueno" />)
    const doc = document.getElementById('ct-firma')!
    expect(doc.hasAttribute('hidden')).toBe(true)
    expect(texto('Casa demo')).toBe(true)
    expect(texto('1 de 2')).toBe(true)
    expect(texto('Leí el contrato y estoy de acuerdo.')).toBe(true)
    const abrir = [...document.querySelectorAll('button')].find(b => b.textContent === 'Ver contrato completo')!
    await click(abrir)
    expect(doc.hasAttribute('hidden')).toBe(false)
    expect(doc.textContent).toContain('Jardín a cargo del inquilino')
    expect(doc.textContent).toContain('7 días para reclamos')
    const cerrar = [...document.querySelectorAll('button')].find(b => b.textContent === 'Ocultar contrato completo')!
    await click(cerrar)
    expect(doc.hasAttribute('hidden')).toBe(true)
    expect(texto('Casa demo')).toBe(true)
    expect(texto('Leí el contrato y estoy de acuerdo.')).toBe(true)
    expect(texto('Firma como dueño')).toBe(true)
  })
})

describe('firma: la casilla llama al callback local y no a la red', () => {
  it('sin la casilla no firma; con la casilla firma una vez en este navegador', async () => {
    const a = base('firma-1')
    store.crear({ direccion: a.direccion, monto: a.monto, inicio: a.inicio, fin: a.fin, reglas: a.reglas, duenoEmail: a.duenoEmail, inquilinoEmail: a.inquilinoEmail })
    const guardado = store.todos().find(x => x.direccion === 'Casa demo')!
    const prop = { ...guardado, id: guardado.id }
    const firmar = vi.spyOn(acciones, 'firmar')
    montar(<Contrato a={prop} rol="dueno" />)
    const boton = [...document.querySelectorAll('button')].find(b => b.textContent === 'Firma como dueño')!
    await click(boton)
    expect(texto('Marca la casilla para confirmar que estás de acuerdo.')).toBe(true)
    expect(firmar).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    const casilla = document.querySelector('input[type="checkbox"]') as HTMLInputElement
    await act(async () => { casilla.click() })
    await click(boton)
    expect(firmar).toHaveBeenCalledTimes(1)
    expect(firmar).toHaveBeenCalledWith(expect.objectContaining({ id: guardado.id }), 'contrato', 'dueno')
    expect(fetch).not.toHaveBeenCalled()
    expect(store.obtener(guardado.id)?.contrato.firmas.dueno).toBeTruthy()
    expect(store.obtener(guardado.id)?.estado).toBe('firmas')
  })
  it('dos toques seguidos no firman dos veces', async () => {
    let soltar: () => void = () => {}
    const firmar = vi.spyOn(acciones, 'firmar').mockImplementation(() => new Promise<void>(r => { soltar = r }))
    const a = base('firma-2')
    montar(<Contrato a={a} rol="dueno" />)
    const casilla = document.querySelector('input[type="checkbox"]') as HTMLInputElement
    await act(async () => { casilla.click() })
    const boton = [...document.querySelectorAll('button')].find(b => b.textContent === 'Firma como dueño')!
    await act(async () => {
      boton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      boton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(firmar).toHaveBeenCalledTimes(1)
    soltar()
    await act(async () => { await Promise.resolve() })
  })
})

describe('confirmación del depósito: solo si el pago ya existe', () => {
  const armar = (pago?: string) => {
    const n = store.crear({ direccion: 'Casa recién pagada', monto: 450, inicio: '2026-11-15', fin: '2027-11-14', reglas: ['No se permiten mascotas'], duenoEmail: 'k@ejemplo.cr', inquilinoEmail: 'i@ejemplo.cr' })
    store.cambiar(n.id, x => {
      x.estado = 'fotos_entrada'
      x.contrato.firmas = { dueno: '2026-11-01T12:00:00.000Z', inquilino: '2026-11-01T12:00:00.000Z' }
      if (pago) x.pago = pago
    })
    return n.id
  }
  it('sin pago va a la lista; con pago, Continuar abre la lista y no vuelve a cobrar', async () => {
    const pagar = vi.spyOn(acciones, 'pagar').mockRejectedValue(new Error('no cobrar'))
    const sinPago = armar()
    const el = montar(<Detalle id={sinPago} u={U('k@ejemplo.cr')} />)
    expect(el.textContent).toContain('espacios listos')
    expect(el.textContent).not.toContain('Depósito protegido')
    el.remove()
    const id = armar('2026-11-02T12:00:00.000Z')
    const antes = store.obtener(id)!.pago
    montar(<Detalle id={id} u={U('k@ejemplo.cr')} />)
    expect(texto('Depósito protegido')).toBe(true)
    expect(texto('Ahora: fotos de entrada')).toBe(true)
    expect(texto('Paso 4 de 8')).toBe(true)
    expect(document.querySelector('.anillo')).toBeNull()
    await click([...document.querySelectorAll('button')].find(b => b.textContent === 'Continuar')!)
    expect(texto('espacios listos')).toBe(true)
    expect(document.querySelector('h2')?.textContent).not.toBe('Depósito protegido')
    expect(pagar).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(store.obtener(id)?.estado).toBe('fotos_entrada')
    expect(store.obtener(id)?.pago).toBe(antes)
    expect(localStorage.getItem('lockumi.confirmacion-deposito.' + id)).toBe('1')
    await act(async () => { for (const r of raices) r.unmount(); raices.length = 0 })
    montar(<Detalle id={id} u={U('k@ejemplo.cr')} />)
    expect(texto('espacios listos')).toBe(true)
    expect(texto('Depósito protegido')).toBe(false)
    localStorage.removeItem('lockumi.confirmacion-deposito.' + id)
    await act(async () => { for (const r of raices) r.unmount(); raices.length = 0 })
    montar(<Detalle id={id} u={U('k@ejemplo.cr')} />)
    expect(texto('Depósito protegido')).toBe(true)
    expect(store.obtener(id)?.pago).toBe(antes)
  })
})

describe('reglas plegadas, borrador y un solo envío', () => {
  const u = U('k@ejemplo.cr')
  it('el pliegue cerrado conserva la regla y un envío vacío no crea', async () => {
    const crear = vi.spyOn(acciones, 'crear')
    montar(<Crear u={u} />)
    const detalles = document.querySelector('details[data-recorrido="reglas"]') as HTMLDetailsElement
    expect(detalles.open).toBe(false)
    expect(detalles.textContent).toContain('No se permiten mascotas')
    expect(document.querySelector('.na-pliegue__n')?.textContent).toBe('1')
    const formVacio = document.querySelector('form')!
    await act(async () => { formVacio.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    expect(crear).not.toHaveBeenCalled()
    expect(texto('Escribe la dirección o un nombre para el lugar.')).toBe(true)
    expect(document.querySelector('.espera-vista')).toBeNull()
    expect(detalles.open).toBe(false)
  })
  it('agregar una regla, fallar y recargar conserva el borrador; dos envíos llaman una vez', async () => {
    const hoy = hoyISO()
    sessionStorage.setItem('lockumi.borrador.crear', JSON.stringify({
      direccion: 'Apartamento 3B', monto: '800', email: 'inquilino@correo.com', inicio: hoy, fin: sumarMeses(hoy, 6), reglas: ['No se permiten mascotas'],
    }))
    let soltar: (v: never) => void = () => {}
    const crear = vi.spyOn(acciones, 'crear').mockImplementation(() => new Promise((_, r) => { soltar = r }))
    montar(<Crear u={u} />)
    const detalles = document.querySelector('details[data-recorrido="reglas"]') as HTMLDetailsElement
    detalles.querySelector('summary')!.click()
    expect(detalles.open).toBe(true)
    const campo = document.querySelector('input[aria-label="Nueva regla"]') as HTMLInputElement
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(campo, 'No fumar')
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click(document.querySelector('button[aria-label="Agregar regla"]')!)
    expect(document.querySelector('.na-pliegue__n')?.textContent).toBe('2')
    detalles.open = false
    const form = document.querySelector('form')!
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(crear).toHaveBeenCalledTimes(1)
    expect(crear.mock.calls[0][0].reglas).toEqual(['No se permiten mascotas', 'No fumar'])
    expect(document.querySelector('.espera-vista')?.textContent).toContain('Creando…')
    expect(document.querySelector('form')?.hasAttribute('hidden')).toBe(true)
    soltar(new Error('No pudimos crear el alquiler. Intenta de nuevo.') as never)
    await act(async () => { await Promise.resolve() })
    expect(texto('No pudimos crear el alquiler. Intenta de nuevo.')).toBe(true)
    expect(document.querySelector('form')?.hasAttribute('hidden')).toBe(false)
    const borrador = JSON.parse(sessionStorage.getItem('lockumi.borrador.crear')!)
    expect(borrador.direccion).toBe('Apartamento 3B')
    expect(borrador.reglas).toEqual(['No se permiten mascotas', 'No fumar'])
    await act(async () => { for (const r of raices) r.unmount(); raices.length = 0 })
    montar(<Crear u={u} />)
    expect((document.getElementById('f-direccion') as HTMLInputElement).value).toBe('Apartamento 3B')
    expect(document.querySelector('.na-pliegue__n')?.textContent).toBe('2')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('espera de pago: el botón de carga no vuelve a cobrar', () => {
  it('en reposo llama una vez; mientras guarda, el botón no tiene acción', async () => {
    const onPagar = vi.fn()
    montar(<EsperaPago etapa={0} etiqueta="Pagar USD 800,00" onPagar={onPagar} />)
    await click(document.querySelector('button')!)
    expect(onPagar).toHaveBeenCalledTimes(1)
    await act(async () => { for (const r of raices) r.unmount(); raices.length = 0 })
    montar(<EsperaPago etapa={1} etiqueta="Pagar USD 800,00" onPagar={onPagar} />)
    expect(document.querySelector('[aria-busy="true"]')?.textContent).toContain('Guardando tu depósito…')
    await click(document.querySelector('button')!)
    expect(onPagar).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('recorrido: primera vez, repetir, adelante, atrás y saltar', () => {
  function escena() {
    document.body.insertAdjacentHTML('beforeend', `
      <button type="button" data-recorrido="nuevo">Nuevo</button>
      <section data-recorrido="datos">Datos</section>
      <details data-recorrido="reglas"><summary>Reglas</summary></details>
      <ul data-recorrido="fotos"><li>Sala</li></ul>
      <div class="detalle__principal"><div class="tarjeta">Depósito</div></div>
      <section data-recorrido="pasos"><h3>Los pasos</h3></section>`)
  }
  function Primera({ u, ruta }: { u: Usuario | null; ruta: string }) {
    useRecorridoPrimeraVez(u, ruta)
    return null
  }
  it('la primera visita lo abre, saltar lo marca visto y se puede volver a abrir', async () => {
    escena()
    location.hash = '#/'
    const u = U('primera@ejemplo.cr')
    expect(await yaLoVio(u)).toBe(false)
    montar(<Primera u={u} ruta="/" />)
    await vi.waitFor(() => expect(document.querySelector('.driver-popover')).toBeTruthy(), { timeout: 4000 })
    expect(document.body.textContent).toContain('Paso 1 de 6')
    expect(PASOS_RECORRIDO).toHaveLength(6)
    await click(document.querySelector('.driver-popover-next-btn')!)
    await vi.waitFor(() => expect(document.body.textContent).toContain('Paso 2 de 6'))
    await click(document.querySelector('.driver-popover-prev-btn')!)
    await vi.waitFor(() => expect(document.body.textContent).toContain('Paso 1 de 6'))
    await click(document.querySelector('.recorrido__saltar')!)
    await vi.waitFor(() => expect(document.querySelector('.driver-popover')).toBeNull())
    expect(await yaLoVio(u)).toBe(true)
    montar(<Primera u={u} ruta="/" />)
    await new Promise(r => setTimeout(r, 900))
    expect(document.querySelector('.driver-popover')).toBeNull()
    abrirRecorrido(u)
    await vi.waitFor(() => expect(document.querySelector('.driver-popover')).toBeTruthy(), { timeout: 4000 })
    expect(fetch).not.toHaveBeenCalled()
  })
})
