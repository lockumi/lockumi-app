import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { guardaCorreos, CARPETAS_GUARDA, revisaGuarda, type Archivo } from './api/_lib/guarda-correos.js'

/** Archivos de src/, api/ y supabase/migrations/ para la guarda de las marcas «LEGAL: revisar». */
function archivosGuarda(): Archivo[] {
  const r: Archivo[] = []
  const ver = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n)
    if (statSync(p).isDirectory()) { if (n !== 'node_modules' && n !== '__tests__') ver(p) } else if (revisaGuarda(p)) r.push({ ruta: p, texto: readFileSync(p, 'utf8') }) } }
  for (const c of CARPETAS_GUARDA) ver(c)
  return r
}

// https://vite.dev/config/
export default defineConfig({
  // guardaCorreos: el build de producción falla mientras quede alguna marca «LEGAL: revisar» (textos de los correos y marcas en src/,
  // api/ y supabase/migrations/; api/_lib/guarda-correos.ts).
  plugins: [react(), guardaCorreos(process.env, archivosGuarda)],
  base: '/', // absoluta: la app también se sirve desde rutas como /terminos (ver vercel.json)
})
