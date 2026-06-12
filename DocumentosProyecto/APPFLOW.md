# APPFLOW — Flujos de Aplicación
## Plataforma Web Clínica Cárdenas Visión

**Versión:** 1.0  
**Fecha:** 2026-06-08

Convenciones:
- `[Pantalla]` — vista o componente UI
- `(Acción)` — acción del usuario
- `{API}` — llamada al backend
- `→` flujo normal
- `✗` flujo de error
- `★` punto de gamificación (feature trackeada)

---

## ÍNDICE

1. [Landing Pública](#1-landing-pública)
2. [Chatbot IA](#2-chatbot-ia)
3. [Autenticación](#3-autenticación)
4. [Primer Login — Completar Perfil + Tour](#4-primer-login--completar-perfil--tour)
5. [Recepcionista — Buscar Paciente](#5-recepcionista--buscar-paciente)
6. [Recepcionista — Registrar Nuevo Paciente](#6-recepcionista--registrar-nuevo-paciente)
7. [Recepcionista — Agendar Cita Presencial](#7-recepcionista--agendar-cita-presencial)
8. [Recepcionista — Agendar Cita Callcenter](#8-recepcionista--agendar-cita-callcenter)
9. [Recepcionista — Cancelar Cita](#9-recepcionista--cancelar-cita)
10. [Recepcionista — Consultar Historia Clínica (vista básica)](#10-recepcionista--consultar-historia-clínica-vista-básica)
11. [Médico — Ver Agenda del Día](#11-médico--ver-agenda-del-día)
12. [Médico — Crear Historia Clínica](#12-médico--crear-historia-clínica)
13. [Médico — Exportar Historia Clínica a PDF](#13-médico--exportar-historia-clínica-a-pdf)
14. [Médico — Ver Historial de Citas del Paciente](#14-médico--ver-historial-de-citas-del-paciente)
15. [Admin — Crear Empleado](#15-admin--crear-empleado)
16. [Admin — Desactivar / Reactivar Empleado](#16-admin--desactivar--reactivar-empleado)
17. [Admin — Gestionar Especialidades](#17-admin--gestionar-especialidades)
18. [Admin — Gestionar Médicos y Sedes](#18-admin--gestionar-médicos-y-sedes)
19. [Admin — Dashboard de Gamificación](#19-admin--dashboard-de-gamificación)
20. [Admin — Reactivar Tour de Empleado](#20-admin--reactivar-tour-de-empleado)
21. [Admin — Ver Log de Auditoría](#21-admin--ver-log-de-auditoría)
22. [Gamificación — Tour Automático (transversal)](#22-gamificación--tour-automático-transversal)
23. [Gamificación — Tracking de Progreso (transversal)](#23-gamificación--tracking-de-progreso-transversal)
24. [Logout](#24-logout)

---

## 1. Landing Pública

```
Usuario accede a "/"
        │
        ▼
[LandingPage]
  ├── [Navbar] visible
  │     ├── (click "Agendar cita") → scroll a sección de contacto / info teléfono
  │     └── (click "Iniciar sesión") → navega a "/login"
  │
  ├── [HeroSlider] — carrusel automático de imágenes
  │
  ├── [ServicesSection] — info servicios (solo lectura)
  │
  ├── [EPSSection] — lista de EPS (solo lectura)
  │
  ├── [AppointmentChatSection] — info contacto + chatbot embebido
  │
  ├── [ChatBot] — widget flotante
  │
  ├── [Footer]
  │
  └── [ContrastToggle] — fixed, siempre visible
        └── (click toggle) → body.classList.toggle("high-contrast")
```

---

## 2. Chatbot IA

```
[ChatBot widget] — disponible SOLO en landing pública
        │
        ▼
(usuario escribe pregunta)
        │
        ▼
{POST /chat/query → Python FastAPI}
  ├── FastAPI recibe query
  ├── sentence-transformers genera embedding del query
  ├── ChromaDB busca chunks relevantes de PDFs (top K)
  ├── Construye prompt RAG: contexto + pregunta
  ├── Groq API (llama-3.1-8b-instant) genera respuesta
  └── Retorna { response, sources, confidence }
        │
        ├── confidence >= umbral → mostrar respuesta en burbuja bot
        │
        └── confidence < umbral → respuesta fallback:
              "No tengo información precisa sobre eso.
               Contáctenos al [teléfono] o escríbenos al [WhatsApp]."

Estados UI:
  - Escribiendo: animación typing indicator (3 puntos)
  - Error de red: "El chatbot no está disponible en este momento."
  - Respuesta: burbuja bot + fuente del documento si aplica
```

---

## 3. Autenticación

### 3.1 Login

```
[LoginPage] → currentView="login"
        │
(usuario ingresa correo + contraseña)
        │
        ▼
(click "Acceder")
        │
        ▼
supabase.auth.signInWithPassword({ email, password })
        │
        ├── ✗ Credenciales inválidas
        │     └── toast.error("Correo o contraseña incorrectos") → se queda en login
        │
        └── ✓ Login exitoso
              │
              ▼
            {GET /auth/me}  ← token en Authorization header
              │
              ├── ✗ 403 empleado inactivo
              │     └── supabase.auth.signOut() + toast.error("Cuenta desactivada")
              │
              └── ✓ Retorna { rol, primer_login, id_empleado, persona }
                    │
                    ├── primer_login = TRUE → [Flujo 4: Primer Login]
                    │
                    └── primer_login = FALSE
                          │
                          ▼
                        Redirigir según rol:
                          ├── "recepcionista" → /portal/dashboard
                          ├── "medico"        → /portal/dashboard
                          └── "admin"         → /portal/admin/dashboard
```

### 3.2 Recuperar Contraseña

```
[LoginPage] → (click "¿Olvidaste tu contraseña?")
        │
        ▼
[Modal / vista RecuperarPassword]
        │
(usuario ingresa correo)
        │
        ▼
supabase.auth.resetPasswordForEmail(email)
        │
        ├── ✗ correo no existe → toast.error (pero por seguridad mismo mensaje)
        └── ✓ toast.success("Revisa tu correo para restablecer la contraseña")
              └── usuario recibe email de Supabase con link de reset
```

---

## 4. Primer Login — Completar Perfil + Tour

```
Login exitoso → primer_login = TRUE
        │
        ▼
[Vista "Completar tu perfil"] — misma card del registro existente
  Campos: tipo_documento, numero_documento, nombres, apellidos,
          fecha_nacimiento, telefono, direccion (opcional)
        │
(usuario completa y envía)
        │
        ▼
{POST /auth/complete-profile}
  ├── Crea fila en personas con uid = auth_uid
  ├── UPDATE empleados SET primer_login = FALSE
  └── Retorna perfil completo
        │
        ├── ✗ error → toast.error + se queda en formulario
        │
        └── ✓ toast.success("¡Perfil completado!")
              │
              ▼
            Redirigir a /portal/dashboard (según rol)
              │
              ▼
            ★ [Tour Automático se activa] → ver Flujo 22
```

---

## 5. Recepcionista — Buscar Paciente

```
★ [Dashboard Portal] — feature R-01 trackeada al cargar
        │
(usuario escribe número de documento en barra de búsqueda)
        │
        ▼
{GET /pacientes/buscar?documento=12345678}
        │
        ├── ✗ 404 no encontrado
        │     └── toast.error("No se encontró ningún paciente con ese documento")
        │         + botón "Registrar como nuevo paciente"
        │
        └── ✓ Paciente encontrado
              │
              ▼
            ★ [FichaPaciente] — feature R-02 trackeada
              Muestra: datos personales, última cita, botones de acción
              Acciones disponibles:
                ├── "Nueva cita" → [Flujo 7]
                ├── "Ver historia clínica" → [Flujo 10]
                └── "Editar datos" → form inline / modal
```

---

## 6. Recepcionista — Registrar Nuevo Paciente

```
[Dashboard] → (click "Nuevo Paciente") o desde búsqueda sin resultado
        │
        ▼
★ [FormularioNuevoPaciente] — feature R-03 trackeada al abrir
  Campos: tipo_documento*, numero_documento*, nombres*, apellidos*,
          fecha_nacimiento, telefono*, correo, direccion
        │
(usuario llena campos y envía)
        │
        ▼
Validación Zod frontend
        │
        ├── ✗ campos inválidos → mensajes de error inline bajo cada campo
        │
        └── ✓ válido
              │
              ▼
            {POST /pacientes}
              │
              ├── ✗ 409 documento duplicado
              │     └── toast.error("Ya existe un paciente con ese número de documento")
              │         + botón "Ver paciente existente"
              │
              └── ✓ 201 creado
                    │
                    ▼
                  toast.success("Paciente registrado correctamente")
                  → [FichaPaciente] del nuevo paciente
                  + opción "Agendar cita ahora" → [Flujo 7]
```

---

## 7. Recepcionista — Agendar Cita Presencial

```
[FichaPaciente] → (click "Nueva Cita")
        │
        ▼
★ [FormularioCita] — feature R-04 trackeada al abrir
  Canal pre-seleccionado: "Presencial" (radio button)

  Campos:
    ├── Paciente: pre-llenado desde ficha (o buscable)
    ├── Sede*: Select → carga {GET /sedes}
    ├── Especialidad*: Select → carga {GET /especialidades}
    ├── Médico*: Select → carga {GET /medicos?sede=X&especialidad=Y}
    ├── Fecha*: DatePicker
    ├── Hora*: Select → carga {GET /citas/disponibilidad?medico=X&fecha=Y&sede=Z}
    │           muestra slots disponibles (ej: 8:00, 8:30, 9:00...)
    ├── Motivo: Textarea (opcional)
    └── Canal: "Presencial" (fijo para este flujo)
        │
(usuario completa y envía)
        │
        ▼
Validación Zod frontend
        │
        └── ✓ válido
              │
              ▼
            {POST /citas}
              body: { id_paciente, id_medico, id_sede, id_especialidad,
                      fecha_cita, hora_inicio, hora_fin, motivo,
                      canal: "presencial", estado: "pendiente" }
              │
              ├── ✗ 409 conflicto de horario
              │     └── toast.error("El médico ya tiene una cita en ese horario")
              │         → vuelve al selector de hora con slots actualizados
              │
              └── ✓ 201 creado
                    │
                    ├── {Google Calendar} crea evento en calendario de la sede
                    │
                    └── toast.success("Cita agendada correctamente")
                          → [DetalleCita] con resumen
                          + opción "Agendar otra cita"
```

---

## 8. Recepcionista — Agendar Cita Callcenter

```
Igual al Flujo 7 con estas diferencias:

★ Feature R-05 trackeada (en lugar de R-04)

Canal pre-seleccionado: "Telefónico"

Flujo de entrada:
  [Dashboard] → (click "Nueva Cita Callcenter")
  o
  [Dashboard] → buscar paciente por documento → si existe continúa
                                               → si no existe → registrar primero [Flujo 6]

El formulario es idéntico al Flujo 7.
Canal en el POST: "telefonico"

No hay diferencia funcional en backend — solo el campo canal cambia.
```

---

## 9. Recepcionista — Cancelar Cita

```
[Calendario] o [FichaPaciente] → (click en cita)
        │
        ▼
[DetalleCita]
  Muestra: paciente, médico, sede, fecha, hora, estado, motivo
        │
(click "Cancelar Cita")
        │
        ▼
[ModalConfirmacionCancelacion]
  Campo obligatorio: motivo_cancelacion (Textarea)
  Botones: "Confirmar cancelación" | "Volver"
        │
(usuario escribe motivo y confirma)
        │
        ▼
{PATCH /citas/:id/estado}
  body: { estado: "cancelada", motivo_cancelacion: "..." }
        │
        ├── ✗ error → toast.error
        │
        └── ✓
              │
              ├── {Google Calendar} elimina evento del calendario de la sede
              │
              └── toast.success("Cita cancelada")
                    → [Calendario] o [FichaPaciente] actualizado
```

---

## 10. Recepcionista — Consultar Historia Clínica (vista básica)

```
[FichaPaciente] → (click "Ver Historia Clínica")
        │
        ▼
{GET /historias-clinicas?paciente=:id}
        │
        ├── Sin historias → "Este paciente no tiene historias clínicas registradas"
        │
        └── Con historias → lista de consultas (fecha, médico)
              │
              ▼
★ [HistoriaClinicaBasica] — feature R-08 trackeada al abrir
  Recepcionista ve SOLO:
    ├── Datos de identificación
    ├── Motivo de consulta
    └── Fecha y médico que la creó

  Campos OCULTOS para recepcionista:
    ✗ diagnóstico_principal, diagnóstico_secundario
    ✗ medicamentos_recetados, indicaciones_paciente
    ✗ recomendaciones, interconsultas_examenes
    (filtrado en backend — nunca llegan al frontend)
```

---

## 11. Médico — Ver Agenda del Día

```
Login médico → /portal/dashboard
        │
        ▼
★ [DashboardMedico] — feature M-01 trackeada al cargar
  Panel principal: citas del día agrupadas por hora
        │
(click "Ver agenda del día" o navega a sección agenda)
        │
        ▼
★ [AgendaDia] — feature M-02 trackeada al abrir
{GET /citas?medico=:id&fecha=hoy&estado=pendiente,confirmada}
        │
        └── Lista de citas ordenadas por hora:
              Cada cita muestra: hora, nombre paciente, tipo de consulta, estado
              Acciones por cita:
                ├── "Ver paciente" → [FichaPaciente]
                ├── "Iniciar consulta" → PATCH estado="en_atencion" + [Flujo 12]
                └── "No asistió" → PATCH estado="no_asistio"
```

---

## 12. Médico — Crear Historia Clínica

```
[AgendaDia] → (click "Iniciar consulta" en cita)
        │
        ▼
{PATCH /citas/:id/estado} body: { estado: "en_atencion" }
        │
        ▼
★ [FormularioHistoriaClinica] — feature M-04 trackeada al abrir
  Datos del paciente pre-llenados (solo lectura arriba)
  11 secciones del formulario (acordeón o scroll):

  Sección 1: Datos de Identificación (pre-llenado desde persona)
  Sección 2: Motivo de Consulta*
  Sección 3: Enfermedad Actual
  Sección 4: Antecedentes Personales (6 campos)
  Sección 5: Antecedentes Familiares
  Sección 6: Revisión por Sistemas (8 campos)
  Sección 7: Examen Físico (signos vitales + examen oftalmológico)
  Sección 8: Diagnóstico* — feature M-05 trackeada al completar
  Sección 9: Plan de Manejo* — feature M-05 trackeada al completar
  Sección 10: Evolución y Seguimiento
  Sección 11: Firma del Profesional
        │
(médico llena y envía)
        │
        ▼
{POST /historias-clinicas}
  body: todos los campos de la historia
        │
        ├── ✗ error → toast.error + form se mantiene con datos
        │
        └── ✓ 201
              │
              ├── {PATCH /citas/:id/estado} body: { estado: "completada" }
              │
              └── toast.success("Historia clínica guardada")
                    → [HistoriaClinicaDetalle] con opción "Exportar PDF"
                    → botón "Siguiente paciente" → vuelve a [AgendaDia]
```

---

## 13. Médico — Exportar Historia Clínica a PDF

```
[HistoriaClinicaDetalle] → (click "Exportar PDF")
        │
        ▼
★ Feature M-07 trackeada
        │
        ▼
{GET /historias-clinicas/:id/pdf}
  Backend genera PDF con pdfkit/reportlab
  Incluye: logo clínica, datos paciente, todos los campos,
           firma del médico, fecha
        │
        ├── ✗ error generando PDF → toast.error
        │
        └── ✓ stream del archivo PDF
              │
              ▼
            Browser descarga "HistoriaClinica_[apellido]_[fecha].pdf"
            toast.success("PDF generado")
```

---

## 14. Médico — Ver Historial de Citas del Paciente

```
[FichaPaciente] o [HistoriaClinicaDetalle]
→ (click "Ver historial de citas")
        │
        ▼
★ [HistorialCitas] — feature M-06 trackeada al abrir
{GET /citas?paciente=:id}
        │
        └── Lista cronológica (más reciente primero):
              Cada entrada: fecha, médico, sede, estado, motivo
              (click en cita) → [DetalleCita] con historia clínica asociada si existe
```

---

## 15. Admin — Crear Empleado

```
[AdminDashboard] → (click "Nuevo Empleado")
        │
        ▼
★ [FormularioNuevoEmpleado] — feature A-03 trackeada al abrir
  Campos:
    ├── correo* (email — Supabase enviará invitación)
    ├── rol* (Select: recepcionista / medico / admin)
    ├── nombres*, apellidos*
    ├── tipo_documento*, numero_documento*
    ├── telefono*, fecha_nacimiento, direccion
    └── [Si rol = medico] numero_licencia*
        │
(admin llena y envía)
        │
        ▼
{POST /empleados}
  Backend:
    1. supabase.auth.admin.inviteUserByEmail(correo) → crea usuario en auth.users
    2. INSERT INTO personas (datos personales)
    3. INSERT INTO empleados (id_persona, id_rol, auth_uid, primer_login=TRUE)
    4. Si rol=medico → INSERT INTO medicos (numero_licencia)
    5. Trigger inicializa gamificacion_progreso automáticamente
        │
        ├── ✗ correo ya existe en auth → toast.error("El correo ya está registrado")
        ├── ✗ documento duplicado → toast.error("El documento ya está registrado")
        │
        └── ✓ 201
              toast.success("Empleado creado. Se envió invitación al correo.")
              → [ListaEmpleados] con nuevo empleado visible
```

---

## 16. Admin — Desactivar / Reactivar Empleado

```
[ListaEmpleados] → (click en empleado) → [DetalleEmpleado]
        │
(click "Desactivar" o "Reactivar")
        │
        ▼
[ModalConfirmacion] — "¿Desactivar a [nombre]? No podrá iniciar sesión."
        │
(confirmar)
        │
        ▼
{PATCH /empleados/:id/estado} body: { activo: false/true }
  Backend:
    - UPDATE empleados SET activo = false/true
    - Si desactivar: supabase.auth.admin.updateUserById(auth_uid, { ban_duration: "876600h" })
    - Si reactivar: supabase.auth.admin.updateUserById(auth_uid, { ban_duration: "none" })
        │
        └── toast.success("Empleado desactivado/reactivado")
              → [ListaEmpleados] actualizado
```

---

## 17. Admin — Gestionar Especialidades

```
[AdminConfig] → sección "Especialidades"
        │
        ▼
★ [GestionEspecialidades] — feature A-04 trackeada al abrir
{GET /especialidades} — lista todas (activas e inactivas)
        │
┌── Crear especialidad
│     (click "Nueva Especialidad")
│     → [ModalEspecialidad] campos: nombre*, descripcion
│     → {POST /especialidades}
│     → toast.success + lista actualizada
│
├── Editar especialidad
│     (click "Editar" en fila)
│     → [ModalEspecialidad] pre-llenado
│     → {PUT /especialidades/:id}
│     → toast.success
│
└── Activar / desactivar
      (click toggle activa/inactiva)
      → {PATCH /especialidades/:id/estado} body: { activa: bool }
      → toast.success
```

---

## 18. Admin — Gestionar Médicos y Sedes

```
[AdminConfig] → sección "Médicos"
        │
        ▼
★ [GestionMedicos] — feature A-05 trackeada al abrir
{GET /medicos} — lista médicos con especialidades y sedes
        │
┌── Asignar especialidad a médico
│     (click "Agregar especialidad" en fila médico)
│     → Select especialidades disponibles
│     → {POST /medicos/:id/especialidades} body: { id_especialidad }
│     → toast.success
│
└── Habilitar médico en sede
      (click "Gestionar sedes" en fila médico)
      → [ModalSedesMedico] — checklist de sedes activas
      → (toggle sede)
      → {POST /medicos/:id/sedes} body: { id_sede, activo: bool }
      → toast.success
```

---

## 19. Admin — Dashboard de Gamificación

```
[AdminDashboard] → (click "Gamificación" en sidebar)
        │
        ▼
★ [DashboardGamificacion] — feature A-02 trackeada al abrir
{GET /gamificacion/resumen}
  Retorna lista: [{ id_empleado, nombre, rol, total, visitadas, porcentaje, ultima_actividad }]
        │
        ▼
[TablaProgreso]
  Columnas: Empleado | Rol | Progreso (barra + %) | Última actividad | Acciones
  Filtros: Select rol, Input búsqueda nombre

  Por empleado:
    ├── (click en fila) → modal con detalle de features visitadas vs pendientes
    └── (click "Reactivar tour") → [Flujo 20]

  Métricas resumen arriba:
    ├── Promedio de completado: XX%
    ├── Empleados al 100%: N
    └── Empleados sin iniciar tour: N
```

---

## 20. Admin — Reactivar Tour de Empleado

```
[DashboardGamificacion] → (click "Reactivar tour" en fila empleado)
        │
        ▼
[ModalReactivarTour]
  "¿Reactivar el tour de onboarding para [nombre]?"
  Campo: motivo_reactivacion (Textarea, opcional)
  Botones: "Confirmar" | "Cancelar"
        │
(admin confirma)
        │
        ▼
{POST /gamificacion/tour/reactivar/:empleado_id}
  body: { motivo_reactivacion }
  Backend:
    1. INSERT INTO gamificacion_sesiones_tour (id_empleado, activado_por, motivo)
    2. UPDATE empleados SET primer_login = TRUE
    3. UPDATE gamificacion_progreso SET visitada=FALSE, fecha_visita=NULL
        │
        └── toast.success("Tour reactivado. Se activará en el próximo login del empleado.")
              → [DashboardGamificacion] actualizado
              (el empleado verá el tour en su próximo acceso → [Flujo 22])
```

---

## 21. Admin — Ver Log de Auditoría

```
[AdminDashboard] → (click "Auditoría" en sidebar)
        │
        ▼
★ [LogAuditoria] — feature A-06 trackeada al abrir
{GET /audit?desde=hoy-7días&hasta=hoy}
        │
        ▼
[TablaAuditoria]
  Filtros: DateRange desde/hasta | Select tabla | Input empleado
  Columnas: Timestamp | Empleado | Acción | Tabla | Registro ID

  Badges de acción:
    ├── INSERT → badge verde
    ├── UPDATE → badge azul
    └── DELETE → badge rojo

  (click en fila)
  → [AcordeonDiff]
    ├── "Antes": JSON formateado de datos_anteriores (gris)
    └── "Después": JSON formateado de datos_nuevos (verde/rojo por campo)

  Paginación: 50 registros por página
```

---

## 22. Gamificación — Tour Automático (transversal)

```
Triggers de activación:
  ├── Primer login (primer_login=TRUE en /auth/me)
  └── Admin reactivó tour (primer_login=TRUE de nuevo)
        │
        ▼
Frontend detecta primer_login=TRUE en respuesta de /auth/me
        │
        ▼
import driver.js dinámico (lazy load)
buildTourSteps(rol) genera array de pasos según rol:
  ├── recepcionista → 8 pasos (R-01 a R-08)
  ├── medico        → 7 pasos (M-01 a M-07)
  └── admin         → 7 pasos (A-01 a A-07)
        │
        ▼
driver.drive() — inicia el tour

POR CADA PASO:
  1. driver.js resalta elemento con data-feature-id="X-NN"
  2. Muestra popover con título + descripción + "Paso N de M"
  3. (usuario hace click "Continuar")
  4. onNextClick captura feature_id del elemento resaltado
  5. {PATCH /gamificacion/progreso/:feature_id}
     body: { visitada: true }
  6. Backend actualiza BD + retorna nuevo porcentaje
  7. Barra de progreso en navbar se actualiza en tiempo real
  8. driver.js avanza al siguiente paso

AL COMPLETAR ÚLTIMO PASO:
  onDestroyed callback:
  1. {POST /gamificacion/tour/completar}
     Backend: UPDATE gamificacion_sesiones_tour SET completado=TRUE
  2. Confetti / badge "¡Tour completado! 100% 🎉"
  3. Toast permanente hasta que el usuario lo cierre

NOTA: allowClose: false → no se puede saltar.
      overlayClickBehavior: "none" → click fuera no cierra.
```

---

## 23. Gamificación — Tracking de Progreso (transversal)

```
Ocurre en PARALELO a cualquier flujo del portal.

EN CADA NAVEGACIÓN a sección trackeada:
  ├── Componente monta
  ├── useEffect detecta data-feature-id del contenedor
  └── Si feature no visitada aún:
        {PATCH /gamificacion/progreso/:feature_id}
        body: { visitada: true }
        └── Supabase Realtime emite cambio en gamificacion_progreso
              └── Frontend actualiza barra de progreso en navbar sin reload

BARRA DE PROGRESO EN NAVBAR:
  ├── Siempre visible en portal de empleados
  ├── Porcentaje calculado: visitadas / total_del_rol × 100
  ├── Al llegar a 100%: barra → badge ✓ verde
  └── Tooltip hover: lista de features pendientes

ADMIN EN TIEMPO REAL:
  Si admin tiene abierto el DashboardGamificacion:
  └── Supabase Realtime actualiza la tabla sin necesidad de refrescar
```

---

## 24. Logout

```
[NavbarPortal] → (click "Cerrar sesión")
        │
        ▼
[ModalConfirmacion] — opcional para evitar cierre accidental
        │
(confirmar)
        │
        ▼
supabase.auth.signOut()
  ├── Invalida sesión en Supabase
  └── Limpia tokens del cliente
        │
        ▼
Limpiar estado local:
  ├── React Query: queryClient.clear()
  └── Progreso gamificación en memoria: reset
        │
        ▼
navigate("/")  → [LandingPage]
toast.info("Sesión cerrada")
```

---

## Resumen de Puntos de Tracking Gamificación

| Feature ID | Trigger de tracking | Flujo |
|-----------|--------------------|----|
| R-01 / M-01 / A-01 | Montar [Dashboard] del rol | 5, 11, 19 |
| R-02 | Abrir [FichaPaciente] desde búsqueda | 5 |
| R-03 | Abrir [FormularioNuevoPaciente] | 6 |
| R-04 | Abrir [FormularioCita] con canal=presencial | 7 |
| R-05 | Abrir [FormularioCita] con canal=telefonico | 8 |
| R-06 | Abrir [Calendario] de citas | Tour / nav |
| R-07 | Confirmar cancelación de cita | 9 |
| R-08 | Abrir [HistoriaClinicaBasica] | 10 |
| M-02 | Abrir [AgendaDia] | 11 |
| M-03 | Abrir [HistoriaClinicaDetalle] existente | 14 |
| M-04 | Abrir [FormularioHistoriaClinica] nuevo | 12 |
| M-05 | Completar sección Diagnóstico o Plan de manejo | 12 |
| M-06 | Abrir [HistorialCitas] de paciente | 14 |
| M-07 | Click "Exportar PDF" exitoso | 13 |
| A-02 | Abrir [DashboardGamificacion] | 19 |
| A-03 | Abrir [FormularioNuevoEmpleado] | 15 |
| A-04 | Abrir [GestionEspecialidades] | 17 |
| A-05 | Abrir [GestionMedicos] | 18 |
| A-06 | Abrir [LogAuditoria] | 21 |
| A-07 | Abrir [ReportesCitas] | — |

---

*Documento vivo — actualizar si se agregan flujos o cambia la lógica de navegación.*
