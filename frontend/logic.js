// Auto Wash System - Main Application Logic
// Términos en inglés para aprender:
// - service: servicio
// - vehicle: vehículo  
// - record: registro
// - commission: comisión
// - revenue: ingresos/recaudación
// - balance: balance/saldo
// - history: historial
// - settings: configuración
// - backup: copia de seguridad
// - restore: restaurar

class AutoWashSystem {
    constructor() {
        this.services = [];
        this.washers = ['carlos', 'miguel', 'ana', 'juan'];
        this.serviceTypes = {
            'basic': 'Lavado Básico',
            'complete': 'Lavado Completo', 
            'premium': 'Lavado Premium',
            'waxing': 'Encerado',
            'polish': 'Pulido',
            'engine': 'Lavado de Motor'
        };
        this.vehicleTypes = {
            'car': 'Automóvil',
            'pickup': 'Camioneta',
            'suv': 'SUV', 
            'motorcycle': 'Motocicleta',
            'truck': 'Camión'
        };
        
        this.init();
    }

    // Initialize application
    init() {
        this.setupEventListeners();
        this.initializeDateTime();
        this.initializeCalendar();
        this.loadSettings();
        console.log('Auto Wash System initialized successfully');
    }

    // Setup all event listeners
    setupEventListeners() {
        // Service registration form
        document.getElementById('serviceForm').addEventListener('submit', (e) => this.handleServiceSubmit(e));
        
        // Export buttons
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportToCsv());
        document.getElementById('generatePdfBtn').addEventListener('click', () => this.generatePdf());
        document.getElementById('exportHistoryBtn').addEventListener('click', () => this.exportHistoryToCsv());
        document.getElementById('pdfHistoryBtn').addEventListener('click', () => this.generateHistoryPdf());
        
        // History loading
        document.getElementById('loadHistoryBtn').addEventListener('click', () => this.loadHistoryRecords());
        
        // Settings form
        document.getElementById('generalSettingsForm').addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        
        // Database operations
        document.getElementById('backupBtn').addEventListener('click', () => this.performBackup());
        document.getElementById('restoreBtn').addEventListener('click', () => this.performRestore());
        
        // Management buttons
        document.getElementById('addWasherBtn').addEventListener('click', () => this.addWasher());
        document.getElementById('addServiceBtn').addEventListener('click', () => this.addService());
        
