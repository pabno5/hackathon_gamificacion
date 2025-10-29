# 📋 Resumen de Cambios: Documentos en Citas

## 🎯 Objetivo

Permitir que al crear una cita se pueda subir opcionalmente un documento. El documento se almacena en Supabase Storage y se registra en la base de datos, asociándose con la cita mediante el campo `id_documento`.

## ✅ Cambios Realizados

### 1. Nuevas Dependencias Instaladas

Se agregaron las siguientes dependencias al proyecto:

```json
{
  "@supabase/supabase-js": "^2.x.x",  // Cliente de Supabase para Storage
  "multer": "^1.x.x"                   // Middleware para manejar archivos multipart/form-data
}
```

**Instalación**:
```bash
npm install @supabase/supabase-js multer
```

### 2. Nuevo Archivo: `backend/config/supabase.js`

**Descripción**: Configuración del cliente de Supabase Storage.

**Funciones principales**:
- `uploadFile(fileBuffer, fileName, bucketName)`: Sube un archivo a Supabase Storage
- `deleteFile(filePath, bucketName)`: Elimina un archivo de Supabase Storage
- `supabase`: Cliente de Supabase configurado

**Variables de entorno requeridas**:
- `SUPABASE_URL`: URL del proyecto de Supabase
- `SUPABASE_SERVICE_KEY`: Service role key de Supabase

### 3. Modificación: `backend/routes/citas.js`

**Cambios**:

a) **Imports añadidos**:
```javascript
const multer = require('multer');
const { uploadFile } = require('../config/supabase');
```

b) **Configuración de Multer**:
   - Storage en memoria (buffer)
   - Límite de tamaño: 10MB
   - Filtro de tipos de archivo permitidos:
     - PDF
     - Imágenes: JPG, JPEG, PNG
     - Documentos: DOC, DOCX
     - Hojas de cálculo: XLS, XLSX

c) **Modificación del endpoint POST `/api/citas`**:
   - Ahora acepta `multipart/form-data` mediante `upload.single('documento')`
   - Procesa el archivo opcional
   - Si hay archivo:
     1. Lo sube a Supabase Storage
     2. Crea un registro en la tabla `documentos`
     3. Asocia el `id_documento` con la cita
   - Si no hay archivo, funciona como antes

**Nuevos campos aceptados**:
- `documento` (File): Archivo opcional a subir
- `tipo_documento` (String): Tipo/descripción del documento (default: "Documento de cita")

**Ejemplo de uso**:
```javascript
// Sin documento (como antes)
POST /api/citas
Content-Type: application/json
{
  "id_paciente": "uuid",
  "id_medico": "uuid",
  "fecha_cita": "2025-11-15T10:00:00",
  "motivo": "Consulta"
}

// Con documento (nuevo)
POST /api/citas
Content-Type: multipart/form-data
FormData:
  - id_paciente: uuid
  - id_medico: uuid
  - fecha_cita: 2025-11-15T10:00:00
  - motivo: Consulta
  - tipo_documento: Examen de sangre
  - documento: [archivo]
```

### 4. Actualización: `backend/env.config.example`

Se agregaron las siguientes variables de entorno de ejemplo:

```env
# ===== SUPABASE DATABASE Y STORAGE =====
SUPABASE_URL=postgresql://postgres.[REFERENCIA]:[PASSWORD]@db.[REFERENCIA].supabase.co:5432/postgres
SUPABASE_URL=https://[REFERENCIA].supabase.co
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
SUPABASE_SERVICE_KEY=tu_service_role_key_de_supabase
```

### 5. Nueva Documentación

Se crearon los siguientes archivos de documentación:

**a) `backend/CONFIGURACION_STORAGE_CITAS.md`**
- Guía completa de configuración de Supabase Storage
- Instrucciones paso a paso
- Ejemplos de uso con diferentes tecnologías
- Solución de problemas
- Estructura de base de datos

**b) `backend/EJEMPLO_CREAR_CITA_CON_DOCUMENTO.txt`**
- Ejemplos prácticos con cURL, PowerShell, JavaScript, React
- Componente React completo funcional
- Casos de prueba
- Respuestas esperadas
- Errores comunes y soluciones

## 🔄 Flujo de Funcionamiento

```
1. Cliente envía FormData con datos de la cita + archivo opcional
   ↓
2. Multer procesa el archivo y lo almacena en memoria
   ↓
3. Se validan los datos (paciente, médico, etc.)
   ↓
4. Si hay archivo:
   ├─ Se sube a Supabase Storage (bucket: documentos-citas)
   ├─ Se obtiene la URL pública del archivo
   └─ Se crea registro en tabla documentos con la URL
   ↓
5. Se crea la cita con id_documento (o NULL si no hay archivo)
   ↓
6. Se retorna la cita con información del documento (si existe)
```

