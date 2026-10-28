requireAuth();
icons();

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
        return "Ayer " + formatTime(date);
    }

    return date.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short"
    }) + " " + formatTime(date);
};

async function cargarPanel() {
    const panel = await api("/api/panel");

    $("segT").textContent = panel.seguridad
        ? "Casa asegurada"
        : "Casa sin asegurar";
    $("segD").textContent = panel.seguridad
        ? "Movimiento interior vigilado"
        : "No se vigila el movimiento";
    $("segCard").classList.toggle("off", !panel.seguridad);
    $("segBtn").textContent = panel.seguridad ? "Desactivar" : "Activar";
    $("segBtn").dataset.activa = panel.seguridad ? "1" : "0";

    if ($("segSw")) {
        $("segSw").checked = panel.seguridad;
    }

    $("lux").textContent = panel.lux;
    $("luxBar").style.width = Math.min(100, panel.lux / 10) + "%";
    $("puerta").textContent = panel.puerta ? "Abierta" : "Cerrada";
    $("puerta").className = "big " + (panel.puerta ? "am" : "ok");
    $("abrir").disabled = panel.puerta;

    const luces = Object.entries(panel.luces);
    const encendidas = luces.filter(([, activa]) => activa).length;
    $("cuenta").textContent = `${encendidas} de ${luces.length} encendidas`;

    $("luces").innerHTML = luces.map(([nombre, activa]) => `
        <div class="card luz ${activa ? "on" : ""}">
            <span class="ic">${ico("bulb")}</span>
            <div>
                <b>${esc(nombre)}</b>
                <span class="${activa ? "am" : "mute"}" style="font-size:.8rem">
                    ${activa ? "Encendida" : "Apagada"}
                </span>
            </div>
            <label class="switch">
                <input type="checkbox" data-n="${esc(nombre)}" ${activa ? "checked" : ""}
                    aria-label="${esc(nombre)}">
                <i></i>
            </label>
        </div>
    `).join("");
}

async function cargarPersonas() {
    const datos = await api("/api/accesos");

    $("personas").innerHTML = datos.personas.length
        ? datos.personas.map((nombre) => `
            <div class="row" style="padding:6px 0">
                <span>${esc(nombre)}</span>
                <button class="btn out sm" data-del="${esc(nombre)}">Quitar</button>
            </div>
        `).join("")
        : '<p class="mute">Aún no hay personas autorizadas.</p>';
}

async function setSeguridad(activa) {
    const datos = await api("/api/seguridad", "POST", { activa });

    $("segT").textContent = datos.activa
        ? "Casa asegurada"
        : "Casa sin asegurar";
    $("segD").textContent = datos.activa
        ? "Movimiento interior vigilado"
        : "No se vigila el movimiento";
    $("segCard").classList.toggle("off", !datos.activa);
    $("segBtn").textContent = datos.activa ? "Desactivar" : "Activar";
    $("segBtn").dataset.activa = datos.activa ? "1" : "0";

    if ($("segSw")) {
        $("segSw").checked = datos.activa;
    }
}

function setupNav() {
    document.querySelectorAll("[data-nav]").forEach((button) => {
        button.onclick = () => {
            location.href = button.dataset.nav;
        };
    });
}

async function initHome() {
    const hora = new Date().getHours();
    $("saludo").textContent = hora < 12
        ? "Buenos días"
        : hora < 19
            ? "Buenas tardes"
            : "Buenas noches";

    setupNav();
    $("nSalir").onclick = logout;
    $("segBtn").onclick = () => {
        setSeguridad($("segBtn").dataset.activa !== "1");
    };
    $("abrir").onclick = async () => {
        await api("/api/accesos/abrir", "POST");
        await cargarPanel();
    };
    $("luces").onchange = async (event) => {
        if (!event.target.dataset.n) {
            return;
        }

        await api("/api/luces/" + encodeURIComponent(event.target.dataset.n), "POST", {
            encendida: event.target.checked
        });
        await cargarPanel();
    };
    $("addP").onclick = async () => {
        const nombre = $("nueva").value.trim();
        if (!nombre) {
            return;
        }

        await api("/api/accesos/personas", "POST", { nombre });
        $("nueva").value = "";
        await cargarPersonas();
    };
    $("personas").onclick = async (event) => {
        const button = event.target.closest("[data-del]");
        if (!button) {
            return;
        }

        await api("/api/accesos/personas/" + encodeURIComponent(button.dataset.del), "DELETE");
        await cargarPersonas();
    };

    await Promise.all([cargarPanel(), cargarPersonas()]);
    setInterval(cargarPanel, 5000);
}
