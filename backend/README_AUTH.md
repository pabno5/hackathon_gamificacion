# Sistema de Autenticación con Cookies y Control de Roles

## 📋 Descripción

Sistema completo de autenticación implementado con:
- ✅ JWT (JSON Web Tokens)
- ✅ Cookies HTTP-only para mayor seguridad
- ✅ Control de roles (Administrador y Empleado)
- ✅ Middleware de autenticación y autorización
- ✅ Bcrypt para hash de contraseñas

## 🚀 Instalación

### 1. Instalar dependencias

```bash
npm install
```

Esto instalará las nuevas dependencias agregadas:
- `bcryptjs` - Para hashear contraseñas
- `jsonwebtoken` - Para generar y verificar tokens JWT

### 2. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `backend` con las siguientes variables:

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Configuración de Supabase
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_key_de_supabase

# Secreto para JWT (debe ser una cadena aleatoria y segura)
# Puedes generarlo con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=tu_secreto_jwt_super_seguro_aqui
```

### 3. Configurar la base de datos

Ejecuta el script `database_setup.sql` en tu base de datos Supabase:

1. Abre el SQL Editor en Supabase
2. Copia y pega el contenido de `database_setup.sql`
3. Ejecuta el script

## 📁 Estructura Creada

```
backend/
├── controller/              # Lógica de negocio
│   ├── authController.js    # Login, registro, logout, perfil
│   ├── adminController.js   # Gestión de usuarios (solo admin)
│   └── employeeController.js # Dashboard y listados (admin/empleado)
│
├── routes/                  # Definición de endpoints
│   ├── authRoutes.js        # Rutas de autenticación
│   ├── adminRoutes.js       # Rutas solo para administradores
│   └── employeeRoutes.js    # Rutas para admin y empleados
│
├── utils/                   # Middlewares y utilidades
│   └── authMiddleware.js    # Verificación de tokens y roles
│
├── database_setup.sql       # Script SQL para crear tablas
├── API_DOCUMENTATION.md     # Documentación completa de la API
└── README_AUTH.md          # Este archivo
```

## 🔐 Roles y Permisos

### Administrador
- ✅ Acceso a todas las rutas
- ✅ Gestionar usuarios (listar, eliminar, cambiar roles)
- ✅ Acceder al dashboard
- ✅ Ver listados de usuarios

### Empleado
- ✅ Acceder al dashboard
- ✅ Ver listados de usuarios
- ❌ NO puede gestionar usuarios

## 🛣️ Endpoints Disponibles

### Autenticación (Público)
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión

### Autenticación (Protegido)
- `GET /api/auth/profile` - Obtener perfil
- `POST /api/auth/logout` - Cerrar sesión

### Empleado (Admin/Empleado)
- `GET /api/employee/dashboard` - Dashboard
- `GET /api/employee/users-list` - Lista de usuarios

### Administrador (Solo Admin)
- `GET /api/admin/users` - Todos los usuarios
- `DELETE /api/admin/users/:id` - Eliminar usuario
- `PUT /api/admin/users/:id/role` - Cambiar rol

## 🔧 Uso de los Middlewares

### En las rutas

```javascript
const { verifyToken, verifyAdmin, verifyAdminOrEmployee } = require('../utils/authMiddleware');

// Solo autenticado
router.get('/profile', verifyToken, controller);

// Solo administrador
router.delete('/users/:id', verifyToken, verifyAdmin, controller);

// Admin o empleado
router.get('/dashboard', verifyToken, verifyAdminOrEmployee, controller);
```

### Aplicar a todas las rutas de un router

```javascript
// Todas las rutas de este router requieren autenticación y rol admin
router.use(verifyToken);
router.use(verifyAdmin);

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
```

## 🧪 Probar la API

### 1. Registrar un administrador

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

### 2. Iniciar sesión

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@ejemplo.com",
    "password": "admin123"
  }'
```

### 3. Acceder a ruta protegida

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -b cookies.txt
```

## 🔒 Seguridad Implementada

### Contraseñas
- ✅ Hasheadas con bcrypt (10 rounds)
- ✅ Nunca se devuelven en las respuestas
- ✅ Comparación segura con bcrypt.compare

### JWT
- ✅ Firmado con secreto fuerte (JWT_SECRET)
- ✅ Expira en 24 horas
- ✅ Contiene solo datos necesarios (id, email, rol)
- ✅ Verificado en cada petición protegida

### Cookies
- ✅ **httpOnly**: No accesibles desde JavaScript
- ✅ **secure**: Solo HTTPS en producción
- ✅ **sameSite: strict**: Protección CSRF
- ✅ **maxAge**: 24 horas

### Validaciones
- ✅ Verificación de campos requeridos
- ✅ Validación de roles permitidos
- ✅ Prevención de auto-eliminación
- ✅ Prevención de auto-cambio de rol

## 📚 Documentación Completa

Para más detalles sobre cada endpoint, revisa `API_DOCUMENTATION.md`

## ⚠️ Importante

1. **JWT_SECRET**: Debe ser una cadena aleatoria y segura. Nunca la compartas.
2. **NODE_ENV**: En producción, establece `NODE_ENV=production` para activar cookies seguras.
3. **HTTPS**: En producción, usa HTTPS para proteger las cookies.

## 🎯 Próximos Pasos

1. Instalar dependencias: `npm install`
2. Configurar archivo `.env`
3. Ejecutar script SQL en Supabase
4. Iniciar servidor: `npm start`
5. Probar endpoints con la documentación



