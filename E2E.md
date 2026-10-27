# E2E automática

- Hora: 27 oct 2026, 10:18 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CDHJJGHTS4FVXMIK4DUUVNU33PCZA23VAAWA3TM7VFU6ADM7PLICUTCS · liberación https://stellar.expert/explorer/testnet/tx/db6bf369038f70741d94b381eae3fda4d587ad30da9e4a689532eca91f917541
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 124.2 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 124.2 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.6 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.3 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.7 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 67.3 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
