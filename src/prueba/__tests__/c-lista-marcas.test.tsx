// PR #22 · Legal revisó las 128 marcas (legal/revision-marcas-pr22.md): 109 OK (se quitan las marcas) y 19 correcciones con su
// texto exacto. Todo detrás de C: con VITE_DOS_PERSONAS apagado no cambia nada visible.
import { describe, it, expect } from 'vitest'
import { estadoAceptaciones } from '../../servidor/aceptaciones'
import { declaracionInvitacion } from '../invitacion'
import { TEXTO_GUARDA_DOS, TEXTO_APROBAR_DOS, TEXTO_APROBADO_DOS } from '../dosPersonas'
import { avisoNuevaVersion, casillaDeFuncion, FECHA_V19 } from '../../legal/versiones'
import { validarMonto } from '../../validacion'

const raw = async (p: string) => (await import(/* @vite-ignore */ p + '?raw')).default as string
const plano = (s: string) => s.replace(/\s+/g, ' ')

const CONTRATO_65 = 'Al terminar el alquiler, el dueño tiene 7 días naturales para reclamar, desde que toca «Recibí la casa» o, si no lo toca, desde 2 días después de la entrega. Cada reclamo va con fotos tomadas en la app y una factura o un precio de referencia. Si no reclama a tiempo, el depósito de prueba se devuelve completo al inquilino, menos el 0,3 % de comisión de Trustless Work en la red de prueba. El inquilino tiene 7 días naturales para responder, desde que el aviso le llega en la app. Su silencio no es aceptación. Si el último día cae en domingo o feriado, el plazo termina el siguiente día hábil.'
const CONTRATO_65_C = ' Si el inquilino no responde a tiempo, el caso pasa a la Mediación Lockumi (demo).'
const HOJA_RED_C = [
  'Esta demo funciona en la red de prueba (testnet) de Stellar. Los tokens no tienen valor y la red se reinicia de vez en cuando. No uses la red principal ni envíes dinero real.',
  'Tú eres el dueño y la persona que invitas es el inquilino. Cada uno entra con su propia cuenta y firma por sí mismo.',
  'Si hay un reclamo y no se ponen de acuerdo, el caso pasa a la Mediación Lockumi (demo), sin costo. La mediación no decide por ustedes: el reparto solo se aplica si los dos lo aceptan. Si no hay acuerdo, el depósito de prueba sigue retenido. Si el dueño no reclama a tiempo, se devuelve automáticamente el 100 % al inquilino, menos el 0,3 % de comisión de Trustless Work.',
  'El alquiler simulado y las fotos reducidas se guardan en Supabase, en un almacenamiento privado en Estados Unidos. A la red solo va una huella de las fotos.',
]

