import { getAlarmHistory } from './api/historyApi.js';
import { getTargets } from './api/TargetApi.js';
import { getAlarms } from './api/getAlarms.js';

let historyRows = [];
let activeTab = 'alarm';
let hasPendingUpdate = false;
let lastSignature = '';

const state = {
  alarmId: 'all',
  equipmentId: 'all',
  status: 'all',
  dateStart: '',
  dateEnd: '',
  searchText: ''
};

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function applyFilters() {
  const search = normalizeText(state.searchText);
  const startDate = state.dateStart ? new Date(state.dateStart) : null;
  const endDate = state.dateEnd ? new Date(state.dateEnd) : null;
  if (endDate && !Number.isNaN(endDate.getTime())) {
    endDate.setHours(23, 59, 59, 999);
  }
  const filtered = historyRows.filter(row => {
    if (state.status !== 'all' && row.Estado !== state.status) return false;
    if (state.alarmId !== 'all' && String(row.Id_Alerta) !== String(state.alarmId)) return false;
    if (state.equipmentId !== 'all' && String(row.Id_Equipo) !== String(state.equipmentId)) return false;

    if (startDate && !Number.isNaN(startDate.getTime())) {
      const rowDate = new Date(row.Fecha_Mostrada);
      if (!Number.isNaN(rowDate.getTime()) && rowDate < startDate) return false;
    }

    if (endDate && !Number.isNaN(endDate.getTime())) {
      const rowDate = new Date(row.Fecha_Mostrada);
      if (!Number.isNaN(rowDate.getTime()) && rowDate > endDate) return false;
    }

    if (search) {
      const matchAlarm = normalizeText(row.Titulo).includes(search);
      const matchEquipo = normalizeText(row.Nombre_Equipo).includes(search);
      const matchIp = normalizeText(row.IP_Equipo).includes(search);
      const matchMensaje = normalizeText(row.Mensaje).includes(search) || normalizeText(row.Descripcion).includes(search);
      if (!matchAlarm && !matchEquipo && !matchIp && !matchMensaje) return false;
    }

    return true;
  });

  if (activeTab === 'equipo') {
    filtered.sort((a, b) => {
      const nameA = normalizeText(a.Nombre_Equipo);
      const nameB = normalizeText(b.Nombre_Equipo);
      if (nameA === nameB) {
        return new Date(b.Fecha_Mostrada) - new Date(a.Fecha_Mostrada);
      }
      return nameA.localeCompare(nameB);
    });
  } else {
    filtered.sort((a, b) => {
      const nameA = normalizeText(a.Titulo);
      const nameB = normalizeText(b.Titulo);
      if (nameA === nameB) {
        return new Date(b.Fecha_Mostrada) - new Date(a.Fecha_Mostrada);
      }
      return nameA.localeCompare(nameB);
    });
  }

  renderHistoryTable(filtered);
}

function computeSignature(rows) {
  if (!rows.length) return 'empty';
  const first = rows[0];
  const last = rows[rows.length - 1];
  return `${rows.length}-${first.Id_Historial || ''}-${first.Fecha_Mostrada || ''}-${last.Id_Historial || ''}`;
}

function setRefreshLoading(isLoading) {
  const refreshBtn = document.getElementById('history-refresh-btn');
  const spinner = document.getElementById('history-refresh-spinner');
  if (spinner) spinner.classList.toggle('hidden', !isLoading);
  if (refreshBtn) refreshBtn.disabled = isLoading;
}

async function loadHistory(options = {}) {
  const { showNoChanges } = options;
  setRefreshLoading(true);
  try {
    const rows = await getAlarmHistory({ limit: 500 });
    const signature = computeSignature(rows);
    const hasChanges = signature !== lastSignature;
    lastSignature = signature;
    historyRows = rows;
    hasPendingUpdate = false;
    await populateFilterOptions();
    applyFilters();
    if (showNoChanges && !hasChanges) {
      const resultsText = document.getElementById('history-results-text');
      if (resultsText) resultsText.textContent = 'Sin cambios nuevos.';
      if (window.showToast) {
        window.showToast('Sin cambios nuevos.', 'info');
      }
    }

    if (showNoChanges && hasChanges && window.showToast && isHistoryVisible()) {
      window.showToast('Historial actualizado.', 'success');
    }
  } catch (error) {
    console.error('Error al cargar historial:', error);
    renderHistoryTable([]);
  } finally {
    setRefreshLoading(false);
  }
}

