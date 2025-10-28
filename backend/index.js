// index.js
const app = require('./server');
const { testConnection } = require('./db');
const PORT = process.env.PORT || 3000;

// Probar conexión a la base de datos antes de iniciar el servidor
const startServer = async () => {
  try {
    // Probar la conexión a la base de datos
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('No se pudo establecer conexión con la base de datos');
      process.exit(1);
    }

    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();