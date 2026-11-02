// Matriz de caminos (27/10/2026) · (b) cuando una persona cambia el acta, el servidor borra las firmas de esa etapa (lk_editar_item / lk_registrar_foto,
// src/servidor/__tests__/ciclo-dos-personas-sql.test.ts). Aquí, la pantalla: a quien se le borró la firma le vuelve el botón «Confirmar como …»
// (no queda trabado), a la otra persona le sigue «Firmaste» y quien edita ve el aviso de que los dos tienen que volver a confirmar.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler, Cuarto } from '../../types'
import { Firma, CuartoEditor } from '../Acta'

const cuarto = (nombre: string): Cuarto => ({ nombre, nota: '', fotos: [{ src: 'f.jpg', por: 'dueno', fecha: '2026-10-27T16:00:00.000Z' }], items: [{ texto: 'Piso', estado: 'bien' }, { texto: 'Paredes', estado: 'bien' }] }) as Cuarto
const alq = (firmas: Alquiler['entrada']['firmas']): Alquiler => ({ id: 'u1', direccion: 'Casa', monto: 10, moneda: 'USDC', inicio: '2026-10-27', fin: '2026-12-27', reglas: [], duenoEmail: 'd@x.com', inquilinoEmail: 'i@x.com',
  estado: 'fotos_entrada', rendimiento: false, historial: [], contrato: { firmas: { dueno: 'x', inquilino: 'x' } }, entrada: { cuartos: [cuarto('Sala'), cuarto('Cocina')], firmas }, diasSimulados: 0 }) as Alquiler
const plano = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ')
const firma = (a: Alquiler, rol: 'dueno' | 'inquilino') => renderToStaticMarkup(<Firma a={a} que="entrada" rol={rol} titulo="Confirmar fotos de entrada" texto="Confirma." casilla="Estoy de acuerdo" />)

describe('(b) acta de entrada tras un cambio: nadie queda trabado', () => {
  it('con las firmas borradas, cada persona ve su botón «Confirmar como …» y «Te toca firmar»', () => {
    const a = alq({})
    expect(plano(firma(a, 'inquilino'))).toContain('Confirmar como inquilino'); expect(plano(firma(a, 'inquilino'))).toContain('Te toca firmar')
    expect(plano(firma(a, 'dueno'))).toContain('Confirmar como dueño')
  })
  it('si solo la firma del dueño sobrevive, el inquilino ve el botón y «Falta» en su fila; el dueño ve «Firmaste ✓ · Esperando la firma del inquilino» y ningún botón', () => {
    const a = alq({ dueno: '2026-10-27T16:19:25.000Z' })
    const i = plano(firma(a, 'inquilino')), d = plano(firma(a, 'dueno'))
    expect(i).toContain('Confirmar como inquilino'); expect(i).toContain('Firmó'); expect(i).toContain('Falta')
    expect(d).toContain('Firmaste ✓ · Esperando la firma del inquilino'); expect(d).not.toContain('Confirmar como')
  })
  it('quien edita el acta con firmas guardadas ve «Si cambias algo, los dos tienen que volver a confirmar.»; sin firmas, no', () => {
    const editor = (a: Alquiler) => plano(renderToStaticMarkup(<CuartoEditor a={a} cual="entrada" idx={0} rol="dueno" />))
    expect(editor(alq({ inquilino: '2026-10-27T16:18:59.000Z' }))).toContain('Si cambias algo, los dos tienen que volver a confirmar.')
    expect(editor(alq({}))).not.toContain('volver a confirmar')
  })
})
