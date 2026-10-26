// Eliminar un alquiler (prueba/eliminar.ts) borra su link de invitación guardado en este aparato (Legal: borrado real).
import { it, expect, vi } from 'vitest'
vi.hoisted(() => { const mem = new Map<string, string>(); (globalThis as Record<string, unknown>).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } } })
import { olvidarInvitacion } from '../repositorio'

it('quita solo el link de ese alquiler', () => {
  localStorage.setItem('lockumi.invitaciones', JSON.stringify({ a: 'tok-a', b: 'tok-b' }))
  olvidarInvitacion('a')
  expect(JSON.parse(localStorage.getItem('lockumi.invitaciones')!)).toEqual({ b: 'tok-b' })
  olvidarInvitacion('no-existe'); expect(JSON.parse(localStorage.getItem('lockumi.invitaciones')!)).toEqual({ b: 'tok-b' })
})
