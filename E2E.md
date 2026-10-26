# E2E automática

- Hora: 26 oct 2026, 2:28 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CB6JTPDTPE7THTISZSIWTTPBY6NOX7JTC3XJXCIE4IBEY4MBS2LQSC6S · liberación https://stellar.expert/explorer/testnet/tx/a6740afd4b903d99b25aecaba39d3002eb2159969cf09ff65c7ef9a418fa8a3e
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 124.4 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 124.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 4.6 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 7.5 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.3 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.7 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 3.2 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.7 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 68.1 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
