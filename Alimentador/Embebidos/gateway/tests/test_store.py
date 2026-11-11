from alimentador_gateway.store import Store


def test_cola_fifo_y_lotes_por_tipo(store):
    a = store.encolar("visit", {"eventId": "a"})
    b = store.encolar("visit", {"eventId": "b"})
    c = store.encolar("event", {"eventId": "c"})
    store.encolar("visit", {"eventId": "d"})

    lote = store.lote_inicial(50)
    assert [i.id for i in lote] == [a, b], "solo los consecutivos del mismo tipo, sin brincar el evento"
    store.quitar([a, b])
    assert [i.id for i in store.lote_inicial(50)] == [c]
    store.quitar([c])
    assert [i.payload["eventId"] for i in store.lote_inicial(50)] == ["d"]


def test_lote_respeta_maximo(store):
    for i in range(7):
        store.encolar("event", {"eventId": str(i)})
    assert len(store.lote_inicial(3)) == 3


def test_resultados_y_fotos_van_de_uno_en_uno(store):
    store.encolar("result", {"commandId": 1, "result": {"ok": True}})
    store.encolar("result", {"commandId": 2, "result": {"ok": True}})
    assert len(store.lote_inicial(50)) == 1


def test_fallo_y_descartados(store):
    i = store.encolar("visit", {"eventId": "x"})
    store.marcar_fallo([i], "HTTP 500")
    store.marcar_fallo([i], "HTTP 500")
    assert store.primeros(1)[0].intentos == 2
    store.descartar([i], "HTTP 400")
    assert store.tamano_cola() == 0
    assert store.total_descartados() == 1


def test_tipo_desconocido(store):
    import pytest
    with pytest.raises(ValueError):
        store.encolar("otro", {})


def test_persiste_entre_reinicios(tmp_path):
    ruta = tmp_path / "g.db"
    s = Store(ruta)
    s.encolar("visit", {"eventId": "a"})
    s.guardar("offline_since", 1794350000)
    s.guardar_status("f1", {"feederId": "f1", "online": True})
    s.close()

    s = Store(ruta)
    assert s.lote_inicial(10)[0].payload == {"eventId": "a"}
    assert s.obtener("offline_since") == 1794350000
    assert s.status("f1")["online"] is True
    s.close()


def test_comandos_idempotentes(store):
    cmd = {"id": 15, "feederId": "f1", "type": "dispense", "grams": 30.0}
    assert store.agregar_comando(cmd, 100) is True
    assert store.agregar_comando(cmd, 101) is False
    store.marcar_comando(15, "enviado", 105)
    c = store.comando(15)
    assert (c.estado, c.recibido_en, c.enviado_en) == ("enviado", 100, 105)
    assert [x.id for x in store.comandos_pendientes()] == [15]
    store.marcar_comando(15, "terminado")
    assert store.comandos_pendientes() == []
    store.purgar_comandos(200)
    assert store.comando(15) is None


def test_estado_clave_valor(store):
    assert store.obtener("nada", 7) == 7
    store.guardar("k", {"a": 1})
    assert store.obtener("k") == {"a": 1}
    store.borrar("k")
    assert store.obtener("k") is None
