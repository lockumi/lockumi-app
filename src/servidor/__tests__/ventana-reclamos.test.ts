// Plazo de reclamos al crear: 7 días reales (604800 s). La ventana corta de pruebas (p. ej. 300 s) solo existe con VITE_PRUEBA_COMPLETA=1,
// con VITE_VENTANA_SEGUNDOS y fuera del build de producción de Vercel (VERCEL_ENV=production). Mínimo 60 s.
import { describe, it, expect } from 'vitest'
import { calcularVentana, PLAZO_REAL_SEGUNDOS } from '../config'

const SIETE_DIAS = 7 * 24 * 60 * 60
describe('calcularVentana', () => {
  it('el plazo real son 7 días', () => expect(PLAZO_REAL_SEGUNDOS).toBe(SIETE_DIAS))
  it('sin VITE_PRUEBA_COMPLETA: 7 días aunque haya VITE_VENTANA_SEGUNDOS', () => {
    expect(calcularVentana({})).toBe(SIETE_DIAS)
    expect(calcularVentana({ VITE_VENTANA_SEGUNDOS: '300' })).toBe(SIETE_DIAS)
    expect(calcularVentana({ VITE_VENTANA_SEGUNDOS: '300', VITE_PRUEBA_COMPLETA: '0' })).toBe(SIETE_DIAS)
  })
  it('con VITE_PRUEBA_COMPLETA=1 y sin VITE_VENTANA_SEGUNDOS: 7 días (el env de Production de hoy)', () => {
    expect(calcularVentana({ VITE_PRUEBA_COMPLETA: '1' })).toBe(SIETE_DIAS)
    expect(calcularVentana({ VITE_PRUEBA_COMPLETA: '1', VITE_VENTANA_SEGUNDOS: '' })).toBe(SIETE_DIAS)
  })
  it('con VITE_PRUEBA_COMPLETA=1: 300 s en pruebas', () => {
    expect(calcularVentana({ VITE_PRUEBA_COMPLETA: '1', VITE_VENTANA_SEGUNDOS: '300' })).toBe(300)
    expect(calcularVentana({ VITE_PRUEBA_COMPLETA: '1', VITE_VENTANA_SEGUNDOS: '300' }, 'preview')).toBe(300)
  })
  it('en el build de producción de Vercel: siempre 7 días, aunque alguien ponga 300', () => {
    expect(calcularVentana({ VITE_PRUEBA_COMPLETA: '1', VITE_VENTANA_SEGUNDOS: '300' }, 'production')).toBe(SIETE_DIAS)
  })
  it('límites: mínimo 60 s, máximo 7 días, basura = 7 días', () => {
    expect(calcularVentana({ VITE_PRUEBA_COMPLETA: '1', VITE_VENTANA_SEGUNDOS: '5' })).toBe(60)
    expect(calcularVentana({ VITE_PRUEBA_COMPLETA: '1', VITE_VENTANA_SEGUNDOS: '9999999' })).toBe(SIETE_DIAS)
    expect(calcularVentana({ VITE_PRUEBA_COMPLETA: '1', VITE_VENTANA_SEGUNDOS: 'abc' })).toBe(SIETE_DIAS)
  })
})
