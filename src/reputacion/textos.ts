// Paso 19 · Textos de la reputación. Fuente: legal/reputacion-textos.md (Legal, actualización del 25/10/2026, 1:56 p. m., hora de
// Costa Rica, ya con «Llave Lockumi», decisión 2 de Katherine), copiados al pie de la letra. Las negritas van entre **…**.
// Las variables siguen la convención de Legal: {nombre visible}, {cantón}, {n}.
// TODO lo que lleva «LEGAL: revisar» puede cambiar: la lista completa está en docs/reputacion.md.
import type { Rol } from '../types'
import { ENTRADA } from './entrada-textos'

export const NOMBRE_LLAVE = 'Llave Lockumi'

export interface Bloque { titulo: string; parrafos: string[]; casillas: string[] }

// LEGAL: revisar · C.1 (versión de Legal de las 2:15 p. m.). Decisión de Katherine (25/10/2026, 2:24 p. m.): la reputación es OBLIGATORIA
// para usar Lockumi; cada papel acepta su bloque con sus dos casillas, sin marcar, y sin ellas no se puede seguir. Por pedido de Katherine
// los textos se copian como están, aunque todavía dicen «Si lo activas» y «Es voluntario…»: Legal tiene que ajustarlos a «obligatoria».
// Cambios nuestros: sin las notas entre corchetes de Legal y con la ruta real «Tu perfil en Lockumi» en lugar de «Ajustes › Cuenta», que no existe.
const RETIRAR = '**Retirar el consentimiento es eliminar la cuenta:** elimina tu cuenta en Tu perfil en Lockumi › «Eliminar mi cuenta» (o pídelo por correo). Tu perfil deja de verse al instante y borramos tus datos de reputación en un máximo de 5 días hábiles. Es gratis. Por ley, un hecho que baja tu puntaje deja de contar y se borra de tu reputación 10 años después de que ocurrió.'
const FIJO = '**Tu perfil es fijo:** una vez activado, tu perfil público no se puede ocultar. Solo deja de verse si eliminas tu cuenta.'
const TIEMPO = '**Cuánto tiempo:** tu perfil y tus datos de reputación (puntaje, insignias y el historial de alquileres que alimenta el puntaje) se guardan y se muestran **mientras exista tu cuenta**.'
const ENTIENDO = 'Entiendo que mi perfil es público y fijo: no se puede ocultar y solo deja de verse si elimino mi cuenta. Mis datos de reputación se guardan mientras exista mi cuenta y, para retirar mi consentimiento, debo eliminarla.'
const PERFIL_DUENO: Bloque = {
  titulo: 'Activar mi perfil público de dueño',
  parrafos: [
    'Si lo activas, **cualquier persona en internet** que tenga el enlace podrá ver: tu nombre visible ({nombre visible}), que eres dueño, tu cantón, desde cuándo estás en Lockumi, cuántos alquileres cerraste en Lockumi, tus insignias y, desde tu 3.er alquiler cerrado, tu puntaje y la Llave Lockumi si la tienes. **No publicamos** la dirección ni el barrio del inmueble, tu teléfono, tu correo, tu cédula, fotos ni el detalle de tus reclamos.',
    '**Para qué:** que inquilinos interesados conozcan tu historial en Lockumi. No es una garantía ni una recomendación de Lockumi. En la demo, los datos salen de la red de prueba y no reflejan alquileres reales.',
    FIJO, TIEMPO, RETIRAR,
    'Es voluntario: si no lo activas, puedes usar Lockumi igual.',   // LEGAL: revisar · contradice la decisión «obligatoria» (2:24 p. m.)
  ],
  casillas: ['Confirmo que soy mayor de 18 años y acepto que Lockumi publique estos datos en mi perfil público de dueño.', ENTIENDO],
}
const PERFIL_INQUILINO: Bloque = {
  titulo: 'Activar mi perfil público de inquilino',
  parrafos: [
    'Si lo activas, **cualquier persona en internet** que tenga el enlace podrá ver: tu nombre visible ({nombre visible}), que eres inquilino, tu cantón, desde cuándo estás en Lockumi, cuántos alquileres cerraste en Lockumi, tus insignias y, desde tu 3.er alquiler cerrado, tu puntaje y la Llave Lockumi si la tienes. **No publicamos** tu dirección, tu barrio, dónde vives o vivías, tu teléfono, tu correo, tu cédula, fotos ni el detalle de tus reclamos.',
    '**Para qué:** que dueños interesados conozcan tu historial en Lockumi. No es una garantía ni una recomendación de Lockumi. Nunca ordenamos a los inquilinos por puntaje ni publicamos listas de puntajes bajos. En la demo, los datos salen de la red de prueba y no reflejan alquileres reales.',
    FIJO, TIEMPO, RETIRAR,
    'Es voluntario: si no lo activas, puedes usar Lockumi igual, y ningún dueño sabrá que no lo activaste.',   // LEGAL: revisar · contradice «obligatoria»
  ],
  casillas: ['Confirmo que soy mayor de 18 años y acepto que Lockumi publique estos datos en mi perfil público de inquilino.', ENTIENDO],
}
export const TEXTO_PERFIL: Record<Rol, Bloque> = { dueno: PERFIL_DUENO, inquilino: PERFIL_INQUILINO }

