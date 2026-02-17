import { createAlarm, updateAlarm, toggleAlarmStatus } from "./api/alarmApi.js";//IMPORTAR FUNCIONES PARA CREAR Y ACTUALIZAR ALARMAS EN LA BASE DE DATOS
import {deleteAlarm} from "./api/deleteAlarm.js";//IMPORTAR FUNCION PARA ELIMINAR ALARMA DE LA BASE DE DATOS
import { getTargets } from "./api/TargetApi.js";//IMPORTAR FUNCION PARA OBTENER LOS TARGETS DE LA BASE DE DATOS
import { getAlarms } from "./api/getAlarms.js";//IMPORTAR FUNCION PARA OBTENER LAS ALARMAS DE LA BASE DE DATOS
import { logAlarmActivity } from "./api/notificationApi.js";//IMPORTAR FUNCION PARA REGISTRAR ACTIVIDAD DE ALARMAS
import { getDashboardStats } from "./api/statsApi.js";//IMPORTAR FUNCION PARA OBTENER ESTADÍSTICAS DEL DASHBOARD
import { getRegisteredEquipment, deleteEquipment } from "./api/equipmentApi.js";//IMPORTAR FUNCIONES PARA OBTENER Y ELIMINAR EQUIPOS REGISTRADOS


const alarmas = [];//ARREGLO PARA GUARDAR LAS ALARMAS
const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
let editMode = null;//VARIABLE PARA SABER SI SE ESTA EDITANDO UNA ALARMA
let allAlarmas = []; // Almacenar todas las alarmas
let filteredAlarmas = []; // Alarmas después de aplicar filtros
let currentPage = 1; // Página actual
const itemsPerPage = 12; // Alarmas por página
let allEquipos = [];
let equipmentSearchText = '';

// Variables para los filtros activos
let activeFilters = {
  searchText: '',
  status: 'all',
  equipment: 'all',
  day: 'all',
  timeStart: '',
  timeEnd: ''
};

