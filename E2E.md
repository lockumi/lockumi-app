# E2E automática

- Hora: 25 oct 2026, 7:32 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 18 ✔ · 5 ✘ · 1 omitidas
- Red de prueba: escrow CDBUAOQY24RLD5Z3DR2M6FZS6HPU3JNLFZBDQFZOP6PAJD3DUK26OXZT · liberación https://stellar.expert/explorer/testnet/tx/fc53c0db51574e3def95cb03462289433af1ebacc2dfe9c39375716ad4ab6974
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 13.3 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 7.0 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 8.0 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 4.8 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 4.7 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 3.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 3.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 3.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 4.5 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 2.8 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 2.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 3.7 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 3.1 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 3.3 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 3.6 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 3.8 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 3.7 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.3 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.3 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 3.0 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 6.0 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 75.5 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
