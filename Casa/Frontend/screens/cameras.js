requireAuth();
icons();

const CAMARAS = {
    Entrada: "",
    Patio: "",
    Sala: ""
};

let zonaActiva = "Entrada";

const formatTime = (date) =>
    date.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

const formatDateTime = (value) => {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return "Hoy · " + formatTime(date);
    }

    if (date.toDateString() === yesterday.toDateString()) {
        return "ayer " + formatTime(date);
    }

    return date.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short"
    }) + " " + formatTime(date);
};

function setupNav() {
    document.querySelectorAll("[data-nav]").forEach((button) => {
        button.onclick = () => {
            location.href = button.dataset.nav;
        };
    });
}

function pintarCamara() {
    const nombres = Object.keys(CAMARAS);
    const url = CAMARAS[zonaActiva];

    $("enLinea").textContent = nombres.filter((nombre) => CAMARAS[nombre]).length;
    $("tabs").innerHTML = nombres.map((nombre) => `
        <button class="${nombre === zonaActiva ? "on" : ""}" data-z="${nombre}">
            ${nombre}
        </button>
    `).join("");
    $("zona").textContent = zonaActiva;

    if (url) {
        $("cam").src = url;
        $("cam").hidden = false;
        $("nocam").hidden = true;
    } else {
        $("cam").removeAttribute("src");
        $("cam").hidden = true;
        $("nocam").hidden = false;
    }
}

async function cargarEventos() {
    const [alertas, accesos] = await Promise.all([
        api("/api/alertas"),
        api("/api/accesos")
    ]);

    const eventos = [];

    alertas
        .filter((alerta) => /movimiento/i.test(alerta.mensaje))
        .forEach((alerta) => {
            eventos.push({
                tipo: "mov",
                titulo: "Movimiento detectado",
                subtitulo: "Casa · " + formatDateTime(alerta.hora),
                hora: alerta.hora
            });
        });

    accesos.historial.forEach((acceso) => {
        const concedido = /concedido/i.test(acceso.mensaje);
        eventos.push({
            tipo: concedido ? "ok" : "warn",
            titulo: concedido ? acceso.mensaje : "Rostro no reconocido",
            subtitulo: "Entrada · " + formatDateTime(acceso.hora),
            hora: acceso.hora
        });
    });

    eventos.sort((a, b) => new Date(b.hora) - new Date(a.hora));

    const iconos = {
        mov: "pulse",
        warn: "alert",
        ok: "check"
    };

    $("eventos").innerHTML = eventos.length
        ? eventos.slice(0, 8).map((evento) => `
            <div class="card ev ${evento.tipo}">
                <span class="ic">${ico(iconos[evento.tipo])}</span>
                <div>
                    <b>${esc(evento.titulo)}</b>
                    <span class="mute">${esc(evento.subtitulo)}</span>
                </div>
            </div>
        `).join("")
        : '<p class="mute">Sin alertas todavía.</p>';

    const movimiento = eventos.find((evento) => evento.tipo === "mov");
    $("ban").hidden = !movimiento;
    $("banAct").hidden = !movimiento;

    if (movimiento) {
        $("banD").textContent = "Casa · " + formatDateTime(movimiento.hora);
    }
}

async function setSeguridad(activa) {
    await api("/api/seguridad", "POST", { activa });
}

async function initCam() {
    setupNav();
    $("nSalir").onclick = logout;

    $("tabs").onclick = (event) => {
        const button = event.target.closest("[data-z]");
        if (!button) {
            return;
        }

        zonaActiva = button.dataset.z;
        pintarCamara();
    };

    $("descartar").onclick = () => {
        $("ban").hidden = true;
        $("banAct").hidden = true;
    };

    $("verCam").onclick = () => {
        $("live").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    };

    $("segSw").onchange = (event) => {
        setSeguridad(event.target.checked);
    };

    pintarCamara();

    await Promise.all([
        cargarEventos(),
        api("/api/seguridad").then((datos) => {
            $("segSw").checked = datos.activa;
        })
    ]);

    setInterval(cargarEventos, 5000);
    setInterval(() => {
        $("reloj").textContent = formatTime(new Date());
    }, 1000);
}
