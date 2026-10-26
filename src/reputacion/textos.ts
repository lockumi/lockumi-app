// Paso 19 · Textos de la reputación. Fuente única: legal/reputacion-textos-para-producto.md (Legal, aprobado; versión del 25/10/2026,
// 2:24 p. m., hora de Costa Rica), que reemplaza a legal/reputacion-textos.md. Copiados al pie de la letra. Las negritas van entre **…**.
// Las variables siguen la convención de Legal: {nombre visible}, {cantón}, {n}.
// Legal revisó y aprobó estos textos (25/10/2026). Solo las líneas nuevas de la ronda del 25/10 (3:27 p. m.) llevan marca de revisión pendiente.
import type { Rol } from '../types'
import { ENTRADA } from './entrada-textos'

export const NOMBRE_LLAVE = 'Llave Lockumi'

export interface Bloque { titulo: string; parrafos: string[]; casillas: string[] }

// Fuente: legal/reputacion-textos-para-producto.md (aprobado por Legal, versión del 25/10/2026, 2:24 p. m.), al pie de la letra.
// Lo que dice «Ajustes › …» en Legal es la ubicación; en la app es «Tu perfil en Lockumi» (no hay pantalla de Ajustes).

// Legal (26/10/2026): ya no hay pantalla aparte REP-01 (ni REP-01b ni la hoja REP-02). El perfil se acepta con la casilla de los
// Términos 1.13-demo (src/legal/documentos.ts: casillaTerminos y LINEA_PERFIL_113).

// LEGAL: revisado (25/10) · texto literal de Legal (d): con un pedido de borrado pendiente, al intentar crear o unirse a un alquiler nuevo.
export const BLOQUEO_BORRADO = 'Pediste eliminar tu cuenta, así que ya no puedes crear ni unirte a alquileres nuevos. Tus alquileres abiertos siguen funcionando igual.'
// LEGAL: revisado (25/10) · nota del perfil cuando la persona pidió una revisión (texto literal de Legal).
export const NOTA_EN_REVISION = 'Pediste una revisión. Mientras la revisamos, tu puntaje público dice «En revisión».'

// LEGAL: revisado (25/10) · REP-06 Vitrinas (casillas opcionales).
export const TEXTO_DESTACADOS: Record<Rol, Bloque> = {
  dueno: { titulo: 'Aparecer en Dueños destacados de {cantón} (opcional)', parrafos: ['Tu tarjeta aparecerá en la vitrina pública de {cantón} con tu nombre visible, tu cantón, el precio desde el que alquilas, cuántos alquileres cerraste y tus insignias. Solo apareces si tienes 3 o más alquileres cerrados, y solo publicamos la vitrina si en el cantón hay al menos 10 personas; si no, usamos la provincia. Nunca mostramos tu barrio, la dirección ni la distancia.'],
    casillas: ['Acepto aparecer en Dueños destacados.'] },
  inquilino: { titulo: 'Aparecer en Inquilinos destacados de {cantón} (opcional)', parrafos: ['Tu tarjeta aparecerá en la vitrina pública de {cantón} con tu nombre visible, tu cantón, el rango de alquiler que buscas, cuántos alquileres cerraste y tus insignias. Solo apareces si tienes 3 o más alquileres cerrados, y solo publicamos la vitrina si en el cantón hay al menos 10 personas; si no, usamos la provincia. Nunca mostramos tu barrio, dónde vives ni la distancia.'],
    casillas: ['Acepto aparecer en Inquilinos destacados.'] },
}
const NUEVOS = 'Si tienes de 0 a 2 alquileres cerrados, tu tarjeta puede aparecer en un «Espacio para nuevos» de la vitrina de {cantón}, con tu nombre visible, «Nuevo en Lockumi» con la cantidad de alquileres cerrados (por ejemplo, «Nuevo en Lockumi · 1 alquiler cerrado») y tus insignias, sin puntaje. (Dueños: el precio desde el que alquilas; inquilinos: el rango que buscas.)'
export const TEXTO_NUEVOS: Record<Rol, Bloque> = {
  dueno: { titulo: 'Aparecer en Nuevos en Lockumi (opcional)', parrafos: [NUEVOS], casillas: ['Acepto aparecer en Nuevos en Lockumi.'] },
  inquilino: { titulo: 'Aparecer en Nuevos en Lockumi (opcional)', parrafos: [NUEVOS], casillas: ['Acepto aparecer en Nuevos en Lockumi.'] },
}
// REP-04, primer punto: el estado neutro con 0 a 2 alquileres cerrados.
// Legal (revisión del PR #26, TEXTOS 3): sin {n}, para no mostrar «1 alquileres cerrados».
export const TEXTO_PUNTAJE_NUEVO = 'Todas las personas empiezan con 5,0. Lo mostramos desde el 3.er alquiler cerrado; antes se ve «Nuevo en Lockumi» con la cantidad de alquileres cerrados (por ejemplo, «Nuevo en Lockumi · 1 alquiler cerrado»).'