// LEGAL: revisar · C.1 vitrinas (siguen opcionales), sin «Puedes desactivarlo cuando quieras…» ni la pregunta entre corchetes: la app no tiene
// botón para desactivarlas (pregunta abierta de Legal a Katherine).
export const TEXTO_DESTACADOS: Record<Rol, Bloque> = {
  dueno: { titulo: 'Aparecer en Dueños destacados de {cantón} (opcional)', parrafos: ['Además de lo anterior, tu tarjeta aparecerá en la vitrina pública de {cantón} con tu nombre visible, tu cantón, el precio desde el que alquilas, cuántos alquileres cerraste y tus insignias. Solo apareces si tienes 3 o más alquileres cerrados, y solo publicamos la vitrina si en el cantón hay al menos 10 personas; si no, usamos la provincia. Nunca mostramos tu barrio ni la dirección.'],
    casillas: ['Acepto aparecer en Dueños destacados.'] },
  inquilino: { titulo: 'Aparecer en Inquilinos destacados de {cantón} (opcional)', parrafos: ['Además de lo anterior, tu tarjeta aparecerá en la vitrina pública de {cantón} con tu nombre visible, tu cantón, el rango de alquiler que buscas, cuántos alquileres cerraste y tus insignias. Solo apareces si tienes 3 o más alquileres cerrados, y solo publicamos la vitrina si en el cantón hay al menos 10 personas; si no, usamos la provincia. Nunca mostramos tu barrio ni dónde vives.'],
    casillas: ['Acepto aparecer en Inquilinos destacados.'] },
}
// LEGAL: revisar · C.1 Nuevos. Para inquilinos, Legal pide «el rango de alquiler que buscas» en lugar del precio, pero el texto de dueños
// no nombra el precio: la frase se agregó junto a las insignias (redacción nuestra).
const NUEVOS = 'Si tienes de 0 a 2 alquileres cerrados, tu tarjeta puede aparecer en un «Espacio para nuevos» de la vitrina de {cantón}, con tu nombre visible, «Nuevo en Lockumi · {n} alquileres cerrados» y tus insignias, sin puntaje.'
export const TEXTO_NUEVOS: Record<Rol, Bloque> = {
  dueno: { titulo: 'Aparecer en Nuevos en Lockumi (opcional)', parrafos: [NUEVOS], casillas: ['Acepto aparecer en Nuevos en Lockumi.'] },
  inquilino: { titulo: 'Aparecer en Nuevos en Lockumi (opcional)', parrafos: [NUEVOS.replace('y tus insignias', 'el rango de alquiler que buscas y tus insignias')], casillas: ['Acepto aparecer en Nuevos en Lockumi.'] },
}
// «Mostrar mi puntaje» ya no existe (decisión de Katherine, 2:24 p. m.): el puntaje se muestra siempre desde el 3.er alquiler cerrado.
// LEGAL: revisar · con menos de 3 alquileres cerrados (estado neutro; frase de la maqueta, sección 7 de reputacion/textos.md).
export const TEXTO_PUNTAJE_NUEVO = 'Todos empiezan con 5,0. El puntaje se muestra desde el 3.er alquiler cerrado.'

