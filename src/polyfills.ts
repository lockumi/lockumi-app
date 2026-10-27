// Vite no incluye Buffer (Next.js sí). El kit de Cavos y sus dependencias (borsh, @solana/web3.js…) usan el Buffer global:
// sin esto, probarFirma lanzaba «ReferenceError: Buffer is not defined» y la entrada mostraba «No pudimos abrir tu cuenta».
// Debe ser la PRIMERA importación de src/main.tsx. No quitar (docs/firma-cavos.md).
import { Buffer } from 'buffer'

const g = globalThis as { Buffer?: typeof Buffer }
g.Buffer ??= Buffer
