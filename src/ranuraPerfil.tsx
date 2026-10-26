// Legal (26/10/2026, opción b): la casilla de los Términos 1.13-demo para una cuenta sin perfil, dentro de «Crear alquiler» y de la
// invitación. La pone src/reputacion/Pantallas.tsx (solo con VITE_REPUTACION=1); este archivo no importa nada de la reputación, así que
// con el interruptor apagado no hay casilla y el código de la reputación sigue sin entrar en el build.
import { createContext, useContext, type ReactNode } from 'react'

export interface RanuraPerfil { casilla: ReactNode; lista: boolean }
export const RanuraPerfilContexto = createContext<RanuraPerfil | null>(null)
/** La casilla del perfil y si ya está aceptada (null: no hace falta, sigue como siempre). */
export const useRanuraPerfil = () => useContext(RanuraPerfilContexto)
