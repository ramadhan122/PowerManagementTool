
import ctypes
import ctypes.wintypes
import os
import platform
import secrets
import subprocess
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


# =========================
# CONFIGURATION
# =========================

app = FastAPI(title="Laptop SH API")

# PIN diatur melalui environment variable Windows.
ACCESS_PIN = os.getenv("LAPTOP_SH_PIN")

# Token berubah setiap kali backend dijalankan ulang.
ACCESS_TOKEN = secrets.token_urlsafe(32)


class LoginRequest(BaseModel):
    pin: str


def verify_token(x_laptop_token: str | None):
    if not x_laptop_token or not secrets.compare_digest(
        x_laptop_token, ACCESS_TOKEN
    ):
        raise HTTPException(
            status_code=401,
            detail="PIN belum diverifikasi atau sesi sudah berakhir"
        )


# =========================
# AUTHENTICATION
# =========================

@app.post("/api/login")
def login(data: LoginRequest):
    if not ACCESS_PIN:
        raise HTTPException(
            status_code=503,
            detail="PIN belum dikonfigurasi di Windows"
        )

    if not secrets.compare_digest(data.pin, ACCESS_PIN):
        raise HTTPException(
            status_code=401,
            detail="PIN salah"
        )

    return {
        "success": True,
        "token": ACCESS_TOKEN
    }


# =========================
# BATTERY INFORMATION
# =========================

def get_battery():
    try:
        class SYSTEM_POWER_STATUS(ctypes.Structure):
            _fields_ = [
                ("ACLineStatus", ctypes.c_byte),
                ("BatteryFlag", ctypes.c_byte),
                ("BatteryLifePercent", ctypes.c_byte),
                ("SystemStatusFlag", ctypes.c_byte),
                ("BatteryLifeTime", ctypes.wintypes.DWORD),
                ("BatteryFullLifeTime", ctypes.wintypes.DWORD),
            ]

        status = SYSTEM_POWER_STATUS()

        result = ctypes.windll.kernel32.GetSystemPowerStatus(
            ctypes.byref(status)
        )

        if result:
            return {
                "percentage": status.BatteryLifePercent,
                "charging": status.ACLineStatus == 1,
            }

    except Exception:
        pass

    return None


# =========================
# API ROUTES
# =========================

@app.get("/")
def home():
    return {
        "app": "Laptop SH",
        "status": "online",
        "message": "Backend is running"
    }


@app.get("/api/status")
def laptop_status(x_laptop_token: str | None = Header(default=None)):
    verify_token(x_laptop_token)

    return {
        "device": platform.node(),
        "os": platform.system(),
        "status": "online",
        "battery": get_battery(),
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/action/{action}")
def laptop_action(
    action: str,
    x_laptop_token: str | None = Header(default=None)
):
    verify_token(x_laptop_token)

    commands = {
        "shutdown": ["shutdown", "/s", "/t", "0"],
        "restart": ["shutdown", "/r", "/t", "0"],
        "sleep": [
            "rundll32.exe",
            "powrprof.dll,SetSuspendState",
            "0,1,0"
        ],
        "lock": [
            "rundll32.exe",
            "user32.dll,LockWorkStation"
        ],
    }

    if action not in commands:
        raise HTTPException(
            status_code=400,
            detail="Unknown action"
        )

    try:
        subprocess.Popen(commands[action])

        return {
            "success": True,
            "message": f"{action} command sent"
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =========================
# FRONTEND
# =========================

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app.mount(
    "/app",
    StaticFiles(directory=str(FRONTEND_DIR), html=True),
    name="frontend"
)
