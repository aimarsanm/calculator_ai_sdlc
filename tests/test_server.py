import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import pytest

from server import Handler


@pytest.fixture(scope="module")
def base_url():
    srv = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()
    srv.server_close()


def post(base_url, payload):
    req = urllib.request.Request(
        base_url + "/api/calculate",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.load(e)


def test_calculate_ok(base_url):
    assert post(base_url, {"expression": "5+3"}) == (200, {"result": 8})


def test_division_by_zero(base_url):
    status, body = post(base_url, {"expression": "1/0"})
    assert status == 400
    assert "cero" in body["error"]


def test_invalid_syntax(base_url):
    assert post(base_url, {"expression": "5++"})[0] == 400
    assert post(base_url, {})[0] == 400


def test_serves_index_and_blocks_traversal(base_url):
    with urllib.request.urlopen(base_url + "/") as r:
        assert r.status == 200
    with pytest.raises(urllib.error.HTTPError) as e:
        urllib.request.urlopen(base_url + "/../server.py")
    assert e.value.code == 404


def test_history_records_and_clears(base_url):
    def call(method):
        req = urllib.request.Request(base_url + "/api/history", method=method)
        with urllib.request.urlopen(req) as r:
            return json.load(r)

    call("DELETE")
    post(base_url, {"expression": "2+2"})
    post(base_url, {"expression": "1/0"})
    assert call("GET") == {"history": [{"expression": "2+2", "result": 4}]}
    assert call("DELETE") == {"history": []}
    assert call("GET") == {"history": []}