// LEGAL: revisado (25/10) · REP-03 Qué se publica y qué no se publica.
export const SE_PUBLICA_TITULO = 'Qué se publica en tu perfil (mientras exista tu cuenta)'
export const SE_PUBLICA = [
  'Tu nombre visible (nombre e inicial del apellido) y tus iniciales en lugar de foto.',
  'Si eres dueño o inquilino.',
  'Tu cantón (o tu provincia, si en tu cantón hay menos de 10 personas).',
  'Desde cuándo estás en Lockumi y cuántos alquileres cerraste en Lockumi.',
  'Tus insignias, que salen solo de hechos registrados en la app.',
  'Tu puntaje y la Llave Lockumi, si la tienes, siempre a partir de tu 3.er alquiler cerrado. Todos los puntajes se muestran igual, sean altos o bajos.',
  'Solo en las vitrinas en las que aparezcas: el precio desde el que alquilas (dueños) o el rango de alquiler que buscas (inquilinos).',
]
export const NO_SE_PUBLICA_TITULO = 'Qué no se publica nunca'
export const NO_SE_PUBLICA = [
  'Tu dirección, tu barrio, la dirección del inmueble ni la distancia.',
  'Tu teléfono, tu correo, tu cédula ni tu billetera.',
  'Fotos: ni la tuya ni las del inventario.',
  'Los montos de tus depósitos y el detalle de tus reclamos.',
  'Opiniones o comentarios de otras personas.',
  'Cuántos depósitos se devolvieron o recibieron completos (eso solo lo ves tú).',
]
export const PROTECCION = '**Cómo protegemos tu perfil:** no aparece en buscadores como Google, no se puede buscar por nombre, no hay rankings ni orden por puntaje y nadie puede filtrar personas por su puntaje.'

// LEGAL: revisado (25/10) · REP-04 Cómo se calcula el puntaje.
export const COMO_SE_CALCULA = {
  titulo: 'Cómo se calcula',
  intro: 'El puntaje va de 0 a 5 y **solo usa alquileres cerrados en Lockumi**. No usamos opiniones, comentarios ni datos de fuera de la app.',
  puntos: [
    TEXTO_PUNTAJE_NUEVO,
    'Cada alquiler cerrado vale 5,0.',
    '**Si eres inquilino:** un alquiler solo baja si su reclamo **terminó con un descuento del depósito**: porque lo aceptaste, por un acuerdo con el dueño, por un acuerdo en la mediación o por la Regla de propuesta automática (cláusula 6.5.1), en las versiones donde se ofrece. Baja en proporción a la parte descontada: por ejemplo, si se descontó el 20 % del depósito, ese alquiler vale 4,0. Si el reclamo se cerró sin descontar nada, no cuenta.',
    '**Si eres dueño:** un alquiler solo baja si, en un acuerdo o en la mediación, **se devolvió al inquilino el 90 % o más de lo que reclamaste**. Si el inquilino aceptó tu reclamo o si recibiste más del 10 % de lo que reclamaste, no baja tu puntaje. Baja en proporción a lo devuelto: por ejemplo, con un depósito de 800 USDC de prueba y un reclamo de 300, si se devolvieron al inquilino los 300, ese alquiler vale 3,1. Si no reclamaste, si tocaste «Todo bien, devolver» o si el plazo para reclamar venció sin reclamo, no cuenta.',
    'Para los dos: no baja por abrir un reclamo, por responder a uno ni por acudir a los tribunales u otras vías. Los reclamos abiertos no cuentan; mientras haya uno, o mientras revisamos un hecho que pediste revisar, tu puntaje público dice «En revisión». Un hecho que baja el puntaje deja de contar y se borra 10 años después de que ocurrió.',
    'El puntaje es el promedio de tus alquileres cerrados, con un decimal.',
    'Refleja tu historial en Lockumi. No mide tu identidad, tu solvencia ni tu conducta, y no es una garantía ni una recomendación.',
    'Si ves un error, puedes pedir que lo corrijamos o que revisemos un hecho (ver «Corregir o pedir revisión»).',
    'Estas reglas pueden cambiar. Si cambian, te avisaremos antes y te pediremos aceptar la nueva versión.',
  ],
  demo: '**En la demo:** el puntaje se calcula con **datos de prueba** de la red de prueba de Stellar, sin dinero real. Las simulaciones y las mediaciones simuladas no cuentan. Los perfiles marcados «Ejemplo» son ficticios.',
}

