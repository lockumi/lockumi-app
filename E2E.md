# E2E automática

- Hora: 26 nov 2026, 10:19 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CCNGA3XVAZUS6LZPPPDJRA2YJM66NSIGJX2MYS7LKMHKHQTMVE4GBGP4 · liberación https://stellar.expert/explorer/testnet/tx/a69af7f0420f00fe1d3d9be9f32f6162f71f355dbeb34c8530ea0a32ad5c679f
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 11.6 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 8.8 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.3 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.8 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.9 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.3 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 64.0 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
