# 🚗 Lavadero Electron

Este proyecto es un **sistema digital multiplataforma** para la gestión administrativa de un lavadero de vehículos.  
Su objetivo principal es reemplazar el registro manual en planillas físicas por un sistema más eficiente y seguro que integre:

- 📋 **Registro de usuarios y vehículos**  
- 💵 **Gestión de pagos y porcentajes de lavadores**  
- 📊 **Generación de reportes**  
- 🔐 **Acceso seguro con login de usuarios**  

El sistema funciona como aplicación de escritorio (con **Electron.js**), con frontend en **HTML, CSS y JavaScript**, backend en **Node.js (Express)** y base de datos en **MySQL (phpMyAdmin)**.

---

## ⚙️ Tecnologías utilizadas

- [Electron.js](https://www.electronjs.org/) → Interfaz de escritorio  
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) → Backend y servidor  
- [MySQL](https://www.mysql.com/) + [phpMyAdmin](https://www.phpmyadmin.net/) → Base de datos  
- [HTML](https://developer.mozilla.org/es/docs/Web/HTML) + [CSS](https://developer.mozilla.org/es/docs/Web/CSS) + [JavaScript](https://developer.mozilla.org/es/docs/Web/JavaScript) → Frontend  

---

## 📂 Estructura del proyecto

```
lavadero-electron/
│── backend/                  
│   │── db.js             → conexión con MySQL
│   │── server.js         → servidor Express y rutas
│
│── frontend/                
│   │── login.html         → pantalla de login
│   │── index.html         → pantalla principal del sistema
│   │── styles.css         → estilos compartidos
│   │── logic.js           → lógica del login y frontend
│
│── main.js                 → configuración de Electron
│── package.json            → configuración del proyecto
│── .gitignore              → exclusiones (node_modules, etc.)
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
3. Ejecuta este SQL para crear la tabla de usuarios:

```sql
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL,
  password VARCHAR(50) NOT NULL
);

INSERT INTO usuarios (usuario, password) VALUES ("admin", "1234");
```

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
✅ Login básico implementado  
✅ Conexión con MySQL  
⬜ Registro de vehículos  
⬜ Gestión de pagos y reportes  
⬜ Seguridad avanzada (hash de contraseñas)  

---

## 👥 Colaboradores
- Yancarlos  
- [Agregar aquí tu compañero de proyecto]  

---

## 📜 Licencia
Este proyecto es de uso académico.  
