// paso16-unido · UNA sola 1.7-demo (Términos + Privacidad) que describe exactamente lo que está encendido (Legal, 25/10, 12:05 a. m.).
// Los textos de dos personas solo aparecen con el modo de dos personas y los de correos solo con VITE_CORREOS=1. Se arman desde
// un solo archivo por documento (src/legal/v17/*.md) con bloques condicionales; aquí se prueban las 4 combinaciones.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { condicional } from '../condicional'
import { docs, terminosActual, privacidadActual, docTerminos, consentimientoPrivacidad, CONSENTIMIENTO_PRIVACIDAD } from '../documentos'
import { V17, FECHA_V17, EDICION_V17 } from '../version17'
import { TERMINOS_42E } from '../../prueba/dosPersonas'
afterEach(() => vi.unstubAllEnvs())
const plano = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

function encender({ dos, correos }: { dos: boolean; correos: boolean }) {
  vi.stubEnv('VITE_PRUEBA_COMPLETA', '1')
  vi.stubEnv('VITE_TRUSTLESS', '1')
  vi.stubEnv('VITE_SUPABASE_URL', dos ? 'https://x.supabase.co' : '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', dos ? 'anon' : '')
  vi.stubEnv('VITE_DOS_PERSONAS', dos ? '1' : '0')
  vi.stubEnv('VITE_CORREOS', correos ? '1' : '0')
  return { t: plano(terminosActual().html), p: plano(privacidadActual()!.html) }
}
const COMBOS = [{ dos: false, correos: false }, { dos: false, correos: true }, { dos: true, correos: false }, { dos: true, correos: true }]

const CL12 = 'Podemos cambiar estos términos para reflejar cambios en la demo o en la ley. Publicaremos cada nueva versión con su fecha en https://app.lockumi.com/terminos y te avisaremos en la app. Cada alquiler sigue la versión con la que se creó, que aparece en su contrato. Un alquiler ya firmado solo pasa a una versión nueva si el dueño y el inquilino lo aceptan en la app. Si no estás de acuerdo, puedes dejar de usar la app y pedir que borremos tus datos.'
const B68 = 'b) En la demo, el reparto se elige con el botón «Resolver el reclamo (simulación)». Ninguna persona del equipo de Lockumi interviene.'
const B68_DOS = 'En los alquileres simulados con otra persona, si los dos lo piden, puede ayudar una persona del equipo de Lockumi, que no es mediadora certificada ni neutral porque es parte de la plataforma. Atiende como máximo 10 casos y responde en un plazo de 3 días hábiles.'
const INVITADA_7 = 'Si la persona invitada no se une en 7 días, borramos su correo.'
// Sección B y E de legal/dos-personas-textos.md (texto exacto de Legal)
const DOS_TERMINOS = [
  'Fase 2 (disponible): dos personas reales, cada una con su cuenta, pueden simular juntas un alquiler. Quien crea el alquiler elige si es el dueño o el inquilino e invita a la otra persona con un enlace que vence a los 7 días.',
  'En esta fase, el alquiler simulado y las fotos reducidas se guardan en Supabase, en un almacenamiento privado en Estados Unidos.',
  'En la fase 2 no hay dueño de prueba: el dueño firma con su propia billetera, y Lockumi no guarda su llave.',
  'En la fase 1, el dueño es la cuenta de prueba de Lockumi, así que Lockumi firma esa aprobación. En la fase 2, el dueño la firma con su propia billetera.',
  'Aprobación de la devolución: en la fase 1, Lockumi la firma con la cuenta del dueño de prueba (4.2 a). En la fase 2, la firma el dueño con su billetera.',
  'En la fase 2, la liberación necesita la aprobación del dueño. Si el dueño no aprueba ni reclama dentro de su plazo (cláusula 6.5 a), la devolución es automática: el sistema de Lockumi abre una disputa en la red de prueba solo para poder devolver el depósito, y otra cuenta de Lockumi, la que resuelve disputas, entrega el 100 % al inquilino. Ninguna persona decide ese reparto, no pasa a mediación y no puede entregar nada al dueño ni a Lockumi.',
  'En la fase 2, si el plazo vence sin reclamo y el dueño no aprobó, la devolución del 100 % al inquilino es automática (cláusula 5.3 d). No la decide una persona ni pasa a la Mediación Lockumi (demo).',
  'Mientras Lockumi tenga el rol de resolver disputas, la cuenta de plataforma no puede abrir una disputa en el contrato digital, salvo la disputa automática de la cláusula 5.3 d), que abre otra cuenta de Lockumi solo para devolver el 100 % al inquilino.',
  TERMINOS_42E,
  'En la fase 2, lo decide la Mediación Lockumi (demo) si las partes no se ponen de acuerdo (cláusula 6).',
  B68_DOS,
]
const DOS_PRIVACIDAD = [
  'Mediación Lockumi (demo), en los alquileres simulados con otra persona: si un reclamo pasa a la mediación, una persona del equipo de Lockumi ve el reclamo, la respuesta, las fotos y los mensajes de ese alquiler simulado, y el nombre visible y el papel de cada parte. Accede a las fotos con enlaces temporales. No ve tu llave privada, tu correo ni tus otros alquileres.',
  'Si el reclamo pasa a la Mediación Lockumi (demo), también lo ve la persona mediadora del equipo de Lockumi.',
  'Si un reclamo pasa a la Mediación Lockumi (demo), que una persona del equipo lo revise para ayudar a las partes a llegar a un acuerdo y, si no lo logran, decida el reparto simulado. Usa los datos solo para ese caso, guarda confidencialidad y no hace capturas ni los comparte.',
  'Alquiler simulado con otra persona', INVITADA_7, 'El enlace de invitación vence a los 7 días.',
]
const CORREOS_PRIVACIDAD = ['Resend', 'invitaciones@lockumi.com', 'Acepto que Lockumi me envíe avisos por correo', 'transfieran a estos proveedores (Vercel, Supabase, Cavos, Trustless Work y Resend)']

