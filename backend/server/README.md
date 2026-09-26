# HealthVoice / Medbot medical backend

Express + TypeScript backend for the Medbot healthcare voice assistant.

## Responsibilities

The backend provides an application-level healthcare safety layer and trusted
medical-source retrieval. It does not handle microphone input or Gemini Live
audio; the React frontend handles realtime voice.

### Endpoints

- `GET /health` - backend health check
- `POST /api/assess` - safety + triage + optional medical-source retrieval
- `POST /api/medical-search` - backward-compatible source search endpoint
- `POST /api/safety` - safety check only
- `POST /api/triage` - triage check only

## Setup

```powershell
npm install
npm run dev
```

The server runs on port `3001` by default.

## Test

```powershell
npm test
npm run typecheck
```

## `/api/assess`

Request:

```json
{
  "text": "What causes migraines?",
  "includeSources": false
}
```

Emergency response:

```json
{
  "emergency": true,
  "triage": {
    "level": "EMERGENCY",
    "label": "Emergency evaluation"
  },
  "safety": {
    "matchedRules": ["possible_cardiac_emergency"]
  },
  "sources": [],
  "responseOverride": "..."
}
```

Set `includeSources` to `true` when the frontend wants relevant MedlinePlus
health-topic sources. Keeping it `false` during normal realtime voice turns
avoids adding external-search latency. A source retrieval failure does not
disable safety or triage.

## Safety scope

The safety rules are a deterministic application backstop, not a validated
clinical triage system. A negative result never means that a person is safe.
The model should still communicate uncertainty and encourage appropriate
professional care.
