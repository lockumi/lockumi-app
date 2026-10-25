// Paso 17 · capturas de los correos de C tal como salieron (el HTML exacto enviado a Resend, guardado por e2e-c.mjs en
// <salida>/correos/), en un teléfono (390 px de ancho), y una hoja de contactos resumen-correos.jpg.
//   node scripts/capturas-correos.mjs <salida-del-e2e>/correos <carpeta-de-capturas>
import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'node:fs'
const [, , DIR, OUT] = process.argv
if (!DIR || !OUT) { console.error('Uso: node scripts/capturas-correos.mjs <correos> <capturas>'); process.exit(2) }
mkdirSync(OUT, { recursive: true })
const indice = JSON.parse(readFileSync(DIR + '/indice.json', 'utf8'))
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const hechos = []
for (const c of indice) {
  const nombre = `${c.archivo.replace('.html', '')}-${(c.plantilla ?? 'correo').replace(/\//g, '-')}-${String(c.para?.[0] ?? '').replace(/^lockumi\+e2ec-|@mail\.grokbot\.com$/g, '')}.png`
  await p.setContent(readFileSync(`${DIR}/${c.archivo}`, 'utf8'), { waitUntil: 'networkidle' })
  await p.screenshot({ path: `${OUT}/${nombre}`, fullPage: true }); hechos.push({ nombre, ...c }); console.log(nombre)
}
// Hoja resumen: una miniatura por plantilla distinta (la primera de cada una), con Pillow
const unicas = [...new Map(hechos.map(h => [h.plantilla ?? h.nombre, h])).values()]
const { execFileSync } = await import('node:child_process')
execFileSync('python3', ['-c', `
import json,sys
from PIL import Image, ImageDraw, ImageFont
L=json.loads(sys.argv[1]); out=sys.argv[2]
W,H,C=360,700,6; filas=(len(L)+C-1)//C
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18); T=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',26)
hoja=Image.new('RGB',(C*(W+20)+20,filas*(H+50)+80),'#FFF5EE'); d=ImageDraw.Draw(hoja)
d.text((20,22),'Correos del escenario C (COR-C-01 a COR-C-09) · borrador «LEGAL: revisar», solo al buzón de prueba',fill='#3D2A22',font=T)
for i,(f,t) in enumerate(L):
  im=Image.open(f).convert('RGB'); im=im.resize((W,int(im.height*W/im.width))).crop((0,0,W,H))
  x=20+(i%C)*(W+20); y=70+(i//C)*(H+50); hoja.paste(im,(x,y)); d.rectangle((x-1,y-1,x+W,y+H),outline='#FFB08A',width=2); d.text((x,y+H+10),t,fill='#3D2A22',font=F)
hoja.save(out,quality=85)`, JSON.stringify(unicas.map(h => [`${OUT}/${h.nombre}`, h.plantilla ?? h.nombre.replace('.png', '')])), `${OUT}/resumen-correos.jpg`])
await b.close(); console.log(`${hechos.length} correos · ${OUT}/resumen-correos.jpg`)
