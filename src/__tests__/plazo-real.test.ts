// LEGAL: revisado (24/10) · ronda 5: el plazo que se muestra es el real del alquiler ({plazo}), no «7 días» fijo.
import { describe, it, expect } from 'vitest'
import { turno, ahoraPrueba, textoPlazo } from '../flujo'
import { textoPlazo as desdeAcciones } from '../acciones'

const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')
const detalle = leer('../screens/Detalle.tsx'), crear = leer('../screens/Crear.tsx'), terminos = leer('../legal/terminos.md'), contrato = leer('../screens/ContratoDoc.tsx')
const alq = (estado: string, ventanaSegundos?: number) => ({ estado, ventanaSegundos, contrato: { firmas: {} }, entrada: { firmas: {} }, salida: { firmas: {} } }) as never

describe('Plazo real en la app', () => {
  it('textoPlazo sigue disponible desde acciones (mismo valor que el encabezado)', () => {
    expect(desdeAcciones({ ventanaSegundos: 300 })).toBe('5 minutos'); expect(textoPlazo({})).toBe('7 días')
  })
  it('«Te toca / Qué sigue» usa el plazo configurado', () => {
    expect(turno(alq('ventana_reclamo', 300), 'dueno').sigue).toBe('Si no reclamas, después de 5 minutos el depósito se devuelve al inquilino.')
    expect(turno(alq('ventana_reclamo', 300), 'inquilino').sigue).toBe('Si no hay reclamo, después de 5 minutos se te devuelve el depósito.')
    expect(turno(alq('salida', 300), 'dueno').sigue).toBe('Después hay 5 minutos para reclamos. Si no hay reclamo, después de ese plazo el depósito se devuelve al inquilino.')
    expect(ahoraPrueba(alq('ventana_reclamo', 300))).toMatch(/^Ahora: corren los 5 minutos para reclamos\./)
    expect(turno(alq('ventana_reclamo'), 'inquilino').sigue).toContain('después de 7 días')
  })
  it('Detalle: sin «7 días» fijo, sin «a. m..», etiquetas de prueba correctas', () => {
    expect(detalle).not.toMatch(/7 días/)
    // LEGAL: revisado (24/10) · ronda 6: nota de producción con «después de {plazo}»
    expect(detalle).toContain('Si no hay reclamo, después de {textoPlazo(a)} el depósito de prueba se devuelve completo al inquilino la próxima vez que alguien abra el alquiler. Ninguna de las partes tiene que aprobarlo: lo ejecuta la cuenta de Lockumi.')
    expect(detalle).not.toMatch(/\{fechaHora\(fin\)\}\./)
    expect(detalle).toContain('después de {textoPlazo(a)} el depósito se devuelve completo al inquilino. En esta demo local no hay red: es solo una simulación.')
    expect(detalle).toContain('<h2>Reclamo del dueño</h2>{modoPrueba && <Simulado texto="Mediación simulada" />}')
    // LEGAL: revisado (24/10) · ronda 8: en el ejemplo (modoSolo) el reclamo es simulado
    expect(detalle).toContain('¿Encontraste un daño? Puedes reclamar. <Simulado /> En este ejemplo, el reclamo y la mediación son simulados: no se registran en la red de prueba ni bloquean ningún depósito.</p>')
    expect(detalle).toContain('{modoSolo && <p className="nota">En este ejemplo, el reclamo es simulado: no se registra en la red de prueba ni bloquea ningún depósito. La mediación también es simulada.</p>}')
    expect(detalle).not.toContain('<Simulado texto="Red de prueba" />')
    expect(detalle).not.toContain('El reclamo abre una disputa en la red de prueba')
    expect(detalle).not.toContain('El reclamo se registra en la red de prueba y bloquea')
  })
  it('Contrato y Términos 6.5 siguen con 7 días fijos y dicen «después de…»', () => {
    expect(contrato).toContain('Si no reclama, después de 7 días el depósito se devuelve completo al inquilino.')
    expect(terminos).toContain('Si no reclama, después de ese plazo se libera todo al inquilino.')
    expect(terminos).toContain('**Versión 1.6-demo · 24 de octubre de 2026**')
  })
  // LEGAL: revisado (24/10) · ronda 7: quién firma, en las hojas de Crear y en la aprobación (modo de dos personas)
  it('Crear y Detalle: textos de Legal sobre firmas y reclamo registrado', () => {
    expect(crear).toContain('<p>Tú eres el <strong>inquilino</strong>. Si usas tu propia billetera, depositas con ella; si no, Lockumi firma el depósito por ti con una cuenta de prueba, en la red de prueba.')
    expect(crear).toContain('La mediación es simulada. El reclamo lo haces tú con un botón, en nombre del dueño de prueba, y queda registrado en la red de prueba.</p>')
    expect(crear).not.toContain('y depositas con tu billetera')
    // LEGAL: revisado (24/10) · ronda 8
    expect(detalle).toContain('Si todo está bien, aprueba ahora la devolución. Tu billetera te pedirá confirmar esta aprobación. La liberación del depósito la firma la cuenta de Lockumi.')
    expect(detalle).not.toContain('La aprobación y la liberación las firma')
    expect(crear).toContain('Lockumi firma y confirma por el dueño de prueba: tú tocas el botón en su nombre. El reclamo y la persona mediadora son simulados y no se registran en la red de prueba.</p>')
    expect(crear).not.toContain('el mediador son simulados')
  })
})
