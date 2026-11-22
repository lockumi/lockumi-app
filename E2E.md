# E2E automática

- Hora: 22 nov 2026, 8:01 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CADLJMG6S3ULQDU5G5LDXKL57FXSSVY7KJAN7F4EVAUISQKNKRQKIRJ4 · liberación https://stellar.expert/explorer/testnet/tx/22371f560b7c8168a1f6c66ff3f8678042b9fb6a272c11c850bdd850939b7308
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 122.7 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 5.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.6 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.5 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.3 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.7 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 49.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
