# 🔥 Migración a Firebase Firestore

## ✅ Cambios Realizados

Se ha eliminado completamente **Supabase** del backend y se ha migrado todo a **Firebase Firestore**.

---

## 📦 1. Dependencias Actualizadas

### ❌ Eliminadas:
- `@supabase/supabase-js`
- `pg`
- `postgres`
- `supabase`

### ✅ Mantenidas:
- `firebase` (^10.7.1)
- `firebase-admin` (^12.0.0)
- `express` (^5.1.0)
- `body-parser` (^2.2.0)
- `cookie-parser` (^1.4.7)
- `dotenv` (^17.2.3)

### 📝 Movidas a devDependencies:
- `nodemon` (^3.1.10)

---

## 🗂️ 2. Archivos Eliminados/Modificados

### ❌ Eliminados:
- `db.js` - Ya no es necesario (se usa Firestore directamente)

### 🔄 Modificados:

#### `server.js`
**Antes:**
```javascript
const { supabase } = require('./db');

// Prueba de conexión con Supabase
const { data: version } = await supabase.rpc('version');
```

**Ahora:**
```javascript
const { admin } = require('./config/firebase');

// Prueba de conexión con Firebase
const app = admin.app();
```

#### `env.config.example`
- ✅ Eliminadas variables de Supabase (`SUPABASE_URL`, `SUPABASE_KEY`)
- ✅ Solo variables de Firebase

---

## 🏗️ 3. Estructura de Base de Datos

### Antes (Supabase - PostgreSQL):
```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL
);
```

### Ahora (Firestore - NoSQL):
```javascript
// Colección: usuarios
// Documento ID: {firebase_uid}
{
  email: "usuario@ejemplo.com",
  nombre: "Nombre Usuario",
  rol: "empleado",
  created_at: Timestamp
}

// Colección: citas
// Documento ID: {auto-generado}
{
  id_paciente: "uid-paciente",
  id_medico: "uid-medico",
  fecha_cita: Timestamp,
  motivo: "Consulta general",
  estado: "pendiente",
  observaciones: "...",
  created_at: Timestamp,
  created_by: "uid-usuario"
}
```

---

## 🔄 4. Controladores Actualizados

### `authController.js`

**Cambios:**
```javascript
// ANTES (Supabase)
const { supabase } = require('../db');
const { data: newUser, error } = await supabase
  .from('usuarios')
  .insert([{ firebase_uid, email, nombre, rol }]);

// AHORA (Firestore)
const { admin } = require('../config/firebase');
const db = admin.firestore();
await db.collection('usuarios').doc(userRecord.uid).set({
  email, nombre, rol,
  created_at: admin.firestore.FieldValue.serverTimestamp()
});
```

**Funciones:**
- ✅ `register()` - Crea en Firebase Auth + Firestore
- ✅ `login()` - Verifica token y obtiene datos de Firestore
- ✅ `logout()` - Limpia cookies (sin cambios)
- ✅ `getProfile()` - Obtiene datos de Firebase Auth + Firestore

### `adminController.js`

**Cambios:**
```javascript
// ANTES (Supabase)
const { data: users } = await supabase
  .from('usuarios')
  .select('*')
  .order('created_at', { ascending: false });

// AHORA (Firestore)
const usersSnapshot = await db.collection('usuarios')
  .orderBy('created_at', 'desc')
  .get();
```

**Funciones:**
- ✅ `getAllUsers()` - Lista usuarios desde Firestore
- ✅ `deleteUser()` - Elimina de Firebase Auth + Firestore
- ✅ `updateUserRole()` - Actualiza custom claims + Firestore

**⚠️ Cambio en parámetros:**
- Antes: `/api/admin/users/:id`
- Ahora: `/api/admin/users/:uid` (usa Firebase UID)

### `employeeController.js`

**Cambios:**
```javascript
// ANTES (Supabase)
const { count: userCount } = await supabase
  .from('usuarios')
  .select('*', { count: 'exact', head: true });

// AHORA (Firestore)
const usersSnapshot = await db.collection('usuarios').get();
const userCount = usersSnapshot.size;
```

---

## 📅 5. Rutas de Citas

### Cambios Mayores:

**IDs:**
- ✅ Ya no usa UUIDs específicos
- ✅ Usa IDs autogenerados de Firestore

**Timestamps:**
```javascript
// ANTES (Supabase)
fecha_cita: "2024-01-15T10:00:00Z" // String ISO

// AHORA (Firestore)
fecha_cita: admin.firestore.Timestamp.fromDate(new Date(fecha_cita))
```

**Consultas:**
```javascript
// ANTES (Supabase SQL-like)
.from('citas')
.select('*')
.eq('id_paciente', id)
.order('fecha_cita', { ascending: true });

// AHORA (Firestore)
.collection('citas')
.where('id_paciente', '==', id)
.orderBy('fecha_cita', 'asc')
.get();
```

**Auditoría:**
- ✅ Agregado campo `created_by` (uid del usuario que creó)
- ✅ Agregado campo `updated_by` (uid del usuario que actualizó)
- ✅ Timestamps automáticos con `serverTimestamp()`

---

## 🎯 6. Endpoints Actualizados

### Autenticación
- `POST /api/auth/register` - ✅ Sin cambios en la API
- `POST /api/auth/login` - ✅ Sin cambios en la API
- `POST /api/auth/logout` - ✅ Sin cambios
- `GET /api/auth/profile` - ✅ Sin cambios en la API