// LEGAL: revisar · C.2
export const SE_PUBLICA = [
  'Tu nombre visible (nombre y la inicial del apellido) y tus iniciales en lugar de foto.',
  'Si eres dueño o inquilino.',
  'Tu cantón (o tu provincia, si en el cantón hay menos de 10 personas).',
  'Desde cuándo estás en Lockumi y cuántos alquileres cerraste en Lockumi.',
  'Tus insignias, que salen solo de hechos registrados en la app.',
  'Si eres dueño: el precio desde el que alquilas. Si eres inquilino: el rango de alquiler que buscas (solo en la vitrina).',
  'Tu puntaje y la Llave Lockumi, si la tienes, desde tu 3.er alquiler cerrado.',
]
export const NO_SE_PUBLICA = [
  'La dirección ni el barrio del inmueble, ni dónde vives.',
  'Tu teléfono, tu correo, tu cédula, tu billetera ni tus fotos.',
  'Las fotos del inventario, los montos de tus depósitos y el detalle de tus reclamos.',
  'Opiniones o comentarios de otras personas.',
  'Cuántos depósitos se devolvieron o recibieron completos (eso solo lo ves tú).',
  // Quitado: «Si tu puntaje es bajo: tu perfil se ve igual que el de quien eligió no mostrar su puntaje.» Con el puntaje siempre visible
  // ya no es cierto (Legal lo marcó PENDIENTE). LEGAL: revisar
]

// LEGAL: revisar · C.3 (versión de Legal de las 2:15 p. m.). El 90 % del dueño es la PROPUESTA C.3.1, pendiente del OK de Katherine.
export const COMO_SE_CALCULA = {
  intro: 'El puntaje va de 0 a 5 y **solo usa alquileres cerrados en Lockumi**. No usamos opiniones, comentarios ni datos de fuera de la app.',
  puntos: [
    'Todas las personas empiezan con 5,0. Lo mostramos desde el 3.er alquiler cerrado; antes se ve «Nuevo en Lockumi · {n} alquileres cerrados».',
    'Cada alquiler cerrado vale 5,0.',
    '**Si eres inquilino:** un alquiler solo baja si su reclamo **terminó con un descuento del depósito**: porque lo aceptaste, por un acuerdo con el dueño o por un acuerdo en la mediación. Baja en proporción a la parte descontada: por ejemplo, si se descontó el 20 % del depósito, ese alquiler vale 4,0. Si el reclamo se cerró sin descontar nada, no cuenta.',
    '**Si eres dueño:** un alquiler solo baja si, en un acuerdo o en la mediación, **se devolvió al inquilino el 90 % o más de lo que reclamaste**. Si el inquilino aceptó tu reclamo o si recibiste más del 10 % de lo que reclamaste, no baja tu puntaje. Baja en proporción a lo devuelto: por ejemplo, con un depósito de 800 USDC de prueba y un reclamo de 300, si se devolvieron al inquilino los 300, ese alquiler vale 3,1. Si no reclamaste, si tocaste «Todo bien, devolver» o si el plazo para reclamar venció sin reclamo, no cuenta.',
    'Para los dos: no baja por abrir un reclamo, por responder a uno ni por acudir a los tribunales u otras vías. Los reclamos abiertos no cuentan; mientras haya uno, tu puntaje público dice «En revisión». Un hecho que baja el puntaje deja de contar y se borra 10 años después de que ocurrió.',
    'El puntaje es el promedio de tus alquileres cerrados, con un decimal.',
    'Refleja tu historial en Lockumi. No mide tu identidad, tu solvencia ni tu conducta, y no es una garantía ni una recomendación.',
    'Si ves un error, puedes pedir que lo corrijamos (ver «Corregir o responder»).',
  ],
  demo: '**En la demo:** el puntaje se calcula con **datos de prueba** de la red de prueba de Stellar, sin dinero real. Las simulaciones y las mediaciones simuladas no cuentan. Los perfiles marcados «Ejemplo» son ficticios.',
}

