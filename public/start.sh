#!/usr/bin/env bash

cd "$(dirname "$0")"

echo "Starting MyWebApp..."
echo "URL: http://127.0.0.1:8000"

python3 -m http.server 8000 --directory . --bind 127.0.0.1 &
SERVER_PID=$!

sleep 1

if command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://127.0.0.1:8000
elif command -v open >/dev/null 2>&1; then
    open http://127.0.0.1:8000
fi

wait "$SERVER_PID"
