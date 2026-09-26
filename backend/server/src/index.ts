import express from "express";
import cors from "cors";
import "dotenv/config";
import { retrieveMedicalSources } from "./retrieval.js";
import { checkSafety } from "./safety.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "20kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "healthvoice-medical-backend" });
});

app.post("/api/medical-search", async (req, res) => {
  const query = req.body?.query;
  if (typeof query !== "string" || !query.trim() || query.length > 500) {
    return res.status(400).json({ error: "Provide a non-empty query of at most 500 characters." });
  }

  const safety = checkSafety(query);
  if (safety.emergency) {
    return res.json({ emergency: true, safetyMessage: safety.message, sources: [] });
  }

  try {
    const sources = await retrieveMedicalSources(query);
    return res.json({
      emergency: false,
      sources,
      attribution: "Health information provided by MedlinePlus, National Library of Medicine."
    });
  } catch (error) {
    console.error("Medical retrieval failed:", error);
    return res.status(502).json({ error: "Medical source retrieval is temporarily unavailable.", sources: [] });
  }
});

app.listen(port, () => console.log(`HealthVoice backend listening on http://localhost:${port}`));
