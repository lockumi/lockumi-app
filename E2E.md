# E2E automática

- Hora: 18 nov 2026, 5:53 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CCULCOYJXAYA25KLQOPU3GLAIIYIZFPAGJWOD7TS2EXN6JEGGBLJ5NH6 · liberación https://stellar.expert/explorer/testnet/tx/134cffeb5cba876415c7e69e9ea188cc383342b384ae39f200f859f1ce3dc889
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 12.0 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 8.6 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 8.7 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 7.7 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 7.0 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 7.1 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 7.5 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 7.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.9 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.4 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.3 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.2 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 59.3 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
