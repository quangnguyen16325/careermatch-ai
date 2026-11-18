"""Read-only smoke checks for a running local Docker stack (Python stdlib only)."""

import argparse
import json
import urllib.request


def request(url, body=None):
    payload = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"} if payload else {}
    with urllib.request.urlopen(
        urllib.request.Request(url, data=payload, headers=headers), timeout=10
    ) as response:
        return response.read()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--web", default="http://localhost:5173")
    parser.add_argument("--api", default="http://localhost:3000")
    parser.add_argument("--ai", default="http://localhost:8001")
    args = parser.parse_args()

    assert b"<html" in request(args.web + "/").lower(), "Missing frontend HTML"
    assert b"<html" in request(args.web + "/students/profile").lower(), "SPA fallback failed"
    for url in [args.api + "/api/v1/health", args.web + "/api/v1/health", args.ai + "/health"]:
        assert json.loads(request(url))["status"] == "ok", url
    assert json.loads(request(args.web + "/docs-json"))["openapi"], "Swagger proxy failed"
    analysis = json.loads(request(args.ai + "/v1/cv/analyze", {"text": "Python and Docker"}))
    assert analysis["provider"] == "mock", "Smoke checks require the deterministic mock provider"
    assert {s["name"] for s in analysis["skills"]} >= {"python", "docker"}
    match = json.loads(request(args.ai + "/v1/matches/calculate", {
        "student_skills": ["Python"], "required_skills": ["Python", "Docker"]
    }))
    assert match["advisory_only"] is True and match["missing_skills"] == ["docker"]
    print("PASS: frontend, SPA fallback, API, proxy, Swagger, AI analysis and advisory matching")


if __name__ == "__main__":
    main()
