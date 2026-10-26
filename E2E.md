# E2E automática

- Hora: 25 oct 2026, 7:25 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 18 ✔ · 5 ✘ · 1 omitidas
- Red de prueba: escrow CBWBUUGDB3ATECUCOAFI3A3NHFTXMRYZ3KZD4ZJDD5LZSNGD4QUUN5L7 · liberación https://stellar.expert/explorer/testnet/tx/e28f805d3c4085f971b1565f814b371dc45e92cc1a3f472540666002655cdfcc
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 13.5 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 6.9 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 11.8 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 5.4 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 4.9 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 3.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 3.4 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 4.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 4.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.1 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 3.8 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 3.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 3.1 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 2.6 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 3.1 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 3.6 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.7 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.4 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.8 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 71.0 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
