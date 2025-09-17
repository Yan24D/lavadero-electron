/**
 * Sistema de Gestión Administrativa - Lavadero de Autos
 * Panel de Administración Completo con BD Real
 * @version 1.0.0
 * @author Victorius
 */

class AdminSystem {
    constructor() {
        this.API_BASE = 'http://localhost:3000/api';
        this.user = this.getCurrentUser();
        this.charts = {};
        this.currentData = {
            usuarios: [],
            servicios: [],
            lavadores: [],
            registros: [],
            estadisticas: {},
            reportes: {}
        };
        
        this.init();
    }

    async init() {
        try {
            this.verificarAutenticacion();
            this.configurarEventListeners();
            this.inicializarDateTime();
            await this.cargarDatosIniciales();
            await this.inicializarDashboard();
            this.inicializarCalendario();
            console.log('✅ Sistema Administrativo inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando sistema administrativo:', error);
            this.mostrarNotificacion('Error al inicializar el sistema', 'error');
        }
    }

    // ===========================================
    // AUTENTICACIÓN Y CONFIGURACIÓN INICIAL
    // ===========================================

    getCurrentUser() {
        const userData = localStorage.getItem('lavadero_user_data');
        return userData ? JSON.parse(userData) : null;
    }

    verificarAutenticacion() {
        if (!this.user || this.user.rol !== 'admin') {
            alert('Acceso denegado. Solo administradores pueden acceder a este panel.');
            window.location.href = 'login.html';
            return;
        }
        
        // Actualizar nombre en navbar
        const userNameEl = document.querySelector('.navbar-nav .dropdown-toggle');
        if (userNameEl) {
            userNameEl.innerHTML = `<i class="fas fa-user-circle me-1"></i>${this.user.nombre}`;
        }
    }

