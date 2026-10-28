import apiClient from "../api/client";

// GET /Reportes
export async function getReportes() {
    const res = await apiClient.get('/Reportes');
    return res.data;
}

// POST /Reportes
export async function createReporte(reporte) {
    const res = await apiClient.post('/Reportes', reporte);
    return res.data;
}

// PUT /Reportes/{id}/atender
export async function atenderReporte(id) {
    await apiClient.put(`/Reportes/${id}/atender`);
}

// POST /Reportes/clasificar
// (por ahora la API responde un resultado simulado; luego se conecta a Azure)
export async function clasificarFoto() {
    const res = await apiClient.post('/Reportes/clasificar');
    return res.data;
}
