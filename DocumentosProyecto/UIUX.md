# UI/UX — Guía de Interfaz y Experiencia de Usuario
## Plataforma Web Clínica Cárdenas Visión

**Versión:** 1.0  
**Fecha:** 2026-06-08  
**Estado:** Borrador  
**Principio rector:** El frontend existente define el estándar visual. Todo lo nuevo se construye alineado a él — sin cambios de diseño salvo que sean necesarios para funcionalidad.

---

## 1. Sistema de Colores

Extraído directamente del código existente (`index.css`, `LoginPage.tsx`, `Navbar.tsx`).

### 1.1 Paleta Principal

| Token | Hex | Uso |
|-------|-----|-----|
| `primary` | `#03D4D9` | Color de marca principal. Botones, bordes activos, links hover, focus rings |
| `primary-light` | `#01EDDF` | Gradientes hover, acentos secundarios |
| `primary-dark` | `#038996` | Headers de secciones, gradientes oscuros |
| `whatsapp` | `#25D366` | Exclusivo para botón de WhatsApp |

### 1.2 Escala de Grises

| Token | Uso |
|-------|-----|
| `white` `#FFFFFF` | Fondo de cards, navbar, formularios |
| `gray-50` `#FAFAFA` | Fondo de celdas tabla, fondos sutiles |
| `gray-100` `#F4F4F5` | Bordes divisores |
| `gray-200` `#E4E4E7` | Bordes de inputs en reposo |
| `gray-300` `#D1D5DB` | Bordes hover sutiles |
| `gray-500` `#71717A` | Texto placeholder, labels secundarios |
| `gray-600` `#52525B` | Texto descriptivo, subtítulos |
| `gray-700` `#3F3F46` | Texto de labels en formularios |
| `gray-800` `#27272A` | Texto principal, headings |

### 1.3 Fondos Decorativos

Pattern consistente en páginas internas: círculos desenfocados (`blur-3xl`) en cyan/teal con opacidad baja (3–5%).

```
bg-[#01EDDF]/5  w-96 h-96  → esquina superior derecha
bg-[#03D4D9]/5  w-[500px]  → esquina inferior izquierda
bg-[#01EDDF]/3  w-[600px]  → centro (muy sutil)
```

Líneas SVG decorativas con `stroke="#03D4D9"` a opacidad 5%.

### 1.4 Modo Alto Contraste

Toggle flotante en landing. Cuando `body.high-contrast`:
- Fondo: `#000000`
- Texto: `#FFFF00` (amarillo)
- Botones: fondo negro, texto/borde amarillo
- Backgrounds cyan/teal → negro
- Bubbles del chatbot: fondo negro, texto blanco

**Regla:** Todo nuevo componente debe funcionar correctamente en alto contraste. Agregar overrides en `index.css` bajo `body.high-contrast`.

---

## 2. Tipografía

Font family: `ui-sans-serif, system-ui, sans-serif` (sin fuente custom).

### 2.1 Escala tipográfica

| Tag | Tamaño | Peso | Line-height | Uso |
|-----|--------|------|-------------|-----|
| `h1` | `1.5rem` (2xl) | 500 (medium) | 1.5 | Títulos de página / sección principal |
| `h2` | `1.25rem` (xl) | 500 | 1.5 | Subtítulos de sección |
| `h3` | `1.125rem` (lg) | 500 | 1.5 | Títulos de card / subgrupo |
| `h4` / `p` | `1rem` (base) | 400/500 | 1.5 | Texto cuerpo, labels |
| `small` | `0.875rem` (sm) | 400 | — | Texto auxiliar, footers, hints |
| `.text-xs` | `0.75rem` | — | — | Copyright, metadata |

**Nota:** Los headings no tienen tamaño bold por defecto en el sistema. Los pesos son: normal (400), medium (500), semibold (600), bold (700).

---

## 3. Componentes Base

### 3.1 Botones

**Primario (sólido):**
```
bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6 transition-colors
```

**Primario (gradiente) — para CTAs principales en formularios:**
```
bg-gradient-to-r from-[#01EDDF] to-[#03D4D9]
hover:from-[#03D4D9] hover:to-[#01EDDF]
text-white rounded-xl h-12 shadow-lg hover:shadow-xl
```

**Outline:**
```
border-[#03D4D9] text-[#03D4D9]
hover:bg-[#03D4D9] hover:text-white
rounded-full px-6 transition-colors
```

**Outline en formularios:**
```
border-2 border-[#03D4D9] text-[#03D4D9]
hover:bg-[#03D4D9]/10 rounded-xl
```

**Regla navbar:** Botones en navbar siempre `rounded-full`. Botones dentro de formularios/cards: `rounded-xl`.

### 3.2 Inputs

```
h-12 border border-gray-200
focus:border-[#03D4D9] focus:ring-[#03D4D9]
rounded-xl
```