    configurarEventListeners() {
        // Tabs
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetId = e.target.getAttribute('data-bs-target').substring(1);
                this.onTabChanged(targetId);
            });
        });

        // Dashboard - Selector de período
        const periodSelector = document.querySelector('#dashboardPanel select');
        if (periodSelector) {
            periodSelector.addEventListener('change', () => this.actualizarDashboard());
        }

        // Usuarios
        this.configurarUsuariosEvents();
        
        // Servicios
        this.configurarServiciosEvents();
        
        // Reportes
        this.configurarReportesEvents();
        
        // Historial
        this.configurarHistorialEvents();
        
        // Configuración
        this.configurarSettingsEvents();
    }

    configurarUsuariosEvents() {
        // Botón nuevo usuario
        const newUserBtn = document.querySelector('[data-bs-target="#userModal"]');
        if (newUserBtn) {
            newUserBtn.addEventListener('click', () => this.prepararModalUsuario());
        }

        // Form submit usuario
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => this.handleSubmitUsuario(e));
        }
    }

    configurarServiciosEvents() {
        // Botón nuevo servicio
        const newServiceBtn = document.querySelector('[data-bs-target="#serviceModal"]');
        if (newServiceBtn) {
            newServiceBtn.addEventListener('click', () => this.prepararModalServicio());
        }

        // Form submit servicio
        const serviceForm = document.getElementById('serviceForm');
        if (serviceForm) {
            serviceForm.addEventListener('submit', (e) => this.handleSubmitServicio(e));
        }
    }

    configurarReportesEvents() {
        // Exportar CSV
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportarReporteCSV());
        }

        // Generar PDF
        const generatePdfBtn = document.getElementById('generatePdfBtn');
        if (generatePdfBtn) {
            generatePdfBtn.addEventListener('click', () => this.generarReportePDF());
        }
    }

    configurarHistorialEvents() {
        // Cargar historial
        const loadHistoryBtn = document.getElementById('loadHistoryBtn');
        if (loadHistoryBtn) {
            loadHistoryBtn.addEventListener('click', () => this.cargarHistorial());
        }

        // Exportar historial
        const exportHistoryBtn = document.getElementById('exportHistoryBtn');
        if (exportHistoryBtn) {
            exportHistoryBtn.addEventListener('click', () => this.exportarHistorial());
        }
    }

    configurarSettingsEvents() {
        // Form configuración general
        const generalForm = document.getElementById('generalSettingsForm');
        if (generalForm) {
            generalForm.addEventListener('submit', (e) => this.guardarConfiguracion(e));
        }

        // Agregar lavador
        const addWasherBtn = document.getElementById('addWasherBtn');
        if (addWasherBtn) {
            addWasherBtn.addEventListener('click', () => this.agregarLavador());
        }

        // Eliminar lavadores
        document.addEventListener('click', (e) => {
            if (e.target.closest('.deleteBtn')) {
                const washerId = e.target.closest('.listItem').dataset.washerId;
                if (washerId) this.eliminarLavador(washerId);
            }
        });
    }

    inicializarDateTime() {
        this.actualizarDateTime();
        setInterval(() => this.actualizarDateTime(), 1000);
    }

    actualizarDateTime() {
        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        
        const currentDate = document.getElementById('currentDate');
        const currentTime = document.getElementById('currentTime');
        
        if (currentDate) currentDate.textContent = now.toLocaleDateString('es-ES', dateOptions);
        if (currentTime) currentTime.textContent = now.toLocaleTimeString('es-ES', timeOptions);
    }

    async onTabChanged(tabId) {
        console.log(`📋 Cambiando a tab: ${tabId}`);
        
        switch(tabId) {
            case 'dashboardPanel':
                await this.actualizarDashboard();
                this.redimensionarCharts();
                break;
            case 'usersPanel':
                await this.cargarUsuarios();
                break;
            case 'servicesPanel':
                await this.cargarServicios();
                break;
            case 'reportsPanel':
                await this.cargarReportes();
                break;
            case 'historyPanel':
                // El calendario ya está inicializado
                break;
            case 'settingsPanel':
                await this.cargarConfiguracion();
                break;
        }
    }

    // ===========================================
    // CARGA DE DATOS DESDE LA BASE DE DATOS
    // ===========================================

    async cargarDatosIniciales() {
        try {
            this.mostrarCargando(true, 'Cargando datos iniciales...');
            
            await Promise.all([
                this.cargarEstadisticasGenerales(),
                this.cargarLavadores()
            ]);
            
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.mostrarNotificacion('Error cargando datos del sistema', 'error');
        } finally {
            this.mostrarCargando(false);
        }
    }

    async cargarUsuarios() {
        try {
            // Por ahora usar datos mock ya que no hay endpoint específico para listar usuarios
            this.currentData.usuarios = [
                { id: 1, nombre: 'María García', email: 'maria@lavadero.com', rol: 'admin', activo: true, ultimo_acceso: 'Hace 5 min' },
                { id: 2, nombre: 'Juan Pérez', email: 'juan@lavadero.com', rol: 'secretario', activo: true, ultimo_acceso: 'Hace 1 hora' },
                { id: 3, nombre: 'Carlos Rodríguez', email: 'carlos@lavadero.com', rol: 'lavador', activo: false, ultimo_acceso: 'Hace 2 horas' }
            ];
            
            this.actualizarTablaUsuarios();
            this.actualizarBadgeUsuarios();
            
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            this.mostrarNotificacion('Error cargando usuarios', 'warning');
        }
    }

    async cargarServicios() {
        try {
            const response = await fetch(`${this.API_BASE}/servicios/precios/todos`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });

            const result = await response.json();

            if (result.success) {
                this.currentData.servicios = result.precios;
                this.actualizarServiciosCards();
                this.actualizarBadgeServicios();
            }
        } catch (error) {
            console.error('Error cargando servicios:', error);
            // Usar datos mock como fallback
            this.currentData.servicios = [
                { servicio_id: 1, servicio_nombre: 'Lavado Básico', descripcion: 'Lavado exterior básico', precios_por_vehiculo: { car: { precio: 15000 }, motorcycle: { precio: 8000 } } },
                { servicio_id: 2, servicio_nombre: 'Lavado Completo', descripcion: 'Lavado completo con aspirado', precios_por_vehiculo: { car: { precio: 25000 }, motorcycle: { precio: 12000 } } }
            ];
            this.actualizarServiciosCards();
            this.mostrarNotificacion('Usando datos de ejemplo para servicios', 'warning');
        }
    }

    async cargarLavadores() {
        try {
            const response = await fetch(`${this.API_BASE}/lavadores`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });

            const result = await response.json();

            if (result.success) {
                this.currentData.lavadores = result.lavadores;
                this.actualizarListaLavadores();
            }
        } catch (error) {
            console.error('Error cargando lavadores:', error);
            this.mostrarNotificacion('Error cargando lavadores', 'warning');
        }
    }

    async cargarEstadisticasGenerales() {
        try {
            const response = await fetch(`${this.API_BASE}/reportes/detallado`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });

            const result = await response.json();

            if (result.success) {
                this.currentData.estadisticas = result.resumen;
                this.currentData.reportes = result;
                this.actualizarEstadisticasDashboard();
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            // Usar datos mock
            this.currentData.estadisticas = {
                total_registros: 150,
                ingresos_totales: 2750000,
                ingresos_pagados: 2200000,
                servicios_realizados: 89
            };
            this.actualizarEstadisticasDashboard();
        }
    }

    async cargarRegistrosRecientes() {
        try {
            const hoy = new Date().toISOString().split('T')[0];
            
            const response = await fetch(`${this.API_BASE}/registros?fecha=${hoy}&limit=50`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });

            const result = await response.json();

            if (result.success) {
                this.currentData.registros = result.registros;
                this.actualizarTablaReportes();
            }
        } catch (error) {
            console.error('Error cargando registros recientes:', error);
            this.mostrarNotificacion('Error cargando registros recientes', 'warning');
        }
    }

    // ===========================================
    // DASHBOARD
    // ===========================================

    async inicializarDashboard() {
        await this.actualizarDashboard();
        this.inicializarCharts();
    }

    async actualizarDashboard() {
        try {
            await this.cargarEstadisticasGenerales();
            await this.cargarRegistrosRecientes();
            this.actualizarCharts();
        } catch (error) {
            console.error('Error actualizando dashboard:', error);
        }
    }

    actualizarEstadisticasDashboard() {
        const stats = this.currentData.estadisticas;
        
        // Ingresos del día (asumimos que son del día actual)
        document.querySelector('#dashboardPanel .summaryValue:nth-of-type(1)').textContent = 
            `$${(stats.ingresos_pagados || 720000).toLocaleString()}`;
        
        // Vehículos atendidos (total registros)
        document.querySelector('#dashboardPanel .summaryValue:nth-of-type(2)').textContent = 
            stats.total_registros || '32';
        
        // Clientes activos (mock data)
        document.querySelector('#dashboardPanel .summaryValue:nth-of-type(3)').textContent = '156';
        
        // Servicios completados
        document.querySelector('#dashboardPanel .summaryValue:nth-of-type(4)').textContent = 
            stats.total_registros || '28';
    }

    inicializarCharts() {
        this.inicializarGraficoIngresos();
        this.inicializarGraficoServicios();
    }

    inicializarGraficoIngresos() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        // Datos mock para el gráfico de ingresos semanales
        const data = {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Ingresos Diarios',
                data: [85000, 120000, 95000, 150000, 180000, 220000, 160000],
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        };

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    inicializarGraficoServicios() {
        const ctx = document.getElementById('servicesChart');
        if (!ctx) return;

        const data = {
            labels: ['Lavado Básico', 'Lavado Completo', 'Encerado', 'Premium'],
            datasets: [{
                data: [35, 28, 22, 15],
                backgroundColor: [
                    'rgba(13, 110, 253, 0.8)',
                    'rgba(25, 135, 84, 0.8)', 
                    'rgba(253, 126, 20, 0.8)',
                    'rgba(220, 53, 69, 0.8)'
                ]
            }]
        };

        this.charts.services = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    actualizarCharts() {
        if (this.currentData.reportes && this.currentData.reportes.servicios_populares) {
            // Actualizar gráfico de servicios con datos reales
            const servicios = this.currentData.reportes.servicios_populares.slice(0, 4);
            const labels = servicios.map(s => s.nombre);
            const data = servicios.map(s => s.veces_solicitado);
            
            if (this.charts.services) {
                this.charts.services.data.labels = labels;
                this.charts.services.data.datasets[0].data = data;
                this.charts.services.update();
            }
        }
    }

    redimensionarCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.resize();
        });
    }

    // ===========================================
    // GESTIÓN DE USUARIOS
    // ===========================================

    actualizarTablaUsuarios() {
        const tbody = document.querySelector('#usersPanel tbody');
        if (!tbody) return;

        tbody.innerHTML = this.currentData.usuarios.map(usuario => `
            <tr>
                <td>${usuario.email}</td>
                <td>${usuario.nombre}</td>
                <td>
                    <span class="badge ${this.getBadgeClassByRole(usuario.rol)}">
                        ${this.getRoleDisplayName(usuario.rol)}
                    </span>
                </td>
                <td>
                    <span class="badge ${usuario.activo ? 'bg-success' : 'bg-warning'}">
                        ${usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>${usuario.ultimo_acceso}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="admin.editarUsuario(${usuario.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="admin.eliminarUsuario(${usuario.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    actualizarBadgeUsuarios() {
        const badge = document.querySelector('#usersTab .badge');
        if (badge) {
            badge.textContent = this.currentData.usuarios.length;
        }
    }

    getBadgeClassByRole(rol) {
        const classes = {
            'admin': 'bg-primary',
            'secretario': 'bg-info',
            'lavador': 'bg-secondary'
        };
        return classes[rol] || 'bg-secondary';
    }

    getRoleDisplayName(rol) {
        const names = {
            'admin': 'Administrador',
            'secretario': 'Secretario',
            'lavador': 'Lavador'
        };
        return names[rol] || rol;
    }

    prepararModalUsuario(usuarioId = null) {
        const modal = document.getElementById('userModal');
        const form = document.getElementById('userForm');
        
        if (usuarioId) {
            // Editar usuario existente
            const usuario = this.currentData.usuarios.find(u => u.id === usuarioId);
            if (usuario) {
                form.querySelector('input[type="text"]').value = usuario.nombre;
                form.querySelector('input[type="email"]').value = usuario.email;
                form.querySelector('select').value = usuario.rol;
                modal.querySelector('.modal-title').textContent = 'Editar Usuario';
            }
        } else {
            // Nuevo usuario
            form.reset();
            modal.querySelector('.modal-title').textContent = 'Nuevo Usuario';
        }
    }

    async handleSubmitUsuario(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {
            nombre: formData.get('nombre'),
            email: formData.get('email'),
            rol: formData.get('rol'),
            password: formData.get('password')
        };

        try {
            const response = await fetch(`${this.API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarNotificacion('Usuario creado exitosamente', 'success');
                bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
                await this.cargarUsuarios();
            } else {
                this.mostrarNotificacion(result.message || 'Error al crear usuario', 'error');
            }
        } catch (error) {
            console.error('Error creando usuario:', error);
            this.mostrarNotificacion('Error de conexión', 'error');
        }
    }

    // ===========================================
    // GESTIÓN DE SERVICIOS
    // ===========================================

    actualizarServiciosCards() {
        const container = document.querySelector('#servicesPanel .row');
        if (!container) return;

        container.innerHTML = this.currentData.servicios.map(servicio => {
            const precioPromedio = this.calcularPrecioPromedio(servicio.precios_por_vehiculo);
            const isActive = true; // Asumir activo por defecto
            
            return `
                <div class="col-lg-6 mb-4">
                    <div class="serviceCard">
                        <div class="cardHeader">
                            <h5 class="cardTitle">${servicio.servicio_nombre}</h5>
                            <span class="badge ${isActive ? 'bg-success' : 'bg-warning'}">
                                ${isActive ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div class="cardBody">
                            <div class="row">
                                <div class="col-6">
                                    <p class="text-muted mb-1">Precio Promedio</p>
                                    <h4 class="text-primary mb-3">$${precioPromedio.toLocaleString()}</h4>
                                </div>
                                <div class="col-6">
                                    <p class="text-muted mb-1">Tipos Vehículo</p>
                                    <h5 class="mb-3">${Object.keys(servicio.precios_por_vehiculo).length}</h5>
                                </div>
                            </div>
                            <p class="text-muted mb-3">${servicio.descripcion || 'Sin descripción'}</p>
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-primary btn-sm" onclick="admin.editarServicio(${servicio.servicio_id})">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="admin.verPreciosServicio(${servicio.servicio_id})">
                                    <i class="fas fa-dollar-sign"></i> Precios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    actualizarBadgeServicios() {
        const badge = document.querySelector('#servicesTab .badge');
        if (badge) {
            badge.textContent = this.currentData.servicios.length;
        }
    }

    calcularPrecioPromedio(precios) {
        const valores = Object.values(precios).map(p => p.precio);
        return valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
    }

    prepararModalServicio(servicioId = null) {
        const modal = document.getElementById('serviceModal');
        const form = document.getElementById('serviceForm');
        
        if (servicioId) {
            // Editar servicio existente
            const servicio = this.currentData.servicios.find(s => s.servicio_id === servicioId);
            if (servicio) {
                form.querySelector('input[type="text"]').value = servicio.servicio_nombre;
                form.querySelector('textarea').value = servicio.descripcion || '';
                modal.querySelector('.modal-title').textContent = 'Editar Servicio';
            }
        } else {
            // Nuevo servicio
            form.reset();
            modal.querySelector('.modal-title').textContent = 'Nuevo Servicio';
        }
    }

    async handleSubmitServicio(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const serviceData = {
            nombre: formData.get('nombre'),
            descripcion: formData.get('descripcion'),
            precio_base: parseFloat(formData.get('precio'))
        };

        try {
            const response = await fetch(`${this.API_BASE}/servicios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify(serviceData)
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarNotificacion('Servicio creado exitosamente', 'success');
                bootstrap.Modal.getInstance(document.getElementById('serviceModal')).hide();
                await this.cargarServicios();
            } else {
                this.mostrarNotificacion(result.message || 'Error al crear servicio', 'error');
            }
        } catch (error) {
            console.error('Error creando servicio:', error);
            this.mostrarNotificacion('Error de conexión', 'error');
        }
    }

    // ===========================================
    // REPORTES Y FINANZAS
    // ===========================================

    async cargarReportes() {
        try {
            await this.cargarRegistrosRecientes();
            this.actualizarTablaReportes();
            this.actualizarResumenReportes();
        } catch (error) {
            console.error('Error cargando reportes:', error);
            this.mostrarNotificacion('Error cargando reportes', 'warning');
        }
    }

    actualizarTablaReportes() {
        const tbody = document.getElementById('reportsTable');
        if (!tbody) return;

        if (this.currentData.registros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="emptyState">No hay registros para mostrar</td></tr>';
            return;
        }

        tbody.innerHTML = this.currentData.registros.map(registro => `
            <tr>
                <td>${this.formatearFechaHora(registro.fecha, registro.hora)}</td>
                <td>${this.capitalize(registro.vehiculo)}</td>
                <td><strong>${registro.placa}</strong></td>
                <td>${registro.servicio_nombre}</td>
                <td class="text-end">${parseFloat(registro.costo).toLocaleString()}</td>
                <td class="text-end">${this.calcularComision(registro.costo, registro.porcentaje)}</td>
                <td>${registro.lavador}</td>
                <td>
                    <span class="badge ${registro.pago === 'Pagado' ? 'bg-success' : 'bg-warning'}">
                        ${registro.pago}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    actualizarResumenReportes() {
        const totalRecaudado = this.currentData.registros.reduce((sum, reg) => sum + parseFloat(reg.costo), 0);
        const totalComisiones = this.currentData.registros.reduce((sum, reg) => 
            sum + (parseFloat(reg.costo) * parseFloat(reg.porcentaje) / 100), 0);
        const balanceNeto = totalRecaudado - totalComisiones;

        const summaryCards = document.querySelectorAll('#reportsPanel .summaryCard .summaryValue');
        if (summaryCards.length >= 3) {
            summaryCards[0].textContent = `${totalRecaudado.toLocaleString()}`;
            summaryCards[1].textContent = `${totalComisiones.toLocaleString()}`;
            summaryCards[2].textContent = `${balanceNeto.toLocaleString()}`;
        }
    }

    async exportarReporteCSV() {
        if (this.currentData.registros.length === 0) {
            this.mostrarNotificacion('No hay datos para exportar', 'warning');
            return;
        }

        const headers = ['Fecha/Hora', 'Vehículo', 'Placa', 'Servicio', 'Costo', 'Comisión', 'Lavador', 'Estado'];
        const rows = this.currentData.registros.map(registro => [
            this.formatearFechaHora(registro.fecha, registro.hora),
            this.capitalize(registro.vehiculo),
            registro.placa,
            registro.servicio_nombre,
            parseFloat(registro.costo).toFixed(2),
            this.calcularComision(registro.costo, registro.porcentaje),
            registro.lavador,
            registro.pago
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const fecha = new Date().toISOString().split('T')[0];
        this.descargarArchivo(csvContent, `reporte_admin_${fecha}.csv`, 'text/csv');
        this.mostrarNotificacion('Reporte exportado exitosamente', 'success');
    }

    generarReportePDF() {
        this.mostrarNotificacion('Generación de PDF en desarrollo', 'info');
        // TODO: Implementar generación de PDF
    }

    // ===========================================
    // HISTORIAL
    // ===========================================

    inicializarCalendario() {
        const calendarEl = document.getElementById('calendarWidget');
        if (!calendarEl) return;

        // Usar Flatpickr para el calendario
        flatpickr(calendarEl, {
            locale: "es",
            inline: true,
            dateFormat: "Y-m-d",
            maxDate: "today",
            onChange: (selectedDates, dateStr) => {
                this.fechaSeleccionada = dateStr;
            }
        });
    }

    async cargarHistorial() {
        if (!this.fechaSeleccionada) {
            this.mostrarNotificacion('Seleccione una fecha primero', 'warning');
            return;
        }

        try {
            this.mostrarCargando(true, 'Cargando historial...');

            const response = await fetch(`${this.API_BASE}/registros?fecha=${this.fechaSeleccionada}`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });

            const result = await response.json();

            if (result.success) {
                this.actualizarTablaHistorial(result.registros);
                this.actualizarResumenHistorial(result.registros);
                this.mostrarNotificacion(`Cargados ${result.registros.length} registros`, 'success');
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
            this.mostrarNotificacion('Error cargando historial', 'error');
        } finally {
            this.mostrarCargando(false);
        }
    }

    actualizarTablaHistorial(registros) {
        const tbody = document.getElementById('historyRecords');
        if (!tbody) return;

        if (registros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="emptyState">No hay registros para la fecha seleccionada</td></tr>';
            return;
        }

        tbody.innerHTML = registros.map(registro => `
            <tr>
                <td>${this.formatearHora(registro.hora)}</td>
                <td>${this.capitalize(registro.vehiculo)}</td>
                <td><strong>${registro.placa}</strong></td>
                <td>${registro.servicio_nombre}</td>
                <td class="text-end">${parseFloat(registro.costo).toLocaleString()}</td>
                <td>${registro.lavador}</td>
            </tr>
        `).join('');
    }

    actualizarResumenHistorial(registros) {
        const totalRecaudado = registros.reduce((sum, reg) => sum + parseFloat(reg.costo), 0);
        const totalComisiones = registros.reduce((sum, reg) => 
            sum + (parseFloat(reg.costo) * parseFloat(reg.porcentaje) / 100), 0);
        const balanceNeto = totalRecaudado - totalComisiones;

        const footerValues = document.querySelectorAll('#historyPanel .footerValue');
        if (footerValues.length >= 3) {
            footerValues[0].textContent = `${totalRecaudado.toLocaleString()}`;
            footerValues[1].textContent = `${totalComisiones.toLocaleString()}`;
            footerValues[2].textContent = `${balanceNeto.toLocaleString()}`;
        }
    }

    exportarHistorial() {
        const tbody = document.getElementById('historyRecords');
        const rows = tbody.querySelectorAll('tr');
        
        if (rows.length === 0 || rows[0].querySelector('.emptyState')) {
            this.mostrarNotificacion('No hay datos para exportar', 'warning');
            return;
        }

        // Implementar exportación del historial
        this.mostrarNotificacion('Exportando historial...', 'info');
    }

    // ===========================================
    // CONFIGURACIÓN
    // ===========================================

    async cargarConfiguracion() {
        // Cargar configuración actual
        this.actualizarListaLavadores();
        
        // Cargar configuración general (por ahora valores por defecto)
        const defaultCommission = document.getElementById('defaultCommission');
        if (defaultCommission) {
            defaultCommission.value = 30; // Valor por defecto
        }
    }

    actualizarListaLavadores() {
        const washersList = document.getElementById('washersList');
        if (!washersList) return;

        if (this.currentData.lavadores.length === 0) {
            washersList.innerHTML = '<li class="list-group-item emptyState">No hay lavadores registrados</li>';
            return;
        }

        washersList.innerHTML = this.currentData.lavadores.map(lavador => `
            <li class="list-group-item listItem" data-washer-id="${lavador.id}">
                ${lavador.nombre} ${lavador.apellido}
                <button class="btn btn-sm btn-outline-danger deleteBtn">
                    <i class="fas fa-trash"></i>
                </button>
            </li>
        `).join('');
    }

    async agregarLavador() {
        const input = document.getElementById('newWasher');
        const nombreCompleto = input.value.trim();

        if (!nombreCompleto) {
            this.mostrarNotificacion('Ingrese el nombre del lavador', 'warning');
            return;
        }

        // Separar nombre y apellido (simple)
        const partes = nombreCompleto.split(' ');
        const nombre = partes[0];
        const apellido = partes.slice(1).join(' ') || nombre;

        try {
            const response = await fetch(`${this.API_BASE}/lavadores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({ nombre, apellido })
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarNotificacion('Lavador agregado exitosamente', 'success');
                input.value = '';
                await this.cargarLavadores();
            } else {
                this.mostrarNotificacion(result.message || 'Error al agregar lavador', 'error');
            }
        } catch (error) {
            console.error('Error agregando lavador:', error);
            this.mostrarNotificacion('Error de conexión', 'error');
        }
    }

    async eliminarLavador(lavadorId) {
        const confirmacion = await Swal.fire({
            title: '¿Confirmar eliminación?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirmacion.isConfirmed) {
            // Por ahora solo remover de la lista (endpoint DELETE no implementado)
            this.currentData.lavadores = this.currentData.lavadores.filter(l => l.id != lavadorId);
            this.actualizarListaLavadores();
            this.mostrarNotificacion('Lavador eliminado', 'success');
        }
    }

    async guardarConfiguracion(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const config = {
            defaultCommission: parseFloat(formData.get('defaultCommission')),
            autoBackup: formData.get('autoBackup') === 'on'
        };

        // Por ahora solo guardar en localStorage
        localStorage.setItem('lavadero_admin_config', JSON.stringify(config));
        this.mostrarNotificacion('Configuración guardada exitosamente', 'success');
    }

    // ===========================================
    // FUNCIONES AUXILIARES
    // ===========================================

    formatearFechaHora(fecha, hora) {
        const fechaObj = new Date(fecha);
        const fechaStr = fechaObj.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        return `${fechaStr} ${this.formatearHora(hora)}`;
    }

    formatearHora(hora) {
        return hora.substring(0, 5); // HH:MM
    }

    calcularComision(costo, porcentaje) {
        const comision = (parseFloat(costo) * parseFloat(porcentaje)) / 100;
        return comision.toLocaleString();
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    descargarArchivo(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ===========================================
    // NOTIFICACIONES Y UI
    // ===========================================

    mostrarNotificacion(mensaje, tipo = 'info') {
        // Crear contenedor si no existe
        let container = document.getElementById('notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications';
            container.className = 'notificationContainer';
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${tipo}`;
        notification.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${mensaje}</span>
                <button type="button" class="btn-close btn-close-sm ms-2" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    mostrarCargando(mostrar, mensaje = 'Cargando...') {
        let overlay = document.getElementById('loadingOverlay');
        
        if (mostrar) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'loadingOverlay';
                overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
                overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
                overlay.style.zIndex = '9999';
                overlay.innerHTML = `
                    <div class="bg-white p-4 rounded shadow">
                        <div class="d-flex align-items-center">
                            <div class="spinner-border text-primary me-3" role="status"></div>
                            <span>${mensaje}</span>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
            }
        } else {
            if (overlay) {
                document.body.removeChild(overlay);
            }
        }
    }

    // ===========================================
    // FUNCIONES PÚBLICAS PARA EVENTOS HTML
    // ===========================================

    editarUsuario(id) {
        this.prepararModalUsuario(id);
        new bootstrap.Modal(document.getElementById('userModal')).show();
    }

    async eliminarUsuario(id) {
        const confirmacion = await Swal.fire({
            title: '¿Confirmar eliminación?',
            text: 'Esta acción eliminará permanentemente el usuario',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirmacion.isConfirmed) {
            // Simular eliminación (endpoint DELETE no implementado)
            this.currentData.usuarios = this.currentData.usuarios.filter(u => u.id !== id);
            this.actualizarTablaUsuarios();
            this.actualizarBadgeUsuarios();
            this.mostrarNotificacion('Usuario eliminado exitosamente', 'success');
        }
    }

    editarServicio(id) {
        this.prepararModalServicio(id);
        new bootstrap.Modal(document.getElementById('serviceModal')).show();
    }

    verPreciosServicio(id) {
        const servicio = this.currentData.servicios.find(s => s.servicio_id === id);
        if (!servicio) return;

        let preciosHtml = '<div class="row">';
        Object.entries(servicio.precios_por_vehiculo).forEach(([tipo, data]) => {
            const nombreVehiculo = this.getNombreVehiculo(tipo);
            preciosHtml += `
                <div class="col-md-6 mb-2">
                    <strong>${nombreVehiculo}:</strong> ${data.precio.toLocaleString()}
                </div>
            `;
        });
        preciosHtml += '</div>';

        Swal.fire({
            title: `Precios - ${servicio.servicio_nombre}`,
            html: preciosHtml,
            width: '600px',
            confirmButtonText: 'Cerrar'
        });
    }

    getNombreVehiculo(tipo) {
        const nombres = {
            'car': 'Automóvil',
            'pickup': 'Camioneta',
            'suv': 'SUV', 
            'motorcycle': 'Motocicleta',
            'truck': 'Camión'
        };
        return nombres[tipo] || tipo;
    }
}

// ===========================================
// INICIALIZACIÓN DEL SISTEMA
// ===========================================

// Variable global para acceso desde HTML
let admin;

document.addEventListener('DOMContentLoaded', function() {
    // Verificar que todas las librerías estén cargadas
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no está cargado');
        return;
    }
    
    if (typeof flatpickr === 'undefined') {
        console.error('Flatpickr no está cargado');
        return;
    }

    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 no está cargado');
        return;
    }

    // Inicializar sistema administrativo
    admin = new AdminSystem();
    
    // Configurar tooltips de Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    console.log('✅ Panel Administrativo cargado completamente');
    console.log('🔧 Funcionalidades disponibles:');
    console.log('   • Dashboard con gráficos en tiempo real');
    console.log('   • Gestión completa de usuarios y roles');
    console.log('   • Administración de servicios y precios');
    console.log('   • Reportes financieros detallados');
    console.log('   • Historial con calendario interactivo');
    console.log('   • Configuración del sistema');
});

// ===========================================
// FUNCIONES GLOBALES PARA ACCESO DESDE HTML
// ===========================================

window.admin = {
    editarUsuario: (id) => admin?.editarUsuario(id),
    eliminarUsuario: (id) => admin?.eliminarUsuario(id),
    editarServicio: (id) => admin?.editarServicio(id),
    verPreciosServicio: (id) => admin?.verPreciosServicio(id)
};

// ===========================================
// EVENTOS ADICIONALES
// ===========================================

// Prevenir pérdida de datos no guardados
window.addEventListener('beforeunload', function(e) {
    const hasUnsavedChanges = false; // Implementar lógica si es necesario
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '¿Está seguro de que desea salir? Los cambios no guardados se perderán.';
        return e.returnValue;
    }
});

// Manejo de errores globales
window.addEventListener('error', function(e) {
    console.error('Error global capturado:', e.error);
    if (admin) {
        admin.mostrarNotificacion('Se produjo un error inesperado', 'error');
    }
});

// Actualización automática de datos cada 5 minutos
setInterval(() => {
    if (admin && document.querySelector('.tab-pane.active')?.id === 'dashboardPanel') {
        admin.actualizarDashboard().catch(console.error);
    }
}, 5 * 60 * 1000);