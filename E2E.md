# E2E automática

- Hora: 25 oct 2026, 1:02 a. m. (hora de Costa Rica)
- URL: https://app.lockumi.com
- Evento: status
- Resultado: 23 ✔ · 0 ✘ · 1 omitidas
- Red de prueba: escrow CDUMU35FKVMELPAQO3CTJRAYBFUKDG2GTG3YYCZL5UZDWQU4CHXYV5F2 · liberación https://stellar.expert/explorer/testnet/tx/e861368d9aa1f3dda21f589c110228a7b1df1bbc73030a625ea2e7d68daf8e97
- disputeResolver: GCTLNUBVQF2X26II7UFZMPPWOISX325DABCZU6ZJ3NJC3A3FA2U5TJ4G (modo fase 1 (plataforma); ¿es el mediador? sin clave pública configurada)

| Prueba | Papel | Resultado | Duración |
|---|---|---|---|
| crear.e2e.ts › crear alquiler de prueba | inquilino | ✔ | 9.9 s |
| crear.e2e.ts › crear alquiler de prueba | dueno | ✔ | 6.6 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | inquilino | ✔ | 7.2 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | inquilino | ✔ | 3.8 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | inquilino | ✔ | 3.5 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | inquilino | ✔ | 3.1 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | inquilino | ✔ | 3.2 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | inquilino | ✔ | 3.0 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | inquilino | ✔ | 3.8 s |
| estados.e2e.ts › estados del alquiler › inicio con la lista de alquileres | dueno | ✔ | 4.0 s |
| estados.e2e.ts › estados del alquiler › detalle firmas | dueno | ✔ | 2.7 s |
| estados.e2e.ts › estados del alquiler › detalle en_curso | dueno | ✔ | 2.4 s |
| estados.e2e.ts › estados del alquiler › detalle ventana_reclamo | dueno | ✔ | 2.3 s |
| estados.e2e.ts › estados del alquiler › detalle reclamo | dueno | ✔ | 2.0 s |
| estados.e2e.ts › estados del alquiler › detalle mediacion | dueno | ✔ | 2.3 s |
| estados.e2e.ts › estados del alquiler › detalle cerrado | dueno | ✔ | 2.9 s |
| paginas.e2e.ts › páginas públicas › entrar | inquilino | ✔ | 3.0 s |
| paginas.e2e.ts › páginas públicas › terminos | inquilino | ✔ | 5.6 s |
| paginas.e2e.ts › páginas públicas › privacidad | inquilino | ✔ | 2.3 s |
| paginas.e2e.ts › páginas públicas › entrar | dueno | ✔ | 2.4 s |
| paginas.e2e.ts › páginas públicas › terminos | dueno | ✔ | 4.5 s |
| paginas.e2e.ts › páginas públicas › privacidad | dueno | ✔ | 1.7 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | inquilino | ✔ | 69.3 s |
| red.e2e.ts › depósito y devolución reales en la red de prueba + disputeResolver | dueno | — | 0.0 s |

Capturas: artefacto «capturas» (capturas/<bloque>/<papel>-<nombre>.png); reporte HTML y videos: artefacto «reporte».
