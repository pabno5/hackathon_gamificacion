# Configuración de Storage para Documentos en Citas

## 📋 Descripción

Este documento explica cómo configurar y usar la funcionalidad de subida de documentos al crear una cita. Los documentos se almacenan en Supabase Storage y se registran en la base de datos.

## 🔧 Configuración Inicial

### 1. Crear Bucket en Supabase

1. Ve a tu proyecto en Supabase Dashboard: https://app.supabase.com/
2. Navega a **Storage** en el menú lateral
3. Click en **New bucket**
4. Configura el bucket:
   - **Name**: `documentos-citas`
   - **Public**: ✅ Activado (para que los documentos sean accesibles por URL)
   - **File size limit**: 10 MB (o según tus necesidades)
   - **Allowed MIME types**: Opcional, puedes dejarlo vacío
5. Click **Create bucket**

### 2. Configurar Políticas de Acceso (RLS - Row Level Security)

En Storage > documentos-citas > Policies, crea las siguientes políticas:

**Política 1: Permitir subida de archivos**
```sql
CREATE POLICY "Permitir subida de documentos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos-citas');
```

**Política 2: Permitir lectura pública**
```sql
CREATE POLICY "Permitir lectura pública de documentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos-citas');
```

**Política 3: Permitir eliminación** (opcional)
```sql
CREATE POLICY "Permitir eliminación de documentos"
ON storage.objects FOR DELETE
USING (bucket_id = 'documentos-citas');
```

### 3. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# URL de tu proyecto Supabase
SUPABASE_URL=https://[TU-REFERENCIA].supabase.co

# Service Role Key (con permisos completos)
# Obtén este key desde: Settings > API > service_role key
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opcional: Anon Key (para acceso público)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANTE**: El `SUPABASE_SERVICE_KEY` debe mantenerse secreto y nunca compartirse públicamente.

## 📤 Uso de la API

### Crear Cita con Documento (Opcional)

**Endpoint**: `POST /api/citas`

**Tipo de Request**: `multipart/form-data`

**Campos del formulario**:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id_paciente` | UUID | ✅ Sí | ID del paciente |
| `id_medico` | UUID | ✅ Sí | ID del médico |
| `fecha_cita` | DateTime | ✅ Sí | Fecha y hora de la cita |
| `motivo` | String | ❌ No | Motivo de la cita |
| `estado` | String | ❌ No | Estado (default: 'pendiente') |
| `observaciones` | Text | ❌ No | Observaciones adicionales |
| `tipo_documento` | String | ❌ No | Tipo de documento (default: 'Documento de cita') |
| `documento` | File | ❌ No | Archivo a subir (max 10MB) |

**Tipos de archivos permitidos**:
- PDF (`.pdf`)
- Imágenes: JPG, JPEG, PNG
- Documentos: DOC, DOCX
- Hojas de cálculo: XLS, XLSX

### Ejemplo con cURL

**Sin documento**:
```bash
curl -X POST http://localhost:3000/api/citas \
  -H "Content-Type: application/json" \
  -d '{
    "id_paciente": "uuid-del-paciente",
    "id_medico": "uuid-del-medico",
    "fecha_cita": "2025-11-01T10:00:00",
    "motivo": "Consulta general"
  }'
```

**Con documento**:
```bash
curl -X POST http://localhost:3000/api/citas \
  -F "id_paciente=uuid-del-paciente" \
  -F "id_medico=uuid-del-medico" \
  -F "fecha_cita=2025-11-01T10:00:00" \
  -F "motivo=Consulta general" \
  -F "tipo_documento=Examen de laboratorio" \
  -F "documento=@/ruta/al/archivo.pdf"
```

### Ejemplo con JavaScript (Fetch API)

```javascript
// Crear FormData
const formData = new FormData();
formData.append('id_paciente', 'uuid-del-paciente');
formData.append('id_medico', 'uuid-del-medico');
formData.append('fecha_cita', '2025-11-01T10:00:00');
formData.append('motivo', 'Consulta general');
formData.append('tipo_documento', 'Examen de laboratorio');

// Si hay un archivo seleccionado
const fileInput = document.getElementById('fileInput');
if (fileInput.files.length > 0) {
  formData.append('documento', fileInput.files[0]);
}

