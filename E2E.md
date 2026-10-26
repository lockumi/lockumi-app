# E2E automática

- Hora: 26 oct 2026, 2:31 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 6 ✔ · 17 ✘ · 3 omitidas
- Red de prueba: escrow CDVYX6NWEEREIJGHHQ5ISGHUNLCUZVZIDFYVPROYWFJ4SRKBTOEDZGJO · liberación https://stellar.expert/explorer/testnet/tx/c98d56d7472d0636c4ab2399df89f06fc6765cfd49428f2297ca182d2681e66a
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 12.1 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 8.5 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.7 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 7.4 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.5 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.3 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 3.0 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 69.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
