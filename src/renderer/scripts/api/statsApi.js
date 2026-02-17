// API para obtener estadísticas del dashboard

export async function getDashboardStats() {
    try {
        const response = await fetch('http://localhost:8000/alarms/stats/dashboard');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stats = await response.json();
        return stats;
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        throw error;
    }
}
