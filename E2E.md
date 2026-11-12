# E2E automática

- Hora: 12 nov 2026, 1:32 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CDXGETG45AKHH2ODN55JY4GB22SRQ7YPQXGNOL4MDMXBUA2HFBQFQMEE · liberación https://stellar.expert/explorer/testnet/tx/e24d114141cef7ee7391498538309b8b97c23b3074606beaccaafcab99299119
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 124.0 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 8.4 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.6 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.6 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.5 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.4 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 6.0 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 59.3 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
