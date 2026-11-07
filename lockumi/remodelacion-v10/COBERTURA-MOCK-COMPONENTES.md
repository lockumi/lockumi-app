# Cobertura Mock → Componentes Reales

> Documento de mapeo entre los 33 mockups PNG aprobados y los componentes/pantallas existentes en el repositorio.
> Generado: 2026-11-07 · Rama: `cursor/diseno-estatico-v10-c688` · Base: `cef6c70`

## Resumen de Cobertura

| Estado | Cantidad | Descripción |
|--------|----------|-------------|
| ✅ Existe | 26 | Pantalla/componente real identificado |
| ⚠️ Parcial | 4 | Existe pero con diferencias estructurales |
| ❌ No existe | 3 | Requiere nueva pantalla o es decorativo |

---

## Pantallas Principales (01–31)

### Flujo de Entrada (01–02)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 01-bienvenida | `src/screens/Login.tsx` | `Login` | ✅ | Hero con `LogoAnimado`, título, beneficios, casillas legales, botón "Entrar" |
| 02-login | `src/screens/Login.tsx` | `Hoja` | ✅ | Modal de opciones: Google, Apple, correo |

### Flujo de Alquiler - Dueño (03–06)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 03-inicio | `src/screens/Inicio.tsx` | `Inicio` | ✅ | Dashboard con lista de alquileres, hero, botón nuevo |
| 04-crear | `src/screens/Crear.tsx` | `Crear` | ✅ | Formulario completo con campos, reglas, opciones |
| 05-creando | `src/screens/Crear.tsx` | Estado de carga | ✅ | Spinner/barra durante creación |
| 06-invitar | `src/screens/Crear.tsx` | Sección invitación | ✅ | Campo email, enlace WhatsApp |

### Flujo de Inquilino (07)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 07-aceptar | `src/screens/Invitacion.tsx` | `Invitacion`, `CuerpoInvitacion` | ✅ | Resumen del alquiler, reglas plegables, aceptar |

### Flujo Compartido - Contrato y Depósito (08–13)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 08-pasos | `src/screens/Detalle.tsx` | Barra de progreso + `LineaTiempo` | ✅ | `src/ui.tsx` tiene `LineaTiempo` |
| 09-contrato | `src/screens/ContratoDoc.tsx` / `ContratoCompacto.tsx` | `ContratoDoc` | ✅ | Documento visual del contrato |
| 10-firmas | `src/screens/Detalle.tsx` | Sección firmas en `Contrato` | ✅ | Casilla + botón firmar |
| 11-pagar | `src/screens/Detalle.tsx` | `Pago`, `PagoSimulado` | ✅ | Monto, notas, botón pagar |
| 12-guardando | `src/EsperaPago.tsx` | `EsperaPago` | ✅ | Estados de progreso del pago |
| 13-protegido | `src/screens/Detalle.tsx` | Estado `deposito_guardado` | ✅ | Chip "Depósito guardado", hero ilustrativo |

### Fotos de Entrada (14–15)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 14-checklist | `src/screens/Detalle.tsx` | `Fotos` + `src/screens/Acta.tsx` | ✅ | Cuartos con checklist, cámara |
| 15-foto | `src/Camara.tsx` | `TomarFoto` | ✅ | Cámara en vivo, disparo |

### Durante el Alquiler (16–17)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 16-encurso | `src/screens/Detalle.tsx` | `EnCurso` | ✅ | Chip protegido, fechas, botón salida |
| 17-aviso5 | `src/screens/Detalle.tsx` + `src/prueba/AvisoSalida.tsx` | Aviso de plazo | ✅ | Aviso amarillo con días restantes |

### Salida y Devolución (18–20)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 18-fotosalida | `src/screens/Detalle.tsx` | `Fotos` (cual='salida') | ✅ | Misma estructura que entrada + checkbox daños |
| 19-plazo7 | `src/screens/Detalle.tsx` | `Ventana` | ✅ | Contador de días/horas, texto plazo |
| 20-devuelto | `src/screens/Detalle.tsx` | Estado `cerrado` | ✅ | Hero ilustrativo de devolución |

### Reclamos y Mediación (21–23)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 21-reclamo | `src/prueba/ReclamoPC.tsx` | `FormReclamo`, `FormRubros` | ✅ | Formulario de rubros con fotos |
| 22-respuesta | `src/prueba/ReclamoPC.tsx` | Sección respuesta | ✅ | Vista del reclamo para inquilino |
| 23-mediacion | `src/prueba/MediacionPC.tsx` | `MediacionPC` | ✅ | Reparto, mediador, resolución |

