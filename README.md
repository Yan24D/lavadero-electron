# 🚗 Lavadero Electron

Este proyecto es un **sistema digital multiplataforma** para la gestión administrativa de un lavadero de vehículos.  
Su objetivo principal es reemplazar el registro manual en planillas físicas por un sistema más eficiente y seguro que integre:

- 📋 **Registro de usuarios y vehículos**  
- 💵 **Gestión de pagos y porcentajes de lavadores**  
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

El sistema está dirigido al personal del lavadero y contempla distintos **roles con interfaces específicas**:

- **Gerente**  
  - Acceso a una **vista general de todo el sistema**.  
  - Consultar reportes completos, estadísticas y administración total.  

- **Administrador**  
  - Registrar vehículos y llenar formularios.  
  - Consultar y editar reportes diarios.  

- **Lavador (futuro)**  
  - Interfaz simplificada para marcar servicios realizados y consultar asignaciones.  

Cada rol contará con un **acceso independiente después del login**, y se mostrará una interfaz diferente según el tipo de usuario.  

---

## 📂 Estructura del proyecto

```
lavadero-electron/
│── backend/                  
│   │── db.js             → conexión con MySQL
│   │── server.js         → servidor Express y rutas (login con roles)
│
│── frontend/                
│   │── login.html         → pantalla de inicio de sesión
│   │── gerente.html       → interfaz para el gerente (vista general, reportes, estadísticas)
│   │── admin.html         → interfaz para el administrador (formularios, registros diarios, reportes)
│   │── lavador.html       → interfaz futura para el lavador (opcional)
│   │── styles.css         → estilos compartidos
│   │── logic.js           → lógica del login (redirige según rol)
│
│── main.js                 → configuración de Electron
│── package.json            → configuración del proyecto
│── .gitignore              → exclusiones (node_modules, etc.)
│── README.md               → documentación del proyecto
```

⚠️ Nota: El actual `index.html` que contiene funciones de administrador se reemplaza por **`admin.html`**.  

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
  rol ENUM('gerente', 'administrador', 'lavador') NOT NULL
);

-- Ejemplos
INSERT INTO usuarios (usuario, password, rol) VALUES ("gerente1", "1234", "gerente");
INSERT INTO usuarios (usuario, password, rol) VALUES ("admin1", "1234", "administrador");
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
✅ Login básico implementado con roles (Gerente, Administrador)  
✅ Conexión con MySQL  
⬜ Vista gerente con reportes generales  
⬜ Vista administrador con formularios y registros  
⬜ Interfaz lavador (futuro)  
⬜ Seguridad avanzada (hash de contraseñas)  

---

## 👥 Colaboradores
- Yancarlos  
- [Agregar aquí tu compañero de proyecto]  

---

## 📜 Licencia
Este proyecto es de uso académico.  
