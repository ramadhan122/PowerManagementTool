
import ctypes
import ctypes.wintypes as wintypes
import logging
import threading
from pathlib import Path

import win32api
import win32con
import win32gui


# Windows power events
PBT_APMSUSPEND = 0x0004
PBT_APMRESUMESUSPEND = 0x0007
PBT_APMRESUMEAUTOMATIC = 0x0012

# Log directory
BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    filename=LOG_DIR / "wake-monitor.log",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)


def wake_display():
    try:
        user32 = ctypes.WinDLL("user32", use_last_error=True)
        send = user32.SendMessageTimeoutW

        send.argtypes = [
            wintypes.HWND,
            wintypes.UINT,
            ctypes.c_size_t,
            ctypes.c_ssize_t,
            wintypes.UINT,
            wintypes.UINT,
            ctypes.POINTER(ctypes.c_size_t),
        ]
        send.restype = ctypes.c_ssize_t

        result = ctypes.c_size_t()

        response = send(
            wintypes.HWND(0xFFFF),
            wintypes.UINT(0x0112),
            ctypes.c_size_t(0xF170),
            ctypes.c_ssize_t(-1),
            wintypes.UINT(0x0002),
            wintypes.UINT(3000),
            ctypes.byref(result),
        )

        if response:
            logging.info("Display wake command sent.")
        else:
            logging.warning("Display wake command was not acknowledged.")

    except Exception:
        logging.exception("Display wake attempt failed.")


def window_procedure(hwnd, message, wparam, lparam):
    if message == win32con.WM_POWERBROADCAST:

        if wparam == PBT_APMSUSPEND:
            logging.info("Windows entering Sleep.")

        elif wparam == PBT_APMRESUMEAUTOMATIC:
            logging.info("Windows resumed automatically.")
            threading.Timer(3.0, wake_display).start()

        elif wparam == PBT_APMRESUMESUSPEND:
            logging.info("Windows resumed from suspend.")

        return 1

    elif message == win32con.WM_DESTROY:
        win32gui.PostQuitMessage(0)
        return 0

    return win32gui.DefWindowProc(
        hwnd, message, wparam, lparam
    )


def main():
    wc = win32gui.WNDCLASS()
    wc.lpszClassName = "LaptopSHWakeMonitor"
    wc.lpfnWndProc = window_procedure
    wc.hInstance = win32api.GetModuleHandle(None)

    class_atom = win32gui.RegisterClass(wc)

    hwnd = win32gui.CreateWindow(
        class_atom,
        "Laptop SH Wake Monitor",
        0,
        0, 0, 0, 0,
        0, 0,
        wc.hInstance,
        None,
    )

    logging.info("Laptop SH Wake Monitor started.")
    logging.info("Listening for Windows power events.")

    print("Laptop SH Wake Monitor aktif.")
    print(f"Log: {LOG_DIR / 'wake-monitor.log'}")
    print("Tekan Ctrl+C untuk menghentikan monitor.")

    win32gui.PumpMessages()


if __name__ == "__main__":
    main()
