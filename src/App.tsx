import { useRef, useState } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import CallUI, { type Message } from "./CallUI";

type Status = "disconnected" | "connecting" | "listening" | "speaking" | "error";

const MODEL =
  import.meta.env.VITE_GEMINI_LIVE_MODEL ||
  "gemini-2.5-flash-native-audio-preview-12-2025";

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
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingUser, setPendingUser] = useState<{ text: string; time: number } | null>(
    null
  );
  const [pendingAssistant, setPendingAssistant] = useState<
    { text: string; time: number } | null
  >(null);
  const [error, setError] = useState("");
  const [callSeconds, setCallSeconds] = useState(0);

  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const liveUserTextRef = useRef("");
  const liveAssistantTextRef = useRef("");
  const userTurnStartRef = useRef(0);
  const assistantTurnStartRef = useRef(0);
  const isMutedRef = useRef(false);
  const statusRef = useRef<Status>("disconnected");
  const callStartRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function setStatusSafe(next: Status) {
    statusRef.current = next;
    setStatus(next);
  }

  function elapsedSeconds(): number {
    if (!callStartRef.current) return 0;
    return (Date.now() - callStartRef.current) / 1000;
  }

  function startCallTimer() {
    callStartRef.current = Date.now();
    setCallSeconds(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setCallSeconds(elapsedSeconds());
    }, 1000);
  }

  function stopCallTimer() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    callStartRef.current = null;
    setCallSeconds(0);
  }

  async function start() {
    try {
      setError("");
      setMessages([]);
      setPendingUser(null);
      setPendingAssistant(null);
      liveUserTextRef.current = "";
      liveAssistantTextRef.current = "";
      setStatusSafe("connecting");

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "Missing VITE_GEMINI_API_KEY. Add it to .env.local and restart Vite."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
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
          systemInstruction:
            "You are HealthVoice, a friendly general health information assistant. You are not a doctor and do not diagnose, prescribe, or recommend changing medication doses. Ask concise follow-up questions and communicate uncertainty. If a user describes possible emergency symptoms, advise them to contact emergency services immediately. This is a demo, not a substitute for professional medical care. Keep spoken answers concise.",
        },
        callbacks: {
          onopen: () => {
            startCallTimer();
            setStatusSafe("listening");
          },
          onmessage: async (message: any) => {
            const serverContent = message.serverContent;

            if (serverContent?.inputTranscription?.text) {
              if (!liveUserTextRef.current) {
                userTurnStartRef.current = elapsedSeconds();
              }
              liveUserTextRef.current += serverContent.inputTranscription.text;
              setPendingUser({
                text: liveUserTextRef.current,
                time: userTurnStartRef.current,
              });
            }
            if (serverContent?.outputTranscription?.text) {
              if (!liveAssistantTextRef.current) {
                assistantTurnStartRef.current = elapsedSeconds();
              }
              liveAssistantTextRef.current +=
                serverContent.outputTranscription.text;
              setPendingAssistant({
                text: liveAssistantTextRef.current,
                time: assistantTurnStartRef.current,
              });
            }

            if (serverContent?.turnComplete) {
              const finishedUser = liveUserTextRef.current.trim();
              const finishedAssistant = liveAssistantTextRef.current.trim();
              const userTime = userTurnStartRef.current;
              const assistantTime = assistantTurnStartRef.current;

              setMessages((prev) => {
                const next = [...prev];
                if (finishedUser)
                  next.push({ role: "user", text: finishedUser, time: userTime });
                if (finishedAssistant)
                  next.push({
                    role: "assistant",
                    text: finishedAssistant,
                    time: assistantTime,
                  });
                return next;
              });

              liveUserTextRef.current = "";
              liveAssistantTextRef.current = "";
              setPendingUser(null);
              setPendingAssistant(null);
              setStatusSafe("listening");
            }

            const parts = serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
              const data = part.inlineData?.data;
              if (!data) continue;
              const pcm = pcm16ToFloat32(base64ToBytes(data));
              const ctx = audioContextRef.current;
              if (!ctx) continue;
              const audioBuffer = ctx.createBuffer(1, pcm.length, 24000);
              audioBuffer.copyToChannel(new Float32Array(pcm), 0);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              const startAt = Math.max(
                ctx.currentTime,
                nextPlayTimeRef.current
              );
              source.start(startAt);
              nextPlayTimeRef.current = startAt + audioBuffer.duration;
              activeSourcesRef.current.push(source);
              setStatusSafe("speaking");
              source.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter(
                  (s) => s !== source
                );
                if (
                  activeSourcesRef.current.length === 0 &&
                  sessionRef.current
                ) {
                  setStatusSafe("listening");
                }
              };
            }
          },
          onerror: (e: any) => {
            setError(e?.message || "Gemini Live connection error.");
            setStatusSafe("error");
          },
          onclose: () => {
            sessionRef.current = null;
            if (statusRef.current !== "error") setStatusSafe("disconnected");
          },
        },
      });
      sessionRef.current = session;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      // ScriptProcessorNode is broadly supported and keeps this starter compact.
      // For production, replace with AudioWorklet for lower-latency audio processing.
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        if (!sessionRef.current || isMutedRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        // Gemini Live expects 16-bit PCM. Resample browser audio to 16 kHz.
        const ratio = event.inputBuffer.sampleRate / 16000;
        const outputLength = Math.floor(input.length / ratio);
        const resampled = new Float32Array(outputLength);
        for (let i = 0; i < outputLength; i++)
          resampled[i] = input[Math.floor(i * ratio)];
        sessionRef.current.sendRealtimeInput({
          audio: {
            data: floatToPcm16Base64(resampled),
            mimeType: "audio/pcm;rate=16000",
          },
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
      setStatusSafe("error");
      await stop();
    }
  }

  async function stop() {
    try {
      processorRef.current?.disconnect();
    } catch {}
    try {
      sourceRef.current?.disconnect();
    } catch {}
    processorRef.current = null;
    sourceRef.current = null;
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {}
      sessionRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {}
    });
    activeSourcesRef.current = [];
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    nextPlayTimeRef.current = 0;
    stopCallTimer();
    setStatusSafe("disconnected");
    setIsMuted(false);
    isMutedRef.current = false;
    setPendingUser(null);
    setPendingAssistant(null);
  }

  function toggleMute() {
    setIsMuted((prev) => {
      isMutedRef.current = !prev;
      return !prev;
    });
  }

  const connected = status === "listening" || status === "speaking";
  const isConnecting = status === "connecting";
  const isListening = status === "listening";

  // Combine committed history with the turn currently streaming in.
  const displayMessages: Message[] = [
    ...messages,
    ...(pendingUser
      ? [{ role: "user" as const, text: pendingUser.text, time: pendingUser.time }]
      : []),
    ...(pendingAssistant
      ? [
          {
            role: "assistant" as const,
            text: pendingAssistant.text,
            time: pendingAssistant.time,
          },
        ]
      : []),
  ];

  return (
    <CallUI
      messages={displayMessages}
      connected={connected}
      isConnecting={isConnecting}
      isListening={isListening}
      isMuted={isMuted}
      error={error}
      callSeconds={callSeconds}
      onStartCall={start}
      onEndCall={stop}
      onToggleMute={toggleMute}
    />
  );
}
