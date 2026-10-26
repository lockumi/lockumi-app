# E2E automática

- Hora: 26 oct 2026, 12:51 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 16 ✔ · 7 ✘ · 3 omitidas
- Red de prueba: escrow CA2R7OWULFHBDVKPQD35YDYST57GA4AA5KYEGA7BGZDEGV3ALSAHDCTI · liberación https://stellar.expert/explorer/testnet/tx/ad686f07fd0cbba1ba3ef57e980577ffb4fdd244e12520728a2ba01b513cf9ae
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 124.4 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 124.4 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 6.7 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 4.7 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 4.3 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 3.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 3.0 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 3.2 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 3.5 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 3.2 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 2.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 2.1 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 1.4 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 2.0 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 1.7 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 2.1 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.7 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.1 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.5 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.9 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 69.2 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
