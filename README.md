# 🚗 Lavadero Electron

Este proyecto es un **sistema digital multiplataforma** para la gestión administrativa de un lavadero de vehículos.  
Su objetivo principal es reemplazar el registro manual en planillas físicas por un sistema más eficiente y seguro que integre:

- 📋 **Registro de usuarios y vehículos**  
- 🛠️ **Gestión de servicios ofrecidos por el lavadero**  
- 📊 **Generación de reportes**  
- 🔐 **Acceso seguro con login de usuarios y roles**  

El sistema funciona como aplicación de escritorio (con **Electron.js**), con frontend en **HTML, CSS y JavaScript**, backend en **Node.js (Express)** y base de datos en **MySQL (phpMyAdmin)**.

---

## ⚙️ Tecnologías utilizadas

- [Electron.js](https://www.electronjs.org/) → Interfaz de escritorio  
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) → Backend y servidor  
- [MySQL](https://www.mysql.com/) + [phpMyAdmin](https://www.phpmyadmin.net/) → Base de datos  
- [HTML](https://developer.mozilla.org/es/docs/Web/HTML) + [CSS](https://developer.mozilla.org/es/docs/Web/CSS) + [JavaScript](https://developer.mozilla.org/es/docs/Web/JavaScript) → Frontend  

---

## 👥 Roles de usuario

El sistema está dirigido al personal del lavadero y contempla 2 **roles con interfaces específicas**:

- **Administrador**  
  - Acceso total al sistema.  
  - Consultar reportes completos, estadísticas y administración total.  
  - Definir los servicios disponibles y precios.  

- **Secretario**  
  - Registrar vehículos y llenar formularios.  
  - Consultar y editar reportes diarios.  
  - Asociar servicios a cada vehículo atendido.  

Cada rol contará con un **acceso independiente después del login**, y se mostrará una interfaz diferente según el tipo de usuario.  

---

## 📂 Estructura del proyecto

```
lavadero-electron/
│── backend/                  
│   ├── config/            → conexión con MySQL y variables .env
│   ├── routes/            → rutas separadas (auth, registros, reportes)
│   ├── controllers/       → lógica de negocio
│   ├── models/            → definición de tablas MySQL
│   ├── middleware/        → autenticación y validación de roles
│   └── server.js          → configuración Express
│
│── frontend/                
│   ├── views/             
│   │   ├── login.html         → pantalla de inicio de sesión
│   │   ├── admin.html         → interfaz del administrador
│   │   └── secretario.html    → interfaz del secretario
│   ├── assets/
│   │   ├── css/styles.css     → estilos compartidos
│   │   └── js/logic.js        → redirección según rol
│
│── main.js                 → configuración de Electron
│── package.json            → dependencias del proyecto
│── .env                    → variables de entorno (usuario DB, password, puerto)
│── .gitignore              → exclusiones (node_modules, etc.)
│── README.md               → documentación del proyecto
```

---

## 🚀 Cómo ejecutar el proyecto

### 1. Clonar el repositorio
```bash
git clone https://github.com/Yan24D/lavadero-electron.git
cd lavadero-electron
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar la base de datos
1. Inicia **XAMPP** y abre **phpMyAdmin**.  
2. Crea una base de datos llamada `lavadero_db`.  
3. Ejecuta este SQL para crear la tabla de usuarios con roles:

```sql
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('administrador', 'secretario') NOT NULL,
  nombre_completo VARCHAR(100) NOT NULL
);

INSERT INTO usuarios (usuario, password, rol, nombre_completo) 
VALUES ("admin1", "1234", "administrador", "Administrador Principal");

INSERT INTO usuarios (usuario, password, rol, nombre_completo) 
VALUES ("sec1", "1234", "secretario", "Secretario General");
```

*(Se recomienda reemplazar las contraseñas por versiones encriptadas con bcrypt u otra librería antes de producción).*  

### 4. Iniciar el backend
```bash
node backend/server.js
```

Servidor corriendo en:  
👉 `http://localhost:3000`

### 5. Iniciar la aplicación en Electron
```bash
npm start
```

---

## 📌 Estado actual
✅ Login básico implementado con roles (Administrador, Secretario)  
✅ Conexión con MySQL  
⬜ Vista administrador con reportes y gestión de servicios  
⬜ Vista secretario con registros de vehículos y reportes diarios  
⬜ Seguridad avanzada (hash de contraseñas, validaciones)  

---

## 👥 Colaboradores
- Yancarlos  
- [Agregar aquí tu compañero de proyecto]  

---

## 📜 Licencia
Este proyecto es de uso académico.  
