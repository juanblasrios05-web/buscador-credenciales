/**
 * BUSCADOR DE CREDENCIALES UMAX
 * Sistema de búsqueda seguro con validación de identidad
 * Universidad María Auxiliadora - UMAX
 */

// ====================================
// VARIABLES GLOBALES
// ====================================
let allData = [];
let datosEstudiante = null;
let busquedasRealizadas = 0;
const LIMITE_BUSQUEDAS = 20;
const TIEMPO_RESET = 3600000; // 1 hora en ms
const intentosFallidos = [];

// ====================================
// CARGAR DATOS AL INICIAR
// ====================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎓 Inicializando Portal de Credenciales UMAX...');
    cargarDatos();
    configurarEventos();
    resetearContadorBusquedas();
});

/**
 * Cargar datos desde JSON
 */
async function cargarDatos() {
    try {
        const response = await fetch('datos_nuevo.json');
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo de datos');
        }
        allData = await response.json();
        console.log(`✅ ${allData.length} registros cargados correctamente`);
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        mostrarMensaje('error', 'No se pudieron cargar los datos. Por favor, contacte al administrador.');
    }
}

/**
 * Configurar eventos del formulario
 */
function configurarEventos() {
    const btnBuscar = document.getElementById('btnBuscar');
    const codigoInput = document.getElementById('codigoInput');
    const validacionInput = document.getElementById('validacionInput');
    
    // Botón buscar
    btnBuscar.addEventListener('click', realizarBusqueda);
    
    // Enter en los inputs
    codigoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') validacionInput.focus();
    });
    
    validacionInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') realizarBusqueda();
    });
    
    // Solo números en validación
    validacionInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
}

// ====================================
// BÚSQUEDA Y VALIDACIÓN
// ====================================

/**
 * Realizar búsqueda con validación de identidad
 */
async function realizarBusqueda() {
    // Validar límite de búsquedas
    if (!validarLimiteBusquedas()) {
        return;
    }
    
    // Obtener valores
    const codigo = document.getElementById('codigoInput').value.trim();
    const validacion = document.getElementById('validacionInput').value.trim();
    
    // Validar campos
    if (!codigo) {
        mostrarMensaje('warning', '⚠️ Por favor, ingrese su código de estudiante');
        document.getElementById('codigoInput').focus();
        return;
    }
    
    if (!validacion || validacion.length !== 4) {
        mostrarMensaje('warning', '⚠️ Por favor, ingrese los últimos 4 dígitos de su documento');
        document.getElementById('validacionInput').focus();
        return;
    }
    
    // Mostrar loader
    mostrarLoader(true);
    ocultarMensaje();
    
    // Simular delay de búsqueda (seguridad)
    await sleep(800);
    
    // Buscar estudiante
    const estudiante = buscarPorCodigo(codigo);
    
    if (!estudiante) {
        registrarIntentoFallido(codigo);
        mostrarLoader(false);
        mostrarMensaje('error', '❌ No se encontró ningún estudiante con ese código. Verifique e intente nuevamente.');
        return;
    }
    
    // Validar últimos 4 dígitos del código como verificación
    const ultimos4Codigo = estudiante.codigo.slice(-4);
    
    if (validacion !== ultimos4Codigo) {
        registrarIntentoFallido(codigo);
        mostrarLoader(false);
        mostrarMensaje('error', '❌ Los datos no coinciden. Verifique los últimos 4 dígitos de su documento.');
        
        // Bloquear después de 3 intentos fallidos
        if (contarIntentosFallidosRecientes(codigo) >= 3) {
            bloquearBusqueda(300000); // 5 minutos
        }
        return;
    }
    
    // Éxito - Mostrar credenciales
    datosEstudiante = estudiante;
    mostrarLoader(false);
    mostrarCredenciales(estudiante);
}

/**
 * Buscar estudiante por código (búsqueda exacta)
 */
