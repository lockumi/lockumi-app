# E2E automática

- Hora: 26 oct 2026, 4:17 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: schedule
- Resultado: 6 ✔ · 17 ✘ · 3 omitidas
- Red de prueba: escrow CDBNJQPHBZCNGF5KNXY624XYDSG72IVX64RBYZKUELWSMKBBMTIIBDWI · liberación https://stellar.expert/explorer/testnet/tx/12a89c5870316df54706faa76943f4a4d6c59dfece212491a16f10944a73d911
- disputeResolver: GDYFRQ7TRNLTWJAH4YSSF3OQWHWAA3QBL5FWRUKGO4FWNBOBRGU7WLZI (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 6.9 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 5.9 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 4.5 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✘ | 6.4 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✘ | 6.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.3 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✘ | 6.1 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✘ | 6.0 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✘ | 6.3 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✘ | 6.5 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✘ | 6.5 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 1.3 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✘ | 5.9 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✘ | 6.0 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 1.5 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✘ | 5.7 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✘ | 5.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 69.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | inquilino | — | 0.0 s |
| reputacion.e2e.ts › reputación con dos cuentas (local, nunca producción) › dueño e inquilino | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
