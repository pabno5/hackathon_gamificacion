# Backend - Sistema de Gestión Médica

Sistema backend construido con **Supabase PostgreSQL** para datos y **Firebase Authentication** para autenticación.

## 🛠️ Stack Tecnológico

- **Node.js** + **Express.js** - Framework del servidor
- **Supabase** - Base de datos PostgreSQL managed
- **Firebase Authentication** - Autenticación y autorización con JWT
- **bcryptjs** - Hash de contraseñas
- **pg** - Cliente PostgreSQL para Node.js

## 📋 Requisitos Previos

- Node.js 16 o superior
- Cuenta en [Supabase](https://supabase.com/)
- Cuenta en [Firebase](https://firebase.google.com/)

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

Sigue las instrucciones en `SUPABASE_SETUP.txt`

### 3. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un proyecto
3. Ve a Project Settings > Service Accounts
4. Genera una nueva clave privada
5. Guarda el archivo JSON como `config/serviceAccountKey.json`

### 4. Configurar variables de entorno

Copia `.env.example` a `.env` y completa con tus credenciales:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
# Supabase (desde Dashboard > Settings > Database)
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@db.[REF].supabase.co:5432/postgres

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json

# Servidor
PORT=3000
NODE_ENV=development
```

### 5. Ejecutar schema SQL en Supabase

1. Ve a Supabase Dashboard > SQL Editor
2. Ejecuta el contenido de `config/schema.sql`
3. Ejecuta el contenido de `config/init_data.sql`

### 6. Iniciar servidor

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start
```

### 7. Verificar conexión

Visita: `http://localhost:3000/test-connection`

## 📁 Estructura del Proyecto

```
backend/
├── config/
│   ├── dataconnect.js       # Conexión a Supabase PostgreSQL
│   ├── firebase.js          # Firebase Admin SDK
│   ├── schema.sql           # DDL de la base de datos
│   └── init_data.sql        # Datos iniciales
│
├── controller/
│   ├── authController.js    # Registro, Login, Profile
│   ├── personasController.js
│   ├── medicosController.js
│   ├── rolesController.js
│   ├── credencialesController.js
│   └── adminController.js
│
├── routes/
│   ├── authRoutes.js
│   ├── personasRoutes.js
│   ├── medicosRoutes.js
│   ├── rolesRoutes.js
│   ├── credencialesRoutes.js
│   ├── citas.js
│   └── adminRoutes.js
│
├── utils/
│   └── authMiddleware.js    # Verificación de tokens y roles
│
├── server.js                # Servidor principal
├── package.json
└── .env.example
```

## 🔌 API Endpoints

### Autenticación (Públicos)

```
POST   /api/auth/register    Registrar nuevo usuario
POST   /api/auth/login       Iniciar sesión
```

### Usuarios (Requieren Auth)

```
GET    /api/auth/profile     Obtener perfil
POST   /api/auth/logout      Cerrar sesión
```

### Personas (Requieren Auth)

```
POST   /api/personas         Crear persona
GET    /api/personas         Listar personas
GET    /api/personas/:id     Obtener persona por ID
PUT    /api/personas/:id     Actualizar persona
DELETE /api/personas/:id     Eliminar persona
GET    /api/personas/documento/:numero  Buscar por documento
```

### Médicos (Requieren Auth)

```
POST   /api/medicos          Crear médico
GET    /api/medicos          Listar médicos
GET    /api/medicos/:id      Obtener médico
PUT    /api/medicos/:id      Actualizar médico
DELETE /api/medicos/:id      Eliminar médico
POST   /api/medicos/:id/especialidades       Asignar especialidad
DELETE /api/medicos/:id/especialidades/:id_esp  Remover especialidad
```

### Citas (Requieren Auth)

```
POST   /api/citas            Crear cita
GET    /api/citas            Listar citas (con filtros)
GET    /api/citas/:id        Obtener cita
PUT    /api/citas/:id        Actualizar cita
DELETE /api/citas/:id        Cancelar cita
```

### Roles (Solo Admin)

```
POST   /api/roles            Crear rol
GET    /api/roles            Listar roles
GET    /api/roles/:id        Obtener rol
PUT    /api/roles/:id        Actualizar rol
DELETE /api/roles/:id        Eliminar rol
```

### Administración (Solo Admin)

```
GET    /api/admin/users      Listar usuarios
DELETE /api/admin/users/:uid Eliminar usuario
PUT    /api/admin/users/:uid/role  Cambiar rol
```

## 🔐 Autenticación y Autorización

El sistema usa un enfoque híbrido:

1. **Firebase Auth** - Gestiona tokens JWT
2. **Supabase** - Almacena credenciales y datos

### Ejemplo de Request con Auth

```javascript
// Con Cookie (se establece automáticamente en login)
fetch('http://localhost:3000/api/personas', {
  credentials: 'include'
})

// Con Header
fetch('http://localhost:3000/api/personas', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
})
```

## 📚 Documentación Adicional

- `SUPABASE_SETUP.txt` - Configuración completa de Supabase
- `EJEMPLO_REGISTRO_LOGIN.txt` - Ejemplos de uso de la API
- `ARQUITECTURA_FINAL.txt` - Diagrama de arquitectura
- `RESUMEN_CAMBIOS.txt` - Historial de cambios

## 🧪 Testing

```bash
# Probar conexión
curl http://localhost:3000/test-connection

# Registrar usuario
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_documento": "CC",
    "numero_documento": "123456",
    "nombres": "Juan",
    "apellidos": "Pérez",
    "correo": "juan@email.com",
    "usuario": "juanperez",
    "contrasena": "Pass123!",
    "rol_nombre": "paciente"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "juanperez",
    "contrasena": "Pass123!"
  }'
```

## 🔧 Solución de Problemas

### Error: "password authentication failed"
→ Verifica tus credenciales de Supabase en `.env`

### Error: "Firebase Admin no inicializado"
→ Verifica que `serviceAccountKey.json` exista en `config/`

### Error: "relation does not exist"
→ Ejecuta `schema.sql` en Supabase SQL Editor

### Error: "connect ETIMEDOUT"
→ Verifica tu conexión a internet y que DATABASE_URL sea correcta

## 📦 Deployment

### Variables de entorno en producción

Asegúrate de configurar estas variables en tu plataforma de hosting:

```env
DATABASE_URL=postgresql://...
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
PORT=3000
NODE_ENV=production
```

### Plataformas recomendadas

- **Vercel** - Para el backend
- **Railway** - Para backend con PostgreSQL
- **Render** - Para backend con PostgreSQL
- **Fly.io** - Para backend con PostgreSQL

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📄 Licencia

ISC

## 👥 Autores

Equipo de Hackathon Gamificación

## 🆘 Soporte

Si tienes problemas, revisa:
1. `SUPABASE_SETUP.txt` para configuración
2. `EJEMPLO_REGISTRO_LOGIN.txt` para ejemplos
3. Crea un issue en el repositorio