function isHistoryVisible() {
  const view = document.getElementById('view-historial');
  return view && !view.classList.contains('hidden');
}

function handleRealtimeUpdate() {
  if (isHistoryVisible()) {
    loadHistory();
  } else {
    hasPendingUpdate = true;
    const resultsText = document.getElementById('history-results-text');
    if (resultsText) {
      resultsText.textContent = 'Hay nuevos registros. Presiona Actualizar.';
    }
  }
}

async function populateFilterOptions() {
  const alarmSelect = document.getElementById('history-filter-alarm');
  const equipmentSelect = document.getElementById('history-filter-equipment');

  if (!alarmSelect || !equipmentSelect) return;

  const [alarms, targets] = await Promise.all([getAlarms(), getTargets()]);

  alarmSelect.innerHTML = '<option value="all">Todas las alarmas</option>';
  alarms.forEach(alarm => {
    const option = document.createElement('option');
    option.value = alarm.Id_Alerta;
    option.textContent = alarm.Titulo || `Alarma ${alarm.Id_Alerta}`;
    alarmSelect.appendChild(option);
  });

  equipmentSelect.innerHTML = '<option value="all">Todos los equipos</option>';
  targets.forEach(equipo => {
    const option = document.createElement('option');
    option.value = equipo.Id_Equipo;
    option.textContent = equipo.Nombre_Equipo || `Equipo ${equipo.Id_Equipo}`;
    equipmentSelect.appendChild(option);
  });
}

