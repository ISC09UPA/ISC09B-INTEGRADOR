icons();

let stream = null;

function setStatus(message, isError = false) {
    $("stat").textContent = message;
    $("stat").classList.toggle("bad", isError);
}

async function entrar() {
    $("err").textContent = "";

    const response = await fetch(API_BASE_URL + "/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            usuario: $("email").value.trim(),
            password: $("pass").value
        })
    });

    if (!response.ok) {
        $("err").textContent = "Correo o contraseña incorrectos.";
        return;
    }

    const datos = await response.json();
    localStorage.setItem(TOKEN_KEY, datos.token);
    location.replace("/screens/home.html");
}

async function iniciarReconocimientoFacial() {
    if (!stream) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" }
            });
        } catch {
            setStatus(
                "No se pudo abrir la cámara. En el celular necesita HTTPS y permiso.",
                true
            );
            return;
        }

        $("video").srcObject = stream;
        $("video").hidden = false;
        $("faceSvg").hidden = true;
        $("rostroTxt").textContent = "Escanear rostro";
        setStatus("Cámara lista · coloca tu rostro en el marco");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    canvas.getContext("2d").drawImage($("video"), 0, 0, 320, 240);

    const response = await fetch(API_BASE_URL + "/api/login/rostro", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            imagen: canvas.toDataURL("image/jpeg", 0.7)
        })
    });

    const datos = await response.json().catch(() => ({}));
    setStatus(
        datos.mensaje || "No te reconocimos. Usa tu correo y contraseña.",
        true
    );
}

$("entrar").onclick = entrar;
$("pass").onkeydown = (event) => {
    if (event.key === "Enter") {
        entrar();
    }
};
$("rostro").onclick = iniciarReconocimientoFacial;
