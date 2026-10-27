// Paso del control del reparto de la persona mediadora («Registrar el acuerdo»).
// Bug de la matriz (fase B, 27/10/2026): en un alquiler de dos personas modoDe da escrowReal=false (los USDC van por /api/tw, modo servidor),
// así que el control quedaba con paso 10 y un reclamo de 4 solo admitía el valor inicial (la mitad): la mediadora no podía registrar el
// monto que las dos partes aceptaron (p. ej. 3) y el servidor exige ese mismo monto. Con dinero real de prueba (red o servidor) el paso es de 0,01,
// igual que el control de cada parte («Reparto que aceptas»).
export const pasoRepartoMediadora = (m: { escrowReal: boolean; servidor: boolean }): number => (m.escrowReal || m.servidor ? 0.01 : 10)
