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

// API para eliminar un equipo
export async function deleteEquipment(equipmentId) {
    try {
        const response = await fetch(`http://localhost:8000/targets/${equipmentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error al eliminar equipo:', error);
        throw error;
    }
}
