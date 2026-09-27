import { useEffect, useRef, useState } from "react";
import "./style.css";

export type Message = {
  role: "user" | "assistant";
  text: string;
  /** Wall-clock time (ms since epoch) the sentence was spoken, for the "YOU · 2:34:07 PM" label. */
  time?: number;
};

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Formats a wall-clock timestamp (ms since epoch) as e.g. "2:34:07 PM". */
function formatClockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function HeartPulseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M19.5 5.5a5 5 0 0 0-7.5-.6 5 5 0 0 0-7.5.6c-2 2.5-1.5 6 1.5 9L12 21l6-6.5c3-3 3.5-6.5 1.5-9z"
        opacity="0.4"
      />
      <polyline points="3.5 12 7.5 12 9.5 8 12.5 16 14.5 12 20.5 12" />
    </svg>
  );
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="22" />
      {muted && <line x1="3" y1="2" x2="21" y2="21" />}
    </svg>
  );
}

function PhoneEndIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.86.29 1.76.5 2.69.61A2 2 0 0 1 22 16.92V19a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.18 3.18 2 2 0 0 1 4.11 1h2.09a2 2 0 0 1 2 1.72c.11.93.32 1.83.61 2.69a2 2 0 0 1-.45 2.11L7.09 8.79" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

type Props = {
  messages: Message[];
  connected: boolean;
  isConnecting: boolean;
  isListening: boolean;
  isMuted: boolean;
  error: string;
  callSeconds: number;
  showEmergencyBanner: boolean;
  showCrisisBanner: boolean;
  /** Short status text shown while/after Gemini looks something up, e.g.
   * "Checking MedlinePlus for..." Null when nothing is happening. */
  toolStatus: string | null;
  /** Whether the session can currently accept a typed message. */
  canType: boolean;
  onSendTypedMessage: (text: string) => void;
  onStartCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onDismissEmergency: () => void;
  onDismissCrisis: () => void;
};

