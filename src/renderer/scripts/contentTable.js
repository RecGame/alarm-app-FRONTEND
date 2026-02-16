import { createAlarm, updateAlarm, toggleAlarmStatus } from "./api/alarmApi.js";//IMPORTAR FUNCIONES PARA CREAR Y ACTUALIZAR ALARMAS EN LA BASE DE DATOS
import {deleteAlarm} from "./api/deleteAlarm.js";//IMPORTAR FUNCION PARA ELIMINAR ALARMA DE LA BASE DE DATOS
import { getTargets } from "./api/TargetApi.js";//IMPORTAR FUNCION PARA OBTENER LOS TARGETS DE LA BASE DE DATOS
import { getAlarms } from "./api/getAlarms.js";//IMPORTAR FUNCION PARA OBTENER LAS ALARMAS DE LA BASE DE DATOS


const alarmas = [];//ARREGLO PARA GUARDAR LAS ALARMAS
const diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
let editMode = null;//VARIABLE PARA SABER SI SE ESTA EDITANDO UNA ALARMA
let allAlarmas = []; // Almacenar todas las alarmas
let currentPage = 1; // Página actual
const itemsPerPage = 12; // Alarmas por página

//FUNCION PARA MOSTRAR NOTIFICACIONES TOAST
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  
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

//FUNCION PARA CARGAR ALARMAS EXISTENTES DE LA BASE DE DATOS
async function loadAlarmasFromDB() {
  try {
    const alarmasDB = await getAlarms();
    console.log('Alarmas obtenidas de la base de datos:', alarmasDB);
    allAlarmas = alarmasDB; // Guardar todas las alarmas
    currentPage = 1; // Resetear a la primera página
    renderCurrentPage();
    updatePaginationControls();
  } catch (error) {
    console.error('Error al cargar alarmas desde la base de datos:', error);
  }
}

//FUNCION PARA RENDERIZAR LA PÁGINA ACTUAL
function renderCurrentPage() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const alarmasToShow = allAlarmas.slice(startIndex, endIndex);
  renderAlarmasFromDB(alarmasToShow);
}

//FUNCION PARA ACTUALIZAR LOS CONTROLES DE PAGINACIÓN
function updatePaginationControls() {
  const totalPages = Math.ceil(allAlarmas.length / itemsPerPage);
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const paginationInfo = document.getElementById('pagination-info');
  
  // Actualizar botones
  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
  }
  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages || allAlarmas.length === 0;
  }
  
  // Actualizar texto informativo
  if (paginationInfo) {
    const startItem = allAlarmas.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, allAlarmas.length);
    paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${allAlarmas.length} alarmas`;
  }
}

//FUNCION PARA CARGAR LAS ALARMAS EXISTENTES EN LA BASE DE DATOS
function renderAlarmasFromDB(alarmasDB) {
  console.log('Renderizando alarmas desde la base de datos:', alarmasDB);
  const tbody = document.getElementById('alarm-table-body');
  tbody.innerHTML = '';
  alarmasDB.forEach(alarma => {
    const isInactive = !alarma.Activa;
    const inactiveClasses = isInactive ? 'opacity-50 bg-slate-50/50 dark:bg-slate-800/30' : '';
    const inactiveTextClasses = isInactive ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-slate-100';
    
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
        <td class="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm whitespace-nowrap">${alarma.Hora_Inicio.slice(11, 16)} - ${alarma.Hora_Fin.slice(11, 16)}</td>
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
                await deleteAlarm(id);
                console.log('Alarma eliminada');
                showToast('Alarma eliminada con éxito', 'success');
                await loadAlarmasFromDB();
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
  const form = document.querySelector("#alarm-form");
  console.log('Formulario encontrado:', form);

  //LLENAR SELECTS DE TARGETS CON LOS OBTENIDOS DE LA BASE DE DATOS
  const targetSelect = document.getElementById('alarm-target');
  const targets = await getTargets();
  console.log('OBTENIENDO: ', targets);
  targetSelect.innerHTML = targets.map(pc => `<option value="${pc.Id_Equipo}">${pc.Nombre_Equipo}</option>`).join('');

  //CARGAR ALARMAS EXISTENTES DE LA BASE DE DATOS
  await loadAlarmasFromDB();

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

          // Parsear horas
          const horaInicio = alarma.Hora_Inicio.slice(11, 16);
          const horaFin = alarma.Hora_Fin.slice(11, 16);
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
          document.getElementById('alarm-repeat').value = alarma.Frecuencia_Minutos || '';
          document.getElementById('alarm-activate').checked = alarma.Activa;

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
    const repeatTime = document.getElementById('alarm-repeat').value;
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
    const alarmdata = {
      Id_Equipo: target,
      Titulo: name,
      Mensaje: message,
      Descripcion: description,
      Hora_Inicio: `${hour}:${minute}`,
      Hora_Fin: `${finalhour}:${finalminute}`,
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
        editMode = null; // Resetear modo edición
      } else {
        // CREAR NUEVA ALARMA
        await createAlarm(alarmdata);
        console.log('ALARMA CREADA CON ÉXITO');
        showToast('Alarma creada con éxito', 'success');
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
      
      // Recargar tabla
      await loadAlarmasFromDB();
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
      const totalPages = Math.ceil(allAlarmas.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
        updatePaginationControls();
      }
    });
  }
});
