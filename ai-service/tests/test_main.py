import json
from dataclasses import replace

import httpx
import pytest
from fastapi.testclient import TestClient

from main import Settings, create_app

CONFIG = Settings(
    supabase_url="https://project.supabase.co",
    supabase_key="private-test-database-key",
    service_token="internal-test-token-with-32-characters",
    gemini_api_key="private-test-gemini-key",
)
AUTH = {"Authorization": f"Bearer {CONFIG.service_token}"}


def provider_response(payload):
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}]})


def catalog_handler(request):
    assert request.url.host == "project.supabase.co"
    assert request.headers["apikey"] == CONFIG.supabase_key
    return httpx.Response(200, json=[{"name": "milk"}, {"name": "coriander leaves"}])


def client_for(handler=catalog_handler, settings=CONFIG):
    return TestClient(create_app(settings, transport=httpx.MockTransport(handler)))


@pytest.mark.parametrize("path,body", [
    ("/api/normalize", {"raw_name": "milk"}),
    ("/api/translate", {"text": "दूध"}),
    ("/api/parse-list", {"raw_list": "milk 1 litre"}),
])
def test_all_api_routes_require_internal_auth(path, body):
    with client_for() as client:
        assert client.post(path, json=body).status_code == 401
        assert client.post(path, json=body, headers={"Authorization": "Bearer forged"}).status_code == 401


def test_normalization_uses_catalog_and_caches_it():
    calls = []

    def handler(request):
        calls.append(request)
        return catalog_handler(request)

    with client_for(handler) as client:
        response = client.post("/api/normalize", json={"raw_name": " MILK "}, headers=AUTH)
        assert response.status_code == 200
        assert response.json()["normalized"] == "milk"
        assert response.json()["confidence"] == 100
        assert client.post("/api/normalize", json={"raw_name": "coriander leave"}, headers=AUTH).json()["normalized"] == "coriander leaves"
    assert len(calls) == 1


def test_unknown_search_preserves_query_instead_of_fake_catalog_fallback():
    with client_for() as client:
        response = client.post("/api/normalize", json={"raw_name": "amul organic whole milk 1 litre"}, headers=AUTH)
        assert response.json()["success"] is False
        assert "normalized" not in response.json()


@pytest.mark.parametrize("path,body", [
    ("/api/normalize", {"raw_name": 3}),
    ("/api/normalize", {"raw_name": " "}),
    ("/api/normalize", {"raw_name": "x" * 121}),
    ("/api/normalize", {"raw_name": "milk", "admin": True}),
    ("/api/translate", {"text": "x" * 241}),
    ("/api/parse-list", {"raw_list": "x" * 4001}),
    ("/api/parse-list", {"raw_list": ["milk"]}),
])
def test_strict_request_validation(path, body):
    with client_for() as client:
        response = client.post(path, json=body, headers=AUTH)
        assert response.status_code == 422
        assert response.json()["error"] == "Invalid request"
        assert "input" not in response.json()


def test_parse_list_uses_real_provider_and_validates_contract():
    payload = [{"item": "milk", "quantity": "1 litre"}, {"item": "eggs", "quantity": "6"}]

    def handler(request):
        assert request.url.host == "generativelanguage.googleapis.com"
        assert request.url.query == b""
        assert request.headers["x-goog-api-key"] == CONFIG.gemini_api_key
        assert json.loads(request.content)["contents"][0]["parts"][0]["text"] == "milk 1 litre and six eggs"
        return provider_response(payload)

    with client_for(handler) as client:
        response = client.post("/api/parse-list", json={"raw_list": "milk 1 litre and six eggs"}, headers=AUTH)
        assert response.status_code == 200
        assert response.json()["parsed_items"] == payload
        assert response.json()["items"] == payload


def test_translation_validates_provider_result():
    with client_for(lambda _: provider_response({"translated": "Milk"})) as client:
        response = client.post("/api/translate", json={"text": "दूध"}, headers=AUTH)
        assert response.status_code == 200
        assert response.json()["translated"] == "milk"


@pytest.mark.parametrize("payload", [[], [{"item": "milk", "quantity": 1}], [{"item": "milk", "quantity": "1", "extra": "value"}], [{"item": "milk", "quantity": "1"}] * 31])
def test_invalid_ai_grocery_lists_fail_closed(payload):
    with client_for(lambda _: provider_response(payload)) as client:
        response = client.post("/api/parse-list", json={"raw_list": "milk"}, headers=AUTH)
        assert response.status_code == 502
        assert "parsed_items" not in response.json()


def test_upstream_timeout_is_safe_503():
    def handler(request):
        raise httpx.ReadTimeout("secret-provider-diagnostic", request=request)

    with client_for(handler) as client:
        response = client.post("/api/translate", json={"text": "दूध"}, headers=AUTH)
        assert response.status_code == 503
        assert "secret-provider-diagnostic" not in response.text
        assert CONFIG.gemini_api_key not in response.text


def test_malformed_provider_envelope_is_502():
    with client_for(lambda _: httpx.Response(200, json={"candidates": []})) as client:
        assert client.post("/api/translate", json={"text": "दूध"}, headers=AUTH).status_code == 502


def test_missing_optional_gemini_is_explicit_503():
    with client_for(settings=replace(CONFIG, gemini_api_key="")) as client:
        response = client.post("/api/parse-list", json={"raw_list": "milk"}, headers=AUTH)
        assert response.status_code == 503


def test_health_checks_database_and_sets_security_headers():
    with client_for() as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["database"] == "ok"
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["cache-control"] == "no-store"
        assert response.headers["x-request-id"]
        assert "access-control-allow-origin" not in response.headers


def test_health_degrades_on_database_failure():
    with client_for(lambda _: httpx.Response(503, text="private database error")) as client:
        response = client.get("/health")
        assert response.status_code == 503
        assert "private database error" not in response.text


def test_database_errors_never_produce_fake_normalized_values():
    with client_for(lambda _: httpx.Response(401, json={"secret": CONFIG.supabase_key})) as client:
        response = client.post("/api/normalize", json={"raw_name": "milk"}, headers=AUTH)
        assert response.status_code == 503
        assert CONFIG.supabase_key not in response.text


def test_oversize_body_is_rejected():
    with client_for() as client:
        response = client.post("/api/parse-list", content=b"x" * 20000, headers=AUTH)
        assert response.status_code == 413


def test_startup_rejects_missing_configuration(monkeypatch):
    for key in ["SUPABASE_URL", "SUPABASE_KEY", "AI_SERVICE_TOKEN"]:
        monkeypatch.delenv(key, raising=False)
    with pytest.raises(ValueError, match="AI_SERVICE_TOKEN"):
        with TestClient(create_app()):
            pass


@pytest.mark.parametrize("changes", [
    {"supabase_url": "http://untrusted.example"},
    {"supabase_url": "https://user:password@project.supabase.co"},
    {"service_token": "short"},
    {"http_timeout_seconds": 100},
    {"gemini_model": "../../invalid"},
])
def test_invalid_environment_fails_fast(changes):
    with pytest.raises(ValueError):
        replace(CONFIG, **changes)