// LEGAL: revisado (25/10) · REP-07 Avisos (el enlace [Cómo se calcula] va aparte, en la pantalla).
export const AVISO_PERFIL = 'No es una garantía ni una recomendación de Lockumi. Solo resume lo registrado en la app. Demo en la red de prueba: datos de ejemplo, sin dinero real.'
export const AVISO_LISTA = 'Solo aparecen personas que eligieron aparecer. No es una garantía ni una recomendación de Lockumi, y el orden no es un ranking. Demo en la red de prueba: datos de ejemplo, sin dinero real.'

// LEGAL: revisado (25/10) · REP-08 Perfil fijo (los botones van aparte).
export const PERFIL_FIJO = '**Tu perfil es público y fijo.** Cualquier persona en internet con el enlace puede verlo. No aparece en buscadores, no se puede buscar por nombre y no se puede ocultar: solo deja de verse si eliminas tu cuenta.'
export const PERFIL_FIJO_BOTONES = { publica: 'Ver qué se publica', datos: 'Ver mis datos de reputación', eliminar: 'Eliminar mi cuenta' }

// LEGAL: revisado (25/10) · REP-09 Eliminar la cuenta. El plazo de 5 días hábiles excluye sábados, domingos y feriados de Costa Rica.
// Con un alquiler abierto (respuesta final de Legal, 25/10/2026): párrafo después del de los 5 días hábiles y pantalla de confirmación.
export const ELIMINAR = {
  boton: 'Eliminar mi cuenta',
  titulo: '¿Eliminar tu cuenta?',
  intro: 'Eliminar tu cuenta es la única forma de que tu perfil deje de verse y de retirar tu consentimiento para los datos de reputación. Es gratis. Si la eliminas:',
  puntos: [
    'Tu perfil y tus tarjetas dejan de mostrarse al instante, y el enlace público mostrará «Este perfil ya no está disponible».',
    'Borramos tus datos de reputación (puntaje, insignias, perfil y el historial que alimenta el puntaje) en un máximo de 5 días hábiles. No se pueden recuperar.',
    'Si tienes un alquiler abierto (un depósito guardado, un plazo para reclamar o una mediación en curso), tu perfil deja de mostrarse en cuanto lo pides, pero tu cuenta se elimina cuando ese alquiler se cierre, en un máximo de 5 días hábiles después del cierre. Mientras tanto, solo usamos tus datos para cerrar el alquiler, y la otra parte sigue viendo el contrato y el historial. Esta solicitud no se puede deshacer.',
    'Los datos del contrato y del depósito siguen la regla general del Aviso de privacidad. Lo registrado en la red de prueba de Stellar no se puede borrar.',
    'No podemos borrar las capturas ni las imágenes que otras personas ya hayan guardado.',
    'Antes de eliminarla, puedes descargar tus datos.',
  ],
  descargar: 'Descargar mis datos', si: 'Eliminar mi cuenta', no: 'Cancelar',
  listo: 'Listo. Pediste eliminar tu cuenta: tu perfil ya no se muestra y la eliminamos en un máximo de 5 días hábiles.',
  correo: 'También se puede pedir por correo a business.applockumi@gmail.com desde el correo registrado.',
  noDisponible: 'Este perfil ya no está disponible',
  // Pantalla de confirmación cuando hay un alquiler abierto (Legal, literal): [Eliminar mi cuenta] [Cancelar].
  confirmarAbierto: 'Tienes un alquiler abierto. Tu perfil dejará de mostrarse ahora y tu cuenta se eliminará cuando el alquiler se cierre. Esta solicitud no se puede deshacer.',
}
// Redacción nuestra (LEGAL: revisado, 25/10): fecha límite visible, fecha y hora del pedido, el caso del alquiler abierto y salida de la sesión en la demo.
export const ELIMINAR_UI = {
  limite: (f: string) => `Fecha límite: ${f}.`,
  pedido: (f: string, h: string) => `Lo pediste el ${f} a las ${h} (hora de Costa Rica).`,
  salir: 'Salir',
  inicio: 'Ir al inicio',
  enCurso: 'Ya pediste eliminar tu cuenta. Tu perfil ya no se muestra.',
  listoAbierto: 'Listo. Tu perfil ya no se muestra.',
  esperaCierre: 'Tu cuenta se eliminará cuando el alquiler se cierre, en un máximo de 5 días hábiles después del cierre. Mientras tanto, puedes usar Lockumi para cerrarlo.',
}

