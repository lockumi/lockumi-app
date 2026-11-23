# E2E automática

- Hora: 22 nov 2026, 11:30 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CB6ZV3VZHG5Y37JZM6LHDZEWWBESF3N6TRHTIZMHG2HU4LV7BK5V3M4V · liberación https://stellar.expert/explorer/testnet/tx/0916b1aa9dd0d00b36ae33e167e00d2aa5a56019fb7c1ca71c7a4528aa2de2dc
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 13.0 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 9.0 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 7.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.0 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.8 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.2 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.1 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 63.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
