// Correos del E2E de C: las direcciones de prueba son SOLO el buzón de prueba (lockumi@mail.grokbot.com, con etiqueta +),
// y cualquier llamada a Resend con otro destinatario (to, cc o bcc) se corta antes de salir.
export const BUZON = /^lockumi(\+[a-z0-9-]{1,56})?@mail\.grokbot\.com$/
export const correoPrueba = (caso, rol) => `lockumi+e2ec-${caso}-${rol}@mail.grokbot.com`
const lista = x => x == null ? [] : Array.isArray(x) ? x : [x]
export function fetchSoloBuzon(f) {
  return async (url, init = {}) => {
    if (/^https:\/\/api\.resend\.com\//.test(String(url))) {
      let b = {}; try { b = JSON.parse(init.body ?? '{}') } catch { b = {} }
      const to = lista(b.to), todos = [...to, ...lista(b.cc), ...lista(b.bcc)]
      if (!to.length || !todos.every(x => typeof x === 'string' && BUZON.test(x)))
        throw new Error('correo bloqueado: en el E2E solo se envía al buzón de prueba (lockumi@mail.grokbot.com)')
    }
    return f(url, init)
  }
}
