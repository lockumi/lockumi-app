# E2E automática

- Hora: 27 oct 2026, 7:07 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 6 ✔ · 17 ✘ · 3 omitidas
- Red de prueba: escrow CAOKRONALDS4NGR7RIJXANZTF3I2WQXSEPZ33A5Y5HZ6DXCVIXWI36R7 · liberación https://stellar.expert/explorer/testnet/tx/2043e2b44450c4d76b0897195ffa97e2613f56c66cb336f22edd96f94b2d2ab4
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 7.6 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 6.0 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 4.8 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.7 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.7 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.2 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.5 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.5 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.7 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 74.3 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
