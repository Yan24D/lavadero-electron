const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",     // XAMPP → localhost
  user: "root",          // Usuario por defecto
  password: "",          // Contraseña vacía en XAMPP
  database: "lavadero_db" // Debes crear esta base en phpMyAdmin
});

db.connect((err) => {
  if (err) {
    console.error("❌ Error conectando a MySQL:", err);
    return;
  }
  console.log("✅ Conexión exitosa a MySQL");
});

module.exports = db;
