# E2E automática

- Hora: 24 nov 2026, 10:57 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CDCATL4CDUQNCPCHAQGDKRG5GC4H4W3MPP57X3YMR25QXBM3VUETLM3H · liberación https://stellar.expert/explorer/testnet/tx/aa7c9a304f9a6a3876bf58dd9c3c542a663f834a15166e25649d0857238454f8
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 8.6 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 7.1 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.2 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.7 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.9 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.6 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.7 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 54.4 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
