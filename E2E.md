# E2E automática

- Hora: 15 nov 2026, 10:34 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CCL6GAQELYWQKVTO5GUYSZUTJ7ZVMA5BBTGAUA5VNUY775EOCSGNRBC2 · liberación https://stellar.expert/explorer/testnet/tx/2cce39de4f6d09b90d7b2ed6c784a255b8b6b16e3166f4132d3e277dbc91bd8f
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 123.9 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 8.6 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 5.9 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.5 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.0 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.7 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 54.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