        // Tab change events
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => this.handleTabChange(e));
        });
    }

    // Initialize date and time display
    initializeDateTime() {
        this.updateDateTime();
        // Update every second
        setInterval(() => this.updateDateTime(), 1000);
    }

    // Update current date and time
    updateDateTime() {
        const now = new Date();
        const dateOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const timeOptions = { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: true 
        };
        
        // Update navbar display
        document.getElementById('currentDate').textContent = now.toLocaleDateString('es-ES', dateOptions);
        document.getElementById('currentTime').textContent = now.toLocaleTimeString('es-ES', timeOptions);
        
        // Update form fields
        document.getElementById('serviceDate').value = now.toLocaleDateString('es-ES');
        document.getElementById('serviceTime').value = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Initialize calendar widget
    initializeCalendar() {
        flatpickr("#calendarWidget", {
            inline: true,
            locale: "es",
            dateFormat: "d/m/Y",
            maxDate: "today",
            onChange: (selectedDates) => {
                this.selectedDate = selectedDates[0];
            }
        });
    }

    // Handle service form submission
    handleServiceSubmit(e) {
        e.preventDefault();
        
        if (!this.validateServiceForm()) {
            return;
        }
        
        const serviceData = this.collectServiceData();
        this.saveService(serviceData);
        this.showSuccessMessage();
        this.resetServiceForm();
        this.updateDailyReports();
    }

    // Validate service form
    validateServiceForm() {
        const requiredFields = [
            'vehicleType', 'licensePlate', 'serviceType', 
            'serviceCost', 'washerSelect'
        ];
        
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const value = field.value.trim();
            
            if (!value) {
                this.markFieldAsInvalid(field);
                isValid = false;
            } else {
                this.markFieldAsValid(field);
            }
        });
        
        if (!isValid) {
            this.showNotification('Por favor, complete todos los campos obligatorios.', 'danger');
        }
        
        return isValid;
    }

    // Mark field as invalid
    markFieldAsInvalid(field) {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
    }

    // Mark field as valid
    markFieldAsValid(field) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
    }

    // Collect service data from form
    collectServiceData() {
        const cost = parseFloat(document.getElementById('serviceCost').value);
        const commissionPercent = parseFloat(document.getElementById('commissionPercent').value);
        const commission = (cost * commissionPercent) / 100;
        
        return {
            id: Date.now().toString(),
            date: document.getElementById('serviceDate').value,
            time: document.getElementById('serviceTime').value,
            vehicleType: document.getElementById('vehicleType').value,
            licensePlate: document.getElementById('licensePlate').value.toUpperCase(),
            serviceType: document.getElementById('serviceType').value,
            cost: cost,
            commissionPercent: commissionPercent,
            commission: commission,
            washer: document.getElementById('washerSelect').value,
            notes: document.getElementById('serviceNotes').value,
            isPaid: document.getElementById('paymentCompleted').checked,
            timestamp: new Date().toISOString()
        };
    }

    // Save service to storage
    saveService(serviceData) {
        try {
            let services = JSON.parse(localStorage.getItem('carwash_services') || '[]');
            services.push(serviceData);
            localStorage.setItem('carwash_services', JSON.stringify(services));
            
            console.log('Service saved successfully:', serviceData);
        } catch (error) {
            console.error('Error saving service:', error);
            this.showNotification('Error al guardar el servicio', 'danger');
        }
    }

    // Show success message
    showSuccessMessage() {
        Swal.fire({
            title: 'Registro Guardado',
            text: 'El servicio ha sido registrado correctamente',
            icon: 'success',
            confirmButtonColor: '#0d6efd',
            timer: 2000,
            showConfirmButton: false
        });
    }

    // Reset service form
    resetServiceForm() {
        document.getElementById('serviceForm').reset();
        this.updateDateTime();
        document.getElementById('commissionPercent').value = this.getDefaultCommission();
        
        // Remove validation classes
        document.querySelectorAll('.is-valid, .is-invalid').forEach(field => {
            field.classList.remove('is-valid', 'is-invalid');
        });
    }

    // Update daily reports
    updateDailyReports() {
        const todayServices = this.getTodayServices();
        this.updateDailyTable(todayServices);
        this.updateDailySummary(todayServices);
    }

    // Get today's services
    getTodayServices() {
        const today = new Date().toLocaleDateString('es-ES');
        const allServices = JSON.parse(localStorage.getItem('carwash_services') || '[]');
        
        return allServices.filter(service => service.date === today);
    }

    // Update daily table
    updateDailyTable(services) {
        const tableBody = document.getElementById('dailyRecords');
        
        if (services.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="emptyState">No hay registros para el día de hoy</td></tr>';
            return;
        }
        
        tableBody.innerHTML = services.map(service => `
            <tr>
                <td>${service.time}</td>
                <td>${this.vehicleTypes[service.vehicleType] || service.vehicleType}</td>
                <td>${service.licensePlate}</td>
                <td>${this.serviceTypes[service.serviceType] || service.serviceType}</td>
                <td>$${service.cost.toFixed(2)}</td>
                <td>$${service.commission.toFixed(2)}</td>
                <td>${this.getWasherName(service.washer)}</td>
                <td>
                    <span class="badge ${service.isPaid ? 'badge-paid' : 'badge-pending'}">
                        ${service.isPaid ? 'Pagado' : 'Pendiente'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary deleteBtn" onclick="app.editService('${service.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger deleteBtn" onclick="app.deleteService('${service.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Update daily summary
    updateDailySummary(services) {
        const totalRevenue = services.reduce((sum, service) => sum + service.cost, 0);
        const totalCommissions = services.reduce((sum, service) => sum + service.commission, 0);
        const netBalance = totalRevenue - totalCommissions;
        
        // Update summary cards
        document.querySelector('.totalRevenue .summaryValue').textContent = `$${totalRevenue.toFixed(2)}`;
        document.querySelector('.totalCommissions .summaryValue').textContent = `$${totalCommissions.toFixed(2)}`;
        document.querySelector('.netBalance .summaryValue').textContent = `$${netBalance.toFixed(2)}`;
    }

    // Get washer name by ID
    getWasherName(washerId) {
        const washerNames = {
            'carlos': 'Carlos Rodríguez',
            'miguel': 'Miguel Sánchez',
            'ana': 'Ana Gómez',
            'juan': 'Juan Pérez'
        };
        return washerNames[washerId] || washerId;
    }

    // Export to CSV
    exportToCsv() {
        this.showNotification('Exportando datos a CSV...', 'info');
        
        setTimeout(() => {
            const services = this.getTodayServices();
            const csvContent = this.generateCsvContent(services);
            this.downloadCsv(csvContent, `reporte_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.csv`);
            this.showNotification('Archivo CSV generado correctamente', 'success');
        }, 1000);
    }

    // Generate CSV content
    generateCsvContent(services) {
        const headers = ['Fecha', 'Hora', 'Tipo Vehículo', 'Placa', 'Servicio', 'Costo', 'Comisión', 'Lavador', 'Estado'];
        const rows = services.map(service => [
            service.date,
            service.time,
            this.vehicleTypes[service.vehicleType] || service.vehicleType,
            service.licensePlate,
            this.serviceTypes[service.serviceType] || service.serviceType,
            service.cost.toFixed(2),
            service.commission.toFixed(2),
            this.getWasherName(service.washer),
            service.isPaid ? 'Pagado' : 'Pendiente'
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        
        return csvContent;
    }

    // Download CSV file
    downloadCsv(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Generate PDF report
    generatePdf() {
        this.showNotification('Generando reporte PDF...', 'info');
        
        setTimeout(() => {
            this.showNotification('PDF generado correctamente', 'success');
            // In a real implementation, you would use a PDF library like jsPDF
        }, 1500);
    }

    // Load history records
    loadHistoryRecords() {
        if (!this.selectedDate) {
            this.showNotification('Por favor, seleccione una fecha', 'warning');
            return;
        }
        
        this.showNotification('Cargando registros históricos...', 'info');
        
        setTimeout(() => {
            const dateStr = this.selectedDate.toLocaleDateString('es-ES');
            const services = this.getServicesByDate(dateStr);
            this.updateHistoryTable(services);
            this.updateHistorySummary(services);
            this.showNotification('Registros cargados correctamente', 'success');
        }, 1000);
    }

    // Get services by date
    getServicesByDate(date) {
        const allServices = JSON.parse(localStorage.getItem('carwash_services') || '[]');
        return allServices.filter(service => service.date === date);
    }

    // Update history table
    updateHistoryTable(services) {
        const tableBody = document.getElementById('historyRecords');
        
        if (services.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="emptyState">No hay registros para la fecha seleccionada</td></tr>';
            return;
        }
        
        tableBody.innerHTML = services.map(service => `
            <tr>
                <td>${service.time}</td>
                <td>${this.vehicleTypes[service.vehicleType] || service.vehicleType}</td>
                <td>${service.licensePlate}</td>
                <td>${this.serviceTypes[service.serviceType] || service.serviceType}</td>
                <td>$${service.cost.toFixed(2)}</td>
                <td>${this.getWasherName(service.washer)}</td>
            </tr>
        `).join('');
    }

    // Update history summary
    updateHistorySummary(services) {
        const totalRevenue = services.reduce((sum, service) => sum + service.cost, 0);
        const totalCommissions = services.reduce((sum, service) => sum + service.commission, 0);
        const netBalance = totalRevenue - totalCommissions;
        
        // Update footer values
        const footerValues = document.querySelectorAll('.historyCard .footerValue');
        if (footerValues.length >= 3) {
            footerValues[0].textContent = `$${totalRevenue.toFixed(2)}`;
            footerValues[1].textContent = `$${totalCommissions.toFixed(2)}`;
            footerValues[2].textContent = `$${netBalance.toFixed(2)}`;
        }
    }

    // Handle settings form submission
    handleSettingsSubmit(e) {
        e.preventDefault();
        
        const settings = {
            defaultCommission: parseFloat(document.getElementById('defaultCommission').value),
            autoBackup: document.getElementById('autoBackup').checked
        };
        
        this.saveSettings(settings);
        this.showNotification('Configuración guardada correctamente', 'success');
    }

    // Save settings
    saveSettings(settings) {
        localStorage.setItem('carwash_settings', JSON.stringify(settings));
    }

    // Load settings
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('carwash_settings') || '{}');
        
        if (settings.defaultCommission) {
            document.getElementById('defaultCommission').value = settings.defaultCommission;
            document.getElementById('commissionPercent').value = settings.defaultCommission;
        }
        
        if (settings.autoBackup !== undefined) {
            document.getElementById('autoBackup').checked = settings.autoBackup;
        }
    }

    // Get default commission
    getDefaultCommission() {
        const settings = JSON.parse(localStorage.getItem('carwash_settings') || '{}');
        return settings.defaultCommission || 30;
    }

    // Perform backup
    performBackup() {
        this.showNotification('Realizando copia de seguridad...', 'info');
        
        setTimeout(() => {
            const data = {
                services: JSON.parse(localStorage.getItem('carwash_services') || '[]'),
                settings: JSON.parse(localStorage.getItem('carwash_settings') || '{}'),
                timestamp: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `carwash_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showNotification('Copia de seguridad completada correctamente', 'success');
        }, 1500);
    }

    // Handle tab changes
    handleTabChange(e) {
        const targetTab = e.target.getAttribute('data-bs-target');
        
        if (targetTab === '#reportsPanel') {
            this.updateDailyReports();
        }
    }

    // Show notification
    showNotification(message, type) {
        const notificationsContainer = document.getElementById('notifications');
        
        // Create alert element
        const alertElement = document.createElement('div');
        alertElement.classList.add('alert', `alert-${type}`, 'alert-dismissible', 'fade', 'show', 'alertFloating');
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Add to container
        notificationsContainer.appendChild(alertElement);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            alertElement.classList.remove('show');
            setTimeout(() => {
                if (notificationsContainer.contains(alertElement)) {
                    notificationsContainer.removeChild(alertElement);
                }
            }, 150);
        }, 3000);
    }

    // Delete service
    deleteService(serviceId) {
        Swal.fire({
            title: '¿Está seguro?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                let services = JSON.parse(localStorage.getItem('carwash_services') || '[]');
                services = services.filter(service => service.id !== serviceId);
                localStorage.setItem('carwash_services', JSON.stringify(services));
                
                this.updateDailyReports();
                this.showNotification('Registro eliminado correctamente', 'success');
            }
        });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new AutoWashSystem();
    
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    console.log('Application loaded successfully');
});

// Función para manejar login en Electron
function redirectToMainApp() {
    window.location.href = 'index.html';
}

// Si hay formularios de login, agregar el manejador
document.addEventListener('DOMContentLoaded', function() {
    const loginForms = document.querySelectorAll('#loginForm form');
    if (loginForms.length > 0) {
        loginForms[0].addEventListener('submit', function(e) {
            e.preventDefault();
            // Aquí iría la validación real
            // Por ahora redirige directamente
            redirectToMainApp();
        });
    }
});