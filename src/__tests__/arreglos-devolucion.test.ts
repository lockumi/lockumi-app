// OK de Katherine «Apruebo a, b y c» (26/10/2026, 2:28 a. m.): contador del plazo, error de la devolución y «Reloj de la demo adelantado».
import { describe, it, expect, beforeAll } from 'vitest'
import { FIN_CONTADOR_AUTO, FIN_CONTADOR_SIN_CORRIDA, TEXTO_PLAZO_DEVOLUCION, TEXTO_PLAZO_DEVOLUCION_SIN_CORRIDA, TEXTO_DEVOLUCION_FALLO, TEXTO_DEVOLUCION_DUDA, textoErrorDevolucion } from '../ui'
import { TEXTO_REVISAR_PAGO } from '../../api/_lib/tw'
import { ERROR_RED } from '../alertas'
let detalle = ''
beforeAll(async () => { const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }; detalle = fs.readFileSync('src/screens/Detalle.tsx', 'utf8') })
describe('arreglos del alquiler (a, b, c)', () => {
  it('(a) el contador termina igual que el «Plazo de devolución» y nunca dice «se devuelve completo»', () => {
    expect(TEXTO_PLAZO_DEVOLUCION.endsWith(FIN_CONTADOR_AUTO.replace('Si no hay reclamo, ', ''))).toBe(true)
    expect(TEXTO_PLAZO_DEVOLUCION_SIN_CORRIDA.endsWith(FIN_CONTADOR_SIN_CORRIDA.replace('Si no hay reclamo, ', ''))).toBe(true)
    expect(detalle).toContain('{auto ? FIN_CONTADOR_AUTO : FIN_CONTADOR_SIN_CORRIDA}'); expect(detalle).not.toContain('se devuelve completo')
  })
  it('(b) envío fallido sin transacción → texto de Legal; estado dudoso → el texto de api/_lib/tw.ts', () => {
    expect(TEXTO_DEVOLUCION_DUDA).toBe(TEXTO_REVISAR_PAGO)
    for (const m of ['Un texto para la cadena contiene datos personales; no se despliega.', 'La red de prueba rechazó la transacción.', 'Primero el dueño tiene que aprobar la devolución.']) expect(textoErrorDevolucion(m), m).toBe(TEXTO_DEVOLUCION_FALLO)
    for (const m of [ERROR_RED, TEXTO_REVISAR_PAGO, 'Error inesperado del servidor. Intenta de nuevo en un minuto.', 'Request timed out', 'Failed to fetch']) expect(textoErrorDevolucion(m), m).toBe(TEXTO_DEVOLUCION_DUDA)
  })
  it('(c) «Reloj de la demo adelantado» junto al contador, solo con el reloj adelantado', () => {
    expect(detalle).toContain('{a.diasSimulados > 0 && <span className="reloj-adelantado">{RELOJ_ADELANTADO}</span>}')
  })
})

// 26/10 (2:32 a. m.): el «Recorrido de primera vez» se trababa en el paso 2: «Nombre visible y cantón» tapaba el formulario de #/crear.
describe('Recorrido de primera vez: «Nombre visible y cantón» no tapa #/crear mientras dura', () => {
  it('Pantallas aparta Datos durante el recorrido y recorrido.ts avisa cuándo empieza y termina', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const pan = fs.readFileSync('src/reputacion/Pantallas.tsx', 'utf8'), rec = fs.readFileSync('src/recorrido.ts', 'utf8')
    expect(pan).toMatch(/useSyncExternalStore\(suscribirRecorrido, recorridoEnCurso/); expect(pan).toContain('(esNuevo(r) && !enRecorrido)')
    expect(rec).toContain('activo = d; ponerEnCurso(true)'); expect(rec).toContain('activo = null; ponerEnCurso(false)')
  })
  it('recorridoEnCurso empieza en falso', async () => {
    const { recorridoEnCurso, suscribirRecorrido } = await import('../recorrido')
    expect(recorridoEnCurso()).toBe(false); const quitar = suscribirRecorrido(() => {}); quitar()
  })
})