// Segundo factor antes de «Eliminar mi cuenta» y «Descargar mis datos» (Legal 25/10/2026, 5:04 p. m.; Katherine, 5:29 p. m.). Pantalla
// «Revisa tu correo» de par-eliminar.png y par-descargar.png. Los errores son los mismos que devuelve api/_lib/codigo-correo.ts (una
// prueba revisa que sean iguales).
// LEGAL: revisado (25/10, 5:04 p. m.) · textos literales de Legal (pantalla del código)
export const SEGUNDO_FACTOR = {
  titulo: 'Revisa tu correo',
  texto: { eliminar: 'Te enviamos un código de 6 números a {correo}. Escríbelo aquí para eliminar tu cuenta.',
    descargar: 'Te enviamos un código de 6 números a {correo}. Escríbelo aquí para descargar tus datos.',
    // LEGAL: revisado (25/10, 9:00 p. m.) · texto literal de Legal (confirmar el correo con el token de correo de Cavos, aud «cavos-email»)
    verificar_correo: 'Te enviamos un código de 6 números a {correo}. Escríbelo aquí para confirmar tu correo.',
    // 26/10/2026 (Katherine): la misma frase, para aceptar una invitación abierta con otra cuenta
    invitacion: 'Te enviamos un código de 6 números a {correo}. Escríbelo aquí para aceptar la invitación.' } as Record<'eliminar' | 'descargar' | 'verificar_correo' | 'invitacion', string>,
  campo: 'Código del correo',
  nota: 'El código vale 10 minutos. Si no llega en un minuto, revisa la carpeta de correo no deseado o toca «Reenviar código».',
  // verificar_correo: «Continuar», el mismo botón ya aprobado de la app (UI.continuar); Legal no pidió otro.
  // invitacion: «Aceptar invitación», el mismo botón de la invitación (Invitacion.tsx, ZonaAceptar).
  boton: { eliminar: 'Eliminar mi cuenta', descargar: 'Descargar mis datos', verificar_correo: 'Continuar', invitacion: 'Aceptar invitación' } as Record<'eliminar' | 'descargar' | 'verificar_correo' | 'invitacion', string>,
  reenviar: 'Reenviar código', cancelar: 'Cancelar',
  errores: {
    // LEGAL: revisado (25/10, 5:04 p. m.) · texto literal de Legal («Si el código falla»)
    codigo: 'Ese código no es correcto o ya venció. Revisa el último correo de Lockumi y escríbelo de nuevo, o toca «Reenviar código».',
    // LEGAL: revisado (25/10, 5:04 p. m.) · texto literal de Legal (reenvío antes de un minuto)
    minuto: 'Ya te enviamos un código. Espera un minuto antes de pedir otro.',
    // LEGAL: revisado (25/10, 6:01 p. m.) · texto propio aprobado por Legal tal como está (más de 5 códigos en una hora)
    hora: 'Ya te enviamos 5 códigos en la última hora. Espera una hora y vuelve a tocar «Reenviar código».',
    // LEGAL: revisado (25/10, 6:01 p. m.) · texto literal de Legal (el correo no salió)
    envio: 'No pudimos enviarte el código. Vuelve a intentarlo en un minuto.',
    // LEGAL: revisado (25/10) · mismo texto del servidor (lk_correo_de_sesion): la sesión no tiene un correo verificado
    correo: 'Ese correo no es el de tu cuenta en este aparato. Sal de Lockumi, vuelve a entrar con tu correo y vuelve a intentarlo.',
  },
}