### Administración
- `GET /api/admin/users` - ✅ Sin cambios en la API
- `DELETE /api/admin/users/:uid` - ⚠️ Cambió `:id` por `:uid`
- `PUT /api/admin/users/:uid/role` - ⚠️ Cambió `:id` por `:uid`

### Empleados
- `GET /api/employee/dashboard` - ✅ Sin cambios
- `GET /api/employee/users-list` - ✅ Sin cambios

### Citas
- `POST /api/citas` - ✅ Sin cambios en la API
- `GET /api/citas` - ✅ Sin cambios en la API
- `GET /api/citas/:id` - ✅ Ahora usa ID de Firestore
- `PUT /api/citas/:id` - ✅ Ahora usa ID de Firestore
- `DELETE /api/citas/:id` - ✅ Ahora usa ID de Firestore

---

## 🚀 7. Configuración Actualizada

### Variables de Entorno Necesarias:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Firebase Client (Frontend)
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin (Backend)
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-credentials.json
```

**❌ Ya NO se necesitan:**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `JWT_SECRET`

---

## 📊 8. Ventajas de Firestore

| Característica | Supabase | Firestore |
|----------------|----------|-----------|
| Tipo de BD | SQL (PostgreSQL) | NoSQL (Documentos) |
| Queries | SQL tradicional | Firebase queries |
| Tiempo real | WebSockets | Real-time listeners |
| Escalabilidad | Manual | Automática |
| Precio | Por recursos | Pay-as-you-go |
| Integración Firebase | Separado | Nativo |
| Configuración | Más compleja | Más simple |

---

## 🔒 9. Seguridad

### Firestore Security Rules

Debes configurar reglas de seguridad en Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función helper para verificar autenticación
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Función helper para verificar admin
    function isAdmin() {
      return isSignedIn() && 
             request.auth.token.rol == 'administrador';
    }
    
    // Función helper para verificar empleado o admin
    function isEmployee() {
      return isSignedIn() && 
             (request.auth.token.rol == 'empleado' || 
              request.auth.token.rol == 'administrador');
    }
    
    // Usuarios: Solo admin puede escribir, empleados pueden leer
    match /usuarios/{userId} {
      allow read: if isEmployee();
      allow write: if isAdmin();
    }
    
    // Citas: Usuarios autenticados pueden leer/escribir
    match /citas/{citaId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn();
      allow delete: if isAdmin();
    }
  }
}
```

---

## 🧪 10. Probar el Sistema

### 1. Instalar dependencias
```bash
cd backend
npm install
```

### 2. Configurar Firebase
- Seguir guía en `FIREBASE_SETUP.md`
- Colocar credenciales en `config/firebase-credentials.json`

### 3. Configurar variables de entorno
```bash
cp env.config.example .env
# Editar .env con tus credenciales
```

### 4. Iniciar servidor
```bash
npm start
# O en modo desarrollo:
npm run dev
```

### 5. Verificar conexión
```bash
curl http://localhost:3000/test-connection
```

Deberías ver:
```json
{
  "success": true,
  "status": "Conectado a Firebase",
  "projectId": "tu-proyecto",
  "message": "¡Conexión establecida exitosamente!"
}
```

---

## 📝 11. Migrando Datos Existentes

Si tienes datos en Supabase que quieres migrar a Firestore:

### Script de Migración (ejemplo)

```javascript
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// Configurar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Configurar Firebase
admin.initializeApp({
  credential: admin.credential.cert('./firebase-credentials.json')
});

const db = admin.firestore();

async function migrateUsers() {
  // Obtener usuarios de Supabase
  const { data: users } = await supabase
    .from('usuarios')
    .select('*');

  // Migrar a Firestore
  const batch = db.batch();
  
  users.forEach(user => {
    const docRef = db.collection('usuarios').doc(user.firebase_uid);
    batch.set(docRef, {
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      created_at: admin.firestore.Timestamp.fromDate(new Date(user.created_at))
    });
  });

  await batch.commit();
  console.log(`Migrados ${users.length} usuarios`);
}

async function migrateCitas() {
  // Similar al de usuarios...
}

// Ejecutar migración
migrateUsers()
  .then(() => migrateCitas())
  .then(() => console.log('Migración completada'))
  .catch(console.error);
```

---

## ⚠️ 12. Diferencias Importantes

### Consultas
```javascript
// SUPABASE - SQL-like
.select('nombre, email')
.eq('rol', 'empleado')
.neq('disabled', true)
.or('edad.gte.18,rol.eq.admin')

// FIRESTORE - NoSQL
.select('nombre', 'email')
.where('rol', '==', 'empleado')
.where('disabled', '!=', true)
// OR queries requieren múltiples consultas o composite indexes
```

### Transacciones
```javascript
// SUPABASE
const { data, error } = await supabase
  .from('usuarios')
  .insert([user1, user2, user3]);

// FIRESTORE
const batch = db.batch();
batch.set(doc1Ref, user1);
batch.set(doc2Ref, user2);
batch.set(doc3Ref, user3);
await batch.commit();
```

### IDs
- **Supabase**: IDs numéricos auto-incrementales o UUIDs
- **Firestore**: IDs alfanuméricos autogenerados (20 caracteres)

---

## 📚 13. Recursos

- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Migrate from SQL to Firestore](https://firebase.google.com/docs/firestore/solutions/migrate-sql)

---

**Fecha de migración:** $(date)  
**Sistema anterior:** Supabase (PostgreSQL)  
**Sistema actual:** Firebase Firestore  
**Estado:** ✅ Completado

