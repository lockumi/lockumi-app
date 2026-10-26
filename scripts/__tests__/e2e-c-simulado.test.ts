// Escenario C · el E2E de dos cuentas (scripts/e2e-c.mjs) en modo --simulado: todas las migraciones en PGlite, el /api/tw de verdad
// (api/_lib/tw.ts) y Trustless Work falso. Es el ensayo sin llaves de correr-c.sh; aquí mantiene verde el recorrido completo.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('E2E del escenario C (simulado, sin llaves)', () => {
  it('recorre los cinco alquileres, envía todos los correos de C y deja la capa para las capturas', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-c-'))
    const salida = execFileSync('node', ['scripts/e2e-c.mjs', '--simulado', '--salida', dir], { encoding: 'utf8', timeout: 120_000, env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: '', TRUSTLESS_WORK_API_KEY: '' } })
    const e = JSON.parse(readFileSync(join(dir, 'estado.json'), 'utf8'))
    expect(e.fallas).toEqual([]); expect(e.omitidos).toEqual([])
    const pasos = e.pasos.map((p: { alquiler: string; paso: string }) => `${p.alquiler}: ${p.paso}`)
    for (const t of ['aprobada: el dueño aprueba la devolución', 'aprobada: devolución del 100 % al inquilino al aprobar (liberación)', 'aprobada: después de aprobar, el servidor no deja reclamar',
      'silencio-dueno: plazo vencido sin cron: el servidor rechaza el reclamo', 'silencio-dueno: la cuenta que resuelve disputas devuelve el 100 % al inquilino', 'mediacion: el inquilino ve lo que aceptó el dueño',
      'mediacion: con una sola aceptación la persona mediadora no puede cerrar', 'mediacion: un segundo «repartir» no paga dos veces (mismo hash)',
      'silencio-inquilino: el inquilino no respondió: pasa a la mediación (regla no disponible en esta versión, 6.5.1 d), sin pago'])
      expect(pasos).toContain(t)
    expect(e.pasos.every((p: { enlace: string | null }) => p.enlace === null)).toBe(true)   // hashes simulados: nunca como enlaces
    const capa = JSON.parse(readFileSync(join(dir, 'capa-capturas.json'), 'utf8'))
    expect(capa.cerrado.contrato.resultado).toMatchObject({ via: 'mediacion', cierre: 'dos_aceptan' })
    expect(capa.auto.contrato.resultado).toMatchObject({ via: 'automatico', dueno: 0 })
    expect(capa.mediacion.aceptaciones).toHaveLength(1)
    // Correos (VITE_CORREOS=1): la invitación de cada caso sale por el mismo atenderCorreo de /api/correo, solo al buzón de prueba
    const inv = e.correos.enviados.filter((c: { tipo: string }) => c.tipo === 'invitacion')
    expect(inv.map((c: { caso: string }) => c.caso).sort()).toEqual(['aprobada', 'cron-auto', 'cron-doble', 'cron-liberar', 'mediacion', 'recordatorios', 'silencio-dueno', 'silencio-inquilino'])
    for (const c of inv) { expect(c.para).toBe(`lockumi+e2ec-${c.caso}-inquilino@mail.grokbot.com`); expect(c.asunto).toBe('Te invitaron a un alquiler de ejemplo en la demo de Lockumi') }
    expect(pasos).toContain('aprobada: un segundo correo de invitación se rechaza (un solo correo por alquiler)')
    expect(e.correos.enviados.every((c: { para: string }) => /^lockumi\+e2ec-[a-z-]+@mail\.grokbot\.com$/.test(c.para))).toBe(true)
    // Correos del servidor (docs/correos-c.md): todas las plantillas de C salen al menos una vez, solo al buzón de prueba
    const { TEXTOS } = await import('../../api/_lib/textos-correos.ts')
    const plantillas = new Set(e.correos.servidor.map((c: { plantilla: string }) => c.plantilla))
    expect([...plantillas].sort()).toEqual(Object.keys(TEXTOS).sort())
    expect(e.correos.servidor.every((c: { para: string }) => /^lockumi\+e2ec-[a-z-]+@mail\.grokbot\.com$/.test(c.para))).toBe(true)
    expect(pasos).toContain('cuenta: el mismo pedido no envía COR-C-08 dos veces')
    // Paso 22: la corrida diaria paga sola, una sola vez, aunque la app pague a la vez
    for (const t of [
      'cron-auto: la corrida diaria cierra el caso (lk_vencimientos) y devuelve el 100 % al inquilino en la red (disputa + resolución)',
      'cron-liberar: la corrida diaria libera el 100 % con release-funds (la aprobación del dueño ya estaba en la cadena)',
      'cron-doble: la app y la corrida pagan a la vez: se paga UNA sola vez (la app vio el pago en curso)',
      'cron-auto: otra corrida (o un reintento) no paga nada: no quedan devoluciones pendientes',
      'cron-auto: la app abre el alquiler después: ve el pago ya hecho (mismo hash), sin pagar otra vez',
      'cron-auto: Trustless Work: el escrow quedó resuelto y con saldo 0',
      'cron-liberar: Trustless Work: el escrow quedó liberado y con saldo 0',
      'cron-auto: la misma corrida manda COR-C-07 a las dos partes (lockumi+e2ec-cron-auto-dueno@mail.grokbot.com, lockumi+e2ec-cron-auto-inquilino@mail.grokbot.com)',
    ]) expect(pasos).toContain(t)

    expect(salida).not.toMatch(/S[A-Z2-7]{55}/)   // ninguna llave secreta de Stellar en la salida
  }, 130_000)
})
