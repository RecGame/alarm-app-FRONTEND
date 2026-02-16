export async function getTargets()
{
    const response = await fetch('http://localhost:8000/targets');
    return response.json(); // Convertir la respuesta a JSON y devolverla
}