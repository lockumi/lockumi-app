// Paso 19 · Textos de la reputación. Fuente: legal/reputacion-textos.md (Legal, actualización del 25/10/2026, 1:56 p. m., hora de
// Costa Rica, ya con «Llave Lockumi», decisión 2 de Katherine), copiados al pie de la letra. Las negritas van entre **…**.
// Las variables siguen la convención de Legal: {nombre visible}, {cantón}, {n}.
// TODO lo que lleva «LEGAL: revisar» puede cambiar: la lista completa está en docs/reputacion.md.
import type { Rol } from '../types'

export const NOMBRE_LLAVE = 'Llave Lockumi'

export interface Bloque { titulo: string; parrafos: string[]; casillas: string[] }

// LEGAL: revisar · C.1 Dueños (perfil público). La 2.ª casilla («Entiendo…») es obligatoria y va separada de la de publicación.
const PERFIL_DUENO: Bloque = {
  titulo: 'Hacer público mi perfil de dueño (opcional)',
  parrafos: [
    'Si lo activas, **cualquier persona en internet** que tenga el enlace podrá ver: tu nombre visible ({nombre visible}), que eres dueño, tu cantón, desde cuándo estás en Lockumi, cuántos alquileres cerraste en Lockumi, tus insignias y, solo si activas «Mostrar mi puntaje», tu puntaje y la Llave Lockumi. **No publicamos** la dirección ni el barrio del inmueble, tu teléfono, tu correo, tu cédula, fotos ni el detalle de tus reclamos.',
    '**Para qué:** que inquilinos interesados conozcan tu historial en Lockumi. No es una garantía ni una recomendación de Lockumi. En la demo, los datos salen de la red de prueba y no reflejan alquileres reales.',
    '**Cómo dejar de mostrarlo:** en Ajustes › Perfil público › «Dejar de mostrar». Tu perfil desaparece de las listas al instante y el enlace deja de funcionar. Tus datos de reputación no se borran: siguen en tu cuenta, sin publicarse.',
    '**Cuánto tiempo:** lo público se deja de mostrar en cuanto lo desactivas. Tus datos de reputación (puntaje, insignias, perfil y el historial de alquileres que alimenta el puntaje) se guardan **mientras exista tu cuenta** y se borran solo cuando eliminas tu cuenta.',
    '**Retirar el consentimiento es eliminar la cuenta:** si quieres que Lockumi deje de guardar tus datos de reputación, elimina tu cuenta en Ajustes › Cuenta › «Eliminar mi cuenta» (o pídelo por correo). Es gratis y los borramos en un máximo de 5 días hábiles. Por ley, un descuento del depósito deja de contar y se borra de tu reputación 10 años después de que ocurrió.',
    'Es voluntario: si no lo activas, puedes usar Lockumi igual.',
  ],
  casillas: [
    'Confirmo que soy mayor de 18 años y acepto que Lockumi publique estos datos en mi perfil público de dueño.',
    'Entiendo que mis datos de reputación se guardan mientras exista mi cuenta y que, para retirar mi consentimiento, debo eliminar mi cuenta.',
  ],
}
// LEGAL: revisar · C.1 Inquilinos (perfil público).
const PERFIL_INQUILINO: Bloque = {
  titulo: 'Hacer público mi perfil de inquilino (opcional)',
  parrafos: [
    'Si lo activas, **cualquier persona en internet** que tenga el enlace podrá ver: tu nombre visible ({nombre visible}), que eres inquilino, tu cantón, desde cuándo estás en Lockumi, cuántos alquileres cerraste en Lockumi, tus insignias y, solo si activas «Mostrar mi puntaje», tu puntaje y la Llave Lockumi. **No publicamos** tu dirección, tu barrio, dónde vives o vivías, tu teléfono, tu correo, tu cédula, fotos ni el detalle de tus reclamos.',
    '**Para qué:** que dueños interesados conozcan tu historial en Lockumi. No es una garantía ni una recomendación de Lockumi. Nunca ordenamos a los inquilinos por puntaje ni publicamos listas de puntajes bajos. En la demo, los datos salen de la red de prueba y no reflejan alquileres reales.',
    PERFIL_DUENO.parrafos[2], PERFIL_DUENO.parrafos[3], PERFIL_DUENO.parrafos[4],
    'Es voluntario: si no lo activas, puedes usar Lockumi igual, y ningún dueño sabrá que no lo activaste.',
  ],
  casillas: [
    'Confirmo que soy mayor de 18 años y acepto que Lockumi publique estos datos en mi perfil público de inquilino.',
    PERFIL_DUENO.casillas[1],
  ],
}
export const TEXTO_PERFIL: Record<Rol, Bloque> = { dueno: PERFIL_DUENO, inquilino: PERFIL_INQUILINO }

