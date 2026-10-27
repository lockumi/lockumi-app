# E2E automática

- Hora: 27 oct 2026, 5:33 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 6 ✔ · 17 ✘ · 3 omitidas
- Red de prueba: escrow CDZKGO45CHXBWS2RTYJZPRIU65G7QNW2WV5Z5WRMZZSOU2FFEW4XCTPU · liberación https://stellar.expert/explorer/testnet/tx/97bcf97290d7e014ff81e00f363f5d56eb9125c7f81b0c6d9fbb61bb212dc9f7
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 7.2 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 5.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 4.5 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.2 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.3 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.2 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.6 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 64.6 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
