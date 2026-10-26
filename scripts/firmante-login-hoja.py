# Hoja de contacto «firmante al entrar» (PR #53): capturas a 390 px, build local de desarrollo, datos inventados (ana.prueba@ejemplo.cr).
# Uso: python3 scripts/firmante-login-hoja.py <carpeta-png> <hoja.jpg> <hoja-chica.jpg>
import sys, os
from PIL import Image, ImageDraw, ImageFont
D, SAL, CHICA = sys.argv[1:4]
F = lambda n, b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if b else ''), n)
P = [('1-puerta-llave', '1. Al entrar: no puede firmar,', 'hay llave de acceso'), ('2-puerta-origen', '2. Al entrar: no puede firmar,', 'sin llave (ir al de origen)'),
     ('3-puerta-error', '3. Al entrar: falla de red', ''), ('4-puerta-sin-sesion', '4. Al entrar: sesión cerrada', ''),
     ('5-cuenta-no-firma', '5. Ya con sesión: tarjeta', 'de la cuenta (prueba la firma)'), ('6-pagar-sin-sesion', '6. Antes de pagar: sin sesión', '(componentes reales*)'),
     ('7-firmar-contrato-sin-sesion', '7. Antes de firmar contrato (C)', '(componentes reales*)'), ('8-error-pago-sesion', '8. Pago cortado por sesión', '(componentes reales*)')]
H, W, G, TOP, LAB = 900, 416, 24, 120, 70
hoja = Image.new('RGB', (G + 4 * (W + G), TOP + 2 * (H + LAB + G) + 50), 'white'); d = ImageDraw.Draw(hoja)
d.text((G, 22), 'Lockumi · PR #53 · Firmante al entrar y volver a entrar antes de pagar', font=F(30, True), fill='#3D2A22')
d.text((G, 68), 'Teléfono 390 px · build local (dev) · Cavos simulado · datos inventados: ana.prueba@ejemplo.cr · sin secretos', font=F(19), fill='#555')
for k, (n, t1, t2) in enumerate(P):
    x, y = G + (k % 4) * (W + G), TOP + (k // 4) * (H + LAB + G)
    d.text((x, y), t1, font=F(19, True), fill='#E8531F'); d.text((x, y + 26), t2, font=F(17), fill='#3D2A22')
    i = Image.open(os.path.join(D, n + '.png')).convert('RGB'); i = i.resize((W, round(i.height * W / i.width)), Image.LANCZOS).crop((0, 0, W, H))
    hoja.paste(i, (x, y + LAB)); d.rectangle((x - 1, y + LAB - 1, x + W, y + LAB + H), outline='#FFB08A')
d.text((G, hoja.height - 40), '* 6–8: piezas reales de la rama (ConSesion, PedirEntrar, ErrorPago, EsperaPago) en el bloque «Depósito»/«Firmas»; el modo C real necesita el servidor.', font=F(16), fill='#555')
hoja.save(SAL, quality=88)
q = 80; c = hoja.resize((hoja.width * 55 // 100, hoja.height * 55 // 100), Image.LANCZOS)
while True:
    c.save(CHICA, quality=q, optimize=True)
    if os.path.getsize(CHICA) < 300_000 or q < 30: break
    q -= 8
print(hoja.size, os.path.getsize(SAL), c.size, os.path.getsize(CHICA), q)