// LEGAL: revisar · C.1 Destacados.
export const TEXTO_DESTACADOS: Record<Rol, Bloque> = {
  dueno: { titulo: 'Aparecer en Dueños destacados de {cantón} (opcional)', parrafos: ['Además de lo anterior, tu tarjeta aparecerá en la vitrina pública de {cantón} con tu nombre visible, tu cantón, el precio desde el que alquilas, cuántos alquileres cerraste y tus insignias. Solo apareces si tienes 3 o más alquileres cerrados, y solo publicamos la vitrina si en el cantón hay al menos 10 personas; si no, usamos la provincia. Nunca mostramos tu barrio ni la dirección. Puedes desactivarlo cuando quieras.'],
    casillas: ['Acepto aparecer en Dueños destacados.'] },
  inquilino: { titulo: 'Aparecer en Inquilinos destacados de {cantón} (opcional)', parrafos: ['Además de lo anterior, tu tarjeta aparecerá en la vitrina pública de {cantón} con tu nombre visible, tu cantón, el rango de alquiler que buscas, cuántos alquileres cerraste y tus insignias. Solo apareces si tienes 3 o más alquileres cerrados, y solo publicamos la vitrina si en el cantón hay al menos 10 personas; si no, usamos la provincia. Nunca mostramos tu barrio ni dónde vives. Puedes desactivarlo cuando quieras.'],
    casillas: ['Acepto aparecer en Inquilinos destacados.'] },
}
// LEGAL: revisar · C.1 Nuevos en Lockumi. Para inquilinos, C.1 dice «el mismo texto que para dueños, con «el rango de alquiler que buscas»
// en lugar del precio»; el texto de dueños no nombra el precio, así que la frase se agregó junto a las insignias (redacción nuestra).
export const TEXTO_NUEVOS: Record<Rol, Bloque> = {
  dueno: { titulo: 'Aparecer en Nuevos en Lockumi (opcional)', parrafos: ['Si tienes de 0 a 2 alquileres cerrados, tu tarjeta puede aparecer en un «Espacio para nuevos» de la vitrina de {cantón}, con tu nombre visible, «Nuevo en Lockumi · {n} alquileres cerrados» y tus insignias, sin puntaje. Puedes desactivarlo cuando quieras.'],
    casillas: ['Acepto aparecer en Nuevos en Lockumi.'] },
  inquilino: { titulo: 'Aparecer en Nuevos en Lockumi (opcional)', parrafos: ['Si tienes de 0 a 2 alquileres cerrados, tu tarjeta puede aparecer en un «Espacio para nuevos» de la vitrina de {cantón}, con tu nombre visible, «Nuevo en Lockumi · {n} alquileres cerrados», el rango de alquiler que buscas y tus insignias, sin puntaje. Puedes desactivarlo cuando quieras.'],
    casillas: ['Acepto aparecer en Nuevos en Lockumi.'] },
}
// LEGAL: revisado (24/10) · «Mostrar mi puntaje» (diseno/envio/reputacion/coral-con-amor/textos.md), apagado por defecto.
export const TEXTO_MOSTRAR_PUNTAJE: Bloque = { titulo: 'Mostrar mi puntaje', parrafos: ['Quienes vean tu perfil o una lista verán tus estrellas, de 0 a 5. Puedes apagarlo cuando quieras.'], casillas: ['Acepto que Lockumi muestre mi puntaje.'] }
// LEGAL: revisado (24/10) · con un puntaje menor a 3,0.
export const TEXTO_PUNTAJE_BAJO = 'Este interruptor se habilita con un puntaje de 3,0 o más. Mientras tanto, tu perfil muestra cuántos alquileres cerraste en Lockumi y tus insignias, igual que el de cualquier persona que no muestra su puntaje.'
// LEGAL: revisar · con menos de 3 alquileres cerrados (frase de la maqueta, sección 7 de reputacion/textos.md).
export const TEXTO_PUNTAJE_NUEVO = 'Todos empiezan con 5,0. El puntaje se muestra desde el 3.er alquiler cerrado.'

