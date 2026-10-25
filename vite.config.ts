import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { guardaEncendido } from './src/legal/encendido.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Paso 19: el build falla si se enciende la reputación sin la fecha real de encendido (src/legal/encendido.ts).
  plugins: [react(), guardaEncendido({ ...loadEnv(mode, process.cwd(), ''), ...process.env })],
  base: '/', // absoluta: la app también se sirve desde rutas como /terminos (ver vercel.json)
}))
