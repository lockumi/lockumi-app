// Paso 19 · Interruptor de la reputación. APAGADO por defecto: solo se enciende con VITE_REPUTACION=1 al compilar.
// No está en .env.production ni en Vercel: con el interruptor apagado la app se ve igual que master (prueba: __tests__/apagado.test.tsx).
export const reputacionActiva = () => import.meta.env.VITE_REPUTACION === '1'
