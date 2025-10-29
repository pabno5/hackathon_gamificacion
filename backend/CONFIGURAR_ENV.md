# ⚙️ Guía Rápida: Configurar Variables de Entorno

## 🚨 Error Común

Si ves este error al iniciar el servidor:

```
Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

Es porque las variables de entorno no están configuradas correctamente.

## 📝 Paso a Paso

### 1. Crear el archivo `.env`

En la carpeta `backend/`, crea un archivo llamado `.env` (nota el punto al inicio).

```bash
# En Windows PowerShell
cd backend
New-Item -ItemType File -Name .env

# En Linux/Mac
cd backend
touch .env
```

### 2. Copiar el contenido base

Copia el contenido de `env.config.example` y pégalo en `.env`:

```bash
# PowerShell
Get-Content env.config.example | Set-Content .env

# Linux/Mac
cp env.config.example .env
```

### 3. Configurar las variables

Abre el archivo `.env` y configura las siguientes variables:

```env
# ============ SERVIDOR ============
PORT=3000
NODE_ENV=development

# ============ FIREBASE AUTH ============
FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json

# ============ SUPABASE ============
# URL del Transaction Pooler para PostgreSQL
SUPABASE_DATABASE_URL=postgresql://postgres.xxxxx:tu_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# URL del proyecto (HTTPS) para Storage
SUPABASE_PROJECT_URL=https://xxxxx.supabase.co

# Service Role Key
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔑 Cómo Obtener las Credenciales

### SUPABASE_DATABASE_URL (Transaction Pooler)

1. Ve a [Supabase Dashboard](https://app.supabase.com/)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Database**
4. Busca **Connection string** → **Transaction pooler** (⚡ con rayito)
5. Copia la URL y reemplaza `[YOUR-PASSWORD]` con tu contraseña
6. **Nota**: El puerto es **6543** (no 5432) y usa el pooler de Supabase

**Ejemplo**:
```
SUPABASE_DATABASE_URL=postgresql://postgres.abcdefg:MiPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### SUPABASE_PROJECT_URL (Proyecto HTTPS)

1. En el mismo dashboard de Supabase
2. Ve a **Settings** → **API**
3. Busca **Project URL**
4. Copia la URL (debe empezar con `https://`)

**Ejemplo**:
```
SUPABASE_PROJECT_URL=https://abcdefghijklmnop.supabase.co
```

### SUPABASE_SERVICE_KEY

1. En **Settings** → **API**
2. Busca **Project API keys**
3. Copia el **service_role** key (¡NO el anon public!)
4. Es un token JWT largo que empieza con `eyJ...`

**Ejemplo**:
```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk...
```

## ✅ Verificar la Configuración

Tu archivo `.env` debería verse así (con tus valores reales):

```env
PORT=3000
NODE_ENV=development

FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json

# Supabase - Dos URLs diferentes
SUPABASE_DATABASE_URL=postgresql://postgres.abcdef:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_PROJECT_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Reiniciar el Servidor

Después de configurar el `.env`:

```bash
cd backend
npm run dev
```

Deberías ver:

```
✅ Conectado a Supabase PostgreSQL
🕐 Server time: 2025-10-29T...
Servidor corriendo en http://localhost:3000
```

## ❌ Errores Comunes

### Error: "Invalid supabaseUrl"

**Causa**: `SUPABASE_PROJECT_URL` tiene la URL de PostgreSQL en lugar de la URL HTTPS del proyecto.

**Solución**:
```env
# ❌ INCORRECTO
SUPABASE_PROJECT_URL=postgresql://postgres...

# ✅ CORRECTO
SUPABASE_PROJECT_URL=https://xxxxx.supabase.co
```

### Error: "password authentication failed"

**Causa**: La contraseña en `SUPABASE_DATABASE_URL` es incorrecta.

**Solución**: Verifica que la contraseña sea la que configuraste al crear el proyecto de Supabase.

### Error: "connection timeout"

**Causa**: No estás usando el Transaction Pooler URL (puerto 6543).

**Solución**: Asegúrate de usar el Transaction Pooler en lugar de la URI directa:
```env
# ✅ CORRECTO (puerto 6543)
SUPABASE_DATABASE_URL=postgresql://postgres.xxx:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Error: "Cannot find module './config/serviceAccountKey.json'"

**Causa**: No has descargado las credenciales de Firebase.

**Solución**: 
1. Ve a Firebase Console
2. Descarga el archivo de credenciales
3. Guárdalo como `backend/config/serviceAccountKey.json`

## 📋 Checklist

Antes de iniciar el servidor, verifica:

- [ ] Archivo `.env` creado en `backend/`
- [ ] `SUPABASE_DATABASE_URL` configurada (Transaction Pooler, puerto 6543)
- [ ] `SUPABASE_PROJECT_URL` configurada (URL HTTPS del proyecto)
- [ ] `SUPABASE_SERVICE_KEY` configurada (token JWT largo)
- [ ] `FIREBASE_SERVICE_ACCOUNT_PATH` apunta al archivo correcto
- [ ] Archivo `.env` está en `.gitignore` (NO lo subas a Git)

## 🔐 Seguridad

⚠️ **IMPORTANTE**:
- NUNCA subas el archivo `.env` a Git
- NUNCA compartas las keys públicamente
- El `.env` debe estar en `.gitignore`
- Usa diferentes credenciales para desarrollo y producción

## 📚 Más Información

Para más detalles, consulta:
- `COMO_OBTENER_CREDENCIALES_SUPABASE.md`
- `CONFIGURACION_STORAGE_CITAS.md`

---

**¿Sigues teniendo problemas?** Revisa que las variables estén exactamente como se muestra arriba.

