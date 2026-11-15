# E2E automática

- Hora: 14 nov 2026, 10:35 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CC7ZAYTMFQYUCRRCOKS2PV56L7FTTKXQ3PHD4R2PD4LZ52G2GFH2PUIO · liberación https://stellar.expert/explorer/testnet/tx/7312e2fb761605727ba64a41bf38d8a4c0256748ab850e9e4d31ed3c8e46eaf6
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 11.3 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 9.1 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.3 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 7.0 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.1 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.1 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 6.0 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 58.6 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
