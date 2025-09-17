# 🚗 Lavadero Electron

Aplicación de escritorio desarrollada en **Electron + Node.js + MySQL**, para digitalizar los registros de un lavadero de vehículos.  
El sistema está dirigido al personal administrativo y cuenta con 2 roles principales:

- **Administrador** → Vista general del sistema, gestión de usuarios y servicios.
- **Secretario** → Registro de servicios diarios, edición de datos y reportes del día.

---

## 📂 Estructura del proyecto
```
lavadero-electron/
│
│── backend/                   
│   ├── config/         → conexión a MySQL y variables de entorno
│   ├── routes/         → rutas de la API (auth, registros, reportes)
│   ├── controllers/    → lógica de negocio
│   ├── models/         → modelos y consultas SQL
│   ├── middleware/     → autenticación, validación de roles
│   └── server.js       → servidor principal de Express
│
│── frontend/                 
│   ├── views/          → login.html, admin.html, secretario.html
│   └── assets/         → css (styles.css), js (logic.js)
│
│── main.js             → configuración de Electron
│── package.json        → dependencias y scripts del sistema
│── .env                → variables de entorno (base de datos, Google OAuth, etc.)
│── .gitignore          → archivos excluidos del repositorio
│── README.md           → documentación del proyecto
```

---

## 🛠️ Tecnologías utilizadas

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js + Express  
- **Base de datos:** MySQL  
- **Escritorio:** Electron  
- **Autenticación:**  
  - Local (usuario + contraseña)  
  - Google OAuth (correo electrónico)

---

## 💵 Servicios y precios por tipo de vehículo

El sistema contempla los siguientes servicios con precios según el tipo de vehículo:

| Tipo de vehículo     | Servicio                     | Precio (COP)     |
|----------------------|-------------------------------|--------------------|
| Automóvil (Carro)     | Lavado y aspirado            | 20.000             |
| Camioneta (Pickup)    | Lavado y aspirado            | 25.000             |
| Motocicleta (Moto)    | Lavado solamente             | 10.000             |

---

## 🗄️ Base de datos

### Tabla `usuarios`
```sql
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255), -- NULL si el login es con Google
    rol ENUM('admin','secretario') NOT NULL,
    provider ENUM('local','google') DEFAULT 'local',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla `servicios`
```sql
CREATE TABLE servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_base DECIMAL(10,2) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla `servicio_precios`
```sql
CREATE TABLE servicio_precios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_servicio INT NOT NULL,
    tipo_vehiculo ENUM('car','pickup','motorcycle') NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_servicio) REFERENCES servicios(id)
);
```

### Tabla `registros`
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

## 🚀 Cómo ejecutar el proyecto

1. Clonar el repositorio  
```bash
git clone https://github.com/Yan24D/lavadero-electron.git
cd lavadero-electron
```

2. Instalar dependencias  
```bash
npm install
```

3. Configurar base de datos en `.env` y MySQL/phpMyAdmin  
   - Crear base de datos `lavadero_db`  
   - Crear las tablas `usuarios`, `servicios`, `servicio_precios`, `registros` con los scripts anteriores  
   - Insertar los precios específicos de vehículos

4. Levantar backend  
```bash
node backend/server.js
```

5. Arrancar la app de escritorio  
```bash
npm start
```

---

## 📌 Estado actual

✅ Login local (usuario/contraseña) y roles administrador / secretario  
✅ Base de datos con tabla de servicios y precios por tipo de vehículo  
✅ Vista básica para registro de servicios y reportes diarios  
⬜ Autenticación con Google OAuth  
⬜ Interfaz más pulida para los roles  
⬜ Validaciones y seguridad avanzada  

---

## 👥 Colaboradores

- Yancarlos  
- Victoria

---

## 📜 Licencia

Proyecto de uso académico.  
