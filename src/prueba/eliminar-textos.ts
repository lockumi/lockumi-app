// PROTOTIPO · LEGAL: pendiente. Todos estos textos son una PROPUESTA (26/10/2026) y no se publican sin el OK de Legal y de Katherine.
export const T = {
  mas: 'Más opciones',
  puedeEliminar: 'Todavía no hay depósito, así que puedes eliminar este alquiler.',
  botonEliminar: 'Eliminar este alquiler',
  puedeOcultar: 'Puedes quitarlo de tu lista. No se borra el contrato ni el historial, y la otra persona lo sigue viendo.',
  botonOcultar: 'Ocultar de mi lista',
  estaOculto: 'Está oculto en tu lista.',
  botonMostrar: 'Volver a mostrarlo',
  esperar: 'Este alquiler tiene un depósito guardado, así que no se puede eliminar ni ocultar. Cuando termine y se devuelva el depósito, podrás ocultarlo de tu lista.',

  tituloEliminar: '¿Eliminar este alquiler?',
  eliminarPuntos: (dos: boolean) => [
    'Se borra de tu lista, con su contrato sin firmar y sus datos.',
    dos ? 'La invitación deja de funcionar. Si la otra persona abre el enlace, verá que ya no es válido.' : 'Todavía no hay depósito, así que no se mueve dinero.',
    'No se puede deshacer.',
  ],
  si: 'Sí, eliminar', no: 'No, volver',

  tituloOcultar: '¿Ocultar este alquiler de tu lista?',
  ocultarPuntos: [
    'Deja de verse en «Tus alquileres». Lo encuentras en «Ver ocultos».',
    'No se borra el contrato, las fotos ni el historial.',
    'La otra persona lo sigue viendo igual.',
  ],
  siOcultar: 'Sí, ocultar',

  tituloReiniciar: '¿Reiniciar tu demo?',
  reiniciarIntro: 'Solo cambia tus alquileres de prueba. No toca los de otras personas ni ningún depósito.',
  reiniciarEliminar: (n: number) => n === 1 ? 'Se elimina 1 alquiler sin depósito:' : `Se eliminan ${n} alquileres sin depósito:`,
  reiniciarOcultar: (n: number) => n === 1 ? 'Se oculta 1 alquiler (lo ves en «Ver ocultos»):' : `Se ocultan ${n} alquileres (los ves en «Ver ocultos»):`,
  reiniciarQuedan: (n: number) => n === 1 ? 'Se queda 1 alquiler con depósito guardado. Termínalo primero:' : `Se quedan ${n} alquileres con depósito guardado. Termínalos primero:`,
  reiniciarNada: 'No hay nada que reiniciar: no tienes alquileres de prueba en tu lista.',
  siReiniciar: 'Sí, reiniciar mi demo',
  botonReiniciar: 'Reiniciar mi demo',

  listoEliminar: (d: string) => `Eliminaste «${d}». No se movió dinero.`,
  listoOcultar: (d: string) => `Ocultaste «${d}». Lo encuentras en «Ver ocultos».`,
  listoReiniciar: (e: number, o: number) => `Listo, reiniciaste tu demo: ${e} ${e === 1 ? 'alquiler eliminado' : 'alquileres eliminados'} y ${o} ${o === 1 ? 'oculto' : 'ocultos'}.`,
  listoQuedan: (q: number) => q === 1 ? '1 alquiler sigue en tu lista porque tiene un depósito guardado.' : `${q} alquileres siguen en tu lista porque tienen un depósito guardado.`,
  chipOculto: 'Oculto',
  verOcultos: (n: number) => `Ver ocultos (${n})`,
  esconderOcultos: 'Esconder los ocultos',
  cerrar: 'Cerrar aviso',

  errDeposito: 'No pudimos eliminarlo porque ya tiene un depósito guardado. Cuando el alquiler termine y se devuelva el depósito, podrás ocultarlo de tu lista.',
  errUnido: 'No pudimos eliminarlo porque la otra persona ya aceptó la invitación. Puedes ocultarlo de tu lista desde el alquiler.',
  errNoEsta: 'Este alquiler ya no está en tu lista. Vuelve a «Tus alquileres».',
  errNoEsTuyo: 'Este alquiler es de otra persona, así que no puedes cambiarlo. Vuelve a «Tus alquileres».',
  volverAlquiler: 'Volver al alquiler',
  errRed: (boton: string) => `No pudimos conectarnos. Revisa tu internet y vuelve a tocar «${boton}».`,
}
