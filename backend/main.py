from fastapi import FastAPI
from pydantic import BaseModel, Field

from healthcare.safety import check_safety
from healthcare.sources import find_sources
from healthcare.triage import assess_triage

app = FastAPI(
    title="HealthVoice Backend",
    description="Safety, triage, and trusted-source backend for the HealthVoice voice assistant.",
    version="1.0.0",
)


class HealthRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)


class SourceRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


@app.get("/")
def root():
    return {
        "name": "HealthVoice Backend",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/assess")
def assess(request: HealthRequest):
    """
    Main endpoint for the TypeScript frontend.

    Send the user's latest transcript here before allowing the normal
    assistant response to be shown.

    The frontend can use:
      - emergency=True to trigger an emergency UI/override
      - triage_level for the displayed triage category
      - instructions for the LLM
      - sources for relevant trusted medical information
    """
    safety = check_safety(request.text)

    if safety["emergency"]:
        triage = assess_triage(request.text, safety)
        return {
            "emergency": True,
            "triage_level": triage["level"],
            "triage_label": triage["label"],
            "reason": safety["reason"],
            "matched_categories": safety["matched_categories"],
            "instructions": safety["instructions"],
            "response_override": safety["response_override"],
            "sources": find_sources(request.text),
        }

    triage = assess_triage(request.text, safety)

    return {
        "emergency": False,
        "triage_level": triage["level"],
        "triage_label": triage["label"],
        "reason": triage["reason"],
        "matched_categories": safety["matched_categories"],
        "instructions": safety["instructions"],
        "response_override": None,
        "sources": find_sources(request.text),
    }


@app.post("/safety")
def safety(request: HealthRequest):
    return check_safety(request.text)


@app.post("/triage")
def triage(request: HealthRequest):
    safety = check_safety(request.text)
    return assess_triage(request.text, safety)


@app.post("/sources")
def sources(request: SourceRequest):
    return {"sources": find_sources(request.text)}
