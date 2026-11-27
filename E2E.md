# E2E automática

- Hora: 27 nov 2026, 2:48 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 4 ✔ · 19 ✘ · 3 omitidas
- Red de prueba: escrow CD2W3LEEPY4WQQT7J5JESYOJXO7SSUQ26JMS6AYKH2MG5YBFVNW2M3YT · liberación https://stellar.expert/explorer/testnet/tx/9ec99f9fd991e12ccc814a412f7f134e01775df22387c225e1b8469e780e5a67
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✘ | 121.8 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✘ | 4.9 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 4.6 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 2.9 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 5.9 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.2 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.6 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.3 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.6 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.6 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 63.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
