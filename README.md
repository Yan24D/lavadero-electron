# 🚗 Lavadero Electron

Aplicación de escritorio desarrollada en **Electron + Node.js + MySQL**, pensada para digitalizar los registros de un lavadero de vehículos.  
El sistema está orientado al **personal administrativo** y cuenta con 2 roles principales:  

- **Administrador** → Vista general del sistema, gestión de usuarios y servicios.  
- **Secretario** → Registro de servicios diarios, reportes del día, edición básica de datos.  

---

## 📂 Estructura del proyecto
```
lavadero-electron/
│
│── backend/                  
│   ├── config/         → conexión a MySQL
│   ├── routes/         → rutas de la API (auth, registros, reportes)
│   ├── controllers/    → lógica de negocio
│   ├── models/         → modelos y consultas SQL
│   ├── middleware/     → validaciones y seguridad
│   └── server.js       → configuración principal de Express
│
│── frontend/                 
│   ├── views/          → login, admin.html, secretario.html
│   └── assets/         → css y js (estilos y lógica de frontend)
│
│── main.js             → inicio de la app con Electron
│── package.json        → dependencias del proyecto
│── .env                → variables de entorno (DB, Google OAuth, etc.)
│── README.md           → documentación del proyecto
```

---

## 🛠️ Tecnologías utilizadas
- **Frontend**: HTML, CSS, JavaScript.  
- **Backend**: Node.js + Express.  
- **Base de datos**: MySQL.  
- **Escritorio**: Electron.  
- **Autenticación**:  
  - Local (usuario + contraseña).  
  - Google (OAuth 2.0 con email).  

---

## 🗄️ Base de datos

### 📌 Tabla `usuarios`
```sql
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255), -- NULL si es login con Google
    rol ENUM('admin','secretario') NOT NULL,
    provider ENUM('local','google') DEFAULT 'local',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 📌 Tabla `servicios`
```sql
CREATE TABLE servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_base DECIMAL(10,2) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 📌 Tabla `registros`
```sql
CREATE TABLE registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT (CURDATE()),
    hora TIME NOT NULL DEFAULT (CURTIME()),
    vehiculo VARCHAR(50) NOT NULL,
    placa VARCHAR(10) NOT NULL,
    id_servicio INT NOT NULL,
    costo DECIMAL(10,2) NOT NULL,
    porcentaje DECIMAL(5,2) NOT NULL,
    lavador VARCHAR(100) NOT NULL,
    observaciones TEXT,
    pago ENUM('Pendiente','Pagado') DEFAULT 'Pendiente',
    id_usuario INT,
    FOREIGN KEY (id_servicio) REFERENCES servicios(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);
```

---

## 🚀 Funcionalidades principales
- **Login** con usuario/contraseña o Google OAuth.  
- **Administrador**:  
  - Gestión de usuarios.  
  - Gestión de servicios.  
  - Vista general de registros y reportes.  
- **Secretario**:  
  - Registro de servicios diarios (basado en planilla física).  
  - Reportes diarios.  
  - Edición básica de registros.  

---

## 📌 Próximos pasos
- Implementar la interfaz de login con opción Google.  
- Conectar backend con MySQL y rutas API.  
- Crear reportes automáticos por fecha.  
