import express from "express";
import cors from "cors";
import "dotenv/config";
import { retrieveMedicalSources } from "./retrieval.js";
import { checkSafety } from "./safety.js";
import { assessTriage } from "./triage.js";
import { GoogleGenAI, Modality } from "@google/genai";

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "20kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "healthvoice-medical-backend" });
});

/**
 * Main healthcare endpoint.
 *
 * The React frontend sends the user's completed transcript here. The backend
 * runs deterministic safety/triage logic and optionally retrieves trusted
 * medical sources. The frontend can use the result to update the UI and to
 * guide the Gemini response.
 */
app.post("/api/assess", async (req, res) => {
  const text = req.body?.text;
  const includeSources = req.body?.includeSources === true;

  if (typeof text !== "string" || !text.trim() || text.length > 10000) {
    return res.status(400).json({
      error: "Provide non-empty text of at most 10,000 characters.",
    });
  }

  const safety = checkSafety(text);
  const triage = assessTriage(text, safety);

  // Emergency cases do not need a medical web search. This also prevents
  // network latency from delaying the emergency warning.
  if (safety.emergency) {
    return res.json({
      emergency: true,
      triage,
      safety,
      sources: [],
      responseOverride: safety.message,
    });
  }

  if (!includeSources) {
    return res.json({
      emergency: false,
      triage,
      safety,
      sources: [],
      responseOverride: null,
    });
  }

  try {
    const sources = await retrieveMedicalSources(text);

    return res.json({
      emergency: false,
      triage,
      safety,
      sources,
      responseOverride: null,
    });
  } catch (error) {
    console.error("Medical retrieval failed:", error);

    // Safety/triage still worked. Do not turn a source outage into a failure
    // of the entire assistant.
    return res.json({
      emergency: false,
      triage,
      safety,
      sources: [],
      responseOverride: null,
      retrievalError: true,
    });
  }
});

/**
 * Backward-compatible endpoint for the current frontend.
 */
app.post("/api/medical-search", async (req, res) => {
  const query = req.body?.query;

  if (typeof query !== "string" || !query.trim() || query.length > 500) {
    return res
      .status(400)
      .json({ error: "Provide a non-empty query of at most 500 characters." });
  }

  const safety = checkSafety(query);
  if (safety.emergency) {
    return res.json({
      emergency: true,
      safetyMessage: safety.message,
      sources: [],
    });
  }

  try {
    const sources = await retrieveMedicalSources(query);
    return res.json({
      emergency: false,
      sources,
      attribution:
        "Health information provided by MedlinePlus, National Library of Medicine.",
    });
  } catch (error) {
    console.error("Medical retrieval failed:", error);
    return res.status(502).json({
      error: "Medical source retrieval is temporarily unavailable.",
      sources: [],
    });
  }
});

app.post("/api/safety", (req, res) => {
  const text = req.body?.text;

  if (typeof text !== "string" || !text.trim() || text.length > 10000) {
    return res.status(400).json({
      error: "Provide non-empty text of at most 10,000 characters.",
    });
  }

  return res.json(checkSafety(text));
});

app.post("/api/triage", (req, res) => {
  const text = req.body?.text;

  if (typeof text !== "string" || !text.trim() || text.length > 10000) {
    return res.status(400).json({
      error: "Provide non-empty text of at most 10,000 characters.",
    });
  }

  const safety = checkSafety(text);
  return res.json(assessTriage(text, safety));
});

app.post("/api/live-token", async (_req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured",
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(
          Date.now() + 30 * 60 * 1000
        ).toISOString(),
        newSessionExpireTime: new Date(
          Date.now() + 60 * 1000
        ).toISOString(),
        liveConnectConstraints: {
          model: process.env.GEMINI_LIVE_MODEL ||
            "gemini-3.8-live",
          config: {
            responseModalities: [Modality.AUDIO],
          },
        },
      },
    });

    if (!token.name) {
      return res.status(500).json({
        error: "Failed to create temporary token",
      });
    }

    return res.json({
      token: token.name,
      model: process.env.GEMINI_LIVE_MODEL ||
        "gemini-3.8-live",
    });
  } catch (error) {
    console.error("Live token creation failed:", error);

    return res.status(500).json({
      error: "Could not create Live API session",
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`HealthVoice backend listening on http://localhost:${port}`);
});
