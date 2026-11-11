# E2E automática

- Hora: 11 nov 2026, 7:31 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CBMSAJBDQFXLDZQTKAPMDXE55AAEOQ4TN4SPCRK3QTLK7RVEGUO7VVMQ · liberación https://stellar.expert/explorer/testnet/tx/4965acf0663652d0d068c7e5fcc06585104e3c034d31a1b08f215fe0fd0765cd
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 12.4 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 8.6 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.9 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.8 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 7.2 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.1 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.1 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 6.0 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 69.5 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
