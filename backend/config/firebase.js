const admin = require('firebase-admin');
require('dotenv').config();

// Configuración de Firebase Admin usando variables de entorno
let serviceAccount;

try {
  // OPCIÓN 1: Cargar desde archivo JSON (desarrollo)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const path = require('path');
    const credentialsPath = path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    serviceAccount = require(credentialsPath);
    console.log('📁 Cargando credenciales desde archivo:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  } 
  // OPCIÓN 2: Usar variables de entorno individuales (producción)
  else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Convertir \n literales a saltos de línea
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };
    console.log('🔐 Cargando credenciales desde variables de entorno');
  } 
  // OPCIÓN 3: JSON completo como string
  else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('📝 Cargando credenciales desde JSON string');
  } 
  else {
    console.warn('⚠️  No se encontraron credenciales de Firebase Admin.');
    console.warn('⚠️  Configura FIREBASE_SERVICE_ACCOUNT_PATH o las variables de entorno individuales.');
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin inicializado correctamente');
    console.log('🎯 Project ID:', serviceAccount.project_id);
  } else {
    console.error('❌ No se pudo inicializar Firebase Admin - credenciales no encontradas');
  }
} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin:', error.message);
  console.error('💡 Verifica tu configuración en el archivo .env');
}

// Exportar admin
module.exports = {
  admin
};