### Extras y Perfil (24–28)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 24-perfil | N/A | — | ❌ | **No existe pantalla de perfil dedicada**. El correo se muestra en la barra superior |
| 25-puntaje | `src/reputacion/Pantallas.tsx` | Pantallas de reputación | ⚠️ | Solo con `VITE_REPUTACION=1`, estructura diferente al mock |
| 26-notif | N/A | — | ❌ | **No existe pantalla de notificaciones**. Los avisos son toast emergentes |
| 27-ayuda | N/A | — | ⚠️ | **No existe pantalla de ayuda dedicada**. Solo el recorrido guiado |
| 28-terminos | `src/legal/PaginaLegal.tsx` | `PaginaLegal` | ✅ | Texto legal con estilos |

### Estados Globales (29–31)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 29-vacio | `src/screens/Inicio.tsx` | Estado sin alquileres | ✅ | Tarjeta "Todavía no hay alquileres" |
| 30-error | `src/Alertas.tsx` + estilos | Toast de error | ✅ | Aviso con tipo='error' |
| 31-cargando | Varios | Estados de carga | ✅ | Spinner/texto "Cargando..." distribuido |

---

## Recorrido Guiado (32–33)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 32-recorrido-paso1 | `src/recorrido.ts` | driver.js overlay | ✅ | Globo Sage Teal, puntos, botones |
| 33-recorrido-saltar | `src/recorrido.ts` | driver.js overlay | ✅ | Mismo sistema con Saltar |

---

## Alertas/Modales (34–36)

| Mock | Archivo | Componente | Estado | Notas |
|------|---------|------------|--------|-------|
| 34-alerta-exito | `src/Alertas.tsx`, `src/Aviso.tsx` | `Tostada` | ✅ | Toast verde con casita animada |
| 35-alerta-aviso | `src/Alertas.tsx`, `src/Aviso.tsx` | `Tostada` | ✅ | Toast miel/paso |
| 36-alerta-error | `src/Alertas.tsx`, `src/Aviso.tsx` | `Tostada` | ✅ | Toast terracota/error |

**Nota importante:** Las alertas en el código actual son toasts tipo Sonner (píldoras emergentes abajo), no modales centrados. Los mocks 34–36 muestran modales compactos. Según instrucciones, implementar como **pop-ups/modales COMPACTOS sobre flujo**, no pantallas completas.

---

## Componentes que NO corresponden a mocks

Algunos componentes existentes no tienen mock directo porque son internos o de infraestructura:

- `src/screens/Firmante.tsx` - Pantalla de firma con llave de acceso
- `src/screens/Billetera.tsx` - Billetera Stellar (solo modo real)
- `src/screens/Real.tsx` - Componentes de escrow real
- `src/screens/Ejemplo.tsx` - Alquiler de ejemplo del recorrido
- `src/reputacion/` - Sistema de reputación (parcialmente activo)

---

## Pantallas/Funcionalidad fuera de scope

Los siguientes mocks representan funcionalidad que **no existe en el código** y **no debe agregarse** según las instrucciones:

1. **24-perfil.png** - Pantalla de perfil con avatar y datos
   - El código muestra el email en la barra; no hay edición de perfil
   - **Acción:** Documentar como pendiente, no implementar

2. **26-notif.png** - Centro de notificaciones
   - Las notificaciones son toasts efímeros, no persistentes
   - **Acción:** Documentar como pendiente, no implementar

3. **27-ayuda.png** - Pantalla de ayuda/FAQ
   - Solo existe el recorrido guiado (driver.js)
   - El botón "¿Cómo funciona?" abre el recorrido, no una pantalla
   - **Acción:** Documentar como pendiente, no implementar

---

## Tokens de Diseño a Implementar

### Paleta Sage Teal (reemplaza Terracota viva)

```css
/* Actual (Terracota viva) → Nuevo (Sage Teal) */
--coral:#FF6B35         → --sage-teal:#527C78      /* primario */
--salvia:#6FBF8A        → --soft-sage:#A8C9B8      /* acento suave */
--fondo:#FFF5EE         → --warm-cream:#F6F2EA    /* fondo */
--tarjeta:#FFFFFF       → --card-white:#FFFEFA    /* tarjetas */
--cafe:#3D2A22          → --deep-charcoal:#293332 /* texto */
/* Nuevos tokens */
--mint-mist:#DCEAE5     /* secundario / botones rellenos */
--soft-lavender:#D8D3E8 /* Inquilino / mediación */
--borde:#E5E6DE         /* bordes */
```

### Tipografía

```css
/* Actual → Nuevo */
--f-titulo:"Nunito"     → --f-titulo:"Plus Jakarta Sans"
--f-texto:"Inter"       → --f-texto:"Inter" (sin cambio)
```

---

## Plan de Implementación

1. **Fase 1: Tokens** - Variables CSS en `src/index.css`
2. **Fase 2: Componentes base** - Botones, campos, tarjetas
3. **Fase 3: Pantallas con mock** - Aplicar estilos por pantalla
4. **Fase 4: Alertas compactas** - Convertir toasts a modales si requerido
5. **Fase 5: QA visual** - Capturas comparativas
