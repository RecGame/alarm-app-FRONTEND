// Sistema de Notificaciones
//
import { 
  getNotifications, 
  markNotificationAsRead as markReadApi, 
  markAllNotificationsAsRead as markAllReadApi,
  clearAllNotifications as clearAllApi
} from './api/notificationApi.js';

let notifications = []; // Array para almacenar notificaciones
let unreadCount = 0;

// Tipos de notificaciones con sus íconos y colores
const notificationTypes = {
  alarm_upcoming: {
    icon: 'schedule',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500'
  },
  equipment_offline: {
    icon: 'computer_off',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500'
  },
  alarm_missed: {
    icon: 'notifications_off',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-500'
  },
  activity_log: {
    icon: 'history',
    color: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-500'
  },
  equipment_new: {
    icon: 'devices',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    iconBg: 'bg-green-500'
  },
  daily_summary: {
    icon: 'assessment',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500'
  }
};

// Inicializar el sistema de notificaciones
function initNotifications() {
  const notificationsBtn = document.getElementById('notifications-btn');
  const notificationsPanel = document.getElementById('notifications-panel');
  const markAllReadBtn = document.getElementById('mark-all-read-btn');
  const clearAllBtn = document.getElementById('clear-all-notifications-btn');

  // Toggle del panel de notificaciones
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationsPanel.classList.toggle('hidden');
    });
  }

  // Cerrar panel al hacer click fuera
  document.addEventListener('click', (e) => {
    if (notificationsPanel && !notificationsPanel.contains(e.target) && !notificationsBtn.contains(e.target)) {
      notificationsPanel.classList.add('hidden');
    }
  });

  // Marcar todas como leídas
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', () => {
      markAllAsRead();
    });
  }

  // Limpiar todas las notificaciones
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      clearAllNotifications();
    });
  }

  // Cargar notificaciones existentes
  loadNotifications();

  // Iniciar polling para obtener nuevas notificaciones cada 30 segundos
  setInterval(loadNotifications, 30000);

  // Escuchar notificaciones en tiempo real mediante WebSocket (si está disponible)
  try {
    // Intentar conectar con el servidor WebSocket
    const socket = io('http://localhost:8000');
    
    socket.on('new_notification', (notification) => {
      console.log('Nueva notificación recibida:', notification);
      addNotification(notification);
      
      // Mostrar toast de notificación nueva
      if (window.showToast) {
        window.showToast(notification.title, 'info');
      }
    });
  } catch (error) {
    console.log('WebSocket no disponible, usando polling');
  }
}

// Cargar notificaciones desde el backend
async function loadNotifications() {
  try {
    // Obtener notificaciones del backend usando el API
    const data = await getNotifications();
    notifications = data;
    renderNotifications();
    updateBadge();
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
    // Generar notificaciones de ejemplo si no hay backend
    generateMockNotifications();
  }
}

// Generar notificaciones de ejemplo (temporal hasta que el backend esté listo)
function generateMockNotifications() {
  const now = new Date();
  
  // Limpiar notificaciones anteriores
  notifications = [];

  // Ejemplo: Alarma próxima
  addNotification({
    type: 'alarm_upcoming',
    title: 'Alarma próxima',
    message: 'La alarma "Revisar Urgencias" se ejecutará en 15 minutos',
    timestamp: now.toISOString(),
    read: false
  });

  // Ejemplo: Equipo desconectado
  addNotification({
    type: 'equipment_offline',
    title: 'Equipo desconectado',
    message: 'PC-URGENCIAS-01 no responde desde hace 10 minutos',
    timestamp: new Date(now - 15 * 60000).toISOString(),
    read: false
  });

  // Ejemplo: Log de actividad
  addNotification({
    type: 'activity_log',
    title: 'Alarma creada',
    message: 'Nueva alarma "Control de Turnos" creada',
    timestamp: new Date(now - 30 * 60000).toISOString(),
    read: true
  });

  renderNotifications();
  updateBadge();
}

// Agregar una nueva notificación
function addNotification(notification) {
  notification.id = notification.id || Date.now();
  notification.timestamp = notification.timestamp || new Date().toISOString();
  notification.read = notification.read || false;
  
  // Agregar al inicio del array
  notifications.unshift(notification);
  
  // Limitar a 50 notificaciones
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  
  renderNotifications();
  updateBadge();
}

// Renderizar las notificaciones en el panel
function renderNotifications() {
  const notificationsList = document.getElementById('notifications-list');
  
  if (!notificationsList) return;
  
  if (notifications.length === 0) {
    notificationsList.innerHTML = `
      <div class="p-8 text-center text-slate-400">
        <span class="material-icons-outlined text-5xl mb-2 block">notifications_none</span>
        <p class="text-sm">No hay notificaciones</p>
      </div>
    `;
    return;
  }

  notificationsList.innerHTML = notifications.map(notification => {
    const type = notificationTypes[notification.type] || notificationTypes.activity_log;
    const timestamp = formatTimestamp(notification.timestamp);
    const unreadClass = notification.read ? '' : 'bg-slate-50/50 dark:bg-slate-800/50';
    const unreadDot = notification.read ? '' : '<span class="w-2 h-2 rounded-full bg-blue-500 absolute top-4 left-4"></span>';
    
    return `
      <div class="relative p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${unreadClass}" data-notification-id="${notification.id}" onclick="markAsRead(${notification.id})">
        ${unreadDot}
        <div class="flex gap-3 ${notification.read ? '' : 'pl-3'}">
          <div class="flex-shrink-0">
            <div class="${type.color} w-10 h-10 rounded-full flex items-center justify-center">
              <span class="material-icons-outlined text-lg">${type.icon}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">${notification.title}</h4>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">${notification.message}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">${timestamp}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Formatear timestamp de manera amigable
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Menos de 1 minuto
  if (diff < 60000) {
    return 'Hace un momento';
  }
  
  // Menos de 1 hora
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
  
  // Menos de 24 horas
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  }
  
  // Más de 24 horas
  const day = date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
  const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} a las ${time}`;
}

// Actualizar badge con el número de notificaciones sin leer
function updateBadge() {
  unreadCount = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notifications-badge');
  
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// Marcar una notificación como leída
function markAsRead(notificationId) {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification && !notification.read) {
    notification.read = true;
    renderNotifications();
    updateBadge();
    
    // Sincronizar con el backend usando el API
    markReadApi(notificationId).catch(err => console.error('Error al marcar como leída:', err));
  }
}

// Marcar todas las notificaciones como leídas
function markAllAsRead() {
  notifications.forEach(n => n.read = true);
  renderNotifications();
  updateBadge();
  
  // Sincronizar con el backend usando el API
  markAllReadApi().catch(err => console.error('Error al marcar todas como leídas:', err));
}

// Limpiar todas las notificaciones
function clearAllNotifications() {
  const confirmed = confirm('¿Estás seguro de que deseas eliminar todas las notificaciones?');
  if (confirmed) {
    notifications = [];
    renderNotifications();
    updateBadge();
    
    // Sincronizar con el backend usando el API
    clearAllApi().catch(err => console.error('Error al limpiar notificaciones:', err));
  }
}

// Exponer funciones globalmente
window.markAsRead = markAsRead;
window.addNotification = addNotification;
window.initNotifications = initNotifications;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initNotifications);
