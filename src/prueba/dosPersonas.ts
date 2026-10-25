// Paso 7 · Modo de dos personas, opción 1 (aprobada por Katherine): si el dueño no aprueba ni reclama en su plazo, la devolución del
// 100 % al inquilino es automática (Términos 1.7-demo 5.3 d, 6.5 a, 4.2 c y 4.2 e; legal/dos-personas-textos.md, sección E).
// Detrás del interruptor de la prueba completa. En la red, la disputa la abre la cuenta de plataforma y la resuelve la cuenta
// mediadora (api/_lib/tw.ts, acción «devolver-automatico»).
import type { Alquiler } from '../types'
import { pruebaCompleta } from './interruptor'

/** Mismo texto que api/_lib/tw.ts APROBADO (sin importar el SDK de Stellar en el navegador). */
export const APROBADO_DUENO = 'El dueño aprobó en la cadena devolver el depósito completo'

/** ¿Este alquiler es del modo de dos personas? (lo marca el servidor compartido al leerlo; nunca el navegador). */
export const esDosPersonas = (a: Pick<Alquiler, 'dosPersonas'>) => pruebaCompleta() && a.dosPersonas === true

// LEGAL: revisar · 6.5 a) y 5.3 d) (sección E) en la pantalla del dueño
export const TEXTO_AUTO_DUENO = 'Si no apruebas ni reclamas antes de que venza tu plazo, el depósito se devuelve automáticamente: el 100 % al inquilino. No la decide una persona ni pasa a la Mediación Lockumi (demo).'
// LEGAL: revisar · 6.5 a) en la pantalla del inquilino
export const TEXTO_AUTO_INQUILINO = 'Si el dueño no aprueba ni reclama antes de que venza su plazo, se te devuelve automáticamente el 100 % del depósito de prueba, menos el 0,3 % de comisión de la red de prueba de Trustless Work. No lo decide una persona.'
// LEGAL: revisar · 5.3 d) (sección E), al terminar
export const TEXTO_CERRADO_AUTO = 'El dueño no aprobó ni reclamó dentro de su plazo. El sistema de Lockumi abrió una disputa en la red de prueba solo para poder devolver el depósito, y otra cuenta de Lockumi, la que resuelve disputas, entregó el 100 % al inquilino, menos el 0,3 % de comisión de la red de prueba de Trustless Work. Ninguna persona decidió este reparto.'

/** Comisión de Trustless Work en la red de prueba: 0,3 % también al resolver una disputa (medido en testnet el 24/10/2026:
 *  resolve_dispute 3a1c92a7…, eeca5f43…, cd92c786…: 1 USDC → 0,003 a la cuenta de comisión de Trustless Work). */
const COMISION_TW = 0.003
const fmt = (n: number) => n.toLocaleString('es-CR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 7 })
/** «800 USDC de prueba» (Legal 24/10: los montos dicen «de prueba»). */
export const montoPrueba = (n: number) => `${fmt(n)} USDC de prueba`
/** Lo que llega de verdad al inquilino en la devolución automática (100 % menos la comisión de la red de prueba). */
export const recibeInquilino = (monto: number) => Math.round(monto * (1 - COMISION_TW) * 1e7) / 1e7
// LEGAL: revisar · nota bajo los montos al terminar (devolución automática)
export const notaComisionAuto = (monto: number) =>
  `Llegaron ${montoPrueba(recibeInquilino(monto))}: la red de prueba de Trustless Work descuenta el 0,3 % (${montoPrueba(Math.round((monto - recibeInquilino(monto)) * 1e7) / 1e7)}). El dueño y Lockumi no reciben nada.`
// LEGAL: revisar · Términos 1.7-demo, 4.2 e) (texto de Legal del 24/10, 11:29 p. m.; se publica en el paso 16)
export const TERMINOS_42E = 'En la devolución automática de la cláusula 5.3 d), la cuenta de Lockumi que resuelve disputas entrega al inquilino el 100 % del saldo del depósito, menos solo la comisión de la red de prueba de Trustless Work. No puede entregar nada al dueño ni a Lockumi.'
