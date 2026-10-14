import json
import mimetypes
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from calculadora import CalculatorError, evaluar

HISTORY_LIMIT = 100
HISTORY = []
_history_lock = threading.Lock()
_next_id = 0


def add_history(expression, result):
    global _next_id
    with _history_lock:
        _next_id += 1
        entry = {"id": _next_id, "expression": expression, "result": result, "timestamp": time.time()}
        HISTORY.append(entry)
        del HISTORY[:-HISTORY_LIMIT]
        return entry


WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, body, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status, payload):
        self._send(status, json.dumps(payload).encode("utf-8"))

    def do_GET(self):
        if self.path.split("?")[0] == "/api/history":
            with _history_lock:
                return self._json(200, {"history": list(HISTORY)})
        name = "index.html" if self.path in ("/", "") else self.path.lstrip("/").split("?")[0]
        path = os.path.realpath(os.path.join(WEB_DIR, name))
        if not path.startswith(os.path.realpath(WEB_DIR) + os.sep) or not os.path.isfile(path):
            return self._json(404, {"error": "No encontrado"})
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        with open(path, "rb") as f:
            self._send(200, f.read(), ctype)

    def do_DELETE(self):
        if self.path != "/api/history":
            return self._json(404, {"error": "No encontrado"})
        with _history_lock:
            HISTORY.clear()
        return self._json(200, {"history": []})

    def do_POST(self):
        if self.path != "/api/calculate":
            return self._json(404, {"error": "No encontrado"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(min(length, 4096)) or b"{}")
            expression = data.get("expression") if isinstance(data, dict) else None
            result = evaluar(expression)
            add_history(expression, result)
            return self._json(200, {"result": result})
        except CalculatorError as e:
            return self._json(400, {"error": str(e)})
        except (ValueError, TypeError):
            return self._json(400, {"error": "Sintaxis inválida"})


def main(port=8000):
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Calculadora en http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