function buscarPorCodigo(codigo) {
    // Limpiar código (solo números)
    const codigoLimpio = codigo.replace(/[^0-9]/g, '');
    
    // Buscar coincidencia exacta
    return allData.find(estudiante => {
        const codigoEstudiante = estudiante.codigo.replace(/[^0-9]/g, '');
        return codigoEstudiante === codigoLimpio;
    });
}

/**
 * Validar límite de búsquedas por sesión
 */
function validarLimiteBusquedas() {
    if (busquedasRealizadas >= LIMITE_BUSQUEDAS) {
        mostrarMensaje('error', 
            `❌ Ha excedido el límite de ${LIMITE_BUSQUEDAS} búsquedas por hora. ` +
            `Por favor, intente más tarde o contacte al administrador.`
        );
        return false;
    }
    busquedasRealizadas++;
    return true;
}

/**
 * Registrar intento fallido
 */
function registrarIntentoFallido(codigo) {
    intentosFallidos.push({
        codigo: codigo,
        timestamp: Date.now()
    });
    
    // Limpiar intentos antiguos (más de 10 minutos)
    const hace10Min = Date.now() - 600000;
    intentosFallidos.splice(0, intentosFallidos.length, 
        ...intentosFallidos.filter(i => i.timestamp > hace10Min)
    );
}

/**
 * Contar intentos fallidos recientes para un código
 */
function contarIntentosFallidosRecientes(codigo) {
    const hace5Min = Date.now() - 300000;
    return intentosFallidos.filter(i => 
        i.codigo === codigo && i.timestamp > hace5Min
    ).length;
}

/**
 * Bloquear búsqueda temporalmente
 */
function bloquearBusqueda(tiempo) {
    const minutos = Math.floor(tiempo / 60000);
    mostrarMensaje('error', 
        `🔒 Demasiados intentos fallidos. Su acceso ha sido bloqueado temporalmente por ${minutos} minutos. ` +
        `Por seguridad, no se permiten múltiples intentos fallidos.`
    );
    
    document.getElementById('btnBuscar').disabled = true;
    document.getElementById('codigoInput').disabled = true;
    document.getElementById('validacionInput').disabled = true;
    
    setTimeout(() => {
        document.getElementById('btnBuscar').disabled = false;
        document.getElementById('codigoInput').disabled = false;
        document.getElementById('validacionInput').disabled = false;
        mostrarMensaje('success', '✅ Puede volver a intentar la búsqueda.');
    }, tiempo);
}

/**
 * Resetear contador de búsquedas cada hora
 */
function resetearContadorBusquedas() {
    setInterval(() => {
        busquedasRealizadas = 0;
        console.log('🔄 Contador de búsquedas reseteado');
    }, TIEMPO_RESET);
}

// ====================================
// MOSTRAR RESULTADOS
// ====================================

/**
 * Mostrar credenciales del estudiante
 */
