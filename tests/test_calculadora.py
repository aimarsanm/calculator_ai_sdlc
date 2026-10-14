import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from calculadora import CalculatorError, evaluar
from server import Handler


class EvaluarTests(unittest.TestCase):
    def test_operaciones(self):
        self.assertEqual(evaluar("5+3"), 8)
        self.assertEqual(evaluar("2*3-1"), 5)
        self.assertEqual(evaluar("1/4"), 0.25)
        self.assertEqual(evaluar("-2+0.5"), -1.5)

    def test_division_por_cero(self):
        with self.assertRaisesRegex(CalculatorError, "cero"):
            evaluar("1/0")

    def test_sintaxis_invalida(self):
        for expr in ("5+", "", "__import__('os')", "2**3", "abc"):
            with self.assertRaises(CalculatorError):
                evaluar(expr)


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()

    def post(self, expression):
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/calculate",
            json.dumps({"expression": expression}).encode(),
            {"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.load(r)
        except urllib.error.HTTPError as e:
            return e.code, json.load(e)

    def test_ok(self):
        self.assertEqual(self.post("5+3"), (200, {"result": 8}))

    def test_error(self):
        status, body = self.post("1/0")
        self.assertEqual(status, 400)
        self.assertIn("cero", body["error"])

    def test_index_y_traversal(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/") as r:
            self.assertEqual(r.status, 200)
        with self.assertRaises(urllib.error.HTTPError):
            urllib.request.urlopen(f"http://127.0.0.1:{self.port}/..%2fserver.py")


if __name__ == "__main__":
    unittest.main()