## 🗄️ Base de Datos

### Tabla Afectada: `citas`

El campo `id_documento` ya existía en la tabla:

```sql
CREATE TABLE citas (
    ...
    id_documento UUID UNIQUE,  -- Ahora se usa para asociar documentos
    ...
    FOREIGN KEY (id_documento) REFERENCES documentos (id_documento)
        ON DELETE SET NULL
);
```

### Tabla Utilizada: `documentos`

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

## 🔧 Configuración Requerida

### Paso 1: Variables de Entorno

Agregar al archivo `.env`:

```env
SUPABASE_URL=https://[tu-proyecto].supabase.co
SUPABASE_SERVICE_KEY=[tu-service-role-key]
```

### Paso 2: Crear Bucket en Supabase

1. Ir a Supabase Dashboard > Storage
2. Crear nuevo bucket: `documentos-citas`
3. Marcar como público (public)

### Paso 3: Configurar Políticas RLS

```sql
-- Permitir subida
CREATE POLICY "Permitir subida de documentos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos-citas');

-- Permitir lectura
CREATE POLICY "Permitir lectura pública de documentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos-citas');
```

### Paso 4: Reiniciar Servidor

```bash
npm run dev
```

## 📊 Respuesta de la API

### Antes (sin documento)
```json
{
  "success": true,
  "data": {
    "id_cita": "...",
    "id_documento": null,
    ...
  }
}
```

### Ahora (con documento)
```json
{
  "success": true,
  "message": "Cita creada con documento exitosamente",
  "data": {
    "id_cita": "...",
    "id_documento": "uuid-del-documento",
    ...,
    "documento": {
      "id_documento": "uuid",
      "tipo_documento": "Examen médico",
      "enlace": "https://xxx.supabase.co/storage/.../archivo.pdf",
      "fecha_subida": "..."
    }
  }
}
```

## 🎨 Compatibilidad

✅ **Totalmente retrocompatible**: Las citas sin documento funcionan exactamente igual que antes.

✅ **Opcional**: El documento es completamente opcional, no afecta la funcionalidad existente.

✅ **Flexible**: Soporta múltiples tipos de archivo y tamaños configurables.

## 🔒 Seguridad

- ✅ Validación de tipo de archivo (MIME type)
- ✅ Límite de tamaño de archivo (10MB)
- ✅ Service Key no expuesta al frontend
- ✅ URLs únicas con timestamp para evitar colisiones
- ✅ Políticas RLS en Supabase Storage

## 📝 Notas Importantes

1. El archivo se almacena en Supabase Storage, no en el servidor
2. La URL del archivo es pública y accesible directamente
3. Los documentos se asocian al paciente (id_persona)
4. Si se elimina un documento, la cita permanece (ON DELETE SET NULL)
5. El campo `id_documento` en citas es UNIQUE (1 cita = máximo 1 documento)

## 🧪 Testing

Para probar la funcionalidad:

1. Usar Postman/Insomnia con form-data
2. Usar el componente React de ejemplo
3. Usar cURL (ver ejemplos en EJEMPLO_CREAR_CITA_CON_DOCUMENTO.txt)

## 🚀 Próximos Pasos Sugeridos

- [ ] Implementar eliminación de archivos al eliminar documentos
- [ ] Agregar soporte para múltiples documentos por cita
- [ ] Implementar compresión de imágenes antes de subir
- [ ] Agregar vista previa de documentos en frontend
- [ ] Implementar descarga de documentos
- [ ] Agregar validación de virus/malware

## 📚 Archivos Creados/Modificados

### Creados
- ✅ `backend/config/supabase.js`
- ✅ `backend/CONFIGURACION_STORAGE_CITAS.md`
- ✅ `backend/EJEMPLO_CREAR_CITA_CON_DOCUMENTO.txt`
- ✅ `backend/RESUMEN_CAMBIOS_DOCUMENTOS_CITAS.md` (este archivo)

### Modificados
- ✅ `backend/routes/citas.js`
- ✅ `backend/env.config.example`
- ✅ `backend/package.json` (dependencias)

## 🎓 Recursos

- [Documentación de Supabase Storage](https://supabase.com/docs/guides/storage)
- [Documentación de Multer](https://github.com/expressjs/multer)
- [MDN: FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

---

**Fecha de implementación**: Octubre 29, 2025
**Versión**: 1.0.0
**Estado**: ✅ Completado y probado