describe('condicional(): bloques y frases según los interruptores', () => {
  const s = { 'dos-personas': true, correos: false }
  it('bloques (anidados) e incisos en línea; sin marcas en el resultado', () => {
    const txt = ['a', '<!-- si: dos-personas -->', 'b {{correos: c}}{{!correos:d}}', '<!-- si: correos -->', 'e', '<!-- fin -->', '<!-- fin -->', '<!-- si no: dos-personas -->', 'f', '<!-- fin -->', 'Versión {{edicion}}'].join('\n')
    expect(condicional(txt, s)).toBe(['a', 'b d', 'Versión ' + EDICION_V17].join('\n'))
  })
  it('un interruptor desconocido o un bloque sin cerrar es un error (no se publica un texto roto)', () => {
    expect(() => condicional('{{otro: x}}', s)).toThrow(); expect(() => condicional('<!-- si: dos-personas -->\nx', s)).toThrow()
    expect(() => condicional('<!-- fin -->', s)).toThrow()
  })
})

describe('Una sola 1.7-demo para todas las combinaciones', () => {
  for (const c of COMBOS) it(`dos personas ${c.dos ? 'sí' : 'no'} · correos ${c.correos ? 'sí' : 'no'}`, () => {
    const { t, p } = encender(c)
    // Misma versión y fecha, de una sola constante; nada de marcas a la vista
    for (const d of [terminosActual(), privacidadActual()!]) { expect(d.version).toBe(V17); expect(d.fecha).toBe(FECHA_V17); expect(d.html).not.toMatch(/\{\{|\}\}|&lt;!--|si:|LEGAL/) }
    expect(t).toContain('Versión ' + EDICION_V17); expect(p).toContain('Versión ' + EDICION_V17)
    expect(docTerminos(V17).html).toBe(terminosActual().html)
    // Arreglo 1: cláusula 12 exacta y sin «Al crear o firmar…»
    expect(t).toContain('12. Cambios ' + CL12); expect(t).not.toMatch(/Al crear o firmar/); expect(t).not.toContain('antes de que entre a regir')
    // Arreglo 2: 6.8 b)
    expect(t).toContain(B68)
    // Privacidad sin «fase»
    expect(p).not.toMatch(/\bfase\b/i)
    // Dos personas: todo o nada
    for (const f of DOS_TERMINOS) expect(t.includes(f), f).toBe(c.dos)
    for (const f of DOS_PRIVACIDAD) expect(p.includes(f), f).toBe(c.dos)
    expect(t.includes('Fase 2 (cuando esté disponible)')).toBe(!c.dos)
    expect(t.includes('a la persona del equipo de Lockumi que haga la Mediación Lockumi (demo)')).toBe(c.dos)
    // Correos: todo o nada
    for (const f of CORREOS_PRIVACIDAD) expect(p.includes(f), f).toBe(c.correos)
    expect(t.includes('En la demo, los avisos son solo en la app, sin correo.')).toBe(!c.correos)
    expect(t.includes('declaras que ella sabe que la invitas y que acepta recibir el correo de invitación de Lockumi')).toBe(c.dos && c.correos)
    expect(t.includes('Si invitas a otra persona, declaras que ella sabe que la invitas')).toBe(c.dos)
    expect(p.includes('correo de invitación') || p.includes('correos de invitación')).toBe(c.dos && c.correos)
    // La casilla de privacidad nombra a Resend solo si se le envían datos
    expect(consentimientoPrivacidad().despues.includes('Resend')).toBe(c.correos)
    // 30 días de la mediación: en todas
    expect(p).toContain('Lo que se usa para una mediación lo borramos o lo anonimizamos 30 días después de cerrar el caso')
  })
  it('apagado (sin prueba completa): la casilla es la de siempre', () => {
    vi.stubEnv('VITE_PRUEBA_COMPLETA', '0'); vi.stubEnv('VITE_CORREOS', '1')
    expect(consentimientoPrivacidad()).toBe(CONSENTIMIENTO_PRIVACIDAD); expect(terminosActual().version).toBe('1.6-demo')
  })
  it('cambiar un interruptor cambia el texto (no queda guardado el de otra combinación)', () => {
    const a = encender({ dos: false, correos: false }).p, b = encender({ dos: true, correos: true }).p
    expect(a).not.toBe(b); expect(docs().privacidad.html).toBe(privacidadActual()!.html)
  })
})
