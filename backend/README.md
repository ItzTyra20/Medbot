# HealthVoice Python Backend

Python/FastAPI backend for the HealthVoice healthcare voice assistant.

## Responsibilities

The Python backend provides:

- deterministic safety checks
- emergency detection
- basic triage routing
- trusted medical-source suggestions
- a simple API for the TypeScript frontend

The backend does **not** handle microphone input, audio playback, or the
Gemini Live voice connection. Those responsibilities belong to the
TypeScript frontend.

## Project structure

```text
backend/
├── main.py
├── healthcare/
│   ├── safety.py
│   ├── triage.py
│   └── sources.py
├── core/
│   └── prompt.txt
├── tests/
│   ├── test_safety.py
│   └── test_triage.py
├── requirements.txt
└── .gitignore
```

## Setup

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
uvicorn main:app --reload
```

The API will normally be available at:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

## Test

```powershell
pytest
```

## TypeScript integration

The main endpoint is:

```text
POST /assess
```

Request:

```json
{
  "text": "I've had chest pain for about 20 minutes."
}
```

Example response:

```json
{
  "emergency": true,
  "triage_level": "EMERGENCY",
  "triage_label": "Emergency evaluation",
  "reason": "A high-risk pattern was detected by the safety layer.",
  "matched_categories": [
    "possible_heart_or_circulatory_emergency"
  ],
  "instructions": "...",
  "response_override": "...",
  "sources": []
}
```

The TypeScript frontend can use this result to decide whether to:

1. display an emergency warning,
2. allow the normal Gemini response,
3. display the triage level, and
4. show relevant trusted sources.

## Important design limitation

The rules in `healthcare/safety.py` are an application safety layer, not a
medical diagnostic system. A production healthcare application would require
much more extensive clinical validation and safety engineering.

For the hackathon, keep the scope focused on general health information and
routing users toward appropriate care.
