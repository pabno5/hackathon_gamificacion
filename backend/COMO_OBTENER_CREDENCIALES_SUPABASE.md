# 🔑 Cómo Obtener las Credenciales de Supabase

## 📋 Introducción

Para usar la funcionalidad de subida de documentos en citas, necesitas configurar las credenciales de Supabase. Este documento te guía paso a paso.

## 🚀 Paso 1: Crear Cuenta en Supabase

1. Ve a [https://supabase.com/](https://supabase.com/)
2. Click en **"Start your project"**
3. Regístrate con:
   - Email y contraseña
   - GitHub
   - O Google

## 📦 Paso 2: Crear un Proyecto

1. Una vez dentro del dashboard, click en **"New Project"**
2. Selecciona una organización o crea una nueva
3. Completa la información del proyecto:
   - **Name**: `hackathon-gamificacion` (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (¡guárdala!)
   - **Region**: Selecciona la más cercana a tu ubicación
     - Para América del Sur: `South America (São Paulo)`
     - Para América del Norte: `West US (North California)`
   - **Pricing Plan**: Selecciona **Free** para empezar
4. Click en **"Create new project"**
5. Espera 2-3 minutos mientras se crea el proyecto

## 🔍 Paso 3: Obtener SUPABASE_URL

1. En el dashboard de tu proyecto, ve a **Settings** (⚙️ en la barra lateral)
2. Click en **API**
3. En la sección **"Project URL"**, encontrarás:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
```

Copia esta URL completa. Este es tu `SUPABASE_URL`.

## 🔐 Paso 4: Obtener SUPABASE_SERVICE_KEY

En la misma página (Settings > API), encontrarás dos tipos de keys:

### anon (public)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh...
```
Esta key es pública y puede usarse en el frontend.

### service_role (secret) ⚠️
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh...
```
**Esta es la key que necesitas**: `SUPABASE_SERVICE_KEY`

⚠️ **MUY IMPORTANTE**: 
- Esta key tiene acceso completo a tu proyecto
- NUNCA la compartas públicamente
- NUNCA la subas a GitHub
- Solo úsala en el backend

## 💾 Paso 5: Obtener la URL del Transaction Pooler (SUPABASE_DATABASE_URL)

1. En el dashboard, ve a **Settings** > **Database**
2. Baja hasta la sección **"Connection string"**
3. Selecciona el tab **"Transaction pooler"** (⚡ con icono de rayito)
4. Encontrarás algo como:

```
postgresql://postgres.[referencia]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

5. Reemplaza `[YOUR-PASSWORD]` con la contraseña que creaste en el Paso 2
6. **Nota importante**: Usa el **Transaction pooler** (puerto 6543), no la URI directa

**Ejemplo completo**:
```
SUPABASE_DATABASE_URL=postgresql://postgres.abcdefghijklmnop:MiPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

⚠️ **VENTAJAS del Transaction Pooler**:
- Maneja conexiones automáticamente
- Mejor rendimiento
- No necesitas configurar pool manualmente
- Recomendado por Supabase

## 📝 Paso 6: Configurar el Archivo .env

Crea un archivo `.env` en la carpeta `backend/` con el siguiente contenido:

```env
# ============ SERVIDOR ============
PORT=3000
NODE_ENV=development

# ============ FIREBASE AUTH ============
FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json

# ============ SUPABASE ============
# Transaction Pooler para PostgreSQL (del Paso 5)
SUPABASE_DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# URL del proyecto HTTPS para Storage (del Paso 3)
SUPABASE_PROJECT_URL=https://xxxxxxxxxxxxx.supabase.co

# Service Role Key (del Paso 4)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...

# OPCIONAL: Anon key (para acceso público)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

**⚠️ IMPORTANTE - Diferencias entre URLs**:
- `SUPABASE_DATABASE_URL` = Transaction Pooler PostgreSQL (puerto 6543)
- `SUPABASE_PROJECT_URL` = URL HTTPS del proyecto
- NO uses la URI directa (puerto 5432), usa el Transaction Pooler

## ✅ Paso 7: Verificar las Credenciales

### Opción A: Desde el Terminal

```bash
cd backend
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
console.log('✅ Supabase conectado correctamente');
"
```

### Opción B: Iniciar el Servidor

```bash
cd backend
npm run dev
```

Deberías ver en la consola:
```
✅ Conectado a Supabase PostgreSQL
```

## 🗂️ Paso 8: Crear el Bucket de Storage

1. En el dashboard de Supabase, ve a **Storage** en la barra lateral
2. Click en **"Create a new bucket"**
3. Completa:
   - **Name**: `documentos-citas`
   - **Public bucket**: ✅ **Activado** (para que las URLs sean accesibles)
   - Click **"Create bucket"**

4. Click en el bucket recién creado
5. Ve a **"Policies"** (en el menú superior)
6. Click en **"New Policy"**
7. Selecciona **"For full customization"**

**Crear 3 políticas**:

### Política 1: INSERT (Subir archivos)
```sql
Policy name: Permitir subida de documentos
Policy command: INSERT
WITH CHECK: bucket_id = 'documentos-citas'
```

### Política 2: SELECT (Leer archivos)
```sql
Policy name: Permitir lectura pública
Policy command: SELECT
USING: bucket_id = 'documentos-citas'
```

### Política 3: DELETE (Eliminar archivos) - Opcional
```sql
Policy name: Permitir eliminación de documentos
Policy command: DELETE
USING: bucket_id = 'documentos-citas'
```

## 🎯 Resumen de Variables Necesarias

| Variable | Dónde Obtenerla | Ejemplo | Uso |
|----------|----------------|---------|-----|
| `SUPABASE_DATABASE_URL` | Settings > Database > Transaction pooler | `postgresql://...pooler.supabase.com:6543/...` | Conexión PostgreSQL con pooling |
| `SUPABASE_PROJECT_URL` | Settings > API > Project URL | `https://xxx.supabase.co` | Cliente de Supabase Storage |
| `SUPABASE_SERVICE_KEY` | Settings > API > service_role | `eyJhbGc...` | Autenticación con permisos completos |
| `SUPABASE_ANON_KEY` | Settings > API > anon public | `eyJhbGc...` | Cliente público (opcional) |

## 🔒 Seguridad

### ✅ Hacer
- Guardar las keys en el archivo `.env`
- Agregar `.env` al `.gitignore`
- Usar diferentes keys para desarrollo y producción
- Rotar las keys periódicamente

### ❌ No Hacer
- Subir el `.env` a GitHub
- Compartir las keys públicamente
- Usar la service_role key en el frontend
- Hardcodear las keys en el código

## 🆘 Solución de Problemas

### Error: "Invalid API key"
**Causa**: La key es incorrecta o está mal copiada.
**Solución**: Vuelve a copiar la key desde Settings > API, asegúrate de copiarla completa.

### Error: "Project not found"
**Causa**: La URL del proyecto es incorrecta.
**Solución**: Verifica que la URL sea exactamente como aparece en Settings > API.

### Error: "The resource was not found"
**Causa**: El bucket no existe o el nombre es incorrecto.
**Solución**: Verifica que el bucket `documentos-citas` exista en Storage.

### Error: "new row violates row-level security policy"
**Causa**: Las políticas RLS no están configuradas correctamente.
**Solución**: Revisa el Paso 8 y asegúrate de crear las políticas.

## 📞 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Storage](https://supabase.com/docs/guides/storage)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [API Reference](https://supabase.com/docs/reference/javascript/introduction)

## 📧 Soporte

Si tienes problemas:
1. Revisa la [documentación oficial](https://supabase.com/docs)
2. Visita el [Discord de Supabase](https://discord.supabase.com/)
3. Busca en [GitHub Discussions](https://github.com/supabase/supabase/discussions)

---

**¡Listo!** Ya tienes todas las credenciales necesarias para usar la funcionalidad de documentos en citas. 🎉

