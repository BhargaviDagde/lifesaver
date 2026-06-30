/**
 * Voice client — manages the WebSocket connection to the backend voice relay.
 *
 * Pattern (per spec section 7):
 *   Frontend mic → WebSocket → backend → ADK bidi-streaming → Gemini Live API
 *
 * Phase 0: stub with connection management.
 * Phase 5: full audio streaming + transcript handling.
 *
 * Usage:
 *   const voice = new VoiceClient(onTranscript, onStatus);
 *   await voice.connect();
 *   voice.startMic();
 *   voice.stopMic();
 *   voice.disconnect();
 */

import { auth } from "./firebase";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

const WS_URL = BACKEND_URL.replace(/^https?/, (p) =>
  p === "https" ? "wss" : "ws"
);

export type TranscriptSegment = {
  text: string;
  isFinal: boolean;
  speaker: "user" | "assistant";
  timestamp: number;
};

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "processing"
  | "error"
  | "disconnected";

export class VoiceClient {
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private status: VoiceStatus = "idle";

  constructor(
    private onTranscript: (segment: TranscriptSegment) => void,
    private onStatusChange: (status: VoiceStatus) => void
  ) {}

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setStatus("connecting");

    // Get auth token for connection
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : "";

    this.ws = new WebSocket(`${WS_URL}/voice/ws?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      this.setStatus("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "transcript") {
          this.onTranscript({
            text: msg.text,
            isFinal: msg.isFinal ?? true,
            speaker: msg.speaker ?? "assistant",
            timestamp: Date.now(),
          });
        } else if (msg.type === "status") {
          // Backend status messages — log but don't change client status
          console.debug("[voice] backend status:", msg.message);
        }
      } catch {
        // Non-JSON message — ignore
      }
    };

    this.ws.onerror = () => {
      this.setStatus("error");
    };

    this.ws.onclose = () => {
      this.setStatus("disconnected");
      this.stopMic();
    };
  }

  async startMic(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    // TODO Phase 5: capture mic, convert to PCM, stream over WebSocket
    // For now, just set status to listening
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      this.setStatus("listening");
    } catch (err) {
      console.error("[voice] Mic access denied:", err);
      this.setStatus("error");
    }
  }

  stopMic(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.status === "listening") {
      this.setStatus("connected");
    }
  }

  disconnect(): void {
    this.stopMic();
    this.ws?.close();
    this.ws = null;
    this.setStatus("idle");
  }

  private setStatus(status: VoiceStatus): void {
    this.status = status;
    this.onStatusChange(status);
  }

  getStatus(): VoiceStatus {
    return this.status;
  }
}