//FUNCION PARA MOSTRAR NOTIFICACIONES TOAST
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  const bgColor = type === 'success'
    ? 'bg-green-500'
    : type === 'error'
    ? 'bg-red-500'
    : type === 'warning'
    ? 'bg-yellow-500'
    : 'bg-blue-500';
  const icon = type === 'success'
    ? 'check_circle'
    : type === 'error'
    ? 'error'
    : type === 'warning'
    ? 'warning'
    : 'info';
  
  toast.className = `${bgColor} text-white px-4 md:px-6 py-3 md:py-4 rounded-lg shadow-lg flex items-center gap-2 md:gap-3 min-w-[280px] md:min-w-[300px] animate-slide-in`;
  toast.innerHTML = `
    <span class="material-icons-outlined text-lg md:text-xl flex-shrink-0">${icon}</span>
    <span class="font-medium text-sm md:text-base">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    toast.style.animation = 'slide-out 0.3s ease-out';
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, 3000);
}

// Exponer para otros módulos
window.showToast = showToast;

// Variable global para mantener la conexión con el backend
let backendSocket = null;

// Función para mostrar notificación de conexión con el backend
function checkBackendConnection() {
  try {
    if (typeof io !== 'function') {
      console.warn('Socket.IO no disponible');
      return;
    }
    
    // Si ya hay un socket, desconectarlo primero
    if (backendSocket) {
      backendSocket.disconnect();
    }
    
    backendSocket = io('http://localhost:8000');
    
    backendSocket.on('connect', () => {
      showToast('Conectado con el servidor', 'success');
      console.log('✓ Conexión establecida con el backend');
    });
    
    backendSocket.on('disconnect', (reason) => {
      showToast('Desconectado del servidor', 'warning');
      console.log('✗ Desconectado del backend. Razón: ' + reason);
    });
    
    backendSocket.on('connect_error', (error) => {
      console.error('Error de conexion con el backend:', error);
      showToast('Error al conectar con el servidor', 'error');
    });
  } catch (error) {
    console.error('Error al verificar conexion:', error);
  }
}

function updateDailyHint() {
  const hint = document.getElementById('daily-hint');
  const repeatInput = document.getElementById('alarm-repeat');
  const hourInput = document.getElementById('alarm-hour');
  const minuteInput = document.getElementById('alarm-minute');
  const finalHourInput = document.getElementById('alarm-finalhour');
  const finalMinuteInput = document.getElementById('alarm-finalminute');

  if (!hint || !repeatInput || !hourInput || !minuteInput || !finalHourInput || !finalMinuteInput) {
    return;
  }

  const startTime = `${hourInput.value}:${minuteInput.value}`;
  const endTime = `${finalHourInput.value}:${finalMinuteInput.value}`;
  const hasRepeat = Boolean(repeatInput.value);

  if (startTime === endTime && hourInput.value !== '' && minuteInput.value !== '') {
    if (hasRepeat) {
      repeatInput.value = '';
    }
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }
}

////////////////////////////////////////////// EMPIEZA SECCION DE FILTROS///////////////////////////////////////////////////////////////

//FUNCION PARA APLICAR TODOS LOS FILTROS A LAS ALARMAS
function applyFilters() {
  console.log('Aplicando filtros:', activeFilters);
  console.log('Total alarmas:', allAlarmas.length);
  
  filteredAlarmas = allAlarmas.filter(alarma => {
    // Filtro por búsqueda de texto
    if (activeFilters.searchText) {
      const searchLower = activeFilters.searchText.toLowerCase();
      const matchTitle = alarma.Titulo?.toLowerCase().includes(searchLower);
      const matchDescription = alarma.Descripcion?.toLowerCase().includes(searchLower);
      const matchEquipment = alarma.Nombre_Equipo?.toLowerCase().includes(searchLower) || 
                             String(alarma.Id_Equipo || '').toLowerCase().includes(searchLower);
      
      console.log(`Buscando "${searchLower}" en:`, {
        titulo: alarma.Titulo,
        descripcion: alarma.Descripcion,
        equipo: alarma.Nombre_Equipo || alarma.Id_Equipo,
        matches: { matchTitle, matchDescription, matchEquipment }
      });
      
      if (!matchTitle && !matchDescription && !matchEquipment) {
        return false;
      }
    }

    // Filtro por estado
    if (activeFilters.status !== 'all') {
      const isActive = alarma.Activa;
      if (activeFilters.status === 'active' && !isActive) return false;
      if (activeFilters.status === 'inactive' && isActive) return false;
    }

    // Filtro por equipo
    if (activeFilters.equipment !== 'all') {
      if (alarma.Id_Equipo !== activeFilters.equipment) return false;
    }

    // Filtro por día de la semana
    if (activeFilters.day !== 'all') {
      const dayNum = parseInt(activeFilters.day);
      if (!alarma.Dias || !alarma.Dias.includes(dayNum)) return false;
    }

    // Filtro por rango de horario (hora de inicio)
    if (activeFilters.timeStart) {
      const alarmaHoraInicio = formatTimeFromDate(alarma.Hora_Inicio);
      if (alarmaHoraInicio < activeFilters.timeStart) return false;
    }

    if (activeFilters.timeEnd) {
      const alarmaHoraInicio = formatTimeFromDate(alarma.Hora_Inicio);
      if (alarmaHoraInicio > activeFilters.timeEnd) return false;
    }

    return true;
  });

  console.log('Alarmas filtradas:', filteredAlarmas.length);

  // Resetear a la primera página cuando se aplican filtros
  currentPage = 1;
  renderCurrentPage();
  updatePaginationControls();
  updateFilterUI();
}

//FUNCION PARA ACTUALIZAR LA UI DE FILTROS (badges, contador de resultados)
function updateFilterUI() {
  // Contar filtros activos
  let filterCount = 0;
  if (activeFilters.searchText) filterCount++;
  if (activeFilters.status !== 'all') filterCount++;
  if (activeFilters.equipment !== 'all') filterCount++;
  if (activeFilters.day !== 'all') filterCount++;
  if (activeFilters.timeStart || activeFilters.timeEnd) filterCount++;

  // Actualizar badge de filtros activos
  const badge = document.getElementById('active-filters-badge');
  const clearBtn = document.getElementById('clear-filters-btn');
  
  if (filterCount > 0) {
    badge.textContent = filterCount;
    badge.classList.remove('hidden');
    clearBtn.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
    clearBtn.classList.add('hidden');
  }

  // Actualizar texto de resultados
  const resultsText = document.getElementById('filter-results-text');
  if (resultsText) {
    if (filterCount > 0) {
      resultsText.textContent = `Mostrando ${filteredAlarmas.length} de ${allAlarmas.length} alarmas`;
    } else {
      resultsText.textContent = '';
    }
  }
}

//FUNCION PARA LIMPIAR TODOS LOS FILTROS
function clearAllFilters() {
  activeFilters = {
    searchText: '',
    status: 'all',
    equipment: 'all',
    day: 'all',
    timeStart: '',
    timeEnd: ''
  };

  // Resetear controles UI
  document.getElementById('search-input').value = '';
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-equipment').value = 'all';
  document.getElementById('filter-day').value = 'all';
  document.getElementById('filter-time-start').value = '';
  document.getElementById('filter-time-end').value = '';

  applyFilters();
}

//FUNCION PARA LLENAR EL SELECT DE EQUIPOS DINÁMICAMENTE
async function populateEquipmentFilter() {
  try {
    const targets = await getTargets();
    const select = document.getElementById('filter-equipment');
    
    // Limpiar opciones existentes excepto "Todos los equipos"
    select.innerHTML = '<option value="all">Todos los equipos</option>';
    
    // Agregar opciones de equipos
    targets.forEach(equipo => {
      const option = document.createElement('option');
      option.value = equipo.Id_Equipo;
      option.textContent = equipo.Nombre_Equipo;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar equipos para filtro:', error);
  }
}


////////////////////////////////////////////// TERMINA SECCION DE FILTROS///////////////////////////////////////////////////////////////

//FUNCION PARA CARGAR ESTADÍSTICAS DEL DASHBOARD
async function loadDashboardStats() {
  try {
    const stats = await getDashboardStats();
    
    // Actualizar los valores en el DOM
    document.getElementById('stat-activas').textContent = stats.alarmasActivas;
    document.getElementById('stat-desactivadas').textContent = stats.alarmasDesactivadas;
    document.getElementById('stat-programadas').textContent = stats.programadasHoy;
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
    // Mostrar 0 en caso de error
    document.getElementById('stat-activas').textContent = '0';
    document.getElementById('stat-desactivadas').textContent = '0';
    document.getElementById('stat-programadas').textContent = '0';
  }
}

//FUNCION PARA RENDERIZAR EQUIPOS REGISTRADOS
function renderEquipmentList(equipos) {
  const container = document.getElementById('equipment-list');
  if (!container) return;

  if (equipos.length === 0) {
    const isSearching = equipmentSearchText.length > 0;
    container.innerHTML = `
      <div class="px-4 md:px-6 py-8 text-center text-slate-500">
        <span class="material-icons-outlined text-4xl mb-2">${isSearching ? 'search_off' : 'computer_off'}</span>
        <p>${isSearching ? 'No se encontraron equipos' : 'No hay equipos registrados'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = equipos.map(equipo => {
    // Formatear fecha de última conexión
    let ultimaConexion = '';
    if (equipo.Ultimo_Registro) {
      const fechaStr = equipo.Ultimo_Registro.replace(' ', 'T');
      const fecha = new Date(fechaStr);
      const dia = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
      ultimaConexion = `${dia} a las ${hora}`;
    }
    
    // Formatear fecha de registro
    let fechaRegistro = '';
    if (equipo.Fecha_Registro) {
      const fechaStr = equipo.Fecha_Registro.replace(' ', 'T');
      const fecha = new Date(fechaStr);
      fechaRegistro = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    
    return `
      <div class="px-4 md:px-6 py-4 md:py-5 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <span class="material-icons-outlined">computer</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm md:text-base font-semibold">${equipo.Nombre_Equipo || 'Sin nombre'}</span>
              <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Registrado
              </span>
            </div>
            <div class="flex flex-col gap-0.5">
              ${equipo.Sistema_Operativo ? `<p class="text-xs text-slate-500">SO: ${equipo.Sistema_Operativo}</p>` : ''}
              ${ultimaConexion ? `<p class="text-xs text-slate-400">Última conexión: ${ultimaConexion}</p>` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-xs text-slate-400">IP</p>
            <p class="text-sm font-medium">${equipo.IP_Equipo || 'N/A'}</p>
            ${fechaRegistro ? `<p class="text-xs text-slate-400 mt-1">Registro: ${fechaRegistro}</p>` : ''}
          </div>
          <button class="delete-equipment-btn text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors" data-id="${equipo.Id_Equipo}" title="Eliminar equipo">
            <span class="material-icons-outlined">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function applyEquipmentSearch() {
  const search = equipmentSearchText.trim().toLowerCase();
  if (!search) {
    renderEquipmentList(allEquipos);
    return;
  }

  const filtered = allEquipos.filter(equipo => {
    const name = String(equipo.Nombre_Equipo || '').toLowerCase();
    const ip = String(equipo.IP_Equipo || '').toLowerCase();
    const system = String(equipo.Sistema_Operativo || '').toLowerCase();
    return name.includes(search) || ip.includes(search) || system.includes(search);
  });

  renderEquipmentList(filtered);
}

//FUNCION PARA CARGAR Y RENDERIZAR EQUIPOS REGISTRADOS
async function loadRegisteredEquipment() {
  try {
    const equipos = await getRegisteredEquipment();
    allEquipos = Array.isArray(equipos) ? equipos : [];
    applyEquipmentSearch();
  } catch (error) {
    console.error('Error al cargar equipos registrados:', error);
    const container = document.getElementById('equipment-list');
    if (container) {
      container.innerHTML = `
        <div class="px-4 md:px-6 py-8 text-center text-red-500">
          <span class="material-icons-outlined text-4xl mb-2">error</span>
          <p>Error al cargar equipos</p>
        </div>
      `;
    }
  }
}

// Hacer la función accesible globalmente para viewRouter.js
window.loadRegisteredEquipment = loadRegisteredEquipment;

//FUNCION PARA CARGAR ALARMAS EXISTENTES DE LA BASE DE DATOS
async function loadAlarmasFromDB() {
  try {
    const alarmasDB = await getAlarms();
    console.log('Alarmas obtenidas de la base de datos:', alarmasDB);
    allAlarmas = alarmasDB; // Guardar todas las alarmas
    filteredAlarmas = [...alarmasDB]; // Inicializar alarmas filtradas
    currentPage = 1; // Resetear a la primera página
    renderCurrentPage();
    updatePaginationControls();
    updateFilterUI();
  } catch (error) {
    console.error('Error al cargar alarmas desde la base de datos:', error);
  }
}

//FUNCION PARA RENDERIZAR LA PÁGINA ACTUAL
function renderCurrentPage() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const alarmasToShow = filteredAlarmas.slice(startIndex, endIndex);
  renderAlarmasFromDB(alarmasToShow);
}

//FUNCION PARA ACTUALIZAR LOS CONTROLES DE PAGINACIÓN
function updatePaginationControls() {
  const totalPages = Math.ceil(filteredAlarmas.length / itemsPerPage);
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const paginationInfo = document.getElementById('pagination-info');
  
  // Actualizar botones
  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
  }
  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages || filteredAlarmas.length === 0;
  }
  
  // Actualizar texto informativo
  if (paginationInfo) {
    const startItem = filteredAlarmas.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredAlarmas.length);
    paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${filteredAlarmas.length} alarmas`;
  }
}

//FUNCION PARA FORMATEAR HORA DESDE OBJETO DATE
function formatTimeFromDate(dateValue) {
  const date = new Date(dateValue);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

//FUNCION PARA RENDERIZAR LAS ALARMAS OBTENIDAS DE LA BASE DE DATOS EN LA TABLA Y APLICAR ESTILOS CONDICIONALES SEGÚN EL ESTADO DE CADA ALARMA
function renderAlarmasFromDB(alarmasDB) {
  console.log('Renderizando alarmas desde la base de datos:', alarmasDB);
  const tbody = document.getElementById('alarm-table-body');
  tbody.innerHTML = '';
  
  // Mostrar mensaje si no hay resultados
  if (alarmasDB.length === 0) {
    const noResultsRow = `
      <tr>
        <td colspan="6" class="px-4 md:px-6 py-12 text-center">
          <div class="flex flex-col items-center justify-center gap-3">
            <span class="material-icons-outlined text-5xl md:text-6xl text-slate-300 dark:text-slate-700">search_off</span>
            <div>
              <p class="text-base md:text-lg font-semibold text-slate-600 dark:text-slate-400">No se encontraron alarmas</p>
              <p class="text-sm text-slate-500 dark:text-slate-500 mt-1">Intenta ajustar los filtros de búsqueda o crear una nueva alarma</p>
            </div>
          </div>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', noResultsRow);
    return;
  }
  
  alarmasDB.forEach(alarma => {
    const isInactive = !alarma.Activa;
    const inactiveClasses = isInactive ? 'opacity-50 bg-slate-50/50 dark:bg-slate-800/30' : '';
    const inactiveTextClasses = isInactive ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-slate-100';
    
    const horaInicio = formatTimeFromDate(alarma.Hora_Inicio);
    const horaFin = formatTimeFromDate(alarma.Hora_Fin);
    
    const row = `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group ${inactiveClasses}">
        <td class="px-4 md:px-6 py-3 md:py-4">
          <div class="font-medium text-sm md:text-base ${inactiveTextClasses}">${alarma.Titulo}</div>
          <div class="text-xs text-slate-500 truncate max-w-xs">${alarma.Descripcion}</div>
        </td>
        <td class="px-4 md:px-6 py-3 md:py-4">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${isInactive ? 'bg-slate-400' : 'bg-green-500'} flex-shrink-0"></span>
            <code class="text-xs md:text-sm font-mono text-slate-600 dark:text-slate-400 truncate">${alarma.Nombre_Equipo || alarma.Id_Equipo}</code>
          </div>
        </td>
        <td class="px-4 md:px-6 py-3 md:py-4">
            <div class="flex flex-wrap gap-1">
              ${alarma.Dias ? alarma.Dias.map(d => `<span class="inline-block w-6 h-6 md:w-7 md:h-7 rounded-full ${isInactive ? 'bg-slate-400' : 'bg-primary'} text-white text-xs font-bold text-center leading-6 md:leading-7">${diasSemana[d - 1]}</span>`).join('') : ''}
            </div>
        </td>
        <td class="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm whitespace-nowrap">${horaInicio} - ${horaFin}</td>
        <td class="px-4 md:px-6 py-3 md:py-4">
          <div class="flex items-center justify-center">
            <label class="custom-toggle">
              <input type="checkbox" class="alarm-toggle" data-id="${alarma.Id_Alerta}" ${alarma.Activa ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-right">
          <div class="flex items-center gap-1 md:gap-2 justify-end">
            <button class="p-1.5 md:p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-primary edit-btn" data-id="${alarma.Id_Alerta}" title="Editar">
              <span class="material-icons-outlined text-base md:text-lg">edit</span>
            </button>
            <button class="p-1.5 md:p-2 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 delete-btn" data-id="${alarma.Id_Alerta}" title="Eliminar">
              <span class="material-icons-outlined text-base md:text-lg">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', row);
  });
}

//FUNCION PARA ELIMINAR ALARMA DE LA BASE DE DATOS
document.getElementById('alarm-table-body').addEventListener('click', async function(e) {
    if (e.target.closest('.delete-btn')) {
        const btn = e.target.closest('.delete-btn');
        const id = btn.getAttribute('data-id');
        const confirmDelete = confirm('¿Estás seguro de que deseas eliminar esta alarma?');
        if (confirmDelete) {
            try {
                // Obtener el título de la alarma antes de eliminarla
                const alarma = allAlarmas.find(a => a.Id_Alerta == id);
                const alarmTitle = alarma ? alarma.Titulo : 'Alarma';
                
                await deleteAlarm(id);
                console.log('Alarma eliminada');
                showToast('Alarma eliminada con éxito', 'success');
                await logAlarmActivity('eliminada', alarmTitle);
                await loadAlarmasFromDB();
                await loadDashboardStats();
            } catch (error) {
                console.error('Error al eliminar alarma:', error);
                showToast('Error al eliminar la alarma', 'error');
            }
        }
    }
});

//CODIGO PARA APARECER EL MODAL Y MANEJAR EL FORMULARIO DE CREACION/EDICION DE ALARMAS
document.addEventListener('DOMContentLoaded', async function () {
  console.log('DOM completamente cargado y analizado');
  
  // Verificar conexión con el backend
  checkBackendConnection();
  
  const form = document.querySelector("#alarm-form");
  console.log('Formulario encontrado:', form);

  //LLENAR SELECTS DE TARGETS CON LOS OBTENIDOS DE LA BASE DE DATOS
  const targetSelect = document.getElementById('alarm-target');
  const targets = await getTargets();
  console.log('OBTENIENDO: ', targets);
  targetSelect.innerHTML = targets.map(pc => `<option value="${pc.Id_Equipo}">${pc.Nombre_Equipo}</option>`).join('');

  //CARGAR ALARMAS EXISTENTES DE LA BASE DE DATOS
  await loadAlarmasFromDB();
  
  //CARGAR ESTADÍSTICAS DEL DASHBOARD
  await loadDashboardStats();
  
  //CARGAR EQUIPOS REGISTRADOS
  await loadRegisteredEquipment();

  //EVENT LISTENER PARA EDITAR ALARMAS
  document.getElementById('alarm-table-body').addEventListener('click', async function(e) {
    if (e.target.closest('.edit-btn'))
      {
        const btn = e.target.closest('.edit-btn');//Obtener ID de la alarma a editar
        const alertaId = btn.getAttribute('data-id');
        
        try {
          // Obtener todas las alarmas y buscar la específica
          const alarmasDB = await getAlarms();
          const alarma = alarmasDB.find(a => a.Id_Alerta == alertaId);
          
          if (!alarma) {
            console.error('Alarma no encontrada');
            return;
          }

          // Parsear horas desde objetos Date
          const horaInicio = formatTimeFromDate(alarma.Hora_Inicio);
          const horaFin = formatTimeFromDate(alarma.Hora_Fin);
          const [hourInicio, minInicio] = horaInicio.split(':');
          const [hourFin, minFin] = horaFin.split(':');

          //Prellenar el formulario
          document.getElementById('alarm-name').value = alarma.Titulo;
          document.getElementById('alarm-message').value = alarma.Mensaje || '';
          document.getElementById('alarm-description').value = alarma.Descripcion;
          document.getElementById('alarm-target').value = alarma.Id_Equipo;
          document.getElementById('alarm-hour').value = hourInicio;
          document.getElementById('alarm-minute').value = minInicio;
          document.getElementById('alarm-finalhour').value = hourFin;
          document.getElementById('alarm-finalminute').value = minFin;
          const isDailyOnce = alarma.Frecuencia_Minutos === 1440 && horaInicio === horaFin;
          document.getElementById('alarm-repeat').value = isDailyOnce ? '' : (alarma.Frecuencia_Minutos || '');
          document.getElementById('alarm-activate').checked = alarma.Activa;

          updateDailyHint();

          // Marcar días seleccionados
          document.querySelectorAll('.day-toggle').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
            btn.classList.add('border', 'text-slate-500');
          });
          
          if (alarma.Dias) {
            alarma.Dias.forEach(diaId => {
              const dayBtn = document.querySelector(`.day-toggle[data-day="${diaId}"]`);
              if (dayBtn) {
                dayBtn.classList.add('bg-primary', 'text-white', 'font-semibold');
                dayBtn.classList.remove('border', 'text-slate-500');
              }
            });
          }

          // Cambiar título del modal a modo edición
          const modalTitle = document.getElementById('modal-title');
          const modalSubtitle = document.getElementById('modal-subtitle');
          const submitBtn = document.getElementById('submit-alarm-btn');
          if (modalTitle) {
            modalTitle.textContent = 'Editar alarma';
          }
          if (modalSubtitle) {
            modalSubtitle.textContent = 'Modifica los parámetros de la alarma existente.';
          }
          if (submitBtn) {
            submitBtn.textContent = 'Actualizar alarma';
          }

          editMode = alertaId;//Guardar ID de la alarma a editar para usarlo al guardar los cambios
          document.getElementById('modal-alarm').style.display = 'flex';//Abrir modal para editar
          document.body.style.overflow = 'hidden';
          if (window.focusAlarmModalInputs) {
            window.focusAlarmModalInputs();
          }
        } catch (error) {
          console.error('Error al cargar alarma para editar:', error);
        }
      }
  });

  //EVENT LISTENER PARA CAMBIAR ESTADO DEL TOGGLE
  document.getElementById('alarm-table-body').addEventListener('change', async function(e) {
    if (e.target.classList.contains('alarm-toggle')) {
      const toggle = e.target;
      const id = toggle.getAttribute('data-id');
      const activa = toggle.checked;
      
      try {
        await toggleAlarmStatus(id, activa);
        console.log(`Alarma ${id} ${activa ? 'activada' : 'desactivada'}`);
        showToast(`Alarma ${activa ? 'activada' : 'desactivada'}`, 'success');
        
        // Actualizar la alarma en el array y re-renderizar para reflejar el cambio visual
        const alarmaIndex = allAlarmas.findIndex(a => a.Id_Alerta == id);
        if (alarmaIndex !== -1) {
          allAlarmas[alarmaIndex].Activa = activa;
          renderCurrentPage();
        }
        
        // Actualizar estadísticas
        await loadDashboardStats();
      } catch (error) {
        console.error('Error al cambiar estado de alarma:', error);
        showToast('Error al cambiar el estado', 'error');
        // Revertir el toggle si falla
        toggle.checked = !activa;
      }
    }
  });

  form.addEventListener('submit', async function (e) {
    console.log('submit ejecutado');
    e.preventDefault();

    //OBETENER VALORES DE LOS CAMPOS
    const name = document.getElementById('alarm-name').value;
    const target = document.getElementById('alarm-target').value;
    const message = document.getElementById('alarm-message').value;
    const description = document.getElementById('alarm-description').value;
    const hour = document.getElementById('alarm-hour').value;
    const minute = document.getElementById('alarm-minute').value;
    const finalhour = document.getElementById('alarm-finalhour').value;
    const finalminute = document.getElementById('alarm-finalminute').value;
    const activate = document.getElementById('alarm-activate').checked;
    let repeatTime = document.getElementById('alarm-repeat').value;
    const selectDays = Array.from(document.querySelectorAll('.day-toggle.bg-primary'))
      .map(btn => btn.getAttribute('data-day'));

    // VALIDAR QUE AL MENOS UN DÍA ESTÉ SELECCIONADO
    const daysError = document.getElementById('days-error');
    if (selectDays.length === 0) {
      daysError.classList.remove('hidden');
      return;
    }
    daysError.classList.add('hidden');

    //Construir objeto de alarma para enviar al proceso principal
    const startTime = `${hour}:${minute}`;
    const endTime = `${finalhour}:${finalminute}`;
    if (startTime === endTime) {
      repeatTime = '1440';
    }

    const alarmdata = {
      Id_Equipo: target,
      Titulo: name,
      Mensaje: message,
      Descripcion: description,
      Hora_Inicio: startTime,
      Hora_Fin: endTime,
      Frecuencia_Minutos: repeatTime,
      Activa: activate,
      Days: selectDays
    };

    console.log('Days enviados:', selectDays);

    try {
      if (editMode) {
        // ACTUALIZAR ALARMA EXISTENTE
        await updateAlarm(editMode, alarmdata);
        console.log('ALARMA ACTUALIZADA CON ÉXITO');
        showToast('Alarma actualizada con éxito', 'success');
        await logAlarmActivity('editada', name);
        editMode = null; // Resetear modo edición
      } else {
        // CREAR NUEVA ALARMA
        await createAlarm(alarmdata);
        console.log('ALARMA CREADA CON ÉXITO');
        showToast('Alarma creada con éxito', 'success');
        await logAlarmActivity('creada', name);
      }
      
      // Cerrar modal y resetear
      const modal = document.getElementById('modal-alarm');
      modal.style.display = 'none';
      document.body.style.overflow = '';
      form.reset();
      
      // Limpiar días seleccionados
      const dayButtons = document.querySelectorAll('.day-toggle');
      dayButtons.forEach(btn => {
        btn.classList.remove('bg-primary', 'text-white', 'font-semibold');
        btn.classList.add('border', 'text-slate-500');
      });
      
      // Ocultar mensaje de error
      daysError.classList.add('hidden');
      
      // Resetear título del modal
      const modalTitle = document.getElementById('modal-title');
      const modalSubtitle = document.getElementById('modal-subtitle');
      const submitBtn = document.getElementById('submit-alarm-btn');
      if (modalTitle) {
        modalTitle.textContent = 'Crear nueva alarma';
      }
      if (modalSubtitle) {
        modalSubtitle.textContent = 'Configura los parámetros de la nueva alarma para las estaciones de trabajo.';
      }
      if (submitBtn) {
        submitBtn.textContent = 'Guardar alarma';
      }
      
      // Recargar tabla y estadísticas
      await loadAlarmasFromDB();
      await loadDashboardStats();
    } catch (error) {
      console.error('ERROR:', error);
      showToast('Error al guardar la alarma', 'error');
    }
  })

  // Escuchar evento de reseteo desde modal.js
  window.addEventListener('resetEditMode', () => {
    editMode = null;
  });

  // EVENT LISTENERS PARA PAGINACIÓN
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
        updatePaginationControls();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredAlarmas.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
        updatePaginationControls();
      }
    });
  }

  // EVENT LISTENERS PARA FILTROS

  // Toggle panel de filtros
  const filterToggleBtn = document.getElementById('filter-toggle-btn');
  const filterPanel = document.getElementById('filter-panel');
  
  if (filterToggleBtn && filterPanel) {
    filterToggleBtn.addEventListener('click', () => {
      filterPanel.classList.toggle('hidden');
    });
  }

  // Búsqueda por texto
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeFilters.searchText = e.target.value.trim();
      console.log('Buscando:', activeFilters.searchText);
      applyFilters();
    });
  } else {
    console.error('No se encontró el input de búsqueda');
  }

  // Filtro por estado
  const filterStatus = document.getElementById('filter-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
      activeFilters.status = e.target.value;
      applyFilters();
    });
  }

  // Filtro por equipo
  const filterEquipment = document.getElementById('filter-equipment');
  if (filterEquipment) {
    filterEquipment.addEventListener('change', (e) => {
      activeFilters.equipment = e.target.value;
      applyFilters();
    });
  }

  // Filtro por día
  const filterDay = document.getElementById('filter-day');
  if (filterDay) {
    filterDay.addEventListener('change', (e) => {
      activeFilters.day = e.target.value;
      applyFilters();
    });
  }

  // Filtro por hora inicio
  const filterTimeStart = document.getElementById('filter-time-start');
  if (filterTimeStart) {
    filterTimeStart.addEventListener('change', (e) => {
      activeFilters.timeStart = e.target.value;
      applyFilters();
    });
  }

  // Filtro por hora fin
  const filterTimeEnd = document.getElementById('filter-time-end');
  if (filterTimeEnd) {
    filterTimeEnd.addEventListener('change', (e) => {
      activeFilters.timeEnd = e.target.value;
      applyFilters();
    });
  }

  // Botón para limpiar filtros
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      clearAllFilters();
      // Cerrar panel de filtros si está abierto
      if (filterPanel) {
        filterPanel.classList.add('hidden');
      }
    });
  }

  // Llenar el select de equipos para el filtro
  await populateEquipmentFilter();

  // Buscador de equipos registrados
  const equipmentSearchInput = document.getElementById('equipment-search-input');
  if (equipmentSearchInput) {
    equipmentSearchInput.addEventListener('input', (e) => {
      equipmentSearchText = e.target.value;
      applyEquipmentSearch();
    });
  }

  // Event listener para eliminar equipos
  const equipmentList = document.getElementById('equipment-list');
  if (equipmentList) {
    equipmentList.addEventListener('click', async (e) => {
      if (e.target.closest('.delete-equipment-btn')) {
        const btn = e.target.closest('.delete-equipment-btn');
        const id = btn.getAttribute('data-id');
        const equipmentName = btn.closest('.px-4').querySelector('span.text-sm.md\\:text-base.font-semibold')?.textContent || 'Equipo';
        
        const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar "${equipmentName}"? Esta acción no se puede deshacer.`);
        if (confirmDelete) {
          try {
            await deleteEquipment(id);
            console.log('Equipo eliminado');
            showToast('Equipo eliminado con éxito', 'success');
            await loadRegisteredEquipment();
            await populateEquipmentFilter();
          } catch (error) {
            console.error('Error al eliminar equipo:', error);
            showToast('Error al eliminar el equipo', 'error');
          }
        }
      }
    });
  }

  // Aviso de ejecucion diaria
  const repeatInput = document.getElementById('alarm-repeat');
  const hourInput = document.getElementById('alarm-hour');
  const minuteInput = document.getElementById('alarm-minute');
  const finalHourInput = document.getElementById('alarm-finalhour');
  const finalMinuteInput = document.getElementById('alarm-finalminute');

  [repeatInput, hourInput, minuteInput, finalHourInput, finalMinuteInput]
    .filter(Boolean)
    .forEach((input) => {
      input.addEventListener('input', updateDailyHint);
      input.addEventListener('change', updateDailyHint);
    });

  updateDailyHint();
});
