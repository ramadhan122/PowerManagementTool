
@echo off
cd /d "D:\gabut\laptop-sh\backend"

call "D:\gabut\laptop-sh\backend\venv\Scripts\activate.bat"

python -m uvicorn main:app --host 0.0.0.0 --port 8000
