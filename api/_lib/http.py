from __future__ import annotations

import json

def send_json(handler, payload: dict, status: int = 200) -> None:
    handler.send_response(status)
    handler.send_header("Content/Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    handler.send_header("Access-Control-Allow-Header", "Content-Type")
    handler.end_headers()
    if status != 204:
        handler.wfile.write(json.dumps(payload).encode("utf-8"))