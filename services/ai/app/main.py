from fastapi import FastAPI

from .config import settings
from .schemas import (
    CvAnalysisRequest,
    CvAnalysisResponse,
    HealthResponse,
    MatchRequest,
    MatchResponse,
)
from .services import analyze_cv, calculate_match

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Structured, explainable AI assistance. Hiring decisions remain human decisions.",
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        provider=settings.llm_provider,
    )


@app.post("/v1/cv/analyze", response_model=CvAnalysisResponse)
def cv_analysis(request: CvAnalysisRequest) -> CvAnalysisResponse:
    return analyze_cv(request.text, settings.llm_provider)


@app.post("/v1/matches/calculate", response_model=MatchResponse)
def match(request: MatchRequest) -> MatchResponse:
    return calculate_match(request)
