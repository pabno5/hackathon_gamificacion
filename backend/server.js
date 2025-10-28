// server.js
const express = require("express");
const { db } = require("./firebase.config");

const app = express();

// Ruta simple para comprobar el estado del servidor
app.get("/", (req, res) => {
  res.send("✅ Servidor funcionando correctamente con Firestore");
});

// Ruta para probar conexión a Firestore
app.get("/test-connection", async (req, res) => {
  try {
    const ref = db.collection("test").doc("connection");
    await ref.set({ status: "ok", timestamp: new Date() });
    const doc = await ref.get();

    res.json({
      success: true,
      message: "Conectado a Firestore",
      data: doc.data(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;
