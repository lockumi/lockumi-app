import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { guardaCorreos } from './api/_lib/guarda-correos.js'

// https://vite.dev/config/
export default defineConfig({
  // guardaCorreos: el build de producción falla mientras algún texto de correo tenga «LEGAL: revisar» (api/_lib/textos-correos.ts).
  plugins: [react(), guardaCorreos(process.env)],
  base: '/', // absoluta: la app también se sirve desde rutas como /terminos (ver vercel.json)
})