// LEGAL: revisar · C.2
export const SE_PUBLICA = [
  'Tu nombre visible (nombre y la inicial del apellido) y tus iniciales en lugar de foto.',
  'Si eres dueño o inquilino.',
  'Tu cantón (o tu provincia, si en el cantón hay menos de 10 personas).',
  'Desde cuándo estás en Lockumi y cuántos alquileres cerraste en Lockumi.',
  'Tus insignias, que salen solo de hechos registrados en la app.',
  'Si eres dueño: el precio desde el que alquilas. Si eres inquilino: el rango de alquiler que buscas (solo en la vitrina).',
  'Tu puntaje y la Llave Lockumi, solo si activas «Mostrar mi puntaje» y tienes 3 o más alquileres cerrados.',
]
export const NO_SE_PUBLICA = [
  'La dirección ni el barrio del inmueble, ni dónde vives.',
  'Tu teléfono, tu correo, tu cédula, tu billetera ni tus fotos.',
  'Las fotos del inventario, los montos de tus depósitos y el detalle de tus reclamos.',
  'Opiniones o comentarios de otras personas.',
  'Cuántos depósitos se devolvieron o recibieron completos (eso solo lo ves tú).',
  'Si tu puntaje es bajo: tu perfil se ve igual que el de quien eligió no mostrar su puntaje.',
]

// LEGAL: revisar · C.3
export const COMO_SE_CALCULA = {
  intro: 'El puntaje va de 0 a 5 y **solo usa alquileres cerrados en Lockumi**. No usamos opiniones, comentarios ni datos de fuera de la app.',
  puntos: [
    'Todas las personas empiezan con 5,0. Lo mostramos desde el 3.er alquiler cerrado; antes se ve «Nuevo en Lockumi · {n} alquileres cerrados».',
    'Cada alquiler cerrado vale 5,0. Solo baja si el reclamo de ese alquiler **terminó con un descuento del depósito**: porque el inquilino lo aceptó, por la Regla de propuesta automática (cláusula 6.5.1) que las dos partes aceptaron al firmar, o por un acuerdo en la mediación. Baja en proporción a la parte descontada: por ejemplo, si se descontó el 20 % del depósito, ese alquiler vale 4,0.',
    'Si el reclamo se cerró sin descontar nada, no cuenta. Tampoco baja por abrir un reclamo ni por acudir a los tribunales u otras vías. Los reclamos abiertos no cuentan; mientras haya uno, tu puntaje público dice «En revisión».',
    'El puntaje es el promedio de tus alquileres cerrados, con un decimal.',
    'Refleja tu historial en Lockumi. No mide tu identidad, tu solvencia ni tu conducta, y no es una garantía ni una recomendación.',
    'Si ves un error, puedes pedir que lo corrijamos (ver «Corregir o responder»).',
  ],
  demo: '**En la demo:** el puntaje se calcula con **datos de prueba** de la red de prueba de Stellar, sin dinero real. Las simulaciones y las mediaciones simuladas no cuentan. Los perfiles marcados «Ejemplo» son ficticios.',
}

// LEGAL: revisar · C.4 (versión demo)
export const AVISO_PERFIL = 'No es una garantía ni una recomendación de Lockumi. Solo resume lo registrado en la app. Demo en la red de prueba: datos de ejemplo, sin dinero real.'
export const AVISO_LISTA = 'Solo aparecen personas que eligieron aparecer. No es una garantía ni una recomendación de Lockumi, y el orden no es un ranking. Demo en la red de prueba: datos de ejemplo, sin dinero real.'

// C.5 («Dejar de mostrar mi perfil») NO se usa: Katherine decidió el 25/10/2026 (2:11 p. m.) que no hay botón para ocultar el perfil;
// queda fijo y solo desaparece al eliminar la cuenta. Legal tiene que quitar de C.1, C.2 y C.8 las frases que lo prometen.

// LEGAL: revisar · C.5.1 Eliminar la cuenta. El plazo de 5 días hábiles excluye sábados, domingos y feriados de Costa Rica.
export const ELIMINAR = {
  boton: 'Eliminar mi cuenta',
  titulo: '¿Eliminar tu cuenta?',
  intro: 'Retirar tu consentimiento para los datos de reputación es eliminar tu cuenta. Si la eliminas:',
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
  texto: 'Aquí ves todo lo que guardamos para tu reputación: cada alquiler cerrado que cuenta, si tuvo un descuento del depósito y de cuánto, cómo afecta tu puntaje, tus insignias y qué opciones de publicación tienes activas. Se guardan mientras exista tu cuenta. Es gratis (Ley 8968, art. 7).',
  descargar: 'Descargar mis datos', corregir: 'Corregir o pedir revisión', eliminar: 'Eliminar mi cuenta',
}

