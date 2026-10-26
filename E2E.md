# E2E automática

- Hora: 25 oct 2026, 11:08 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 16 ✔ · 7 ✘ · 3 omitidas
- Red de prueba: escrow CBHBIJKU56F4MGKSHWEFI6IN5OMY75ZATFCADN757XGDF6X7G5BV6ZA5 · liberación https://stellar.expert/explorer/testnet/tx/aa8da5bce8db21599c7f8579439694eabcddd4c69bbef2387166100715a4a2a7
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 124.3 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 124.4 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 4.1 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 3.9 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 2.9 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 2.5 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 2.8 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 3.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 2.9 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 2.0 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 1.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 1.6 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 1.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 1.5 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 1.6 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.4 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.5 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 67.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
