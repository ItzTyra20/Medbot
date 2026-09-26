# HealthVoice Medical Backend

A small TypeScript/Express starter for MedlinePlus health-topic retrieval and a conservative demo-only emergency keyword gate.

## Requirements
Node.js 20+ recommended.

## Install and run
Run these commands inside the `server` folder:
```bash
npm install
```
Copy `.env.example` to `.env` (Windows: copy the file in VS Code/File Explorer). Then:
```bash
npm run dev
```
Health check: http://localhost:3001/health

Test retrieval:
```bash
curl -X POST http://localhost:3001/api/medical-search -H "Content-Type: application/json" -d "{\"query\":\"high blood pressure\"}"
```
Run tests:
```bash
npm test
npm run typecheck
```

## Connect React
POST JSON `{ "query": "..." }` to `http://localhost:3001/api/medical-search`. Render returned source titles, summaries, and URLs. If `emergency` is true, immediately display/speak `safetyMessage` and don't wait for retrieval or the model.

If Vite uses a different origin, change `FRONTEND_ORIGIN` in `.env` and restart the backend.

## Safety/security limitations
- The keyword gate is not validated clinical triage. It can miss emergencies and over-trigger. A negative result is NOT assurance of safety.
- Do not diagnose, prescribe, or direct treatment. Use synthetic test data, not real patient information.
- MedlinePlus summaries are not a complete medical corpus, drug interaction checker, or clinical decision-support system.
- Preserve MedlinePlus attribution and link to source pages; review its service terms before public deployment.
- This starter does not itself ground Gemini responses. For grounded generation, pass retrieved snippets to a server-side model call, constrain answers to those sources, and validate citation URLs against retrieved URLs.
- Keep permanent Gemini API keys out of browser code in deployed apps.
