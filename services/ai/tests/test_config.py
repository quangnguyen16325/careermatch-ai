from pathlib import Path

from app.config import REPOSITORY_ENV_FILE, Settings


def test_env_location_is_relative_to_repository_not_working_directory(monkeypatch, tmp_path):
    expected = Path(__file__).resolve().parents[3] / ".env"
    monkeypatch.chdir(tmp_path)
    assert REPOSITORY_ENV_FILE == expected
    assert Settings.model_config["env_file"] == expected


def test_process_environment_overrides_file(monkeypatch, tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("LLM_PROVIDER=mock\n", encoding="utf-8")
    monkeypatch.setenv("LLM_PROVIDER", "test-override")
    assert Settings(_env_file=env_file).llm_provider == "test-override"


def test_missing_env_file_uses_defaults_without_loading_cwd_file(monkeypatch, tmp_path):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.chdir(tmp_path)
    (tmp_path / ".env").write_text("LLM_PROVIDER=unexpected\n", encoding="utf-8")
    assert Settings(_env_file=tmp_path / "missing.env").llm_provider == "mock"
