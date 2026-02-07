/**
 * BUSCADOR DE CREDENCIALES UMAX
 * Búsqueda por Usuario de Aula Virtual (número de documento)
 */

let allData = [];
let datosEstudiante = null;
let busquedasRealizadas = 0;
const LIMITE_BUSQUEDAS = 20;
const TIEMPO_RESET = 3600000;
const intentosFallidos = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎓 Iniciando Portal UMAX...');
    cargarDatos();
    configurarEventos();
    resetearContadorBusquedas();
});

async function cargarDatos() {
    try {
        const response = await fetch('datos.json');
        if (!response.ok) throw new Error('Error al cargar datos');
        allData = await response.json();
        console.log(`✅ ${allData.length} registros cargados`);
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('error', 'No se pudieron cargar los datos');
    }
}

function configurarEventos() {
    const btnBuscar = document.getElementById('btnBuscar');
    const codigoInput = document.getElementById('codigoInput');
    const validacionInput = document.getElementById('validacionInput');
    
    btnBuscar.addEventListener('click', realizarBusqueda);
    codigoInput.addEventListener('keypress', e => e.key === 'Enter' && validacionInput.focus());
    validacionInput.addEventListener('keypress', e => e.key === 'Enter' && realizarBusqueda());
    validacionInput.addEventListener('input', e => e.target.value = e.target.value.slice(0, 5));
}

async function realizarBusqueda() {
    if (!validarLimiteBusquedas()) return;
    
    const nombreBuscar = document.getElementById('codigoInput').value.trim();
    const validacion = document.getElementById('validacionInput').value.trim();
    
    if (!nombreBuscar || nombreBuscar.length < 3) {
        mostrarMensaje('warning', '⚠️ Ingrese su nombre (mínimo 3 caracteres)');
        return;
    }
    
    if (!validacion || validacion.length < 4) {
        mostrarMensaje('warning', '⚠️ Ingrese los últimos 4 caracteres');
        return;
    }
    
    mostrarLoader(true);
    ocultarMensaje();
    await sleep(800);
    
    const resultados = buscarPorNombre(nombreBuscar);
    
    if (resultados.length === 0) {
        registrarIntentoFallido(nombreBuscar);
        mostrarLoader(false);
        mostrarMensaje('error', '❌ No se encontró ningún estudiante con ese nombre');
        return;
    }
    
    // Si hay múltiples coincidencias, filtrar por últimos 4 del documento
    let estudiante;
    if (resultados.length > 1) {
        estudiante = resultados.find(est => est.usuario_av.slice(-4).toLowerCase() === validacion.toLowerCase());
        if (!estudiante) {
            mostrarLoader(false);
            mostrarMensaje('error', `❌ Se encontraron ${resultados.length} estudiantes. Los últimos 4 dígitos no coinciden con ninguno.`);
            return;
        }
    } else {
        estudiante = resultados[0];
    }
    
    const ultimos4 = estudiante.usuario_av.slice(-4).toLowerCase();
    
    if (validacion.toLowerCase() !== ultimos4) {
        registrarIntentoFallido(usuarioAV);
        mostrarLoader(false);
        mostrarMensaje('error', `❌ Los últimos 4 no coinciden. Termina en: "${ultimos4}"`);
        if (contarIntentosFallidosRecientes(usuarioAV) >= 3) bloquearBusqueda(300000);
        return;
    }
    
    datosEstudiante = estudiante;
    mostrarLoader(false);
    mostrarCredenciales(estudiante);
}

function buscarPorNombre(nombre) {
    const nombreNormalizado = nombre.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ñ/g, 'n')
        .trim();
    
    const terminos = nombreNormalizado.split(/\s+/);
    
    return allData.filter(estudiante => {
        const nombreCompleto = `${estudiante.nombre} ${estudiante.apellido}`.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ñ/g, 'n');
        
        return terminos.every(termino => nombreCompleto.includes(termino));
    });
}

