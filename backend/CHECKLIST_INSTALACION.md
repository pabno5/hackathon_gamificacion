# ✅ Lista de Verificación para Instalación

Sigue estos pasos en orden para configurar el sistema de autenticación.

## 📋 Pasos de Configuración

### ☐ 1. Instalar Dependencias

```bash
cd backend
npm install
```

**Verifica que se hayan instalado:**
- ✓ bcryptjs
- ✓ jsonwebtoken

---

### ☐ 2. Configurar Variables de Entorno

1. Crea el archivo `.env` en la carpeta `backend`:
   ```bash
   # En Windows PowerShell
   copy env.config.example .env
   
   # En Linux/Mac
   cp env.config.example .env
   ```

2. Edita el archivo `.env` con tus valores reales:

```env
PORT=3000
NODE_ENV=development

# Obtén estos valores desde https://supabase.com
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_supabase_anon_key

# Genera un secreto seguro ejecutando:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=tu_secreto_generado_aqui
```

**Verificación:**
- [ ] Archivo `.env` creado
- [ ] SUPABASE_URL configurado
- [ ] SUPABASE_KEY configurado
- [ ] JWT_SECRET generado y configurado

---

### ☐ 3. Configurar Base de Datos

1. Abre tu proyecto en [Supabase](https://supabase.com)
2. Ve a **SQL Editor**
3. Abre el archivo `database_setup.sql`
4. Copia todo el contenido
5. Pégalo en el SQL Editor de Supabase
6. Haz clic en **Run**

**Verificación:**
- [ ] Tabla `usuarios` creada
- [ ] Índices creados correctamente

**Opción alternativa (sin SQL Editor):**
Puedes crear la tabla manualmente desde Table Editor:
- Nombre: `usuarios`
- Columnas:
  - id: int8, primary key, auto-increment
  - email: varchar, unique, not null
  - password: varchar, not null
  - nombre: varchar, not null
  - rol: varchar, not null
  - created_at: timestamp, default: now()

---

### ☐ 4. Iniciar el Servidor

```bash
npm start
```

**Deberías ver:**
```
Intentando conectar a Supabase...
Probando conexión a Supabase...
URL: https://tu-proyecto.supabase.co
Servidor corriendo en http://localhost:3000
```

---

### ☐ 5. Probar la Conexión

Abre tu navegador y ve a:
```
http://localhost:3000/test-connection
```

**Deberías ver:**
```json
{
  "success": true,
  "status": "Conectado a Supabase",
  "url": "https://tu-proyecto.supabase.co",
  "message": "¡Conexión establecida exitosamente!"
}
```

---

### ☐ 6. Crear tu Primer Usuario Administrador

**Opción A: Con cURL (Terminal)**
```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@ejemplo.com\",\"password\":\"admin123\",\"nombre\":\"Administrador\",\"rol\":\"administrador\"}"
```

**Opción B: Con Postman/Insomnia**
```
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "admin@ejemplo.com",
  "password": "admin123",
  "nombre": "Administrador",
  "rol": "administrador"
}
```

**Opción C: Con JavaScript (navegador)**
```javascript
fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@ejemplo.com',
    password: 'admin123',
    nombre: 'Administrador',
    rol: 'administrador'
  })
})
.then(r => r.json())
.then(console.log);
```

---

### ☐ 7. Probar el Login

**Con cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -c cookies.txt ^
  -d "{\"email\":\"admin@ejemplo.com\",\"password\":\"admin123\"}"
```

**Con JavaScript:**
```javascript
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Importante para cookies
  body: JSON.stringify({
    email: 'admin@ejemplo.com',
    password: 'admin123'
  })
})
.then(r => r.json())
.then(console.log);
```

**Deberías ver:**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "user": {
    "id": 1,
    "email": "admin@ejemplo.com",
    "nombre": "Administrador",
    "rol": "administrador"
  }
}
```

---

### ☐ 8. Probar Ruta Protegida (Perfil)

**Con cURL:**
```bash
curl -X GET http://localhost:3000/api/auth/profile ^
  -b cookies.txt
```

**Con JavaScript:**
```javascript
fetch('http://localhost:3000/api/auth/profile', {
  credentials: 'include' // Incluye la cookie
})
.then(r => r.json())
.then(console.log);
```

---

### ☐ 9. Probar Ruta de Administrador

**Con cURL:**
```bash
curl -X GET http://localhost:3000/api/admin/users ^
  -b cookies.txt
```

**Con JavaScript:**
```javascript
fetch('http://localhost:3000/api/admin/users', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log);
```

---

### ☐ 10. Probar Creación de Empleado

1. **Crear un empleado:**
```javascript
fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'empleado@ejemplo.com',
    password: 'empleado123',
    nombre: 'Empleado Test',
    rol: 'empleado'
  })
})
.then(r => r.json())
.then(console.log);
```

2. **Login como empleado:**
```javascript
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'empleado@ejemplo.com',
    password: 'empleado123'
  })
})
.then(r => r.json())
.then(console.log);
```

3. **Intentar acceder a ruta de empleado (debería funcionar):**
```javascript
fetch('http://localhost:3000/api/employee/dashboard', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log);
```

4. **Intentar acceder a ruta de admin (debería fallar):**
```javascript
fetch('http://localhost:3000/api/admin/users', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log);
// Debería recibir: "Acceso denegado. Se requiere rol de administrador."
```

---

## 🎯 Verificación Final

Si todos los pasos anteriores funcionaron correctamente:

- [x] ✅ Dependencias instaladas
- [x] ✅ Variables de entorno configuradas
- [x] ✅ Base de datos configurada
- [x] ✅ Servidor iniciado
- [x] ✅ Conexión a Supabase funcionando
- [x] ✅ Registro de usuarios funciona
- [x] ✅ Login funciona y establece cookies
- [x] ✅ Rutas protegidas verifican autenticación
- [x] ✅ Control de roles funciona correctamente

## 🎉 ¡Sistema Completamente Funcional!

Ahora puedes:
- Registrar usuarios con diferentes roles
- Iniciar sesión y recibir cookies seguras
- Acceder a rutas protegidas según el rol
- Gestionar usuarios desde rutas de administrador

## 📚 Próximos Pasos

1. Lee `API_DOCUMENTATION.md` para ver todos los endpoints disponibles
2. Lee `README_AUTH.md` para entender la arquitectura
3. Lee `ESTRUCTURA_SISTEMA.md` para ver el flujo completo

## ⚠️ Solución de Problemas

### Error: "No se pudo establecer conexión con la base de datos"
- Verifica SUPABASE_URL y SUPABASE_KEY en `.env`
- Asegúrate de que el proyecto Supabase esté activo

### Error: "Token inválido"
- Verifica que JWT_SECRET esté configurado
- Intenta hacer login nuevamente

### Error: "Acceso denegado. Se requiere rol de..."
- Verifica que el usuario tenga el rol correcto
- Verifica que estés enviando la cookie (credentials: 'include')

### Error: "Todos los campos son requeridos"
- Asegúrate de enviar todos los campos en el body
- Verifica que Content-Type sea application/json