// Enviar request
fetch('http://localhost:3000/api/citas', {
  method: 'POST',
  body: formData
})
  .then(response => response.json())
  .then(data => {
    console.log('Cita creada:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Ejemplo con Axios

```javascript
import axios from 'axios';

const crearCita = async (datosFormulario, archivo) => {
  const formData = new FormData();
  
  // Agregar campos
  formData.append('id_paciente', datosFormulario.id_paciente);
  formData.append('id_medico', datosFormulario.id_medico);
  formData.append('fecha_cita', datosFormulario.fecha_cita);
  formData.append('motivo', datosFormulario.motivo);
  
  // Agregar archivo si existe
  if (archivo) {
    formData.append('documento', archivo);
    formData.append('tipo_documento', 'Examen médico');
  }
  
  try {
    const response = await axios.post('/api/citas', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('Cita creada:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al crear cita:', error);
    throw error;
  }
};
```

## 📊 Respuesta de la API

### Respuesta Exitosa (sin documento)
```json
{
  "success": true,
  "message": "Cita creada exitosamente",
  "data": {
    "id_cita": "uuid-de-la-cita",
    "id_paciente": "uuid-del-paciente",
    "id_medico": "uuid-del-medico",
    "fecha_cita": "2025-11-01T10:00:00",
    "motivo": "Consulta general",
    "estado": "pendiente",
    "observaciones": null,
    "id_documento": null,
    "fecha_creacion": "2025-10-29T15:30:00"
  }
}
```

### Respuesta Exitosa (con documento)
```json
{
  "success": true,
  "message": "Cita creada con documento exitosamente",
  "data": {
    "id_cita": "uuid-de-la-cita",
    "id_paciente": "uuid-del-paciente",
    "id_medico": "uuid-del-medico",
    "fecha_cita": "2025-11-01T10:00:00",
    "motivo": "Consulta general",
    "estado": "pendiente",
    "observaciones": null,
    "id_documento": "uuid-del-documento",
    "fecha_creacion": "2025-10-29T15:30:00",
    "documento": {
      "id_documento": "uuid-del-documento",
      "id_persona": "uuid-del-paciente",
      "tipo_documento": "Examen de laboratorio",
      "enlace": "https://[tu-proyecto].supabase.co/storage/v1/object/public/documentos-citas/documentos/1730000000000-archivo.pdf",
      "fecha_subida": "2025-10-29T15:30:00"
    }
  }
}
```

### Respuesta de Error

**Error: Archivo demasiado grande**
```json
{
  "success": false,
  "error": "El archivo es demasiado grande. Tamaño máximo: 10MB"
}
```

**Error: Tipo de archivo no permitido**
```json
{
  "success": false,
  "error": "Tipo de archivo no permitido: application/zip. Solo se permiten PDF, imágenes (JPG, PNG) y documentos (DOC, DOCX, XLS, XLSX)."
}
```

**Error: Error al subir el archivo**
```json
{
  "success": false,
  "error": "Error al subir el archivo: [mensaje de error]"
}
```

## 🔍 Flujo de Creación de Cita con Documento

```
┌─────────────────┐
│ Cliente envía   │
│ FormData con    │
│ archivo         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Multer procesa  │
│ el archivo y lo │
│ guarda en       │
│ memoria (buffer)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Se validan los  │
│ datos de la cita│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Se sube archivo │
│ a Supabase      │
│ Storage         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Se crea registro│
│ en tabla        │
│ documentos con  │
│ la URL          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Se crea la cita │
│ con id_documento│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Se retorna la   │
│ cita creada con │
│ info del        │
│ documento       │
└─────────────────┘
```

## 🗄️ Estructura de Base de Datos

### Tabla `documentos`
```sql
CREATE TABLE documentos (
    id_documento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona UUID NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    enlace TEXT NOT NULL,  -- URL del archivo en Supabase Storage
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_persona) REFERENCES personas (id_persona)
);
```

### Tabla `citas` (con relación a documentos)
```sql
CREATE TABLE citas (
    id_cita UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_paciente UUID NOT NULL,
    id_medico UUID NOT NULL,
    id_documento UUID UNIQUE,  -- Relación opcional con documentos
    fecha_cita TIMESTAMP NOT NULL,
    motivo VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'pendiente',
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_paciente) REFERENCES personas (id_persona),
    FOREIGN KEY (id_medico) REFERENCES medicos (id_medico),
    FOREIGN KEY (id_documento) REFERENCES documentos (id_documento)
        ON DELETE SET NULL  -- Si se elimina el documento, la cita no se elimina
);
```

## 🛠️ Solución de Problemas

### El archivo no se sube

1. **Verificar variables de entorno**: Asegúrate de que `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` estén configuradas correctamente.

2. **Verificar permisos del bucket**: Revisa que las políticas RLS estén configuradas correctamente.

3. **Verificar tipo de archivo**: Asegúrate de que el archivo sea de un tipo permitido.

4. **Verificar tamaño**: El archivo no debe superar los 10MB.

### Error: "Bucket not found"

Asegúrate de que el bucket `documentos-citas` esté creado en Supabase Storage.

### La URL del archivo no es accesible

Verifica que el bucket sea público. Ve a Storage > documentos-citas y asegúrate de que la opción "Public" esté activada.

## 📝 Notas Adicionales

- Los archivos se almacenan con un timestamp en el nombre para evitar colisiones.
- El campo `id_documento` en la tabla `citas` es opcional (puede ser NULL).
- Si se elimina un documento, la cita permanece pero `id_documento` se establece en NULL.
- Los documentos quedan asociados a la persona (paciente) que creó la cita.

## 🔐 Seguridad

- **Service Key**: Nunca expongas el `SUPABASE_SERVICE_KEY` en el frontend.
- **Validación**: Los archivos se validan por tipo MIME antes de ser aceptados.
- **Tamaño**: Hay un límite de 10MB para prevenir abusos.
- **Storage**: Los archivos se almacenan en un bucket público de Supabase, pero con URLs únicas.

## 📚 Referencias

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Multer Documentation](https://github.com/expressjs/multer)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