// LEGAL: revisar · C.4 (versión demo)
export const AVISO_PERFIL = 'No es una garantía ni una recomendación de Lockumi. Solo resume lo registrado en la app. Demo en la red de prueba: datos de ejemplo, sin dinero real.'
export const AVISO_LISTA = 'Solo aparecen personas que eligieron aparecer. No es una garantía ni una recomendación de Lockumi, y el orden no es un ranking. Demo en la red de prueba: datos de ejemplo, sin dinero real.'

// LEGAL: revisar · C.5 Perfil fijo (no hay botón para ocultarlo).
export const PERFIL_FIJO = '**Tu perfil es público y fijo.** Cualquier persona en internet con el enlace puede verlo. No se puede ocultar: solo deja de verse si eliminas tu cuenta.'

// LEGAL: revisar · C.5.1 Eliminar la cuenta. El plazo de 5 días hábiles excluye sábados, domingos y feriados de Costa Rica.
export const ELIMINAR = {
  boton: 'Eliminar mi cuenta',
  titulo: '¿Eliminar tu cuenta?',
  intro: 'Eliminar tu cuenta es la única forma de que tu perfil deje de verse y de retirar tu consentimiento para los datos de reputación. Si la eliminas:',
  puntos: [
    'Tu perfil y tus tarjetas dejan de mostrarse al instante, y el enlace público mostrará «Este perfil ya no está disponible».',
    'Borramos tus datos de reputación (puntaje, insignias, perfil y el historial que alimenta el puntaje) en un máximo de 5 días hábiles. No se pueden recuperar.',
    'Los datos del contrato y del depósito siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar.',
    'No podemos borrar las capturas ni las imágenes que otras personas ya hayan guardado.',
    'Antes de eliminarla, puedes descargar tus datos.',
  ],
  descargar: 'Descargar mis datos', si: 'Eliminar mi cuenta', no: 'Cancelar',
  listo: 'Listo. Eliminamos tu cuenta. Tus datos de reputación se borrarán en un máximo de 5 días hábiles.',
  correo: 'También se puede pedir por correo a business.applockumi@gmail.com desde el correo registrado.',
}
// Redacción nuestra (LEGAL: revisar): fecha límite visible y salida de la sesión en la demo.
export const ELIMINAR_UI = {
  limite: (f: string) => `Fecha límite: ${f}.`,
  salir: 'Salir',
  enCurso: 'Ya pediste eliminar tu cuenta. Tu perfil ya no se muestra.',
}

// LEGAL: revisar · C.5.2
export const MIS_DATOS = {
  boton: 'Ver mis datos de reputación',
  titulo: 'Tus datos de reputación',
  texto: 'Aquí ves todo lo que guardamos para tu reputación: cada alquiler cerrado que cuenta, si tuvo un descuento del depósito y de cuánto (si eres inquilino) o qué parte de lo que reclamaste se devolvió al inquilino (si eres dueño), cómo afecta tu puntaje, tus insignias y en qué vitrinas apareces. Se guardan mientras exista tu cuenta. Es gratis (Ley 8968, art. 7).',
  descargar: 'Descargar mis datos', corregir: 'Corregir o pedir revisión', eliminar: 'Eliminar mi cuenta',
}

// LEGAL: revisar · C.6
export const CORREGIR = {
  titulo: '¿Ves un error en tu puntaje o en tus insignias?',
  parrafos: [
    'Toca [Corregir o responder], elige el alquiler, explica qué está mal y adjunta pruebas si las tienes. Te enviamos un acuse con la fecha. Mientras lo revisamos, tu puntaje público dice «En revisión» y el alquiler en disputa no cuenta. Te respondemos por escrito en un máximo de **5 días hábiles**. Si tenías razón, corregimos el dato y te avisamos. Si no estás de acuerdo con la respuesta, puedes presentar una denuncia ante la PRODHAB (www.prodhab.go.cr) o acudir a los tribunales.',
    '**Derecho de respuesta:** si un dato publicado sobre ti afecta tu reputación, puedes pedir que junto a tu perfil se muestre una nota breve tuya (hasta 300 caracteres) mientras lo revisamos, o que se oculte ese dato hasta resolver.',
    '**Pedir revisión de un evento:** aunque el cálculo esté bien, puedes pedir que revisemos un evento concreto (por ejemplo, un descuento del depósito o un reclamo que crees que se registró mal). Seguimos el mismo trámite y el mismo plazo.',
    'Escríbenos también a business.applockumi@gmail.com desde tu correo registrado.',
  ],
}