function mostrarCredenciales(est) {
    document.querySelector('.search-card').style.display = 'none';
    document.querySelector('.bienvenida-card').style.display = 'none';
    
    document.getElementById('nombreCompleto').textContent = `${est.nombre} ${est.apellido}`;
    document.getElementById('codigoEstudiante').textContent = est.codigo;
    document.getElementById('grupoEstudiante').textContent = est.grupo || 'No asignado';
    
    document.getElementById('usuarioBiblio').textContent = est.usuario_biblio;
    document.getElementById('passBiblio').dataset.password = est.pass_biblio;
    
    document.getElementById('usuarioAV').textContent = est.usuario_av;
    document.getElementById('passAV').dataset.password = est.pass_general;
    
    document.getElementById('usuarioPortal').textContent = est.usuario_portal;
    document.getElementById('passPortal').dataset.password = est.pass_general;
    
    document.getElementById('correoInstitucional').textContent = est.correo;
    document.getElementById('passCorreo').dataset.password = est.pass_general;
    
    document.getElementById('resultadoArea').style.display = 'block';
    document.getElementById('resultadoArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function nuevaBusqueda() {
    document.getElementById('codigoInput').value = '';
    document.getElementById('validacionInput').value = '';
    document.getElementById('resultadoArea').style.display = 'none';
    document.querySelector('.search-card').style.display = 'block';
    document.querySelector('.bienvenida-card').style.display = 'block';
    document.querySelectorAll('.password-field').forEach(f => f.textContent = '••••••••');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => document.getElementById('codigoInput').focus(), 500);
}

function togglePassword(elementId) {
    const el = document.getElementById(elementId);
    const pw = el.dataset.password;
    el.textContent = el.textContent === '••••••••' ? pw : '••••••••';
}

async function copiarTexto(elementId) {
    try {
        await navigator.clipboard.writeText(document.getElementById(elementId).textContent);
        mostrarNotificacionCopiado(document.getElementById(elementId));
    } catch (err) {
        alert('No se pudo copiar');
    }
}

async function copiarPassword(elementId) {
    try {
        await navigator.clipboard.writeText(document.getElementById(elementId).dataset.password);
        mostrarNotificacionCopiado(document.getElementById(elementId));
    } catch (err) {
        alert('No se pudo copiar la contraseña');
    }
}

function mostrarNotificacionCopiado(el) {
    const notif = document.createElement('span');
    notif.textContent = '✓ Copiado';
    notif.style.cssText = 'position:absolute;background:#28a745;color:white;padding:5px 10px;border-radius:4px;font-size:0.85rem;margin-left:10px;animation:fadeOut 2s forwards';
    el.parentElement.style.position = 'relative';
    el.parentElement.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

function validarLimiteBusquedas() {
    if (busquedasRealizadas >= LIMITE_BUSQUEDAS) {
        mostrarMensaje('error', '❌ Límite de 20 búsquedas por hora alcanzado');
        return false;
    }
    busquedasRealizadas++;
    return true;
}

function registrarIntentoFallido(codigo) {
    intentosFallidos.push({ codigo, timestamp: Date.now() });
    const hace10Min = Date.now() - 600000;
    intentosFallidos.splice(0, intentosFallidos.length, ...intentosFallidos.filter(i => i.timestamp > hace10Min));
}

function contarIntentosFallidosRecientes(codigo) {
    const hace5Min = Date.now() - 300000;
    return intentosFallidos.filter(i => i.codigo === codigo && i.timestamp > hace5Min).length;
}

function bloquearBusqueda(tiempo) {
    const min = Math.floor(tiempo / 60000);
    mostrarMensaje('error', `🔒 Bloqueado ${min} minutos por intentos fallidos`);
    ['btnBuscar', 'codigoInput', 'validacionInput'].forEach(id => document.getElementById(id).disabled = true);
    setTimeout(() => {
        ['btnBuscar', 'codigoInput', 'validacionInput'].forEach(id => document.getElementById(id).disabled = false);
        mostrarMensaje('success', '✅ Puede intentar de nuevo');
    }, tiempo);
}

function resetearContadorBusquedas() {
    setInterval(() => { busquedasRealizadas = 0; console.log('🔄 Reset'); }, TIEMPO_RESET);
}

function mostrarLoader(mostrar) {
    document.getElementById('loader').style.display = mostrar ? 'block' : 'none';
}

function mostrarMensaje(tipo, texto) {
    const msg = document.getElementById('mensajeEstado');
    msg.className = `mensaje-estado ${tipo}`;
    msg.textContent = texto;
    msg.style.display = 'block';
    if (tipo !== 'error') setTimeout(() => msg.style.display = 'none', 5000);
}

function ocultarMensaje() {
    document.getElementById('mensajeEstado').style.display = 'none';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const style = document.createElement('style');
style.textContent = '@keyframes fadeOut { 0%{opacity:1} 70%{opacity:1} 100%{opacity:0} }';
document.head.appendChild(style);

console.log('✅ Portal UMAX listo');
