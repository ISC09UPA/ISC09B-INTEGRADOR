import apiClient from "../api/client";

// GET /Cruce
export async function getCruce() {
    const res = await apiClient.get('/Cruce');
    return res.data;
}

// PUT /Cruce/modo
export async function cambiarModo(adaptativo) {
    const res = await apiClient.put('/Cruce/modo', { adaptativo });
    return res.data;
}

// PUT /Cruce/manual
export async function forzarPaso(direccion) {
    const res = await apiClient.put('/Cruce/manual', { direccion });
    return res.data;
}

// POST /Cruce/emergencia
export async function pasoEmergencia() {
    const res = await apiClient.post('/Cruce/emergencia');
    return res.data;
}

// GET /Cruce/trafico  (vista ciudadano)
export async function getTrafico() {
    const res = await apiClient.get('/Cruce/trafico');
    return res.data;
}
