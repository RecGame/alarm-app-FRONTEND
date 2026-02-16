export async function createAlarm(alarmdata){
    const response = await fetch('http://localhost:8000/alarms', {
        method: 'POST',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify(alarmdata)
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
} 

export async function updateAlarm(id, alarmdata)
{
    try
    {
        const response = await fetch(`http://localhost:8000/alarms/${id}`, 
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(alarmdata)
            });
                if (!response.ok)
                    {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                return await response.json();
     } catch(error)
        {
            console.error('Error updating alarm:', error);
        }   
}

export async function toggleAlarmStatus(id, activa) {
    try {
        const response = await fetch(`http://localhost:8000/alarms/${id}/toggle`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Activa: activa })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error toggling alarm status:', error);
        throw error;
    }
}
