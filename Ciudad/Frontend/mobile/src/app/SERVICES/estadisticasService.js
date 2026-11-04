import apiClient from "../api/client";

// GET /Estadisticas/flujo
export async function getFlujo() {
    const res = await apiClient.get('/Estadisticas/flujo');
    return res.data;
}

// GET /Estadisticas/prediccion
export async function getPrediccion() {
    const res = await apiClient.get('/Estadisticas/prediccion');
    return res.data;
}

// GET /Estadisticas/comparativo
export async function getComparativo() {
    const res = await apiClient.get('/Estadisticas/comparativo');
    return res.data;
}
