// Verificar que Chart.js esté cargado
if (typeof Chart === 'undefined') {
    console.error('ERROR: Chart.js no está cargado correctamente');
} else {
    console.log('Chart.js cargado correctamente, versión:', Chart.version);
}

// Configuración de la API
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080/api' 
  : 'https://sistema-policial.onrender.com/api';

console.log('URL base de la API:', API_BASE_URL);

// Credenciales estáticas
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const loginContainer = document.querySelector('.login-container');
const dashboard = document.getElementById('dashboard');
const policiaForm = document.getElementById('policiaForm');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

// Variables globales
let oficialSeleccionado = null;
let timeoutBusqueda = null;

// Función para buscar oficiales (versión genérica)
async function buscarOficialesGenerico(termino, callback) {
    try {
        const response = await fetch(`/api/oficiales/buscar?termino=${encodeURIComponent(termino)}`);
        const result = await response.json();
        
        if (result.success) {
            callback(result.data || []);
        } else {
            throw new Error(result.message || 'Error en la búsqueda de oficiales');
        }
    } catch (error) {
        console.error('Error al buscar oficiales:', error);
        mostrarMensaje('Error al buscar oficiales: ' + error.message, 'danger');
        callback([]);
    }
}

// Función para mostrar resultados de búsqueda
function mostrarResultadosBusqueda(resultados, contenedorId, callbackSeleccion) {
    const contenedor = document.getElementById(contenedorId);
    const lista = contenedor.querySelector('div');
    
    if (!resultados || resultados.length === 0) {
        lista.innerHTML = '<div class="list-group-item">No se encontraron oficiales</div>';
        contenedor.classList.remove('d-none');
        return;
    }
    
    lista.innerHTML = resultados.map(oficial => `
        <a href="#" class="list-group-item list-group-item-action" 
           data-id="${oficial.id}" 
           data-nombre="${oficial.nombre_completo}">
            ${oficial.nombre_completo} - ${oficial.numero_placa || 'Sin placa'}
        </a>
    `).join('');
    
    // Agregar evento de clic a los resultados
    lista.querySelectorAll('a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const id = e.currentTarget.getAttribute('data-id');
            const nombre = e.currentTarget.getAttribute('data-nombre');
            callbackSeleccion(id, nombre);
            contenedor.classList.add('d-none');
        });
    });
    
    contenedor.classList.remove('d-none');
}

// Función para verificar autenticación
function checkAuth() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Función para mostrar el dashboard
function showDashboard() {
    console.log('=== INICIO: Mostrando dashboard ===');
    
    // Obtener referencias a los elementos
    const loginContainer = document.getElementById('loginContainer');
    const dashboard = document.getElementById('dashboard');
    
    // 1. Ocultar el formulario de login
    if (loginContainer) {
        loginContainer.style.display = 'none';
        loginContainer.style.visibility = 'hidden';
        loginContainer.style.opacity = '0';
        loginContainer.style.position = 'absolute';
        loginContainer.style.height = '0';
        loginContainer.style.overflow = 'hidden';
        console.log('✅ Formulario de login oculto');
    }
    
    // 2. Mostrar el dashboard
    if (dashboard) {
        // Remover todos los estilos en línea primero
        dashboard.removeAttribute('style');
        
        // Aplicar estilos necesarios para mostrar el dashboard
        dashboard.style.display = 'block';
        dashboard.style.visibility = 'visible';
        dashboard.style.opacity = '1';
        dashboard.style.position = 'relative';
        dashboard.style.height = 'auto';
        dashboard.style.overflow = 'visible';
        dashboard.style.width = '100%';
        
        console.log('✅ Dashboard mostrado con estilos correctos');
        
        // Inicializar navegación después de un pequeño retraso
        setTimeout(() => {
            try {
                if (typeof setupNavigation === 'function') {
                    setupNavigation();
                    console.log('✅ Navegación inicializada');
                    
                    // Navegar a la pestaña correspondiente según el hash de la URL
                    const hash = window.location.hash.substring(1);
                    if (hash) {
                        cambiarPestana(hash);
                    } else {
                        // Mostrar la pestaña de inicio por defecto
                        cambiarPestana('datos-generales');
                    }
                } else {
                    console.error('❌ La función setupNavigation no está definida');
                }
                
                // Inicializar módulos específicos
                if (typeof inicializarModuloEstatusPoli === 'function' && 
                    (document.getElementById('estatus-poli') || window.location.hash === '#estatus-poli')) {
                    inicializarModuloEstatusPoli();
                    console.log('✅ Módulo Estatus Poli inicializado');
                }
            } catch (error) {
                console.error('❌ Error al inicializar componentes:', error);
            }
        }, 100);
    } else {
        console.error('❌ No se encontró el elemento del dashboard');
    }
    
    // 3. Actualizar clases del body
    document.body.classList.remove('login-page');
    document.body.classList.add('dashboard-page');
    document.body.style.overflow = 'auto';
    
    console.log('✅ Clases del body actualizadas:', document.body.className);
    
    // 4. Guardar estado de autenticación
    localStorage.setItem('isLoggedIn', 'true');
    console.log('✅ Estado de autenticación guardado');
    
    // 5. Forzar un redibujado después de un pequeño retraso
    setTimeout(() => {
        if (dashboard) {
            // Forzar un reflow
            void dashboard.offsetHeight;
            console.log('✅ Redibujado forzado del dashboard');
        }
    }, 50);
    
    console.log('=== FIN: Dashboard mostrado correctamente ===');
}

// Función para mostrar el formulario de login
function showLogin() {
    console.log('Mostrando formulario de login...');
    // Obtener referencias a los elementos
    const loginContainer = document.getElementById('loginContainer');
    const dashboard = document.getElementById('dashboard');
    
    // Mostrar el login y ocultar el dashboard
    if (loginContainer) loginContainer.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
    
    // Limpiar campos del formulario
    if (loginForm) {
        loginForm.reset();
        const errorElement = document.getElementById('loginError');
        if (errorElement) errorElement.remove();
    }
    
    // Actualizar clases del body
    document.body.className = 'login-page';
    
    // Limpiar estado de autenticación
    localStorage.removeItem('isLoggedIn');
}

// Función para mostrar errores de login
function showError(message) {
    // Eliminar mensajes de error anteriores
    const existingError = document.getElementById('loginError');
    if (existingError) {
        existingError.remove();
    }
    
    // Crear y mostrar nuevo mensaje de error
    const errorElement = document.createElement('div');
    errorElement.id = 'loginError';
    errorElement.className = 'alert alert-danger mt-3';
    errorElement.textContent = message;
    
    // Insertar después del formulario
    if (loginForm) {
        loginForm.appendChild(errorElement);
    }
}

// Función para cambiar entre pestañas
function cambiarPestana(tabId) {
    console.log('=== INICIO: Cambiando a pestaña ===', tabId);
    
    // Validar que el tabId sea válido
    if (!tabId) {
        console.error('Error: No se proporcionó un ID de pestaña');
        tabId = 'inicio'; // Valor por defecto
    }
    
    // Ocultar todos los contenidos
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.add('d-none');
    });
    
    // Desactivar todos los enlaces
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Mostrar el contenido de la pestaña seleccionada
    const contenido = document.getElementById(tabId);
    const enlace = document.querySelector(`.nav-link[data-page="${tabId}"]`);
    
    if (!contenido) {
        console.error('No se encontró el contenido para la pestaña:', tabId);
        // Intentar cargar la pestaña de inicio como respaldo
        if (tabId !== 'inicio') {
            return cambiarPestana('inicio');
        }
        return;
    }
    
    console.log(`Mostrando contenido de la pestaña: ${tabId}`);
    contenido.classList.remove('d-none');
    
    // Inicializar módulos específicos según la pestaña seleccionada
    switch(tabId) {
        case 'evaluaciones':
            console.log('Inicializando módulo de evaluaciones');
            if (typeof inicializarModuloEvaluaciones === 'function') {
                inicializarModuloEvaluaciones();
            } else {
                console.error('La función inicializarModuloEvaluaciones no está definida');
            }
            break;
            
        case 'formacion':
            console.log('Inicializando módulo de formación');
            if (typeof inicializarModuloFormacion === 'function') {
                inicializarModuloFormacion();
            } else {
                console.error('La función inicializarModuloFormacion no está definida');
            }
            break;
            
        case 'estatus-poli':
            console.log('Inicializando módulo de estatus poli');
            // Usar setTimeout para asegurar que el DOM esté listo
            setTimeout(() => {
                if (typeof inicializarModuloEstatusPoli === 'function') {
                    inicializarModuloEstatusPoli();
                    // Forzar el foco en el campo de búsqueda
                    const buscarInput = document.getElementById('buscarOficialEstatus');
                    if (buscarInput) {
                        buscarInput.focus();
                    }
                } else {
                    console.error('La función inicializarModuloEstatusPoli no está definida');
                }
                
                // Cargar la gráfica de estado de oficiales
                if (typeof cargarGraficaEstadoOficiales === 'function') {
                    cargarGraficaEstadoOficiales();
                }
            }, 50);
            break;
    }
    
    // Activar el enlace de navegación correspondiente
    if (enlace) {
        enlace.classList.add('active');
        console.log('Enlace de navegación activado:', enlace);
    } else {
        console.warn(`No se encontró el enlace de navegación para la pestaña: ${tabId}`);
    }
    
    // Actualizar la URL
    const newHash = `#${tabId}`;
    if (window.location.hash !== newHash) {
        window.history.pushState(null, null, newHash);
    }
    console.log('=== FIN: Cambio de pestaña completado ===', tabId);
}

// Función para mostrar el formulario de login
function showLogin(errorMessage = '') {
    console.log('Mostrando formulario de login...');
    const loginContainer = document.getElementById('loginContainer');
    const dashboard = document.getElementById('dashboard');
    const loginError = document.getElementById('loginError');
    
    // Mostrar mensaje de error si existe
    if (errorMessage && loginError) {
        loginError.textContent = errorMessage;
        loginError.classList.remove('d-none');
    }
    
    // Mostrar login
    if (loginContainer) {
        loginContainer.style.display = 'flex';
        loginContainer.style.visibility = 'visible';
        loginContainer.style.opacity = '1';
        loginContainer.style.position = 'relative';
        
        // Enfocar el campo de usuario
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.focus();
        }
    }
    
    // Ocultar dashboard
    if (dashboard) {
        dashboard.style.display = 'none';
        dashboard.style.visibility = 'hidden';
        dashboard.style.opacity = '0';
        dashboard.style.position = 'absolute';
    }
    
    // Cambiar clase del body
    document.body.classList.add('login-page');
    document.body.classList.remove('dashboard-page');
    
    console.log('Formulario de login mostrado');
}

