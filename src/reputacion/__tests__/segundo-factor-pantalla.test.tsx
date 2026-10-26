// Paso 19 · Segundo factor (Legal 25/10/2026, 5:04 p. m.; Katherine, 5:29 p. m.): la pantalla «Revisa tu correo» es la de
// par-eliminar.png y par-descargar.png (misma estructura y clases que la maqueta de prueba-completa/scripts/segundo-factor.mjs), con los
// textos literales. Las fotos reales a 390 px están en prueba-completa/capturas/paso19-reputacion/segundo-factor/real/.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, String(v)) }, removeItem: (k: string) => { mem.delete(k) },
  clear: () => mem.clear(), key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size } })
const texto = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const nada = () => {}
beforeEach(() => { vi.resetModules(); mem.clear(); vi.unstubAllEnvs(); vi.stubEnv('VITE_REPUTACION', '1') })
const pintar = async (accion: 'eliminar' | 'descargar', err: { t: string; codigo: boolean } | null = null) => {
  const { CodigoCorreo } = await import('../Pantallas')
  return renderToStaticMarkup(<CodigoCorreo c={{ accion, correo: 'lockumi@mail.grokbot.com' }} err={err} enviando={false} confirmar={nada} reenviar={nada} cancelar={nada} />)
}

describe('pantalla «Revisa tu correo»', () => {
  it('eliminar: textos literales y botones de la imagen aprobada (Eliminar mi cuenta en rojo, Reenviar código, Cancelar)', async () => {
    const h = await pintar('eliminar')
    expect(texto(h)).toBe('Revisa tu correo Te enviamos un código de 6 números a lockumi@mail.grokbot.com . Escríbelo aquí para eliminar tu cuenta. Código del correo '
      + 'El código vale 10 minutos. Si no llega en un minuto, revisa la carpeta de correo no deseado o toca «Reenviar código». Eliminar mi cuenta Reenviar código Cancelar')
    expect(h).toMatch(/<section class="glass tarjeta rp-texto"[^>]*><h1[^>]*class="h2">Revisa tu correo<\/h1><p>Te enviamos un código de 6 números a <strong>lockumi@mail\.grokbot\.com<\/strong>\. Escríbelo aquí para eliminar tu cuenta\.<\/p>/)
    expect(h).toMatch(/<div class="campo rp-campo" style="margin-top:var\(--s4\)"><label for="[^"]+">Código del correo<\/label><input [^>]*inputMode="numeric" autoComplete="one-time-code" maxLength="6"/)
    expect(h).toMatch(/<div class="rp-acciones"><button type="submit" class="boton rp-peligro">Eliminar mi cuenta<\/button><button type="button" class="boton boton--secundario">Reenviar código<\/button><a class="boton boton--secundario" href="#\/perfil">Cancelar<\/a><\/div>/)
    expect(h).not.toMatch(/role="alert"/)
  })
  it('descargar: mismo diseño, con «descargar tus datos» y el botón naranja ancho', async () => {
    const h = await pintar('descargar')
    expect(texto(h)).toContain('Escríbelo aquí para descargar tus datos.')
    expect(h).toMatch(/<button type="submit" class="rp-boton rp-boton--ancho">Descargar mis datos<\/button>/)
  })
  it('si el código falla: el error de Legal arriba de la nota, el campo marcado como inválido y unido al error', async () => {
    const { SEGUNDO_FACTOR } = await import('../textos')
    const h = await pintar('eliminar', { t: SEGUNDO_FACTOR.errores.codigo, codigo: true })
    expect(h).toMatch(/aria-invalid="true" aria-describedby="([^"]+)"[^>]*\/><\/div><p id="\1" class="error" role="alert" style="margin-top:8px">Ese código no es correcto o ya venció\. Revisa el último correo de Lockumi y escríbelo de nuevo, o toca «Reenviar código»\.<\/p><p class="nota">El código vale 10 minutos\./)
    const r = await pintar('descargar', { t: SEGUNDO_FACTOR.errores.minuto, codigo: false })
    expect(texto(r)).toContain('Ya te enviamos un código. Espera un minuto antes de pedir otro.'); expect(r).not.toMatch(/aria-invalid/)
  })
  it('Legal 6:04 p. m.: el aviso «Ya te enviamos un código…» se oculta al empezar a escribir (solo ese aviso; uno nuevo se vuelve a ver)', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const s = fs.readFileSync('src/reputacion/Pantallas.tsx', 'utf8')
    expect(s).toMatch(/const \[oculto, setOculto\] = useState<typeof err>\(null\), errVisible = err && err !== oculto \? err : null/)
    expect(s).toMatch(/onChange=\{e => \{ setValor\([^}]*\); if \(err\?\.t === SEGUNDO_FACTOR\.errores\.minuto\) setOculto\(err\) \}\}/)
    expect(s).toMatch(/\{errVisible && <p id=\{`\$\{id\}e`\} className="error" role="alert"/)
    // Antes de escribir, el aviso se ve (foto descargar-2c); el error del código no se oculta al escribir.
    const { SEGUNDO_FACTOR } = await import('../textos')
    expect(texto(await pintar('descargar', { t: SEGUNDO_FACTOR.errores.minuto, codigo: false }))).toContain(SEGUNDO_FACTOR.errores.minuto)
  })
  it('sin servidor (demo local) nada cambia: las pantallas solo piden el código con conServidor; con servidor, siempre', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const s = fs.readFileSync('src/reputacion/Pantallas.tsx', 'utf8')
    expect(s.match(/if \(conServidor\) sf\.pedir\('descargar', setErrDescarga\)/g)).toHaveLength(2)
    expect(s).toMatch(/if \(conServidor\) \{ sf\.pedir\('eliminar', setErrBorrado\); return \}/)
    expect(s).not.toMatch(/servidor\.(pedirBorradoCuenta|datosReputacion)/)
  })
  it('textos marcados «LEGAL: revisado (25/10, 5:04 p. m.)»; los 2 errores propios, revisados por Legal a las 6:01 p. m.; ninguno sigue «LEGAL: revisar»', async () => {
    const fs = await import(['node', 'fs'].join(':')) as { readFileSync(p: string, c: 'utf8'): string }
    const t = fs.readFileSync('src/reputacion/textos.ts', 'utf8'), b = t.slice(t.indexOf('export const SEGUNDO_FACTOR'), t.indexOf('// LEGAL: revisado (25/10) · REP-10'))
    expect(t).toMatch(/LEGAL: revisado \(25\/10, 5:04 p\. m\.\) · textos literales de Legal \(pantalla del código\)\nexport const SEGUNDO_FACTOR/)
    expect(b).not.toMatch(/LEGAL: revisar/)
    for (const f of ['src/reputacion/textos.ts', 'api/_lib/codigo-correo.ts']) {
      const s = fs.readFileSync(f, 'utf8')
      expect(s, f).toMatch(/LEGAL: revisado \(25\/10, 6:01 p\. m\.\) · texto propio aprobado por Legal tal como está \(más de 5 códigos en una hora\)\n\s*hora: 'Ya te enviamos 5 códigos en la última hora\. Espera una hora y vuelve a tocar «Reenviar código»\.'/)
      expect(s, f).toMatch(/LEGAL: revisado \(25\/10, 6:01 p\. m\.\) · texto literal de Legal \(el correo no salió\)\n\s*envio: 'No pudimos enviarte el código\. Vuelve a intentarlo en un minuto\.'/)
      expect(s, f).not.toMatch(/segundo factor 25\/10 5:29|enviarte el código\. Revisa tu conexión/) }
    expect(fs.readFileSync('api/_lib/cavos-token.ts', 'utf8')).toMatch(/LEGAL: revisado \(25\/10, 5:04 p\. m\.\)[^\n]*\n[^\n]*DEMASIADOS_INTENTOS = 'Hiciste muchos intentos seguidos\. Espera 10 minutos y vuelve a entrar con tu correo\.'/)
  })
})
