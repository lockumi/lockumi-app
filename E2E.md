# E2E automática

- Hora: 26 oct 2026, 8:52 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 6 ✔ · 17 ✘ · 3 omitidas
- Red de prueba: escrow CAVIEHFKR5H5A3QPHCR6GIR5QKO3H275LCSMJEZW7OM43QMN4V2O3DD2 · liberación https://stellar.expert/explorer/testnet/tx/293f2ac18e93e06ebd6b921c0e3dbfe6be7890d88fe8436768113460572292e1
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 10.8 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 7.0 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 7.2 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 7.1 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 7.3 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 7.2 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.8 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 7.3 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.6 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.3 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.3 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 3.0 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 68.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
