# Documentación de la API - Firebase Authentication

## Sistema de Autenticación con Firebase y Control de Roles

Este sistema implementa autenticación basada en **Firebase Authentication** con cookies para sesiones y control de roles (Administrador/Empleado).

## 📋 Requisitos Previos

1. ✅ Proyecto de Firebase configurado
2. ✅ Firebase Authentication habilitado (Email/Password)
3. ✅ Credenciales de Firebase descargadas
4. ✅ Variables de entorno configuradas
5. ✅ Base de datos Supabase con tabla `usuarios`

Para la configuración completa, revisa: **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**

## 🔑 Variables de Entorno

```env
PORT=3000
NODE_ENV=development

# Supabase (almacenamiento de datos)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_supabase_anon_key

# Firebase Client
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin (archivo de credenciales)
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-credentials.json
```

## 🗄️ Estructura de Base de Datos

### Tabla `usuarios` (Supabase)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | ID único en BD |
| firebase_uid | VARCHAR(255) | UID de Firebase |
| email | VARCHAR(255) | Email del usuario |
| nombre | VARCHAR(255) | Nombre completo |
| rol | VARCHAR(50) | 'administrador' o 'empleado' |
| created_at | TIMESTAMP | Fecha de creación |

## 🔐 Roles Disponibles

- **administrador**: Acceso completo, gestión de usuarios
- **empleado**: Acceso limitado a dashboard y listados

---

## 📡 Endpoints de la API

### 🔓 Rutas Públicas (Sin autenticación)

#### 1. Registrar Usuario

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "nombre": "Nombre Usuario",
  "rol": "empleado"
}
```

**Proceso:**
1. Crea usuario en Firebase Authentication
2. Establece custom claims con el rol
3. Guarda datos adicionales en Supabase

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "user": {
    "uid": "firebase_uid_123",
    "id": 1,
    "email": "usuario@ejemplo.com",
    "nombre": "Nombre Usuario",
    "rol": "empleado"
  }
}
```

**Errores comunes:**
```json
// Email ya existe
{
  "success": false,
  "message": "El correo electrónico ya está en uso",
  "error": "..."
}

// Contraseña débil
{
  "success": false,
  "message": "La contraseña debe tener al menos 6 caracteres",
  "error": "..."
}
```

---

#### 2. Iniciar Sesión

⚠️ **IMPORTANTE**: Este endpoint requiere que el frontend haga login con Firebase Client SDK primero.

**Flujo completo:**

**A. En el Frontend (Firebase Client SDK):**
```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();

// 1. Login con Firebase
const userCredential = await signInWithEmailAndPassword(
  auth, 
  'usuario@ejemplo.com', 
  'contraseña123'
);

// 2. Obtener el idToken
const idToken = await userCredential.user.getIdToken();

// 3. Enviar al backend
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ idToken })
});
```

