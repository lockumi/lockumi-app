// Paso 19 · Vitrina de EJEMPLO: personas ficticias (Legal, D.11: hasta saber si hay que inscribir la base ante la PRODHAB, la vitrina
// de la demo muestra solo perfiles ficticios marcados «Ejemplo»). Solo cantón: nunca barrio ni distancia.
import type { Rol } from '../types'
import type { Insignia } from './puntaje'

export interface Ejemplo { nombre: string; rol: Rol; canton: string; precio: number; cerrados: number; valor: number | null; mostrar: boolean; llave: boolean; insignias: Insignia[] }
const T: Insignia[] = ['contrato', 'deposito', 'fotos-entrada', 'fotos-salida']
const d = (nombre: string, precio: number, cerrados: number, valor: number | null, mostrar = true, llave = false, extra: Insignia[] = ['devolvio']): Ejemplo =>
  ({ nombre, rol: 'dueno', canton: 'Escazú', precio, cerrados, valor, mostrar, llave, insignias: cerrados ? [...T, ...extra] : ['contrato', 'deposito'] })
const i = (nombre: string, precio: number, cerrados: number, valor: number | null, mostrar = true, llave = false): Ejemplo =>
  ({ ...d(nombre, precio, cerrados, valor, mostrar, llave, ['recibio']), rol: 'inquilino' })

// 10 o más por lista: la vitrina se publica por cantón (Escazú).
export const EJEMPLOS: Ejemplo[] = [
  d('Laura V.', 650, 14, 4.8, true, true), d('Rodrigo S.', 900, 11, 4.9, true, true), d('Carmen A.', 720, 6, 4.6), d('Diego M.', 1100, 4, 3.9, false),
  d('Patricia L.', 560, 8, 5, true), d('Esteban R.', 800, 5, 4.4, false), d('Sofía G.', 1300, 3, 5), d('Marco T.', 480, 7, 4.7),
  d('Andrea C.', 610, 1, null), d('Pablo N.', 990, 0, null), d('Julia F.', 750, 2, null),
  i('Ana M.', 600, 7, 5, true), i('Luis P.', 450, 3, 4.7), i('Valeria Q.', 800, 5, 4.9, false), i('Andrés K.', 700, 4, 4.2, false),
  i('Natalia B.', 550, 9, 4.8, true, true), i('José H.', 1000, 6, 4.5), i('Mariana D.', 650, 3, 5), i('Gabriel O.', 900, 12, 4.9, true, true),
  i('Daniela E.', 500, 0, null), i('Tomás W.', 750, 2, null), i('Lucía Z.', 620, 1, null),
]
