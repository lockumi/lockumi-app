# E2E automática

- Hora: 26 oct 2026, 12:09 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 16 ✔ · 7 ✘ · 3 omitidas
- Red de prueba: escrow CBXEVOKK54THU6SRNKNRFJNBPN6LJ5I34X42BWBYFRXJI6ZYFHPHZ7JC · liberación https://stellar.expert/explorer/testnet/tx/94739af54fe501f4afff7e556e8313d5b63860e8ec7252c591e23570b1d1dbe8
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 124.7 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 124.7 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 4.0 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 3.9 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 2.6 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 2.8 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 2.8 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 3.4 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.9 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 2.2 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 1.9 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 1.7 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 1.7 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 1.8 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 2.3 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.8 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.4 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 68.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