function mostrarCredenciales(estudiante) {
    // Ocultar formulario de búsqueda
    document.querySelector('.search-card').style.display = 'none';
    document.querySelector('.bienvenida-card').style.display = 'none';
    
    // Llenar datos personales
    document.getElementById('nombreCompleto').textContent = 
        `${estudiante.nombre} ${estudiante.apellido}`;
    document.getElementById('codigoEstudiante').textContent = estudiante.codigo;
    document.getElementById('grupoEstudiante').textContent = estudiante.grupo || 'No asignado';
    
    // Llenar biblioteca
    document.getElementById('usuarioBiblio').textContent = estudiante.usuario_biblio;
    document.getElementById('passBiblio').dataset.password = estudiante.pass_biblio;
    
    // Llenar aula virtual
    document.getElementById('usuarioAV').textContent = estudiante.usuario_av;
    document.getElementById('passAV').dataset.password = estudiante.pass_biblio;
    
    // Llenar portal
    document.getElementById('usuarioPortal').textContent = estudiante.usuario_portal;
    document.getElementById('passPortal').dataset.password = estudiante.pass_general;
    
    // Llenar correo
    document.getElementById('correoInstitucional').textContent = estudiante.correo;
    document.getElementById('passCorreo').dataset.password = estudiante.pass_general;
    
    // Mostrar área de resultados
    document.getElementById('resultadoArea').style.display = 'block';
    
    // Scroll suave al inicio de resultados
    document.getElementById('resultadoArea').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

/**
 * Nueva búsqueda
 */
function nuevaBusqueda() {
    // Limpiar formulario
    document.getElementById('codigoInput').value = '';
    document.getElementById('validacionInput').value = '';
    
    // Ocultar resultados
    document.getElementById('resultadoArea').style.display = 'none';
    
    // Mostrar formulario
    document.querySelector('.search-card').style.display = 'block';
    document.querySelector('.bienvenida-card').style.display = 'block';
    
    // Resetear contraseñas ocultas
    document.querySelectorAll('.password-field').forEach(field => {
        field.textContent = '••••••••';
    });
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Focus en código
    setTimeout(() => {
        document.getElementById('codigoInput').focus();
    }, 500);
}

// ====================================
// FUNCIONES DE CONTRASEÑAS
// ====================================

/**
 * Mostrar/ocultar contraseña
 */
function togglePassword(elementId) {
    const element = document.getElementById(elementId);
    const password = element.dataset.password;
    
    if (element.textContent === '••••••••') {
        element.textContent = password;
    } else {
        element.textContent = '••••••••';
    }
}

/**
 * Copiar texto al portapapeles
 */
async function copiarTexto(elementId) {
    const element = document.getElementById(elementId);
    const texto = element.textContent;
    
    try {
        await navigator.clipboard.writeText(texto);
        mostrarNotificacionCopiado(element);
    } catch (err) {
        console.error('Error al copiar:', err);
        alert('No se pudo copiar el texto. Por favor, inténtelo manualmente.');
    }
}

/**
 * Copiar contraseña (desde dataset)
 */
async function copiarPassword(elementId) {
    const element = document.getElementById(elementId);
    const password = element.dataset.password;
    
    try {
        await navigator.clipboard.writeText(password);
        mostrarNotificacionCopiado(element);
    } catch (err) {
        console.error('Error al copiar:', err);
        alert('No se pudo copiar la contraseña. Por favor, inténtelo manualmente.');
    }
}

/**
 * Mostrar notificación de copiado
 */
function mostrarNotificacionCopiado(element) {
    const notif = document.createElement('span');
    notif.textContent = '✓ Copiado';
    notif.style.cssText = `
        position: absolute;
        background: #28a745;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 0.85rem;
        margin-left: 10px;
        animation: fadeOut 2s forwards;
    `;
    
    element.parentElement.style.position = 'relative';
    element.parentElement.appendChild(notif);
    
    setTimeout(() => notif.remove(), 2000);
}

// ====================================
// UI HELPERS
// ====================================

/**
 * Mostrar/ocultar loader
 */
function mostrarLoader(mostrar) {
    const loader = document.getElementById('loader');
    loader.style.display = mostrar ? 'block' : 'none';
}

/**
 * Mostrar mensaje de estado
 */
function mostrarMensaje(tipo, texto) {
    const mensaje = document.getElementById('mensajeEstado');
    mensaje.className = `mensaje-estado ${tipo}`;
    mensaje.textContent = texto;
    mensaje.style.display = 'block';
    
    // Auto-ocultar después de 5 segundos (excepto errores críticos)
    if (tipo !== 'error') {
        setTimeout(() => {
            mensaje.style.display = 'none';
        }, 5000);
    }
}

/**
 * Ocultar mensaje
 */
function ocultarMensaje() {
    const mensaje = document.getElementById('mensajeEstado');
    mensaje.style.display = 'none';
}

/**
 * Sleep helper (para delays)
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ====================================
// CSS ANIMATIONS
// ====================================
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(style);

console.log('✅ Portal de Credenciales UMAX cargado correctamente');
