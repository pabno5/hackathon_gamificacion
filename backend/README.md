# 🔥 Sistema de Autenticación con Firebase

## 📋 Descripción

Sistema completo de autenticación backend implementado con:
- ✅ **Firebase Authentication** - Gestión de usuarios y autenticación
- ✅ **Firebase Admin SDK** - Verificación de tokens y custom claims
- ✅ **Supabase** - Almacenamiento de datos adicionales (roles, perfiles)
- ✅ **Express.js** - API REST
- ✅ **Cookies HTTP-only** - Gestión segura de sesiones
- ✅ **Control de Roles** - Administrador y Empleado

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

Sigue la guía completa: **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**

Resumen:
1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita Authentication (Email/Password)
3. Descarga las credenciales (service account)
4. Configura las variables de entorno

### 3. Configurar variables de entorno

```bash
cp env.config.example .env
```

Edita el archivo `.env` con tus credenciales reales.

### 4. Configurar base de datos

Ejecuta el script SQL en Supabase:
```sql
-- Ejecuta el contenido de database_setup.sql en el SQL Editor de Supabase
```

### 5. Iniciar el servidor

```bash
npm start
```

Deberías ver:
```
✅ Firebase Admin inicializado correctamente
✅ Firebase Client inicializado correctamente
Servidor corriendo en http://localhost:3000
```

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** | 🔧 Guía completa de configuración de Firebase |
| **[API_DOCUMENTATION_FIREBASE.md](./API_DOCUMENTATION_FIREBASE.md)** | 📡 Documentación completa de la API |
| **[ESTRUCTURA_SISTEMA.md](./ESTRUCTURA_SISTEMA.md)** | 🏗️ Arquitectura del proyecto |
| **[CHECKLIST_INSTALACION.md](./CHECKLIST_INSTALACION.md)** | ✅ Lista de verificación paso a paso |

## 📁 Estructura del Proyecto

```
backend/
├── config/
│   └── firebase.js              # Configuración de Firebase
├── controller/
│   ├── authController.js        # Registro, login, perfil
│   ├── adminController.js       # Gestión de usuarios (admin)
│   └── employeeController.js    # Dashboard (admin/empleado)
├── routes/
│   ├── authRoutes.js           # Rutas de autenticación
│   ├── adminRoutes.js          # Rutas de administrador
│   └── employeeRoutes.js       # Rutas de empleado
├── utils/
│   └── authMiddleware.js       # Middleware de autenticación
├── db.js                        # Configuración de Supabase
├── server.js                    # Configuración de Express
├── index.js                     # Punto de entrada
└── package.json                 # Dependencias
```

## 🛣️ Endpoints Principales

### Públicos (Sin autenticación)
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión

### Protegidos (Requieren autenticación)
- `GET /api/auth/profile` - Obtener perfil
- `POST /api/auth/logout` - Cerrar sesión

### Empleado (Admin/Empleado)
- `GET /api/employee/dashboard` - Dashboard
- `GET /api/employee/users-list` - Lista de usuarios

### Administrador (Solo Admin)
- `GET /api/admin/users` - Todos los usuarios
- `DELETE /api/admin/users/:id` - Eliminar usuario
- `PUT /api/admin/users/:id/role` - Cambiar rol

## 🔐 Seguridad

### Firebase Authentication
- Tokens firmados y verificados por Firebase
- Custom claims para roles (administrador/empleado)
- Gestión segura de contraseñas
- Expiración automática de tokens

### Cookies
- **httpOnly**: No accesibles desde JavaScript
- **secure**: Solo HTTPS en producción
- **sameSite**: Protección contra CSRF
- **maxAge**: 1 hora de duración

### Middleware
- `verifyToken`: Verifica autenticación
- `verifyAdmin`: Verifica rol de administrador
- `verifyAdminOrEmployee`: Verifica rol admin o empleado

## 🔄 Flujo de Autenticación

