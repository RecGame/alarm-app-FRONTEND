// API para historial de alarmas

export async function getAlarmHistory(params = {}) {
  const query = new URLSearchParams();

  if (params.alarmaId) query.set('alarmaId', params.alarmaId);
  if (params.equipoId) query.set('equipoId', params.equipoId);
  if (params.estado) query.set('estado', params.estado);
  if (params.desde) query.set('desde', params.desde);
  if (params.hasta) query.set('hasta', params.hasta);
  if (params.limit) query.set('limit', params.limit);

  const url = `http://localhost:8000/history${query.toString() ? `?${query}` : ''}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error al obtener historial:', error);
    throw error;
  }
}
