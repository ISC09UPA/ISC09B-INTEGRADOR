import apiClient from "../api/client";

// POST /Auth/login
export async function login(correo, password, rol) {
    const res = await apiClient.post('/Auth/login', { correo, password, rol });
    return res.data;
}
