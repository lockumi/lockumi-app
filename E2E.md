# E2E automática

- Hora: 24 oct 2026, 11:16 p. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 22 ✔ · 1 ✘ · 1 omitidas
- Red de prueba: escrow CCEPNOKWJQKA54FNN2YSX2YPQUTI62RBWVKXN63NCONBR3USPEGJE33O · liberación https://stellar.expert/explorer/testnet/tx/40715e568ad707057896c442e2ad2c9e0047566cf1c3116beb6e5864d7c551fa
- disputeResolver: GCTLNUBVQF2X26II7UFZMPPWOISX325DABCZU6ZJ3NJC3A3FA2U5TJ4G (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 7.8 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 7.2 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 5.7 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 3.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 3.0 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 2.4 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 2.6 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 2.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 2.9 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.5 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 2.3 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 2.6 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 2.5 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 2.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 2.4 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 3.1 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 2.3 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✔ | 3.4 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✔ | 2.4 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.3 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✔ | 3.1 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✔ | 1.8 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✘ | 68.2 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
