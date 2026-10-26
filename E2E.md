# E2E automática

- Hora: 25 oct 2026, 10:51 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 16 ✔ · 7 ✘ · 3 omitidas
- Red de prueba: escrow CAMZS4NYGQ54RFPL3ZQEOILCG5OIM422KAMOIMKT4U566NOXW6JH26WW · liberación https://stellar.expert/explorer/testnet/tx/ca101f770cc2fded67d5fd198786869b3a739b41719b0df05f096e1c5dc19cb4
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 123.5 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 123.6 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 5.3 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 3.5 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 2.9 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 2.2 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 2.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 2.3 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 2.8 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.3 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 1.9 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 1.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 1.6 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 1.8 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 1.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 1.7 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.1 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.3 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.8 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.7 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 68.7 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
