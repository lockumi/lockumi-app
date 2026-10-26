# E2E automática

- Hora: 26 oct 2026, 12:15 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 16 ✔ · 7 ✘ · 3 omitidas
- Red de prueba: escrow CCSK3GH66NFAJ24ZJOFYVO5PKSGAY6ZFH5O4H4I3SM22QSJG6ENPHKXZ · liberación https://stellar.expert/explorer/testnet/tx/7e70c4d362d44a84a12c69f87dac50d411f21a7270143fb417fc0bdf29e83e3e
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 124.2 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 124.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 8.6 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 4.2 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 3.7 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 2.7 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 2.7 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 3.1 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 3.4 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 2.1 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 1.7 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 1.4 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 1.7 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 1.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 2.2 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.3 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.4 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 70.0 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
