# 🔐 Configuración de Variables de Entorno

## 📋 Opciones de Configuración

El sistema soporta **3 formas** de configurar Firebase. Elige la que mejor se adapte a tu caso.

---

## ✅ OPCIÓN 1: Archivo JSON (Recomendado para Desarrollo)

### Ventajas:
- ✅ Más fácil de configurar
- ✅ Un solo archivo
- ✅ Ideal para desarrollo local

### Pasos:

#### 1. Descargar credenciales

1. Ve a [Firebase Console](https://console.firebase.google.com/project/fir-auth-a1d39)
2. Clic en ⚙️ → **Configuración del proyecto**
3. Pestaña **Cuentas de servicio**
4. Clic en **"Generar nueva clave privada"**
5. Se descarga `fir-auth-a1d39-firebase-adminsdk-xxxxx.json`

#### 2. Colocar archivo

```bash
# Desde la carpeta backend
mkdir -p config
# Renombrar y mover el archivo a:
mv ~/Downloads/fir-auth-a1d39-*.json ./config/firebase-credentials.json
```

#### 3. Crear .env

Crea el archivo `.env` en la carpeta `backend`:

```env
PORT=3000
NODE_ENV=development
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-credentials.json
```

#### 4. Verificar

```bash
npm start
```

Deberías ver:
```
📁 Cargando credenciales desde archivo: ./config/firebase-credentials.json
✅ Firebase Admin inicializado correctamente
🎯 Project ID: fir-auth-a1d39
```

---

## 🚀 OPCIÓN 2: Variables Individuales (Recomendado para Producción)

### Ventajas:
- ✅ Perfecto para Heroku, Vercel, Railway
- ✅ No necesitas subir archivos
- ✅ Más seguro para producción

### Pasos:

#### 1. Abrir archivo JSON

Abre el archivo `firebase-credentials.json` descargado y copia los valores.

#### 2. Crear .env

```env
PORT=3000
NODE_ENV=production

# Firebase Admin
FIREBASE_PROJECT_ID=fir-auth-a1d39
FIREBASE_PRIVATE_KEY_ID=abc123def456...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fir-auth-a1d39.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789012345678901
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40fir-auth-a1d39.iam.gserviceaccount.com
```

#### ⚠️ Importante para FIREBASE_PRIVATE_KEY:
- Debe estar entre comillas dobles
- Mantener los `\n` literales (no reemplazar por saltos de línea)
- Debe incluir `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`

#### 3. Verificar

```bash
npm start
```

Deberías ver:
```
🔐 Cargando credenciales desde variables de entorno
✅ Firebase Admin inicializado correctamente
🎯 Project ID: fir-auth-a1d39
```

---

## 📝 OPCIÓN 3: JSON String Completo

### Ventajas:
- ✅ Una sola variable de entorno
- ✅ Funciona en cualquier plataforma

### Pasos:

#### 1. Convertir JSON a string

Abre el archivo `firebase-credentials.json` y copia TODO el contenido en una sola línea.

#### 2. Crear .env

```env
PORT=3000
NODE_ENV=development
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"fir-auth-a1d39","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

⚠️ **Importante**: Debe ser TODO en UNA sola línea y entre comillas simples.

---

## 🔍 Verificar Configuración

### Test rápido:

```bash
curl http://localhost:3000/test-connection
```

Respuesta esperada:
```json
{
  "success": true,
  "status": "Conectado a Firebase",
  "projectId": "fir-auth-a1d39",
  "message": "¡Conexión establecida exitosamente!"
}
```

---

## 🐛 Solución de Problemas

### ❌ Error: "No se encontraron credenciales"

**Solución:**
- Verifica que el archivo `.env` existe
- Verifica que la variable está configurada
- Reinicia el servidor

### ❌ Error: "Cannot find module './config/firebase-credentials.json'"

**Solución:**
- Verifica que el archivo existe: `ls backend/config/firebase-credentials.json`
- Verifica la ruta en `.env`: `FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-credentials.json`

### ❌ Error: "Invalid service account"

**Solución:**
- Descarga nuevamente el archivo desde Firebase Console
- Verifica que no esté corrupto
- Verifica que sea del proyecto correcto

### ❌ Error en FIREBASE_PRIVATE_KEY

**Solución:**
```env
# ❌ MAL (sin comillas)
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...

# ❌ MAL (con saltos de línea reales)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkq...
-----END PRIVATE KEY-----"

# ✅ BIEN (con \n literales y entre comillas)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n"
```

---

## 🌐 Configuración en Diferentes Plataformas

### Heroku

```bash
heroku config:set FIREBASE_PROJECT_ID=fir-auth-a1d39
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fir-auth-a1d39.iam.gserviceaccount.com
heroku config:set FIREBASE_CLIENT_ID=123456789012345678901
heroku config:set FIREBASE_CLIENT_CERT_URL=https://...
```

### Vercel

En el dashboard de Vercel:
1. Settings → Environment Variables
2. Agregar cada variable individualmente
3. Para `FIREBASE_PRIVATE_KEY`, pegar el valor completo con `\n`

### Railway

En el dashboard de Railway:
1. Variables → New Variable
2. Agregar cada variable
3. Railway maneja automáticamente los saltos de línea

---

## 🔒 Seguridad

### ⚠️ NUNCA subir a Git:
- ❌ `.env`
- ❌ `firebase-credentials.json`
- ❌ Cualquier archivo con claves privadas

### ✅ Agregar al .gitignore:
```gitignore
# Environment variables
.env
.env.local
.env.production

# Firebase credentials
config/firebase-credentials.json
**/firebase-credentials.json
```

---

## 📚 Tu Proyecto

- **Project ID:** `fir-auth-a1d39`
- **Console:** https://console.firebase.google.com/project/fir-auth-a1d39
- **Auth Domain:** `fir-auth-a1d39.firebaseapp.com`

---

## ✅ Checklist

- [ ] Descargaste el archivo de credenciales de Firebase
- [ ] Colocaste el archivo en `backend/config/firebase-credentials.json` (Opción 1)
  - O configuraste las variables individuales (Opción 2)
  - O configuraste el JSON string (Opción 3)
- [ ] Creaste el archivo `.env` desde `.env.example`
- [ ] Agregaste `.env` y `firebase-credentials.json` al `.gitignore`
- [ ] Ejecutaste `npm install`
- [ ] El servidor inicia sin errores: `npm start`
- [ ] La ruta `/test-connection` responde correctamente

---

¡Listo! Tu configuración de Firebase está completa 🎉