**B. En el Backend:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "customToken": "eyJhbGc...",
  "user": {
    "uid": "firebase_uid_123",
    "id": 1,
    "email": "usuario@ejemplo.com",
    "nombre": "Nombre Usuario",
    "rol": "empleado"
  }
}
```

**Nota:** Se establece una cookie `authToken` con el idToken.

---

### 🔒 Rutas Protegidas (Requieren autenticación)

Para todas las rutas protegidas, debes incluir el token de una de estas formas:

**Opción 1: Cookie (Recomendado)**
```javascript
fetch('http://localhost:3000/api/auth/profile', {
  credentials: 'include' // Incluye la cookie authToken
});
```

**Opción 2: Header Authorization**
```javascript
fetch('http://localhost:3000/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});
```

---

#### 3. Obtener Perfil

```http
GET /api/auth/profile
Authorization: Bearer eyJhbGc... (o cookie)
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "user": {
    "uid": "firebase_uid_123",
    "id": 1,
    "email": "usuario@ejemplo.com",
    "nombre": "Nombre Usuario",
    "rol": "empleado",
    "emailVerified": false,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### 4. Cerrar Sesión

```http
POST /api/auth/logout
Authorization: Bearer eyJhbGc... (o cookie)
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

**Nota:** Limpia la cookie `authToken`.

---

### 👥 Rutas de Empleado (Admin o Empleado)

Requieren rol `administrador` o `empleado`.

#### 5. Obtener Dashboard

```http
GET /api/employee/dashboard
Authorization: Bearer eyJhbGc...
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 10,
    "accessedBy": {
      "uid": "firebase_uid_123",
      "email": "empleado@ejemplo.com",
      "rol": "empleado"
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

#### 6. Listar Usuarios

```http
GET /api/employee/users-list
Authorization: Bearer eyJhbGc...
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "count": 10,
  "users": [
    {
      "id": 1,
      "firebase_uid": "abc123",
      "nombre": "Usuario 1",
      "email": "usuario1@ejemplo.com",
      "rol": "empleado"
    }
  ]
}
```

---

### 👑 Rutas de Administrador (Solo Admin)

Requieren rol `administrador`.

#### 7. Obtener Todos los Usuarios (Completo)

```http
GET /api/admin/users
Authorization: Bearer eyJhbGc...
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "count": 10,
  "users": [
    {
      "id": 1,
      "firebase_uid": "abc123",
      "email": "usuario@ejemplo.com",
      "nombre": "Nombre Usuario",
      "rol": "empleado",
      "created_at": "2024-01-01T00:00:00.000Z",
      "emailVerified": false,
      "disabled": false,
      "lastSignInTime": "2024-01-05T10:30:00.000Z"
    }
  ]
}
```

**Nota:** Incluye datos enriquecidos de Firebase Auth.

---

#### 8. Eliminar Usuario

```http
DELETE /api/admin/users/:id
Authorization: Bearer eyJhbGc...
```

**Proceso:**
1. Busca el usuario en Supabase
2. Elimina de Firebase Authentication
3. Elimina de Supabase

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente de Firebase y base de datos"
}
```

**Errores:**
```json
// Intentar eliminarse a sí mismo
{
  "success": false,
  "message": "No puedes eliminar tu propia cuenta"
}
```

---

#### 9. Actualizar Rol de Usuario

```http
PUT /api/admin/users/:id/role
Content-Type: application/json
Authorization: Bearer eyJhbGc...

{
  "rol": "administrador"
}
```

**Proceso:**
1. Valida el nuevo rol
2. Actualiza custom claims en Firebase
3. Actualiza rol en Supabase

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Rol actualizado exitosamente en Firebase y base de datos",
  "user": {
    "id": 1,
    "firebase_uid": "abc123",
    "email": "usuario@ejemplo.com",
    "nombre": "Nombre Usuario",
    "rol": "administrador"
  }
}
```

**Errores:**
```json
// Intentar cambiar su propio rol
{
  "success": false,
  "message": "No puedes cambiar tu propio rol"
}

// Rol inválido
{
  "success": false,
  "message": "El rol debe ser \"administrador\" o \"empleado\""
}
```

---

## 🔒 Seguridad

### Firebase Authentication
- ✅ Tokens firmados por Firebase
- ✅ Verificación automática de tokens
- ✅ Expiración de tokens (1 hora)
- ✅ Gestión segura de contraseñas
- ✅ Custom claims para roles

### Cookies
- ✅ **httpOnly**: No accesibles desde JavaScript
- ✅ **secure**: Solo HTTPS en producción
- ✅ **sameSite: strict**: Protección CSRF
- ✅ **maxAge**: 1 hora

### Custom Claims
Los roles se almacenan como custom claims en Firebase:
```javascript
{
  uid: "abc123",
  email: "user@ejemplo.com",
  rol: "administrador" // Custom claim
}
```

---

## 🔄 Flujo Completo de Autenticación

```
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │
       │ 1. signInWithEmailAndPassword()
       │    Firebase Client SDK
       ▼
┌─────────────────┐
│  Firebase Auth  │
│  (Cloud)        │
└──────┬──────────┘
       │
       │ 2. Devuelve user + idToken
       ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 3. POST /api/auth/login
       │    { idToken }
       ▼
┌─────────────────────┐
│  Backend (Node.js)  │
│  - Verifica idToken │
│  - Busca en BD      │
│  - Crea cookie      │
└──────┬──────────────┘
       │
       │ 4. Set-Cookie: authToken
       ▼
┌─────────────┐
│  Frontend   │
│  Cookie: ✓  │
└──────┬──────┘
       │
       │ 5. GET /api/admin/users
       │    Cookie: authToken
       ▼
┌─────────────────────┐
│  Backend            │
│  - verifyToken()    │
│  - verifyAdmin()    │
│  - Procesa request  │
└──────┬──────────────┘
       │
       │ 6. Respuesta JSON
       ▼
┌─────────────┐
│  Frontend   │
└─────────────┘
```

---

## 🧪 Ejemplo Completo con React

### Configurar Firebase en el Frontend

```javascript
// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### Registro de Usuario

```javascript
// src/components/Register.jsx
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const handleRegister = async (email, password, nombre, rol) => {
  try {
    // 1. Crear usuario en Firebase (cliente)
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      email, 
      password
    );

    // 2. Obtener idToken
    const idToken = await userCredential.user.getIdToken();

    // 3. Registrar en el backend
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        nombre,
        rol
      })
    });

    const data = await response.json();
    console.log('Usuario registrado:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

### Login

```javascript
// src/components/Login.jsx
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const handleLogin = async (email, password) => {
  try {
    // 1. Login con Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      email, 
      password
    );

    // 2. Obtener idToken
    const idToken = await userCredential.user.getIdToken();

    // 3. Enviar al backend para establecer cookie
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Importante para cookies
      body: JSON.stringify({ idToken })
    });

    const data = await response.json();
    console.log('Login exitoso:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

### Acceder a Ruta Protegida

```javascript
// src/components/Dashboard.jsx
import { useEffect, useState } from 'react';
import { auth } from '../firebase';

const Dashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Obtener el token actualizado
        const idToken = await auth.currentUser.getIdToken();

        const response = await fetch('http://localhost:3000/api/employee/dashboard', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        const result = await response.json();
        setData(result.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {data && <p>Total usuarios: {data.totalUsers}</p>}
    </div>
  );
};
```

---

## 📚 Recursos Adicionales

- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Guía de configuración de Firebase
- **[README_AUTH.md](./README_AUTH.md)** - Guía general del sistema
- **[ESTRUCTURA_SISTEMA.md](./ESTRUCTURA_SISTEMA.md)** - Arquitectura del proyecto

## 🆘 Solución de Problemas

### Error: "Token inválido"
✓ Verifica que el idToken sea actual (se expira cada hora)  
✓ Genera un nuevo token con `user.getIdToken(true)`

### Error: "Usuario no encontrado en la base de datos"
✓ Verifica que el usuario se haya registrado correctamente  
✓ Revisa la tabla `usuarios` en Supabase

### Error: "Acceso denegado. Se requiere rol de..."
✓ Verifica que el usuario tenga el rol correcto en la BD  
✓ Los custom claims se actualizan después del próximo login

### Error al inicializar Firebase Admin
✓ Verifica que el archivo de credenciales exista  
✓ Revisa la variable `FIREBASE_SERVICE_ACCOUNT_PATH`  
✓ Verifica que el JSON tenga el formato correcto

