import re

from .schemas import (
    CvAnalysisResponse,
    MatchRequest,
    MatchResponse,
    SkillEvidence,
)

KNOWN_SKILLS = {
    "docker",
    "express",
    "fastapi",
    "git",
    "nestjs",
    "node.js",
    "postgresql",
    "python",
    "react",
    "redis",
    "rest api",
    "typescript",
}


def normalize_skill(skill: str) -> str:
    return re.sub(r"\s+", " ", skill.strip().lower())


def analyze_cv(text: str, provider: str) -> CvAnalysisResponse:
    normalized_text = text.lower()
    skills = [
        SkillEvidence(name=skill, confidence=0.9, evidence=f"Found '{skill}' in CV text")
        for skill in sorted(KNOWN_SKILLS)
        if skill in normalized_text
    ]
    return CvAnalysisResponse(
        skills=skills,
        provider=provider,
        model_version="mock-keyword-v1",
    )


def calculate_match(request: MatchRequest) -> MatchResponse:
    student = {normalize_skill(skill) for skill in request.student_skills}
    required = {normalize_skill(skill) for skill in request.required_skills}
    preferred = {normalize_skill(skill) for skill in request.preferred_skills}
    matched = sorted(student & (required | preferred))
    missing = sorted(required - student)

    if not required:
        score = 0.0
    else:
        required_score = len(student & required) / len(required)
        preferred_bonus = min(len(student & preferred) * 0.02, 0.1)
        score = round(min(required_score * 0.9 + preferred_bonus, 1.0) * 100, 2)

    explanation = (
        f"Matched {len(student & required)} of {len(required)} required skills. "
        f"Missing required skills: {', '.join(missing) if missing else 'none'}."
    )
    return MatchResponse(
        score=score,
        matched_skills=matched,
        missing_skills=missing,
        explanation=explanation,
        engine_version="rule-based-v1",
    )
