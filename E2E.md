# E2E automática

- Hora: 17 nov 2026, 6:33 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CAGZQLUDDDK4APLFXIPZZYRTFFFJWAJ6M2GX5A6Z5D7I67N7RZN2AAA2 · liberación https://stellar.expert/explorer/testnet/tx/37d587463db18f7e2130ea271c1cef7e44cd7582caf733356b7356205469aaf0
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 123.3 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 5.5 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 3.7 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 2.8 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.3 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.5 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.4 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.7 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 64.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
