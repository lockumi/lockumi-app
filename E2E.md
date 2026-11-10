# E2E automática

- Hora: 9 nov 2026, 7:14 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CCGUO44E4KMBWSA6THDMYU7YON4SPVDYU6R2LR6O7ZYNKLAK4RFG43KN · liberación https://stellar.expert/explorer/testnet/tx/a114ffffa8f76c80ea0ae203beab321dd083273d9c76762f6122135c32d4d9e8
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 122.6 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 5.4 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 5.8 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 2.9 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.5 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.5 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.5 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.6 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.6 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 160.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
