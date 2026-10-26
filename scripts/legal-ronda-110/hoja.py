# Hoja de contacto de la ronda 1.10 / PR #33: filas = pantallas; columnas = ANTES (tel, esc) y DESPUÉS (tel, esc). Datos de demo, «Ejemplo».
# Uso: python3 scripts/legal-ronda-110/hoja.py <carpeta-capturas> <salida.jpg> [titulo] [--solo-despues]
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
D, SAL = sys.argv[1], sys.argv[2]; TIT = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith('--') else 'Legal, ronda 1.10 y 1.11-demo (PR #33) · Ejemplo'
SOLO = '--solo-despues' in sys.argv
F = lambda n, b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if b else ''), n)
H, LAB, G = 560, 500, 18
datos = json.load(open(os.path.join(D, 'datos.json'))) if os.path.exists(os.path.join(D, 'datos.json')) else {}
FILAS = [('1-casilla', '1. Casilla de la invitación'), ('2-link-terminos', '2. Link «Términos …»'), ('3-otro-correo', '3. Otro correo'),
  ('4-privacidad-perfil', '4. Nombre visible'), ('5-privacidad-codigo', '5. Código de 6 números'), ('6-privacidad-cierre', '6. «cierre del alquiler»'),
  ('7-revisa-tu-correo', '7. «Revisa tu correo»'), ('8-terminos-1-10', '8. /terminos-1-10'), ('9-terminos-vigente', '9. /terminos (vigente)')]
COLS = [('despues', 'tel'), ('despues', 'esc')] if SOLO else [('antes', 'tel'), ('antes', 'esc'), ('despues', 'tel'), ('despues', 'esc')]
def img(c, f, n):
    p = os.path.join(D, f'{c}-{f}-{n}.png')
    if not os.path.exists(p): return None
    i = Image.open(p).convert('RGB'); return i.resize((round(i.width * H / i.height), H), Image.LANCZOS)
anchos = {f: (259 if f == 'tel' else 896) for _, f in COLS}
W = LAB + sum(anchos[f] + G for _, f in COLS) + G
filas = [(n, t) for n, t in FILAS if any(os.path.exists(os.path.join(D, f'{c}-{f}-{n}.png')) for c, f in COLS)]
TOP = 150; hoja = Image.new('RGB', (W, TOP + len(filas) * (H + G) + G), 'white'); d = ImageDraw.Draw(hoja)
d.text((G, 20), TIT, font=F(40, True), fill='#111'); x = LAB
for c, f in COLS:
    d.text((x, 95), ('ANTES (master)' if c == 'antes' else 'DESPUÉS') + (' · teléfono' if f == 'tel' else ' · escritorio'), font=F(26, True), fill='#b42318' if c == 'antes' else '#067647'); x += anchos[f] + G
for k, (n, t) in enumerate(filas):
    y = TOP + k * (H + G); d.text((G, y + 10), t, font=F(28, True), fill='#111')
    nota = []
    for c in ('antes', 'despues'):
        v = datos.get(f'{c}-tel', {})
        if n == '2-link-terminos' and v.get('abre'): nota.append(f"{c}: {v['abre']['href']} → {v['abre']['version']}")
        if n in ('8-terminos-1-10', '9-terminos-vigente') and v.get(n): nota.append(f"{c}: {v[n]['ruta']} → {v[n]['version']}")
        if n == '3-otro-correo' and 'botonDesactivado' in v: nota.append(f"{c}: desactivado = {v['botonDesactivado']}")
    yy = y + 60
    for l in nota:
        for parte in [l[i:i + 34] for i in range(0, len(l), 34)]: d.text((G, yy), parte, font=F(21), fill='#333'); yy += 28
    x = LAB
    for c, f in COLS:
        i = img(c, f, n)
        if i: hoja.paste(i.crop((0, 0, min(i.width, anchos[f]), H)), (x, y))
        else: d.rectangle((x, y, x + anchos[f], y + H), outline='#ccc'); d.text((x + 12, y + 12), 'no existía' if c == 'antes' else '—', font=F(22), fill='#999')
        x += anchos[f] + G
hoja.save(SAL, quality=88); print(SAL, hoja.size)