// Inicializar la aplicación
function initApp() {
    console.log('Inicializando aplicación...');
    
    // 1. Asegurar que el body tenga la clase login-page
    document.body.className = 'login-page';
    
    // 2. Obtener referencias a los elementos
    const loginContainer = document.getElementById('loginContainer');
    const dashboard = document.getElementById('dashboard');
    
    console.log('Elementos del DOM en initApp:', { 
        loginContainer: !!loginContainer, 
        dashboard: !!dashboard 
    });
    
    // 3. Ocultar el dashboard primero
    if (dashboard) {
        dashboard.style.display = 'none';
        dashboard.style.visibility = 'hidden';
        dashboard.style.opacity = '0';
        dashboard.style.position = 'absolute';
        dashboard.style.height = '0';
        dashboard.style.overflow = 'hidden';
        console.log('Dashboard ocultado en initApp');
    }
    
    // 4. Mostrar el formulario de login
    if (loginContainer) {
        loginContainer.style.display = 'flex';
        loginContainer.style.visibility = 'visible';
        loginContainer.style.opacity = '1';
        loginContainer.style.position = 'relative';
        console.log('Login mostrado en initApp');
        
        // Enfocar el campo de usuario
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.focus();
        }
    }
    
    // 5. Verificar si hay una sesión activa (en un entorno real, esto se haría con el servidor)
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn) {
        // Si hay una sesión activa, mostrar el dashboard
        showDashboard();
    } else {
        // Si no hay sesión activa, asegurarse de que el login sea visible
        showLogin();
    }
    
    console.log('Aplicación inicializada');
}

// Manejador de login
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        console.log('Formulario de login enviado');
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const loginError = document.getElementById('loginError');
        
        if (!usernameInput || !passwordInput) {
            console.error('No se encontraron los campos de usuario o contraseña');
            if (loginError) {
                loginError.textContent = 'Error en el formulario de inicio de sesión';
                loginError.classList.remove('d-none');
            }
            return;
        }
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        console.log('Intento de inicio de sesión con usuario:', username);
        
        // Validar credenciales
        if (username === 'admin' && password === 'admin123') {
            console.log('Credenciales válidas, iniciando sesión...');
            // Guardar estado de autenticación
            localStorage.setItem('isLoggedIn', 'true');
            // Limpiar mensajes de error
            if (loginError) {
                loginError.classList.add('d-none');
            }
            // Limpiar formulario
            this.reset();
            // Mostrar dashboard
            showDashboard();
        } else {
            console.log('Credenciales inválidas');
            // Mostrar mensaje de error
            if (loginError) {
                loginError.textContent = 'Usuario o contraseña incorrectos';
                loginError.classList.remove('d-none');
            }
            // Enfocar el campo de usuario
            usernameInput.focus();
        }
    });
}

// Funciones para el módulo de formación
function inicializarModuloFormacion() {
    const formacionSection = document.getElementById('formacion');
    if (!formacionSection) return;
    
    console.log('Inicializando módulo de formación...');
    
    // Configurar fechas por defecto
    const fechaCursoInput = document.getElementById('fecha_curso');
    const fechaCompetenciaInput = document.getElementById('fecha_competencia');
    const vigenciaInput = document.getElementById('vigencia');
    
    if (fechaCursoInput) fechaCursoInput.valueAsDate = new Date();
    if (fechaCompetenciaInput) fechaCompetenciaInput.valueAsDate = new Date();
    if (vigenciaInput) {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        vigenciaInput.valueAsDate = nextYear;
    }
    
    // Elementos del buscador de formación
    const buscarOficialFormacion = document.getElementById('buscarOficialFormacion');
    const btnBuscarFormacion = document.getElementById('btnBuscarOficialFormacion');
    const resultadosFormacion = document.getElementById('resultadosBusquedaFormacion');
    const idOficialFormacion = document.getElementById('id_oficial_formacion');
    const oficialSeleccionadoFormacion = document.getElementById('oficialSeleccionadoFormacion');
    
    // Elementos del buscador de competencias
    const buscarOficialCompetencia = document.getElementById('buscarOficialCompetencia');
    const btnBuscarCompetencia = document.getElementById('btnBuscarOficialCompetencia');
    const resultadosCompetencia = document.getElementById('resultadosBusquedaCompetencia');
    const idOficialCompetencia = document.getElementById('id_oficial_competencia');
    const oficialSeleccionadoCompetencia = document.getElementById('oficialSeleccionadoCompetencia');
    
    // Función para manejar la búsqueda de formación
    const buscarOficialFormacionHandler = () => {
        const termino = buscarOficialFormacion.value.trim();
        if (termino.length >= 3) {
            buscarOficialesGenerico(termino, (resultados) => {
                mostrarResultadosBusqueda(resultados, 'resultadosBusquedaFormacion', (id, nombre) => {
                    idOficialFormacion.value = id;
                    oficialSeleccionadoFormacion.textContent = nombre;
                    buscarOficialFormacion.value = '';
                });
            });
        } else if (termino.length === 0) {
            resultadosFormacion.classList.add('d-none');
        }
    };
    
    // Función para manejar la búsqueda de competencia
    const buscarOficialCompetenciaHandler = () => {
        const termino = buscarOficialCompetencia.value.trim();
        if (termino.length >= 3) {
            buscarOficialesGenerico(termino, (resultados) => {
                mostrarResultadosBusqueda(resultados, 'resultadosBusquedaCompetencia', (id, nombre) => {
                    idOficialCompetencia.value = id;
                    oficialSeleccionadoCompetencia.textContent = nombre;
                    buscarOficialCompetencia.value = '';
                });
            });
        } else if (termino.length === 0) {
            resultadosCompetencia.classList.add('d-none');
        }
    };
    
    // Event listeners para el buscador de formación
    if (buscarOficialFormacion && btnBuscarFormacion) {
        buscarOficialFormacion.addEventListener('input', () => {
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(buscarOficialFormacionHandler, 300);
        });
        
        btnBuscarFormacion.addEventListener('click', buscarOficialFormacionHandler);
        
        // Cerrar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!resultadosFormacion.contains(e.target) && e.target !== buscarOficialFormacion) {
                resultadosFormacion.classList.add('d-none');
            }
        });
    }
    
    // Event listeners para el buscador de competencias
    if (buscarOficialCompetencia && btnBuscarCompetencia) {
        buscarOficialCompetencia.addEventListener('input', () => {
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(buscarOficialCompetenciaHandler, 300);
        });
        
        btnBuscarCompetencia.addEventListener('click', buscarOficialCompetenciaHandler);
        
        // Cerrar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!resultadosCompetencia.contains(e.target) && e.target !== buscarOficialCompetencia) {
                resultadosCompetencia.classList.add('d-none');
            }
        });
    }
    
    // Eventos del formulario de formación
    const formacionForm = document.getElementById('formacionForm');
    if (formacionForm) {
        formacionForm.addEventListener('submit', guardarFormacion);
    }
    
    // Eventos del formulario de competencias
    const competenciasForm = document.getElementById('competenciasForm');
    if (competenciasForm) {
        competenciasForm.addEventListener('submit', guardarCompetencia);
    }
    
    // Botones de limpieza
    const btnLimpiarFormacion = document.getElementById('btnLimpiarFormacion');
    const btnLimpiarCompetencia = document.getElementById('btnLimpiarCompetencia');
    
    if (btnLimpiarFormacion) {
        btnLimpiarFormacion.addEventListener('click', limpiarFormularioFormacion);
    }
    
    if (btnLimpiarCompetencia) {
        btnLimpiarCompetencia.addEventListener('click', limpiarFormularioCompetencia);
    }
    
    // Cargar registros existentes
    cargarFormaciones();
}

// Función para guardar un registro de formación
async function guardarFormacion(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const idOficial = formData.get('id_oficial');
    
    // Validar que se haya seleccionado un oficial
    if (!idOficial) {
        mostrarMensaje('Debe seleccionar un oficial antes de guardar', 'warning');
        document.getElementById('buscarOficialFormacion').focus();
        return;
    }
    
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/formacion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarMensaje('Registro de formación guardado exitosamente', 'success');
            limpiarFormularioFormacion();
            cargarFormaciones();
        } else {
            throw new Error(result.message || 'Error al guardar el registro de formación');
        }
    } catch (error) {
        console.error('Error al guardar el registro de formación:', error);
        mostrarMensaje(error.message || 'Error al guardar el registro de formación', 'danger');
    }
}

// Función para guardar una competencia básica
async function guardarCompetencia(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const idOficial = formData.get('id_oficial');
    
    // Validar que se haya seleccionado un oficial
    if (!idOficial) {
        mostrarMensaje('Debe seleccionar un oficial antes de guardar', 'warning');
        document.getElementById('buscarOficialCompetencia').focus();
        return;
    }
    
    try {
        const response = await fetch('/api/competencias', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarMensaje('Competencia básica guardada exitosamente', 'success');
            limpiarFormularioCompetencia();
        } else {
            throw new Error(result.message || 'Error al guardar la competencia básica');
        }
    } catch (error) {
        console.error('Error al guardar la competencia básica:', error);
        mostrarMensaje(error.message || 'Error al guardar la competencia básica', 'danger');
    }
}

