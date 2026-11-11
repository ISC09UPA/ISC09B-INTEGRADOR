"""Servidor LAN: POST /photos y GET /health."""
import pytest
from aiohttp.test_utils import TestClient, TestServer

from alimentador_gateway.lan import crear_app
from alimentador_gateway.ota import GestorOta

from conftest import AHORA

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 1000


@pytest.fixture
async def cliente(tmp_path, store, backend):
    ota = GestorOta(tmp_path / "ota", backend, lambda: "127.0.0.1", 8080)
    app = crear_app(ota, tmp_path / "fotos", store.encolar,
                    lambda: {"backendOnline": False, "queue": store.tamano_cola()}, max_foto=4096)
    async with TestClient(TestServer(app)) as c:
        yield c


def params(**cambios):
    p = {"feederId": "f1", "eventId": "boot1-0003", "class": "gato", "confidence": "0.42", "takenAt": str(AHORA)}
    p.update(cambios)
    return p


async def test_foto_se_guarda_y_encola(cliente, store, tmp_path):
    resp = await cliente.post("/photos", params=params(), data=JPEG, headers={"Content-Type": "image/jpeg"})
    assert resp.status == 202
    item = store.primeros(1)[0]
    assert item.tipo == "photo"
    p = item.payload
    assert (p["feederId"], p["eventId"], p["class"], p["confidence"], p["takenAt"]) == \
        ("f1", "boot1-0003", "Gato", 0.42, AHORA)
    from pathlib import Path
    assert Path(p["archivo"]).read_bytes() == JPEG
    assert Path(p["archivo"]).parent == tmp_path / "fotos"


@pytest.mark.parametrize("cambios,status", [
    ({"feederId": "../x"}, 400),
    ({"eventId": ""}, 400),
    ({"class": "Raton"}, 400),
    ({"confidence": "abc"}, 400),
    ({"confidence": "nan"}, 400),
    ({"confidence": "2"}, 400),
    ({"takenAt": "5"}, 400),
])
async def test_foto_parametros_invalidos(cliente, store, cambios, status):
    resp = await cliente.post("/photos", params=params(**cambios), data=JPEG,
                              headers={"Content-Type": "image/jpeg"})
    assert resp.status == status
    assert store.tamano_cola() == 0


async def test_foto_no_jpeg_o_grande(cliente, store):
    resp = await cliente.post("/photos", params=params(), data=b"PNG....", headers={"Content-Type": "image/jpeg"})
    assert resp.status == 400
    resp = await cliente.post("/photos", params=params(), data=JPEG, headers={"Content-Type": "text/plain"})
    assert resp.status == 415
    resp = await cliente.post("/photos", params=params(), data=JPEG * 10, headers={"Content-Type": "image/jpeg"})
    assert resp.status == 413
    assert store.tamano_cola() == 0


async def test_health(cliente):
    resp = await cliente.get("/health")
    assert resp.status == 200
    assert await resp.json() == {"ok": True, "backendOnline": False, "queue": 0}
