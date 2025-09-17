/**
 * Sistema de Gestión para Secretario - Lavadero de Autos
 * Basado en planilla física diaria
 */

class SecretarioSystem {
    constructor() {
        this.API_BASE = 'http://localhost:3000/api';
        this.user = this.getCurrentUser();
        this.lavadores = [];
        this.servicios = [];
        this.registrosHoy = [];
        
        this.init();
    }

    async init() {
        try {
            this.verificarAutenticacion();
            this.configurarEventListeners();
            this.inicializarDateTime();
            await this.cargarDatosIniciales();
            await this.cargarRegistrosDelDia();
            console.log('✅ Sistema Secretario inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando sistema:', error);
            this.mostrarNotificacion('Error al inicializar el sistema', 'danger');
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
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Actualizar nombre en navbar
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = this.user.nombre;
        }
    }

    configurarEventListeners() {
        // Formulario principal
        document.getElementById('serviceForm').addEventListener('submit', (e) => this.handleSubmitServicio(e));
        
        // Servicios rápidos
        document.querySelectorAll('.serviceQuickCard').forEach(card => {
            card.addEventListener('click', () => this.seleccionarServicioRapido(card));
        });

        // Búsqueda
        document.getElementById('searchBtn').addEventListener('click', () => this.buscarRegistros());
        
        // Exportaciones
        document.getElementById('exportDailyBtn').addEventListener('click', () => this.exportarReporteDiario());
        document.getElementById('printDailyBtn').addEventListener('click', () => this.imprimirReporte());
        document.getElementById('exportSearchBtn').addEventListener('click', () => this.exportarBusqueda());
        
        // Auto-completar placa en mayúsculas
        document.getElementById('licensePlate').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Actualizar comisión automáticamente
        document.getElementById('serviceCost').addEventListener('input', () => this.calcularComision());
        document.getElementById('commissionPercent').addEventListener('input', () => this.calcularComision());

        // AGREGAR: Validación en tiempo real para combinación servicio-vehículo
        document.getElementById('serviceType').addEventListener('change', (e) => {
            this.actualizarPrecioPorVehiculo();
            this.validarCombinacionServicioVehiculo();
        });
        
        document.getElementById('vehicleType').addEventListener('change', (e) => {
            this.actualizarPrecioPorVehiculo();
            this.validarCombinacionServicioVehiculo();
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
        
        document.getElementById('currentDate').textContent = now.toLocaleDateString('es-ES', dateOptions);
        document.getElementById('currentTime').textContent = now.toLocaleTimeString('es-ES', timeOptions);
        
        document.getElementById('serviceDate').value = now.toLocaleDateString('es-ES');
        document.getElementById('serviceTime').value = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // ===========================================
    // CARGA DE DATOS DESDE LA BASE DE DATOS
    // ===========================================

    async cargarDatosIniciales() {
        await Promise.all([
            this.cargarServicios(),
            this.cargarLavadores()
        ]);
    }

    async cargarServicios() {
    try {
        const response = await fetch(`${this.API_BASE}/servicios/populares`, {
            headers: { 'Authorization': `Bearer ${this.user.token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            this.serviciosConPrecios = result.servicios_populares;
            this.llenarSelectServicios();
            this.actualizarServiciosRapidos();
            console.log('✅ Servicios cargados:', this.serviciosConPrecios.length);
        }
    } catch (error) {
        console.error('Error cargando servicios:', error);
        this.mostrarNotificacion('Error cargando servicios', 'warning');
    }
}

    async cargarLavadores() {
        try {
            const response = await fetch(`${this.API_BASE}/lavadores`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.lavadores = result.lavadores;
                this.llenarSelectLavadores();
            }
        } catch (error) {
            console.error('Error cargando lavadores:', error);
            // Fallback a lavadores por defecto
            this.lavadores = [
                { id: 1, nombre: 'Carlos', apellido: 'Rodríguez' },
                { id: 2, nombre: 'Miguel', apellido: 'Sánchez' },
                { id: 3, nombre: 'Ana', apellido: 'Gómez' },
                { id: 4, nombre: 'Juan', apellido: 'Pérez' }
            ];
            this.llenarSelectLavadores();
        }
    }

    // 2. LLENAR SELECT SERVICIOS - Modificado para precios variables
    llenarSelectServicios() {
        const select = document.getElementById('serviceType');
        select.innerHTML = '<option value="" selected disabled>Seleccione el servicio</option>';
        
        // Agrupar servicios únicos (sin importar tipo de vehículo)
        const serviciosUnicos = {};
        this.serviciosConPrecios.forEach(servicio => {
            if (!serviciosUnicos[servicio.id]) {
                serviciosUnicos[servicio.id] = {
                    id: servicio.id,
                    nombre: servicio.nombre,
                    descripcion: servicio.descripcion || ''
                };
            }
        });
        
        Object.values(serviciosUnicos).forEach(servicio => {
            const option = document.createElement('option');
            option.value = servicio.id;
            option.textContent = servicio.nombre;
            if (servicio.descripcion) {
                option.title = servicio.descripcion;
            }
            select.appendChild(option);
        });

        // Eventos para actualizar precio automáticamente
        select.addEventListener('change', () => this.actualizarPrecioPorVehiculo());
        
        const vehicleSelect = document.getElementById('vehicleType');
        vehicleSelect.addEventListener('change', () => this.actualizarPrecioPorVehiculo());
    }

    // 3. NUEVA FUNCIÓN - Actualizar precio según vehículo seleccionado
    actualizarPrecioPorVehiculo() {
        const servicioId = document.getElementById('serviceType').value;
        const tipoVehiculo = document.getElementById('vehicleType').value;
        
        if (servicioId && tipoVehiculo) {
            const servicioEncontrado = this.serviciosConPrecios.find(
                s => s.id == servicioId && s.tipo_vehiculo === tipoVehiculo
            );
            
            if (servicioEncontrado) {
                document.getElementById('serviceCost').value = servicioEncontrado.precio;
                this.calcularComision();
                
                // Marcar campo como válido
                document.getElementById('serviceCost').classList.add('is-valid');
                document.getElementById('serviceCost').classList.remove('is-invalid');
            } else {
                // Si no hay precio para esa combinación, limpiar y notificar
                document.getElementById('serviceCost').value = '';
                this.mostrarNotificacion(
                    `No hay precio definido para ${this.getNombreVehiculo(tipoVehiculo)} en este servicio`, 
                    'warning'
                );
            }
        }
    }

    
    llenarSelectLavadores() {
        const select = document.getElementById('washerSelect');
        select.innerHTML = '<option value="" selected disabled>Seleccione el lavador</option>';
        
        this.lavadores.forEach(lavador => {
            const option = document.createElement('option');
            option.value = lavador.id;
            option.textContent = `${lavador.nombre} ${lavador.apellido}`;
            select.appendChild(option);
        });
    }

    // 4. ACTUALIZAR SERVICIOS RÁPIDOS - Completamente reescrita
    actualizarServiciosRapidos() {
        const container = document.getElementById('quickServicesContainer');
        
        if (!this.serviciosConPrecios || this.serviciosConPrecios.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="fas fa-tools fa-2x text-muted mb-2"></i>
                        <p class="text-muted">No hay servicios disponibles</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Obtener servicios únicos más populares (primero por uso, luego alfabético)
        const serviciosUnicos = {};
        this.serviciosConPrecios.forEach(servicio => {
            if (!serviciosUnicos[servicio.id] || 
                serviciosUnicos[servicio.id].veces_usado < servicio.veces_usado) {
                serviciosUnicos[servicio.id] = servicio;
            }
        });
        
        const serviciosPopulares = Object.values(serviciosUnicos)
            .sort((a, b) => b.veces_usado - a.veces_usado || a.nombre.localeCompare(b.nombre))
            .slice(0, 4);
        
        // Obtener precio por defecto (para automóvil) de cada servicio
        const serviciosConPrecioDefault = serviciosPopulares.map(servicio => {
            const precioAutomovil = this.serviciosConPrecios.find(
                s => s.id === servicio.id && s.tipo_vehiculo === 'car'
            );
            return {
                ...servicio,
                precio_default: precioAutomovil ? precioAutomovil.precio : null
            };
        });
        
        container.innerHTML = serviciosConPrecioDefault.map(servicio => `
            <div class="col-lg-3 col-md-6 mb-3">
                <div class="serviceQuickCard" data-service-id="${servicio.id}" 
                    title="${servicio.descripcion || servicio.nombre}">
                    <div class="serviceIcon">
                        <i class="fas ${this.getIconoServicio(servicio.nombre)}"></i>
                    </div>
                    <h6>${servicio.nombre}</h6>
                    <p class="servicePrice">
                        ${servicio.precio_default 
                            ? `$${parseFloat(servicio.precio_default).toLocaleString()}` 
                            : 'Precio variable'
                        }
                    </p>
                    <small class="text-muted">
                        ${servicio.precio_default ? 'Automóvil' : 'Según vehículo'}
                    </small>
                </div>
            </div>
        `).join('');
        
        // Agregar eventos a las nuevas tarjetas
        container.querySelectorAll('.serviceQuickCard').forEach(card => {
            card.addEventListener('click', () => this.seleccionarServicioRapido(card));
        });
    }

    // Nueva función de validación en tiempo real
    validarCombinacionServicioVehiculo() {
        const servicioId = document.getElementById('serviceType').value;
        const tipoVehiculo = document.getElementById('vehicleType').value;
        const costField = document.getElementById('serviceCost');
        
        if (servicioId && tipoVehiculo) {
            const combinacionValida = this.serviciosConPrecios.some(
                s => s.id == servicioId && s.tipo_vehiculo === tipoVehiculo
            );
            
            if (!combinacionValida) {
                costField.value = '';
                costField.classList.add('is-invalid');
                costField.classList.remove('is-valid');
                
                // Mostrar mensaje de ayuda
                const helpText = costField.parentElement.querySelector('.invalid-feedback') || 
                            document.createElement('div');
                helpText.className = 'invalid-feedback';
                helpText.textContent = 'No hay precio definido para esta combinación servicio-vehículo';
                
                if (!costField.parentElement.querySelector('.invalid-feedback')) {
                    costField.parentElement.appendChild(helpText);
                }
            }
        }
    }
    // ===========================================
    // GESTIÓN DE SERVICIOS RÁPIDOS
    // ===========================================

    // 5. SELECCIONAR SERVICIO RÁPIDO - Modificado
seleccionarServicioRapido(card) {
    // Remover selección anterior
    document.querySelectorAll('.serviceQuickCard').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    
    const serviceId = card.dataset.serviceId;
    document.getElementById('serviceType').value = serviceId;
    
    // Trigger evento change para actualizar precio
    document.getElementById('serviceType').dispatchEvent(new Event('change'));
    
    // Actualizar precio si ya hay vehículo seleccionado
    this.actualizarPrecioPorVehiculo();
}

    calcularComision() {
        const costo = parseFloat(document.getElementById('serviceCost').value) || 0;
        const porcentaje = parseFloat(document.getElementById('commissionPercent').value) || 0;
        const comision = (costo * porcentaje) / 100;
        
        // Mostrar comisión calculada (opcional)
        const comisionDisplay = document.getElementById('commissionDisplay');
        if (comisionDisplay) {
            comisionDisplay.textContent = `Comisión: $${comision.toFixed(2)}`;
        }
    }

    // ===========================================
    // REGISTRO DE SERVICIOS
    // ===========================================

    async handleSubmitServicio(e) {
        e.preventDefault();
        
        if (!this.validarFormulario()) {
            return;
        }

        const formData = this.recopilarDatosFormulario();
        
        try {
            this.mostrarCargando(true);
            
            const response = await fetch(`${this.API_BASE}/registros`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarNotificacion('Servicio registrado correctamente', 'success');
                this.limpiarFormulario();
                await this.cargarRegistrosDelDia();
                this.reproducirSonidoExito();
            } else {
                this.mostrarNotificacion(result.message || 'Error al registrar el servicio', 'danger');
            }
            
        } catch (error) {
            console.error('Error registrando servicio:', error);
            this.mostrarNotificacion('Error de conexión. Intente nuevamente.', 'danger');
        } finally {
            this.mostrarCargando(false);
        }
    }

    // 6. VALIDACIÓN MEJORADA - Con validación de vehículo y servicio
    validarFormulario() {
        const campos = [
            { id: 'vehicleType', nombre: 'Tipo de vehículo' },
            { id: 'licensePlate', nombre: 'Placa' },
            { id: 'serviceType', nombre: 'Servicio' },
            { id: 'serviceCost', nombre: 'Costo' },
            { id: 'washerSelect', nombre: 'Lavador' },
            { id: 'commissionPercent', nombre: 'Porcentaje de comisión' }
        ];

        let esValido = true;
        const errores = [];

        campos.forEach(campo => {
            const elemento = document.getElementById(campo.id);
            const valor = elemento.value.trim();

            if (!valor || (campo.id === 'serviceCost' && parseFloat(valor) <= 0)) {
                this.marcarCampoInvalido(elemento);
                errores.push(campo.nombre);
                esValido = false;
            } else {
                this.marcarCampoValido(elemento);
            }
        });

        // Validación especial para placa
        const placa = document.getElementById('licensePlate').value.trim();
        if (placa && placa.length < 3) {
            this.marcarCampoInvalido(document.getElementById('licensePlate'));
            errores.push('Placa (mínimo 3 caracteres)');
            esValido = false;
        }

        // NUEVA VALIDACIÓN: Verificar que existe precio para la combinación servicio-vehículo
        const servicioId = document.getElementById('serviceType').value;
        const tipoVehiculo = document.getElementById('vehicleType').value;
        
        if (servicioId && tipoVehiculo) {
            const combinacionValida = this.serviciosConPrecios.some(
                s => s.id == servicioId && s.tipo_vehiculo === tipoVehiculo
            );
            
            if (!combinacionValida) {
                errores.push('Combinación servicio-vehículo no disponible');
                esValido = false;
            }
        }

        if (!esValido) {
            const mensajeError = errores.length === 1 
                ? `Por favor, complete: ${errores[0]}`
                : `Por favor, complete los siguientes campos: ${errores.join(', ')}`;
            
            this.mostrarNotificacion(mensajeError, 'warning');
        }

        return esValido;
    }

    recopilarDatosFormulario() {
        const costo = parseFloat(document.getElementById('serviceCost').value);
        const porcentaje = parseFloat(document.getElementById('commissionPercent').value);
        
        return {
            vehiculo: document.getElementById('vehicleType').value,
            placa: document.getElementById('licensePlate').value.toUpperCase(),
            id_servicio: parseInt(document.getElementById('serviceType').value),
            costo: costo,
            porcentaje: porcentaje,
            lavador: this.obtenerNombreLavador(document.getElementById('washerSelect').value),
            observaciones: document.getElementById('serviceNotes').value || null,
            pago: document.getElementById('paymentCompleted').checked ? 'Pagado' : 'Pendiente'
        };
    }

    obtenerNombreLavador(lavadorId) {
        const lavador = this.lavadores.find(l => l.id == lavadorId);
        return lavador ? `${lavador.nombre} ${lavador.apellido}` : '';
    }

    marcarCampoInvalido(campo) {
        campo.classList.remove('is-valid');
        campo.classList.add('is-invalid');
    }

    marcarCampoValido(campo) {
        campo.classList.remove('is-invalid');
        campo.classList.add('is-valid');
    }

    limpiarFormulario() {
        document.getElementById('serviceForm').reset();
        document.querySelectorAll('.serviceQuickCard').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.is-valid, .is-invalid').forEach(campo => {
            campo.classList.remove('is-valid', 'is-invalid');
        });
        
        // Restablecer valores por defecto
        this.actualizarDateTime();
        document.getElementById('commissionPercent').value = '30';
    }

    // ===========================================
    // FUNCIONES AUXILIARES NUEVAS
    // ===========================================

    // Obtener nombre legible del vehículo
    getNombreVehiculo(tipoVehiculo) {
        const nombres = {
            'car': 'Automóvil',
            'pickup': 'Camioneta',
            'suv': 'SUV',
            'motorcycle': 'Motocicleta',
            'truck': 'Camión'
        };
        return nombres[tipoVehiculo] || tipoVehiculo;
    }

    // Obtener icono apropiado según el nombre del servicio
    getIconoServicio(nombreServicio) {
        const nombre = nombreServicio.toLowerCase();
        
        if (nombre.includes('lavado')) return 'fa-soap';
        if (nombre.includes('aspirado')) return 'fa-wind';
        if (nombre.includes('encerado') || nombre.includes('cera')) return 'fa-star';
        if (nombre.includes('motor')) return 'fa-cog';
        if (nombre.includes('completo') || nombre.includes('integral')) return 'fa-check-circle';
        if (nombre.includes('básico')) return 'fa-circle';
        
        return 'fa-tools'; // Icono por defecto
    }
    
    // ===========================================
    // GESTIÓN DE REGISTROS DEL DÍA
    // ===========================================

    async cargarRegistrosDelDia() {
        try {
            const hoy = new Date().toISOString().split('T')[0];
            
            const response = await fetch(`${this.API_BASE}/registros?fecha=${hoy}`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });

            const result = await response.json();

            if (result.success) {
                this.registrosHoy = result.registros;
                this.actualizarTablaDiaria();
                this.actualizarResumenDiario();
                this.actualizarEstadisticas();
            }
        } catch (error) {
            console.error('Error cargando registros del día:', error);
            this.mostrarNotificacion('Error cargando registros del día', 'warning');
        }
    }

    actualizarTablaDiaria() {
        const tbody = document.getElementById('dailyRecords');
        
        if (this.registrosHoy.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="emptyState">No hay registros para el día de hoy</td></tr>';
            return;
        }

        tbody.innerHTML = this.registrosHoy.map((registro, index) => `
            <tr>
                <td>${this.formatearHora(registro.hora)}</td>
                <td>${this.capitalize(registro.vehiculo)}</td>
                <td><strong>${registro.placa}</strong></td>
                <td>${registro.servicio_nombre}</td>
                <td class="text-end">$${parseFloat(registro.costo).toLocaleString()}</td>
                <td class="text-end">$${this.calcularComisionDisplay(registro.costo, registro.porcentaje)}</td>
                <td>${registro.lavador}</td>
                <td>
                    <span class="badge ${registro.pago === 'Pagado' ? 'badge-paid' : 'badge-pending'}">
                        ${registro.pago}
                    </span>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="secretario.editarRegistro(${registro.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="secretario.eliminarRegistro(${registro.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Actualizar badge del tab
        const badge = document.querySelector('#reportsTab .badge');
        if (badge) {
            badge.textContent = this.registrosHoy.length;
        }
    }

    actualizarResumenDiario() {
        const totalIngresos = this.registrosHoy.reduce((sum, reg) => sum + parseFloat(reg.costo), 0);
        const totalComisiones = this.registrosHoy.reduce((sum, reg) => sum + (parseFloat(reg.costo) * parseFloat(reg.porcentaje) / 100), 0);
        const balanceNeto = totalIngresos - totalComisiones;
        const totalServicios = this.registrosHoy.length;

        document.getElementById('dailyRevenue').textContent = `$${totalIngresos.toLocaleString()}`;
        document.getElementById('dailyCommissions').textContent = `$${totalComisiones.toLocaleString()}`;
        document.getElementById('dailyNet').textContent = `$${balanceNeto.toLocaleString()}`;
        document.getElementById('dailyServices').textContent = totalServicios;
    }

    actualizarEstadisticas() {
        this.actualizarEstadisticasLavadores();
        this.actualizarEstadisticasServicios();
    }

    actualizarEstadisticasLavadores() {
        const estadisticas = {};
        let maxIngresos = 0;

        // Calcular estadísticas por lavador
        this.registrosHoy.forEach(registro => {
            const lavador = registro.lavador;
            if (!estadisticas[lavador]) {
                estadisticas[lavador] = { ingresos: 0, servicios: 0 };
            }
            estadisticas[lavador].ingresos += parseFloat(registro.costo);
            estadisticas[lavador].servicios += 1;
            
            if (estadisticas[lavador].ingresos > maxIngresos) {
                maxIngresos = estadisticas[lavador].ingresos;
            }
        });

        // Actualizar interfaz
        const container = document.getElementById('washerStats');
        if (container) {
            const lavadoresDefault = ['Carlos Rodríguez', 'Miguel Sánchez', 'Ana Gómez', 'Juan Pérez'];
            
            container.innerHTML = lavadoresDefault.map(lavador => {
                const stats = estadisticas[lavador] || { ingresos: 0, servicios: 0 };
                const porcentaje = maxIngresos > 0 ? (stats.ingresos / maxIngresos) * 100 : 0;
                
                return `
                    <div class="washer-item">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="washer-name">${lavador}</span>
                            <span class="washer-earnings">$${stats.ingresos.toLocaleString()} (${stats.servicios})</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar bg-primary" style="width: ${porcentaje}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    actualizarEstadisticasServicios() {
        const estadisticas = {};
        let maxServicios = 0;

        // Calcular estadísticas por servicio
        this.registrosHoy.forEach(registro => {
            const servicio = registro.servicio_nombre;
            if (!estadisticas[servicio]) {
                estadisticas[servicio] = 0;
            }
            estadisticas[servicio]++;
            
            if (estadisticas[servicio] > maxServicios) {
                maxServicios = estadisticas[servicio];
            }
        });

        // Actualizar interfaz
        const container = document.getElementById('serviceStats');
        if (container) {
            const serviciosOrdenados = Object.entries(estadisticas)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3); // Top 3 servicios

            if (serviciosOrdenados.length === 0) {
                container.innerHTML = '<p class="text-muted">No hay servicios registrados hoy</p>';
                return;
            }

            container.innerHTML = serviciosOrdenados.map(([servicio, cantidad]) => {
                const porcentaje = maxServicios > 0 ? (cantidad / maxServicios) * 100 : 0;
                
                return `
                    <div class="service-item">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="service-name">${servicio}</span>
                            <span class="service-count">${cantidad} servicio${cantidad !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar bg-success" style="width: ${porcentaje}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // ===========================================
    // BÚSQUEDA DE REGISTROS
    // ===========================================

    async buscarRegistros() {
        const filtros = {
            placa: document.getElementById('searchPlate').value.trim().toUpperCase(),
            fecha: document.getElementById('searchDate').value,
            servicio: document.getElementById('searchService').value
        };

        // Validar que al menos un filtro esté presente
        if (!filtros.placa && !filtros.fecha && !filtros.servicio) {
            this.mostrarNotificacion('Ingrese al menos un criterio de búsqueda', 'warning');
            return;
        }

        try {
            this.mostrarCargando(true, 'Buscando registros...');

            const params = new URLSearchParams();
            if (filtros.placa) params.append('placa', filtros.placa);
            if (filtros.fecha) params.append('fecha', filtros.fecha);
            if (filtros.servicio) params.append('servicio', filtros.servicio);

            const response = await fetch(`${this.API_BASE}/registros/buscar?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarResultadosBusqueda(result.registros);
                this.mostrarNotificacion(`Se encontraron ${result.registros.length} registros`, 'info');
            } else {
                this.mostrarNotificacion(result.message || 'Error en la búsqueda', 'danger');
            }

        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.mostrarNotificacion('Error de conexión durante la búsqueda', 'danger');
        } finally {
            this.mostrarCargando(false);
        }
    }

    mostrarResultadosBusqueda(registros) {
        const tbody = document.getElementById('searchResults');
        
        if (registros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="emptyState">No se encontraron registros con los criterios especificados</td></tr>';
            return;
        }

        tbody.innerHTML = registros.map(registro => `
            <tr>
                <td>${this.formatearFechaHora(registro.fecha, registro.hora)}</td>
                <td><strong>${registro.placa}</strong></td>
                <td>${this.capitalize(registro.vehiculo)}</td>
                <td>${registro.servicio_nombre}</td>
                <td class="text-end">$${parseFloat(registro.costo).toLocaleString()}</td>
                <td>${registro.lavador}</td>
                <td>
                    <span class="badge ${registro.pago === 'Pagado' ? 'badge-paid' : 'badge-pending'}">
                        ${registro.pago}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="secretario.verDetallesRegistro(${registro.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // ===========================================
    // FUNCIONES DE UTILIDAD
    // ===========================================

    formatearHora(hora) {
        return hora.substring(0, 5); // HH:MM
    }

    formatearFechaHora(fecha, hora) {
        const fechaObj = new Date(fecha);
        const fechaStr = fechaObj.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        return `${fechaStr} ${this.formatearHora(hora)}`;
    }

    calcularComisionDisplay(costo, porcentaje) {
        const comision = (parseFloat(costo) * parseFloat(porcentaje)) / 100;
        return comision.toLocaleString();
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // ===========================================
    // EXPORTACIÓN Y REPORTES
    // ===========================================

    exportarReporteDiario() {
        if (this.registrosHoy.length === 0) {
            this.mostrarNotificacion('No hay registros para exportar', 'warning');
            return;
        }

        const csvContent = this.generarCSVDiario();
        const fecha = new Date().toISOString().split('T')[0];
        this.descargarArchivo(csvContent, `reporte_diario_${fecha}.csv`, 'text/csv');
        
        this.mostrarNotificacion('Reporte exportado correctamente', 'success');
    }

    generarCSVDiario() {
        const headers = ['Hora', 'Vehículo', 'Placa', 'Servicio', 'Costo', 'Comisión', 'Lavador', 'Estado', 'Observaciones'];
        
        const rows = this.registrosHoy.map(registro => [
            this.formatearHora(registro.hora),
            registro.vehiculo,
            registro.placa,
            registro.servicio_nombre,
            parseFloat(registro.costo).toFixed(2),
            this.calcularComisionDisplay(registro.costo, registro.porcentaje),
            registro.lavador,
            registro.pago,
            registro.observaciones || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    imprimirReporte() {
        window.print();
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

    mostrarNotificacion(mensaje, tipo) {
        const container = document.getElementById('notifications');
        
        const alert = document.createElement('div');
        alert.classList.add('alert', `alert-${tipo}`, 'alert-dismissible', 'fade', 'show', 'alertFloating');
        alert.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        container.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => {
                if (container.contains(alert)) {
                    container.removeChild(alert);
                }
            }, 150);
        }, 4000);
    }

    mostrarCargando(mostrar, mensaje = 'Cargando...') {
        const overlay = document.getElementById('loadingOverlay');
        if (mostrar) {
            if (!overlay) {
                const div = document.createElement('div');
                div.id = 'loadingOverlay';
                div.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
                div.style.backgroundColor = 'rgba(0,0,0,0.5)';
                div.style.zIndex = '9999';
                div.innerHTML = `
                    <div class="bg-white p-4 rounded shadow">
                        <div class="d-flex align-items-center">
                            <div class="spinner-border me-3" role="status"></div>
                            <span>${mensaje}</span>
                        </div>
                    </div>
                `;
                document.body.appendChild(div);
            }
        } else {
            if (overlay) {
                document.body.removeChild(overlay);
            }
        }
    }

    reproducirSonidoExito() {
        // Crear sonido simple de éxito
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            // Silenciar errores de audio
        }
    }

    // ===========================================
    // ACCIONES SOBRE REGISTROS
    // ===========================================

    async editarRegistro(id) {
        try {
            const response = await fetch(`${this.API_BASE}/registros/${id}`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarModalEdicion(result.registro);
            } else {
                this.mostrarNotificacion('Error al cargar el registro', 'danger');
            }
        } catch (error) {
            console.error('Error cargando registro:', error);
            this.mostrarNotificacion('Error de conexión', 'danger');
        }
    }

    async eliminarRegistro(id) {
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
            try {
                const response = await fetch(`${this.API_BASE}/registros/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${this.user.token}` }
                });

                const result = await response.json();

                if (result.success) {
                    this.mostrarNotificacion('Registro eliminado correctamente', 'success');
                    await this.cargarRegistrosDelDia();
                } else {
                    this.mostrarNotificacion(result.message || 'Error al eliminar', 'danger');
                }
            } catch (error) {
                console.error('Error eliminando registro:', error);
                this.mostrarNotificacion('Error de conexión', 'danger');
            }
        }
    }

    async cambiarEstadoPago(id, nuevoEstado) {
        try {
            const response = await fetch(`${this.API_BASE}/registros/${id}/pago`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({ pago: nuevoEstado })
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarNotificacion(`Estado actualizado a ${nuevoEstado}`, 'success');
                await this.cargarRegistrosDelDia();
            } else {
                this.mostrarNotificacion('Error al actualizar estado', 'danger');
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            this.mostrarNotificacion('Error de conexión', 'danger');
        }
    }

    mostrarModalEdicion(registro) {
        // Crear modal dinámico para edición
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'editModal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Registro</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editForm">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">Vehículo</label>
                                    <select class="form-select" id="editVehicleType" required>
                                        <option value="car" ${registro.vehiculo === 'car' ? 'selected' : ''}>Automóvil</option>
                                        <option value="pickup" ${registro.vehiculo === 'pickup' ? 'selected' : ''}>Camioneta</option>
                                        <option value="suv" ${registro.vehiculo === 'suv' ? 'selected' : ''}>SUV</option>
                                        <option value="motorcycle" ${registro.vehiculo === 'motorcycle' ? 'selected' : ''}>Motocicleta</option>
                                        <option value="truck" ${registro.vehiculo === 'truck' ? 'selected' : ''}>Camión</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Placa</label>
                                    <input type="text" class="form-control" id="editPlaca" value="${registro.placa}" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Costo</label>
                                    <input type="number" class="form-control" id="editCosto" value="${registro.costo}" step="0.01" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Porcentaje Comisión</label>
                                    <input type="number" class="form-control" id="editPorcentaje" value="${registro.porcentaje}" min="0" max="100" required>
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Observaciones</label>
                                    <textarea class="form-control" id="editObservaciones">${registro.observaciones || ''}</textarea>
                                </div>
                                <div class="col-12">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="editPagado" ${registro.pago === 'Pagado' ? 'checked' : ''}>
                                        <label class="form-check-label">Pago realizado</label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="secretario.guardarEdicion(${registro.id})">Guardar Cambios</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        
        // Limpiar modal al cerrarse
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
        
        bootstrapModal.show();
    }

    async guardarEdicion(id) {
        const datosEditados = {
            vehiculo: document.getElementById('editVehicleType').value,
            placa: document.getElementById('editPlaca').value.toUpperCase(),
            costo: parseFloat(document.getElementById('editCosto').value),
            porcentaje: parseFloat(document.getElementById('editPorcentaje').value),
            observaciones: document.getElementById('editObservaciones').value || null,
            pago: document.getElementById('editPagado').checked ? 'Pagado' : 'Pendiente'
        };

        try {
            const response = await fetch(`${this.API_BASE}/registros/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify(datosEditados)
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarNotificacion('Registro actualizado correctamente', 'success');
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                await this.cargarRegistrosDelDia();
            } else {
                this.mostrarNotificacion(result.message || 'Error al actualizar', 'danger');
            }
        } catch (error) {
            console.error('Error actualizando registro:', error);
            this.mostrarNotificacion('Error de conexión', 'danger');
        }
    }

    verDetallesRegistro(id) {
        const registro = this.registrosHoy.find(r => r.id === id);
        if (!registro) return;

        Swal.fire({
            title: 'Detalles del Registro',
            html: `
                <div class="text-start">
                    <p><strong>Fecha:</strong> ${this.formatearFechaHora(registro.fecha, registro.hora)}</p>
                    <p><strong>Vehículo:</strong> ${this.capitalize(registro.vehiculo)}</p>
                    <p><strong>Placa:</strong> ${registro.placa}</p>
                    <p><strong>Servicio:</strong> ${registro.servicio_nombre}</p>
                    <p><strong>Costo:</strong> ${parseFloat(registro.costo).toLocaleString()}</p>
                    <p><strong>Comisión (${registro.porcentaje}%):</strong> ${this.calcularComisionDisplay(registro.costo, registro.porcentaje)}</p>
                    <p><strong>Lavador:</strong> ${registro.lavador}</p>
                    <p><strong>Estado:</strong> <span class="badge ${registro.pago === 'Pagado' ? 'bg-success' : 'bg-warning'}">${registro.pago}</span></p>
                    ${registro.observaciones ? `<p><strong>Observaciones:</strong> ${registro.observaciones}</p>` : ''}
                </div>
            `,
            width: '600px',
            confirmButtonText: 'Cerrar'
        });
    }
}

// ===========================================
// INICIALIZACIÓN DEL SISTEMA
// ===========================================

// Variable global para acceso desde HTML
let secretario;

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar sistema del secretario
    secretario = new SecretarioSystem();
    
    // Configurar calendarios adicionales
    flatpickr("#searchDate", {
        locale: "es",
        dateFormat: "Y-m-d",
        maxDate: "today"
    });

    // Configurar tooltips de Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    console.log('✅ Sistema del Secretario inicializado completamente');
});

// ===========================================
// FUNCIONES GLOBALES PARA ACCESO DESDE HTML
// ===========================================

window.secretario = {
    editarRegistro: (id) => secretario.editarRegistro(id),
    eliminarRegistro: (id) => secretario.eliminarRegistro(id),
    cambiarEstadoPago: (id, estado) => secretario.cambiarEstadoPago(id, estado),
    verDetallesRegistro: (id) => secretario.verDetallesRegistro(id),
    guardarEdicion: (id) => secretario.guardarEdicion(id)
};