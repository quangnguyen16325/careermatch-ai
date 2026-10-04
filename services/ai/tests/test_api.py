from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_match_is_explainable_and_advisory() -> None:
    response = client.post(
        "/v1/matches/calculate",
        json={
            "student_skills": ["Node.js", "PostgreSQL", "Git"],
            "required_skills": ["Node.js", "PostgreSQL", "Git", "Docker"],
        },
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["score"] == 67.5
    assert payload["missing_skills"] == ["docker"]
    assert payload["advisory_only"] is True
