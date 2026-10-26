# Hoja de capturas paso 21 v3 (solo las filas que cambian con la línea de la comisión): ANTES (master f6e3254) y AHORA (rama local paso21-invitacion-fix).
# Crudas: node scripts/paso21-invitacion/e2e-enlace.mjs <carpeta> (AHORA) y RAIZ=<master> ANTES=1 … (ANTES).
from PIL import Image, ImageDraw, ImageFont
import os, textwrap
C='/workspace/lockumi/prueba-completa/capturas/paso21-invitacion'
F=lambda s,b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf'%('-Bold' if b else ''), s)
ESC=[('4-invitada-tras-entrar','Invitada, después de entrar (invitación)','Antes (master): solo «Red de prueba de Stellar: sin dinero real.»; reglas abiertas\nAhora: justo debajo, «Trustless Work cobra una comisión del 0,3 % de cada monto que se libera.»; «Reglas del alquiler» cerrado; casilla y «Aceptar invitación» a la vista.'),
 ('9-alquiler-arriba','Inquilino, vista del alquiler (arriba)','Antes (master): solo el aviso de la red\nAhora: el aviso y debajo la línea de la comisión, fuera del plegable del contrato. La línea del plazo de 7 días NO se agregó: el código no coincide (ver docs/invitacion-enlace.md).')]
H=560; G=16; LAB=400
def carga(p):
  if not os.path.exists(p): return None
  i=Image.open(p).convert('RGB'); return i.resize((round(i.width*H/i.height),H))
wt=round(H*390/844); we=round(H*1280/860)
W=LAB+2*(wt+we)+5*G+30
cab=196; Hh=cab+len(ESC)*(H+60)+40
o=Image.new('RGB',(W,Hh),'#faf7f2'); d=ImageDraw.Draw(o)
d.text((G,20),'Lockumi · paso 21 v3 · comisión de Trustless Work — ANTES (master f6e3254) y AHORA (rama local paso21-invitacion-fix)',font=F(30,True),fill='#222')
d.text((G,62),'Ejemplo: datos de demostración (demo@lockumi.com, lockumi+…-ejemplo@mail.grokbot.com, «Ejemplo · Casa Las Flores»). App local (Vite) con Supabase local de prueba (PGlite con las migraciones); ningún correo salió.',font=F(19),fill='#444')
d.text((G,90),'Sin códigos ni tokens: el token se tapa en el campo del link y el script falla si aparece en la página. Teléfono 390×844 y escritorio 1280×860.',font=F(19),fill='#444')
d.text((G,118),'ANTES: en master el botón del correo no abría la invitación; para estas capturas la invitada abrió el link que copió el dueño. Hoja v2 (sin cambios): hoja-paso21-invitacion-v2.jpg.',font=F(19),fill='#444')
x0=LAB+G
for j,(n,c) in enumerate([('ANTES · teléfono',wt),('ANTES · escritorio',we),('AHORA · teléfono',wt),('AHORA · escritorio',we)]):
  d.text((x0,cab-28),n,font=F(20,True),fill='#b42318' if j<2 else '#1a7f37'); x0+=c+G+(10 if j==1 else 0)
y=cab
for k,t,ds in ESC:
  ims=[carga(f'{C}/crudas/{v}/{k}-{x}.png') for v in ('antes-v3','despues-v3') for x in ('tel','esc')]
  tw=textwrap.wrap(t,28); d.multiline_text((G,y+10),'\n'.join(tw),font=F(20,True),fill='#222',spacing=5)
  d.multiline_text((G,y+20+30*len(tw)),'\n'.join(sum([textwrap.wrap(l,36) for l in ds.split('\n')],[])),font=F(15),fill='#444',spacing=5)
  x=LAB+G
  for j,i in enumerate(ims):
    w=wt if j%2==0 else we
    if i: o.paste(i,(x,y))
    else:
      d.rectangle([x,y,x+w,y+H],fill='#eee',outline='#ccc'); d.multiline_text((x+20,y+H//2-20),'Antes no existía\nesta revisión',font=F(18),fill='#777')
    x+=w+G+(10 if j==1 else 0)
  d.line([(G,y+H+30),(W-G,y+H+30)],fill='#ddd',width=2); y+=H+60
o.save(f'{C}/hoja-paso21-invitacion-v3.jpg',quality=86); print(o.size)