// LEGAL: revisado (25/10) · REP-10
export const MIS_DATOS = {
  boton: 'Ver mis datos de reputación',
  titulo: 'Tus datos de reputación',
  texto: 'Aquí ves todo lo que guardamos para tu reputación: cada alquiler cerrado que cuenta, si tuvo un descuento del depósito y de cuánto (si eres inquilino) o qué parte de lo que reclamaste se devolvió al inquilino (si eres dueño), cómo afecta tu puntaje, tus insignias y en qué vitrinas apareces. Se guardan mientras exista tu cuenta. Puedes descargarlos en un archivo cuando quieras. Es gratis.',
  descargar: 'Descargar mis datos', corregir: 'Corregir o pedir revisión', eliminar: 'Eliminar mi cuenta',
}

// LEGAL: revisado (25/10) · REP-11
export const CORREGIR = {
  titulo: '¿Ves un error en tu puntaje o en tus insignias?',
  boton: 'Corregir o pedir revisión',
  intro: 'Toca [Corregir o pedir revisión], elige el alquiler, explica qué está mal y adjunta pruebas si las tienes.',
  puntos: [
    '**Al instante:** te enviamos un acuse con la fecha y la hora, y tu puntaje público pasa a decir «En revisión». Mientras lo revisamos, ese alquiler no cuenta.',
    '**En un máximo de 5 días hábiles:** te respondemos por escrito. Si tenías razón, corregimos o borramos el dato ese mismo día y te avisamos.',
    '**Si no estás de acuerdo con la respuesta:** puedes presentar una denuncia ante la PRODHAB (www.prodhab.go.cr) o acudir a los tribunales.',
  ],
  parrafos: [
    '**Pedir revisión de un hecho:** aunque el cálculo esté bien, puedes pedir que revisemos un hecho concreto (por ejemplo, un descuento del depósito o un reclamo que crees que se registró mal). Seguimos el mismo trámite y los mismos plazos.',
    '**Derecho de respuesta:** si un dato publicado sobre ti afecta tu reputación, puedes pedir que junto a tu perfil se muestre una nota breve tuya (hasta 300 caracteres) mientras lo revisamos, o que se oculte ese dato hasta resolver.',
    'Escríbenos también a business.applockumi@gmail.com desde tu correo registrado.',
  ],
}

// LEGAL: revisado (25/10) · REP-12 Avisos de cambio de puntaje y de los 10 años.
export const AVISO_CAMBIO = { titulo: 'Tu puntaje cambió', texto: 'Tu puntaje pasó de {antes} a {después} por el cierre del alquiler {alquiler} el {fecha}.',
  porque: 'Ver por qué', revision: 'Pedir revisión', nota: 'Si crees que hay un error, pide una revisión: mientras la revisamos, tu puntaje dice «En revisión».' }
export const AVISO_VENCIDO = { titulo: 'Un hecho dejó de contar en tu puntaje', texto: 'Pasaron 10 años desde {hecho} y lo borramos de tu reputación. Tu puntaje ahora es {después}.' }

// LEGAL: revisado (25/10) · REP-05 Insignias y Llave Lockumi (sin «verificado»)
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

// LEGAL: revisado (25/10) · REP-07 (pie) y C.9
export const VITRINA = {
  orden: 'Ordenado por cantón y rango de precio, no por puntaje. Una de cada tres tarjetas es para personas nuevas en Lockumi.',
  espacio: 'Espacio para nuevos',
  pie: (quienes: 'dueños' | 'inquilinos') => `Solo aparecen ${quienes} que eligieron aparecer. Destacados: 3 o más alquileres cerrados. Espacios para nuevos: de 0 a 2 alquileres cerrados. Todos los perfiles muestran su puntaje desde el 3.er alquiler cerrado. Publicamos la vitrina si en el cantón hay al menos 10 personas.`,
  nuevos: 'Una de cada tres tarjetas es un Espacio para nuevos: personas con 0 a 2 alquileres cerrados que eligieron aparecer. Todavía no tienen puntaje; eso no dice nada malo de ellas.',
  vacio: 'Todavía no hay suficientes personas en esta zona para mostrar una lista.',
}