// Función para cargar los registros de formación
async function cargarFormaciones() {
    try {
        // Cargar formaciones
        const responseFormaciones = await fetch('/api/formacion');
        const resultFormaciones = await responseFormaciones.json();
        
        if (resultFormaciones.success) {
            const tbody = document.querySelector('#tablaFormaciones tbody');
            if (tbody) {
                tbody.innerHTML = resultFormaciones.data.map(formacion => `
                    <tr>
                        <td>${formacion.nombre_oficial || 'No especificado'}</td>
                        <td>${formacion.curso || ''}</td>
                        <td>${formacion.tipo_curso || ''}</td>
                        <td>${formacion.institucion || ''}</td>
                        <td>${formacion.fecha_curso ? new Date(formacion.fecha_curso).toLocaleDateString() : ''}</td>
                        <td>${formacion.resultado || ''}</td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-editar-formacion" data-id="${formacion.id}" data-oficial-id="${formacion.id_oficial}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-eliminar-formacion" data-id="${formacion.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        // Cargar competencias
        const responseCompetencias = await fetch('/api/competencias');
        const resultCompetencias = await responseCompetencias.json();
        
        if (resultCompetencias.success) {
            const tbody = document.querySelector('#tablaCompetencias tbody');
            if (tbody) {
                tbody.innerHTML = resultCompetencias.data.map(competencia => `
                    <tr>
                        <td>${competencia.nombre_oficial || 'No especificado'}</td>
                        <td>${competencia.institucion || ''}</td>
                        <td>${competencia.fecha ? new Date(competencia.fecha).toLocaleDateString() : ''}</td>
                        <td>${competencia.vigencia ? new Date(competencia.vigencia).toLocaleDateString() : ''}</td>
                        <td>${competencia.resultado || ''}</td>
                        <td>
                            ${competencia.ruta_archivo ? 
                                `<a href="${competencia.ruta_archivo}" class="btn btn-sm btn-info" target="_blank">
                                    <i class="fas fa-file-pdf"></i>
                                </a>` : ''
                            }
                            <button class="btn btn-sm btn-primary btn-editar-competencia" data-id="${competencia.id}" data-oficial-id="${competencia.id_oficial}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-eliminar-competencia" data-id="${competencia.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        // Agregar eventos a los botones de editar y eliminar
        agregarEventosFormacion();
        agregarEventosCompetencia();
        
    } catch (error) {
        console.error('Error al cargar los registros de formación:', error);
        mostrarMensaje('Error al cargar los registros de formación', 'danger');
    }
}

// Función para agregar eventos a los botones de formación
function agregarEventosFormacion() {
    // Evento para el botón de editar formación
    document.querySelectorAll('.btn-editar-formacion').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const idOficial = e.currentTarget.getAttribute('data-oficial-id');
            
            try {
                const response = await fetch(`/api/formacion/${id}`);
                const result = await response.json();
                
                if (result.success && result.data) {
                    const formacion = result.data;
                    const form = document.getElementById('formacionForm');
                    
                    // Llenar el formulario con los datos del registro
                    document.getElementById('formacion_id').value = formacion.id;
                    document.getElementById('curso').value = formacion.curso || '';
                    document.getElementById('tipo_curso').value = formacion.tipo_curso || '';
                    document.getElementById('institucion').value = formacion.institucion || '';
                    document.getElementById('fecha_curso').value = formacion.fecha_curso ? formacion.fecha_curso.split('T')[0] : '';
                    document.getElementById('resultado_curso').value = formacion.resultado || '';
                    
                    // Establecer el oficial seleccionado si existe
                    if (idOficial && formacion.nombre_oficial) {
                        document.getElementById('id_oficial_formacion').value = idOficial;
                        document.getElementById('oficialSeleccionadoFormacion').textContent = formacion.nombre_oficial;
                    }
                    
                    // Cambiar a la pestaña de formación y desplazarse al formulario
                    cambiarPestana('formacion');
                    form.scrollIntoView({ behavior: 'smooth' });
                } else {
                    throw new Error(result.message || 'Error al cargar el registro de formación');
                }
            } catch (error) {
                console.error('Error al cargar el registro de formación:', error);
                mostrarMensaje(error.message || 'Error al cargar el registro de formación', 'danger');
            }
        });
    });
    
    // Evento para el botón de eliminar formación
    document.querySelectorAll('.btn-eliminar-formacion').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const nombre = e.currentTarget.closest('tr').querySelector('td:nth-child(2)').textContent || 'este registro';
            
            if (!confirm(`¿Está seguro de eliminar el registro "${nombre}"?`)) {
                return;
            }
            
            const originalText = e.currentTarget.innerHTML;
            e.currentTarget.disabled = true;
            e.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            
            try {
                const response = await fetch(`/api/formacion/${id}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    mostrarMensaje('Registro de formación eliminado exitosamente', 'success');
                    cargarFormaciones();
                } else {
                    throw new Error(result.message || 'Error al eliminar el registro de formación');
                }
            } catch (error) {
                console.error('Error al eliminar el registro de formación:', error);
                mostrarMensaje(error.message || 'Error al eliminar el registro de formación', 'danger');
            } finally {
                e.currentTarget.disabled = false;
                e.currentTarget.innerHTML = originalText;
            }
        });
    });
}

// Función para agregar eventos a los botones de competencias
function agregarEventosCompetencia() {
    // Evento para el botón de editar competencia
    document.querySelectorAll('.btn-editar-competencia').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const idOficial = e.currentTarget.getAttribute('data-oficial-id');
            
            try {
                const response = await fetch(`/api/competencias/${id}`);
                const result = await response.json();
                
                if (result.success && result.data) {
                    const competencia = result.data;
                    const form = document.getElementById('competenciasForm');
                    
                    // Llenar el formulario con los datos del registro
                    document.getElementById('competencia_id').value = competencia.id;
                    document.getElementById('institucion_competencia').value = competencia.institucion || '';
                    document.getElementById('fecha_competencia').value = competencia.fecha ? competencia.fecha.split('T')[0] : '';
                    document.getElementById('resultado_competencia').value = competencia.resultado || '';
                    document.getElementById('vigencia').value = competencia.vigencia ? competencia.vigencia.split('T')[0] : '';
                    
                    // Establecer el oficial seleccionado si existe
                    if (idOficial && competencia.nombre_oficial) {
                        document.getElementById('id_oficial_competencia').value = idOficial;
                        document.getElementById('oficialSeleccionadoCompetencia').textContent = competencia.nombre_oficial;
                    }
                    
                    // Cambiar a la pestaña de competencias y desplazarse al formulario
                    document.querySelector('a[href="#competencias"]').click();
                    form.scrollIntoView({ behavior: 'smooth' });
                } else {
                    throw new Error(result.message || 'Error al cargar el registro de competencia');
                }
            } catch (error) {
                console.error('Error al cargar el registro de competencia:', error);
                mostrarMensaje(error.message || 'Error al cargar el registro de competencia', 'danger');
            }
        });
    });
    
    // Evento para el botón de eliminar competencia
    document.querySelectorAll('.btn-eliminar-competencia').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const nombre = e.currentTarget.closest('tr').querySelector('td:nth-child(2)').textContent || 'este registro';
            
            if (!confirm(`¿Está seguro de eliminar la competencia "${nombre}"?`)) {
                return;
            }
            
            const originalText = e.currentTarget.innerHTML;
            e.currentTarget.disabled = true;
            e.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            
            try {
                const response = await fetch(`/api/competencias/${id}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    mostrarMensaje('Competencia eliminada exitosamente', 'success');
                    cargarFormaciones();
                } else {
                    throw new Error(result.message || 'Error al eliminar la competencia');
                }
            } catch (error) {
                console.error('Error al eliminar la competencia:', error);
                mostrarMensaje(error.message || 'Error al eliminar la competencia', 'danger');
            } finally {
                e.currentTarget.disabled = false;
                e.currentTarget.innerHTML = originalText;
            }
        });
    });
}