// LEGAL: revisar · C.7 (sin «verificado»)
export const INSIGNIAS: Record<string, { nombre: string; descripcion: string }> = {
  contrato: { nombre: 'Contrato firmado en Lockumi', descripcion: 'Firmó en la app el contrato de al menos un alquiler.' },
  deposito: { nombre: 'Depósito guardado en Lockumi', descripcion: 'El depósito de al menos un alquiler se guardó en la cuenta segura de la app.' },
  'fotos-entrada': { nombre: 'Fotos de entrada completas', descripcion: 'Subió las fotos del inventario de entrada en la app.' },
  'fotos-salida': { nombre: 'Fotos de salida completas', descripcion: 'Subió las fotos del inventario de salida en la app.' },
  devolvio: { nombre: 'Devolvió el depósito completo', descripcion: 'En al menos un alquiler cerrado en la app, el depósito volvió completo al inquilino.' },
  recibio: { nombre: 'Recibió el depósito completo', descripcion: 'En al menos un alquiler cerrado en la app, recibió su depósito completo.' },
}
export const LLAVE_DESCRIPCION = 'Se muestra a quien tiene en Lockumi 10 o más alquileres cerrados, un puntaje de 4,8 o más y fotos de entrada y salida completas en todos sus alquileres, y que en los últimos 12 meses no tuvo: si es inquilino, ningún descuento del depósito; si es dueño, ningún reclamo en el que se devolvió al inquilino el 90 % o más de lo reclamado. Se revisa cada 3 meses. No es una garantía ni una recomendación.'
export const NUEVO_DESCRIPCION = 'Tiene de 0 a 2 alquileres cerrados en Lockumi.'

// LEGAL: revisar · C.9, D5 y D7/D14
export const VITRINA = {
  orden: 'Ordenado por cantón y rango de precio, no por puntaje. Una de cada tres tarjetas es para personas nuevas en Lockumi.',
  espacio: 'Espacio para nuevos',
  pie: (quienes: 'dueños' | 'inquilinos') => `Solo aparecen ${quienes} que eligieron aparecer. Destacados: 3 o más alquileres cerrados. Espacios para nuevos: de 0 a 2 alquileres cerrados. Publicamos la vitrina si en el cantón hay al menos 10 personas.`,
  nuevos: 'Una de cada tres tarjetas es un Espacio para nuevos: personas con 0 a 2 alquileres cerrados que eligieron aparecer. Todavía no tienen puntaje; eso no dice nada malo de ellas.',
  vacio: 'Todavía no hay suficientes personas en esta zona para mostrar una lista.',
}