// LEGAL: revisado (25/10) · textos de pantalla nuevos, redactados para este paso (no salen de Legal).
export const UI = {
  entradaTitulo: ENTRADA.titulo,
  miPerfil: 'Mi perfil · solo lo ves tú',   // maqueta, sección 7
  asiTeVen: 'Así te ven en tu perfil público.',
  comoSeCalcula: 'Cómo se calcula',
  queEsLlave: `Qué es la ${NOMBRE_LLAVE}`,
  corregir: CORREGIR.boton,
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
  // LEGAL: revisado (25/10) · ayuda debajo del nombre visible (texto literal de Legal)
  nombreAyuda: 'Escribe tu nombre y la inicial de tu apellido, por ejemplo «Ana V.» o «Ana María V.». Así se verá en tu perfil.',
  canton: 'Tu cantón',
  cantonAyuda: 'Mostramos tu cantón, o tu provincia si en tu cantón hay menos de 10 personas. Nunca el barrio ni la dirección.',
  elegirCanton: 'Elige tu cantón',
  continuar: 'Continuar', volver: 'Volver', ahoraNo: 'Ahora no', listo: 'Listo',
  // LEGAL: revisado (25/10) · textos literales de Legal (revisión de c887895)
  errNombre: 'Escribe tu nombre y la inicial de tu apellido con punto, por ejemplo «Ana V.» o «Ana María V.».',
  errNombreLargo: 'Usa solo tu nombre y la inicial de tu apellido, por ejemplo «Ana V.». Máximo 30 letras.',
  errCanton: 'Elige tu cantón en la lista. Está ordenada por provincia.',
  // LEGAL: revisado (25/10) · si falla «Descargar mis datos» en modo servidor
  errDescarga: 'No pudimos descargar tus datos. Revisa tu conexión y vuelve a tocar «Descargar mis datos».',
  // LEGAL: revisado (25/10) · ronda 4:41 · si el servidor no recibe la solicitud de «Eliminar mi cuenta» (texto de Legal)
  errBorrado: 'No pudimos enviar tu solicitud para eliminar la cuenta. Revisa tu conexión y vuelve a tocar «Eliminar mi cuenta». Si sigue igual, sal de Lockumi y vuelve a entrar con tu correo.',
  errCasilla: 'Para aparecer, marca la casilla. Si prefieres no aparecer, toca «Ahora no».',
  activar: 'Activar',
  opcion: { destacados: 'Destacados', nuevos: 'Nuevos en Lockumi' } as Record<'destacados' | 'nuevos', string>,
  // Redacción nuestra, LEGAL: revisado (25/10).
  datosNota: 'Último paso: estos datos se publican en tu perfil.',
  aceptadoEl: (f: string, h: string) => `Aceptaste tu perfil de reputación el ${f} a las ${h}.`,
  revTitulo: 'Pedir revisión',
  revAlquiler: 'Alquiler', revElegir: 'Elige el alquiler', revTexto: 'Qué está mal', revNota: 'Nota para tu perfil (opcional, hasta 300 caracteres)',
  revEnviar: 'Pedir revisión',
  revAcuse: (f: string, h: string, l: string) => `Recibimos tu pedido el ${f} a las ${h} (hora de Costa Rica). Te respondemos por escrito a más tardar el ${l}. Mientras tanto, ese alquiler no cuenta y tu puntaje público dice «En revisión».`,
  revPendientes: 'Revisiones pedidas',
  errRevAlquiler: 'Elige el alquiler que quieres que revisemos.',
  errRevTexto: 'Explica qué está mal para que podamos revisarlo.',
  errRevNota: 'La nota puede tener hasta 300 caracteres. Acórtala e inténtalo otra vez.',
  entendido: 'Entendido',
  salir: 'Salir',
  verVitrinaOpcion: 'Ver si quieres aparecer en la vitrina',
  aparecesListo: 'Listo. Ya apareces en la vitrina de tu cantón.',
  nuevoTitulo: 'Nuevo en Lockumi',
  // Legal (26/10/2026, opción b): si la aceptación del perfil no llega al servidor, la casilla dentro de crear o unirse no deja seguir.
  errPerfil113: 'No pudimos guardar tu perfil de reputación. Revisa tu conexión y vuelve a marcar la casilla.',
  errGuardar: 'No pudimos guardar en este navegador. Libera espacio (por ejemplo, con «Reiniciar demo») e inténtalo otra vez.',
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
  queSePublica: SE_PUBLICA_TITULO,
  queNoSePublica: NO_SE_PUBLICA_TITULO,
  datosVacio: 'Todavía no tienes alquileres cerrados en Lockumi.',
  descuento: (p: number) => `Descuento del depósito: ${p} %`,
  sinDescuento: 'Sin descuento del depósito',
  vale: (v: string) => `Vale ${v}`,
}

/** Reemplaza {variable} (admite tildes y espacios, como {nombre visible} o {cantón}). */
export const conVars = (t: string, v: Record<string, string | number>) => t.replace(/\{([^}]+)\}/g, (m, k: string) => k in v ? String(v[k]) : m)
