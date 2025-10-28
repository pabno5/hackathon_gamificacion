# Documentación de la API

## Sistema de Autenticación con Cookies y Control de Roles

Este sistema implementa autenticación basada en JWT con cookies HTTP-only para mayor seguridad.

## Variables de Entorno Requeridas

Copia el archivo `.env.example` a `.env` y configura las siguientes variables:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_key_de_supabase
JWT_SECRET=tu_secreto_jwt_super_seguro_aqui
```

## Instalación de Dependencias

```bash
npm install
```

## Configuración de Base de Datos

Crea la siguiente tabla en tu base de datos Supabase:

```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('administrador', 'empleado')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Roles Disponibles

- **administrador**: Acceso completo a todas las rutas
- **empleado**: Acceso limitado a rutas de empleado

---

## Endpoints de la API

### 🔓 Rutas Públicas (No requieren autenticación)

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

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "nombre": "Nombre Usuario",
    "rol": "empleado"
  }
}
```

#### 2. Iniciar Sesión
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "nombre": "Nombre Usuario",
    "rol": "empleado"
  }
}
```

**Nota:** Se establece una cookie `authToken` con el JWT.

---

### 🔒 Rutas Protegidas (Requieren autenticación)

#### 3. Obtener Perfil
```http
GET /api/auth/profile
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "nombre": "Nombre Usuario",
    "rol": "empleado",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 4. Cerrar Sesión
```http
POST /api/auth/logout
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

---

### 👥 Rutas de Empleado (Requieren rol: administrador o empleado)

#### 5. Obtener Dashboard
```http
GET /api/employee/dashboard
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 10,
    "accessedBy": {
      "id": 1,
      "email": "usuario@ejemplo.com",
      "rol": "empleado"
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 6. Obtener Lista de Usuarios
```http
GET /api/employee/users-list
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "count": 10,
  "users": [
    {
      "id": 1,
      "nombre": "Usuario 1",
      "email": "usuario1@ejemplo.com",
      "rol": "empleado"
    }
  ]
}
```

---

### 👑 Rutas de Administrador (Requieren rol: administrador)

#### 7. Obtener Todos los Usuarios
```http
GET /api/admin/users
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "count": 10,
  "users": [
    {
      "id": 1,
      "email": "usuario@ejemplo.com",
      "nombre": "Nombre Usuario",
      "rol": "empleado",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 8. Eliminar Usuario
```http
DELETE /api/admin/users/:id
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

#### 9. Actualizar Rol de Usuario
```http
PUT /api/admin/users/:id/role
Content-Type: application/json

{
  "rol": "administrador"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Rol actualizado exitosamente",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "nombre": "Nombre Usuario",
    "rol": "administrador"
  }
}
```

---

## Manejo de Errores

### Error 401 - No Autenticado
```json
{
  "success": false,
  "message": "Acceso denegado. No se proporcionó token de autenticación."
}
```

### Error 403 - Sin Permisos
```json
{
  "success": false,
  "message": "Acceso denegado. Se requiere rol de administrador."
}
```

### Error 500 - Error del Servidor
```json
{
  "success": false,
  "message": "Error al procesar la solicitud",
  "error": "Detalles del error"
}
```

---

## Seguridad

### Cookies
- **httpOnly**: Las cookies no pueden ser accedidas desde JavaScript del cliente
- **secure**: En producción, solo se envían por HTTPS
- **sameSite**: Protección contra CSRF
- **maxAge**: 24 horas de duración

### Contraseñas
- Hasheadas con bcrypt (10 rounds)
- Nunca se devuelven en las respuestas

### JWT
- Expira en 24 horas
- Firmado con JWT_SECRET
- Contiene: id, email, rol del usuario

---

## Ejemplos de Uso con JavaScript

### Login
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include', // Importante para incluir cookies
  body: JSON.stringify({
    email: 'admin@ejemplo.com',
    password: 'admin123'
  })
});

const data = await response.json();
console.log(data);
```

### Obtener Perfil (con autenticación)
```javascript
const response = await fetch('http://localhost:3000/api/auth/profile', {
  method: 'GET',
  credentials: 'include' // Incluye la cookie authToken
});

const data = await response.json();
console.log(data);
```

---

## Estructura del Proyecto

```
backend/
├── controller/           # Controladores con la lógica de negocio
│   ├── authController.js
│   ├── adminController.js
│   └── employeeController.js
├── routes/              # Definición de rutas
│   ├── authRoutes.js
│   ├── adminRoutes.js
│   └── employeeRoutes.js
├── utils/               # Middlewares y utilidades
│   └── authMiddleware.js
├── db.js                # Configuración de base de datos
├── server.js            # Configuración de Express
└── index.js             # Punto de entrada
```

---

## Iniciar el Servidor

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`