export default function CallUI({
  messages,
  connected,
  isConnecting,
  isListening,
  isMuted,
  error,
  callSeconds,
  showEmergencyBanner,
  showCrisisBanner,
  toolStatus,
  canType,
  onSendTypedMessage,
  onStartCall,
  onEndCall,
  onToggleMute,
  onDismissEmergency,
  onDismissCrisis,
}: Props) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [typedText, setTypedText] = useState("");

  function submitTypedMessage() {
    if (!typedText.trim() || !canType) return;
    onSendTypedMessage(typedText);
    setTypedText("");
  }

  function handleComposeKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitTypedMessage();
    }
  }

  // Keep the newest transcript entry visible.
  useEffect(() => {
    const panel = transcriptRef.current;
    if (panel) {
      panel.scrollTo({
        top: panel.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const subtitle = isConnecting
    ? "Connecting..."
    : connected
    ? isListening
      ? "Listening to you"
      : "Call in progress"
    : "Ready when you are";

  return (
    <main className="app-shell">
      {showEmergencyBanner && (
        <div className="emergency-banner" role="alert" aria-live="assertive">
          <div className="emergency-banner-text">
            <strong>This may be a medical emergency.</strong>
            <span> Contact emergency services right away.</span>
          </div>
          <div className="emergency-banner-actions">
            <a className="emergency-call-btn" href="tel:911">
              Call 911
            </a>
            <button
              className="emergency-dismiss-btn"
              onClick={onDismissEmergency}
              aria-label="Dismiss emergency notice"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showCrisisBanner && (
        <div className="crisis-banner" role="alert" aria-live="assertive">
          <div className="crisis-banner-text">
            <strong>You don't have to go through this alone.</strong>
            <span> Free, confidential support is available right now.</span>
          </div>
          <div className="crisis-banner-actions">
            <a className="crisis-call-btn" href="tel:988">
              Call 988
            </a>
            <a className="crisis-text-btn" href="sms:988">
              Text 988
            </a>
            <button
              className="crisis-dismiss-btn"
              onClick={onDismissCrisis}
              aria-label="Dismiss crisis support notice"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <HeartPulseIcon />
          </div>
          <div>
            <h1>HealthVoice</h1>
            <p>AI health assistant</p>
          </div>
        </div>

        <span
          className={`status-pill ${
            connected ? "status-pill--live" : isConnecting ? "status-pill--pending" : ""
          }`}
        >
          {isConnecting ? "Connecting" : connected ? "Connected" : "Disconnected"}
        </span>
      </header>

      {/* Two-panel call interface */}
      <section className="call-layout">
        {/* Left: phone call */}
        <section className="call-panel">
          <div className="call-info">
            <div className="avatar">
              <HeartPulseIcon size={34} />
            </div>

            <h2>HealthVoice</h2>
            <p className="call-subtitle">{subtitle}</p>

            <div className="call-timer">{formatDuration(callSeconds)}</div>
          </div>

          {/* Voice activity animation */}
          <div
            className={`voice-wave ${
              connected && isListening ? "active" : ""
            }`}
            aria-label={isListening ? "Listening" : "Voice activity"}
          >
            {[16, 30, 44, 24, 52, 32, 46, 20, 36, 16].map((height, i) => (
              <span
                key={i}
                style={
                  {
                    "--bar-height": `${height}px`,
                    "--bar-index": i,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* Call controls */}
          <div className="call-controls">
            <button
              className={`control-btn mute-btn ${isMuted ? "muted" : ""}`}
              onClick={onToggleMute}
              disabled={!connected}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              <MicIcon muted={isMuted} />
            </button>

            <button
              className="control-btn end-btn"
              onClick={onEndCall}
              disabled={!connected && !isConnecting}
              aria-label="End call"
            >
              <PhoneEndIcon />
            </button>
          </div>

          <p className="control-caption">Microphone · End call</p>

          {!connected && (
            <button
              className="start-call-btn"
              onClick={onStartCall}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Start conversation"}
            </button>
          )}

          {error && <p className="call-error">{error}</p>}

          <p className="privacy-note">
            Health information is not a substitute for professional medical
            care.
          </p>
        </section>

        {/* Right: scrolling transcript */}
        <section className="transcript-panel">
          <div className="transcript-header">
            <h2>Live transcript</h2>
            <span
              className={`status-pill status-pill--sm ${
                connected ? "status-pill--live" : ""
              }`}
            >
              Live
            </span>
          </div>

          {toolStatus && (
            <div className="tool-status" role="status" aria-live="polite">
              {toolStatus}
            </div>
          )}

          <div
            className="transcript-messages"
            ref={transcriptRef}
            aria-live="polite"
            aria-label="Conversation transcript"
          >
            {messages.length === 0 && (
              <div className="empty-transcript">
                <h3>Your conversation starts here</h3>
                <p>Start a call and it will appear here as you speak.</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.role === "user" ? "user-message" : "assistant-message"
                }`}
              >
                <div className="message-meta">
                  {message.role === "user" ? "You" : "HealthVoice"}
                  {typeof message.time === "number" && (
                    <> · {formatClockTime(message.time)}</>
                  )}
                </div>
                <div className="message-bubble">{message.text}</div>
              </div>
            ))}

            <p className="transcript-hint">
              New messages appear here as you speak.
            </p>
          </div>

          <div className="transcript-compose">
            <input
              type="text"
              className="transcript-input"
              placeholder={
                canType ? "Type a message instead of speaking…" : "Start a call to type a message"
              }
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              onKeyDown={handleComposeKeyDown}
              disabled={!canType}
              aria-label="Type a message"
            />
            <button
              type="button"
              className="transcript-send-btn"
              onClick={submitTypedMessage}
              disabled={!canType || !typedText.trim()}
            >
              Send
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
