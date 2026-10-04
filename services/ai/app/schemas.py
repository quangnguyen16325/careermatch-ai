from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    provider: str


class SkillEvidence(BaseModel):
    name: str
    confidence: float = Field(ge=0, le=1)
    evidence: str | None = None


class CvAnalysisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100_000)


class CvAnalysisResponse(BaseModel):
    skills: list[SkillEvidence]
    education: list[str] = []
    projects: list[str] = []
    experience: list[str] = []
    certificates: list[str] = []
    career_goal: str | None = None
    provider: str
    model_version: str


class MatchRequest(BaseModel):
    student_skills: list[str]
    required_skills: list[str]
    preferred_skills: list[str] = []


class MatchResponse(BaseModel):
    score: float = Field(ge=0, le=100)
    matched_skills: list[str]
    missing_skills: list[str]
    explanation: str
    engine_version: str
    advisory_only: bool = True
