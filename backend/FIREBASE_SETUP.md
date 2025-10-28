# 🔥 Configuración de Firebase para el Sistema de Autenticación

## 📋 Pasos para Configurar Firebase

### 1. Crear un Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Sigue los pasos del asistente
4. Una vez creado, accede al proyecto

### 2. Habilitar Firebase Authentication

1. En el menú lateral, ve a **Authentication**
2. Haz clic en **Comenzar**
3. En la pestaña **Sign-in method**, habilita:
   - ✅ **Correo electrónico/Contraseña**
4. Guarda los cambios

### 3. Obtener Credenciales del Cliente (Web)

1. Ve a **Configuración del proyecto** (ícono de engranaje)
2. En la pestaña **General**, baja hasta **Tus apps**
3. Si no tienes una app web, haz clic en el ícono **</>** (Web)
4. Registra la app con un nombre (ej: "Mi App Web")
5. Copia la configuración de Firebase:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 4. Generar Clave Privada del Servicio (Admin SDK)

1. En **Configuración del proyecto** → **Cuentas de servicio**
2. Selecciona **Node.js**
3. Haz clic en **Generar nueva clave privada**
4. Se descargará un archivo JSON con las credenciales
5. **¡IMPORTANTE!** Guarda este archivo de forma segura, **nunca lo subas a Git**

### 5. Configurar Variables de Entorno

Crea o edita el archivo `.env` en la carpeta `backend`:

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Configuración de Supabase (para almacenar datos adicionales)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_supabase_anon_key

# Firebase Client Config (para el frontend)
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (para el backend)
# Opción 1: Ruta al archivo de credenciales
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-credentials.json

# Opción 2: JSON completo como string (para deploy en servicios cloud)
# FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

### 6. Colocar el Archivo de Credenciales

**Opción A: Archivo JSON (Recomendado para desarrollo)**

1. Crea la carpeta `backend/config/` si no existe
2. Coloca el archivo JSON descargado en `backend/config/firebase-credentials.json`
3. Agrega esta ruta al `.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-credentials.json
   ```
4. **¡IMPORTANTE!** Agrega esta ruta al `.gitignore`:
   ```
   # Firebase credentials
   config/firebase-credentials.json
   ```

**Opción B: Variable de Entorno (Recomendado para producción)**

1. Abre el archivo JSON descargado
2. Copia todo su contenido (es un objeto JSON)
3. Conviértelo a una sola línea (sin saltos de línea)
4. Agrégalo al `.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"tu-proyecto",...}'
   ```

### 7. Configurar la Base de Datos

Ejecuta el script SQL en Supabase:

```bash
# El archivo database_setup.sql ya está actualizado para Firebase
```

Ejecuta en el SQL Editor de Supabase:
- Abre el archivo `database_setup.sql`
- Copia y pega el contenido
- Ejecuta el script

## 🔐 Seguridad

### ⚠️ NUNCA subas a Git:
- ❌ Archivo `firebase-credentials.json`
- ❌ Claves privadas
- ❌ Archivo `.env`

### ✅ Agrega al `.gitignore`:
```
# Environment variables
.env
.env.local
.env.production

# Firebase credentials
config/firebase-credentials.json
**/firebase-credentials.json
```

## 📦 Instalar Dependencias

```bash
cd backend
npm install
```

Esto instalará:
- `firebase` - SDK de Firebase para cliente
- `firebase-admin` - SDK de Firebase Admin para servidor

## 🧪 Verificar la Configuración

Una vez configurado todo, inicia el servidor:

```bash
npm start
```

Deberías ver:
```
✅ Firebase Admin inicializado correctamente
✅ Firebase Client inicializado correctamente
Servidor corriendo en http://localhost:3000
```

## 🌐 Flujo de Autenticación con Firebase

### Backend (Este proyecto)
1. **Registro**: El backend usa Firebase Admin SDK para crear usuarios
2. **Custom Claims**: Se establecen roles personalizados (administrador/empleado)
3. **Verificación**: El middleware verifica tokens de Firebase
4. **Datos adicionales**: Se almacenan en Supabase

### Frontend (Debe implementarse)
El frontend debe:
1. Usar Firebase Client SDK para autenticación
2. Llamar a `signInWithEmailAndPassword()` para login
3. Obtener el `idToken` con `user.getIdToken()`
4. Enviar el `idToken` al backend en las peticiones

## 📚 Recursos

- [Firebase Console](https://console.firebase.google.com/)
- [Documentación Firebase Auth](https://firebase.google.com/docs/auth)
- [Documentación Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)

## 🔄 Diferencias con la versión anterior (JWT)

| Aspecto | JWT (Anterior) | Firebase (Actual) |
|---------|---------------|-------------------|
| Autenticación | bcrypt + JWT | Firebase Auth |
| Tokens | JWT custom | Firebase ID Tokens |
| Gestión de usuarios | Manual en BD | Firebase + BD |
| Contraseñas | Hasheadas en BD | Gestionadas por Firebase |
| Roles | En BD | Custom Claims + BD |
| Seguridad | Manual | Firebase + Custom |

## ⚡ Ventajas de Firebase

✅ Gestión de contraseñas segura y automática  
✅ Tokens firmados y verificados por Firebase  
✅ Reseteo de contraseña integrado  
✅ Verificación de email integrada  
✅ Autenticación multi-factor disponible  
✅ Proveedores sociales (Google, Facebook, etc.)  
✅ Escalabilidad automática  

## 🚀 Próximos Pasos

1. ✅ Configura Firebase Console
2. ✅ Descarga credenciales
3. ✅ Configura variables de entorno
4. ✅ Ejecuta script SQL
5. ✅ Instala dependencias
6. ✅ Inicia el servidor
7. ⏭️ Implementa el frontend con Firebase Client SDK

