const API = "http://100.123.127.19:8000";
const TOKEN_KEY = "laptop_sh_token";

let loginAttempted = false;

const WakeOnLan = window.Capacitor?.registerPlugin?.("WakeOnLan");

async function authenticate() {
    const pin = prompt("Masukkan PIN Laptop SH:");
    if (pin === null) return false;

    try {
        const response = await fetch(`${API}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        alert("Laptop belum dapat dihubungi. Pastikan laptop menyala dan Tailscale terhubung.");
        return false;
    }
}

async function getToken() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) return token;

    if (loginAttempted) return null;

    loginAttempted = true;
    const success = await authenticate();

    return success ? sessionStorage.getItem(TOKEN_KEY) : null;
}

async function wakeLaptop() {
    if (!WakeOnLan) {
        alert("Fitur Wake Up hanya tersedia di aplikasi Android Laptop SH.");
        return;
    }

    if (!confirm("Kirim sinyal Wake Up ke laptop? Pastikan HP terhubung ke Wi-Fi rumah.")) {
        return;
    }

    try {
        const result = await WakeOnLan.send({
            macAddress: "50-EB-71-2B-62-B8",
            broadcastAddress: "192.168.0.255",
            port: 9
        });

        alert(result.message + "\nTunggu beberapa detik sampai laptop menyala.");

        setTimeout(() => {
            loginAttempted = false;
            loadStatus();
        }, 10000);

    } catch (error) {
        alert("Gagal mengirim Wake Up: " + (error.message || error));
    }
}

async function loadStatus() {
    const connection = document.getElementById("connection");

    try {
        const token = await getToken();
        if (!token) {
            connection.classList.remove("online");
            connection.querySelector("span:last-child").textContent = "Offline";
            return;
        }

        const response = await fetch(`${API}/api/status`, {
            headers: { "X-Laptop-Token": token }
        });

        if (response.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            loginAttempted = false;
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
                data.battery.charging ? "Sedang mengisi daya" : "Menggunakan baterai";
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
        enter: "Enter",
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
            headers: { "X-Laptop-Token": token }
        });

        const result = await response.json();

        if (response.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            loginAttempted = false;
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
