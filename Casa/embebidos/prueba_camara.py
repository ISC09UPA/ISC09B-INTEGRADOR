import requests
from azure_config import KEY, UMBRAL
from custom_vision import URL, TAGS_NO_PERMITIDOS, capturar_foto

# esta prueba solo toma la foto y la manda a Custom Vision, no usa Blob ni correo
foto = capturar_foto()
with open("prueba.jpg", "wb") as f:
    f.write(foto)
print("Foto guardada en prueba.jpg")

headers = {
    "Prediction-Key": KEY,
    "Content-Type": "application/octet-stream",
}
r = requests.post(URL, headers=headers, data=foto, timeout=10)
if r.status_code != 200:
    print("Error", r.status_code, r.text[:200])
    print("401/403 = la KEY no es la Prediction-Key | 404 = PROJECT_ID o PUBLISHED_NAME mal")
    raise SystemExit(1)

predicciones = sorted(r.json()["predictions"], key=lambda p: p["probability"], reverse=True)
for p in predicciones:
    print(f"{p['tagName']}: {p['probability'] * 100:.1f}%")

mejor = predicciones[0]
if mejor["probability"] >= UMBRAL and mejor["tagName"].lower() not in TAGS_NO_PERMITIDOS:
    print(f"AUTORIZADO: {mejor['tagName']}")
else:
    print("DENEGADO")
