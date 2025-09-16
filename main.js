const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
    // Crear la ventana del navegador
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'icon.ico'), // Opcional: agregar icono
        show: false // No mostrar hasta que esté listo
    });

    // Cargar el archivo HTML de login
    mainWindow.loadFile('frontend/views/login.html');

    // Mostrar ventana cuando esté lista
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Abrir DevTools en desarrollo
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    // Evento cuando la ventana es cerrada
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Configurar menú personalizado
    const menuTemplate = [
        {
            label: 'Archivo',
            submenu: [
                {
                    label: 'Cerrar Sesión',
                    accelerator: 'CmdOrCtrl+L',
                    click: () => {
                        mainWindow.loadFile('frontend/views/login.html');
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Salir',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                {
                    label: 'Recargar',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Pantalla Completa',
                    accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Herramientas de Desarrollador',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: 'Acerca de',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Acerca de Auto Clean System',
                            message: 'Auto Clean System v1.0.0',
                            detail: 'Sistema de gestión para lavadero de vehículos\nDesarrollado por Yancarlos & Victorius'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

function startServer() {
    // Iniciar el servidor backend
    serverProcess = spawn('node', ['backend/server.js'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
        console.error('Error iniciando servidor:', err);
    });

    serverProcess.on('close', (code) => {
        console.log(`Servidor cerrado con código: ${code}`);
    });
}

function stopServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}

// Este método será llamado cuando Electron haya terminado de inicializarse
app.whenReady().then(() => {
    // Iniciar servidor backend
    startServer();
    
    // Esperar un momento para que el servidor inicie
    setTimeout(() => {
        createWindow();
    }, 2000);
});

// Salir cuando todas las ventanas están cerradas
app.on('window-all-closed', () => {
    // En macOS es común que las aplicaciones y su barra de menú
    // se mantengan activas hasta que el usuario salga explícitamente con Cmd + Q
    stopServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // En macOS es común recrear una ventana en la aplicación cuando el
    // icono del dock es clickeado y no hay otras ventanas abiertas
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    stopServer();
});

// Manejo de certificados SSL (para desarrollo)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('https://localhost')) {
        // Verificación omitida para localhost
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});