Altura estándar: `h-12` (formularios grandes) / `h-11` (formularios compactos).

### 3.3 Cards

**Card principal (formularios, modales):**
```
bg-white rounded-3xl shadow-2xl p-10
```

**Card de opción interactiva (hover effect):**
```
bg-white rounded-3xl shadow-xl hover:shadow-2xl
border-2 border-transparent hover:border-[#03D4D9]
transition-all duration-300 p-12
```
Con Framer Motion: `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.98 }}`.

**Card de imagen (opciones del menú):**
```
rounded-[20px] shadow-lg hover:shadow-2xl
overflow-hidden h-64
```

### 3.4 Section Headers (en formularios de historia clínica)

```
bg-gradient-to-r from-[#038996] to-[#03D4D9]
text-white px-6 py-3 rounded-lg
```
Texto: `text-xl`.

### 3.5 Tablas de datos (en historia clínica)

```
w-full border-collapse
```
- Celda label: `py-3 px-4 bg-gray-50 w-1/3`
- Celda valor: `py-3 px-4`
- Fila: `border-b border-gray-200`

### 3.6 Progress Bar

Componente `<Progress>` de shadcn/ui. En gamificación: barra teal.
```
h-2 bg-gray-200
```
Track de progreso fill: `#03D4D9`.

### 3.7 Navbar (Portal de Empleados)

```
fixed top-0 left-0 right-0 bg-white shadow-sm z-50 h-20
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```
Contenido: logo izquierda, links centro, botones derecha.

### 3.8 Toast / Notificaciones

Librería: `sonner`. Ya configurada con `<Toaster />` en `App.tsx`. Usar:
- `toast.success("...")` — confirmación de acciones
- `toast.error("...")` — errores de formulario / API
- `toast.info("...")` — información neutral
- `toast.loading("...")` — operaciones en curso → `toast.dismiss()` al finalizar

---

## 4. Animaciones

Librería: `motion/react` (Framer Motion). Patron estándar de transición entre vistas:

```tsx
// Entrada
initial={{ x: 100, opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
exit={{ x: -100, opacity: 0 }}
transition={{ duration: 0.4, ease: "easeInOut" }}
```

```tsx
// Salida hacia izquierda (vista actual al navegar a siguiente)
initial={{ x: 0, opacity: 1 }}
exit={{ x: -100, opacity: 0 }}
```

Siempre envolver con `<AnimatePresence mode="wait">` para limpiar la vista anterior antes de mostrar la nueva.

**Botones interactivos:**
```tsx
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}
```

**Duraciones:** `duration-200` micro-interacciones, `duration-300` transiciones de color, `duration-500` apariciones.

---

## 5. Layout por Área

### 5.1 Landing Pública

```
┌─────────────────────────────────────────┐
│  NAVBAR sticky (h-20, bg-white)         │
├─────────────────────────────────────────┤
│  HERO SLIDER (h-[600px])                │
├─────────────────────────────────────────┤
│  SERVICES SECTION                       │
├─────────────────────────────────────────┤
│  EPS SECTION                            │
├─────────────────────────────────────────┤
│  APPOINTMENT CHAT SECTION               │
├─────────────────────────────────────────┤
│  CHATBOT (floating / embedded)          │
├─────────────────────────────────────────┤
│  FOOTER                                 │
└─────────────────────────────────────────┘
```

Contraste toggle: `fixed` en esquina, siempre visible.

### 5.2 Login Page

Centered card (`max-w-md`, `rounded-3xl shadow-2xl p-10`). Fondo blanco con decoraciones borrosas cyan/teal. Logo centrado arriba.

