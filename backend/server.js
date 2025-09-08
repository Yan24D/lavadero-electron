const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor backend funcionando 🚀");
});

// Ruta para login
app.post("/login", (req, res) => {
  const { usuario, password } = req.body;

  const query = "SELECT * FROM usuarios WHERE usuario = ? AND password = ?";
  db.query(query, [usuario, password], (err, result) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    if (result.length > 0) {
      res.json({ success: true, message: "✅ Login exitoso" });
    } else {
      res.json({ success: false, message: "❌ Usuario o contraseña incorrectos" });
    }
  });
});

// Iniciar servidor
app.listen(3000, () => {
  console.log("🚀 Servidor backend en http://localhost:3000");
});
