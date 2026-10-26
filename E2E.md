# E2E automática

- Hora: 26 oct 2026, 11:21 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 6 ✔ · 17 ✘ · 3 omitidas
- Red de prueba: escrow CAHDX6CPJPABTDX2UQFFBPTJ2W7ZIZRVCLJP4RGZB2HTZPBIUF4RQNZZ · liberación https://stellar.expert/explorer/testnet/tx/eee2260e0f77626e2ddfbfbb6f0234da1079db9c1a31c2feca4d991ac34bae2c
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 10.5 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 7.2 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 5.5 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 7.1 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 7.3 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 7.3 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 7.2 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 5.5 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.8 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 7.1 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 7.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 7.6 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 3.2 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.3 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.3 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.8 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 90.5 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