// LEGAL: revisar · textos de pantalla nuevos, redactados para este paso (no salen de Legal).
export const UI = {
  entradaTitulo: ENTRADA.titulo,
  miPerfil: 'Mi perfil · solo lo ves tú',   // maqueta, sección 7
  asiTeVen: 'Así te ven en tu perfil público, si lo activas.',   // maqueta, sección 7
  perfilEnLockumi: 'Perfil en Lockumi',
  privado: 'Tu perfil no es público.',
  publico: 'Tu perfil es público.',
  activoDesde: (f: string) => `Activo desde el ${f}.`,   // maqueta, sección 7
  hacerPublico: 'Hacer público mi perfil',
  comoSeCalcula: 'Cómo se calcula',
  queEsLlave: `Qué es la ${NOMBRE_LLAVE}`,
  corregir: 'Corregir o responder',
  verVitrina: 'Ver la vitrina de ejemplo',
  enLockumiDesde: (f: string) => `En Lockumi desde ${f}`,
  segunLockumi: 'Según lo registrado en Lockumi',
  insignias: 'Insignias',
  sinInsignias: 'Las insignias aparecen cuando firmas un contrato, guardas un depósito o subes fotos en la app.',
  soloTu: 'Solo tú ves esto',
  devolvioDe: (d: number, t: number) => `Devolvió ${d} de ${t} depósitos completos`,
  recibioDe: (d: number, t: number) => `Recibió su depósito completo en ${d} de ${t} alquileres`,
  pasoDe: (i: number, n: number) => `Paso ${i} de ${n}`,
  datosTitulo: '¿Cómo te verán?',
  nombreVisible: 'Nombre visible',
  nombreAyuda: 'Tu nombre y la inicial de tu apellido. Por ejemplo: Laura V.',
  canton: 'Tu cantón',
  cantonAyuda: 'Solo mostramos el cantón. Nunca el barrio ni la dirección.',
  elegirCanton: 'Elige tu cantón',
  continuar: 'Continuar', volver: 'Volver', ahoraNo: 'Ahora no', listo: 'Listo',
  errNombre: 'Escribe tu nombre y la inicial de tu apellido, por ejemplo «Laura V.».',
  errNombreLargo: 'Usa solo tu nombre y la inicial del apellido, por ejemplo «Laura V.». Máximo 30 letras.',
  errCanton: 'Elige tu cantón en la lista. Está ordenada por provincia.',
  errCasillas: 'Marca las dos casillas para continuar. Sin ellas no puedes usar Lockumi; si no estás de acuerdo, puedes salir o eliminar tu cuenta.',
  errCasilla: 'Para aparecer, marca la casilla. Si prefieres no aparecer, toca «Ahora no».',
  activar: 'Activar',
  opcion: { perfil: 'Perfil público', destacados: 'Destacados', nuevos: 'Nuevos en Lockumi' } as Record<'perfil' | 'destacados' | 'nuevos', string>,
  // Puerta obligatoria (decisión de Katherine, 2:24 p. m.). Redacción nuestra, LEGAL: revisar.
  puertaNota: 'Para usar Lockumi, activa tu perfil público como dueño y como inquilino. Son 3 pasos.',
  aceptarYSeguir: 'Aceptar y continuar',
  obligatoria: 'Sin esta aceptación no puedes usar Lockumi.',
  salir: 'Salir',
  verVitrinaOpcion: 'Ver si quieres aparecer en la vitrina',
  aparecesListo: 'Listo. Ya apareces en la vitrina de tu cantón.',
  nuevoTitulo: 'Nuevo en Lockumi',
  errGuardar: 'No pudimos guardar en este navegador. Libera espacio (por ejemplo, con «Reiniciar demo») e inténtalo otra vez.',
  publicoListo: 'Listo. Tu perfil ya es público.',
  publicoNota: 'Tu perfil queda visible mientras exista tu cuenta. Si eliminas tu cuenta, desaparece.',
  reclamoDevuelto: (p: number) => `Reclamo devuelto al inquilino: ${p} %`,
  sinReclamo: 'Sin reclamos devueltos',
  opciones: 'Tus opciones',
  si: 'Activado', no: 'Apagado',
  vitrinaTitulo: 'Vitrina de ejemplo',
  vitrinaDuenos: 'Dueños destacados', vitrinaInquilinos: 'Inquilinos destacados',
  vitrinaEn: (lista: string, zona: string) => `${lista} en ${zona}`,
  alquilaDesde: (p: string) => `Alquila desde ${p} al mes`,
  buscaDe: (p: string) => `Busca de ${p} al mes`,
  comoOrdenamos: 'Cómo ordenamos esta vitrina',
  comoOrdenamosTexto: `Mostramos las tarjetas por cantón y por rango de precio. El puntaje y la ${NOMBRE_LLAVE} no cambian el orden. Una de cada tres tarjetas es para personas nuevas en Lockumi, que todavía no tienen puntaje. Solo aparecen quienes eligieron aparecer.`,
  ejemplo: 'Ejemplo',
  queSePublica: 'Qué se publica (desde que activas tu perfil y mientras exista tu cuenta)',   // C.2
  queNoSePublica: 'Qué no se publica nunca',
  datosVacio: 'Todavía no tienes alquileres cerrados en Lockumi.',
  descuento: (p: number) => `Descuento del depósito: ${p} %`,
  sinDescuento: 'Sin descuento del depósito',
  vale: (v: string) => `Vale ${v}`,
}

/** Reemplaza {variable} (admite tildes y espacios, como {nombre visible} o {cantón}). */
export const conVars = (t: string, v: Record<string, string | number>) => t.replace(/\{([^}]+)\}/g, (m, k: string) => k in v ? String(v[k]) : m)
