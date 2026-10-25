// Recorrido guiado (driver.js, estilo joyride): 6 pasos con los textos aprobados (diseno/envio/recorrido-formulario/textos.md,
// LEGAL: revisado el 23/10). Se abre solo la primera vez en Inicio y se vuelve a ver desde «¿Cómo funciona?».
// Los pasos 4 a 6 usan un alquiler de ejemplo de solo lectura (#/ejemplo): no crea nada ni llama a la red.
import { driver, type Driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { Alquiler, Estado, Usuario } from './types'
import { actaVacia } from './store'
import { CASITA_AVISO_SVG } from './LogoAviso'

export const VERSION_RECORRIDO = 'v1'
export const RUTA_EJEMPLO = '/ejemplo'
export interface PasoRecorrido { ruta: string; estado?: Estado; el: string; /** En el teléfono (menos de 720 px), si el bloque es muy alto para el globo. */ elMovil?: string; titulo: string; texto: string; lado?: 'top' | 'bottom' | 'left' | 'right' }
// LEGAL: revisado el 23/10 (textos exactos de la maqueta aprobada; pasos 5 y 6 con las correcciones de Legal).
export const PASOS_RECORRIDO: PasoRecorrido[] = [
  { ruta: '/', el: '[data-recorrido="nuevo"]', titulo: 'Te damos la bienvenida a Lockumi',
    texto: 'Lockumi guarda el depósito del alquiler en una cuenta de la red de prueba, con USDC de prueba. Empecemos por crear un alquiler.' },
  { ruta: '/crear', el: '[data-recorrido="datos"]', titulo: 'Los datos del alquiler',
    texto: 'El lugar, las fechas y el monto del depósito. Toca una opción: casi no hay que escribir.' },
  { ruta: '/crear', el: '[data-recorrido="reglas"]', titulo: 'Las reglas del dueño',
    texto: 'Toca las reglas del lugar. Quedan escritas en el contrato que firman los dos.' },
  { ruta: RUTA_EJEMPLO, estado: 'fotos_entrada', el: '.detalle__principal .cuarto .tomar', titulo: 'Fotos y lista de entrada',
    texto: 'Al entrar, una foto de cada espacio y una lista para marcar. Al salir se repite. Así los dos ven cómo estaba el lugar.' },
  // LEGAL: revisado (24/10)
  { ruta: RUTA_EJEMPLO, estado: 'pendiente_pago', el: '.detalle__principal > .tarjeta', titulo: 'Firmas y depósito',
    texto: 'Los dos firman el contrato. Después el inquilino paga el depósito y queda guardado. Ni el dueño ni el inquilino lo pueden sacar solos. Al entregar el lugar, hay 7 días para hacer un reclamo.' },
  { ruta: RUTA_EJEMPLO, estado: 'ventana_reclamo', el: '[data-recorrido="pasos"]', elMovil: '[data-recorrido="pasos"] h3', titulo: 'La devolución',
    texto: 'Si no hay reclamos en 7 días, el depósito se puede devolver al inquilino. Si hay un reclamo, buscamos que una persona mediadora les ayude a llegar a un acuerdo. En esta prueba, la mediación es una simulación.' },
]

/** Clave de «ya lo vio»: sha256 corto del correo (no se guarda el correo en claro). */
export async function claveRecorrido(u: Pick<Usuario, 'email'>): Promise<string> {
  const datos = new TextEncoder().encode(u.email.trim().toLowerCase())
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', datos))
  return `lockumi.recorrido.${VERSION_RECORRIDO}.` + [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('')
}
export async function yaLoVio(u: Pick<Usuario, 'email'>) { try { return localStorage.getItem(await claveRecorrido(u)) !== null } catch { return true } }
export async function marcarVisto(u: Pick<Usuario, 'email'>) { try { localStorage.setItem(await claveRecorrido(u), new Date().toISOString()) } catch { /* sin almacenamiento */ } }

// Estado del alquiler de ejemplo (cambia con el paso); #/ejemplo lo lee.
let estadoEjemplo: Estado = 'fotos_entrada'; const subs = new Set<() => void>()
export const suscribirEjemplo = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
export const estadoDelEjemplo = () => estadoEjemplo
const ponerEjemplo = (e: Estado) => { if (e !== estadoEjemplo) { estadoEjemplo = e; subs.forEach(f => f()) } }
/** Alquiler de ejemplo de solo lectura (sin red ni servidor; no se guarda). */
export function alquilerEjemplo(estado: Estado, email = 'demo@lockumi.com'): Alquiler {
  const hoy = new Date(); const fin = new Date(hoy); fin.setMonth(fin.getMonth() + 6)
  const firmado = estado !== 'firmas'
  return { id: 'ejemplo', direccion: 'Apartamento en Barreal de Heredia', monto: 3, moneda: 'USDC', inicio: hoy.toISOString().slice(0, 10), fin: fin.toISOString().slice(0, 10),
    reglas: ['No se permiten mascotas', 'Sin fumar'], duenoEmail: 'dueno.prueba@lockumi.com', inquilinoEmail: email, miRol: 'inquilino',
    estado, rendimiento: false, historial: [{ fecha: hoy.toISOString(), texto: 'Alquiler de ejemplo' }], diasSimulados: 0,
    contrato: { firmas: firmado ? { inquilino: hoy.toISOString(), dueno: hoy.toISOString() } : {} }, entrada: actaVacia(),
    ...(estado === 'ventana_reclamo' && { salida: actaVacia(), ventanaInicio: hoy.toISOString(), pago: hoy.toISOString() }) }
}

export const selectorDe = (p: PasoRecorrido) => p.elMovil && typeof innerWidth === 'number' && innerWidth < 720 ? p.elMovil : p.el
const reducir = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const esperar = (sel: string, ms = 3000) => new Promise<Element | null>(listo => {
  const fin = Date.now() + ms; const mirar = () => { const e = document.querySelector(sel); if (e || Date.now() > fin) listo(e); else requestAnimationFrame(mirar) }; mirar() })
let activo: Driver | null = null
export const recorridoActivo = () => !!activo?.isActive()

/** Abre el recorrido. `u` marca «visto» al terminar o al saltar (también con Esc). El foco vuelve a quien lo abrió. */
export function abrirRecorrido(u: Pick<Usuario, 'email'>, { desde = 0, quien: q }: { desde?: number; quien?: HTMLElement } = {}) {
  if (activo?.isActive()) return activo
  const origen = location.hash.slice(1) || '/'; const quien = q ?? document.activeElement as HTMLElement | null
  const ir = async (i: number) => {
    const p = PASOS_RECORRIDO[i]; if (p.estado) ponerEjemplo(p.estado)
    if ((location.hash.slice(1) || '/') !== p.ruta) location.hash = p.ruta
    await esperar(selectorDe(p)); d.moveTo(i)
  }
  const cerrar = () => { void marcarVisto(u); d.destroy() }
  const pasos: DriveStep[] = PASOS_RECORRIDO.map((p, i) => ({
    element: () => document.querySelector(selectorDe(p)) ?? document.body,
    popover: { title: p.titulo, description: p.texto, side: p.lado, align: 'start',
      showButtons: i === 0 ? ['next'] : ['next', 'previous'], nextBtnText: i === PASOS_RECORRIDO.length - 1 ? '¡Listo!' : 'Siguiente', prevBtnText: 'Atrás',
      onNextClick: () => { if (i === PASOS_RECORRIDO.length - 1) cerrar(); else void ir(i + 1) },
      onPrevClick: () => { if (i > 0) void ir(i - 1) } },
  }))
  const d = driver({
    steps: pasos, animate: !reducir(), smoothScroll: !reducir(), overlayColor: 'rgb(61, 42, 34)', overlayOpacity: 0.55, stagePadding: 6, stageRadius: 18,
    popoverClass: 'recorrido', allowClose: true, allowKeyboardControl: true, overlayClickBehavior: 'none', disableActiveInteraction: true, popoverOffset: 12,
    onPopoverRender: (pop, { state }) => {
      const i = state.activeIndex ?? 0, n = PASOS_RECORRIDO.length
      pop.wrapper.setAttribute('aria-modal', 'true')
      pop.title.id = 'recorrido-t'; pop.description.id = 'recorrido-d'
      pop.wrapper.setAttribute('aria-labelledby', 'recorrido-t'); pop.wrapper.setAttribute('aria-describedby', 'recorrido-d')
      const cab = document.createElement('p'); cab.className = 'recorrido__n'; cab.textContent = `Paso ${i + 1} de ${n}`
      const casa = document.createElement('span'); casa.className = 'recorrido__casa'; casa.setAttribute('aria-hidden', 'true')
      casa.innerHTML = CASITA_AVISO_SVG.replace(/aviso-casa-/g, 'rec-casa-')
      const cabeza = document.createElement('div'); cabeza.className = 'recorrido__cab'; pop.title.before(cabeza); cabeza.append(casa, cab)
      const puntos = document.createElement('span'); puntos.className = 'recorrido__puntos'; puntos.setAttribute('aria-hidden', 'true')
      for (let k = 0; k < n; k++) { const s = document.createElement('i'); if (k === i) s.className = 'es'; else if (k < i) s.className = 'ya'; puntos.append(s) }
      pop.progress.replaceWith(puntos)
      pop.closeButton.remove()
      const saltar = document.createElement('button'); saltar.type = 'button'; saltar.className = 'recorrido__saltar'; saltar.textContent = 'Saltar'
      saltar.addEventListener('click', cerrar)
      pop.footer.prepend(saltar)
      pop.footer.insertBefore(puntos, pop.footerButtons)
      for (const b of [pop.previousButton, pop.nextButton]) b.type = 'button'
      requestAnimationFrame(() => pop.nextButton.focus({ preventScroll: true }))
    },
    onCloseClick: () => cerrar(),
    onDestroyStarted: () => { void marcarVisto(u); d.destroy() },   // Esc = Saltar
    onDestroyed: () => {
      activo = null
      if ((location.hash.slice(1) || '/') !== origen) location.hash = origen
      setTimeout(() => { if (quien?.isConnected) quien.focus({ preventScroll: true }) }, 0)
    },
  })
  activo = d
  const p = PASOS_RECORRIDO[desde]; if (p.estado) ponerEjemplo(p.estado)
  if ((location.hash.slice(1) || '/') !== p.ruta) location.hash = p.ruta
  void esperar(selectorDe(p)).then(() => d.drive(desde))
  return d
}
