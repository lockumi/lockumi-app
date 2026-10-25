# Correo con Resend (Parte 4, próximamente)

> **Estado al 20 de octubre de 2026.** La Parte 4 (dos personas reales, invitación por correo) **no está activa** en app.lockumi.com: hoy la app no envía ningún correo. Este documento registra lo que ya quedó configurado para cuando se active.

## Qué se va a enviar
- Un solo correo transaccional de invitación, sin publicidad, desde **`invitaciones@lockumi.com`**. Esa dirección es solo para enviar y no recibe respuestas; el contacto es business.applockumi@gmail.com.
- El correo no incluye la dirección ni el nombre del lugar, ni fotos. El enlace vence a los 7 días.
- Lo que dice el Aviso de privacidad 1.5-demo sobre este correo (Resend como encargado, registros de 30 días, conservación) está en `src/legal/privacidad.md`, sección «Invitar a otra persona» (fase 2).

## Dominio y DNS
- Dominio **`lockumi.com` verificado en Resend**, región **us-east-1**.
- Registros en el **DNS de Vercel** (los nameservers de lockumi.com son de Vercel):

| Registro | Nombre | Para qué |
|---|---|---|
| TXT (DKIM) | `resend._domainkey` | Firma DKIM de Resend |
| MX | `send` | Rebotes y avisos de entrega (SPF del subdominio de envío) |
| TXT (SPF) | `send` | SPF del subdominio de envío |
| CNAME | `rsend` | Registro de Resend (apunta a su servicio de envío) |
| TXT (DMARC) | `_dmarc` | DMARC con `p=none` (solo informa, no rechaza) |

- **lockumi.com no recibe correo**: no hay MX en la raíz del dominio. Las respuestas a `invitaciones@lockumi.com` no llegan a ningún buzón.

Comprobación pública (sin credenciales), por ejemplo: `https://cloudflare-dns.com/dns-query?name=send.lockumi.com&type=MX` con el encabezado `accept: application/dns-json`.

## Variables (sin valores)
| Variable | Dónde | Notas |
|---|---|---|
| `RESEND_API_KEY` | Vercel, **solo Preview**, sensible | Solo en el servidor; nunca con prefijo `VITE_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel, **solo Preview**, sensible | Para la versión con servidor compartido (dos personas). |

Ninguna de las dos está en Production. Nunca se escriben sus valores en el repositorio ni en la documentación.

## Prueba real del correo (después de desplegar, en una vista previa)
`RESEND_API_KEY` está solo en Preview, así que la prueba se hace contra la URL de una vista previa (`https://lockumi-app-demo-….vercel.app`), nunca contra app.lockumi.com. Solo a la casilla de pruebas **lockumi@mail.grokbot.com** (nunca a personas reales):
1. Guardar el consentimiento: `POST /api/correo` con `{"tipo":"consentimiento","para":"lockumi@mail.grokbot.com","alquiler":"prueba-correo","acepta":true}` y el encabezado `Origin` de la vista previa.
2. Enviar un aviso de prueba a la misma casilla y el mismo `alquiler` (`tipo: "aviso"`, `consentimiento: true`, una `plantilla` y sus `datos` de `api/_lib/avisos.ts`). Como el consentimiento vive en memoria del servidor, los dos pedidos deben llegar a la misma instancia (enviarlos seguidos); si el aviso responde que falta el consentimiento, repetir el paso 1.
3. Revisar en la casilla: remitente invitaciones@lockumi.com, asunto y texto de `api/_lib/avisos.ts`, pie común y pie para darse de baja, enlace a la app, sin dirección ni fotos.
4. Desmarcar (`acepta: false`) y comprobar que un nuevo aviso responde con error y no llega.

## Pendiente para activar la Parte 4
- Decidir el borrado automático del correo de la persona invitada (ver `cambios-1.5-vs-1.4.md` de Legal).
- Pasar a producción las variables del servidor compartido y de Resend, y activar la Parte 4 en la app.
- Actualizar el README (guía para jueces y «Cambios publicados») en el mismo trabajo.
