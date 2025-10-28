# 🏗️ Estructura del Sistema de Autenticación

## 📂 Archivos Creados

```
backend/
├── 📁 controller/
│   ├── authController.js         ← Registro, login, logout, perfil
│   ├── adminController.js        ← Gestión de usuarios (ADMIN)
│   └── employeeController.js     ← Dashboard, listados (ADMIN/EMPLEADO)
│
├── 📁 routes/
│   ├── authRoutes.js             ← Rutas de autenticación
│   ├── adminRoutes.js            ← Rutas solo administrador
│   └── employeeRoutes.js         ← Rutas admin/empleado
│
├── 📁 utils/
│   └── authMiddleware.js         ← Middleware de autenticación y roles
│
├── 📄 server.js                  ← Servidor Express (MODIFICADO)
├── 📄 package.json               ← Dependencias (ACTUALIZADO)
├── 📄 database_setup.sql         ← Script para crear tabla usuarios
├── 📄 env.config.example         ← Ejemplo de configuración
├── 📄 API_DOCUMENTATION.md       ← Documentación completa de API
├── 📄 README_AUTH.md             ← Guía de instalación y uso
└── 📄 ESTRUCTURA_SISTEMA.md      ← Este archivo
```

## 🔐 Middlewares Creados

### `authMiddleware.js`

```javascript
verifyToken                 // Verifica que el usuario esté autenticado
verifyAdmin                 // Verifica rol de administrador
verifyAdminOrEmployee       // Verifica rol de admin o empleado
```

## 🎯 Controladores y Funciones

### `authController.js` - Autenticación
| Función | Descripción |
|---------|-------------|
| `register()` | Registrar nuevo usuario |
| `login()` | Iniciar sesión (genera JWT en cookie) |
| `logout()` | Cerrar sesión (limpia cookie) |
| `getProfile()` | Obtener perfil del usuario autenticado |

### `adminController.js` - Solo Administradores
| Función | Descripción |
|---------|-------------|
| `getAllUsers()` | Listar todos los usuarios |
| `deleteUser()` | Eliminar un usuario |
| `updateUserRole()` | Cambiar rol de un usuario |

### `employeeController.js` - Admin/Empleado
| Función | Descripción |
|---------|-------------|
| `getDashboardData()` | Obtener datos del dashboard |
| `getUsersList()` | Listar usuarios (info básica) |

## 🛣️ Rutas y Protección

### `/api/auth` - Autenticación

| Método | Ruta | Protección | Función |
|--------|------|------------|---------|
| POST | `/register` | 🔓 Público | Registrar usuario |
| POST | `/login` | 🔓 Público | Iniciar sesión |
| POST | `/logout` | 🔒 Auth | Cerrar sesión |
| GET | `/profile` | 🔒 Auth | Ver perfil |

### `/api/admin` - Administración

| Método | Ruta | Protección | Función |
|--------|------|------------|---------|
| GET | `/users` | 👑 Admin | Listar usuarios |
| DELETE | `/users/:id` | 👑 Admin | Eliminar usuario |
| PUT | `/users/:id/role` | 👑 Admin | Cambiar rol |

### `/api/employee` - Empleados

| Método | Ruta | Protección | Función |
|--------|------|------------|---------|
| GET | `/dashboard` | 👥 Admin/Empleado | Dashboard |
| GET | `/users-list` | 👥 Admin/Empleado | Lista usuarios |

## 🔄 Flujo de Autenticación

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │
       │ 1. POST /api/auth/login
       │    { email, password }
       ▼
┌─────────────────────┐
│  authController.js  │
│  - Valida email     │
│  - Verifica password│
│  - Genera JWT       │
└──────┬──────────────┘
       │
       │ 2. Set Cookie: authToken=JWT
       │    { httpOnly, secure, sameSite }
       ▼
┌─────────────┐
│   Cliente   │
│ Cookie: JWT │
└──────┬──────┘
       │
       │ 3. GET /api/admin/users
       │    Cookie: authToken
       ▼
┌─────────────────────┐
│ authMiddleware.js   │
│ - verifyToken()     │
│ - verifyAdmin()     │
└──────┬──────────────┘
       │
       │ 4. req.user = { id, email, rol }
       ▼
┌─────────────────────┐
│ adminController.js  │
│ - getAllUsers()     │
└──────┬──────────────┘
       │
       │ 5. Respuesta JSON
       ▼
┌─────────────┐
│   Cliente   │
└─────────────┘
```

## 🗄️ Tabla de Base de Datos

### `usuarios`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | ID único (PK) |
| email | VARCHAR(255) | Email único |
| password | VARCHAR(255) | Contraseña hasheada |
| nombre | VARCHAR(255) | Nombre completo |
| rol | VARCHAR(50) | 'administrador' o 'empleado' |
| created_at | TIMESTAMP | Fecha de creación |

## 🔒 Características de Seguridad

### ✅ Contraseñas
- Hasheadas con bcrypt (10 rounds)
- Nunca se devuelven en respuestas
- Comparación segura

### ✅ JWT
- Expira en 24 horas
- Firmado con JWT_SECRET
- Contiene: id, email, rol

### ✅ Cookies
- **httpOnly**: No accesible desde JS
- **secure**: Solo HTTPS en producción
- **sameSite**: Protección CSRF
- **maxAge**: 24 horas

### ✅ Validaciones
- Campos requeridos
- Roles válidos
- No auto-eliminación
- No auto-cambio de rol

## 📦 Dependencias Agregadas

```json
{
  "bcryptjs": "^2.4.3",      // Hash de contraseñas
  "jsonwebtoken": "^9.0.2"   // Generación y verificación JWT
}
```

## ⚙️ Variables de Entorno Necesarias

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_key_de_supabase
JWT_SECRET=secreto_super_seguro
```

## 🚀 Pasos para Comenzar

1. **Instalar dependencias**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar variables de entorno**
   ```bash
   # Copia y edita el archivo de configuración
   cp env.config.example .env
   # Edita .env con tus valores
   ```

3. **Configurar base de datos**
   - Ejecuta `database_setup.sql` en Supabase

4. **Iniciar servidor**
   ```bash
   npm start
   ```

5. **Probar API**
   - Revisa `API_DOCUMENTATION.md` para ejemplos

## 📖 Documentación Adicional

- **API_DOCUMENTATION.md** - Documentación completa de endpoints
- **README_AUTH.md** - Guía de instalación y configuración
- **database_setup.sql** - Script SQL para crear tablas

## 💡 Ejemplo de Uso

### Registrar Administrador
```javascript
POST /api/auth/register
{
  "email": "admin@ejemplo.com",
  "password": "admin123",
  "nombre": "Administrador",
  "rol": "administrador"
}
```

### Login
```javascript
POST /api/auth/login
{
  "email": "admin@ejemplo.com",
  "password": "admin123"
}
// Respuesta: Cookie authToken establecida
```

### Acceder a Ruta Protegida
```javascript
GET /api/admin/users
// La cookie authToken se envía automáticamente
// Middleware verifica token y rol
// Respuesta: Lista de usuarios
```

## 🎨 Leyenda de Protección

- 🔓 **Público** - No requiere autenticación
- 🔒 **Auth** - Requiere autenticación
- 👑 **Admin** - Requiere rol administrador
- 👥 **Admin/Empleado** - Requiere rol admin o empleado



