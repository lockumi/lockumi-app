# E2E automática

- Hora: 26 oct 2026, 9:02 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 6 ✔ · 17 ✘ · 3 omitidas
- Red de prueba: escrow CADXOB4XGSQRNVB5EKNIFB6TXSVSRE4NZUBE6RD3DL7QOG4CSLOBGVWW · liberación https://stellar.expert/explorer/testnet/tx/fe0daef8c3366c105b6f94245369b47c5988ee66fd5b47cd3174bdbb25b442b7
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 11.1 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 8.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 5.6 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 7.1 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 7.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 7.1 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 5.9 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 7.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 7.1 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 7.6 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 3.2 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 3.1 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 79.3 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
