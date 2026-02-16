export async function deleteAlarm(id)
{
    try
    {
        const response = await fetch(`http://localhost:8000/alarms/${id}`,
            {
                method: 'DELETE'
            });
            if(!response.ok)
                {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
    } catch(err)
    {
        console.error('Error deleting alarm:', err);
        throw err;
    }
}