// Función para eliminar un registro de formación (compatibilidad)
async function eliminarFormacion(id, nombre, button) {
    if (!confirm(`¿Está seguro de eliminar el registro "${nombre}"?`)) {
        return;
    }
    
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Eliminando...';
    
    try {
        const response = await fetch(`/api/formacion/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarMensaje('Registro de formación eliminado exitosamente', 'success');
            cargarFormaciones();
        } else {
            throw new Error(result.message || 'Error al eliminar el registro de formación');
        }
    } catch (error) {
        console.error('Error al eliminar el registro de formación:', error);
        mostrarMensaje(error.message || 'Error al eliminar el registro de formación', 'danger');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Función para limpiar el formulario de formación
function limpiarFormularioFormacion() {
    const form = document.getElementById('formacionForm');
    if (form) {
        form.reset();
        document.getElementById('formacion_id').value = '';
        const fechaInput = document.getElementById('fecha_curso');
        if (fechaInput) fechaInput.valueAsDate = new Date();
        
        // Limpiar campos de búsqueda de oficial
        const buscarOficialInput = document.getElementById('buscarOficialFormacion');
        const oficialSeleccionado = document.getElementById('oficialSeleccionadoFormacion');
        const idOficialInput = document.getElementById('id_oficial_formacion');
        
        if (buscarOficialInput) buscarOficialInput.value = '';
        if (oficialSeleccionado) oficialSeleccionado.textContent = 'Ningún oficial seleccionado';
        if (idOficialInput) idOficialInput.value = '';
    }
}

// Función para limpiar el formulario de competencias
function limpiarFormularioCompetencia() {
    const form = document.getElementById('competenciasForm');
    if (form) {
        form.reset();
        document.getElementById('competencia_id').value = '';
        const fechaInput = document.getElementById('fecha_competencia');
        const vigenciaInput = document.getElementById('vigencia');
        
        if (fechaInput) fechaInput.valueAsDate = new Date();
        if (vigenciaInput) {
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            vigenciaInput.valueAsDate = nextYear;
        }
        
        // Limpiar campos de búsqueda de oficial
        const buscarOficialInput = document.getElementById('buscarOficialCompetencia');
        const oficialSeleccionado = document.getElementById('oficialSeleccionadoCompetencia');
        const idOficialInput = document.getElementById('id_oficial_competencia');
        
        if (buscarOficialInput) buscarOficialInput.value = '';
        if (oficialSeleccionado) oficialSeleccionado.textContent = 'Ningún oficial seleccionado';
        if (idOficialInput) idOficialInput.value = '';
    }
}

// Funciones para el módulo de evaluaciones
function inicializarModuloEvaluaciones() {
    const evaluacionesSection = document.getElementById('evaluaciones');
    if (!evaluacionesSection) return;
    
    console.log('Inicializando módulo de evaluaciones...');
    
    // Configurar fecha actual por defecto
    const fechaInput = document.getElementById('fecha_evaluacion');
    if (fechaInput) {
        fechaInput.valueAsDate = new Date();
    }
    
    // Eventos del formulario de evaluación
    const evaluacionForm = document.getElementById('evaluacionForm');
    if (evaluacionForm) {
        console.log('Formulario de evaluación encontrado');
        evaluacionForm.addEventListener('submit', guardarEvaluacion);
    }
    
    const btnLimpiar = document.getElementById('btnLimpiar');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFormularioEvaluacion);
    }
    
    // Elementos para la búsqueda de oficiales
    const buscarOficialInput = document.getElementById('buscarOficial');
    const btnBuscarOficial = document.getElementById('btnBuscarOficial');
    const resultadosBusqueda = document.getElementById('resultadosBusqueda');
    
    // Función para realizar la búsqueda
    const realizarBusqueda = () => {
        const termino = buscarOficialInput.value.trim();
        console.log('Buscando oficiales con término:', termino);
        
        if (termino.length >= 3) {
            buscarOficiales(termino);
        } else if (resultadosBusqueda) {
            resultadosBusqueda.style.display = 'none';
            mostrarMensaje('Ingrese al menos 3 caracteres para buscar', 'warning');
        }
    };
    
    // Configurar eventos de búsqueda
    if (buscarOficialInput) {
        console.log('Campo de búsqueda de oficial encontrado');
        
        // Búsqueda al escribir (con debounce)
        let timeoutId;
        buscarOficialInput.addEventListener('input', function() {
            clearTimeout(timeoutId);
            const termino = this.value.trim();
            
            if (termino.length >= 3) {
                timeoutId = setTimeout(() => {
                    realizarBusqueda();
                }, 500);
            } else if (resultadosBusqueda) {
                resultadosBusqueda.style.display = 'none';
            }
        });
        
        // Búsqueda al presionar Enter
        buscarOficialInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                realizarBusqueda();
            }
        });
    }
    
    // Configurar botón de búsqueda
    if (btnBuscarOficial) {
        console.log('Botón de búsqueda encontrado');
        btnBuscarOficial.addEventListener('click', function(e) {
            e.preventDefault();
            realizarBusqueda();
        });
    }
    
    // Ocultar resultados al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (resultadosBusqueda && 
            !buscarOficialInput?.contains(e.target) && 
            !resultadosBusqueda.contains(e.target) &&
            !btnBuscarOficial?.contains(e.target)) {
            resultadosBusqueda.style.display = 'none';
        }
    });
    
    // Cargar evaluaciones al mostrar la pestaña
    evaluacionesSection.addEventListener('show', function() {
        console.log('Mostrando pestaña de evaluaciones');
        cargarEvaluaciones();
    });
    
    // Cargar evaluaciones si ya estamos en la pestaña de evaluaciones
    if (window.location.hash === '#evaluaciones') {
        console.log('Cargando evaluaciones iniciales...');
        cargarEvaluaciones();
    }
}

// Función para mostrar mensajes al usuario
function mostrarMensaje(mensaje, tipo = 'success') {
    // Crear el contenedor si no existe
    let mensajeDiv = document.getElementById('mensajeGlobal');
    if (!mensajeDiv) {
        mensajeDiv = document.createElement('div');
        mensajeDiv.id = 'mensajeGlobal';
        mensajeDiv.style.position = 'fixed';
        mensajeDiv.style.top = '20px';
        mensajeDiv.style.right = '20px';
        mensajeDiv.style.zIndex = '9999';
        document.body.appendChild(mensajeDiv);
    }
    
    // Crear el mensaje
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo === 'error' ? 'danger' : tipo} alert-dismissible fade show`;
    alerta.role = 'alert';
    alerta.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Agregar el mensaje al contenedor
    mensajeDiv.appendChild(alerta);
    
    // Eliminar el mensaje después de 5 segundos
    setTimeout(() => {
        alerta.remove();
    }, 5000);
}

async function buscarOficiales(termino) {
    const resultadosDiv = document.getElementById('resultadosBusqueda');
    
    if (!termino || termino.length < 3) {
        if (resultadosDiv) resultadosDiv.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`/api/oficiales/buscar?termino=${encodeURIComponent(termino)}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Verificar si la respuesta tiene el formato esperado
        if (!result || !result.success) {
            throw new Error(result?.message || 'Error en la respuesta del servidor');
        }
        
        const data = result.data || [];
        
        if (data.length === 0) {
            resultadosDiv.innerHTML = '<div class="list-group-item">No se encontraron oficiales</div>';
            resultadosDiv.style.display = 'block';
            return;
        }
        
        let html = '';
        data.forEach(oficial => {
            // Asegurarse de que los campos necesarios existan
            const id = oficial.id || '';
            const nombre = oficial.nombre_completo || 'Nombre no disponible';
            const curp = oficial.curp || 'N/A';
            
            html += `
                <div class="list-group-item list-group-item-action" 
                     data-id="${id}" 
                     data-nombre="${nombre}"
                     data-curp="${curp}">
                    <strong>${nombre}</strong><br>
                    <small class="text-muted">CURP: ${curp}</small>
                </div>
            `;
        });
        
        resultadosDiv.innerHTML = html;
        resultadosDiv.style.display = 'block';
        
        // Agregar evento de clic a los resultados
        document.querySelectorAll('#resultadosBusqueda .list-group-item').forEach(item => {
            item.addEventListener('click', function() {
                seleccionarOficial(
                    this.dataset.id,
                    this.dataset.nombre,
                    this.dataset.curp
                );
                resultadosDiv.style.display = 'none';
            });
        });
        
    } catch (error) {
        console.error('Error al buscar oficiales:', error);
        mostrarMensaje('Error al buscar oficiales: ' + error.message, 'error');
    }
}

function seleccionarOficial(id, nombre, curp) {
    oficialSeleccionado = { id, nombre, curp };
    document.getElementById('id_oficial').value = id;
    document.getElementById('buscarOficial').value = nombre;
    
    const infoOficial = document.getElementById('infoOficial');
    infoOficial.innerHTML = `
        <p class="oficial-info">
            <strong>${nombre}</strong>
            <small>CURP: ${curp || 'No disponible'}</small>
        </p>
    `;
}

async function cargarEvaluaciones() {
    try {
        console.log('Cargando evaluaciones...');
        const response = await fetch('/api/evaluaciones');
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Error al cargar las evaluaciones');
        }
        
        const evaluaciones = result.data || [];
        const tbody = document.getElementById('cuerpoTablaEvaluaciones');
        
        if (!tbody) {
            console.error('No se encontró el elemento con ID "cuerpoTablaEvaluaciones"');
            return;
        }
        
        if (evaluaciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay evaluaciones registradas</td></tr>';
            return;
        }
        
        console.log('Evaluaciones cargadas:', evaluaciones);
        let html = '';
        evaluaciones.forEach(eval => {
            html += `
                <tr>
                    <td>${eval.nombre_oficial || 'N/A'}</td>
                    <td>${eval.tipo_evaluacion}</td>
                    <td>${new Date(eval.fecha_evaluacion).toLocaleDateString()}</td>
                    <td>${eval.calificacion || 'N/A'}</td>
                    <td>${eval.evaluador}</td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-action" title="Ver detalles" onclick="verDetalleEvaluacion(${eval.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning btn-action" title="Editar" onclick="editarEvaluacion(${eval.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-action" title="Eliminar" onclick="eliminarEvaluacion(${eval.id}, '${eval.nombre_oficial || 'esta evaluación'}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar evaluaciones:', error);
        mostrarMensaje('Error al cargar las evaluaciones', 'error');
    }
}

async function guardarEvaluacion(e) {
    e.preventDefault();
    
    if (!oficialSeleccionado) {
        mostrarMensaje('Debe seleccionar un oficial', 'error');
        return;
    }
    
    const form = e.target;
    const formData = new FormData(form);
    const evaluacionData = Object.fromEntries(formData.entries());
    
    // Validar calificación
    const calificacion = parseFloat(evaluacionData.calificacion);
    if (isNaN(calificacion) || calificacion < 0 || calificacion > 100) {
        mostrarMensaje('La calificación debe ser un número entre 0 y 100', 'error');
        return;
    }
    
    // Mostrar indicador de carga
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Guardando...';
    
    try {
        const response = await fetch('/api/evaluaciones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(evaluacionData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensaje('Evaluación guardada correctamente', 'success');
            limpiarFormularioEvaluacion();
            cargarEvaluaciones();
        } else {
            throw new Error(data.message || 'Error al guardar la evaluación');
        }
        
    } catch (error) {
        console.error('Error al guardar la evaluación:', error);
        mostrarMensaje(error.message || 'Error al guardar la evaluación', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function limpiarFormularioEvaluacion() {
    document.getElementById('evaluacionForm').reset();
    document.getElementById('id_oficial').value = '';
    document.getElementById('infoOficial').innerHTML = `
        <p class="mb-1 text-muted">Ningún oficial seleccionado</p>
        <small class="text-muted">Busque y seleccione un oficial de la lista</small>
    `;
    oficialSeleccionado = null;
    document.getElementById('fecha_evaluacion').valueAsDate = new Date();
}

function verDetalleEvaluacion(id) {
    // Implementar vista de detalle
    mostrarMensaje(`Vista de detalle para evaluación #${id}`, 'info');
}

function editarEvaluacion(id) {
    // Implementar edición
    mostrarMensaje(`Editar evaluación #${id}`, 'info');
}

async function eliminarEvaluacion(id, nombre) {
    if (!confirm(`¿Está seguro de eliminar la evaluación de ${nombre}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/evaluaciones/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarMensaje('Evaluación eliminada correctamente', 'success');
            cargarEvaluaciones();
        } else {
            const data = await response.json();
            throw new Error(data.message || 'Error al eliminar la evaluación');
        }
    } catch (error) {
        console.error('Error al eliminar la evaluación:', error);
        mostrarMensaje(error.message || 'Error al eliminar la evaluación', 'error');
    }
}

// Función para cambiar el estado de un oficial
async function cambiarEstadoOficial(idOficial, nuevoEstado) {
    try {
        const response = await fetch(`${API_BASE_URL}/oficiales/${idOficial}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ activo: nuevoEstado === 1 })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al actualizar el estado');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en cambiarEstadoOficial:', error);
        throw error;
    }
}

// Función para configurar la navegación entre pestañas
function setupNavigation() {
    console.log('Configurando navegación...');
    
    // Manejar clics en los enlaces de navegación
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            console.log('Navegando a:', page);
            cambiarPestana(page);
        });
    });
    
    // Manejar cambios en el hash de la URL
    window.addEventListener('popstate', function() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            cambiarPestana(hash);
        }
    });
    
    console.log('Navegación configurada correctamente');
}

// Hacer la función accesible globalmente
window.setupNavigation = setupNavigation;

// ============================================
// ============================================

// Función para cargar y mostrar el estado de los oficiales
async function cargarGraficaEstadoOficiales() {
    console.log('=== Iniciando carga de estadísticas de oficiales ===');
    
    // Obtener referencias a los elementos del DOM
    const contenedorContadores = document.getElementById('estadoOficialesContadores');
    const contadorActivos = document.getElementById('contadorActivos');
    const contadorInactivos = document.getElementById('contadorInactivos');
    const fechaActualizacion = document.getElementById('fechaActualizacion');
    const chartLoading = document.getElementById('chartLoading');
    const chartError = document.getElementById('chartError');
    
    // Función para mostrar errores en la interfaz
    const mostrarError = (mensaje) => {
        console.error(mensaje);
        if (chartError) {
            chartError.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <div>
                        <div class="fw-bold">Error</div>
                        <div class="small">${mensaje}</div>
                        <button class="btn btn-sm btn-outline-danger mt-2" onclick="cargarGraficaEstadoOficiales()">
                            <i class="fas fa-sync-alt me-1"></i> Reintentar
                        </button>
                    </div>
                </div>
            `;
            chartError.classList.remove('d-none');
        }
        if (chartLoading) chartLoading.classList.add('d-none');
        if (contenedorContadores) contenedorContadores.classList.add('d-none');
    };
    
    try {
        console.log('1. Verificando elementos del DOM...');
        
        // Verificar que los elementos existan
        if (!chartLoading) return mostrarError('No se encontró el indicador de carga');
        if (!chartError) console.warn('No se encontró el contenedor de errores');
        if (!contenedorContadores) return mostrarError('No se encontró el contenedor de contadores');
        if (!contadorActivos) return mostrarError('No se encontró el contador de activos');
        if (!contadorInactivos) return mostrarError('No se encontró el contador de inactivos');
        if (!fechaActualizacion) console.warn('No se encontró el elemento de fecha de actualización');
        
        console.log('2. Mostrando indicador de carga...');
        chartLoading?.classList.remove('d-none');
        chartError?.classList.add('d-none');
        contenedorContadores?.classList.add('d-none');
        
        console.log('3. Realizando solicitud a la API...');
        const response = await fetch(`${API_BASE_URL}/oficiales/estadisticas`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('4. Procesando respuesta...');
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error en la respuesta:', errorText);
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        if (!data || typeof data !== 'object') {
            throw new Error('Formato de datos inválido');
        }
        
        console.log('5. Actualizando interfaz...');
        contadorActivos.textContent = data.activos || 0;
        contadorInactivos.textContent = data.inactivos || 0;
        
        // Formatear fecha
        const ahora = new Date();
        const opciones = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        
        if (fechaActualizacion) {
            fechaActualizacion.textContent = ahora.toLocaleDateString('es-MX', opciones);
        }
        
        console.log('6. Mostrando resultados...');
        chartLoading?.classList.add('d-none');
        contenedorContadores?.classList.remove('d-none');
        
        console.log('=== Estadísticas cargadas correctamente ===');
        
    } catch (error) {
        console.error('Error en cargarGraficaEstadoOficiales:', error);
        mostrarError(`Error al cargar las estadísticas: ${error.message}`);
    }
}

// Hacer la función accesible globalmente
window.cargarGraficaEstadoOficiales = cargarGraficaEstadoOficiales;

// Función para inicializar el módulo de Estatus Poli
function inicializarModuloEstatusPoli() {
    console.log('Inicializando módulo de Estatus Poli...');
    const btnBuscarOficialEstatus = document.getElementById('btnBuscarOficialEstatus');
    const inputBuscarOficialEstatus = document.getElementById('buscarOficialEstatus');
    const btnGenerarPDF = document.getElementById('generarPDF');
    const estatusPoliTab = document.getElementById('estatus-poli');
    
    // Agregar evento al botón de Generar PDF
    if (btnGenerarPDF) {
        btnGenerarPDF.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botón Generar PDF clickeado');
            // Asegurarse de que la tabla de resultados esté actualizada
            const contenedorTarjetas = document.getElementById('contenedorTarjetas');
            if (contenedorTarjetas && contenedorTarjetas.children.length > 0) {
                generarPDF();
            } else {
                mostrarMensaje('No hay resultados para generar el PDF', 'warning');
            }
        });
    } else {
        console.error('No se encontró el botón de Generar PDF');
    }
    
    if (!estatusPoliTab) {
        console.error('No se encontró el elemento con ID "estatus-poli"');
        return;
    }
    
    // Cargar la gráfica cuando se muestre la pestaña
    estatusPoliTab.addEventListener('shown.bs.tab', function () {
        console.log('Mostrando pestaña de Estatus Poli');
        cargarGraficaEstadoOficiales();
    });
    
    // Función para cambiar el estado de un oficial
    async function cambiarEstadoOficial(idOficial, nuevoEstado) {
        try {
            const response = await fetch(`/api/oficiales/${idOficial}/estado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ activo: nuevoEstado })
            });

            if (!response.ok) {
                throw new Error('Error al actualizar el estado del oficial');
            }

            return await response.json();
        } catch (error) {
            console.error('Error al cambiar el estado del oficial:', error);
            throw error;
        }
    }
    
    // Función para manejar la búsqueda
    const manejarBusqueda = () => {
        console.log('Manejador de búsqueda activado');
        const termino = inputBuscarOficialEstatus ? inputBuscarOficialEstatus.value.trim() : '';
        console.log('Término de búsqueda:', termino);
        
        if (termino) {
            console.log('Iniciando búsqueda con término:', termino);
            buscarOficialEstatusPoli(termino);
        } else {
            console.log('Término de búsqueda vacío, mostrando advertencia');
            mostrarMensaje('Por favor ingrese un término de búsqueda', 'warning');
        }
    };

    // Delegación de eventos para los botones de cambiar estado
    document.addEventListener('click', async function(e) {
        const boton = e.target.closest('.toggle-status');
        if (!boton) return;
        
        const idOficial = boton.dataset.id;
        const estadoActual = parseInt(boton.dataset.actual);
        const nuevoEstado = estadoActual ? 0 : 1; // Alternar entre 1 y 0
        const textoOriginal = boton.innerHTML;
        
        try {
            // Mostrar indicador de carga
            boton.disabled = true;
            boton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            
            // Llamar a la API para cambiar el estado
            await cambiarEstadoOficial(idOficial, nuevoEstado);
            
            // Actualizar la interfaz
            const tarjeta = boton.closest('.card');
            const badgeEstado = tarjeta.querySelector('.badge');
            
            if (nuevoEstado === 1) {
                // Cambiar a activo
                badgeEstado.className = 'badge bg-success px-2 py-1';
                badgeEstado.textContent = 'ACTIVO';
                boton.className = 'btn btn-sm btn-outline-danger toggle-status';
                boton.innerHTML = '<i class="fas fa-user-times me-1"></i> Desactivar';
                boton.dataset.actual = '1';
            } else {
                // Cambiar a inactivo
                badgeEstado.className = 'badge bg-danger px-2 py-1';
                badgeEstado.textContent = 'INACTIVO';
                boton.className = 'btn btn-sm btn-outline-success toggle-status';
                boton.innerHTML = '<i class="fas fa-user-check me-1"></i> Activar';
                boton.dataset.actual = '0';
            }
            
            // Mostrar mensaje de éxito
            mostrarMensaje(`Estado actualizado correctamente a ${nuevoEstado === 1 ? 'ACTIVO' : 'INACTIVO'}`, 'success');
            
        } catch (error) {
            console.error('Error al cambiar el estado:', error);
            mostrarMensaje('Error al actualizar el estado del oficial', 'danger');
        } finally {
            // Restaurar el botón
            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        }
    });
    
    // Evento click en el botón de búsqueda
    if (btnBuscarOficialEstatus) {
        console.log('Configurando manejador de eventos para el botón de búsqueda');
        
        // Eliminar cualquier manejador de eventos existente para evitar duplicados
        btnBuscarOficialEstatus.removeEventListener('click', manejarBusqueda);
        // Agregar el manejador de eventos
        btnBuscarOficialEstatus.addEventListener('click', manejarBusqueda);
    } else {
        console.error('No se encontró el botón de búsqueda (btnBuscarOficialEstatus)');
    }
    
    // Función para manejar la tecla Enter
    const manejarBusquedaEnter = function(e) {
        if (e.key === 'Enter') {
            console.log('Tecla Enter presionada en el campo de búsqueda');
            e.preventDefault();
            manejarBusqueda();
        }
    };
    
    // Evento keypress en el input de búsqueda (para la tecla Enter)
    if (inputBuscarOficialEstatus) {
        // Eliminar cualquier manejador de eventos existente para evitar duplicados
        inputBuscarOficialEstatus.removeEventListener('keypress', manejarBusquedaEnter);
        
        // Agregar el manejador de eventos
        inputBuscarOficialEstatus.addEventListener('keypress', manejarBusquedaEnter);
        
        // Enfocar el campo de búsqueda cuando se muestra la pestaña
        estatusPoliTab.addEventListener('shown.bs.tab', function() {
            inputBuscarOficialEstatus.focus();
        });
    }
    
    // Configurar botón de generación de PDF
    if (btnGenerarPDF) {
        btnGenerarPDF.addEventListener('click', generarPDF);
    }
}
async function buscarOficialEstatusPoli(termino) {
    console.log('Buscando oficial con término:', termino);
    const resultadoBusqueda = document.getElementById('resultadoBusqueda');
    const contenedorTarjetas = document.getElementById('contenedorTarjetas');
    
    try {
        // Mostrar indicador de carga
        if (resultadoBusqueda) {
            resultadoBusqueda.classList.remove('d-none');
            resultadoBusqueda.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        if (contenedorTarjetas) {
            contenedorTarjetas.innerHTML = `
                <div class="col-12 text-center my-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Buscando...</span>
                    </div>
                    <p class="mt-2">Buscando oficiales...</p>
                </div>`;
        } else {
            console.error('No se encontró el contenedor de tarjetas');
            return;
        }
        
        if (!termino || termino.trim() === '') {
            mostrarMensaje('Por favor ingresa un término de búsqueda', 'warning');
            return;
        }
        
        console.log('Realizando búsqueda en el servidor...');
        const response = await fetch(`/api/oficiales/buscar?termino=${encodeURIComponent(termino)}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error en la respuesta del servidor:', errorText);
            throw new Error(`Error en la búsqueda: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Resultados de la búsqueda recibidos:', data);
        
        if (data && data.success && Array.isArray(data.data)) {
            console.log(`Se encontraron ${data.data.length} resultados`);
            // Asegurarse de que el campo 'activo' esté presente en cada oficial
            const oficialesConEstado = data.data.map((oficial, index) => ({
                ...oficial,
                id: oficial.id || `temp-${index}`, // Asegurar que siempre tenga un ID
                activo: oficial.activo !== undefined ? oficial.activo : 1 // Por defecto, activo=1 si no está definido
            }));
            
            mostrarResultadosEstatusPoli(oficialesConEstado);
        } else {
            console.log('No se encontraron resultados o formato de respuesta inesperado');
            mostrarResultadosEstatusPoli([]);
        }
    } catch (error) {
        console.error('Error al buscar oficiales:', error);
        mostrarMensaje('Error al realizar la búsqueda. Por favor, intente nuevamente.', 'danger');
        
        // Mostrar mensaje de error en la interfaz
        if (contenedorTarjetas) {
            contenedorTarjetas.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        ${error.message || 'No se pudieron cargar los resultados. Por favor, intente nuevamente.'}
                    </div>
                </div>`;
        }
        
        // Asegurarse de que la sección de resultados sea visible
        if (resultadoBusqueda) {
            resultadoBusqueda.classList.remove('d-none');
        }
    }
}

// Función para mostrar los resultados de la búsqueda en tarjetas
function mostrarResultadosEstatusPoli(oficiales) {
    console.log('Mostrando resultados de búsqueda:', oficiales);
    const contenedorTarjetas = document.getElementById('contenedorTarjetas');
    const cuerpoTabla = document.getElementById('cuerpoTabla');
    const resultadoBusqueda = document.getElementById('resultadoBusqueda');
    
    if (!contenedorTarjetas || !resultadoBusqueda) {
        console.error('No se encontraron los elementos para mostrar los resultados');
        mostrarMensaje('Error al mostrar los resultados. Por favor, recarga la página.', 'danger');
        return;
    }
    
    // Asegurarse de que la sección de resultados sea visible
    resultadoBusqueda.classList.remove('d-none');
    
    // Limpiar contenedores
    contenedorTarjetas.innerHTML = '';
    if (cuerpoTabla) {
        cuerpoTabla.innerHTML = '';
    }
    
    if (!oficiales || oficiales.length === 0) {
        console.log('No se encontraron resultados para la búsqueda');
        contenedorTarjetas.innerHTML = `
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center py-4">
                        <i class="fas fa-search fa-3x text-muted mb-3"></i>
                        <h5 class="card-title">No se encontraron resultados</h5>
                        <p class="card-text">Intenta con otros términos de búsqueda</p>
                    </div>
                </div>
            </div>`;
        resultadoBusqueda.classList.remove('d-none');
        resultadoBusqueda.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    
    // Llenar las tarjetas con los resultados
    oficiales.forEach(oficial => {
        // Formatear la fecha de ingreso
        let fechaIngreso = 'N/A';
        if (oficial.fecha_ingreso) {
            const fecha = new Date(oficial.fecha_ingreso);
            fechaIngreso = fecha.toLocaleDateString('es-MX');
        }
        
        // Crear tarjeta
        const tarjeta = document.createElement('div');
        tarjeta.className = 'col-12 col-md-6 col-lg-4';
        const estaActivo = oficial.activo === 1 || oficial.activo === true;
        const estadoClase = estaActivo ? 'bg-success' : 'bg-danger';
        const estadoTexto = estaActivo ? 'ACTIVO' : 'INACTIVO';
        
        tarjeta.innerHTML = `
            <div class="card h-100 shadow-sm">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">${oficial.nombre_completo || 'N/A'}</h5>
                    <span class="badge ${estadoClase} px-2 py-1">${estadoTexto}</span>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <h6 class="text-muted mb-2">Información Básica</h6>
                        <p class="mb-1"><strong>CURP:</strong> ${oficial.curp || 'N/A'}</p>
                        <p class="mb-1"><strong>CUIP:</strong> ${oficial.cuip || 'N/A'}</p>
                        <p class="mb-1"><strong>CUP:</strong> ${oficial.cup || 'N/A'}</p>
                        <p class="mb-1"><strong>Edad:</strong> ${oficial.edad || 'N/A'}</p>
                        <p class="mb-1"><strong>Sexo:</strong> ${oficial.sexo || 'N/A'}</p>
                        <p class="mb-0"><strong>Estado Civil:</strong> ${oficial.estado_civil || 'N/A'}</p>
                    </div>
                    <hr>
                    <div class="mb-3">
                        <h6 class="text-muted mb-2">Información Laboral</h6>
                        <p class="mb-1"><strong>Área de Adscripción:</strong> ${oficial.area_adscripcion || 'N/A'}</p>
                        <p class="mb-1"><strong>Grado:</strong> ${oficial.grado || 'N/A'}</p>
                        <p class="mb-1"><strong>Cargo Actual:</strong> ${oficial.cargo_actual || 'N/A'}</p>
                        <p class="mb-1"><strong>Fecha de Ingreso:</strong> ${fechaIngreso}</p>
                        <p class="mb-0"><strong>Función:</strong> ${oficial.funcion || 'N/A'}</p>
                    </div>
                    <hr>
                    <div class="mb-3">
                        <h6 class="text-muted mb-2">Contacto</h6>
                        <p class="mb-1"><strong>Teléfono:</strong> ${oficial.telefono_contacto || 'N/A'}</p>
                        <p class="mb-0"><strong>Emergencia:</strong> ${oficial.telefono_emergencia || 'N/A'}</p>
                    </div>
                </div>
                <div class="card-footer bg-transparent border-top-0 d-flex justify-content-between">
                    <button class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-eye me-1"></i> Ver Detalles
                    </button>
                    <button class="btn btn-sm ${estaActivo ? 'btn-outline-danger' : 'btn-outline-success'} toggle-status" 
                            data-id="${oficial.id}" 
                            data-actual="${estaActivo ? 1 : 0}">
                        <i class="fas ${estaActivo ? 'fa-user-times' : 'fa-user-check'} me-1"></i>
                        ${estaActivo ? 'Desactivar' : 'Activar'}
                    </button>
                </div>
            </div>`;
        
        contenedorTarjetas.appendChild(tarjeta);
        
        // También llenar la tabla oculta para el PDF
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${oficial.nombre_completo || 'N/A'}</td>
            <td>${oficial.curp || 'N/A'}</td>
            <td>${oficial.cuip || 'N/A'}</td>
            <td>${oficial.cup || 'N/A'}</td>
            <td>${oficial.edad || 'N/A'}</td>
            <td>${oficial.sexo || 'N/A'}</td>
            <td>${oficial.estado_civil || 'N/A'}</td>
            <td>${oficial.area_adscripcion || 'N/A'}</td>
            <td>${oficial.grado || 'N/A'}</td>
            <td>${oficial.cargo_actual || 'N/A'}</td>
            <td>${fechaIngreso}</td>
            <td>${oficial.telefono_contacto || 'N/A'}</td>
            <td>${oficial.telefono_emergencia || 'N/A'}</td>
            <td>${oficial.funcion || 'N/A'}</td>
        `;
        cuerpoTabla.appendChild(fila);
    });
    
    // Mostrar resultados
    resultadoBusqueda.classList.remove('d-none');
    resultadoBusqueda.scrollIntoView({ behavior: 'smooth' });
}

// Función para generar PDF con los resultados
function generarPDF() {
    console.log('Generando PDF...');
    
    // Verificar si jsPDF está disponible
    if (typeof window.jspdf === 'undefined') {
        console.error('jsPDF no está disponible');
        mostrarMensaje('Error: La función de generación de PDF no está disponible', 'danger');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    
    // Crear un nuevo documento
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });
    
    const tabla = document.getElementById('tablaResultados');
    
    if (!tabla) {
        console.error('No se encontró la tabla de resultados');
        mostrarMensaje('Error: No se encontraron datos para generar el PDF', 'danger');
        return;
    }
    
    // Configuración de estilos
    const primaryColor = [0, 0, 0];
    const headerBgColor = [7, 4, 99];
    const headerTextColor = [255, 255, 255];
    const sectionBgColor = [240, 240, 255];
    const textColor = [50, 50, 50];
    const borderColor = [7, 4, 99];
    const sectionBorderColor = [7, 4, 99];
    const cellBgColor = [245, 245, 255];
    const accentColor = [50, 50, 150];
    const lightBlueBg = [225, 230, 255];
    
    // Tamaños y márgenes
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const headerHeight = 25;
    
    // Dibujar marco azul alrededor de la página
    doc.setDrawColor(...sectionBorderColor);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // Función para agregar el logo
    const addLogo = () => {
        return new Promise((resolve) => {
            const logoUrl = '/img/logo_ssc.jpg';
            const img = new Image();
            
            img.onload = function() {
                const imgWidth = 30;
                const imgHeight = (this.height * imgWidth) / this.width;
                
                // Agregar el logo en la esquina superior derecha
                doc.addImage(
                    img, 
                    'JPEG', 
                    pageWidth - imgWidth - margin,
                    margin,
                    imgWidth,
                    imgHeight
                );
                
                resolve(imgHeight + margin + 5);
            };
            
            img.onerror = function() {
                console.error('Error al cargar el logo');
                resolve(0);
            };
            
            img.crossOrigin = 'Anonymous';
            img.src = logoUrl;
        });
    };
    
    // Función para generar el contenido del PDF con el diseño del ejemplo
    const generatePDFContent = async () => {
        try {
            // Configuración de márgenes y estilos
            const margin = 10;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let currentY = 15;
            
            // Agregar el logo en la esquina superior izquierda
            const logoWidth = 30;
            const logoHeight = 40;
            const logoAdded = await new Promise((resolve) => {
                // Intentar cargar el logo
                const logoUrl = '/img/logo1.jpg';
                const img = new Image();
                
                img.onload = function() {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = this.naturalWidth;
                        canvas.height = this.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(this, 0, 0);
                        const dataURL = canvas.toDataURL('image/jpeg');
                        doc.addImage(dataURL, 'JPEG', margin, currentY, logoWidth, logoHeight);
                        console.log('Logo agregado correctamente al PDF');
                        resolve(true);
                    } catch (e) {
                        console.warn('Error al procesar el logo:', e);
                        resolve(false);
                    }
                };
                
                img.onerror = function() {
                    console.warn('No se pudo cargar el logo, usando texto alternativo');
                    resolve(false);
                };
                
                // Establecer la fuente de la imagen después de los manejadores de eventos
                img.crossOrigin = 'Anonymous';
                img.src = logoUrl;
                
                // Timeout en caso de que la imagen tarde demasiado en cargar
                setTimeout(() => {
                    if (!img.complete) {
                        console.warn('Tiempo de espera agotado para cargar el logo');
                        resolve(false);
                    }
                }, 2000);
            });
            
            // Si no se pudo cargar el logo, agregar texto alternativo
            if (!logoAdded) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('LOGO', margin + 5, currentY + 20);
            }
            
            // Título del documento
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('SSC DE TIZAYUCA HIDALGO', pageWidth / 2, currentY + 15, { align: 'center' });
            doc.text('SECRETARÍA DE SEGURIDAD CIUDADANA', pageWidth / 2, currentY + 25, { align: 'center' });
            
            // Fecha de generación
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(
                `FECHA: ${new Date().toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })}`,
                pageWidth - margin,
                currentY + 15,
                { align: 'right' }
            );
            
            // Título principal
            currentY += 40;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Informacion personal del policia', pageWidth / 2, currentY, { align: 'center' });
            
            // Línea divisoria
            currentY += 10;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            
            // Espacio después del encabezado
            currentY += 20;
            
            // Obtener datos del oficial
            const table = document.getElementById('tablaResultados');
            if (!table || !table.rows || table.rows.length <= 1) {
                throw new Error('No se encontraron datos del oficial');
            }
            
            // Obtener los datos de la primera fila (datos del oficial)
            const dataRow = table.rows[1];
            const cells = Array.from(dataRow.cells);
            
            // Mapeo de campos a mostrar (índice: etiqueta)
            const fields = [
                'NOMBRE',
                'CURP',
                'CUIP',
                'CUP',
                'EDAD',
                'SEXO',
                'ESTADO CIVIL',
                'ÁREA DE ADSCRIPCIÓN',
                'GRADO',
                'CARGO ACTUAL',
                'FECHA DE INGRESO',
                'TELÉFONO',
                'TELÉFONO DE EMERGENCIA',
                'FUNCIÓN'
            ];
            
            // Configuración de estilos para los campos
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            const fieldHeight = 8;
            const valueIndent = 80;
            
            // Dibujar cada campo y su valor
            fields.forEach((field, index) => {
                if (index < cells.length) {
                    const value = cells[index].textContent.trim() || 'N/A';
                    
                    // Dibujar etiqueta del campo
                    doc.setFillColor(240, 240, 240);
                    doc.rect(margin, currentY, valueIndent - 5, fieldHeight, 'F');
                    doc.setTextColor(0, 0, 0);
                    doc.text(field, margin + 2, currentY + 5);
                    
                    // Dibujar valor del campo
                    doc.setFillColor(255, 255, 255);
                    doc.rect(valueIndent, currentY, pageWidth - valueIndent - margin, fieldHeight, 'F');
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(valueIndent, currentY, pageWidth - valueIndent - margin, fieldHeight);
                    doc.setFont('helvetica', 'normal');
                    doc.text(value, valueIndent + 2, currentY + 5);
                    doc.setFont('helvetica', 'bold');
                    
                    currentY += fieldHeight;
                    
                    // Agregar espacio después de cada grupo de campos
                    if ((index + 1) % 3 === 0) {
                        currentY += 5;
                    }
                }
            });
            
            // Pie de página
            currentY = pageHeight - 40;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('--------------------------', pageWidth / 2, currentY, { align: 'center' });
            doc.text('Nombre y Firma.', pageWidth / 2, currentY, { align: 'center' });
            
            // Guardar el PDF
            doc.save('constancia_servicio.pdf');
            
        } catch (error) {
            console.error('Error al generar el PDF:', error);
            mostrarMensaje('Error al generar el PDF: ' + error.message, 'danger');
        }
    };
    
    // Función auxiliar para cargar imágenes en base64
    function getBase64Image(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = this.width;
                canvas.height = this.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(this, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg');
                resolve(dataURL);
            };
            img.onerror = reject;
            img.src = url;
        });
    }
    
    // Iniciar la generación del PDF
    generatePDFContent();
    
    // Verificar si hay datos en la tabla de resultados
    const table = document.getElementById('tablaResultados');
    if (!table || !table.rows || table.rows.length <= 1) {
        mostrarMensaje('No se encontraron datos para generar el reporte', 'warning');
        return;
    }

    // Configuración de estilos para el documento
    doc.setFont('helvetica');
    doc.setFontSize(9);
    
    // Función auxiliar para manejar el texto que ocupa múltiples líneas
    const getTextLines = (text, maxWidth) => {
        if (!text) return [];
        const words = text.toString().split(' ');
        if (words.length === 0) return [];
        
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = doc.getStringUnitWidth(currentLine + ' ' + word) * doc.getFontSize() / doc.internal.scaleFactor;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    // Dibujar cada campo en la cuadrícula
    fields.forEach((field, index) => {
        const value = cells[index] ? cells[index].textContent.trim() : 'N/A';
        
        // Calcular posición
        const row = Math.floor(index / fieldsPerRow);
        const col = index % fieldsPerRow;
        const x = marginX + (col * (colWidth + (cellPadding * 2)));
        
        // Calcular altura necesaria para el contenido
        const labelLines = getTextLines(field.label, colWidth - 6);
        const valueLines = getTextLines(value, colWidth - 6);
        const lineHeight = 4; // Altura de cada línea
        const padding = 3; // Espaciado interno
        const labelHeight = labelLines.length * lineHeight + padding;
        const valueHeight = valueLines.length * lineHeight + padding;
        const totalHeight = Math.max(cellHeight, labelHeight + valueHeight + padding);
        
        // Calcular Y basado en la fila y la altura de las celdas anteriores
        let y = gridStartY;
        if (row > 0) {
            // Calcular la altura total de las filas anteriores
            for (let r = 0; r < row; r++) {
                // Encontrar la celda más alta en esta fila
                let maxRowHeight = 0;
                for (let c = 0; c < fieldsPerRow; c++) {
                    const cellIdx = r * fieldsPerRow + c;
                    if (cellIdx < fields.length) {
                        const cellValue = cells[cellIdx] ? cells[cellIdx].textContent.trim() : '';
                        const cellValueLines = getTextLines(cellValue, colWidth - 6);
                        const thisCellHeight = (cellValueLines.length + 1) * lineHeight + (padding * 2);
                        maxRowHeight = Math.max(maxRowHeight, thisCellHeight);
                    }
                }
                y += maxRowHeight + cellPadding;
            }
        }
        
        // Dibujar fondo del campo con borde granate
        doc.setFillColor(255, 245, 248); // Fondo rosa muy claro
        doc.roundedRect(x, y, colWidth, totalHeight, 2, 2, 'F');
        
        // Borde granate
        doc.setDrawColor(...sectionBorderColor);
        doc.roundedRect(x, y, colWidth, totalHeight, 2, 2, 'S');
        
        // Sombra sutil
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(x + 1, y + totalHeight + 1, x + colWidth - 1, y + totalHeight + 1);
        doc.line(x + colWidth + 1, y + 1, x + colWidth + 1, y + totalHeight - 1);
        
        // Texto de la etiqueta en granate
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...sectionBorderColor);
        doc.text(labelLines, x + 3, y + 5, { maxWidth: colWidth - 6 });
        
        // Valor en gris oscuro
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text(valueLines, x + 3, y + 5 + labelHeight, { maxWidth: colWidth - 6 });
        
        // Actualizar posición Y máxima
        currentY = Math.max(currentY, y + totalHeight + cellPadding);
    });
    
    // Ajustar para el pie de página
    currentY += 20;
    
    // Función para dibujar el pie de página
    const drawFooter = () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const footerY = pageHeight - 20;
        
        // Fondo del pie de página con degradado granate
        doc.setDrawColor(...sectionBorderColor);
        doc.setFillColor(...headerBgColor);
        doc.rect(15, footerY, pageWidth - 30, 15, 'FD');
        
        // Texto del pie de página en blanco
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        
        // Texto a la izquierda
        doc.text(
            'SSC TIZAYUCA - Información del policia',
            marginLeft,
            footerY + 8,
            { align: 'left' }
        );
        
        // Número de página centrado
        const pageCount = doc.internal.getNumberOfPages();
        doc.text(
            `Página ${pageCount} de ${pageCount}`,
            pageWidth / 2,
            footerY + 8,
            { align: 'center' }
        );
        
        // Fecha en el lado derecho
        const fechaHora = new Date().toLocaleString('es-MX');
        doc.text(
            `Generado: ${fechaHora}`,
            pageWidth - marginLeft,
            footerY + 8,
            { align: 'right' }
        );
    };
    
    // Dibujar el pie de página
    drawFooter();
    
    // Guardar el PDF
    const fechaArchivo = new Date().toISOString().split('T')[0];
    doc.save(`Reporte_Personal_Policial_${fechaArchivo}.pdf`);
    
    mostrarMensaje('PDF generado correctamente', 'success');
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== Aplicación iniciada ===');
    // Verificar si ya hay una inicialización en curso
    if (window.appInitialized) {
        console.log('La aplicación ya está inicializada');
        return;
    }
    
    // Cargar la gráfica si estamos en la pestaña de Estatus Poli
    console.log('Configurando listeners para la pestaña Estatus Poli...');
    
    // Función para manejar la carga de la gráfica
    const cargarGraficaTab = (event) => {
        console.log('=== Evento de cambio de pestaña detectado ===');
        
        // Obtener el ID de la pestaña objetivo del evento o del hash de la URL
        let targetTabId = event ? 
            (event.target.getAttribute('href') || '').replace('#', '') : 
            window.location.hash.replace('#', '');
        
        // Si no hay ID en el evento, intentar obtener la pestaña activa
        if (!targetTabId) {
            const activeTab = document.querySelector('.tab-pane.active');
            targetTabId = activeTab ? activeTab.id : '';
        }
        
        console.log('Pestaña objetivo:', targetTabId || 'ninguna');
        
        if (targetTabId === 'estatus-poli') {
            console.log('Pestaña Estatus Poli detectada, cargando gráfica...');
            // Usar setTimeout para asegurar que la transición de la pestaña se complete
            setTimeout(cargarGraficaEstadoOficiales, 100);
        }
    };
    
    // Configurar el evento para cuando se muestre cualquier pestaña
    const tabElements = document.querySelectorAll('a[data-bs-toggle="tab"]');
    console.log(`Se encontraron ${tabElements.length} elementos de pestaña`);
    
    tabElements.forEach(tab => {
        tab.addEventListener('shown.bs.tab', cargarGraficaTab);
        console.log(`Listener añadido a la pestaña: ${tab.getAttribute('href')}`);
    });
    
    // Cargar la gráfica si ya estamos en la pestaña de Estatus Poli al cargar la página
    const checkInitialTab = () => {
        console.log('=== Verificando pestaña inicial ===');
        const estatusPoliPane = document.querySelector('#estatus-poli');
        const isEstatusPoliActive = window.location.hash === '#estatus-poli' || 
                                  (estatusPoliPane && estatusPoliPane.classList.contains('active'));
        
        console.log('Hash de la URL:', window.location.hash);
        console.log('Pestaña Estatus Poli activa:', isEstatusPoliActive);
        
        if (isEstatusPoliActive) {
            console.log('Página cargada en pestaña Estatus Poli, cargando gráfica...');
            // Usar setTimeout para asegurar que el DOM esté completamente cargado
            setTimeout(() => {
                console.log('Iniciando carga de gráfica después de espera inicial...');
                cargarGraficaEstadoOficiales();
            }, 300);
        } else {
            console.log('La pestaña Estatus Poli no está activa al cargar la página');
        }
    };
    
    // Verificar la pestaña inicial cuando el DOM esté completamente cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkInitialTab);
    } else {
        // Si el DOM ya está cargado, verificar inmediatamente
        checkInitialTab();
    }
    
    // Añadir evento al botón de prueba
    const testBtn = document.getElementById('testChartBtn');
    if (testBtn) {
        testBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('=== PRUEBA DE GRÁFICA ===');
            console.log('Forzando carga de gráfica...');
            
            // Mostrar retroalimentación visual
            const originalText = testBtn.innerHTML;
            testBtn.disabled = true;
            testBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cargando...';
            
            // Forzar recarga de la gráfica
            cargarGraficaEstadoOficiales().finally(() => {
                // Restaurar el botón después de un breve retraso
                setTimeout(() => {
                    testBtn.disabled = false;
                    testBtn.innerHTML = originalText;
                }, 1000);
            });
        });
        console.log('Botón de prueba de gráfica configurado');
    }
    
    // Añadir evento al botón de actualizar
    const refreshBtn = document.getElementById('refreshChartBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Actualizando gráfica manualmente...');
            // Agregar clase de rotación al ícono
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.add('fa-spin');
                // Quitar la clase después de 1 segundo
                setTimeout(() => icon.classList.remove('fa-spin'), 1000);
            }
            cargarGraficaEstadoOficiales();
        });
        console.log('Botón de actualización de gráfica configurado');
    } else {
        console.warn('No se encontró el botón de actualización de gráfica');
    }
    window.appInitialized = true;
    
    // Verificar autenticación
    if (!checkAuth()) {
        showLogin();
        return;
    }
    
    // Mostrar dashboard
    showDashboard();
    
    // Configurar la navegación
    setupNavigation();
    
    // Inicializar el módulo de evaluaciones
    inicializarModuloEvaluaciones();
    
    // Inicializar el módulo de Estatus Poli
    inicializarModuloEstatusPoli();
    
    // Configurar la aplicación
    setupApp();
    
    // Manejar el evento de recarga de página
    window.addEventListener('beforeunload', function() {
        window.appInitialized = false;
    });
});

