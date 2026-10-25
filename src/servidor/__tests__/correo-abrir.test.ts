// Legal 25/10, 5:09 p. m. (punto 4) · COR-C-03: la apertura del aviso del reclamo se registra SOLO al tocar el botón de la página
// de la app (POST). El GET (lo que hace el correo, y también los programas que revisan enlaces) solo muestra la página.
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { PAGINA_ABRIR } from '../../../api/_lib/correos-c'

const T = 'a'.repeat(64), ID = '11111111-2222-4333-8444-555555555555'
const URL_ = `https://app.lockumi.com/api/correo?abrir=${T}`
const red = () => { const urls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (u: string) => { urls.push(String(u)); return Response.json(String(u).includes('lk_correo_abierto') ? ID : null) }))
  vi.stubEnv('SUPABASE_URL', 'https://p.supabase.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'srv'); vi.stubEnv('CORREOS_ORIGEN', 'https://app.lockumi.com')
  return urls }
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
// api/correo.ts usa process.env (tipos de Node, fuera del tsconfig de la app): se carga por nombre.
type Ruta = (r: Request) => Promise<Response>
let GET: Ruta, POST: Ruta
beforeAll(async () => { ({ GET, POST } = await import(/* @vite-ignore */ ['../../../api', 'correo.ts'].join('/')) as { GET: Ruta; POST: Ruta }) })

describe('/api/correo?abrir= (COR-C-03)', () => {
  it('GET solo muestra la página con el botón: no registra la apertura', async () => {
    const urls = red(); const r = await GET(new Request(URL_))
    expect(r.status).toBe(200); expect(r.headers.get('cache-control')).toBe('no-store'); expect(r.headers.get('referrer-policy')).toBe('no-referrer')
    const html = await r.text()
    expect(html).toContain(PAGINA_ABRIR.texto); expect(html).toContain(`<form method="post" action="/api/correo?abrir=${T}">`); expect(html).toContain(PAGINA_ABRIR.boton)
    expect(html).not.toMatch(/color:#fff|color:white/i)
    expect(urls).toEqual([])
  })
  it('POST (tocar el botón) registra la apertura una vez y abre el alquiler', async () => {
    const urls = red(); const r = await POST(new Request(URL_, { method: 'POST' }))
    expect(r.status).toBe(303); expect(r.headers.get('location')).toBe(`https://app.lockumi.com/#/alquiler/${ID}?aviso=cor-c-03&canal=correo`)
    expect(urls).toEqual(['https://p.supabase.co/rest/v1/rpc/lk_correo_abierto'])
  })
  it('enlace con otro formato: GET vuelve a la app sin página; POST no registra nada', async () => {
    const urls = red()
    expect((await GET(new Request('https://app.lockumi.com/api/correo?abrir=xyz'))).headers.get('location')).toBe('https://app.lockumi.com/')
    expect((await POST(new Request('https://app.lockumi.com/api/correo?abrir=xyz', { method: 'POST' }))).headers.get('location')).toBe('https://app.lockumi.com/')
    expect(urls).toEqual([])
  })
})
