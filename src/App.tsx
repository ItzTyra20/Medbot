import { useRef, useState } from "react";
import { GoogleGenAI, Modality } from "@google/genai";

type Status = "disconnected" | "connecting" | "listening" | "speaking" | "error";

const MODEL = import.meta.env.VITE_GEMINI_LIVE_MODEL || "gemini-2.5-flash-native-audio-preview-12-2025";
console.log(
  "Gemini key loaded:",
  Boolean(import.meta.env.VITE_GEMINI_API_KEY)
);

function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }
  return samples;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function floatToPcm16Base64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function App() {
  const [status, setStatus] = useState<Status>("disconnected");
  const [userText, setUserText] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [error, setError] = useState("");
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const liveUserTextRef = useRef("");
  const liveAssistantTextRef = useRef("");

  async function start() {
    try {
      setError("");
      setUserText("");
      setAssistantText("");
      setStatus("connecting");

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY. Add it to .env.local and restart Vite.");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const ai = new GoogleGenAI({ apiKey });
      const session = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are HealthVoice, a friendly general health information assistant. You are not a doctor and do not diagnose, prescribe, or recommend changing medication doses. Ask concise follow-up questions and communicate uncertainty. If a user describes possible emergency symptoms, advise them to contact emergency services immediately. This is a demo, not a substitute for professional medical care. Keep spoken answers concise.`,
        },
        callbacks: {
          onopen: () => setStatus("listening"),
          onmessage: async (message: any) => {
            const serverContent = message.serverContent;
            if (serverContent?.inputTranscription?.text) {
              liveUserTextRef.current += serverContent.inputTranscription.text;
              setUserText(liveUserTextRef.current);
            }
            if (serverContent?.outputTranscription?.text) {
              liveAssistantTextRef.current += serverContent.outputTranscription.text;
              setAssistantText(liveAssistantTextRef.current);
            }
            if (serverContent?.turnComplete) {
              liveUserTextRef.current += "\n";
              liveAssistantTextRef.current += "\n";
              setUserText(liveUserTextRef.current.trim());
              setAssistantText(liveAssistantTextRef.current.trim());
              setStatus("listening");
            }

            const parts = serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
              const data = part.inlineData?.data;
              if (!data) continue;
              const pcm = pcm16ToFloat32(base64ToBytes(data));
              const ctx = audioContextRef.current;
              if (!ctx) continue;
              const audioBuffer = ctx.createBuffer(1, pcm.length, 24000);
              const safePcm = new Float32Array(pcm);
              audioBuffer.copyToChannel(safePcm, 0);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
              source.start(startAt);
              nextPlayTimeRef.current = startAt + audioBuffer.duration;
              activeSourcesRef.current.push(source);
              setStatus("speaking");
              source.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
                if (activeSourcesRef.current.length === 0 && sessionRef.current) setStatus("listening");
              };
            }
          },
          onerror: (e: any) => {
            setError(e?.message || "Gemini Live connection error.");
            setStatus("error");
            console.error("Gemini Live error:", error);
            setStatus("error");
          },
          onclose: () => {
            sessionRef.current = null;
            if (status !== "error") setStatus("disconnected");
            console.error("Gemini Live closed:", event);
            setStatus("disconnected");
          }
        }
      });
      sessionRef.current = session;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      // ScriptProcessorNode is broadly supported and keeps this starter compact.
      // For production, replace with AudioWorklet for lower-latency audio processing.
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        if (!sessionRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        // Gemini Live expects 16-bit PCM. Resample browser audio to 16 kHz.
        const ratio = event.inputBuffer.sampleRate / 16000;
        const outputLength = Math.floor(input.length / ratio);
        const resampled = new Float32Array(outputLength);
        for (let i = 0; i < outputLength; i++) resampled[i] = input[Math.floor(i * ratio)];
        sessionRef.current.sendRealtimeInput({
          audio: {
            data: floatToPcm16Base64(resampled),
            mimeType: "audio/pcm;rate=16000"
          }
        });
      };
      source.connect(processor);
      // Connect through a zero-gain node so the processor runs without microphone feedback.
      const mute = audioContext.createGain();
      mute.gain.value = 0;
      processor.connect(mute);
      mute.connect(audioContext.destination);
    } catch (e: any) {
      setError(e?.message || String(e));
      setStatus("error");
      await stop();
    }
  }

  async function stop() {
    try { processorRef.current?.disconnect(); } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    processorRef.current = null;
    sourceRef.current = null;
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch {}
      sessionRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    activeSourcesRef.current.forEach(source => { try { source.stop(); } catch {} });
    activeSourcesRef.current = [];
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    nextPlayTimeRef.current = 0;
    setStatus("disconnected");
  }

  const busy = status === "connecting";
  return (
    <main className="shell">
      <header>
        <div className="logo">HV</div>
        <div><h1>HealthVoice</h1><p>Voice-first health information demo</p></div>
        <span className={`pill ${status}`}>{status}</span>
      </header>
      <section className="notice">
        <strong>Demo only</strong> — Not a medical device or substitute for professional care.
        Do not share identifying or highly sensitive health information. For an emergency in the U.S., call 911.
      </section>
      <section className="panel">
        <h2>Talk to HealthVoice</h2>
        <p className="muted">Start a session and speak naturally. Transcriptions appear below as Gemini returns them.</p>
        <div className="controls">
          <button className="start" onClick={start} disabled={busy || status === "listening" || status === "speaking"}>
            {busy ? "Connecting…" : "🎙 Start conversation"}
          </button>
          <button className="stop" onClick={stop} disabled={status === "disconnected"}>End session</button>
        </div>
        {error && <div className="error">{error}</div>}
      </section>
      <section className="transcripts">
        <article className="transcript">
          <div className="transcript-heading"><span className="dot user-dot" /> You <button onClick={() => {liveUserTextRef.current=""; setUserText("");}} className="clear">Clear</button></div>
          <p>{userText || "Your speech transcription will appear here…"}</p>
        </article>
        <article className="transcript">
          <div className="transcript-heading"><span className="dot ai-dot" /> HealthVoice</div>
          <p>{assistantText || "The assistant's spoken response transcription will appear here…"}</p>
        </article>
      </section>
      <footer>Prototype • Gemini Live API • Audio stays in this browser session except for processing by Google's API.</footer>
    </main>
  );
}
