// PR #22 · El link de invitación se arma con el origen público de la app (app.lockumi.com en producción), nunca con 127.0.0.1:
// si la app corre en este aparato (localhost, 127.0.0.1), el link apunta a app.lockumi.com. VITE_ORIGEN_PUBLICO lo fija si hace falta
// (por ejemplo, para las capturas locales).
export const ORIGEN_LOCKUMI = 'https://app.lockumi.com'
const LOCAL = /^(localhost|127(?:\.\d+){3}|0\.0\.0\.0|\[::1\]|::1)$/i

export function origenPublico(loc: { origin: string; hostname: string } = location, fijo: string | undefined = import.meta.env.VITE_ORIGEN_PUBLICO as string | undefined): string {
  const f = (fijo ?? '').trim().replace(/\/+$/, '')
  if (f) return f
  return LOCAL.test(loc.hostname) ? ORIGEN_LOCKUMI : loc.origin
}
export const linkInvitacion = (id: string, token: string) => `${origenPublico()}/#/invitacion/${id}/${token}`
