const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
require('dotenv').config();

// Configuración de Firebase Admin (para el backend)
let serviceAccount;

try {
  // Intenta cargar las credenciales desde el archivo JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // O desde una variable de entorno con el JSON completo
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.warn('⚠️  No se encontraron credenciales de Firebase Admin. Algunas funciones pueden no estar disponibles.');
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin inicializado correctamente');
  }
} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin:', error.message);
}

// Configuración de Firebase Client (para compatibilidad)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Solo inicializar si tenemos la configuración
let firebaseApp = null;
let auth = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    console.log('✅ Firebase Client inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar Firebase Client:', error.message);
  }
}

// Exportar tanto admin como client auth
module.exports = {
  admin,
  auth,
  firebaseApp
};

