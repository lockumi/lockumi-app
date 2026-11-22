# E2E automática

- Hora: 21 nov 2026, 10:52 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CD7Z25WAVY7PXQ52K64WKUHO746Q2WWMOGDUXF555UOB2QYJIHOL27GG · liberación https://stellar.expert/explorer/testnet/tx/1b2fd3b98fcab37939d3b6c0757e3f345058d90d84bea21f902d26d58e846c75
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 123.2 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 5.0 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.3 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.5 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.7 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.2 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 54.4 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
