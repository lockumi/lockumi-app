# E2E automática

- Hora: 26 oct 2026, 3:22 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 6 ✔ · 17 ✘ · 3 omitidas
- Red de prueba: escrow CBKPWEMP4RKQPRLFXOZ2YN5YXUA4UML7LFDUT76L4B6HQ7ATLRDBV6F2 · liberación https://stellar.expert/explorer/testnet/tx/50b1571573f5413a88e8b9052ebf883a3207df63665e5f4a167b8df1dff274e9
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 13.2 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 8.4 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 7.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 7.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 5.5 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 8.0 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 3.2 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.4 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 3.2 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 69.0 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
