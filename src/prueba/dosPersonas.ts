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
export const TEXTO_AUTO_INQUILINO = 'Si el dueño no aprueba ni reclama antes de que venza su plazo, se te devuelve automáticamente el 100 % del depósito de prueba. No lo decide una persona.'
// LEGAL: revisar · 5.3 d) (sección E), al terminar
export const TEXTO_CERRADO_AUTO = 'El dueño no aprobó ni reclamó dentro de su plazo. El sistema de Lockumi abrió una disputa en la red de prueba solo para poder devolver el depósito, y otra cuenta de Lockumi, la que resuelve disputas, entregó el 100 % al inquilino. Ninguna persona decidió este reparto.'
