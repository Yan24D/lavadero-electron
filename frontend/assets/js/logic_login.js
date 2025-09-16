// Función para cambiar entre pestañas
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form-content').forEach(form => form.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName + 'Form').classList.add('active');
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Función para hacer login
async function handleLogin(email, password) {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        return await response.json();
    } catch (error) {
        console.error('Error en login:', error);
        return { success: false, message: 'Error de conexión con el servidor' };
    }
}

// Función para registrar usuario
async function handleRegister(userData) {
    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        return await response.json();
    } catch (error) {
        console.error('Error en registro:', error);
        return { success: false, message: 'Error de conexión con el servidor' };
    }
}

// Función para redirigir según el rol del usuario
function redirectByRole(rol) {
    switch(rol) {
        case 'admin':
            window.location.href = 'admin.html';
            break;
        case 'secretario':
            window.location.href = 'secretario.html';
            break;
        default:
            window.location.href = 'admin.html';
            break;
    }
}

function showForgotPassword() {
    showNotification('Funcionalidad de recuperación por implementar', 'info');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Manejar formulario de login
    document.getElementById('loginFormSubmit').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showNotification('Por favor, complete todos los campos', 'warning');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showNotification('Por favor, ingrese un email válido', 'warning');
            return;
        }

        // Mostrar loading
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const result = await handleLogin(email, password);
            
            if (result.success) {
                showNotification('¡Login exitoso! Redirigiendo...', 'success');
                
                // Guardar sesión si está marcado "recordar"
                if (document.getElementById('rememberMe').checked) {
                    localStorage.setItem('lavadero_remember', 'true');
                    localStorage.setItem('lavadero_user', email);
                    localStorage.setItem('lavadero_token', result.token);
                }

                // Redirigir según rol
                setTimeout(() => {
                    redirectByRole(result.user.rol);
                }, 1500);
            } else {
                showNotification(result.message || 'Email o contraseña incorrectos', 'error');
            }
        } catch (error) {
            showNotification('Error de conexión', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    // Manejar formulario de registro
    document.getElementById('registerFormSubmit').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const nombre = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const rol = document.getElementById('registerRol').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validaciones
        if (!nombre || !email || !rol || !password || !confirmPassword) {
            showNotification('Complete todos los campos', 'warning');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showNotification('Por favor, ingrese un email válido', 'warning');
            return;
        }

        if (password.length < 6) {
            showNotification('La contraseña debe tener al menos 6 caracteres', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Las contraseñas no coinciden', 'warning');
            return;
        }

        if (!document.getElementById('acceptTerms').checked) {
            showNotification('Debe aceptar los términos y condiciones', 'warning');
            return;
        }

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const result = await handleRegister({ nombre, email, rol, password });
            
            if (result.success) {
                showNotification('¡Usuario creado exitosamente!', 'success');
                
                // Limpiar formulario
                this.reset();
                
                setTimeout(() => {
                    switchTab('login');
                    document.getElementById('loginEmail').value = email;
                }, 1500);
            } else {
                showNotification(result.message || 'Error al crear el usuario', 'error');
            }
        } catch (error) {
            showNotification('Error de conexión', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    // Verificar si hay sesión guardada
    if (localStorage.getItem('lavadero_remember') === 'true') {
        const savedUser = localStorage.getItem('lavadero_user');
        if (savedUser) {
            document.getElementById('loginEmail').value = savedUser;
            document.getElementById('rememberMe').checked = true;
        }
    }
});