// LEGAL: revisar · C.6
export const CORREGIR = {
  titulo: '¿Ves un error en tu puntaje o en tus insignias?',
  parrafos: [
    'Toca [Corregir o responder], elige el alquiler, explica qué está mal y adjunta pruebas si las tienes. Te enviamos un acuse con la fecha. Mientras lo revisamos, tu puntaje público dice «En revisión» y el alquiler en disputa no cuenta. Te respondemos por escrito en un máximo de **5 días hábiles**. Si tenías razón, corregimos el dato y te avisamos. Si no estás de acuerdo con la respuesta, puedes presentar una denuncia ante la PRODHAB (www.prodhab.go.cr) o acudir a los tribunales.',
    '**Derecho de respuesta:** si un dato publicado sobre ti afecta tu reputación, puedes pedir que junto a tu perfil se muestre una nota breve tuya (hasta 300 caracteres) mientras lo revisamos, o que se oculte ese dato hasta resolver.',
    '**Pedir revisión de un evento:** aunque el cálculo esté bien, puedes pedir que revisemos un evento concreto (por ejemplo, un descuento del depósito que crees que no corresponde). Seguimos el mismo trámite y el mismo plazo.',
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
export const LLAVE_DESCRIPCION = 'Se muestra a quien tiene en Lockumi 10 o más alquileres cerrados, un puntaje de 4,8 o más, ningún descuento del depósito en sus alquileres de los últimos 12 meses y fotos de entrada y salida completas en todos sus alquileres. Se revisa cada 3 meses. No es una garantía ni una recomendación.'
export const NUEVO_DESCRIPCION = 'Tiene de 0 a 2 alquileres cerrados en Lockumi.'

// LEGAL: revisar · C.9, D5 y D7/D14
export const VITRINA = {
  orden: 'Ordenado por cantón y rango de precio, no por puntaje. Una de cada tres tarjetas es para personas nuevas en Lockumi.',
  espacio: 'Espacio para nuevos',
  pie: (quienes: 'dueños' | 'inquilinos') => `Solo aparecen ${quienes} que eligieron aparecer. Destacados: 3 o más alquileres cerrados. Espacios para nuevos: de 0 a 2 alquileres cerrados. Algunas personas eligen no mostrar su puntaje. Publicamos la vitrina si en el cantón hay al menos 10 personas.`,
  nuevos: 'Una de cada tres tarjetas es un Espacio para nuevos: personas con 0 a 2 alquileres cerrados que eligieron aparecer. Todavía no tienen puntaje; eso no dice nada malo de ellas.',
  vacio: 'Todavía no hay suficientes personas en esta zona para mostrar una lista.',
}

// LEGAL: revisar · textos de pantalla nuevos, redactados para este paso (no salen de Legal).
export const UI = {
  entradaTitulo: 'Tu perfil en Lockumi',
  entradaTexto: 'Es opcional. Nada de lo tuyo se hace público si no lo activas.',   // de C.8 («Nada de lo tuyo se hace público si no lo activas.»)
  entradaBoton: 'Ver mi perfil',
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
  llaveTuya: `Tienes la ${NOMBRE_LLAVE}. Se muestra en tu perfil solo si activas «Mostrar mi puntaje».`,
  pasoDe: (i: number, n: number) => `Paso ${i} de ${n}`,
  datosTitulo: '¿Cómo te verán?',
  nombreVisible: 'Nombre visible',
  nombreAyuda: 'Tu nombre y la inicial de tu apellido. Por ejemplo: Laura V.',
  canton: 'Tu cantón',
  cantonAyuda: 'Solo mostramos el cantón. Nunca el barrio ni la dirección.',
  elegirCanton: 'Elige tu cantón',
  continuar: 'Continuar', volver: 'Volver', ahoraNo: 'Ahora no', listo: 'Listo', saltar: 'Continuar sin activarlo',
  errNombre: 'Escribe tu nombre y la inicial de tu apellido, por ejemplo «Laura V.».',
  errNombreLargo: 'Usa solo tu nombre y la inicial del apellido, por ejemplo «Laura V.». Máximo 30 letras.',
  errCanton: 'Elige tu cantón en la lista. Está ordenada por provincia.',
  errCasillas: 'Para hacer público tu perfil, marca las dos casillas. Si prefieres no hacerlo, toca «Ahora no».',
  errGuardar: 'No pudimos guardar en este navegador. Libera espacio (por ejemplo, con «Reiniciar demo») e inténtalo otra vez.',
  publicoListo: 'Listo. Tu perfil ya es público.',
  publicoNota: 'Puedes dejar de mostrarlo cuando quieras desde tu perfil.',
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
  queSePublica: 'Qué se publica (solo si lo activas)',
  queNoSePublica: 'Qué no se publica nunca',
  datosVacio: 'Todavía no tienes alquileres cerrados en Lockumi.',
  descuento: (p: number) => `Descuento del depósito: ${p} %`,
  sinDescuento: 'Sin descuento del depósito',
  vale: (v: string) => `Vale ${v}`,
}

/** Reemplaza {variable} (admite tildes y espacios, como {nombre visible} o {cantón}). */
export const conVars = (t: string, v: Record<string, string | number>) => t.replace(/\{([^}]+)\}/g, (m, k: string) => k in v ? String(v[k]) : m)
