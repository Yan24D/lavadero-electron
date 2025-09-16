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

  // Validación básica
  if (!usuario || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Usuario y contraseña son requeridos" 
    });
  }

  const query = "SELECT * FROM usuarios WHERE usuario = ? AND password = ?";
  db.query(query, [usuario, password], (err, result) => {
    if (err) {
      console.error("Error en consulta de login:", err);
      return res.status(500).json({ 
        success: false, 
        error: "Error en el servidor" 
      });
    }
    
    if (result.length > 0) {
      console.log(`✅ Login exitoso para usuario: ${usuario}`);
      res.json({ 
        success: true, 
        message: "✅ Login exitoso",
        user: {
          id: result[0].id,
          usuario: result[0].usuario,
          nombre: result[0].nombre || result[0].usuario,
          rol: result[0].rol
        }
      });
    } else {
      console.log(`❌ Login fallido para usuario: ${usuario}`);
      res.json({ 
        success: false, 
        message: "❌ Usuario o contraseña incorrectos" 
      });
    }
  });
});

// Ruta para registro de nuevos usuarios
app.post("/register", (req, res) => {
  const { name, usuario, password } = req.body;

  // Validación básica
  if (!name || !usuario || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Todos los campos son requeridos" 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: "La contraseña debe tener al menos 6 caracteres" 
    });
  }

  // Verificar si el usuario ya existe
  const checkQuery = "SELECT * FROM usuarios WHERE usuario = ?";
  db.query(checkQuery, [usuario], (err, result) => {
    if (err) {
      console.error("Error verificando usuario existente:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Error en el servidor" 
      });
    }

    if (result.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "El usuario ya existe" 
      });
    }

    // Insertar nuevo usuario
    const insertQuery = "INSERT INTO usuarios (nombre, usuario, password) VALUES (?, ?, ?)";
    db.query(insertQuery, [name, usuario, password], (err, result) => {
      if (err) {
        console.error("Error insertando nuevo usuario:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Error al crear el usuario" 
        });
      }

      console.log(`✅ Usuario creado exitosamente: ${usuario}`);
      res.json({ 
        success: true, 
        message: "✅ Usuario creado exitosamente",
        user: {
          id: result.insertId,
          usuario: usuario,
          nombre: name
        }
      });
    });
  });
});

// Ruta para verificar conexión de base de datos
app.get("/test-db", (req, res) => {
  db.query("SELECT 1 + 1 as result", (err, result) => {
    if (err) {
      res.status(500).json({ 
        success: false, 
        message: "Error de conexión a la base de datos",
        error: err.message 
      });
    } else {
      res.json({ 
        success: true, 
        message: "Conexión a la base de datos exitosa",
        result: result[0].result 
      });
    }
  });
});
// Ruta para guardar servicio
app.post("/servicios", (req, res) => {
  const { 
    fecha, hora, tipo_vehiculo, placa, tipo_servicio, 
    costo, comision, porcentaje_comision, lavador, 
    observaciones, pagado, usuario_id 
  } = req.body;

  if (!fecha || !hora || !tipo_vehiculo || !placa || !tipo_servicio || !costo || !lavador) {
    return res.status(400).json({ 
      success: false, 
      message: "Campos obligatorios faltantes" 
    });
  }

  const query = `INSERT INTO servicios 
    (fecha, hora, tipo_vehiculo, placa, tipo_servicio, costo, comision, porcentaje_comision, lavador, observaciones, pagado, usuario_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(query, [fecha, hora, tipo_vehiculo, placa, tipo_servicio, costo, comision, porcentaje_comision, lavador, observaciones, pagado, usuario_id], (err, result) => {
    if (err) {
      console.error("Error al guardar servicio:", err);
      return res.status(500).json({ success: false, message: "Error al guardar servicio" });
    }

    res.json({ 
      success: true, 
      message: "Servicio registrado correctamente",
      id: result.insertId 
    });
  });
});

// Ruta para obtener servicios por fecha
app.get("/servicios/:fecha", (req, res) => {
  const fecha = req.params.fecha;
  const query = "SELECT * FROM servicios WHERE fecha = ? ORDER BY hora DESC";
  
  db.query(query, [fecha], (err, result) => {
    if (err) {
      console.error("Error consultando servicios:", err);
      return res.status(500).json({ success: false, message: "Error consultando servicios" });
    }
    
    res.json({ success: true, data: result });
  });
});

// Ruta para buscar servicios con filtros
app.post("/servicios/buscar", (req, res) => {
  const { placa, fecha, tipo_servicio } = req.body;
  let query = "SELECT * FROM servicios WHERE 1=1";
  let params = [];

  if (placa) {
    query += " AND placa LIKE ?";
    params.push(`%${placa}%`);
  }
  if (fecha) {
    query += " AND fecha = ?";
    params.push(fecha);
  }
  if (tipo_servicio) {
    query += " AND tipo_servicio = ?";
    params.push(tipo_servicio);
  }

  query += " ORDER BY fecha DESC, hora DESC";

  db.query(query, params, (err, result) => {
    if (err) {
      console.error("Error en búsqueda:", err);
      return res.status(500).json({ success: false, message: "Error en búsqueda" });
    }
    
    res.json({ success: true, data: result });
  });
});
// Iniciar servidor
app.listen(3000, () => {
  console.log("🚀 Servidor backend en http://localhost:3000");
  console.log("📊 Base de datos: lavadero_db");
  console.log("🔐 Endpoints disponibles:");
  console.log("   POST /login - Iniciar sesión");
  console.log("   POST /register - Registrar usuario");
  console.log("   GET /test-db - Probar conexión BD");
});