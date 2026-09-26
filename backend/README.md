# Medbot backend

The Medbot backend is an Express + TypeScript service located in
`backend/server`.

It provides:

- deterministic emergency/safety checks
- basic application-level triage routing
- trusted MedlinePlus source retrieval
- API endpoints for the React frontend

The realtime microphone, audio playback, and Gemini Live connection remain in
the React frontend.

See `backend/server/README.md` for setup and endpoint details.
