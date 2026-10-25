// Interruptor de la prueba completa (Términos 1.7-demo). APAGADO en producción hasta el PR 10: solo se enciende si la app se
// compila con VITE_PRUEBA_COMPLETA=1 (builds locales y E2E). Con el interruptor apagado, app.lockumi.com se ve y funciona igual
// que con la 1.6-demo. Es una función (no una constante) para que las pruebas puedan encenderlo con vi.stubEnv.
export const pruebaCompleta = (): boolean => import.meta.env.VITE_PRUEBA_COMPLETA === '1'

// paso16-unido · Correos (paso 11): los avisos y la invitación por correo solo se envían con su propio interruptor, VITE_CORREOS=1,
// y con la prueba completa. Apagado, la app no muestra «Recibir los avisos por correo» y los textos legales no hablan de correos.
export const correosActivos = (): boolean => pruebaCompleta() && import.meta.env.VITE_CORREOS === '1'