// Función para probar la conexión con el servidor
async function testConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/test`);
        const data = await response.json();
        console.log('Conexión con el servidor:', data);
        return data.success;
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        return false;
    }
}

// Manejar el envío del formulario de policía
if (policiaForm) {
    policiaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Mostrar indicador de carga
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
        
        try {
            // Validar campos requeridos
            const requiredFields = ['nombreCompleto', 'curp', 'cuip', 'cup', 'fechaIngreso'];
            const missingFields = [];
            
            requiredFields.forEach(field => {
                const element = document.getElementById(field);
                if (element && !element.value.trim()) {
                    missingFields.push(field);
                    element.classList.add('is-invalid');
                } else if (element) {
                    element.classList.remove('is-invalid');
                }
            });
            
            if (missingFields.length > 0) {
                throw new Error(`Por favor complete los campos requeridos: ${missingFields.join(', ')}`);
            }
            
            // Crear FormData para enviar archivos
            const formDataToSend = new FormData(this);
            
            console.log('Enviando datos al servidor...');
            
            // Mostrar los datos que se están enviando
            for (let [key, value] of formDataToSend.entries()) {
                console.log(key, value);
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/oficiales`, {
                    method: 'POST',
                    body: formDataToSend
                });
                
                console.log('Respuesta del servidor:', response.status, response.statusText);
                
                // Intentar obtener el cuerpo de la respuesta como JSON
                let data;
                try {
                    data = await response.json();
                    console.log('Datos de respuesta:', data);
                } catch (jsonError) {
                    console.error('Error al analizar la respuesta JSON:', jsonError);
                    const text = await response.text();
                    console.error('Respuesta del servidor (texto):', text);
                    throw new Error('Error en la respuesta del servidor: ' + text);
                }
                
                if (!response.ok) {
                    throw new Error(data.message || `Error del servidor: ${response.status} ${response.statusText}`);
                }
            
                if (data.success) {
                    // Mostrar mensaje de éxito
                    const successAlert = document.createElement('div');
                    successAlert.className = 'alert alert-success mt-3';
                    successAlert.textContent = 'Registro guardado exitosamente';
                    
                    // Insertar el mensaje después del formulario
                    const formContainer = policiaForm.parentElement;
                    formContainer.insertBefore(successAlert, policiaForm.nextSibling);
                    
                    // Limpiar el formulario
                    policiaForm.reset();
                    
                    // Eliminar el mensaje después de 5 segundos
                    setTimeout(() => {
                        successAlert.remove();
                    }, 5000);
                } else {
                    throw new Error(data.message || 'Error al guardar el registro');
                }
            } catch (error) {
                console.error('Error al enviar datos al servidor:', error);
                throw error; // Re-lanzar el error para que lo capture el bloque catch externo
            }
        } catch (error) {
            console.error('Error al guardar el registro:', error);
            
            // Mostrar mensaje de error detallado
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-danger mt-3';
            
            // Mostrar mensaje de error detallado en desarrollo
            let errorMessage = error.message;
            if (error.response) {
                try {
                    const errorData = await error.response.json();
                    errorMessage = errorData.message || errorMessage;
                    if (errorData.errorDetails) {
                        errorMessage += `\nDetalles: ${JSON.stringify(errorData.errorDetails, null, 2)}`;
                    }
                } catch (e) {
                    console.error('Error al procesar respuesta de error:', e);
                }
            }
            
            errorAlert.innerHTML = `
                <strong>Error al guardar el registro:</strong>
                <div class="mt-2">${errorMessage}</div>
                <button class="btn btn-sm btn-outline-secondary mt-2" onclick="this.parentElement.remove()">Cerrar</button>
            `;
            
            // Insertar el mensaje después del formulario
            const formContainer = policiaForm.parentElement;
            const existingAlert = formContainer.querySelector('.alert');
            
            if (existingAlert) {
                existingAlert.replaceWith(errorAlert);
            } else {
                formContainer.insertBefore(errorAlert, policiaForm.nextSibling);
            }
            
            // Desplazarse al mensaje de error
            errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } finally {
            // Restaurar el botón
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}

