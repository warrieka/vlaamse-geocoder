@echo off
cd /d "%~dp0"

echo Starting MyWebApp...
echo URL: http://127.0.0.1:8000
echo.

start "" http://127.0.0.1:8000

python -m http.server 8000 --directory . --bind 127.0.0.1

pause