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

## Pendiente para activar la Parte 4
- **paso16-unido (25/10):** un solo correo de invitación por alquiler, sin recordatorios (`lk_registrar_correo_invitacion`; sin Supabase, en memoria y con clave de idempotencia `inv:<alquiler>`), y el correo de la persona invitada se borra si no se une en 7 días (`lk_borrar_invitaciones_vencidas`, desde `GET /api/borrados`). Ver `docs/prueba-completa.md`, «Borrados en Supabase». Falta aplicar la migración y poner `CRON_SECRET`.
- Pasar a producción las variables del servidor compartido y de Resend, y activar la Parte 4 en la app.
- Actualizar el README (guía para jueces y «Cambios publicados») en el mismo trabajo.