// Handle Search
if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => searchPolicia(searchInput.value.trim()));
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPolicia(this.value.trim());
        }
    });
}

async function searchPolicia(searchTerm) {
    if (!searchTerm) {
        alert('Por favor ingrese un término de búsqueda');
        return;
    }
    
    // Mostrar indicador de carga
    searchResults.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Buscando...</span></div></div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/oficiales/buscar?termino=${encodeURIComponent(searchTerm)}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (data.data && data.data.length > 0) {
                displaySearchResults(data.data);
            } else {
                searchResults.innerHTML = `
                    <div class="alert alert-info">
                        No se encontraron resultados para "${searchTerm}"
                    </div>
                `;
            }
        } else {
            throw new Error(data.message || 'Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('Error al buscar oficiales:', error);
        searchResults.innerHTML = `
            <div class="alert alert-danger">
                Error al buscar oficiales: ${error.message}
            </div>
        `;
    }
}

function displaySearchResults(resultados) {
    if (!Array.isArray(resultados) || resultados.length === 0) {
        searchResults.innerHTML = '<div class="alert alert-info">No se encontraron resultados</div>';
        return;
    }
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="mb-0">Resultados de la búsqueda</h4>
            <span class="badge bg-primary">${resultados.length} registros encontrados</span>
        </div>
    `;
    
    resultados.forEach((policia) => {
        // Formatear la fecha de ingreso
        const fechaIngreso = policia.fecha_ingreso ? new Date(policia.fecha_ingreso).toLocaleDateString('es-MX') : 'No especificada';
        
        html += `
            <div class="card mb-3">
                <div class="card-header bg-light">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${policia.nombre_completo || 'Nombre no disponible'}</h5>
                        <span class="badge bg-secondary">${policia.grado || 'Sin grado'}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Identificación:</strong></p>
                            <ul class="list-unstyled">
                                <li><strong>CURP:</strong> ${policia.curp || 'No especificado'}</li>
                                <li><strong>CUIP:</strong> ${policia.cuip || 'No especificado'}</li>
                                <li><strong>CUP:</strong> ${policia.cup || 'No especificado'}</li>
                            </ul>
                            
                            <p class="mb-1 mt-3"><strong>Información Personal:</strong></p>
                            <ul class="list-unstyled">
                                <li><strong>Edad:</strong> ${policia.edad || 'No especificada'} años</li>
                                <li><strong>Sexo:</strong> ${policia.sexo || 'No especificado'}</li>
                                <li><strong>Estado Civil:</strong> ${policia.estado_civil || 'No especificado'}</li>
                            </ul>
                        </div>
                        
                        <div class="col-md-6">
                            <p class="mb-1"><strong>Información Laboral:</strong></p>
                            <ul class="list-unstyled">
                                <li><strong>Área de Adscripción:</strong> ${policia.area_adscripcion || 'No especificada'}</li>
                                <li><strong>Cargo Actual:</strong> ${policia.cargo_actual || 'No especificado'}</li>
                                <li><strong>Fecha de Ingreso:</strong> ${fechaIngreso}</li>
                                <li><strong>Escolaridad:</strong> ${policia.escolaridad || 'No especificada'}</li>
                            </ul>
                            
                            <p class="mb-1 mt-3"><strong>Contacto:</strong></p>
                            <ul class="list-unstyled">
                                <li><strong>Teléfono:</strong> ${policia.telefono_contacto || 'No especificado'}</li>
                                <li><strong>Emergencia:</strong> ${policia.telefono_emergencia || 'No especificado'}</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <p class="mb-1"><strong>Función:</strong></p>
                        <p class="mb-3">${policia.funcion || 'No especificada'}</p>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        ${policia.pdf_nombre_archivo ? 
                            `<a href="/uploads/${policia.pdf_nombre_archivo}" 
                              target="_blank" 
                              class="btn btn-primary btn-sm">
                                <i class="fas fa-file-pdf me-1"></i> Ver Documento PDF
                            </a>` : 
                            '<span class="text-muted"><i class="fas fa-times-circle me-1"></i> Sin documento adjunto</span>'
                        }
                        <small class="text-muted">
                            Registrado el: ${new Date(policia.fecha_registro).toLocaleString('es-MX')}
                        </small>
                    </div>
                </div>
            </div>
        `;
    });
    
    searchResults.innerHTML = html;
}

// Función para probar la conexión con el servidor
async function testConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/test`);
        const data = await response.json();
        console.log('Conexión con el servidor:', data);
        return data.success;
    } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        return false;
    }
}

