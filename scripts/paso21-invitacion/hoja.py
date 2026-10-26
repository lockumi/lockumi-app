from PIL import Image, ImageDraw, ImageFont
import os
C='/workspace/lockumi/prueba-completa/capturas/paso21-invitacion'
F=lambda s,b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf'%('-Bold' if b else ''), s)
ESC=[('1-dueno-con-correo','Dueño, después de invitar, con correo enviado','Antes: «Envía este link a… Tiene que entrar con ese correo.»\nAhora: texto de Legal + Copiar link + Compartir por WhatsApp'),
 ('2-dueno-sin-correo','Dueño, sin correo enviado','Antes: el mismo texto de siempre\nAhora: solo el link, Copiar link y Compartir por WhatsApp'),
 ('3-invitada-sin-sesion','Invitada abre el botón del correo (navegador nuevo, sin sesión)','Antes: el botón abría la app sin el link (pantalla de siempre)\nAhora: abre la invitación; texto de Legal en la pantalla Entrar'),
 ('4-invitada-tras-entrar','Invitada, después de entrar con su correo','Antes: caía en Inicio, sin alquileres (el error)\nAhora: llega directo a la invitación de ese alquiler'),
 ('5-inquilino-tus-alquileres','«Tus alquileres», vista de inquilino','Antes: vacío\nAhora: el alquiler aceptado queda en la lista'),
 ('6-inquilino-reglas','Reglas vistas por el inquilino (solo lectura)','Antes: no se llegaba (el link no abría la invitación)\nAhora: reglas como texto; acepta con «Aceptar invitación» y firma. No hay botón de rechazar.')]
H=520; G=16; LAB=380
def carga(p):
  if not os.path.exists(p): return None
  i=Image.open(p).convert('RGB'); return i.resize((round(i.width*H/i.height),H))
filas=[]
for k,t,d in ESC:
  ims=[carga(f'{C}/crudas/{v}/{k}-{x}.png') for v in ('antes','despues') for x in ('tel','esc')]
  filas.append((t,d,ims))
wt=round(H*390/844); we=round(H*1280/860)
W=LAB+2*(wt+we)+5*G+30
cab=150; Hh=cab+len(filas)*(H+60)+40
o=Image.new('RGB',(W,Hh),'#faf7f2'); d=ImageDraw.Draw(o)
d.text((G,20),'Lockumi · paso 21 · link del correo de invitación — ANTES (master f6e3254) y AHORA (rama local paso21-invitacion-fix)',font=F(30,True),fill='#222')
d.text((G,62),'Ejemplo: datos de demostración (demo@lockumi.com, «Ana Ejemplo», «Ejemplo · Casa Las Flores»). App local (Vite) contra el Supabase real; ningún correo salió (Resend falso).',font=F(19),fill='#444')
d.text((G,90),'Sin códigos ni tokens: el token se tapa en el campo del link y el script falla si aparece en la página. Teléfono 390×844 y escritorio 1280×860.',font=F(19),fill='#444')
x0=LAB+G
for j,(n,c) in enumerate([('ANTES · teléfono',wt),('ANTES · escritorio',we),('AHORA · teléfono',wt),('AHORA · escritorio',we)]):
  d.text((x0,cab-28),n,font=F(20,True),fill='#b42318' if j<2 else '#1a7f37'); x0+=c+G+(10 if j==1 else 0)
y=cab
for t,ds,ims in filas:
  tw=__import__('textwrap').wrap(t,26); d.multiline_text((G,y+10),'\n'.join(tw),font=F(20,True),fill='#222',spacing=5)
  d.multiline_text((G,y+20+30*len(tw)),'\n'.join(sum([__import__('textwrap').wrap(l,30) for l in ds.split('\n')],[])),font=F(16),fill='#444',spacing=6)
  x=LAB+G
  for j,i in enumerate(ims):
    w=wt if j%2==0 else we
    if i: o.paste(i,(x,y))
    else:
      d.rectangle([x,y,x+w,y+H],fill='#eee',outline='#ccc'); d.multiline_text((x+20,y+H//2-20),'Antes no se llegaba\na esta pantalla',font=F(18),fill='#777')
    x+=w+G+(10 if j==1 else 0)
  d.line([(G,y+H+30),(W-G,y+H+30)],fill='#ddd',width=2); y+=H+60
o.save(f'{C}/hoja-paso21-invitacion.jpg',quality=86); print(o.size)
