import apiClient from "../api/client";

// GET /Alertas
export async function getAlertas() {
    const res = await apiClient.get('/Alertas');
    return res.data;
}