// Configuración inicial de la aplicación
function setupApp() {
    // Inicializar la navegación
    setupNavigation();
    
    // Probar conexión con el servidor
    testConnection();
    
    // Configurar el botón de búsqueda
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => searchPolicia(searchInput.value.trim()));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchPolicia(this.value.trim());
            }
        });
    }
}

// Función para verificar si el usuario está autenticado
function isAuthenticated() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Función para forzar el cierre de sesión al cargar la página
function forceLogout() {
    localStorage.removeItem('isLoggedIn');
    showLogin();
}

// Función para asegurar que el formulario de login sea visible
function asegurarLoginVisible() {
    console.log('Asegurando que el formulario de login sea visible...');
    
    // Obtener referencias a los elementos
    const loginContainer = document.getElementById('loginContainer');
    const dashboard = document.getElementById('dashboard');
    
    // Asegurar que el dashboard esté oculto
    if (dashboard) {
        dashboard.style.display = 'none';
        dashboard.style.visibility = 'hidden';
        dashboard.style.opacity = '0';
        dashboard.style.position = 'absolute';
        dashboard.style.height = '0';
        dashboard.style.overflow = 'hidden';
        dashboard.style.width = '0';
        dashboard.style.padding = '0';
        dashboard.style.margin = '0';
    }
    
    // Asegurar que el login sea visible
    if (loginContainer) {
        loginContainer.style.display = 'flex';
        loginContainer.style.visibility = 'visible';
        loginContainer.style.opacity = '1';
        loginContainer.style.position = 'relative';
        loginContainer.style.height = '100vh';
        loginContainer.style.width = '100%';
        loginContainer.style.alignItems = 'center';
        loginContainer.style.justifyContent = 'center';
        loginContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== INICIO: DOM completamente cargado ===');
    
    // Asegurar que el formulario de login sea visible
    asegurarLoginVisible();
    
    // Verificar si ya hay una inicialización en curso
    if (window.appInitialized) {
        console.log('La aplicación ya está inicializada, omitiendo nueva inicialización');
        return;
    }
    
    console.log('Inicializando aplicación...');
    window.appInitialized = true;
    
    try {
        // Forzar cierre de sesión al cargar la página
        forceLogout();
        
        // Inicializar la aplicación
        if (typeof initApp === 'function') {
            initApp();
        } else {
            console.error('La función initApp no está definida');
        }
        
        // Configurar la aplicación
        if (typeof setupApp === 'function') {
            setupApp();
        } else {
            console.error('La función setupApp no está definida');
        }
        
        // Inicializar el módulo de Estatus Poli
        if (document.getElementById('estatus-poli') || window.location.hash === '#estatus-poli') {
            console.log('Inicializando módulo de Estatus Poli...');
            if (typeof inicializarModuloEstatusPoli === 'function') {
                inicializarModuloEstatusPoli();
                
                // Si estamos en la pestaña de Estatus Poli, cargar la gráfica
                if (window.location.hash === '#estatus-poli' && typeof cargarGraficaEstadoOficiales === 'function') {
                    cargarGraficaEstadoOficiales();
                }
            } else {
                console.error('La función inicializarModuloEstatusPoli no está definida');
            }
        }
        
        console.log('Aplicación inicializada correctamente');
    } catch (error) {
        console.error('Error durante la inicialización de la aplicación:', error);
    }
    
    // Manejar el evento de recarga de página
    window.addEventListener('beforeunload', function() {
        window.appInitialized = false;
    });
});
