export async function getAlarms()
{
    try
    {
        const response = await fetch('http://localhost:8000/alarms');
        if(!response.ok)
        {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch(err){
        console.error('Error fetching alarms:', err);
        throw err;
    }
}