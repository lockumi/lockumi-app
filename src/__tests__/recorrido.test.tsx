// Recorrido guiado (src/recorrido.ts, driver.js). Textos exactos de diseno/envio/recorrido-formulario/textos.md (LEGAL: revisado el 23/10).
import { describe, it, expect } from 'vitest'
import { PASOS_RECORRIDO, claveRecorrido, alquilerEjemplo, RUTA_EJEMPLO, VERSION_RECORRIDO } from '../recorrido'

const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')
const css = leer('../index.css'), ui = leer('../ui.tsx'), inicio = leer('../screens/Inicio.tsx'), crear = leer('../screens/Crear.tsx'), detalle = leer('../screens/Detalle.tsx'), rec = leer('../recorrido.ts'), pkg = JSON.parse(leer('../../package.json'))

describe('recorrido: textos aprobados', () => {
  it('6 pasos con los títulos de la maqueta, en orden', () => {
    expect(PASOS_RECORRIDO.map(p => p.titulo)).toEqual(['Te damos la bienvenida a Lockumi', 'Los datos del alquiler', 'Las reglas del dueño', 'Fotos y lista de entrada', 'Firmas y depósito', 'La devolución'])
  })
  it('paso 5 «Firmas y depósito» y paso 6 con la mediación como simulación (correcciones de Legal)', () => {
    expect(PASOS_RECORRIDO[4].texto).toBe('Los dos firman el contrato. Después el inquilino paga el depósito y queda guardado. Ni el dueño ni el inquilino lo pueden sacar solos. Al entregar el lugar, hay 7 días para hacer un reclamo.')
    expect(PASOS_RECORRIDO[5].texto).toBe('Si no hay reclamos en 7 días, el depósito se puede devolver al inquilino. Si hay un reclamo, buscamos que una persona mediadora les ayude a llegar a un acuerdo. En esta prueba, la mediación es una simulación.')
  })
  it('sin promesas ni palabras que Legal quitó', () => {
    const todo = PASOS_RECORRIDO.map(p => p.titulo + ' ' + p.texto).join(' ')
    expect(todo).not.toMatch(/garantiz|100 ?%|protegid|dos veces|decide/i)
  })
  it('cada paso tiene su lugar (Inicio, Crear o el ejemplo) y el elemento existe en la pantalla', () => {
    expect(PASOS_RECORRIDO.map(p => p.ruta)).toEqual(['/', '/crear', '/crear', RUTA_EJEMPLO, RUTA_EJEMPLO, RUTA_EJEMPLO])
    expect(inicio).toContain('data-recorrido="nuevo"'); expect(crear).toContain('data-recorrido="datos"'); expect(crear).toContain('data-recorrido="reglas"'); expect(detalle).toContain('data-recorrido="pasos"')
  })
})

describe('recorrido: primera vez y volver a verlo', () => {
  it('la clave es sha256 corto del correo, sin el correo en claro, versión v1', async () => {
    const k = await claveRecorrido({ email: 'Demo@Lockumi.com ' })
    expect(k).toMatch(/^lockumi\.recorrido\.v1\.[0-9a-f]{16}$/); expect(k).not.toContain('demo'); expect(VERSION_RECORRIDO).toBe('v1')
    expect(await claveRecorrido({ email: 'demo@lockumi.com' })).toBe(k)
  })
  it('se marca como visto al terminar, al saltar y con Esc', () => {
    expect(rec).toMatch(/const cerrar = \(\) => \{ void marcarVisto\(u\)/); expect(rec).toMatch(/onDestroyStarted: \(\) => \{ void marcarVisto\(u\)/)
    expect(rec).toContain("saltar.textContent = 'Saltar'"); expect(rec).toContain("'¡Listo!'"); expect(rec).toContain("prevBtnText: 'Atrás'")
  })
  it('«¿Cómo funciona?» en la cabecera (solo el ícono en el teléfono, con aria-label) y «Ver el recorrido» en Inicio', () => {
    expect(ui).toContain('aria-label="¿Cómo funciona?"'); expect(ui).toContain('abrirRecorrido(u')
    expect(inicio).toContain('¿Primera vez?'); expect(inicio).toContain('Mira cómo funciona en 1 minuto.'); expect(inicio).toContain('Ver el recorrido')
  })
})

describe('recorrido: accesibilidad y estilo', () => {
  it('globo con nombre y descripción, foco en Siguiente, foco de vuelta a quien lo abrió', () => {
    expect(rec).toContain("aria-labelledby', 'recorrido-t'"); expect(rec).toContain("aria-describedby', 'recorrido-d'"); expect(rec).toContain('pop.nextButton.focus(')
    expect(rec).toMatch(/quien\.focus\(/); expect(rec).toContain('allowKeyboardControl: true')
  })
  it('reducir movimiento: sin animación ni desplazamiento suave; fundido de 120 ms', () => {
    expect(rec).toContain('animate: !reducir(), smoothScroll: !reducir()')
    expect(css).toMatch(/prefers-reduced-motion:reduce\)\{\.driver-popover\.recorrido\{animation:aviso-fade 120ms/)
  })
  it('velo café al 55 %, globo crema, botones de 44 px, sin colores hex nuevos', () => {
    expect(rec).toContain("overlayColor: 'rgb(61, 42, 34)', overlayOpacity: 0.55")
    const b = css.slice(css.indexOf('/* Recorrido guiado (driver.js)'), css.indexOf('/* ── Estado de espera v2 del pago')); expect(b).toContain('background:var(--fondo)'); expect(b).toContain('min-height:44px'); expect(b).not.toMatch(/#[0-9a-f]{3,6}\b/i)
  })
  it('driver.js fijo en 1.x', () => { expect(pkg.dependencies['driver.js']).toMatch(/^1\./) })
})

describe('recorrido: alquiler de ejemplo de solo lectura', () => {
  it('no usa la red ni guarda nada; estados para fotos, depósito y devolución', () => {
    for (const e of ['fotos_entrada', 'pendiente_pago', 'ventana_reclamo'] as const) { const a = alquilerEjemplo(e); expect(a.id).toBe('ejemplo'); expect(a.estado).toBe(e); expect(a.red).toBeUndefined(); expect(a.escrowId).toBeUndefined() }
    expect(alquilerEjemplo('pendiente_pago').inquilinoEmail).toBe('demo@lockumi.com')
  })
  it('Detalle con ejemplo: solo lectura (inert), sin avisos ni dueño de prueba automático', () => {
    expect(detalle).toContain('inert={!!ejemplo}'); expect(detalle).toContain('if (x && a && !ejemplo) avisar'); expect(detalle).toContain('const pendienteDueno = !ejemplo &&')
  })
})
