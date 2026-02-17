// API para obtener equipos registrados

export async function getRegisteredEquipment() {
    try {
        const response = await fetch('http://localhost:8000/targets/registered');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const equipos = await response.json();
        return equipos;
    } catch (error) {
        console.error('Error al obtener equipos registrados:', error);
        throw error;
    }
}