function renderHistoryTable(rows) {
  const tbody = document.getElementById('history-table-body');
  const resultsText = document.getElementById('history-results-text');
  const tableHead = document.getElementById('history-table-head');

  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 md:px-6 py-10 text-center text-slate-500">
          <span class="material-icons-outlined text-4xl mb-2 block">history</span>
          <p>No hay registros para mostrar</p>
        </td>
      </tr>
    `;
    if (resultsText) resultsText.textContent = 'Mostrando 0 registros';
    return;
  }

  if (activeTab === 'equipo') {
    if (tableHead) {
      tableHead.innerHTML = `
        <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipo</th>
        <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alarmas distintas</th>
        <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enviadas</th>
        <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recibidas</th>
        <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vistas</th>
        <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ultima actividad</th>
      `;
    }

    const grouped = new Map();
    rows.forEach(row => {
      const key = String(row.Id_Equipo);
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: row.Id_Equipo,
          name: row.Nombre_Equipo || `Equipo ${row.Id_Equipo}`,
          ip: row.IP_Equipo || 'N/A',
          sistema: row.Sistema_Operativo || '',
          sent: 0,
          received: 0,
          seen: 0,
          alarms: new Set(),
          lastActivity: null
        });
      }
      const item = grouped.get(key);
      item.alarms.add(row.Id_Alerta);
      if (row.Estado === 'enviado') item.sent += 1;
      if (row.Estado === 'recibido') item.received += 1;
      if (row.Estado === 'visto') item.seen += 1;

      const activityDate = new Date(row.Fecha_Mostrada);
      if (!Number.isNaN(activityDate.getTime())) {
        if (!item.lastActivity || activityDate > item.lastActivity) {
          item.lastActivity = activityDate;
        }
      }
    });

    const groupedRows = Array.from(grouped.values()).sort((a, b) => {
      return normalizeText(a.name).localeCompare(normalizeText(b.name));
    });

    tbody.innerHTML = groupedRows.map(item => {
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <td class="px-4 md:px-6 py-3 md:py-4">
            <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">${item.name}</div>
            <div class="text-xs text-slate-500">${item.ip}${item.sistema ? ` • ${item.sistema}` : ''}</div>
          </td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-sm font-semibold text-slate-700">${item.alarms.size}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-sm text-slate-600">${item.sent}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-sm text-slate-600">${item.received}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-sm text-slate-600">${item.seen}</td>
          <td class="px-4 md:px-6 py-3 md:py-4 text-xs text-slate-600">${item.lastActivity ? formatDateTime(item.lastActivity) : '-'}</td>
        </tr>
      `;
    }).join('');

    if (resultsText) resultsText.textContent = `Mostrando ${groupedRows.length} equipos`;
    return;
  }

  if (tableHead) {
    tableHead.innerHTML = `
      <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alarma</th>
      <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipo</th>
      <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
      <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enviada</th>
      <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recibida</th>
      <th class="px-4 md:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vista</th>
    `;
  }

  tbody.innerHTML = rows.map(row => {
    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <td class="px-4 md:px-6 py-3 md:py-4">
          <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">${row.Titulo || `Alarma ${row.Id_Alerta}`}</div>
          <div class="text-xs text-slate-500 line-clamp-1">${row.Mensaje || row.Descripcion || '-'}</div>
        </td>
        <td class="px-4 md:px-6 py-3 md:py-4">
          <div class="text-sm font-semibold">${row.Nombre_Equipo || `Equipo ${row.Id_Equipo}`}</div>
          <div class="text-xs text-slate-500">${row.IP_Equipo || 'N/A'}</div>
        </td>
        <td class="px-4 md:px-6 py-3 md:py-4">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            ${row.Estado}
          </span>
        </td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-xs text-slate-600">${formatDateTime(row.Fecha_Mostrada)}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-xs text-slate-600">${formatDateTime(row.Fecha_Recibida)}</td>
        <td class="px-4 md:px-6 py-3 md:py-4 text-xs text-slate-600">${formatDateTime(row.Fecha_Vista)}</td>
      </tr>
    `;
  }).join('');

  if (resultsText) resultsText.textContent = `Mostrando ${rows.length} registros`;
}

function setupTabs() {
  const tabAlarm = document.getElementById('history-tab-alarm');
  const tabEquipo = document.getElementById('history-tab-equipo');

  if (!tabAlarm || !tabEquipo) return;

  function setActive(tab) {
    activeTab = tab;
    tabAlarm.classList.toggle('bg-primary', tab === 'alarm');
    tabAlarm.classList.toggle('text-white', tab === 'alarm');
    tabEquipo.classList.toggle('bg-primary', tab === 'equipo');
    tabEquipo.classList.toggle('text-white', tab === 'equipo');
  }

  tabAlarm.addEventListener('click', () => {
    setActive('alarm');
    applyFilters();
  });

  tabEquipo.addEventListener('click', () => {
    setActive('equipo');
    applyFilters();
  });

  setActive('alarm');
}

function setupRefresh() {
  const refreshBtn = document.getElementById('history-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadHistory({ showNoChanges: true });
    });
  }
}

function setupRealtime() {
  try {
    if (typeof io !== 'function') return;
    const socket = io('http://localhost:8000');
    socket.on('history_update', () => {
      handleRealtimeUpdate();
    });
  } catch (error) {
    console.log('WebSocket no disponible para historial');
  }
}

function setupFilters() {
  const alarmSelect = document.getElementById('history-filter-alarm');
  const equipmentSelect = document.getElementById('history-filter-equipment');
  const statusSelect = document.getElementById('history-filter-status');
  const dateStart = document.getElementById('history-filter-start');
  const dateEnd = document.getElementById('history-filter-end');
  const searchInput = document.getElementById('history-filter-search');

  if (alarmSelect) {
    alarmSelect.addEventListener('change', (e) => {
      state.alarmId = e.target.value;
      applyFilters();
    });
  }

  if (equipmentSelect) {
    equipmentSelect.addEventListener('change', (e) => {
      state.equipmentId = e.target.value;
      applyFilters();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      state.status = e.target.value;
      applyFilters();
    });
  }

  if (dateStart) {
    dateStart.addEventListener('change', (e) => {
      state.dateStart = e.target.value;
      applyFilters();
    });
  }

  if (dateEnd) {
    dateEnd.addEventListener('change', (e) => {
      state.dateEnd = e.target.value;
      applyFilters();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchText = e.target.value.trim();
      applyFilters();
    });
  }
}

window.loadHistory = loadHistory;

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupFilters();
  setupRefresh();
  setupRealtime();
});