```
Frontend                    Backend                    Firebase
   │                           │                           │
   │──signIn(email, pass)──────│                           │
   │                           │                           │
   │                           │──────verifyToken()────────▶
   │                           │                           │
   │                           │◀─────idToken──────────────│
   │                           │                           │
   │◀─POST /api/auth/login─────│                           │
   │  { idToken }              │                           │
   │                           │                           │
   │                           │──verifyIdToken()──────────▶
   │                           │                           │
   │                           │◀─decodedToken (uid,rol)───│
   │                           │                           │
   │                           │──查询 Supabase────────────▶
   │                           │                           │
   │◀──Set-Cookie: authToken───│                           │
   │                           │                           │
   │──GET /api/admin/users─────▶                           │
   │  Cookie: authToken        │                           │
   │                           │                           │
   │                           │──verifyIdToken()──────────▶
   │                           │                           │
   │                           │◀─verified✓────────────────│
   │                           │                           │
   │◀────response JSON─────────│                           │
```

## 📦 Dependencias

```json
{
  "firebase": "^10.7.1",           // Firebase Client SDK
  "firebase-admin": "^12.0.0",     // Firebase Admin SDK
  "@supabase/supabase-js": "^2.76.1",
  "express": "^5.1.0",
  "cookie-parser": "^1.4.7",
  "dotenv": "^17.2.3"
}
```

## 🧪 Probar la API

### Registrar un administrador (desde el backend)

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ejemplo.com",
    "password": "admin123",
    "nombre": "Administrador",
    "rol": "administrador"
  }'
```

### Login (requiere Firebase Client en frontend)

Ver ejemplos completos en: **[API_DOCUMENTATION_FIREBASE.md](./API_DOCUMENTATION_FIREBASE.md)**

## ⚙️ Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `PORT` | Puerto del servidor | No (default: 3000) |
| `NODE_ENV` | Entorno (development/production) | No |
| `SUPABASE_URL` | URL de tu proyecto Supabase | Sí |
| `SUPABASE_KEY` | Clave anónima de Supabase | Sí |
| `FIREBASE_API_KEY` | API Key de Firebase | Sí |
| `FIREBASE_AUTH_DOMAIN` | Auth domain de Firebase | Sí |
| `FIREBASE_PROJECT_ID` | ID del proyecto Firebase | Sí |
| `FIREBASE_STORAGE_BUCKET` | Storage bucket de Firebase | Sí |
| `FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID | Sí |
| `FIREBASE_APP_ID` | App ID de Firebase | Sí |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Ruta al archivo de credenciales | Sí (una de las dos) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON de credenciales como string | Sí (una de las dos) |

## 🆘 Solución de Problemas

### Firebase Admin no se inicializa
✓ Verifica que el archivo de credenciales exista en la ruta especificada  
✓ Revisa que `FIREBASE_SERVICE_ACCOUNT_PATH` esté correcto  
✓ Asegúrate de que el JSON sea válido

### Error: "Token inválido"
✓ El token de Firebase expira cada hora, obtén uno nuevo  
✓ Verifica que estés enviando el token en cookies o header Authorization

### Error: "Usuario no encontrado en la base de datos"
✓ Verifica que el usuario esté registrado en Supabase  
✓ Revisa la tabla `usuarios` y que tenga el campo `firebase_uid`

### No puedo acceder a rutas de administrador
✓ Verifica que el usuario tenga rol "administrador" en la BD  
✓ Los custom claims se actualizan en el próximo login

## 🎯 Próximos Pasos

1. ✅ Configura Firebase Console
2. ✅ Instala dependencias
3. ✅ Configura variables de entorno
4. ✅ Ejecuta script SQL
5. ✅ Inicia el servidor
6. 📝 Implementa el frontend con Firebase Client SDK
7. 📝 Integra las rutas de la API en tu aplicación

## 📞 Soporte

Para más información, revisa la documentación:
- [Firebase Docs](https://firebase.google.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Express Docs](https://expressjs.com/)

## 📄 Licencia

ISC