describe('1) marcas: las 109 OK se quitan; solo quedan las de textos nuevos', () => {
  it('en src y api no queda «LEGAL: revisar» fuera de la lista permitida', () => {
    const todos = import.meta.glob(['/src/**/*.{ts,tsx,md}', '/api/**/*.ts', '!**/__tests__/**', '!/src/legal/LEEME.md'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    expect(Object.keys(todos).length).toBeGreaterThan(100)
    const hallados: string[] = []
    for (const [p, src] of Object.entries(todos)) src.split('\n').forEach((l, i) => { if (l.includes('LEGAL: revisar')) hallados.push(`${p.slice(1)}:${i + 1}`) })
    // alertas.ts:5 explica qué es la marca; el resto son textos nuevos de esta ronda (Legal no los vio).
    const permitidos = [/^src\/alertas\.ts:5$/, /^src\/prueba\/dosPersonas\.ts:/, /^api\/_lib\/tw\.ts:/, /^src\/servidor\/repositorio\.ts:/]
    expect(hallados.filter(h => !permitidos.some(r => r.test(h)))).toEqual([])
    expect(hallados.length).toBeLessThanOrEqual(5)
  })
})

describe('2) correcciones de Legal, palabra por palabra', () => {
  it('aceptaciones: «USDC de prueba»', () => {
    expect(estadoAceptaciones('dueno', [{ rol: 'inquilino', montoDueno: 20, fecha: '' }], 100).texto).toBe('El inquilino aceptó: 20,00 USDC de prueba para el dueño y 80,00 USDC de prueba para el inquilino.')
  })
  it('alertas.ts: devolución automática, reclamo, reparto y mediación de C', async () => {
    const s = plano(await raw('../../alertas.ts'))
    expect(s).toContain('`No hubo reclamos en el plazo. Se devolvió automáticamente al inquilino el 100 % del depósito de prueba, menos el 0,3 % de comisión de Trustless Work: llegaron ${montoPrueba(recibeInquilino(r.inquilino))}. El dueño y Lockumi no reciben nada.`')
    expect(s).toContain('`${montoPrueba(recibeInquilino(r.inquilino))} volvieron al inquilino`')
    expect(s).toContain("'El inquilino tiene 7 días naturales para aceptar o no el reclamo, desde que el aviso le llega en la app. Si no lo acepta o no responde a tiempo, el caso pasa a la Mediación Lockumi (demo). La mediación no decide por ustedes: el reparto solo se aplica si los dos lo aceptan.'")
    expect(s).toContain("' A cada monto se le descuenta el 0,3 % de comisión de Trustless Work en la red de prueba.'")
    expect(s).toContain("'Pasa a la Mediación Lockumi (demo)'")
    expect(s).toContain("'Si los dos lo piden, una persona del equipo de Lockumi les ayuda a buscar un acuerdo. No decide: el reparto solo se aplica si los dos lo aceptan.'")
  })
  it('contrato: resumen de la 6.5 para 1.7-demo o posterior y la línea de C', async () => {
    const s = plano(await raw('../../screens/ContratoDoc.tsx'))
    expect(s).toContain(CONTRATO_65); expect(s).toContain(CONTRATO_65_C)
    expect(s).toContain('Al terminar el alquiler, el dueño tiene 7 días para hacer un reclamo, con fotos y una factura o un presupuesto.')   // 1.6-demo y fuera de C
  })
  it('Crear: hoja «Red de prueba» de invitar, hoja «USDC de prueba» y montos', async () => {
    const s = plano(await raw('../../screens/Crear.tsx'))
    for (const t of HOJA_RED_C) expect(s).toContain(t)
    // Hoja «USDC de prueba»: el texto de Legal solo con C encendido en la app (dosPersonas); sin C, igual que producción.
    expect(s).toContain("USDC de prueba que te da Lockumi, sin valor, hasta {TOPE_USDC}{dosPersonas && ' USDC de prueba'}.")
    expect(s).toContain("como máximo {MONTO_MAX_USDC.toLocaleString('es-CR')}{dosPersonas ? <> USDC de prueba. Para obtenerlo, recibes XLM de prueba de Friendbot y compras USDC de prueba en el exchange descentralizado de la red de prueba.</> : '. Lo obtienes con Friendbot y el exchange de la red de prueba.'}")
    expect(s).toMatch(/invitar \? 'USDC de prueba' : 'USD'/)
    expect(s).toMatch(/escrowReal \|\| invitar \? 'USDC de prueba' : 'USD'/)
  })
  it('validacion: con C, «USDC de prueba»; sin C, igual que hoy', () => {
    expect(validarMonto('60000', true)).toBe('El depósito puede ser de hasta 50 000 USDC de prueba. Revisa si sobra un cero.'.replace('50 000', (50000).toLocaleString('es-CR')))
    expect(validarMonto('60000')).toBe(`El depósito puede ser de hasta USD ${(50000).toLocaleString('es-CR')}. Revisa si sobra un cero.`)
  })
  it('dosPersonas: pie del contrato; aprobar y aprobado sin reclamo después (entrega inmediata)', () => {
    expect(TEXTO_GUARDA_DOS).toBe('Este contrato se guarda en Supabase, el proveedor de Lockumi, en Estados Unidos, para que lo vean las dos personas. Las fotos reducidas se guardan en un almacenamiento privado.')
    expect(TEXTO_APROBAR_DOS).toMatch(/^Vas a aprobar en la red de prueba que se devuelva todo el depósito al inquilino\. Después ya no podrás reclamar en la app\./)
    expect(TEXTO_APROBADO_DOS).toMatch(/^Ya aprobaste la devolución completa y ya no puedes reclamar en la app\./)
    for (const t of [TEXTO_APROBAR_DOS, TEXTO_APROBADO_DOS]) { expect(t).not.toMatch(/cuando termine tu plazo/); expect(t).toContain('menos el 0,3 % de comisión de la red de prueba de Trustless Work.') }
  })
  it('PlazoDueno: en C, después de aprobar no se muestra «Revisar y reclamar»', async () => {
    const s = plano(await raw('../PlazoDueno.tsx'))
    expect(s).toMatch(/a\.ventanaInicio && !\(enServidor && aprobado\) && <button/)
  })
  it('MediacionPC: «pedida» en C sin el botón de simulación, y nota de datos del servidor', async () => {
    const s = plano(await raw('../MediacionPC.tsx'))
    expect(s).toContain('Una persona del equipo de Lockumi les ayudará a buscar un acuerdo. No decide por ustedes: el reparto solo se aplica si los dos lo aceptan. Si no hay acuerdo, el depósito de prueba sigue retenido.')
    expect(s).toContain("{!(deDosPersonas(a) && a.reclamo?.mediacion?.estado === 'pedida') && <B14 a={a} />}")
    expect(s).toContain('se borran ${DIAS_BORRADO} días después de cerrar el caso. Se conservan los montos y el resultado. Si los necesitas para un reclamo fuera de la app, escríbenos a business.applockumi@gmail.com antes de que pasen esos ${DIAS_BORRADO} días para que los guardemos.')
  })
  it('mediacion.ts 6.3 f), AvisosApp, acciones 6.5 c) y Detalle: detrás de C', async () => {
    expect(plano(await raw('../mediacion.ts'))).toContain("se libera al inquilino cuando se cierra el reclamo (6.3 f)${dosPersonas ? ', menos la comisión de 0,3 % de Trustless Work en la red de prueba' : ''}. Mientras tanto, todo el depósito de prueba sigue bloqueado en la cuenta segura.")
    expect(plano(await raw('../AvisosApp.tsx'))).toMatch(/\(!dosPersonas \|\| correosActivos\(\)\) && ` · Abierto por el enlace del correo: \$\{cr\(v\.abiertoCorreo\)\}`/)
    expect(plano(await raw('../../acciones.ts'))).toContain('dosPersonas ? `El inquilino no respondió a tiempo. El silencio no es aceptación. ${s.motivo} Pasa a la Mediación Lockumi (demo)`')
    expect(plano(await raw('../../screens/Detalle.tsx'))).toContain("'Lo registró la persona mediadora con el reparto que aceptaron las dos partes.'")
  })
  it('invitación con correos: «el correo de invitación de Lockumi»', async () => {
    expect(plano(await raw('../invitacion.ts'))).toContain("'Declaro que esta persona sabe que la invito y que acepta recibir el correo de invitación de Lockumi.'")
    expect(declaracionInvitacion()).toBe('Declaro que esta persona sabe que la invito.')
  })
  it('versiones: aviso de nueva versión; en C la casilla de correos usa FECHA_V19 (nunca la fecha futura de la 1.8-demo)', () => {
    expect(avisoNuevaVersion('1.7-demo', { 'dos-personas': true, correos: true })).toBe(`Actualizamos los Términos y el Aviso de privacidad (versión 1.9-demo · ${FECHA_V19}). Puedes seguir usando la app. Cuando uses una función nueva, te pediremos que la aceptes con una casilla. Tus alquileres ya firmados siguen con su versión, salvo que el dueño y el inquilino acepten el cambio.`)
    expect(casillaDeFuncion('correos', { 'dos-personas': true, correos: true }).texto).toContain(`versión 1.8-demo · ${FECHA_V19} de los Términos`)
    expect(casillaDeFuncion('correos', { 'dos-personas': true, correos: true }).texto).not.toContain('1 de noviembre')
  })
  it('Términos 2.4 de C: quien crea el alquiler es el dueño', async () => {
    const t = await raw('../../legal/v17/terminos.md')
    const c = t.split('<!-- si: dos-personas -->').find(b => b.includes('2.4 **Fase 2 (disponible):**'))!
    expect(c).toContain('En el alquiler con otra persona, quien lo crea es el dueño e invita al inquilino con un enlace.')
    expect(c).not.toContain('elige si es el dueño o el inquilino')
  })
})
