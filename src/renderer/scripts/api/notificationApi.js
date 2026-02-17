// API para gestión de notificaciones

// Crear una nueva notificación
export async function createNotification(type, title, message) {
    try {
        const response = await fetch('http://localhost:8000/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type,
                title,
                message
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al crear notificación:', error);
        throw error;
    }
}

// Registrar actividad de alarma (crear, editar, eliminar)
export async function logAlarmActivity(action, alarmTitle) {
    try {
        return await createNotification(
            'activity_log',
            `Alarma ${action}`,
            `La alarma "${alarmTitle}" fue ${action}`
        );
    } catch (error) {
        console.error('Error al registrar actividad de alarma:', error);
    }
}

// Obtener todas las notificaciones
export async function getNotifications() {
    try {
        const response = await fetch('http://localhost:8000/notifications');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        throw error;
    }
}

// Obtener solo notificaciones no leídas
export async function getUnreadNotifications() {
    try {
        const response = await fetch('http://localhost:8000/notifications/unread');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener notificaciones no leídas:', error);
        throw error;
    }
}

// Marcar notificación como leída
export async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`http://localhost:8000/notifications/${notificationId}/read`, {
            method: 'PUT'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        throw error;
    }
}

// Marcar todas las notificaciones como leídas
export async function markAllNotificationsAsRead() {
    try {
        const response = await fetch('http://localhost:8000/notifications/read-all', {
            method: 'PUT'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error al marcar todas como leídas:', error);
        throw error;
    }
}

// Eliminar una notificación
export async function deleteNotification(notificationId) {
    try {
        const response = await fetch(`http://localhost:8000/notifications/${notificationId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        throw error;
    }
}

// Limpiar todas las notificaciones
export async function clearAllNotifications() {
    try {
        const response = await fetch('http://localhost:8000/notifications/clear-all', {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error al limpiar notificaciones:', error);
        throw error;
    }
}
