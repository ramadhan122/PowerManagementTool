
const API = window.location.origin;
const TOKEN_KEY = "laptop_sh_token";

async function authenticate() {
    let pin = prompt("Masukkan PIN Laptop SH:");

    if (pin === null) return false;

    try {
        const response = await fetch(`${API}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ pin })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "PIN salah.");
            return false;
        }

        sessionStorage.setItem(TOKEN_KEY, data.token);
        return true;

    } catch (error) {
        alert("Tidak dapat terhubung ke laptop.");
        return false;
    }
}

async function getToken() {
    let token = sessionStorage.getItem(TOKEN_KEY);

    if (token) return token;

    const success = await authenticate();

    if (!success) return null;

    return sessionStorage.getItem(TOKEN_KEY);
}

async function loadStatus() {
    const connection = document.getElementById("connection");

    try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(`${API}/api/status`, {
            headers: {
                "X-Laptop-Token": token
            }
        });

        if (response.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            connection.classList.remove("online");
            connection.querySelector("span:last-child").textContent = "Sesi berakhir";
            return;
        }

        if (!response.ok) throw new Error("API error");

        const data = await response.json();

        connection.classList.add("online");
        connection.querySelector("span:last-child").textContent = "Online";

        document.getElementById("device").textContent = data.device;
        document.getElementById("os").textContent = data.os;

        if (data.battery) {
            document.getElementById("battery").textContent =
                `${data.battery.percentage}%`;

            document.getElementById("charging").textContent =
                data.battery.charging
                    ? "⚡ Sedang mengisi daya"
                    : "Menggunakan baterai";
        }

        document.getElementById("updated").textContent =
            `Diperbarui: ${new Date(data.timestamp).toLocaleTimeString("id-ID")}`;

    } catch (error) {
        connection.classList.remove("online");
        connection.querySelector("span:last-child").textContent = "Offline";
    }
}

async function runAction(action) {
    const labels = {
        sleep: "Sleep",
        lock: "Lock",
        restart: "Restart",
        shutdown: "Shutdown"
    };

    if (!confirm(`Yakin ingin menjalankan ${labels[action]}?`)) return;

    try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(`${API}/api/action/${action}`, {
            method: "POST",
            headers: {
                "X-Laptop-Token": token
            }
        });

        const result = await response.json();

        if (response.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            alert("Sesi berakhir. Masukkan PIN kembali.");
            return;
        }

        if (result.success) {
            alert(`${labels[action]} berhasil dikirim.`);
        } else {
            alert(`Gagal: ${result.message || result.detail}`);
        }

    } catch (error) {
        alert("Tidak dapat terhubung ke laptop.");
    }
}

loadStatus();
setInterval(loadStatus, 5000);
