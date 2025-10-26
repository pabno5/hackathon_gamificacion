// index.js
const express = require('express');
const app = express();
const port = 3001; // Puerto en el que se ejecutará el servidor

// Ruta de ejemplo
app.get('/', (req, res) => {
  res.send('¡Hola desde mi backend!');
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});