### 5.3 Portal de Empleados — Estructura General (NUEVA — alineada al estilo)

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR PORTAL (fixed h-20, bg-white, shadow-sm)    │
│  [Logo] ────────── [Links] ────── [% Progreso] [X]  │
├────────────┬────────────────────────────────────────┤
│            │                                        │
│  SIDEBAR   │   CONTENT AREA                        │
│  (fijo,    │   (pt-32, max-w-5xl mx-auto)          │
│  solo      │                                        │
│  desktop)  │   Card principal o tabla               │
│            │                                        │
└────────────┴────────────────────────────────────────┘
```

**Navbar portal:** Igual al navbar de empleados existente en `LoginPage.tsx` — `fixed top-0`, `bg-white shadow-sm z-50 h-20`. Agrega al lado derecho: barra de progreso gamificación compacta + nombre del empleado + botón cerrar sesión.

**Content area:** `pt-32` (para compensar navbar fixed) + `pb-16`. Centrado `max-w-5xl` o `max-w-6xl` según vista.

**Sidebar:** Solo en desktop (`hidden md:flex`). Ancho fijo `w-64`. Sin fondo dramático — `bg-white border-r border-gray-100`. Links con estado activo en `text-[#03D4D9]` + borde izquierdo `border-l-2 border-[#03D4D9]`.

### 5.4 Vistas del portal que ya existen (NO CAMBIAR)

| Vista | Componente | Estado |
|-------|-----------|--------|
| Login | `LoginPage.tsx` → `currentView="login"` | ✅ Completo |
| Registro primer login | `LoginPage.tsx` → `currentView="registration"` | ✅ Completo |
| Menú principal empleado | `LoginPage.tsx` → `currentView="options"` | ✅ Completo |
| Selección tipo paciente | `LoginPage.tsx` → `currentView="userTypeSelection"` | ✅ Completo |
| Búsqueda paciente existente | `LoginPage.tsx` → `currentView="existingUserForm"` | ✅ Completo |
| Formulario cita / nuevo paciente | `LoginPage.tsx` → `currentView="citas"` | ✅ Completo |
| Historia clínica completa | `LoginPage.tsx` → `currentView="historiaClinica"` | ✅ Completo |
| Calendario | `CalendarioPage.tsx` | ✅ Completo |

---

## 6. Vistas Nuevas — Especificación Visual

Todas las vistas nuevas siguen la misma anatomía del portal existente. No se inventan estilos nuevos.

### 6.1 Barra de Progreso Gamificación (nueva — en navbar)

Ubicación: dentro del navbar del portal, entre los links y el botón de cerrar sesión.

```
[=====>        ] 42%  (barra horizontal compacta, w-32 h-2, color #03D4D9)
```

Al completar 100%: badge verde con ✓ en lugar de barra.

Tooltip al hover: lista de features visitadas vs pendientes.

### 6.2 Dashboard Admin — Tabla de Progreso Empleados

Card `bg-white rounded-3xl shadow-xl p-10`.

Título con section header gradient `from-[#038996] to-[#03D4D9]`.

Tabla:
```
| Empleado | Rol | Features visitadas | % | Última actividad | Acción |
```
- Columna `%`: `<Progress>` inline (`h-2 w-24`) + número
- Acción: botón `outline` small → "Reactivar tour"
- Filtros arriba: Select por rol, Input búsqueda por nombre

### 6.3 Formulario Crear Empleado (admin)

Misma estructura que el formulario de registro existente (`currentView="registration"`): card `max-w-md rounded-3xl shadow-2xl p-10`, campos con `h-11`, Select para rol.

Campo adicional: **correo** (el admin ingresa el correo con el que Supabase enviará invitación).

### 6.4 Lista de Pacientes

Card `max-w-6xl rounded-3xl shadow-xl p-10`.

Barra superior: `<Input>` búsqueda + botón "Nuevo paciente" (gradiente primario).

Tabla con filas `border-b border-gray-200`, fondo alterno `bg-gray-50`.

Cada fila: `hover:bg-[#03D4D9]/5` con cursor pointer → abre ficha del paciente.

### 6.5 Ficha Paciente

Dos columnas desktop (datos personales izquierda, historial citas derecha). Una columna mobile.

Sección de historia clínica: botón "Nueva historia" (gradiente) + lista de historias previas como cards compactas con fecha y médico.

### 6.6 Formulario Nueva Cita (refactorizado desde `currentView="citas"`)

Mantener exactamente el mismo formulario existente. Cambios mínimos necesarios:
- Agregar campo **Sede** (Select) → ya está en requerimientos
- Agregar campo **Canal** (Radio: Presencial / Telefónico) — mismo estilo que los Select existentes
- Agregar campo **Hora** (Select de slots disponibles, cargado dinámicamente)

### 6.7 Dashboard Admin — General

Grid 2x2 de tarjetas métricas en la parte superior:

```
┌────────────────┐  ┌────────────────┐
│  Citas hoy     │  │  Pacientes     │
│  [número]      │  │  registrados   │
└────────────────┘  └────────────────┘
┌────────────────┐  ┌────────────────┐
│  Empleados     │  │  Progreso avg  │
│  activos       │  │  onboarding    │
└────────────────┘  └────────────────┘
```

Cards métricas: `bg-white rounded-2xl shadow-md p-6`. Número grande `text-5xl text-[#03D4D9]`. Label `text-sm text-gray-600`.

### 6.8 Vista de Auditoría (admin)

Tabla con filtros: rango de fechas, tabla afectada, empleado.

Cada fila: timestamp, empleado, acción (badge con color: INSERT→verde, UPDATE→azul, DELETE→rojo), tabla, resumen del cambio.

Expandible: click en fila → acordeón con diff JSON `datos_anteriores` / `datos_nuevos`.

---

## 7. Tour de Gamificación (driver.js)

### 7.1 Estilo del Tour

driver.js tiene su propio overlay. Personalización para alinearse al design system:

```css
/* Colores del popover de driver.js */
--driver-popover-background-color: #ffffff;
--driver-popover-border-radius: 1.5rem;       /* rounded-3xl */
--driver-popover-title-color: #27272A;         /* gray-800 */
--driver-popover-description-color: #52525B;  /* gray-600 */
--driver-popover-progress-color: #03D4D9;     /* primary */
--driver-btn-next-background-color: #03D4D9;
--driver-btn-prev-background-color: transparent;
--driver-btn-prev-border-color: #03D4D9;
--driver-btn-prev-color: #03D4D9;
--driver-overlay-color: rgba(0,0,0,0.6);
```

### 7.2 Estructura del Popover

Cada paso del tour incluye:
- **Título:** nombre de la feature (e.g., "Registrar Paciente Nuevo")
- **Descripción:** qué hace esta sección y para qué sirve
- **Progreso:** "Paso 3 de 8" — mostrado automáticamente por driver.js
- **Botón siguiente:** "Continuar →" (color `#03D4D9`)
- **Sin botón saltar:** `allowClose: false`, `showButtons: ['next']` en pasos intermedios

### 7.3 Atributos en el DOM

Cada sección trackeada tiene `data-feature-id="R-01"` en su elemento contenedor principal. Cuando driver.js resalta el elemento, el `onNextClick` captura el ID y hace la llamada al API.

---

## 8. Responsividad

| Breakpoint | Ancho | Comportamiento |
|-----------|-------|---------------|
| Mobile | < 768px | Una columna, sidebar oculto, cards full-width |
| Tablet | 768px–1024px | Grid 2 col en options, sidebar opcional |
| Desktop | > 1024px | Layout completo con sidebar |

Clases Tailwind usadas: `md:flex`, `md:grid-cols-2`, `sm:px-6`, `lg:px-8`.

El contenido del portal tiene `max-w-7xl mx-auto` en navbar y `max-w-5xl` / `max-w-6xl` en contenido.

---

## 9. Iconografía

Librería: `lucide-react` (ya instalada). Iconos usados actualmente:
- `Eye`, `ArrowLeft`, `Calendar`, `TestTube`, `FlaskConical`
- `Upload`, `FileText`, `Check`, `Mail`, `Send`

Para nuevas vistas usar lucide-react también. Tamaño estándar: `w-5 h-5` en botones, `w-6 h-6` en menús, `w-10 h-10` / `w-12 h-12` en íconos decorativos grandes.

Íconos decorativos grandes (como en `userTypeSelection`): envueltos en círculo con gradiente `from-[#01EDDF] to-[#03D4D9] rounded-full`.

---

## 10. Estados de UI

### Loading
- Operación en curso: `toast.loading("...")` + botón submit `disabled={isSubmitting}` con `opacity-50`
- Lista cargando: skeletons con `bg-gray-200` (componente `<Skeleton>` de shadcn/ui)
- Formulario enviando: `<Progress>` inline + texto "Procesando..."

### Error
- Error de API: `toast.error(message)`
- Error de campo: texto `text-red-500 text-sm` bajo el input (React Hook Form + Zod)
- Error de página (404, sin permisos): card centrada con ícono y mensaje

### Vacío
- Lista sin datos: card centrada con ícono + "No hay [entidades] registradas" + botón de acción si aplica

### Éxito
- Formulario guardado: `toast.success(...)` + reset del form + redirección (via `setTimeout` 2s como ya se hace)

---

## 11. Accesibilidad

- `aria-label` en botones icono (sin texto visible)
- Focus visible: ring `#03D4D9` (ya configurado en `focus:ring-[#03D4D9]`)
- Contraste de color verificado en modo normal y alto contraste
- `alt` descriptivo en todas las imágenes
- Inputs siempre con `<Label>` asociado via `htmlFor`
- Componentes Radix UI (shadcn): accesibles por defecto con teclado y screen readers

---

## 12. Reglas de Consistencia — Checklist para Nuevas Vistas

Antes de dar por terminada cualquier vista nueva:

- [ ] Colores solo de la paleta de la sección 1
- [ ] Botones usan las variantes exactas de la sección 3.1
- [ ] Inputs tienen `h-12`, `border-gray-200`, `focus:border-[#03D4D9]`, `rounded-xl`
- [ ] Cards usan `rounded-3xl shadow-xl` o `rounded-2xl shadow-md`
- [ ] Transiciones con Framer Motion usan el patrón x:100/-100 + opacity
- [ ] Section headers con gradiente `from-[#038996] to-[#03D4D9]`
- [ ] Toasts de sonner para feedback de acciones
- [ ] Funciona en modo alto contraste
- [ ] `data-feature-id` en elemento raíz de cada sección trackeada por gamificación
- [ ] Responsive: probado en mobile y desktop

---

*Documento vivo — actualizar si se agrega un componente con patron nuevo.*
