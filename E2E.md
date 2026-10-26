# E2E automática

- Hora: 25 oct 2026, 7:08 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 18 ✔ · 5 ✘ · 1 omitidas
- Red de prueba: escrow CALDIYB4W3SOAW6HSXWQ5CPRZVQ6ACWR4YHP4GBSNCAENBVX2S7HNBWE · liberación https://stellar.expert/explorer/testnet/tx/7bd32afeca5c887b80046c1b036944a7ff3879dd07ee249d053ce3452af8fff1
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 10.9 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 3.6 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 4.5 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 3.4 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 2.9 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 2.8 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 3.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 3.9 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.6 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 1.6 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 1.4 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 1.4 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 2.7 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 2.1 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 2.6 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 3.2 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.2 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.6 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 105.0 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
