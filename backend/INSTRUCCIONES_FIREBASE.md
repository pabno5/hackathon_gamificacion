# 🔥 Instrucciones de Configuración - Firebase

## ❌ Error: "The default Firebase app does not exist"

Este error significa que Firebase Admin no se está inicializando correctamente.

---

## 🔧 Solución Rápida

### 1. **Descargar Credenciales de Firebase**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **fir-auth-a1d39**
3. Haz clic en el ícono ⚙️ (Configuración) → **Configuración del proyecto**
4. Ve a la pestaña **Cuentas de servicio**
5. Haz clic en **Generar nueva clave privada**
6. Se descargará un archivo JSON

### 2. **Colocar el Archivo de Credenciales**

1. Renombra el archivo descargado a `firebase-credentials.json`
2. Créa la carpeta `config` si no existe:
   ```bash
   mkdir config
   ```
3. Mueve el archivo a `backend/config/firebase-credentials.json`

### 3. **Crear archivo .env**

```bash
# En la carpeta backend
cp .env.example .env
```

Edita el archivo `.env` y agrega:
```env
PORT=3000
NODE_ENV=development
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-credentials.json
```

### 4. **Agregar al .gitignore**

Asegúrate de que tu `.gitignore` contenga:
```
# Firebase credentials
.env
.env.local
config/firebase-credentials.json
**/firebase-credentials.json
```

---

## 📦 Instalación

```bash
cd backend
npm install
```

---

## 🚀 Iniciar Servidor

```bash
npm start
# O en modo desarrollo:
npm run dev
```

Deberías ver:
```
✅ Firebase Admin inicializado correctamente
Servidor corriendo en http://localhost:3000
```

---

## 🧪 Verificar Conexión

```bash
curl http://localhost:3000/test-connection
```

O abre en tu navegador: `http://localhost:3000/test-connection`

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

## 📁 Estructura de Archivos

```
backend/
├── config/
│   ├── firebase.js                  # Configuración de Firebase
│   └── firebase-credentials.json    # 🔒 Credenciales (NO subir a Git)
├── .env                              # 🔒 Variables de entorno (NO subir a Git)
├── .env.example                      # ✅ Ejemplo de variables (sí subir)
├── .gitignore                        # Ignorar archivos sensibles
└── server.js
```

---

## ⚠️ Problemas Comunes

### Error: "Cannot find module './config/firebase-credentials.json'"

**Solución:**
- Verifica que el archivo existe en `backend/config/firebase-credentials.json`
- Verifica que la ruta en `.env` es correcta

### Error: "FIREBASE_SERVICE_ACCOUNT_PATH is not defined"

**Solución:**
- Crea el archivo `.env` desde `.env.example`
- Agrega la variable `FIREBASE_SERVICE_ACCOUNT_PATH`

### Error: "Invalid service account"

**Solución:**
- Descarga nuevamente las credenciales desde Firebase Console
- Verifica que el archivo JSON tenga el formato correcto

---

## 🔒 Seguridad

### ⚠️ NUNCA subas a Git:
- ❌ `.env`
- ❌ `firebase-credentials.json`
- ❌ Claves privadas

### ✅ SÍ subir a Git:
- ✅ `.env.example` (sin valores reales)
- ✅ `.gitignore`
- ✅ Código fuente

---

## 📝 Alternativa: Variable de Entorno

Si no quieres usar archivo JSON (por ejemplo, en Heroku o Vercel):

1. Abre el archivo `firebase-credentials.json`
2. Copia todo el contenido (un objeto JSON)
3. En tu `.env`, agrega:
   ```env
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"fir-auth-a1d39",...}'
   ```
4. Asegúrate de que sea todo en una sola línea y entre comillas simples

---

## 🎯 Tu Proyecto Firebase

- **Project ID:** `fir-auth-a1d39`
- **Auth Domain:** `fir-auth-a1d39.firebaseapp.com`
- **Console:** https://console.firebase.google.com/project/fir-auth-a1d39

---

## 📚 Recursos

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Firestore Quickstart](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Security](https://firebase.google.com/docs/admin/setup#initialize-sdk)

